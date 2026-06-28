const fs = require('fs');
const path = require('path');

const ownerPath = path.join(__dirname, '../public/js/views/ownerController.js');
let content = fs.readFileSync(ownerPath, 'utf8');

// Normalize newlines
content = content.replace(/\r\n/g, '\n');

// Find function deleteBuildingFromPage
const anchor = "function deleteBuildingFromPage(idx) {";
const startIdx = content.indexOf(anchor);

if (startIdx !== -1) {
    let braceCount = 0;
    let endIdx = -1;
    let started = false;
    
    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            started = true;
        } else if (content[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
    
    if (endIdx !== -1) {
        const before = content.substring(0, startIdx);
        const after = content.substring(endIdx);
        
        const newFunc = `function deleteBuildingFromPage(idx) {
            showModalConfirm('정말로 이 건물을 삭제하시겠습니까? 삭제 시 복구할 수 없습니다.', async function(confirmed) {
                if (confirmed) {
                    const b = ownerBuildings[idx];
                    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                        try {
                            const { error } = await supabaseClient.from('buildings').delete().eq('id', b.id);
                            if (error) {
                                console.error("DB 삭제 실패", error);
                                showModalAlert(\`데이터베이스 삭제 실패: \${error.message}
                                
(로컬 테스트를 위해 화면 상에서 건물을 임시로 삭제 처리합니다.)\`);
                                const wasPrimary = b.isPrimary || b.is_primary;
                                ownerBuildings.splice(idx, 1);
                                if (wasPrimary && ownerBuildings.length > 0) {
                                    ownerBuildings[0].isPrimary = true;
                                    ownerBuildings[0].is_primary = true;
                                }
                                renderOwnerBuildings();
                                if (ownerBuildings.length === 0) {
                                    isAuthenticated = false;
                                }
                                showView('owner-app');
                                return;
                            }
                        } catch (e) {
                            console.error(e);
                            showModalAlert('오류가 발생했습니다.');
                            return;
                        }
                    }
                    const wasPrimary = b.isPrimary || b.is_primary;
                    ownerBuildings.splice(idx, 1);
                    if (wasPrimary && ownerBuildings.length > 0) {
                        ownerBuildings[0].isPrimary = true;
                        ownerBuildings[0].is_primary = true;
                    }
                    showModalAlert('건물이 삭제되었습니다.');
                    renderOwnerBuildings();
                    
                    // 건물이 모두 삭제된 경우
                    if (ownerBuildings.length === 0) {
                        isAuthenticated = false; // 로컬 인증 해제
                        
                        // DB 상의 프로필도 is_verified = false로 동기화
                        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                                if (session && session.user) {
                                    supabaseClient.from('profiles')
                                        .update({ is_verified: false })
                                        .eq('id', session.user.id)
                                        .then(({ error: profileError }) => {
                                            if (profileError) {
                                                console.error("프로필 인증 해제 실패:", profileError);
                                            } else {
                                                console.log("DB 프로필 2차 인증 해제 완료 (건물 없음)");
                                            }
                                        });
                                }
                            });
                        }
                    }
                    showView('owner-app');
                }
            });
        }`;
        
        content = before + newFunc + after;
    }
}

// Ensure escapes are correct
content = content.replace(/\\\\\\'/g, "\\'");

fs.writeFileSync(ownerPath, content, 'utf8');
console.log('Successfully patched ownerController.js delete logic with DB is_verified sync!');
