const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Normalize newlines for search
let appJsNorm = appJs.replace(/\r\n/g, '\n');

// 1. Update the successful verification block
const oldVerifyBlock = `                        if (result.matched) {
                            if (!supabaseClient) {
                                // 로컬 시뮬레이션 모드 처리
                                console.log("Using mock db for verification success");
                                markUserVerified();
                                document.getElementById('loading-view').classList.add('hidden');
                                showModalAlert('계약서 인증이 성공적으로 완료되었습니다.\\n[등록/인증건물: ' + bName + ']\\n(로컬 시뮬레이션 모드)');
                                showView('owner-app');
                                return;
                            }
                            let insertedData = [];
                            let targetBuildingId = null;
                            const { data: existingBuilding } = await supabaseClient.from('buildings').select('*').eq('address', bAddr).single();
                            if (existingBuilding) {
                                const { data: updatedData, error: updateError } = await supabaseClient.from('buildings').update({is_verified: true}).eq('id', existingBuilding.id).select();
                                if (updateError) {
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
                            } else {
                                const { data: newInserted, error: insertError } = await supabaseClient
                                    .from('buildings')
                                    .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: true, floors: 1, is_verified: true }])
                                    .select();
                                    
                                if (insertError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                    showModalAlert('건물 등록 실패: ' + insertError.message);
                                    return;
                                }
                                insertedData = newInserted;
                                targetBuildingId = newInserted[0].id;
                                if (!ownerBuildings) ownerBuildings = [];
                                ownerBuildings.push(...insertedData);
                            }
                            
                            // 임차인 정보 추출 시 DB 등록 처리
                            if (result.extractedTenant) {
                                const tenantInsertData = {
                                    building_id: targetBuildingId,
                                    owner_id: session.user.id,
                                    address: bAddr,
                                                                room: result.extractedTenant.room,
                                    tenant_name: result.extractedTenant.name
                                };
                                const { error: tenantErr } = await supabaseClient.from('tenants').insert([tenantInsertData]);
                                if (!tenantErr) {
                                    tenantAddMsg = '\\n[임차인: ' + result.extractedTenant.name + '(' + result.extractedTenant.room + ') 자동 등록됨]';
                                    if (typeof activeTenantsData === 'undefined') window.activeTenantsData = [];
                                    activeTenantsData.push({ address: bAddr, room: result.extractedTenant.room, tenantName: result.extractedTenant.name });
                                }
                            }
                            
                            // 계약서 세부 정보 추출 시 DB 등록 처리
                            if (result.extractedContract) {
                                const contractInsertData = {
                                    building_id: targetBuildingId,
                                    owner_id: session.user.id,
                                    deposit: result.extractedContract.deposit,
                                    rent: result.extractedContract.rent,
                                    detailed_address: result.extractedContract.detailed_address,
                                    lease_period: result.extractedContract.lease_period,
                                    realtor_address: result.extractedContract.realtor_address,
                                    realtor_name: result.extractedContract.realtor_name,
                                    realtor_representative: result.extractedContract.realtor_representative,
                                    realtor_phone: result.extractedContract.realtor_phone,
                                    realtor_registration_no: result.extractedContract.realtor_registration_no,
                                    contract_image_url: preprocessedBase64
                                };
                                const { error: contractErr } = await supabaseClient.from('contracts').insert([contractInsertData]);
                                if (contractErr) {
                                    console.error("contracts insert error:", contractErr);
                                    alert('계약서 정보 저장 중 오류가 발생했습니다: ' + contractErr.message);
                                } else {
                                    console.log("계약서 정보 저장 완료:", contractInsertData);
                                }
                            }

                            document.getElementById('loading-view').classList.add('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';

                            markUserVerified();
                            showModalAlert('계약서 인증이 성공적으로 완료되었습니다.\\n[등록/인증건물: ' + bName + ']' + tenantAddMsg);
                            showView('owner-app');`;

const newVerifyBlock = `                        if (result.matched) {
                            let targetBuildingId = null;
                            if (!supabaseClient) {
                                // 로컬 시뮬레이션 모드 처리
                                console.log("Using mock db for verification success");
                                targetBuildingId = 'local-dummy-building-id';
                                if (!ownerBuildings) ownerBuildings = [];
                                const isDuplicate = ownerBuildings.some(b => b.address === bAddr);
                                if (!isDuplicate) {
                                    ownerBuildings.push({ id: targetBuildingId, name: bName, address: bAddr, is_primary: true, floors: 1, is_verified: true });
                                }
                            } else {
                                let insertedData = [];
                                const { data: existingBuilding } = await supabaseClient.from('buildings').select('*').eq('address', bAddr).single();
                                if (existingBuilding) {
                                    const { data: updatedData, error: updateError } = await supabaseClient.from('buildings').update({is_verified: true}).eq('id', existingBuilding.id).select();
                                    if (updateError) {
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
                                } else {
                                    const { data: newInserted, error: insertError } = await supabaseClient
                                        .from('buildings')
                                        .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: true, floors: 1, is_verified: true }])
                                        .select();
                                        
                                    if (insertError) {
                                        document.getElementById('loading-view').classList.add('hidden');
                                        document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                        showModalAlert('건물 등록 실패: ' + insertError.message);
                                        return;
                                    }
                                    insertedData = newInserted;
                                    targetBuildingId = newInserted[0].id;
                                    if (!ownerBuildings) ownerBuildings = [];
                                    ownerBuildings.push(...insertedData);
                                }
                                
                                // 임차인 정보 추출 시 DB 등록 처리
                                if (result.extractedTenant) {
                                    const tenantInsertData = {
                                        building_id: targetBuildingId,
                                        owner_id: session.user.id,
                                        address: bAddr,
                                                                    room: result.extractedTenant.room,
                                        tenant_name: result.extractedTenant.name
                                    };
                                    const { error: tenantErr } = await supabaseClient.from('tenants').insert([tenantInsertData]);
                                    if (!tenantErr) {
                                        tenantAddMsg = '\\n[임차인: ' + result.extractedTenant.name + '(' + result.extractedTenant.room + ') 자동 등록됨]';
                                        if (typeof activeTenantsData === 'undefined') window.activeTenantsData = [];
                                        activeTenantsData.push({ address: bAddr, room: result.extractedTenant.room, tenantName: result.extractedTenant.name });
                                    }
                                }
                            }
                            
                            // 2차 인증 성공 시, 자동으로 15개 항목 AI 추출 뷰로 이동하도록 연동합니다.
                            window.ocrTargetBuildingId = targetBuildingId;
                            const previewImage = document.getElementById('ocr-preview-img');
                            if (previewImage) {
                                previewImage.src = preprocessedBase64;
                            }
                            
                            document.getElementById('loading-view').classList.add('hidden');
                            showModalAlert('계약서 명의 및 주소 인증이 성공적으로 완료되었습니다.\\n[등록/인증건물: ' + bName + ']\\n\\n선택 사항인 15개 항목 AI 자동 추출을 진행합니다.');
                            
                            showView('ocr-extraction-view');
                            
                            if (typeof executeGeminiExtraction === 'function') {
                                setTimeout(executeGeminiExtraction, 500);
                            }
                            markUserVerified();`;

// Normalize old block
const oldVerifyBlockNorm = oldVerifyBlock.replace(/\r\n/g, '\n');

if (appJsNorm.includes(oldVerifyBlockNorm)) {
    appJs = appJsNorm.replace(oldVerifyBlockNorm, newVerifyBlock);
    console.log('Successfully updated OCR verification success block to navigate to ocr-extraction-view');
} else {
    console.log('Failed to match verification success block');
}

// 2. Update showView implementation to render fields dynamically
const oldShowViewPattern = `            } else if (viewName === 'ocr-extraction-view') {
                if(document.getElementById('ocr-extraction-view')) document.getElementById('ocr-extraction-view').classList.remove('hidden');`;

const newShowViewPattern = `            } else if (viewName === 'ocr-extraction-view') {
                if(document.getElementById('ocr-extraction-view')) {
                    document.getElementById('ocr-extraction-view').classList.remove('hidden');
                    // 15가지 상세 항목 필드 동적 생성
                    const fieldsMeta = [
                        { id: 'ocr_room_number', label: '1. 임대할 부분 (호실)', placeholder: '예: 302호' },
                        { id: 'ocr_area', label: '2. 임대 면적 (㎡)', placeholder: '예: 24.5' },
                        { id: 'ocr_deposit', label: '3. 보증금 (원)', placeholder: '예: 10000000' },
                        { id: 'ocr_monthly_rent', label: '4. 차임(월세) (원)', placeholder: '예: 550000' },
                        { id: 'ocr_maintenance_fee', label: '5. 관리비 (원)', placeholder: '예: 70000' },
                        { id: 'ocr_cleaning_fee', label: '6. 청소비 (원)', placeholder: '예: 100000' },
                        { id: 'ocr_contract_date', label: '7. 계약일', placeholder: '예: 2026-06-16' },
                        { id: 'ocr_lease_period', label: '8. 임대차 기간 (종속기간)', placeholder: '예: 2026-06-16 ~ 2028-06-15' },
                        { id: 'ocr_tenant_name', label: '9. 임차인 성명', placeholder: '예: 홍길동' },
                        { id: 'ocr_tenant_phone', label: '10. 임차인 전화번호', placeholder: '예: 010-1234-5678' },
                        { id: 'ocr_broker_address', label: '11. 개업공인중개사 소재지', placeholder: '예: 서울특별시 마포구 백범로 123' },
                        { id: 'ocr_broker_agency_name', label: '12. 중개사무소 명칭', placeholder: '예: 대박공인중개사사무소' },
                        { id: 'ocr_broker_representative', label: '13. 개업공인중개사 대표 성명', placeholder: '예: 김대박' },
                        { id: 'ocr_broker_registration_no', label: '14. 중개사무소 등록번호', placeholder: '예: 11440-2015-00123' },
                        { id: 'ocr_broker_phone', label: '15. 개업공인중개사 전화번호', placeholder: '예: 02-987-6543' }
                    ];
                    const container = document.getElementById('ocr-fields-container');
                    if (container) {
                        container.innerHTML = fieldsMeta.map(f => \`
                            <div class="form-group" style="margin-bottom: 12px;">
                                <label style="font-size: 13px; font-weight: 600; color: #4a5568; display: block; margin-bottom: 4px;">\${f.label}</label>
                                <input type="text" id="\${f.id}" class="form-control" placeholder="\${f.placeholder}" style="font-size: 13px; padding: 8px;">
                            </div>
                        \`).join('');
                    }
                }`;

appJsNorm = appJs.replace(/\r\n/g, '\n');
if (appJsNorm.includes(oldShowViewPattern)) {
    appJs = appJsNorm.replace(oldShowViewPattern, newShowViewPattern);
    console.log('Successfully updated showView dynamic inputs');
} else {
    console.log('Failed to match oldShowViewPattern');
}

// 3. Update submitExtractedContract to prevent crash if !supabaseClient
const oldSubmitStart = `async function submitExtractedContract(event) {
            event.preventDefault();
            const sessionData = await supabaseClient.auth.getSession();`;

const newSubmitStart = `async function submitExtractedContract(event) {
            event.preventDefault();
            if (!supabaseClient) {
                showView('owner-app');
                showModalAlert('AI 계약서 추출 정보가 성공적으로 저장되었습니다! (로컬 시뮬레이션 모드)');
                if (typeof renderOwnerBuildings === 'function') {
                    renderOwnerBuildings();
                }
                return;
            }
            const sessionData = await supabaseClient.auth.getSession();`;

appJsNorm = appJs.replace(/\r\n/g, '\n');
if (appJsNorm.includes(oldSubmitStart)) {
    appJs = appJsNorm.replace(oldSubmitStart, newSubmitStart);
    console.log('Successfully updated submitExtractedContract null check');
} else {
    console.log('Failed to match oldSubmitStart');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Finished updating OCR 15 items flow');
