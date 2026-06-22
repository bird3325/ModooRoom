const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const badLogic = `                        if (result.matched) {
                                        document.getElementById('loading-view').classList.add('hidden');
                                        document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                        showModalAlert('건물 인증 업데이트 실패: ' + updateError.message);
                                        return;
                                    }
                                    insertedData = updatedData;
                                    targetBuildingId = existingBuilding.id;
                                    
                                    if (ownerBuildings) {
                                        const idx = ownerBuildings.findIndex(b => b.id === existingBuilding.id);
                                        if (idx !== -1) ownerBuildings[idx] = updatedData[0];
                                    }
                                }
                            } else {
                                const { data: newInserted, error: insertError } = await supabaseClient
                                    .from('buildings')
                                    .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: true, floors: 1, is_verified: true }])
                                    .select();`;

const goodLogic = `                        if (result.matched) {
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
                            } else {
                                const { data: newInserted, error: insertError } = await supabaseClient
                                    .from('buildings')
                                    .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: true, floors: 1, is_verified: true }])
                                    .select();`;

code = code.replace(badLogic, goodLogic);

// Also verify if the replacement succeeded
if (code.includes('checkError')) {
    console.log('Replacement succeeded!');
} else {
    console.log('Replacement failed! Check the string literals.');
}

fs.writeFileSync('server.js', code);
