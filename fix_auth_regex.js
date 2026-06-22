const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Match the specific broken if (result.matched) block
const regexAuthBlock = /if\s*\(result\.matched\)\s*\{\s*document\.getElementById\('loading-view'\)\.classList\.add\('hidden'\);\s*document\.getElementById\('loading-view'\)\.querySelector\('h3'\)\.innerText\s*=\s*'로그인 정보를 확인 중입니다\.\.\.';\s*showModalAlert\('건물 인증 업데이트 실패:\s*'\s*\+\s*updateError\.message\);\s*return;\s*\}\s*insertedData\s*=\s*updatedData;\s*targetBuildingId\s*=\s*existingBuilding\.id;\s*if\s*\(ownerBuildings\)\s*\{\s*const\s*idx\s*=\s*ownerBuildings\.findIndex\(b\s*=>\s*b\.id\s*===\s*existingBuilding\.id\);\s*if\s*\(idx\s*!==\s*-1\)\s*ownerBuildings\[idx\]\s*=\s*updatedData\[0\];\s*\}\s*\}\s*\}\s*else\s*\{/g;

const goodAuthBlock = `if (result.matched) {
                            let insertedData = null;
                            let targetBuildingId = null;
                            let tenantAddMsg = '';
                            
                            // Check if building already exists for this owner and address
                            const { data: existingBuildings, error: checkError } = await supabaseClient
                                .from('buildings')
                                .select('*')
                                .eq('owner_id', session.user.id)
                                .eq('address', bAddr);
                                
                            const existingBuilding = (existingBuildings && existingBuildings.length > 0) ? existingBuildings[0] : null;
                            
                            if (existingBuilding) {
                                const { data: updatedData, error: updateError } = await supabaseClient
                                    .from('buildings')
                                    .update({ is_verified: true })
                                    .eq('id', existingBuilding.id)
                                    .select();
                                    
                                if (updateError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                    showModalAlert('건물 인증 업데이트 실패: ' + updateError.message);
                                    return;
                                }
                                insertedData = updatedData;
                                targetBuildingId = existingBuilding.id;
                                
                                if (typeof ownerBuildings !== 'undefined' && ownerBuildings) {
                                    const idx = ownerBuildings.findIndex(b => b.id === existingBuilding.id);
                                    if (idx !== -1) ownerBuildings[idx] = updatedData[0];
                                }
                            } else {`;

if (regexAuthBlock.test(code)) {
    code = code.replace(regexAuthBlock, goodAuthBlock);
    fs.writeFileSync('server.js', code);
    console.log('Fixed missing catch syntax error!');
} else {
    console.log('regexAuthBlock not found!');
}
