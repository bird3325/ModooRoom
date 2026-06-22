const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Add zoom UI
const oldImageHtml = `
                    <h4 style="margin-top: 0; color: #2d3748; font-size: 15px; margin-bottom: 15px;"><i class="fa-solid fa-file-image"></i> 첨부된 계약서 이미지</h4>
                    <div style="width: 100%; height: 600px; overflow: auto; border: 1px solid #cbd5e0; background: #fff; display: flex; align-items: center; justify-content: center; position: relative;">
                        <img id="ocr-preview-img" src="" style="max-width: 100%; max-height: 100%; object-fit: contain; cursor: crosshair;" onclick="handleImageClickForExtraction(event)">
                    </div>
`;

const newImageHtml = `
                    <h4 style="margin-top: 0; color: #2d3748; font-size: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fa-solid fa-file-image"></i> 첨부된 계약서 이미지</span>
                        <span>
                            <button type="button" class="btn" style="padding: 4px 10px; font-size: 12px; background: #edf2f7; border: 1px solid #cbd5e0;" onclick="zoomImage(20)">확대(+)</button>
                            <button type="button" class="btn" style="padding: 4px 10px; font-size: 12px; background: #edf2f7; border: 1px solid #cbd5e0;" onclick="zoomImage(-20)">축소(-)</button>
                        </span>
                    </h4>
                    <div style="width: 100%; height: 600px; overflow: auto; border: 1px solid #cbd5e0; background: #fff; display: block; position: relative;" id="ocr-img-wrapper">
                        <img id="ocr-preview-img" src="" style="width: 100%; object-fit: contain; cursor: crosshair; transform-origin: top left; transition: width 0.2s ease;" draggable="false">
                    </div>
`;

content = content.replace(oldImageHtml, newImageHtml);

// 2. Add zoomImage function
const zoomLogic = `
        let currentZoom = 100;
        function zoomImage(delta) {
            currentZoom += delta;
            if (currentZoom < 50) currentZoom = 50;
            if (currentZoom > 400) currentZoom = 400;
            document.getElementById('ocr-preview-img').style.width = currentZoom + '%';
        }
`;

// Insert zoomLogic before initOcrDrag
content = content.replace('let isOcrDragging = false;', zoomLogic + '\\n        let isOcrDragging = false;');


// 3. Fix scroll offset in initOcrDrag
const oldDragLogic = `
                isOcrDragging = true;
                const rect = ocrImgContainer.getBoundingClientRect();
                ocrStartX = e.clientX - rect.left;
                ocrStartY = e.clientY - rect.top;
                
                if (ocrSelectionBox) ocrSelectionBox.remove();
                ocrSelectionBox = document.createElement('div');
                ocrSelectionBox.style.position = 'absolute';
                ocrSelectionBox.style.border = '2px dashed #3182ce';
                ocrSelectionBox.style.backgroundColor = 'rgba(49, 130, 206, 0.2)';
                ocrSelectionBox.style.left = ocrStartX + 'px';
                ocrSelectionBox.style.top = ocrStartY + 'px';
`;

const newDragLogic = `
                isOcrDragging = true;
                const rect = ocrImgContainer.getBoundingClientRect();
                // When container scrolls, e.clientX - rect.left needs to be adjusted by scroll offsets
                ocrStartX = e.clientX - rect.left + ocrImgContainer.scrollLeft;
                ocrStartY = e.clientY - rect.top + ocrImgContainer.scrollTop;
                
                if (ocrSelectionBox) ocrSelectionBox.remove();
                ocrSelectionBox = document.createElement('div');
                ocrSelectionBox.style.position = 'absolute';
                ocrSelectionBox.style.border = '2px dashed #3182ce';
                ocrSelectionBox.style.backgroundColor = 'rgba(49, 130, 206, 0.2)';
                ocrSelectionBox.style.left = ocrStartX + 'px';
                ocrSelectionBox.style.top = ocrStartY + 'px';
`;

content = content.replace(oldDragLogic, newDragLogic);

const oldMoveLogic = `
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
`;

const newMoveLogic = `
                const currentX = e.clientX - rect.left + ocrImgContainer.scrollLeft;
                const currentY = e.clientY - rect.top + ocrImgContainer.scrollTop;
`;

content = content.replace(oldMoveLogic, newMoveLogic);

// Wait, the selLeft and selTop calculation also needs adjustment because of container layout
// Previously: container was flex, align-items center. So image might not start at (0,0) inside container.
// Now: container is display: block. Image starts at (0,0). So containerRect and imgRect should have identical top/left if no scroll.
// If there is scroll, imgRect.top goes negative, but containerRect.top stays fixed.
// The selection box is positioned absolute relative to container's scroll content!
// Thus selectionBox.style.left represents X from the top-left of the image.
// So cropX = selectionBox left * scale, period! Let's rewrite the cropping math:

const oldCropMath = `
                const selLeft = parseInt(ocrSelectionBox.style.left) + containerRect.left;
                const selTop = parseInt(ocrSelectionBox.style.top) + containerRect.top;
                const selWidth = parseInt(ocrSelectionBox.style.width);
                const selHeight = parseInt(ocrSelectionBox.style.height);
                
                // Map to image natural coordinates
                const scaleX = img.naturalWidth / imgRect.width;
                const scaleY = img.naturalHeight / imgRect.height;
                
                const cropX = (selLeft - imgRect.left) * scaleX;
                const cropY = (selTop - imgRect.top) * scaleY;
`;

const newCropMath = `
                const selWidth = parseInt(ocrSelectionBox.style.width);
                const selHeight = parseInt(ocrSelectionBox.style.height);
                
                // Map to image natural coordinates
                // ocrSelectionBox.style.left is relative to ocrImgContainer content. Since img is top-left in container, it directly maps to image X.
                const scaleX = img.naturalWidth / imgRect.width;
                const scaleY = img.naturalHeight / imgRect.height;
                
                const cropX = parseInt(ocrSelectionBox.style.left) * scaleX;
                const cropY = parseInt(ocrSelectionBox.style.top) * scaleY;
`;

content = content.replace(oldCropMath, newCropMath);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully added zoom capability and fixed scroll math.');
