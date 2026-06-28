const fs = require('fs');
const path = require('path');

// 1. server_head.js에서 JS 추출 (한글 안 깨진 원본 소스)
let content = '';
try {
    content = fs.readFileSync(path.join(__dirname, '../server_head.js'), 'utf8');
} catch(e) {
    console.error('Failed to read server_head.js:', e);
    process.exit(1);
}

const startIndex = content.indexOf('<script>');
const endIndex = content.lastIndexOf('</script>');
if (startIndex === -1 || endIndex === -1) {
    console.error('No script block found in server_head.js');
    process.exit(1);
}
const jsCode = content.substring(startIndex + 8, endIndex);

// 2. classification 맵 정의 (split_app_js.js 기반)
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

// 3. 함수 추출 헬퍼 (split_app_js.js 기반)
function extractFunction(content, funcName) {
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

    if (foundIndex === -1) return null;

    let braceIndex = content.indexOf('{', foundIndex + matchedPattern.length - 1);
    if (braceIndex === -1) return null;

    let braceCount = 1;
    let i = braceIndex + 1;
    while (braceCount > 0 && i < content.length) {
        const char = content[i];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        i++;
    }

    if (braceCount === 0) {
        return content.substring(foundIndex, i);
    }
    return null;
}

// 4. 각 컨트롤러 파일 생성
for (const [controllerName, funcNames] of Object.entries(classification)) {
    const filePath = path.join(__dirname, `../public/js/views/${controllerName}Controller.js`);
    const codes = [];
    
    for (const name of funcNames) {
        let code = extractFunction(jsCode, name);
        if (code) {
            // 특별 예외 처리: auth의 markUserVerified
            if (name === 'markUserVerified') {
                code = `function markUserVerified() {
            isAuthenticated = true;
            if (supabaseClient) {
                supabaseClient.auth.getSession().then(({ data: { session } }) => {
                    if (session && session.user) {
                        supabaseClient.from('profiles').update({ is_verified: true }).eq('id', session.user.id).then(({ error }) => {
                            if (error && error.message.includes('is_verified')) {
                                console.warn('Supabase profiles 테이블에 is_verified 컬럼이 없습니다. (DB 스키마 추가 필요)');
                            }
                        });
                    }
                });
            }
        }`;
            }
            // 특별 예외 처리: admin의 toggleVerification (줄바꿈 문법에 안전하도록 백틱 사용)
            if (name === 'toggleVerification') {
                code = `function toggleVerification(id, currentStatus) {
            if (!supabaseClient) return;
            showModalConfirm(currentStatus ? '2차 인증을 취소하시겠습니까?' : '2차 인증을 수동으로 승인하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
                if (error) {
                    if (error.message && error.message.includes('is_verified')) {
                        showModalAlert(\`데이터베이스(profiles)에 is_verified 컬럼이 없습니다.
Supabase SQL Editor에서 profiles 테이블에 is_verified (boolean) 컬럼을 추가해 주세요.

(로컬 테스트를 위해 화면 상에서 승인 상태를 임시로 강제 전환합니다.)\`);
                        // 로컬 메모리 데이터를 강제로 토글하여 테스트를 우회 진행할 수 있도록 처리
                        const userIdx = adminUsersData.findIndex(u => u.id === id);
                        if (userIdx !== -1) {
                            adminUsersData[userIdx].is_verified = !currentStatus;
                            renderAdminUsers(adminUsersData);
                        }
                    } else {
                        showModalAlert('인증 상태 변경 실패: ' + error.message);
                    }
                    return;
                }
                loadAdminUsers();
            });
        }`;
            }
            
            // 이스케이프 문자 언이스케이프 처리 (문자형 \\n, \\`, \\$ 등을 실제 문자로 전환)
            code = code.replace(/\\n/g, '\n')
                       .replace(/\\r/g, '\r')
                       .replace(/\\`/g, '`')
                       .replace(/\\\$/g, '$');
                       
            codes.push(code);
        } else {
            console.warn(`Warning: Could not extract ${name} for ${controllerName}`);
        }
    }
    
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, codes.join('\n\n'), 'utf8');
    console.log(`Generated: ${controllerName}Controller.js (${codes.length} functions)`);
}

console.log('Perfect restore complete!');
