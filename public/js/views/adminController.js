async function loadAdminUsers() {
            loadGeminiKeyIntoAdmin();
            if (!supabaseClient) return;
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                showModalAlert('회원 목록 조회 실패: ' + error.message);
                return;
            }
            adminUsersData = data || [];
            filterAdminUsers();
        }

function filterAdminUsers() {
            const startDate = document.getElementById('admin-filter-start').value;
            const endDate = document.getElementById('admin-filter-end').value;
            const role = document.getElementById('admin-filter-role').value;

            let filtered = adminUsersData;

            if (startDate) {
                const sDate = new Date(startDate.replace(/\\./g, '-'));
                filtered = filtered.filter(u => new Date(u.created_at) >= sDate);
            }
            if (endDate) {
                const end = new Date(endDate.replace(/\\./g, '-'));
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(u => new Date(u.created_at) <= end);
            }
            if (role) {
                filtered = filtered.filter(u => u.role === role);
            }

            renderAdminUsers(filtered);
        }

function renderAdminUsers(users) {
            const list = document.getElementById('admin-users-list');
            if (users.length === 0) {
                list.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #a0aec0;">조회된 회원이 없습니다.</td></tr>';
                return;
            }

            list.innerHTML = users.map(u => {
                const dateStr = new Date(u.created_at).toLocaleDateString();
                const roleBadge = u.role === 'owner' ? '<span style="background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">임대인</span>' :
                                  u.role === 'tenant' ? '<span style="background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; font-size: 11px;">임차인</span>' :
                                  '<span style="background: #fed7d7; color: #c53030; padding: 2px 6px; border-radius: 4px; font-size: 11px;">관리자</span>';
                
                const verifyBtnClass = u.is_verified ? 'btn-orange' : 'btn';
                const verifyBtnText = u.is_verified ? '인증됨' : '미인증';
                
                let actionHtml = '';
                if (u.role === 'admin') {
                    actionHtml = `<button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openUserEditPage('${u.id}')">수정</button>`;
                } else if (u.role === 'owner') {
                    actionHtml = `
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568; margin-right: 4px;" onclick="toggleOwnerBuildings('${u.id}', this)"><i class="fa-solid fa-building"></i> 건물</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openUserEditPage('${u.id}')">수정</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser('${u.id}')">삭제</button>
                    `;
                } else {
                    actionHtml = `
                        <button class="${verifyBtnClass}" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="toggleVerification('${u.id}', ${u.is_verified})">${verifyBtnText}</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openUserEditPage('${u.id}')">수정</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser('${u.id}')">삭제</button>
                    `;
                }
                
                return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 8px;">${u.name}</td>
                        <td style="padding: 12px 8px;">${u.email}</td>
                        <td style="padding: 12px 8px;">${u.phone || '-'}</td>
                        <td style="padding: 12px 8px;">${roleBadge}</td>
                        <td style="padding: 12px 8px; text-align: center;">${dateStr}</td>
                        <td style="padding: 12px 8px; text-align: center;">
                            ${actionHtml}
                        </td>
                    </tr>
                `;
            }).join('');
        }

async function toggleOwnerBuildings(ownerId, btnEl) {
            const tr = btnEl.closest('tr');
            const nextTr = tr.nextElementSibling;
            
            // 이미 확장되어 있으면 닫기
            if (nextTr && nextTr.id === 'buildings-row-' + ownerId) {
                nextTr.remove();
                return;
            }
            
            // 기존에 열려있는 다른 건물 목록들 닫기 (원치 않으면 이 블록 삭제)
            // document.querySelectorAll('tr[id^="buildings-row-"]').forEach(el => el.remove());

            // 로딩 표시용 행 추가
            const loadingTr = document.createElement('tr');
            loadingTr.id = 'buildings-row-' + ownerId;
            loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #f8fafc; text-align: center; color: #718096; font-size: 12px;"><i class="fa-solid fa-spinner fa-spin"></i> 건물 정보를 불러오는 중...</td>';
            tr.parentNode.insertBefore(loadingTr, nextTr);

            try {
                const { data: bldgs, error } = await supabaseClient
                    .from('buildings')
                    .select('*')
                    .eq('owner_id', ownerId);
                    
                if (error) throw error;
                
                if (!bldgs || bldgs.length === 0) {
                    loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #f8fafc; text-align: center; color: #718096; font-size: 13px;">등록된 건물이 없습니다.</td>';
                    return;
                }
                
                let bldgHtml = '<div style="padding: 5px 10px 10px 40px;">';
                bldgHtml += '<div style="margin-bottom: 10px; color: #4a5568; font-size: 13px; font-weight: bold;"><i class="fa-solid fa-turn-up fa-rotate-90" style="margin-right: 8px; color: #a0aec0;"></i>소유 건물 목록</div>';
                bldgHtml += '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
                bldgHtml += '<thead style="color: #4a5568;"><tr style="border-bottom: 2px solid #e2e8f0;">';
                bldgHtml += '<th style="padding: 12px 8px; text-align: left; font-weight: 600;">건물명</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: left; font-weight: 600;">주소</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">층수</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">등록일</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">인증 상태</th>';
                bldgHtml += '<th style="padding: 12px 8px; text-align: center; font-weight: 600;">관리</th>';
                bldgHtml += '</tr></thead><tbody>';
                bldgs.forEach(b => {
                    const bDate = new Date(b.created_at).toLocaleDateString();
                    const verifyStatus = b.is_verified ? '<span style="color: #3182ce; font-weight: 600;">2차 인증 완료</span>' : '<span style="color: #dd6b20; font-weight: 600;">미인증</span>';
                    bldgHtml += `<tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 8px;">${b.name || '-'}</td>
                        <td style="padding: 12px 8px;">${b.address || '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;">${b.floors ? b.floors + '층' : '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;">${bDate}</td>
                        <td style="padding: 12px 8px; text-align: center;">${verifyStatus}</td>
                        <td style="padding: 12px 8px; text-align: center; display: flex; gap: 5px; justify-content: center;">
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568; cursor: pointer;" onclick="openUserEditPage('${ownerId}')">수정</button>
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: ${b.is_verified ? '#ed8936' : '#48bb78'}; border: none; color: white; cursor: pointer;" onclick="toggleBuildingVerify('${b.id}', ${b.is_verified})">${b.is_verified ? '인증취소' : '인증승인'}</button>
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #e53e3e; border: none; color: white; cursor: pointer;" onclick="deleteAdminBuilding('${b.id}')">삭제</button>
                        </td>
                    </tr>`;
                });
                bldgHtml += '</tbody></table></div>';
                
                loadingTr.innerHTML = '<td colspan="6" style="padding: 10px 15px 20px 15px; background: #fafafa; border-bottom: 2px solid #cbd5e0;">' + bldgHtml + '</td>';
            } catch (err) {
                loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #fff5f5; text-align: center; color: #e53e3e; font-size: 13px;">건물 정보를 불러오지 못했습니다.</td>';
            }
        }

function toggleVerification(id, currentStatus) {
            if (!supabaseClient) return;
            showModalConfirm(currentStatus ? '2차 인증을 취소하시겠습니까?' : '2차 인증을 수동으로 승인하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
                if (error) {
                    if (error.message && error.message.includes('is_verified')) {
                        showModalAlert(`데이터베이스(profiles)에 is_verified 컬럼이 없습니다.
Supabase SQL Editor에서 profiles 테이블에 is_verified (boolean) 컬럼을 추가해 주세요.

(로컬 테스트를 위해 화면 상에서 승인 상태를 임시로 강제 전환합니다.)`);
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
        }

function deleteAdminUser(id) {
            showModalConfirm('정말로 이 회원을 삭제(강제 탈퇴)하시겠습니까? 연관된 데이터도 모두 삭제됩니다.', async (res) => {
                if (!res) return;
                
                if (!supabaseClient) {
                    adminUsersData = adminUsersData.filter(u => u.id !== id);
                    filterAdminUsers();
                    showModalAlert('회원이 삭제되었습니다. (로컬)');
                    return;
                }

                try {
                    // 혹시 모를 외래 키 제약 조건을 피하기 위해 해당 회원의 건물 먼저 삭제 시도
                    await supabaseClient.from('buildings').delete().eq('owner_id', id);
                    
                    const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
                    if (error) {
                        showModalAlert('삭제 실패: ' + error.message);
                        return;
                    }
                    showModalAlert('회원이 삭제되었습니다.');
                    loadAdminUsers();
                } catch (err) {
                    showModalAlert('삭제 중 오류가 발생했습니다: ' + err.message);
                }
            });
        }

async function loadAdminBuildings() {
            if (!supabaseClient) return;
            const { data, error } = await supabaseClient
                .from('buildings')
                .select('*, profiles:owner_id(name)')
                .order('created_at', { ascending: false });
            
            if (error) {
                showModalAlert('건물 목록 조회 실패: ' + error.message);
                return;
            }
            renderAdminBuildings(data || []);
        }

function renderAdminBuildings(buildings) {
            const list = document.getElementById('admin-buildings-list');
            if (!list) return;
            if (buildings.length === 0) {
                list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #a0aec0;">등록된 건물이 없습니다.</td></tr>';
                return;
            }
            list.innerHTML = buildings.map(b => {
                const ownerName = b.profiles ? b.profiles.name : '알수없음';
                return `
                <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 12px 8px; font-weight: 500;">${b.name || '-'}</td>
                    <td style="padding: 12px 8px;">${b.address || '-'}</td>
                    <td style="padding: 12px 8px; text-align: center;">${new Date(b.created_at).toLocaleDateString()}</td>
                    <td style="padding: 12px 8px; text-align: center;">
                        ${b.is_verified 
                            ? `<span class="badge badge-blue">검증완료 (${ownerName})</span>`
                            : `<span class="badge badge-orange">미인증 (${ownerName})</span>`
                        }
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #ed8936; border: none; color: white; margin-right: 5px;" onclick="toggleBuildingVerify('${b.id}', ${b.is_verified})">${b.is_verified ? '인증취소' : '인증승인'}</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: #e53e3e; border: none; color: white;" onclick="deleteAdminBuilding('${b.id}')">삭제</button>
                    </td>
                </tr>
            `}).join('');
        }

function toggleBuildingVerify(id, currentStatus) {
            showModalConfirm(currentStatus ? '이 건물의 인증을 취소하시겠습니까?' : '이 건물을 검증완료 처리하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient
                    .from('buildings')
                    .update({ is_verified: !currentStatus })
                    .eq('id', id);
                    
                if (error) {
                    showModalAlert('인증 상태 변경 실패: ' + error.message);
                    return;
                }
                showModalAlert('건물 인증 상태가 변경되었습니다.');
                loadAdminUsers();
            });
        }

function deleteAdminBuilding(id) {
            showModalConfirm('정말로 이 건물을 시스템에서 강제 삭제하시겠습니까? 연관된 모든 데이터가 삭제됩니다.', async (res) => {
                if (!res) return;
                
                if (!supabaseClient) {
                    showModalAlert('건물이 삭제되었습니다. (로컬)');
                    return;
                }

                try {
                    const { data, error } = await supabaseClient.from('buildings').delete().eq('id', id).select();
                    if (error) {
                        showModalAlert('삭제 실패: ' + error.message);
                        return;
                    }
                    if (!data || data.length === 0) {
                        showModalAlert('삭제 실패: DB 권한(RLS) 문제로 삭제되지 않았습니다. Supabase에서 Delete 정책을 확인하세요.');
                        return;
                    }
                    showModalAlert('건물이 삭제되었습니다.');
                    loadAdminUsers();
                } catch (err) {
                    showModalAlert('삭제 중 오류가 발생했습니다: ' + err.message);
                }
            });
        }

function toggleAdminUsersMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-users-dropdown').classList.toggle('hidden');
        }

function toggleAdminSettingsMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-settings-dropdown').classList.toggle('hidden');
        }

function toggleAdminMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-dropdown').classList.toggle('hidden');
        }

function toggleAdminUserEditMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-user-edit-dropdown').classList.toggle('hidden');
        }

async function openUserEditPage(id) {
            document.getElementById('admin-edit-page-id').value = id;
            document.getElementById('admin-edit-page-name').value = '불러오는 중...';
            document.getElementById('admin-edit-page-phone').value = '불러오는 중...';
            document.getElementById('admin-edit-page-buildings-container').classList.add('hidden');
            document.getElementById('admin-edit-page-buildings-list').innerHTML = '';
            showView('admin-user-edit-app');

            try {
                const { data: user, error } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
                if (error) throw error;
                
                document.getElementById('admin-edit-page-name').value = user.name || '';
                document.getElementById('admin-edit-page-phone').value = user.phone || '';

                if (user.role === 'owner') {
                    document.getElementById('admin-edit-page-buildings-container').classList.remove('hidden');
                    const { data: bldgs } = await supabaseClient.from('buildings').select('*').eq('owner_id', id);
                    if (bldgs && bldgs.length > 0) {
                        let bHtml = '';
                        bldgs.forEach(b => {
                            bHtml += `
                                <div class="card" style="margin-bottom: 15px; border: 1px solid #e2e8f0; box-shadow: none;">
                                    <input type="hidden" class="edit-building-id" value="${b.id}">
                                    <div class="form-group" style="margin-bottom: 10px;">
                                        <label style="font-size: 13px;">건물명</label>
                                        <input type="text" class="form-control edit-building-name" value="${b.name || ''}">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 10px;">
                                        <label style="font-size: 13px;">주소</label>
                                        <input type="text" class="form-control edit-building-address" value="${b.address || ''}">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label style="font-size: 13px;">층수</label>
                                        <input type="number" class="form-control edit-building-floors" value="${b.floors || ''}">
                                    </div>
                                </div>
                            `;
                        });
                        document.getElementById('admin-edit-page-buildings-list').innerHTML = bHtml;
                    } else {
                        document.getElementById('admin-edit-page-buildings-list').innerHTML = '<p style="font-size: 13px; color: #718096; padding: 10px;">등록된 건물이 없습니다.</p>';
                    }
                }
            } catch (err) {
                showModalAlert('정보를 불러오지 못했습니다: ' + err.message);
            }
        }

async function saveAdminUserEditData() {
            const id = document.getElementById('admin-edit-page-id').value;
            const name = document.getElementById('admin-edit-page-name').value;
            const phone = document.getElementById('admin-edit-page-phone').value;

            // Update user profile
            const { error } = await supabaseClient.from('profiles').update({ name, phone }).eq('id', id);
            if (error) {
                showModalAlert('회원 수정 실패: ' + error.message);
                return;
            }

            // Update buildings if owner
            const bldgCards = document.querySelectorAll('#admin-edit-page-buildings-list .card');
            for (let card of bldgCards) {
                const bId = card.querySelector('.edit-building-id').value;
                const bName = card.querySelector('.edit-building-name').value;
                const bAddress = card.querySelector('.edit-building-address').value;
                const bFloors = card.querySelector('.edit-building-floors').value;
                
                await supabaseClient.from('buildings').update({ 
                    name: bName, 
                    address: bAddress, 
                    floors: bFloors ? parseInt(bFloors) : null 
                }).eq('id', bId);
            }

            showModalAlert('변경사항이 성공적으로 저장되었습니다.');
            showView('admin-users-app');
            loadAdminUsers();
        }

async function loadAdminDashboardStats() {
            if (!supabaseClient) return;
            try {
                // 총 회원 수, 임대인, 임차인 및 가입 일자별 회원 수
                const { data: profiles, error: profError } = await supabaseClient.from('profiles').select('role, created_at');
                if (!profError && profiles) {
                    const totalUsers = profiles.length;
                    const ownerCount = profiles.filter(p => p.role === 'owner').length;
                    const tenantCount = profiles.filter(p => p.role === 'tenant').length;
                    const elTotal = document.getElementById('stat-total-users');
                    const elOwner = document.getElementById('stat-owner-users');
                    const elTenant = document.getElementById('stat-tenant-users');
                    if(elTotal) elTotal.innerHTML = totalUsers + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span>';
                    if(elOwner) elOwner.innerHTML = ownerCount + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span>';
                    if(elTenant) elTenant.innerHTML = tenantCount + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">명</span>';
                
                    // 가입 일자별 그룹핑
                    const dateGroups = {};
                    profiles.forEach(p => {
                        const d = p.created_at ? new Date(p.created_at).toLocaleDateString() : '알 수 없음';
                        dateGroups[d] = (dateGroups[d] || 0) + 1;
                    });
                    
                    const dateListEl = document.getElementById('stat-signup-date-list');
                    if(dateListEl) {
                        const sortedDates = Object.keys(dateGroups).sort((a,b) => new Date(b) - new Date(a));
                        if(sortedDates.length === 0) {
                            dateListEl.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #a0aec0;">가입 내역이 없습니다.</td></tr>';
                        } else {
                            dateListEl.innerHTML = sortedDates.map(date => {
                                return '<tr><td style="padding: 10px 8px; border-bottom: 1px solid #edf2f7;">' + date + '</td><td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #edf2f7; font-weight: 500;">' + dateGroups[date] + ' 명</td></tr>';
                            }).join('');
                        }
                    }
                }

                // 총 등록 건물 수 및 지역별 통계
                const { data: bldgs, error: bldgError } = await supabaseClient.from('buildings').select('address, owner_id');
                if (!bldgError && bldgs) {
                    const elBldg = document.getElementById('stat-total-buildings');
                    if(elBldg) elBldg.innerHTML = (bldgs.length || 0) + ' <span style="font-size: 14px; font-weight: normal; color: #a0aec0; margin-left: 4px;">개</span>';
                    
                    // 지역별 그룹핑
                    const regionMap = {};
                    bldgs.forEach(b => {
                        let region = '지역 미상';
                        if (b.address) {
                            const parts = b.address.split(' ');
                            if (parts.length >= 2) {
                                region = parts[0] + ' ' + parts[1]; // 예: 서울특별시 관악구
                            } else {
                                region = b.address;
                            }
                        }
                        if (!regionMap[region]) {
                            regionMap[region] = { bldgCount: 0, owners: new Set() };
                        }
                        regionMap[region].bldgCount += 1;
                        if (b.owner_id) regionMap[region].owners.add(b.owner_id);
                    });

                    const regionListEl = document.getElementById('stat-region-list');
                    if (regionListEl) {
                        const regions = Object.keys(regionMap).sort((a,b) => regionMap[b].bldgCount - regionMap[a].bldgCount);
                        if (regions.length === 0) {
                            regionListEl.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #a0aec0;">등록된 건물이 없습니다.</td></tr>';
                        } else {
                            regionListEl.innerHTML = regions.map(reg => {
                                const data = regionMap[reg];
                                return '<tr><td style="padding: 10px 8px; border-bottom: 1px solid #edf2f7;">' + reg + '</td><td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #edf2f7; font-weight: 500;">' + data.bldgCount + ' 개</td><td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #edf2f7; font-weight: 500;">' + data.owners.size + ' 명</td></tr>';
                            }).join('');
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load admin stats", err);
            }
        }

async function saveGeminiKey() {
            const keyVal = document.getElementById('admin-gemini-key').value.trim();
            if(!keyVal) return showModalAlert('키를 입력해주세요.');
            
            const { error } = await supabaseClient.from('system_settings').upsert(
                { key_name: 'GEMINI_API_KEY', key_value: keyVal },
                { onConflict: 'key_name' }
            );
            
            if (error) {
                console.error(error);
                showModalAlert('저장 실패: system_settings 테이블이 없거나 권한이 없습니다.');
            } else {
                showModalAlert('API Key가 성공적으로 저장되었습니다.');
            }
        }

async function loadGeminiKeyIntoAdmin() {
            if (!supabaseClient) return;
            try {
                const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                if (data && data.key_value) {
                    const el = document.getElementById('admin-gemini-key');
                    if (el) el.value = data.key_value;
                }
            } catch(e) {}
        }

async function getGeminiApiKey() {
            if (!supabaseClient) return null;
            try {
                const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                return data ? data.key_value : null;
            } catch(e) {
                return null;
            }
        }

async function executeGeminiExtraction() {
            const previewImage = document.getElementById('ocr-preview-img');
            if (!previewImage || !previewImage.src || previewImage.src === '') {
                showModalAlert('분석할 계약서 이미지가 없습니다.');
                return;
            }
            
            document.getElementById('loading-view').querySelector('h3').innerText = 'AI 모델을 통해 15개 항목을 추출 중입니다...';
            document.getElementById('loading-view').classList.remove('hidden');
            
            try {
                const response = await fetch('/api/gemini-extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                          imageBase64: previewImage.src,
                          apiKey: await getGeminiApiKey()
                      })
                });
                
                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'AI 데이터 추출에 실패했습니다.');
                }
                
                const data = result.data;
                const fields = [
                    'ocr_room_number', 'ocr_area', 'ocr_deposit', 'ocr_monthly_rent', 'ocr_maintenance_fee', 'ocr_cleaning_fee',
                    'ocr_contract_date', 'ocr_lease_period', 'ocr_tenant_name', 'ocr_tenant_phone', 'ocr_broker_address',
                    'ocr_broker_agency_name', 'ocr_broker_representative', 'ocr_broker_registration_no', 'ocr_broker_phone'
                ];
                
                fields.forEach(fieldId => {
                    const el = document.getElementById(fieldId);
                    if (el && data[fieldId] !== undefined) {
                        el.value = data[fieldId];
                        // 시각적 피드백 효과
                        const originalBg = el.style.backgroundColor;
                        el.style.transition = 'background-color 0.5s';
                        el.style.backgroundColor = '#e6fffa';
                        setTimeout(() => {
                            el.style.backgroundColor = originalBg;
                        }, 1000);
                    }
                });
                
            } catch (err) {
                showModalAlert('오류 발생: ' + err.message);
            } finally {
                document.getElementById('loading-view').classList.add('hidden');
            }
        }

async function submitExtractedContract(event) {
            event.preventDefault();
            const sessionData = await supabaseClient.auth.getSession();
            const session = sessionData?.data?.session;
            if (!session) {
                showModalAlert('로그인이 필요합니다.');
                return;
            }

            const buildingId = window.ocrTargetBuildingId;
            if (!buildingId) {
                showModalAlert('선택된 건물이 없습니다.');
                return;
            }

            // Get all input values
            const inputs = document.querySelectorAll('#ocr-fields-container input');
            const contractData = {};
            inputs.forEach(input => {
                contractData[input.id] = input.value;
            });

            document.getElementById('loading-view').querySelector('h3').innerText = '데이터베이스에 저장 중입니다...';
            document.getElementById('loading-view').classList.remove('hidden');

            try {
                // Insert Tenant
                const { error: tError } = await supabaseClient
                    .from('tenants')
                    .insert([{
                        building_id: buildingId,
                        owner_id: session.user.id,
                        address: '',
                        room: contractData['ocr_room_number'],
                        tenant_name: contractData['ocr_tenant_name']
                    }]);

                if (tError) {
                    throw new Error('임차인 정보 저장 실패: ' + tError.message);
                }

                // Insert Contract
                const { error: cError } = await supabaseClient
                    .from('contracts')
                    .insert([{
                        building_id: buildingId,
                        owner_id: session.user.id,
                        status: 'matched',
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
                        broker_rep_name: contractData['ocr_broker_representative'],
                        broker_reg_number: contractData['ocr_broker_registration_no'],
                        broker_phone: contractData['ocr_broker_phone']
                    }]);

                if (cError) {
                    throw new Error('계약서 세부정보 저장 실패: ' + cError.message);
                }

                document.getElementById('loading-view').classList.add('hidden');
                showView('owner-app');
                showModalAlert('AI 계약서 추출 정보가 성공적으로 저장되었습니다!');
                
                // Refresh list if possible
                if (typeof renderOwnerBuildings === 'function') {
                    renderOwnerBuildings();
                }

            } catch (err) {
                document.getElementById('loading-view').classList.add('hidden');
                showModalAlert('데이터베이스 저장 중 오류가 발생했습니다: ' + err.message);
            }
        }

// MANUALLY RESTORED: openAdminEditModal
function openAdminEditModal(id, name, phone) {
    const editId = document.getElementById('admin-edit-id');
    const editName = document.getElementById('admin-edit-name');
    const editPhone = document.getElementById('admin-edit-phone');
    const editModal = document.getElementById('admin-edit-modal');
    
    if (editId) editId.value = id;
    if (editName) editName.value = name;
    if (editPhone) editPhone.value = phone;
    if (editModal) editModal.classList.remove('hidden');
}

// MANUALLY RESTORED: closeAdminEditModal
function closeAdminEditModal() {
    const editModal = document.getElementById('admin-edit-modal');
    if (editModal) editModal.classList.add('hidden');
}

// MANUALLY RESTORED: saveAdminUserEdit
async function saveAdminUserEdit() {
    const id = document.getElementById('admin-edit-id').value;
    const name = document.getElementById('admin-edit-name').value;
    const phone = document.getElementById('admin-edit-phone').value;

    const { error } = await supabaseClient.from('profiles').update({ name, phone }).eq('id', id);
    if (error) {
        showModalAlert('수정 실패: ' + error.message);
        return;
    }
    showModalAlert('수정되었습니다.');
    closeAdminEditModal();
    loadAdminUsers();
}
