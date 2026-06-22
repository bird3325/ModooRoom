const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Add /api/extract-text endpoint
const extractTextEndpoint = `
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/extract-text') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.imageBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ success: false, error: 'No image' }));
        }
        
        const tesseract = require('tesseract.js');
        const base64Data = data.imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        const result = await tesseract.recognize(buffer, 'kor');
        let text = result.data.text || '';
        text = text.replace(/\\n/g, ' ').trim();
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, text: text }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
`;

// Insert it right before /api/verify-contract-ocr
content = content.replace("} else if (req.method === 'POST' && parsedUrl.pathname === '/api/verify-contract-ocr') {", extractTextEndpoint + "} else if (req.method === 'POST' && parsedUrl.pathname === '/api/verify-contract-ocr') {");

// 2. Replace the old handleImageClickForExtraction and add dragging logic
// First we find handleImageClickForExtraction function
const oldHandleClickRegex = /function handleImageClickForExtraction\(event\) \{[\s\S]*?currentActiveField = null;\s*\}/m;

const newHandleClickLogic = `
        let isDragging = false;
        let startX, startY;
        let selectionBox = null;
        let imgContainer = null;

        function initOcrDrag() {
            const img = document.getElementById('ocr-preview-img');
            imgContainer = img.parentElement;
            
            // Remove old onclick
            img.onclick = null;
            
            imgContainer.addEventListener('mousedown', (e) => {
                if (!currentActiveField) {
                    showModalAlert('먼저 우측 폼에서 추출할 항목의 [영역 추출] 버튼을 눌러주세요.');
                    return;
                }
                isDragging = true;
                const rect = imgContainer.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                
                if (selectionBox) selectionBox.remove();
                selectionBox = document.createElement('div');
                selectionBox.style.position = 'absolute';
                selectionBox.style.border = '2px dashed #3182ce';
                selectionBox.style.backgroundColor = 'rgba(49, 130, 206, 0.2)';
                selectionBox.style.left = startX + 'px';
                selectionBox.style.top = startY + 'px';
                selectionBox.style.width = '0px';
                selectionBox.style.height = '0px';
                selectionBox.style.pointerEvents = 'none';
                imgContainer.appendChild(selectionBox);
            });

            imgContainer.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const rect = imgContainer.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);
                const left = Math.min(currentX, startX);
                const top = Math.min(currentY, startY);
                
                selectionBox.style.width = width + 'px';
                selectionBox.style.height = height + 'px';
                selectionBox.style.left = left + 'px';
                selectionBox.style.top = top + 'px';
            });

            window.addEventListener('mouseup', async (e) => {
                if (!isDragging) return;
                isDragging = false;
                
                if (!selectionBox || parseInt(selectionBox.style.width) < 10 || parseInt(selectionBox.style.height) < 10) {
                    if (selectionBox) selectionBox.remove();
                    return;
                }

                const img = document.getElementById('ocr-preview-img');
                const imgRect = img.getBoundingClientRect();
                const containerRect = imgContainer.getBoundingClientRect();
                
                const selLeft = parseInt(selectionBox.style.left) + containerRect.left;
                const selTop = parseInt(selectionBox.style.top) + containerRect.top;
                const selWidth = parseInt(selectionBox.style.width);
                const selHeight = parseInt(selectionBox.style.height);
                
                // Map to image natural coordinates
                const scaleX = img.naturalWidth / imgRect.width;
                const scaleY = img.naturalHeight / imgRect.height;
                
                const cropX = (selLeft - imgRect.left) * scaleX;
                const cropY = (selTop - imgRect.top) * scaleY;
                const cropW = selWidth * scaleX;
                const cropH = selHeight * scaleY;
                
                if (cropX < 0 || cropY < 0 || cropX > img.naturalWidth || cropY > img.naturalHeight) {
                    selectionBox.remove();
                    showModalAlert('이미지 영역 안에서 드래그해주세요.');
                    return;
                }

                // Create canvas and crop
                const canvas = document.createElement('canvas');
                canvas.width = cropW;
                canvas.height = cropH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                
                const croppedBase64 = canvas.toDataURL('image/png');
                selectionBox.remove();
                
                // Call actual OCR API
                document.getElementById('loading-view').classList.remove('hidden');
                document.getElementById('loading-view').querySelector('h3').innerText = '영역의 텍스트를 추출 중입니다...';
                
                try {
                    const res = await fetch('/api/extract-text', {
                        method: 'POST',
                        body: JSON.stringify({ imageBase64: croppedBase64 })
                    });
                    const result = await res.json();
                    document.getElementById('loading-view').classList.add('hidden');
                    
                    if (result.success) {
                        document.getElementById(currentActiveField).value = result.text.trim();
                        
                        // Reset buttons
                        const allBtns = document.querySelectorAll('#ocr-fields-container button');
                        allBtns.forEach(b => {
                            b.style.background = '#edf2f7';
                            b.style.color = '#4a5568';
                            b.innerText = '영역 추출';
                        });
                        currentActiveField = null;
                    } else {
                        showModalAlert('텍스트 추출 실패: ' + result.error);
                    }
                } catch (error) {
                    document.getElementById('loading-view').classList.add('hidden');
                    showModalAlert('오류 발생: ' + error.message);
                }
            });
        }
        
        function handleImageClickForExtraction(event) {
            // Deprecated logic, now handled by initOcrDrag()
        }
`;

content = content.replace(oldHandleClickRegex, newHandleClickLogic);

// We need to call initOcrDrag when ocr-extraction-view is shown
// Where is initializeOcrFields called?
// In authenticateOwnerDetailed and submitAddBuilding
const initFieldsRegex = /initializeOcrFields\(\);/g;
content = content.replace(initFieldsRegex, "initializeOcrFields(); initOcrDrag();");

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully added real OCR extraction logic');
