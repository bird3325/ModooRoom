const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// The new logic to inject
const newLogic = `
        // --- OCR Interactive Extraction Logic ---
        const ocrFieldsList = [
            { id: 'ocr_room_number', label: '호실', placeholder: '예) 302호' },
            { id: 'ocr_area', label: '면적', placeholder: '예) 24.5㎡' },
            { id: 'ocr_deposit', label: '보증금', placeholder: '예) 10000000', type: 'number' },
            { id: 'ocr_monthly_rent', label: '월세', placeholder: '예) 550000', type: 'number' },
            { id: 'ocr_contract_date', label: '계약일', placeholder: '예) 2026-06-16' },
            { id: 'ocr_lease_period', label: '임대차 기간', placeholder: '예) 2026-06-16 ~ 2028-06-15' },
            { id: 'ocr_tenant_name', label: '임차인 이름', placeholder: '예) 홍길동' },
            { id: 'ocr_tenant_phone', label: '임차인 전화번호', placeholder: '예) 010-1234-5678' },
            { id: 'ocr_broker_address', label: '개업 공인중개사 소재지', placeholder: '예) 서울시 마포구 마포대로 1' },
            { id: 'ocr_broker_agency_name', label: '사무소명칭', placeholder: '예) 대박공인중개사' },
            { id: 'ocr_broker_rep_name', label: '대표자성명', placeholder: '예) 김대박' },
            { id: 'ocr_broker_reg_number', label: '등록번호', placeholder: '예) 11440-2015-00123' },
            { id: 'ocr_broker_phone', label: '개업 공인중개사 전화', placeholder: '예) 02-987-6543' },
            { id: 'ocr_maintenance_fee', label: '관리비', placeholder: '예) 70000', type: 'number' },
            { id: 'ocr_cleaning_fee', label: '퇴실청소비', placeholder: '예) 100000', type: 'number' }
        ];

        let currentActiveField = null;
        let pendingBuildingData = null;

        function initializeOcrFields() {
            const container = document.getElementById('ocr-fields-container');
            if (!container) return;
            container.innerHTML = '';
            
            ocrFieldsList.forEach(f => {
                const type = f.type || 'text';
                const fieldHtml = \`
                    <div class="form-group" style="margin-bottom: 12px; display: flex; flex-direction: column;">
                        <label style="font-size: 13px; margin-bottom: 4px;">\${f.label}</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="\${type}" class="form-control" id="\${f.id}" placeholder="\${f.placeholder}" style="flex: 1; padding: 8px; font-size: 13px;">
                            <button type="button" class="btn" style="padding: 0 10px; font-size: 12px; background: #edf2f7; color: #4a5568; border: 1px solid #cbd5e0;" onclick="selectExtractionField('\${f.id}', this)">영역 추출</button>
                        </div>
                    </div>
                \`;
                container.innerHTML += fieldHtml;
            });
        }

        function selectExtractionField(fieldId, btnElement) {
            currentActiveField = fieldId;
            
            // Highlight the active button
            const allBtns = document.querySelectorAll('#ocr-fields-container button');
            allBtns.forEach(b => {
                b.style.background = '#edf2f7';
                b.style.color = '#4a5568';
                b.innerText = '영역 추출';
            });
            
            btnElement.style.background = '#3182ce';
            btnElement.style.color = 'white';
            btnElement.innerText = '이미지 클릭 요망';
            
            showModalAlert('계약서 이미지에서 [' + ocrFieldsList.find(f => f.id === fieldId).label + ']에 해당하는 영역을 클릭하세요.');
        }

        function handleImageClickForExtraction(event) {
            if (!currentActiveField) {
                showModalAlert('먼저 우측 폼에서 추출할 항목의 [영역 추출] 버튼을 눌러주세요.');
                return;
            }
            
            // Mock value mapping based on ID
            let mockValue = '';
            switch(currentActiveField) {
                case 'ocr_room_number': mockValue = '302호'; break;
                case 'ocr_area': mockValue = '24.5㎡'; break;
                case 'ocr_deposit': mockValue = '10000000'; break;
                case 'ocr_monthly_rent': mockValue = '550000'; break;
                case 'ocr_contract_date': mockValue = '2026-06-16'; break;
                case 'ocr_lease_period': mockValue = '2026-06-16 ~ 2028-06-15'; break;
                case 'ocr_tenant_name': mockValue = '홍길동'; break;
                case 'ocr_tenant_phone': mockValue = '010-1234-5678'; break;
                case 'ocr_broker_address': mockValue = '서울시 마포구 마포대로 1'; break;
                case 'ocr_broker_agency_name': mockValue = '대박공인중개사사무소'; break;
                case 'ocr_broker_rep_name': mockValue = '김대박'; break;
                case 'ocr_broker_reg_number': mockValue = '11440-2015-00123'; break;
                case 'ocr_broker_phone': mockValue = '02-987-6543'; break;
                case 'ocr_maintenance_fee': mockValue = '70000'; break;
                case 'ocr_cleaning_fee': mockValue = '100000'; break;
            }
            
            document.getElementById(currentActiveField).value = mockValue;
            showModalAlert('데이터 추출 완료: ' + mockValue);
            
            // Reset button
            const allBtns = document.querySelectorAll('#ocr-fields-container button');
            allBtns.forEach(b => {
                b.style.background = '#edf2f7';
                b.style.color = '#4a5568';
                b.innerText = '영역 추출';
            });
            currentActiveField = null;
        }

        async function submitExtractedContract(event) {
            event.preventDefault();
            
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                if (submitBtn.disabled) return;
                submitBtn.disabled = true;
            }

            document.getElementById('loading-view').classList.remove('hidden');
            document.getElementById('loading-view').querySelector('h3').innerText = '건물 및 계약 정보 최종 등록 중...';

            try {
                // 1. Gather form data
                const contractData = {};
                ocrFieldsList.forEach(f => {
                    contractData[f.id] = document.getElementById(f.id).value.trim();
                });

                if (!supabaseClient) {
                    // Mock environment
                    const newBuilding = { name: pendingBuildingData.name, address: pendingBuildingData.address, isPrimary: ownerBuildings.length === 0, floors: 1, rooms: [] };
                    ownerBuildings.push(newBuilding);
                    
                    document.getElementById('loading-view').classList.add('hidden');
                    showModalAlert('새 건물 추가 및 계약 정보 등록이 완료되었습니다.\\n[추가된 건물: ' + pendingBuildingData.name + ']');
                    renderOwnerBuildings();
                    showView('owner-app');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }

                // Supabase Environment
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    throw new Error('로그인 세션이 없습니다.');
                }

                // 2. Insert Building
                const { data: insertedBuilding, error: bError } = await supabaseClient
                    .from('buildings')
                    .insert([{ owner_id: session.user.id, address: pendingBuildingData.address, name: pendingBuildingData.name, is_primary: ownerBuildings.length === 0, floors: 1, is_verified: true }])
                    .select();

                if (bError) throw bError;

                if (!ownerBuildings) ownerBuildings = [];
                ownerBuildings.push(...insertedBuilding);

                // 3. Insert Contract
                const buildingId = insertedBuilding[0].id;
                const { error: cError } = await supabaseClient
                    .from('contracts')
                    .insert([{
                        building_id: buildingId,
                        room_number: contractData['ocr_room_number'],
                        area: contractData['ocr_area'],
                        deposit: contractData['ocr_deposit'] ? parseInt(contractData['ocr_deposit']) : 0,
                        monthly_rent: contractData['ocr_monthly_rent'] ? parseInt(contractData['ocr_monthly_rent']) : 0,
                        maintenance_fee: contractData['ocr_maintenance_fee'] ? parseInt(contractData['ocr_maintenance_fee']) : 0,
                        cleaning_fee: contractData['ocr_cleaning_fee'] ? parseInt(contractData['ocr_cleaning_fee']) : 0,
                        contract_date: contractData['ocr_contract_date'],
                        lease_period: contractData['ocr_lease_period'],
                        tenant_name: contractData['ocr_tenant_name'],
                        tenant_phone: contractData['ocr_tenant_phone'],
                        broker_address: contractData['ocr_broker_address'],
                        broker_agency_name: contractData['ocr_broker_agency_name'],
                        broker_rep_name: contractData['ocr_broker_rep_name'],
                        broker_reg_number: contractData['ocr_broker_reg_number'],
                        broker_phone: contractData['ocr_broker_phone']
                    }]);

                if (cError) {
                    console.error('Contract Insert Error:', cError);
                    // It's not a fatal error for the building itself, but we show it
                    showModalAlert('건물은 등록되었으나 계약서 데이터 저장에 실패했습니다: ' + cError.message);
                } else {
                    showModalAlert('새 건물 추가 및 계약 정보 파싱이 완료되었습니다.\\n[추가된 건물: ' + pendingBuildingData.name + ']');
                }

                document.getElementById('loading-view').classList.add('hidden');
                renderOwnerBuildings();
                showView('owner-app');
            } catch (error) {
                document.getElementById('loading-view').classList.add('hidden');
                showModalAlert('오류가 발생했습니다: ' + error.message);
            }
            
            if (submitBtn) submitBtn.disabled = false;
        }

        async function submitAddBuilding(event) {
            event.preventDefault();
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                if (submitBtn.disabled) return;
                submitBtn.disabled = true;
            }

            const bAddr = document.getElementById('add-building-address').value.trim();
            const bName = document.getElementById('add-building-name').value.trim();
            const fileInput = document.getElementById('add-building-file');

            if (!bAddr || !bName) {
                showModalAlert('주소와 건물명을 입력해주세요.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            if (!fileInput.files[0]) {
                showModalAlert('소유권 증빙 서류를 첨부해주세요.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            // 중복 검사 로직 (미리 체크)
            if (supabaseClient) {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    showModalAlert('로그인 세션이 없습니다.');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
                const { data: existingBuildings, error: checkError } = await supabaseClient
                    .from('buildings')
                    .select('address')
                    .eq('owner_id', session.user.id);
                if (checkError) {
                    showModalAlert('중복 검사 중 오류가 발생했습니다.');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
                const isSupaDuplicate = existingBuildings && existingBuildings.some(b => b.address.replace(/\\s+/g, '') === bAddr.replace(/\\s+/g, ''));
                if (isSupaDuplicate) {
                    showModalAlert('이미 동일한 주소지로 등록된 건물이 존재합니다.');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
            } else {
                const isDuplicate = ownerBuildings.some(b => b.address.replace(/\\s+/g, '') === bAddr.replace(/\\s+/g, ''));
                if (isDuplicate) {
                    showModalAlert('이미 동일한 주소지로 등록된 건물이 존재합니다.');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }
            }

            // Store pending data
            pendingBuildingData = { address: bAddr, name: bName };

            // Load Image to preview
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('ocr-preview-img').src = e.target.result;
                initializeOcrFields();
                showView('ocr-extraction-view');
                if (submitBtn) submitBtn.disabled = false;
            }
            reader.readAsDataURL(file);
        }
`;

// We will replace the entire submitAddBuilding with newLogic.
// But we need to use a regex to capture it.
// The existing function is from async function submitAddBuilding(event) { ... to its end block.
// Since it's large, let's use string operations.
let startIndex = content.indexOf('async function submitAddBuilding(event) {');
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
    content = content.substring(0, startIndex) + newLogic + content.substring(endIndex + 1);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Replaced submitAddBuilding and added OCR logic.');
} else {
    console.log('Could not find submitAddBuilding');
}
