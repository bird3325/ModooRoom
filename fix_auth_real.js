const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// The new authenticateOwnerDetailed logic
const newAuthLogic = `
        async function authenticateOwnerDetailed(event) {
            event.preventDefault();
            const bName = document.getElementById('owner-building-name').value.trim();
            const bAddr = document.getElementById('owner-building-address').value.trim();
            const fileInput = document.getElementById('owner-contract-file');
            
            if (!bAddr) {
                showModalAlert('주소를 검색하여 입력해 주세요.');
                return;
            }
            if (!bName) {
                showModalAlert('건물명을 입력해 주세요.');
                return;
            }
            if (!fileInput.files || fileInput.files.length === 0) {
                showModalAlert('임대차 계약서 이미지를 첨부해주세요.');
                return;
            }

            // Store pending data and flag as first auth
            pendingBuildingData = { address: bAddr, name: bName, isFirstAuth: true };

            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('ocr-preview-img').src = e.target.result;
                initializeOcrFields();
                showView('ocr-extraction-view');
            };
            reader.readAsDataURL(file);
        }
`;

// Modify submitExtractedContract to handle isFirstAuth
const extractLogicRegex = /async function submitExtractedContract\(event\) \{([\s\S]*?)\}\s*async function submitAddBuilding/m;
let extractLogicMatch = content.match(extractLogicRegex);

if (extractLogicMatch) {
    let oldExtractLogic = extractLogicMatch[1];
    
    // Add markUserVerified() before showModalAlert and showView if isFirstAuth is true
    let newExtractLogic = oldExtractLogic.replace(
        "showModalAlert('새 건물 추가 및 계약 정보 등록이 완료되었습니다.\\\\n[추가된 건물: ' + pendingBuildingData.name + ']');",
        `if(pendingBuildingData.isFirstAuth) markUserVerified();
                    showModalAlert(pendingBuildingData.isFirstAuth ? '계약서 인증이 성공적으로 완료되었습니다.\\\\n[등록/인증건물: ' + pendingBuildingData.name + ']' : '새 건물 추가 및 계약 정보 등록이 완료되었습니다.\\\\n[추가된 건물: ' + pendingBuildingData.name + ']');`
    );

    newExtractLogic = newExtractLogic.replace(
        "showModalAlert('새 건물 추가 및 계약 정보 파싱이 완료되었습니다.\\\\n[추가된 건물: ' + pendingBuildingData.name + ']');",
        `if(pendingBuildingData.isFirstAuth) markUserVerified();
                    showModalAlert(pendingBuildingData.isFirstAuth ? '계약서 인증이 성공적으로 완료되었습니다.\\\\n[등록/인증건물: ' + pendingBuildingData.name + ']' : '새 건물 추가 및 계약 정보 파싱이 완료되었습니다.\\\\n[추가된 건물: ' + pendingBuildingData.name + ']');`
    );

    content = content.replace(oldExtractLogic, newExtractLogic);
} else {
    console.log('Failed to find submitExtractedContract');
}

// Replace authenticateOwnerDetailed
let startIndex = content.indexOf('async function authenticateOwnerDetailed(event) {');
if(startIndex !== -1) {
    let bracketCount = 0;
    let endIndex = startIndex;
    let started = false;
    for(let i = startIndex; i < content.length; i++) {
        if(content[i] === '{') {
            bracketCount++;
            started = true;
        } else if(content[i] === '}') {
            bracketCount--;
        }
        if(started && bracketCount === 0) {
            endIndex = i;
            break;
        }
    }
    content = content.substring(0, startIndex) + newAuthLogic + content.substring(endIndex + 1);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Successfully replaced authenticateOwnerDetailed and patched submitExtractedContract.');
} else {
    console.log('Could not find authenticateOwnerDetailed');
}
