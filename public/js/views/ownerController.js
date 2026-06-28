async function authenticateOwnerDetailed(event) {
            event.preventDefault();
            const sessionData = await supabaseClient.auth.getSession();
            const session = sessionData.data.session;
            if (!session) {
                showModalAlert('로그인이 필요합니다.');
                return;
            }

            const bName = document.getElementById('owner-building-name').value;
            const bAddr = document.getElementById('owner-building-address').value;
            const fileInput = document.getElementById('owner-contract-file');
            
            if (!bAddr) {
                showModalAlert('주소를 검색하여 입력해 주세요.');
                return;
            }
            if (!fileInput.files || fileInput.files.length === 0) {
                showModalAlert('임대차 계약서 이미지를 첨부해주세요.');
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64Data = e.target.result;
                const myName = document.getElementById('common-edit-name').value || document.getElementById('main-display-name').textContent.replace(' 님', '').trim() || '김임대';
                
                document.getElementById('loading-view').querySelector('h3').innerText = '계약서 정보를 분석 중입니다...';
                document.getElementById('loading-view').classList.remove('hidden');

                // Canvas를 활용한 이미지 전처리 (흑백 및 대비 극대화)
                const img = new Image();
                img.onload = async function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const MAX_WIDTH = 1500;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    
                    const threshold = 140; // 흑백화 임계값
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const v = (0.299 * r + 0.587 * g + 0.114 * b);
                        const color = v >= threshold ? 255 : 0;
                        data[i] = color;
                        data[i + 1] = color;
                        data[i + 2] = color;
                    }
                    
                    ctx.putImageData(imageData, 0, 0);

                    // 민감정보(주민등록번호) 마스킹 처리
                    if (window.Tesseract) {
                        try {
                            document.getElementById('loading-view').querySelector('h3').innerText = '개인정보 보호를 위해 마스킹 처리 중입니다...';
                            const worker = await Tesseract.createWorker('kor', 1, { logger: m => console.log(m) });
                            const ret = await worker.recognize(canvas.toDataURL('image/png'));
                            const juminRegex = /\d{6}\s*-\s*\d{1,7}/;
                            ret.data.words.forEach(word => {
                                if (juminRegex.test(word.text) || (word.text.includes('-') && /\d{6}/.test(word.text))) {
                                    const bbox = word.bbox;
                                    ctx.fillStyle = 'black';
                                    ctx.fillRect(bbox.x0 - 5, bbox.y0 - 5, (bbox.x1 - bbox.x0) + 10, (bbox.y1 - bbox.y0) + 10);
                                }
                            });
                            await worker.terminate();
                            document.getElementById('loading-view').querySelector('h3').innerText = '마스킹 완료! 계약서 정보를 분석 중입니다...';
                        } catch (e) {
                            console.error("마스킹 프로세스 오류:", e);
                        }
                    }

                    const preprocessedBase64 = canvas.toDataURL('image/png');

                    try {
                        const response = await fetch('/api/verify-contract-ocr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                imageBase64: preprocessedBase64,
                                ownerName: myName,
                                bAddr: bAddr
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (!response.ok || !result.success) {
                            document.getElementById('loading-view').classList.add('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                            showModalAlert(result.error || result.message || '인증 실패: 계약서 분석을 완료할 수 없습니다.');
                            return;
                        }

                        if (result.matched) {
                            let insertedData = [];
                            let targetBuildingId = null;
                            let tenantAddMsg = '';
                            const { data: existingBuildings } = await supabaseClient.from('buildings').select('*').eq('address', bAddr);
                            const existingBuilding = existingBuildings && existingBuildings.length > 0 ? existingBuildings[0] : null;
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
                            
                            // 기존의 자동 DB 등록을 제거하고, 15개 항목 추출 모달을 띄워 사용자가 검증하도록 변경합니다.
                            window.ocrTargetBuildingId = targetBuildingId;
                            
                            // 원본 이미지를 모달 이미지 뷰어에 등록 (이후 executeGeminiExtraction에서 사용)
                            const previewImage = document.getElementById('ocr-preview-img');
                            if (previewImage) {
                                previewImage.src = preprocessedBase64;
                            }
                            
                            document.getElementById('loading-view').classList.add('hidden');
                            showModalAlert('계약서 명의 및 주소 인증이 성공적으로 완료되었습니다.\
[등록/인증건물: ' + bName + ']\
\
15개 항목 AI 자동 추출을 시작합니다.');
                            
                            // 15개 항목 확인 UI 모달(뷰) 열기
                            showView('ocr-extraction-view');
                            
                            // 자동 추출 실행
                            if (typeof executeGeminiExtraction === 'function') {
                                setTimeout(executeGeminiExtraction, 500); // UI 안정화 후 자동 실행
                            } else {
                                console.error('executeGeminiExtraction 함수를 찾을 수 없습니다.');
                            }
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';

                            markUserVerified();
                            showModalAlert('계약서 인증이 성공적으로 완료되었습니다.\
[등록/인증건물: ' + bName + ']' + tenantAddMsg);
                            showView('owner-app');
                        } else {
                            document.getElementById('loading-view').classList.add('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                            showModalAlert('인증 실패: 계약서에서 회원님의 이름(' + myName + ') 또는 건물 주소를 명확히 찾을 수 없습니다.');
                        }
                    } catch (error) {
                        console.error(error);
                        document.getElementById('loading-view').classList.add('hidden');
                        document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                        showModalAlert('OCR 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                };
                img.src = base64Data;
            };
            reader.readAsDataURL(file);
        }

function renderOwnerBuildings() {
            const list = document.getElementById('owner-buildings-list');
            if (!list) return;
            
            if (ownerBuildings.length === 0) {
                list.innerHTML = '<p style="font-size: 13px; color: #718096; text-align: center; padding: 20px;">등록된 건물이 없습니다.</p>';
                return;
            }
            
            list.innerHTML = ownerBuildings.map(function(b, idx) {
                var badge = (b.isPrimary || b.is_primary) ? '<span style="font-size: 11px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #4a5568; margin-left: 5px;">대표 건물</span>' : '';
                var verifiedBadge = b.is_verified ? '<span style="font-size: 11px; background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; margin-left: 5px;"><i class="fa-solid fa-check"></i> 2차 인증 완료</span>' : '<span style="font-size: 11px; background: #fff5f5; color: #e53e3e; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">미인증</span>';
                
                // 매칭된 임차인 가져오기 (이 건물의 주소와 일치하는 임차인)
                const matchedTenantsForBuilding = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).filter(function(m) { return m.address === b.address; });
                
                if (!b.rooms) b.rooms = [];
                matchedTenantsForBuilding.forEach(function(m) {
                    const exists = b.rooms.some(function(r) { return r.roomNumber === m.room; });
                    if (!exists && m.room) {
                        b.rooms.push({ roomNumber: m.room, type: '미지정' });
                    }
                });

                let allRoomsMap = {};
                if (b.rooms && b.rooms.length > 0) {
                    b.rooms.forEach(function(r) {
                        allRoomsMap[r.roomNumber] = r.type;
                    });
                }
                
                const allRoomKeys = Object.keys(allRoomsMap);
                var roomsHtml = '';
                if (allRoomKeys.length > 0) {
                    roomsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #edf2f7; font-size: 12px; color: #4a5568; display: flex; flex-direction: column; gap: 8px; width: 100%;">' +
                                allRoomKeys.map(function(roomNum) {
                                    const matched = matchedTenantsForBuilding.find(function(m) { return m.room === roomNum; });
                                    const hasValidTenant = matched && matched.tenantName && matched.tenantName !== '이름 없음' && matched.tenantName.trim() !== '';
                                    const badge = hasValidTenant ? '<span style="color:#319795; font-weight:bold; margin-left:4px;">[' + matched.tenantName + ' 입주중]</span>' : '';
                                    const typeStr = allRoomsMap[roomNum] === '미지정' ? '' : ' (' + allRoomsMap[roomNum] + ')';
                                    const rIdx = b.rooms ? b.rooms.findIndex(function(r) { return r.roomNumber === roomNum; }) : -1;
                                    const roomMenuId = 'room-menu-' + idx + '-' + roomNum;
                                    const dotsMenu = '<div style="position: relative; display: inline-block;">' +
                                                     '<button onclick="toggleRoomMenu(\'' + roomMenuId + '\', event)" style="background: none; border: none; color: #a0aec0; cursor: pointer; padding: 5px; font-size: 12px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>' +
                                                     '<div id="' + roomMenuId + '" class="hidden room-dropdown-menu" style="position: absolute; right: 0; top: 25px; background: white; border: 1px solid #edf2f7; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 80px; z-index: 100; overflow: hidden; display: flex; flex-direction: column;">' +
                                                     '<button onclick="openRoomDetailPage(' + idx + ', ' + rIdx + '); document.getElementById(\'' + roomMenuId + '\').classList.add(\'hidden\');" style="display: block; width: 100%; text-align: left; padding: 10px; border: none; background: none; font-size: 13px; color: #4a5568; cursor: pointer; border-bottom: 1px solid #edf2f7;">수정</button>' +
                                                     '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + '); document.getElementById(\'' + roomMenuId + '\').classList.add(\'hidden\');" style="display: block; width: 100%; text-align: left; padding: 10px; border: none; background: none; font-size: 13px; color: #e53e3e; cursor: pointer;">삭제</button>' +
                                                     '</div>' +
                                                     '</div>';
                                    return '<div style="display: flex; justify-content: space-between; align-items: center; background: #f7fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 6px; box-sizing: border-box; width: 100%;">' +
                                           '<span style="display: flex; align-items: center; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;"><i class="fa-solid fa-door-closed" style="color:#a0aec0; margin-right:5px; flex-shrink: 0;"></i>' + roomNum + typeStr + badge + '</span>' +
                                           dotsMenu +
                                           '</div>';
                                }).join('') +
                                '</div>';
                } else {
                    roomsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #edf2f7; font-size: 12px; color: #a0aec0;">' +
                                '등록된 호실 및 매칭된 임차인이 없습니다.' +
                                '</div>';
                }

                return '<div style="padding: 15px; border: 1px solid #edf2f7; border-radius: 8px; margin-bottom: 10px; background: white; position: relative;">' +
                       '<div style="display: flex; justify-content: space-between; align-items: start;">' +
                       '<div>' +
                       '<h4 style="font-size: 14px; color: var(--primary-deep-navy); margin-bottom: 5px;">' +
                       b.name + ' ' + badge + ' ' + verifiedBadge + 
                       '</h4>' +
                       '<p style="font-size: 12px; color: #718096;">' + b.address + '</p>' +
                       '</div>' +
                       '<div style="position: relative;">' +
                       '<button onclick="toggleBuildingMenu(' + idx + ', event)" style="background: none; border: none; color: #a0aec0; cursor: pointer; padding: 5px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>' +
                       '<div id="building-menu-' + idx + '" class="hidden" style="position: absolute; right: 0; top: 25px; background: white; border: 1px solid #edf2f7; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 80px; z-index: 10; overflow: hidden;">' +
                       '<button onclick="openBuildingManagementPage(' + idx + '); document.getElementById(\'building-menu-' + idx + '\').classList.add(\'hidden\');" style="display: block; width: 100%; text-align: left; padding: 10px; border: none; background: none; font-size: 13px; color: #4a5568; cursor: pointer; border-bottom: 1px solid #edf2f7;">수정</button>' +
                       '<button onclick="deleteBuildingFromPage(' + idx + '); document.getElementById(\'building-menu-' + idx + '\').classList.add(\'hidden\');" style="display: block; width: 100%; text-align: left; padding: 10px; border: none; background: none; font-size: 13px; color: #e53e3e; cursor: pointer;">삭제</button>' +
                       '</div>' +
                       '</div>' +
                       '</div>' +
                       roomsHtml +
                       '</div>';
            }).join('');
        }

function toggleBuildingMenu(idx, event) {
            event.stopPropagation();
            const menu = document.getElementById('building-menu-' + idx);
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('[id^="building-menu-"]').forEach(el => el.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        }

function openBuildingManagementPage(idx) {
            const b = ownerBuildings[idx];
            showView('building-management-page');
            const content = document.getElementById('building-management-content');
            
            content.innerHTML = '<div class="card" style="border-top: 4px solid var(--primary-light-blue);">' +
                '<div class="card-title" style="margin-bottom: 25px;"><i class="fa-solid fa-building"></i> 건물 상세 관리</div>' +
                '<div class="form-group">' +
                    '<label>건물명</label>' +
                    '<input type="text" id="bm-name" class="form-control" value="' + b.name + '">' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>건물 주소</label>' +
                    '<input type="text" id="bm-addr" class="form-control" value="' + b.address + '" readonly style="background: #e2e8f0;">' +
                    '<p style="font-size: 11px; color: #718096; margin-top: 4px;">주소는 인증된 정보로 직접 수정할 수 없습니다.</p>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>총 층수</label>' +
                    '<input type="number" id="bm-floors" class="form-control" value="' + (b.floors || 1) + '" min="1">' +
                '</div>' +
                '<div style="display: flex; gap: 10px; margin-top: 20px;">' +
                    '<button class="btn btn-orange" style="flex: 1; justify-content: center;" onclick="saveBuildingManagement(' + idx + ')">변경사항 저장</button>' +
                    '<button class="btn" style="flex: 1; justify-content: center; background: #e2e8f0; color: #4a5568;" onclick="setPrimaryBuildingFromPage(' + idx + ')">대표 건물로 지정</button>' +
                '</div>' +
                '<div style="margin-top: 20px; text-align: right;">' +
                    '<button class="btn" style="background: #e53e3e; color: white; border: none; font-size: 13px; padding: 8px 16px;" onclick="deleteBuildingFromPage(' + idx + ')">건물 삭제</button>' +
                '</div>' +
            '</div>' +
            '<div class="card" style="margin-top: 20px;">' +
                '<div class="card-title"><i class="fa-solid fa-door-open"></i> 호실 관리</div>' +
                '<div style="display: flex; gap: 10px; margin-bottom: 20px;">' +
                    '<input type="text" id="bm-add-room-num" class="form-control" placeholder="호실 번호 (예: 101호)" style="margin: 0; flex: 2;">' +
                    '<select id="bm-add-room-type" class="form-control" style="margin: 0; flex: 1;">' +
                        '<option value="원룸">원룸</option>' +
                        '<option value="투룸">투룸</option>' +
                    '</select>' +
                    '<button onclick="addRoomFromPage(' + idx + ')" class="btn btn-orange" style="white-space: nowrap;">호실 추가</button>' +
                '</div>' +
                '<div id="bm-room-list"></div>' +
            '</div>';
            renderRoomList(idx);
        }

function renderRoomList(idx) {
            const b = ownerBuildings[idx];
            const list = document.getElementById('bm-room-list');
            if (!list) return;
            if (!b.rooms || b.rooms.length === 0) {
                list.innerHTML = '<p style="color: #a0aec0; font-size: 13px;">등록된 호실이 없습니다.</p>';
                return;
            }
            list.innerHTML = b.rooms.map(function(r, rIdx) {
                const matched = activeTenantsData.find(function(m) { return m.room === r.roomNumber && m.address === b.address; });
                const badge = matched ? '<span style="background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; border: 1px solid #b2f5ea;"><i class="fa-solid fa-user-check"></i> 입주: ' + matched.tenantName + '</span>' : '';
                
                const actionButtons = matched ? 
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold; font-size: 12px;">삭제</button>' :
                    '<button onclick="openManualTenantModal(' + idx + ', ' + rIdx + ')" style="background: none; border: 1px solid #3182ce; border-radius: 4px; padding: 2px 8px; color: #3182ce; cursor: pointer; font-size: 11px; margin-right: 8px;">수동 등록</button>' +
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold; font-size: 12px;">삭제</button>';

                return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; background: #f8fafc;">' +
                    '<span><strong style="color: var(--primary-deep-navy);">' + r.roomNumber + '</strong> <span style="font-size: 12px; color: #718096;">(' + r.type + ')</span>' + badge + '</span>' +
                    '<div>' + actionButtons + '</div>' +
                '</div>';
            }).join('');
        }

function openManualTenantModal(bIdx, rIdx) {
            const b = ownerBuildings[bIdx];
            const roomNum = b.rooms[rIdx].roomNumber;
            document.getElementById('mt-room-display').innerText = roomNum;
            document.getElementById('mt-building-id').value = b.id || '';
            document.getElementById('mt-building-address').value = b.address;
            document.getElementById('mt-room-number').value = roomNum;
            
            // 초기화
            document.getElementById('mt-name').value = '';
            document.getElementById('mt-phone').value = '';
            document.getElementById('mt-start').value = '';
            document.getElementById('mt-end').value = '';
            document.getElementById('mt-file').value = '';

            document.getElementById('manual-tenant-modal').classList.remove('hidden');
        }

function closeManualTenantModal() {
            document.getElementById('manual-tenant-modal').classList.add('hidden');
        }

async function submitManualTenant() {
            const bId = document.getElementById('mt-building-id').value;
            const bAddr = document.getElementById('mt-building-address').value;
            const rNum = document.getElementById('mt-room-number').value;
            const tName = document.getElementById('mt-name').value;
            const tPhone = document.getElementById('mt-phone').value;
            const sDate = document.getElementById('mt-start').value;
            const eDate = document.getElementById('mt-end').value;

            if (!tName) {
                showModalAlert('임차인 이름을 입력해주세요.');
                return;
            }

            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (!session) {
                        showModalAlert('로그인이 필요합니다.');
                        return;
                    }

                    // Base64 파일 변환 (선택적)
                    let fileBase64 = null;
                    const fileInput = document.getElementById('mt-file');
                    if (fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        const reader = new FileReader();
                        fileBase64 = await new Promise((resolve) => {
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(file);
                        });
                    }

                    const payload = {
                        owner_id: session.user.id,
                        building_id: bId,
                        room_number: rNum,
                        status: 'manual',
                        tenant_name: tName,
                        tenant_phone: tPhone,
                        start_date: sDate || null,
                        end_date: eDate || null,
                        contract_url: fileBase64 // 단순 텍스트 컬럼에 임시 저장
                    };

                    const { error } = await supabaseClient.from('contracts').insert([payload]);
                    if (error) {
                        console.error('수동 등록 실패:', error);
                        showModalAlert('DB 저장 실패: ' + error.message + '\
\
(참고: contracts 테이블에 tenant_name 등의 추가 컬럼이 반영되어 있어야 합니다.)');
                        return;
                    }
                } catch(e) {
                    console.error(e);
                    showModalAlert('오류가 발생했습니다.');
                    return;
                }
            }
            
            showModalAlert(tName + ' 님의 정보가 수동으로 등록되었습니다.');
            closeManualTenantModal();
            loadActiveTenants(); // 목록 갱신
        }

async function saveBuildingManagement(idx) {
            const newName = document.getElementById('bm-name').value;
            const newFloors = parseInt(document.getElementById('bm-floors').value) || 1;
            const b = ownerBuildings[idx];

            if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                try {
                    const { error } = await supabaseClient.from('buildings')
                        .update({ name: newName, floors: newFloors })
                        .eq('id', b.id);
                    if (error) {
                        console.error("DB 수정 실패", error);
                        showModalAlert('DB 수정 실패: ' + error.message);
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showModalAlert('오류가 발생했습니다.');
                    return;
                }
            }

            b.name = newName;
            b.floors = newFloors;
            showModalAlert('건물 정보가 성공적으로 수정되었습니다.');
            renderOwnerBuildings();
        }

async function setPrimaryBuildingFromPage(idx) {
            const targetBuilding = ownerBuildings[idx];
            
            if (typeof supabaseClient !== 'undefined' && supabaseClient && targetBuilding.id) {
                try {
                    // 기존 대표 건물 해제
                    const prevPrimary = ownerBuildings.find(b => b.isPrimary || b.is_primary);
                    if (prevPrimary && prevPrimary.id !== targetBuilding.id) {
                        await supabaseClient.from('buildings').update({ is_primary: false }).eq('id', prevPrimary.id);
                    }
                    
                    // 새 대표 건물 지정
                    const { error } = await supabaseClient.from('buildings').update({ is_primary: true }).eq('id', targetBuilding.id);
                    if (error) {
                        console.error("DB 대표건물 설정 실패", error);
                        showModalAlert('DB 수정 실패: ' + error.message);
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showModalAlert('오류가 발생했습니다.');
                    return;
                }
            }

            ownerBuildings.forEach(b => {
                b.isPrimary = false;
                b.is_primary = false;
            });
            targetBuilding.isPrimary = true;
            targetBuilding.is_primary = true;
            showModalAlert('대표 건물로 지정되었습니다.');
            renderOwnerBuildings();
        }

function deleteBuildingFromPage(idx) {
            showModalConfirm('정말로 이 건물을 삭제하시겠습니까? 삭제 시 복구할 수 없습니다.', async function(confirmed) {
                if (confirmed) {
                    const b = ownerBuildings[idx];
                    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                        try {
                            const { error } = await supabaseClient.from('buildings').delete().eq('id', b.id);
                            if (error) {
                                console.error("DB 삭제 실패", error);
                                showModalAlert(`데이터베이스 삭제 실패: ${error.message}
                                
(로컬 테스트를 위해 화면 상에서 건물을 임시로 삭제 처리합니다.)`);
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
                            try {
                                const { data: { session } } = await supabaseClient.auth.getSession();
                                if (session && session.user) {
                                    const { error: profileError } = await supabaseClient.from('profiles')
                                        .update({ is_verified: false })
                                        .eq('id', session.user.id);
                                    if (profileError) {
                                        console.error("프로필 인증 해제 실패:", profileError);
                                    } else {
                                        console.log("DB 프로필 2차 인증 해제 완료 (건물 없음)");
                                    }
                                }
                            } catch (e) {
                                console.error("프로필 업데이트 중 예외 발생:", e);
                            }
                        }
                    }
                    showView('owner-app');
                }
            });
        }

async function addRoomFromPage(idx) {
            const num = document.getElementById('bm-add-room-num').value.trim();
            const type = document.getElementById('bm-add-room-type').value;
            if (!num) return showModalAlert('호실 번호를 입력해주세요.');
            const b = ownerBuildings[idx];
            if (!b.rooms) b.rooms = [];
            b.rooms.push({ roomNumber: num, type: type });

            if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                try {
                    const sessionData = await supabaseClient.auth.getSession();
                    const session = sessionData?.data?.session;
                    if (session) {
                        const { error } = await supabaseClient.from('contracts').insert([{
                            building_id: b.id,
                            owner_id: session.user.id,
                            status: 'manual',
                            room_number: num,
                            room_count: type === '투룸' ? 2 : 1,
                            bathroom_count: 1,
                            living_room_count: 0,
                            veranda_count: 1,
                            deposit: 0,
                            monthly_rent: 0,
                            maintenance_fee: 0,
                            cleaning_fee: 0
                        }]);
                        if (error) {
                            console.error('호실 추가 DB 저장 실패:', error);
                            showModalAlert('DB 저장 실패: ' + error.message);
                            return;
                        }
                    }
                } catch(e) {
                    console.error(e);
                }
            }

            document.getElementById('bm-add-room-num').value = '';
            renderRoomList(idx);
            renderOwnerBuildings();

            const addedRoomIdx = b.rooms.length - 1;
            if (addedRoomIdx >= 0) {
                openRoomDetailPage(idx, addedRoomIdx);
            }
        }

async function deleteRoomFromPage(bIdx, rIdx) {
            const b = ownerBuildings[bIdx];
            const roomToDelete = b.rooms[rIdx];
            if (!roomToDelete) return;

            showModalConfirm('정말로 ' + roomToDelete.roomNumber + '호를 삭제하시겠습니까? 삭제 시 복구할 수 없습니다.', async function(confirmed) {
                if (confirmed) {
                    const roomNumStr = roomToDelete.roomNumber.toString().trim();
                    const roomNumDigits = roomNumStr.replace(/[^0-9]/g, '');
                    const roomVariants = [
                        roomNumStr,
                        roomNumStr + '호',
                        roomNumStr.replace('호', ''),
                        roomNumDigits,
                        roomNumDigits + '호'
                    ];
                    const uniqueVariants = [...new Set(roomVariants)].filter(Boolean);

                    let dbDeleteSuccess = true;
                    let dbMessage = '';

                    if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                        try {
                            const matched = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).find(function(m) { 
                                return uniqueVariants.includes(m.room) && (m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim())); 
                            });

                            let query = supabaseClient.from('contracts').delete();
                            if (matched && matched.id) {
                                query = query.eq('id', matched.id);
                            } else {
                                query = query.eq('building_id', b.id).in('room_number', uniqueVariants);
                            }

                            const { data: deletedRows, error } = await query.select();
                                
                            if (error) {
                                console.error('호실 삭제 DB 반영 실패 (contracts):', error);
                                showModalAlert('DB 삭제 실패: ' + error.message);
                                return;
                            }

                            if (!deletedRows || deletedRows.length === 0) {
                                dbDeleteSuccess = false;
                                dbMessage = '\n\n(참고: DB에 매칭되는 호실 계약 데이터가 없거나 삭제 권한이 없어 실제로 제거되지 않았습니다.)';
                            }
                        } catch(e) {
                            console.error(e);
                            dbDeleteSuccess = false;
                            dbMessage = '\n\n(오류로 인해 DB 삭제에 실패했습니다.)';
                        }
                    }

                    b.rooms.splice(rIdx, 1);

                    // activeTenantsData 에서 해당 호실 데이터 제거
                    if (typeof activeTenantsData !== 'undefined' && activeTenantsData) {
                        activeTenantsData = activeTenantsData.filter(function(m) {
                            const isMatch = uniqueVariants.includes(m.room) && (m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim()));
                            return !isMatch;
                        });
                    }

                    renderRoomList(bIdx);
                    renderOwnerBuildings();

                    if (dbDeleteSuccess) {
                        showModalAlert(roomToDelete.roomNumber + '호가 정상적으로 삭제되었습니다.');
                    } else {
                        showModalAlert(roomToDelete.roomNumber + '호가 화면에서 삭제되었습니다.' + dbMessage);
                    }
                }
            });
        }

function handleAddBuildingFileChange(event) {
            const dropText = document.getElementById('drag-drop-text-add');
            const dropIcon = document.getElementById('drag-drop-icon-add');
                            if (event.target.files.length > 0) {
                                dropText.innerText = event.target.files[0].name;
                                dropIcon.className = "fa-solid fa-file-circle-check";
                                dropIcon.style.color = "var(--primary-light-blue)";
                            } else {
                                dropText.innerText = "클릭하거나 이미지를 드래그하여 업로드하세요";
                                dropIcon.className = "fa-solid fa-cloud-arrow-up";
                                dropIcon.style.color = "#a0aec0";
                            }
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

                            document.getElementById('loading-view').classList.remove('hidden');
                            document.getElementById('loading-view').querySelector('h3').innerText = '계약서 OCR 대조 중...';

                            try {
                                // 시뮬레이션 지연 (2초)
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                if (!supabaseClient) {
                                    const isDuplicate = ownerBuildings.some(b => b.address.replace(/\s+/g, '') === bAddr.replace(/\s+/g, ''));
                                    if (isDuplicate) {
                                        document.getElementById('loading-view').classList.add('hidden');
                                        showModalAlert('이미 동일한 주소지로 등록된 건물이 존재합니다.');
                                        if (submitBtn) submitBtn.disabled = false;
                                        return;
                                    }
                                    const newBuilding = { name: bName, address: bAddr, isPrimary: ownerBuildings.length === 0, floors: 1, rooms: [] };
                                    ownerBuildings.push(newBuilding);
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';
                                    showModalAlert('새 건물 추가가 완료되었습니다.\
[추가된 건물: ' + bName + ']');
                                    renderOwnerBuildings();
                                    showView('owner-app');
                                    
                                    document.getElementById('add-building-address').value = '';
                                    document.getElementById('add-building-name').value = '';
                                    fileInput.value = '';
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                const { data: { session } } = await supabaseClient.auth.getSession();
                                if (!session) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('로그인 세션이 없습니다.');
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                // 중복 검사 로직
                                const { data: existingBuildings, error: checkError } = await supabaseClient
                                    .from('buildings')
                                    .select('address')
                                    .eq('owner_id', session.user.id);

                                if (checkError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('중복 검사 중 오류가 발생했습니다.');
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                const isSupaDuplicate = existingBuildings && existingBuildings.some(b => b.address.replace(/\s+/g, '') === bAddr.replace(/\s+/g, ''));

                                if (isSupaDuplicate) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('이미 동일한 주소지로 등록된 건물이 존재합니다.');
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                const { data: insertedData, error } = await supabaseClient
                                    .from('buildings')
                                    .insert([{ owner_id: session.user.id, address: bAddr, name: bName, is_primary: ownerBuildings.length === 0, floors: 1, is_verified: true }])
                                    .select();

                                document.getElementById('loading-view').classList.add('hidden');
                                document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';

                                if (error) {
                                    showModalAlert('건물 등록 실패: ' + error.message);
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                if (!ownerBuildings) ownerBuildings = [];
                                ownerBuildings.push(...insertedData);
                                
                                showModalAlert('새 건물 추가가 완료되었습니다.\
[추가된 건물: ' + bName + ']');
                                renderOwnerBuildings();
                                showView('owner-app');

                                document.getElementById('add-building-address').value = '';
                                document.getElementById('add-building-name').value = '';
                                fileInput.value = '';
                            } catch (error) {
                                document.getElementById('loading-view').classList.add('hidden');
                                document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';
                                 showModalAlert('인증 중 오류가 발생했습니다: ' + error.message);
                            }
                        }

function toggleRoomMenu(menuId, event) {
    event.stopPropagation();
    const el = document.getElementById(menuId);
    const wasHidden = el.classList.contains('hidden');
    document.querySelectorAll('.room-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    if (wasHidden) {
        el.classList.remove('hidden');
    }
}

function toggleRdMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('rd-dropdown');
    const isHidden = menu.classList.contains('hidden');
    document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.add('hidden'));
    if (isHidden) menu.classList.remove('hidden');
}

async function openRoomDetailPage(bIdx, rIdx) {
    const b = ownerBuildings[bIdx];
    const r = b.rooms[rIdx];
    if (!r) return;

    showView('room-detail-page');

    document.getElementById('rd-building-idx').value = bIdx;
    document.getElementById('rd-room-idx').value = rIdx;

    // 기본 필드 초기화 및 룸 정보 표시
    document.getElementById('rd-room-number').value = r.roomNumber;
    document.getElementById('rd-room-type').value = r.type || '미지정';
    document.getElementById('rd-contract-id').value = '';
    document.getElementById('rd-area').value = '';
    document.getElementById('rd-room-status').value = '공실';
    document.getElementById('rd-tenant-name').value = '';
    document.getElementById('rd-tenant-phone').value = '';
    document.getElementById('rd-deposit').value = 0;
    document.getElementById('rd-monthly-rent').value = 0;
    document.getElementById('rd-maintenance-fee').value = 0;
    document.getElementById('rd-cleaning-fee').value = 0;
    document.getElementById('rd-contract-date').value = '';
    document.getElementById('rd-lease-start-date').value = '';
    document.getElementById('rd-lease-end-date').value = '';
    document.getElementById('rd-broker-agency').value = '';
    document.getElementById('rd-broker-rep').value = '';
    document.getElementById('rd-broker-address').value = '';
    document.getElementById('rd-broker-phone').value = '';
    document.getElementById('rd-broker-reg-number').value = '';

    let matched = null;
    if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
        try {
            const { data, error } = await supabaseClient.from('contracts')
                .select('*')
                .eq('building_id', b.id)
                .eq('room_number', r.roomNumber)
                .maybeSingle();
            
            if (!error && data) {
                matched = {
                    id: data.id,
                    room: data.room_number,
                    area: data.area,
                    status: data.status,
                    tenantName: data.tenant_name,
                    tenantPhone: data.tenant_phone,
                    deposit: data.deposit,
                    monthlyRent: data.monthly_rent,
                    maintenanceFee: data.maintenance_fee,
                    cleaningFee: data.cleaning_fee,
                    contractDate: data.contract_date,
                    leaseStartDate: data.start_date,
                    leaseEndDate: data.end_date,
                    brokerAgency: data.broker_agency,
                    brokerRep: data.broker_rep,
                    brokerAddress: data.broker_address,
                    brokerPhone: data.broker_phone,
                    brokerRegNumber: data.broker_reg_number
                };
            }
        } catch (e) {
            console.error('DB에서 계약 정보 조회 실패:', e);
        }
    }

    // DB 조회 결과가 없거나 실패한 경우 로컬 activeTenantsData 백업 사용
    if (!matched) {
        matched = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).find(function(m) {
            return m.room === r.roomNumber && (m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim()));
        });
    }

    if (matched) {
        document.getElementById('rd-contract-id').value = matched.id || '';
        document.getElementById('rd-area').value = matched.area || '';
        document.getElementById('rd-room-status').value = (matched.status !== 'vacant') ? '입주중' : '공실';

        document.getElementById('rd-tenant-name').value = (matched.tenantName !== '이름 없음' && matched.tenantName !== undefined) ? matched.tenantName : '';
        document.getElementById('rd-tenant-phone').value = matched.tenantPhone || '';
        document.getElementById('rd-deposit').value = matched.deposit || 0;
        document.getElementById('rd-monthly-rent').value = matched.monthlyRent || 0;
        document.getElementById('rd-maintenance-fee').value = matched.maintenanceFee || 0;
        document.getElementById('rd-cleaning-fee').value = matched.cleaningFee || 0;

        document.getElementById('rd-contract-date').value = matched.contractDate || '';
        document.getElementById('rd-lease-start-date').value = matched.leaseStartDate || '';
        document.getElementById('rd-lease-end-date').value = matched.leaseEndDate || '';

        document.getElementById('rd-broker-agency').value = matched.brokerAgency || '';
        document.getElementById('rd-broker-rep').value = matched.brokerRep || '';
        document.getElementById('rd-broker-address').value = matched.brokerAddress || '';
        document.getElementById('rd-broker-phone').value = matched.brokerPhone || '';
        document.getElementById('rd-broker-reg-number').value = matched.brokerRegNumber || '';
    }

    setTimeout(initRdDragAndDrop, 100);
}

async function handleRdOcrFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const textDisplay = document.getElementById('rd-ocr-drag-text');
    const dropZone = document.getElementById('rd-ocr-drag-zone');
    
    // AI 분석 중 폼 내 입력 요소 비활성화 처리
    const formElements = document.querySelectorAll('#room-detail-edit-form input, #room-detail-edit-form select, #room-detail-edit-form button');
    formElements.forEach(el => {
        if (el.id !== 'rd-ocr-file-input') {
            el.disabled = true;
        }
    });

    // UI 변경 (업로드 중 표시 - 더욱 강조되도록 빨간색/포인트컬러와 굵은 서체 및 보더 애니메이션 효과 지정)
    textDisplay.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--point-orange); font-size: 16px; margin-right: 6px;"></i> <strong style="color: var(--point-orange); font-size: 14px;">[${file.name}] AI가 계약서를 정밀 분석하고 있습니다. 잠시만 기다려주세요...</strong>`;
    dropZone.style.borderColor = 'var(--point-orange)';
    dropZone.style.backgroundColor = '#fffaf0';
    dropZone.style.boxShadow = '0 0 10px rgba(237, 137, 54, 0.3)';

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result;
        
        try {
            const response = await fetch('/api/gemini-extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: base64Data,
                    apiKey: typeof getGeminiApiKey === 'function' ? await getGeminiApiKey() : null
                })
            });
            
            const result = await response.json();
            
            // 분석 완료 후 원상 복구 함수 정의
            const enableFormElements = () => {
                formElements.forEach(el => {
                    el.disabled = false;
                });
                dropZone.style.boxShadow = '';
            };

            if (!response.ok || !result.success) {
                showModalAlert(result.error || '계약서 분석에 실패했습니다.');
                enableFormElements();
                resetRdOcrUi();
                return;
            }
            
            enableFormElements();
            const data = result.data || result; // API 형식 맞춤
            
            // 추출 성공 시 각 폼 필드 채우기
            if (data.ocr_room_type) document.getElementById('rd-room-type').value = data.ocr_room_type;
            if (data.ocr_area) document.getElementById('rd-area').value = parseFloat(data.ocr_area) || '';
            
            // 보증금 / 월세 등 정수 변환하여 입력
            if (data.ocr_deposit) {
                const dep = parseInt(data.ocr_deposit.toString().replace(/[^0-9]/g, ''));
                if (!isNaN(dep)) document.getElementById('rd-deposit').value = dep;
            }
            if (data.ocr_monthly_rent) {
                const rent = parseInt(data.ocr_monthly_rent.toString().replace(/[^0-9]/g, ''));
                if (!isNaN(rent)) document.getElementById('rd-monthly-rent').value = rent;
            }
            if (data.ocr_maintenance_fee) {
                const fee = parseInt(data.ocr_maintenance_fee.toString().replace(/[^0-9]/g, ''));
                if (!isNaN(fee)) document.getElementById('rd-maintenance-fee').value = fee;
            }
            if (data.ocr_cleaning_fee) {
                const fee = parseInt(data.ocr_cleaning_fee.toString().replace(/[^0-9]/g, ''));
                if (!isNaN(fee)) document.getElementById('rd-cleaning-fee').value = fee;
            }
            
            if (data.ocr_tenant_name) document.getElementById('rd-tenant-name').value = data.ocr_tenant_name;
            if (data.ocr_tenant_phone) document.getElementById('rd-tenant-phone').value = data.ocr_tenant_phone;
            
            // 날짜 변환 (YYYY-MM-DD -> YYYY.MM.DD)
            const formatOcrDate = (dStr) => {
                if (!dStr) return '';
                return dStr.replace(/-/g, '.');
            };
            if (data.ocr_contract_date) document.getElementById('rd-contract-date').value = formatOcrDate(data.ocr_contract_date);
            if (data.ocr_lease_start_date) document.getElementById('rd-lease-start-date').value = formatOcrDate(data.ocr_lease_start_date);
            if (data.ocr_lease_end_date) document.getElementById('rd-lease-end-date').value = formatOcrDate(data.ocr_lease_end_date);
            
            if (data.ocr_broker_agency_name) document.getElementById('rd-broker-agency').value = data.ocr_broker_agency_name;
            if (data.ocr_broker_representative) document.getElementById('rd-broker-rep').value = data.ocr_broker_representative;
            if (data.ocr_broker_address) document.getElementById('rd-broker-address').value = data.ocr_broker_address;
            if (data.ocr_broker_phone) document.getElementById('rd-broker-phone').value = data.ocr_broker_phone;
            if (data.ocr_broker_registration_no) document.getElementById('rd-broker-reg-number').value = data.ocr_broker_registration_no;
            
            document.getElementById('rd-room-status').value = '입주중'; // 임차인이 생겼으므로 입주중으로 자동 선택

            showModalAlert('계약서 OCR 정보가 성공적으로 자동 입력되었습니다.');
            
            textDisplay.innerHTML = `<span style="color: var(--point-orange); font-weight: bold;"><i class="fa-solid fa-circle-check"></i> ${file.name} 추출 완료</span>`;
            
            // 이미지 노출 및 돋보기/부분추출 셋업
            const previewContainer = document.getElementById('rd-ocr-preview-container');
            const previewImg = document.getElementById('rd-ocr-preview-img');
            if (previewContainer && previewImg) {
                previewImg.src = base64Data;
                previewContainer.classList.remove('hidden');
                setTimeout(() => {
                    initRdOcrInteractions();
                    setRdOcrMode('magnifier');
                }, 100);
            }
        } catch (err) {
            console.error('OCR 분석 처리 에러:', err);
            showModalAlert('OCR 분석 중 통신 실패 또는 오류가 발생했습니다.');
            resetRdOcrUi();
        }
    };
    
    reader.readAsDataURL(file);
    
    function resetRdOcrUi() {
        textDisplay.innerHTML = '클릭하거나 임대차 계약서 이미지를 여기에 놓으세요';
        dropZone.style.borderColor = '#a0aec0';
        dropZone.style.backgroundColor = '#ffffff';
        document.getElementById('rd-ocr-file-input').value = '';
        const previewContainer = document.getElementById('rd-ocr-preview-container');
        if (previewContainer) previewContainer.classList.add('hidden');
    }
}

function initRdDragAndDrop() {
    const dropZone = document.getElementById('rd-ocr-drag-zone');
    if (!dropZone) return;
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--point-orange)';
            dropZone.style.backgroundColor = '#fffaf0';
        }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            if (eventName === 'dragleave' || eventName === 'drop') {
                dropZone.style.borderColor = '#a0aec0';
                dropZone.style.backgroundColor = '#ffffff';
            }
            if (eventName === 'drop' && e.dataTransfer && e.dataTransfer.files.length > 0) {
                const fileInput = document.getElementById('rd-ocr-file-input');
                if (fileInput) {
                    fileInput.files = e.dataTransfer.files;
                    handleRdOcrFileChange({ target: fileInput });
                }
            }
        }, false);
    });
}

// 돋보기 및 선택 AI 추출 관련 호실 상세 뷰 전역 상태
let rdOcrMode = 'magnifier';
let isRdDragging = false;
let rdStartX = 0, rdStartY = 0;
let lastRdExtractedText = '';

function setRdOcrMode(mode) {
    rdOcrMode = mode;
    const btnMag = document.getElementById('btn-rd-mode-magnifier');
    const btnSel = document.getElementById('btn-rd-mode-select');
    const lens = document.getElementById('rd-magnifier-lens');
    const selectionBox = document.getElementById('rd-selection-box');
    
    if (lens) lens.style.display = 'none';
    if (selectionBox) selectionBox.style.display = 'none';
    closeRdExtractionPopup();
    
    if (mode === 'magnifier') {
        if (btnMag) {
            btnMag.className = 'btn btn-orange';
            btnMag.style.background = '';
            btnMag.style.color = '';
        }
        if (btnSel) {
            btnSel.className = 'btn';
            btnSel.style.background = '#e2e8f0';
            btnSel.style.color = '#4a5568';
        }
    } else {
        if (btnMag) {
            btnMag.className = 'btn';
            btnMag.style.background = '#e2e8f0';
            btnMag.style.color = '#4a5568';
        }
        if (btnSel) {
            btnSel.className = 'btn btn-orange';
            btnSel.style.background = '';
            btnSel.style.color = '';
        }
    }
}

function initRdOcrInteractions() {
    const wrapper = document.getElementById('rd-ocr-image-wrapper');
    const img = document.getElementById('rd-ocr-preview-img');
    const lens = document.getElementById('rd-magnifier-lens');
    const selectionBox = document.getElementById('rd-selection-box');
    
    if (!wrapper || !img) return;
    
    // 리스너가 중복 등록되는 것을 방지하기 위해 flag 설정
    if (wrapper.dataset.listenersInitialized) return;
    wrapper.dataset.listenersInitialized = 'true';
    
    wrapper.addEventListener('mousemove', function(e) {
        const rect = img.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const wrapX = e.clientX - wrapperRect.left;
        const wrapY = e.clientY - wrapperRect.top;
        
        if (rdOcrMode === 'magnifier') {
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                lens.style.display = 'block';
                
                lens.style.left = (wrapX - lens.offsetWidth / 2) + 'px';
                lens.style.top = (wrapY - lens.offsetHeight / 2) + 'px';
                
                lens.style.backgroundImage = `url('${img.src}')`;
                const zoom = 2.5;
                lens.style.backgroundSize = (rect.width * zoom) + 'px ' + (rect.height * zoom) + 'px';
                
                const posX = -(x * zoom - lens.offsetWidth / 2);
                const posY = -(y * zoom - lens.offsetHeight / 2);
                lens.style.backgroundPosition = posX + 'px ' + posY + 'px';
            } else {
                lens.style.display = 'none';
            }
        } else if (rdOcrMode === 'select' && isRdDragging) {
            const currentX = wrapX;
            const currentY = wrapY;
            
            const width = Math.abs(currentX - rdStartX);
            const height = Math.abs(currentY - rdStartY);
            const left = Math.min(currentX, rdStartX);
            const top = Math.min(currentY, rdStartY);
            
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
        }
    });
    
    wrapper.addEventListener('mouseleave', function() {
        if (lens) lens.style.display = 'none';
    });
    
    wrapper.addEventListener('mousedown', function(e) {
        if (rdOcrMode !== 'select') return;
        const wrapperRect = wrapper.getBoundingClientRect();
        
        isRdDragging = true;
        rdStartX = e.clientX - wrapperRect.left;
        rdStartY = e.clientY - wrapperRect.top;
        
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.left = rdStartX + 'px';
        selectionBox.style.top = rdStartY + 'px';
        selectionBox.style.display = 'block';
        
        closeRdExtractionPopup();
    });
    
    window.addEventListener('mouseup', function(e) {
        if (rdOcrMode !== 'select' || !isRdDragging) return;
        isRdDragging = false;
        
        const rect = img.getBoundingClientRect();
        const boxRect = selectionBox.getBoundingClientRect();
        
        const cropX = boxRect.left - rect.left;
        const cropY = boxRect.top - rect.top;
        const cropW = boxRect.width;
        const cropH = boxRect.height;
        
        if (cropW > 10 && cropH > 10) {
            triggerRdSelectiveOcr(cropX, cropY, cropW, cropH, e.clientX, e.clientY);
        } else {
            selectionBox.style.display = 'none';
        }
    });
}

async function triggerRdSelectiveOcr(x, y, w, h, screenX, screenY) {
    const img = document.getElementById('rd-ocr-preview-img');
    const popup = document.getElementById('rd-extraction-popup');
    const textPreview = document.getElementById('rd-extracted-text-preview');
    
    if (!img || !img.src) return;
    
    popup.style.display = 'block';
    popup.style.left = (screenX - 100) + 'px';
    popup.style.top = (screenY + window.scrollY + 10) + 'px';
    textPreview.innerText = 'AI 분석 중...';
    
    const tempImg = new Image();
    tempImg.onload = async function() {
        const scaleX = tempImg.naturalWidth / img.width;
        const scaleY = tempImg.naturalHeight / img.height;
        
        const canvas = document.createElement('canvas');
        canvas.width = w * scaleX;
        canvas.height = h * scaleY;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(
            tempImg, 
            x * scaleX, y * scaleY, w * scaleX, h * scaleY, 
            0, 0, canvas.width, canvas.height
        );
        
        const croppedBase64 = canvas.toDataURL('image/png');
        
        try {
            const res = await fetch('/api/ocr-region', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: croppedBase64 })
            });
            const result = await res.json();
            if (result.success && result.text) {
                lastRdExtractedText = result.text;
                textPreview.innerText = result.text;
            } else {
                lastRdExtractedText = '';
                textPreview.innerText = '텍스트 추출 실패';
            }
        } catch (err) {
            textPreview.innerText = '에러: ' + err.message;
        }
    };
    tempImg.src = img.src;
}

function applyRdSelectedText(fieldId) {
    const el = document.getElementById(fieldId);
    if (el && lastRdExtractedText) {
        let text = lastRdExtractedText;
        if (fieldId === 'rd-area') {
            text = text.replace(/[m㎡²\s]/gi, '');
        } else if (['rd-deposit', 'rd-monthly-rent', 'rd-maintenance-fee', 'rd-cleaning-fee'].includes(fieldId)) {
            text = text.replace(/[^0-9]/g, '');
        } else if (['rd-contract-date', 'rd-lease-start-date', 'rd-lease-end-date'].includes(fieldId)) {
            text = text.replace(/-/g, '.');
        }
        el.value = text;
        
        const originalBg = el.style.backgroundColor;
        el.style.transition = 'background-color 0.5s';
        el.style.backgroundColor = '#e6fffa';
        setTimeout(() => {
            el.style.backgroundColor = originalBg;
        }, 1000);
        
        closeRdExtractionPopup();
        
        const selectionBox = document.getElementById('rd-selection-box');
        if (selectionBox) selectionBox.style.display = 'none';
    }
}

function closeRdExtractionPopup() {
    const popup = document.getElementById('rd-extraction-popup');
    if (popup) popup.style.display = 'none';
}

async function saveRoomDetailEdit() {
    const bIdx = parseInt(document.getElementById('rd-building-idx').value);
    const rIdx = parseInt(document.getElementById('rd-room-idx').value);
    const contractId = document.getElementById('rd-contract-id').value;

    const b = ownerBuildings[bIdx];
    if (!b) return;
    const r = b.rooms[rIdx];
    if (!r) return;

    const roomType = document.getElementById('rd-room-type').value;
    const area = parseFloat(document.getElementById('rd-area').value) || null;
    const roomStatus = document.getElementById('rd-room-status').value;

    const tenantName = document.getElementById('rd-tenant-name').value.trim();
    const tenantPhone = document.getElementById('rd-tenant-phone').value.trim();
    const deposit = parseInt(document.getElementById('rd-deposit').value) || 0;
    const monthlyRent = parseInt(document.getElementById('rd-monthly-rent').value) || 0;
    const maintenanceFee = parseInt(document.getElementById('rd-maintenance-fee').value) || 0;
    const cleaningFee = parseInt(document.getElementById('rd-cleaning-fee').value) || 0;

    const contractDate = document.getElementById('rd-contract-date').value;
    const leaseStartDate = document.getElementById('rd-lease-start-date').value;
    const leaseEndDate = document.getElementById('rd-lease-end-date').value;

    const brokerAgency = document.getElementById('rd-broker-agency').value;
    const brokerRep = document.getElementById('rd-broker-rep').value;
    const brokerAddress = document.getElementById('rd-broker-address').value;
    const brokerPhone = document.getElementById('rd-broker-phone').value;
    const brokerRegNumber = document.getElementById('rd-broker-reg-number').value;

    r.type = roomType;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const sessionData = await supabaseClient.auth.getSession();
            const session = sessionData?.data?.session;

            let brokerId = null;
            if (session && brokerRegNumber && brokerRegNumber.trim() !== '') {
                try {
                    // 1. 등록번호로 기존 중개소 존재여부 확인
                    const { data: existingBrokers, error: selectErr } = await supabaseClient
                        .from('brokers')
                        .select('id')
                        .eq('registration_no', brokerRegNumber.trim());
                    
                    if (!selectErr && existingBrokers && existingBrokers.length > 0) {
                        brokerId = existingBrokers[0].id;
                        // 기존 정보 업데이트
                        await supabaseClient.from('brokers').update({
                            agency_name: brokerAgency,
                            representative_name: brokerRep,
                            address: brokerAddress,
                            phone: brokerPhone
                        }).eq('id', brokerId);
                    } else {
                        // 존재하지 않으면 새로 생성
                        const { data: newBroker, error: insertErr } = await supabaseClient
                            .from('brokers')
                            .insert([{
                                owner_id: session.user.id,
                                agency_name: brokerAgency || '공인중개사사무소',
                                representative_name: brokerRep,
                                registration_no: brokerRegNumber.trim(),
                                address: brokerAddress,
                                phone: brokerPhone
                            }])
                            .select();
                        
                        if (!insertErr && newBroker && newBroker.length > 0) {
                            brokerId = newBroker[0].id;
                        } else if (insertErr) {
                            console.error('중개소 등록 에러:', insertErr);
                        }
                    }
                } catch (bErr) {
                    console.error('중개소 처리 예외:', bErr);
                }
            }

            if (contractId) {
                const { error } = await supabaseClient.from('contracts')
                    .update({
                        room_count: roomType === '투룸' ? 2 : 1,
                        area: area,
                        tenant_name: tenantName || '이름 없음',
                        tenant_phone: tenantPhone,
                        deposit: deposit,
                        monthly_rent: monthlyRent,
                        maintenance_fee: maintenanceFee,
                        cleaning_fee: cleaningFee,
                        contract_date: contractDate || null,
                        lease_start_date: leaseStartDate || null,
                        lease_end_date: leaseEndDate || null,
                        broker_id: brokerId,
                        // 하위 호환
                        broker_agency_name: brokerAgency,
                        broker_rep_name: brokerRep,
                        broker_address: brokerAddress,
                        broker_phone: brokerPhone,
                        broker_reg_number: brokerRegNumber,
                        status: (roomStatus === '입주중' ? 'manual' : 'vacant')
                    })
                    .eq('id', contractId);
                if (error) {
                    console.error('계약 업데이트 실패:', error);
                    showModalAlert('변경사항 저장 실패: ' + error.message);
                    return;
                }
            } else if (session) {
                const { error } = await supabaseClient.from('contracts')
                    .insert([{
                        building_id: b.id,
                        owner_id: session.user.id,
                        room_number: r.roomNumber,
                        room_count: roomType === '투룸' ? 2 : 1,
                        area: area,
                        tenant_name: tenantName || '이름 없음',
                        tenant_phone: tenantPhone,
                        deposit: deposit,
                        monthly_rent: monthlyRent,
                        maintenance_fee: maintenanceFee,
                        cleaning_fee: cleaningFee,
                        contract_date: contractDate || null,
                        lease_start_date: leaseStartDate || null,
                        lease_end_date: leaseEndDate || null,
                        broker_id: brokerId,
                        // 하위 호환
                        broker_agency_name: brokerAgency,
                        broker_rep_name: brokerRep,
                        broker_address: brokerAddress,
                        broker_phone: brokerPhone,
                        broker_reg_number: brokerRegNumber,
                        status: (roomStatus === '입주중' ? 'manual' : 'vacant')
                    }]);
                if (error) {
                    console.error('새 계약 생성 실패:', error);
                    showModalAlert('변경사항 저장 실패: ' + error.message);
                    return;
                }
            }
        } catch(e) {
            console.error(e);
            showModalAlert('오류가 발생했습니다.');
            return;
        }
    }

    showModalAlert('호실 정보가 성공적으로 업데이트되었습니다.');
    showView('owner-app');
    if (typeof loadActiveTenants === 'function') {
        loadActiveTenants();
    } else {
        renderOwnerBuildings();
    }
}