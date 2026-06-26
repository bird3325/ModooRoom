const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Normalize newlines for search
let appJsNorm = appJs.replace(/\r\n/g, '\n');

// 1. Update the previewImage src and contract_image_url to use base64Data (original image) instead of preprocessedBase64
const oldPreviewAssign = `                            window.ocrTargetBuildingId = targetBuildingId;
                            const previewImage = document.getElementById('ocr-preview-img');
                            if (previewImage) {
                                previewImage.src = preprocessedBase64;
                            }`;

const newPreviewAssign = `                            window.ocrTargetBuildingId = targetBuildingId;
                            const previewImage = document.getElementById('ocr-preview-img');
                            if (previewImage) {
                                previewImage.src = base64Data; // 원본 이미지 사용
                            }`;

if (appJsNorm.includes(oldPreviewAssign)) {
    appJs = appJsNorm.replace(oldPreviewAssign, newPreviewAssign);
    console.log('Successfully set previewImage to use original image');
} else {
    console.log('Failed to match oldPreviewAssign');
}

// 2. Update contract_image_url to use base64Data (original image) inside verify-contract-ocr success block if any
// Let's check how contract_image_url is assigned in app.js
// It is around line 769: contract_image_url: preprocessedBase64
const oldContractUrl = 'contract_image_url: preprocessedBase64';
const newContractUrl = 'contract_image_url: base64Data';

appJsNorm = appJs.replace(/\r\n/g, '\n');
if (appJsNorm.includes(oldContractUrl)) {
    appJs = appJsNorm.replace(oldContractUrl, newContractUrl);
    console.log('Successfully set contract_image_url to use original image');
} else {
    console.log('Failed to match oldContractUrl');
}

// 3. Add loadOcrImage(event) function to the bottom of the file
const loadOcrImageFunction = `

// RESTORED FUNCTION: loadOcrImage
function loadOcrImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('ocr-preview-img');
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}
`;

// Append loadOcrImage to app.js if not already present
if (!appJs.includes('function loadOcrImage')) {
    appJs = appJs.trim() + loadOcrImageFunction;
    console.log('Successfully appended loadOcrImage function to app.js');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Finished updating image display logic');
