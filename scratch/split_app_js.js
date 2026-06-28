const fs = require('fs');
const path = require('path');

const srcPath = 'c:/Users/bird3/100 shop/ModooRoom/public/js/app.js';
const code = fs.readFileSync(srcPath, 'utf8');

// 함수를 분류할 맵 정의
const classification = {
    auth: [
        'markUserVerified', 'saveMyInfo', 'renderAuthPage',
        'handleLogin', 'handleSignup', 'handleLogout', 'authenticateRole', 'goToDashboard'
    ],
    owner: [
        'authenticateOwnerDetailed', 'renderOwnerBuildings', 'toggleBuildingMenu',
        'openBuildingManagementPage', 'renderRoomList', 'openManualTenantModal',
        'closeManualTenantModal', 'submitManualTenant', 'saveBuildingManagement',
        'setPrimaryBuildingFromPage', 'deleteBuildingFromPage', 'addRoomFromPage',
        'deleteRoomFromPage', 'openRoomDetailPage', 'saveRoomDetailEdit',
        'execDaumPostcodeForBroker', 'handleAddBuildingFileChange', 'submitAddBuilding'
    ],
    tenant: [
        'authenticateTenantDetailed', 'handleWriteStory', 'handleCommentSubmit',
        'handleSendInviteToOwner', 'loadActiveTenants', 'checkPendingInvites',
        'acceptInvite', 'checkTenantMatchStatus', 'handleComplaintSubmit',
        'execDaumPostcodeForTenant', 'searchBuildingForTenant', 'requestAuthToOwner',
        'sendInviteToOwner'
    ],
    admin: [
        'loadAdminUsers', 'filterAdminUsers', 'renderAdminUsers', 'toggleOwnerBuildings',
        'toggleVerification', 'openAdminEditModal', 'closeAdminEditModal', 'saveAdminUserEdit',
        'deleteAdminUser', 'loadAdminBuildings', 'renderAdminBuildings', 'toggleBuildingVerify',
        'deleteAdminBuilding', 'toggleAdminUsersMenu', 'toggleAdminSettingsMenu', 'toggleAdminMenu',
        'toggleAdminUserEditMenu', 'openUserEditPage', 'saveAdminUserEditData', 'loadAdminDashboardStats',
        'saveGeminiKey', 'loadGeminiKeyIntoAdmin', 'getGeminiApiKey', 'executeGeminiExtraction',
        'submitExtractedContract', 'loadOcrImage', 'setOcrMode', 'initOcrInteractions',
        'triggerSelectiveOcr', 'applySelectedText', 'closeExtractionPopup', 'toggleOcrOwnerMenu'
    ]
};

// 각 컨트롤러의 코드 모음
const outputCodes = {
    auth: [],
    owner: [],
    tenant: [],
    admin: []
};

// 특정 함수의 바디를 파싱하는 함수
function extractFunction(content, funcName) {
    // 다양한 형태의 함수 정의 검색 패턴 (function name, const name =, async function name)
    const regexList = [
        new RegExp(`(?:async\\s+)?function\\s+${funcName}\\s*\\(`, 'g'),
        new RegExp(`(?:const|let|var)\\s+${funcName}\\s*=\\s*(?:async\\s*)?\\(`, 'g')
    ];

    let match = null;
    let foundIndex = -1;
    let matchedPattern = null;

    for (const r of regexList) {
        r.lastIndex = 0;
        match = r.exec(content);
        if (match) {
            foundIndex = match.index;
            matchedPattern = match[0];
            break;
        }
    }

    if (foundIndex === -1) {
        return null;
    }

    // 여는 괄호 { 찾기
    let braceIndex = content.indexOf('{', foundIndex + matchedPattern.length - 1);
    if (braceIndex === -1) return null;

    let braceCount = 1;
    let i = braceIndex + 1;
    while (braceCount > 0 && i < content.length) {
        const char = content[i];
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
        }
        i++;
    }

    if (braceCount === 0) {
        const funcCode = content.substring(foundIndex, i);
        return {
            start: foundIndex,
            end: i,
            code: funcCode
        };
    }

    return null;
}

// app.js 코드의 복사본 생성
let remainingCode = code;

// 매칭된 함수 정보를 저장하고 제거하기
const allExtracted = [];

// 전체 분류에 대해 루프 돌며 함수들 추출
for (const [category, funcNames] of Object.entries(classification)) {
    for (const funcName of funcNames) {
        const result = extractFunction(remainingCode, funcName);
        if (result) {
            outputCodes[category].push(result.code);
            allExtracted.push({
                name: funcName,
                code: result.code
            });
        } else {
            console.log(`Warning: Could not extract function ${funcName}`);
        }
    }
}

// remainingCode에서 추출된 모든 함수를 공백으로 치환
// 치환 시 겹치는 범위를 고려해 역순(인덱스가 큰 쪽부터)으로 제거 진행
const toRemove = [];
for (const ext of allExtracted) {
    const startIdx = remainingCode.indexOf(ext.code);
    if (startIdx !== -1) {
        toRemove.push({
            start: startIdx,
            end: startIdx + ext.code.length
        });
    }
}

// 역순 정렬
toRemove.sort((a, b) => b.start - a.start);

for (const rm of toRemove) {
    remainingCode = remainingCode.substring(0, rm.start) + "\n\n" + remainingCode.substring(rm.end);
}

// 폴더 생성
const outDir = 'c:/Users/bird3/100 shop/ModooRoom/public/js/views';
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// 각 컨트롤러 파일 작성
fs.writeFileSync(path.join(outDir, 'authController.js'), outputCodes.auth.join('\n\n'), 'utf8');
fs.writeFileSync(path.join(outDir, 'ownerController.js'), outputCodes.owner.join('\n\n'), 'utf8');
fs.writeFileSync(path.join(outDir, 'tenantController.js'), outputCodes.tenant.join('\n\n'), 'utf8');
fs.writeFileSync(path.join(outDir, 'adminController.js'), outputCodes.admin.join('\n\n'), 'utf8');

// 축소된 app.js 덮어쓰기
fs.writeFileSync(srcPath, remainingCode, 'utf8');

console.log('App.js split successfully completed.');
