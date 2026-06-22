const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldFuncRegex = /\s*async\s+function\s+confirmContractSave\(\)\s*\{/;
const newFuncs = `        // 부분 OCR 기능
        let activeOcrTargetInput = null;
        let isDraggingImg = false;
        let startX = 0, startY = 0;

        document.addEventListener('focusin', function(e) {
            if (e.target && e.target.tagName === 'INPUT' && e.target.closest('#auth-owner-contract-details')) {
                activeOcrTargetInput = e.target;
            }
        });

        const imgWrapper = document.getElementById('contract-img-wrapper');
        const imgElem = document.getElementById('contract-preview-img');
        const selectionBox = document.getElementById('ocr-selection-box');
        const cropOverlay = document.getElementById('ocr-loading-overlay');

        if (imgWrapper) {
            imgWrapper.addEventListener('mousedown', function(e) {
                if (!activeOcrTargetInput) {
                    showModalAlert('먼저 자동 입력될 아래의 입력 칸을 클릭(선택)해 주세요.');
                    return;
                }
                if (e.target.id !== 'contract-preview-img' && e.target.id !== 'contract-img-wrapper' && e.target.id !== 'ocr-selection-box') return;
                
                isDraggingImg = true;
                const rect = imgWrapper.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                
                selectionBox.style.left = startX + 'px';
                selectionBox.style.top = startY + 'px';
                selectionBox.style.width = '0px';
                selectionBox.style.height = '0px';
                selectionBox.classList.remove('hidden');
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDraggingImg) return;
                const rect = imgWrapper.getBoundingClientRect();
                let currentX = e.clientX - rect.left;
                let currentY = e.clientY - rect.top;
                
                currentX = Math.max(0, Math.min(currentX, rect.width));
                currentY = Math.max(0, Math.min(currentY, rect.height));

                const x = Math.min(startX, currentX);
                const y = Math.min(startY, currentY);
                const w = Math.abs(currentX - startX);
                const h = Math.abs(currentY - startY);

                selectionBox.style.left = x + 'px';
                selectionBox.style.top = y + 'px';
                selectionBox.style.width = w + 'px';
                selectionBox.style.height = h + 'px';
            });

            document.addEventListener('mouseup', async function(e) {
                if (!isDraggingImg) return;
                isDraggingImg = false;
                
                const w = parseFloat(selectionBox.style.width);
                const h = parseFloat(selectionBox.style.height);
                
                if (w < 15 || h < 15) {
                    selectionBox.classList.add('hidden');
                    return;
                }

                if (!activeOcrTargetInput) {
                    selectionBox.classList.add('hidden');
                    return;
                }

                const rect = imgWrapper.getBoundingClientRect();
                const x = parseFloat(selectionBox.style.left);
                const y = parseFloat(selectionBox.style.top);

                const naturalW = imgElem.naturalWidth;
                const naturalH = imgElem.naturalHeight;
                const renderedW = rect.width;
                const renderedH = rect.height;

                const scaleX = naturalW / renderedW;
                const scaleY = naturalH / renderedH;

                const cropX = x * scaleX;
                const cropY = y * scaleY;
                const cropW = w * scaleX;
                const cropH = h * scaleY;

                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cropW;
                cropCanvas.height = cropH;
                const cropCtx = cropCanvas.getContext('2d');
                cropCtx.drawImage(imgElem, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                const croppedBase64 = cropCanvas.toDataURL('image/png');
                
                cropOverlay.classList.remove('hidden');

                try {
                    const response = await fetch('/api/extract-text-ocr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: croppedBase64 })
                    });
                    const resData = await response.json();
                    
                    if (response.ok && resData.success) {
                        if (resData.text && resData.text.trim()) {
                            let extracted = resData.text.replace(/\\n/g, ' ').trim();
                            extracted = extracted.replace(/\\s{2,}/g, ' ');
                            activeOcrTargetInput.value = extracted;
                            activeOcrTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
                        } else {
                            showModalAlert('선택하신 영역에서 인식된 글자가 없습니다. 다시 시도해 주세요.');
                        }
                    } else {
                        showModalAlert('텍스트 추출 실패: ' + (resData.error || '알 수 없는 오류'));
                    }
                } catch (error) {
                    console.error('Crop OCR error:', error);
                    showModalAlert('OCR 통신 중 오류가 발생했습니다.');
                } finally {
                    cropOverlay.classList.add('hidden');
                    selectionBox.classList.add('hidden');
                }
            });
        }

        async function submitContractDetails(event) {
            event.preventDefault();
            confirmContractSave();
        }

        async function confirmContractSave() {`;

if (oldFuncRegex.test(code)) {
    code = code.replace(oldFuncRegex, '\n' + newFuncs);
    console.log('Logic injected');
    fs.writeFileSync('server.js', code);
} else {
    console.log('Not found!');
}
