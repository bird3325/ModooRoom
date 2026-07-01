// Supabase 동적 초기화
        let supabaseClient = null;

        let initialRoomDetailState = {};
        let isRdLoading = false;

        function getRoomDetailFormState() {
            return {
                roomType: document.getElementById('rd-room-type') ? document.getElementById('rd-room-type').value : '',
                floorType: document.getElementById('rd-floor-type') ? document.getElementById('rd-floor-type').value : '지상',
                floorNo: document.getElementById('rd-floor-no') ? document.getElementById('rd-floor-no').value.trim() : '',
                area: document.getElementById('rd-area') ? document.getElementById('rd-area').value : '',
                roomStatus: document.getElementById('rd-room-status') ? document.getElementById('rd-room-status').value : '',
                tenantName: document.getElementById('rd-tenant-name') ? document.getElementById('rd-tenant-name').value.trim() : '',
                tenantPhone: document.getElementById('rd-tenant-phone') ? document.getElementById('rd-tenant-phone').value.trim() : '',
                deposit: document.getElementById('rd-deposit') ? document.getElementById('rd-deposit').value : '',
                monthlyRent: document.getElementById('rd-monthly-rent') ? document.getElementById('rd-monthly-rent').value : '',
                maintenanceFee: document.getElementById('rd-maintenance-fee') ? document.getElementById('rd-maintenance-fee').value : '',
                cleaningFee: document.getElementById('rd-cleaning-fee') ? document.getElementById('rd-cleaning-fee').value : '',
                contractDate: document.getElementById('rd-contract-date') ? document.getElementById('rd-contract-date').value : '',
                leaseStartDate: document.getElementById('rd-lease-start-date') ? document.getElementById('rd-lease-start-date').value : '',
                leaseEndDate: document.getElementById('rd-lease-end-date') ? document.getElementById('rd-lease-end-date').value : '',
                brokerAgency: document.getElementById('rd-broker-agency') ? document.getElementById('rd-broker-agency').value : '',
                brokerRep: document.getElementById('rd-broker-rep') ? document.getElementById('rd-broker-rep').value : '',
                brokerAddress: document.getElementById('rd-broker-address') ? document.getElementById('rd-broker-address').value : '',
                brokerPhone: document.getElementById('rd-broker-phone') ? document.getElementById('rd-broker-phone').value : '',
                brokerRegNumber: document.getElementById('rd-broker-reg-number') ? document.getElementById('rd-broker-reg-number').value : '',
                previewImgSrc: document.getElementById('rd-ocr-preview-img') ? (document.getElementById('rd-ocr-preview-img').getAttribute('src') || '') : '',
                roomCount: document.getElementById('rd-room-count') ? document.getElementById('rd-room-count').value : '',
                bathroomCount: document.getElementById('rd-bathroom-count') ? document.getElementById('rd-bathroom-count').value : '',
                livingRoomCount: document.getElementById('rd-living-room-count') ? document.getElementById('rd-living-room-count').value : '',
                verandaCount: document.getElementById('rd-veranda-count') ? document.getElementById('rd-veranda-count').value : ''
            };
        }

        function checkRoomDetailChanges() {
            if (isRdLoading) return;
            const currentState = getRoomDetailFormState();
            let hasChanged = false;
            for (let key in initialRoomDetailState) {
                if (initialRoomDetailState[key] !== currentState[key]) {
                    console.log("Diff found in key:", key, "initial:", initialRoomDetailState[key], "current:", currentState[key]);
                    hasChanged = true;
                    break;
                }
            }
            const saveBtn = document.getElementById('btn-save-room-detail');
            if (saveBtn) {
                saveBtn.disabled = !hasChanged;
            }
        }

        function initRoomDetailChangeListeners() {
            const form = document.getElementById('room-detail-edit-form');
            if (form) {
                form.querySelectorAll('input, select, textarea').forEach(el => {
                    el.addEventListener('input', checkRoomDetailChanges);
                    el.addEventListener('change', checkRoomDetailChanges);
                });
            }
            const previewImg = document.getElementById('rd-ocr-preview-img');
            if (previewImg) {
                const observer = new MutationObserver(checkRoomDetailChanges);
                observer.observe(previewImg, { attributes: true, attributeFilter: ['src'] });
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initRoomDetailChangeListeners();
        });

        function markUserVerified() {
            isAuthenticated = true;
            if (supabaseClient) {
                supabaseClient.auth.getSession().then(({ data: { session } }) => {
                    if (session && session.user) {
                        supabaseClient.from('profiles').update({ is_verified: true }).eq('id', session.user.id).then(()=>{});
                    }
                });
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const initDateStr = today.getFullYear() + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + String(today.getDate()).padStart(2, '0');
            
            const prevMonth = new Date(today);
            prevMonth.setMonth(prevMonth.getMonth() - 1);
            const prevMonthStr = prevMonth.getFullYear() + '.' + String(prevMonth.getMonth() + 1).padStart(2, '0') + '.' + String(prevMonth.getDate()).padStart(2, '0');
            
            const startInput = document.getElementById('admin-filter-start');
            const endInput = document.getElementById('admin-filter-end');
            if (startInput) startInput.value = prevMonthStr;
            if (endInput) endInput.value = initDateStr;

            const todayDisplay = document.getElementById('calendar-today-display');
            if (todayDisplay) {
                todayDisplay.innerText = '오늘: ' + initDateStr;
            }

            fetch('/api/config/supabase')
                .then(res => res.json())
                .then(async config => {
                    if (config.url && config.key && config.url !== 'YOUR_SUPABASE_URL') {
                        supabaseClient = window.supabase.createClient(config.url, config.key);
                        console.log('Supabase 클라이언트가 초기화되었습니다. (.env 사용)');

                        if (window.IS_ADMIN_ROUTE) {
                            const loginTitle = document.getElementById('login-title');
                            if (loginTitle) loginTitle.innerText = '관리자 로그인';
                        }
                        
                        // 세션(자동 로그인) 복구
                        const { data: { session } } = await supabaseClient.auth.getSession();
                        if (session && session.user) {
                            const { data: profile, error: profileError } = await supabaseClient
                                .from('profiles')
                                .select('*')
                                .eq('id', session.user.id)
                                .single();

                            if (!profileError && profile) {
                                globalUserRole = profile.role;
                                const namePrefix = profile.name;
                                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                if (document.getElementById('auth-display-name')) {
                                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                if (document.getElementById('rd-display-name')) {
                                    document.getElementById('rd-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                if (document.getElementById('bm-display-name')) {
                                    document.getElementById('bm-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                
                                isAuthenticated = false; // 기본값

                                // 임대인일 경우 등록된 건물 가져오기
                                if (profile.role === 'owner') {
                                    const { data: bData, error: bError } = await supabaseClient
                                        .from('buildings')
                                        .select('*')
                                        .eq('owner_id', session.user.id);
                                    
                                    if (!bError && bData && bData.length > 0) {
                                        ownerBuildings = bData;
                                        markUserVerified(); // 건물이 있으면 2차 인증 완료로 처리
                                    }
                                }

                                // is_verified 처리 (관리자가 수동 승인한 경우)
                                if (profile.is_verified) {
                                    isAuthenticated = true;
                                }

                                document.getElementById('loading-view').classList.add('hidden');
                                if (window.IS_ADMIN_ROUTE) {
                                    if (profile.role === 'admin') {
                                        showView('admin-app');
                                        loadAdminUsers();
                                        loadAdminBuildings();
                                    } else {
                                        showModalAlert('관리자 권한이 없습니다.');
                                        showView('main-app');
                                    }
                                } else if (profile.role === 'admin') {
                                    showView('admin-app');
                                    loadAdminUsers();
                                    loadAdminBuildings();
                                } else if (isAuthenticated) {
                                    showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
                                } else {
                                    showView('main-app');
                                }
                                return;
                            }
                        }
                    }
                    // 세션이 없거나 정보가 다를 경우 로그인 창으로
                    document.getElementById('loading-view').classList.add('hidden');
                    showView('login');
                })
                .catch(err => {
                    console.error('설정을 불러오는 데 실패했습니다.', err);
                    document.getElementById('loading-view').classList.add('hidden');
                    showView('login');
                });
        });

        // 글로벌 상태 변상태를 관리
        let isAuthenticated = false; // 2차 인증 여부
        let currentRole = 'owner';   // 'owner' or 'tenant'
        let activeTenantsData = [];  // 임대인: 현재 매칭된 임차인 목록 데이터

        async function saveMyInfo() {
            const name = document.getElementById('common-edit-name').value;
            const phone = document.getElementById('common-edit-phone').value;
            const pwd = document.getElementById('common-edit-password').value;
            const pwdConfirm = document.getElementById('common-edit-password-confirm').value;
            
            if (pwd || pwdConfirm) {
                if (pwd !== pwdConfirm) {
                    showModalAlert('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
                    return;
                }
            }

            if (!supabaseClient) {
                showModalAlert('개인정보 및 비밀번호가 성공적으로 수정되었습니다. (모의 로직)');
                return;
            }

            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError || !session) {
                showModalAlert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                return;
            }

            // 1. 프로필 업데이트 (이름, 전화번호)
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({ name: name, phone: phone })
                .eq('id', session.user.id);

            if (profileError) {
                showModalAlert('정보 수정 실패: ' + profileError.message);
                return;
            }

            // 2. 비밀번호 변경 (입력했을 경우에만)
            if (pwd) {
                const { error: pwdError } = await supabaseClient.auth.updateUser({ password: pwd });
                if (pwdError) {
                    showModalAlert('비밀번호 변경 실패: ' + pwdError.message);
                    return;
                }
            }

            // UI 헤더 이름 즉시 반영
            document.getElementById('main-display-name').innerHTML = name + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            document.getElementById('owner-display-name').innerHTML = name + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            document.getElementById('tenant-display-name').innerHTML = name + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            if (document.getElementById('rd-display-name')) {
                document.getElementById('rd-display-name').innerHTML = name + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            }
            if (document.getElementById('bm-display-name')) {
                document.getElementById('bm-display-name').innerHTML = name + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            }

            document.getElementById('common-edit-password').value = '';
            document.getElementById('common-edit-password-confirm').value = '';

            showModalAlert('개인정보 및 비밀번호가 성공적으로 수정되었습니다.');
        }

        function showModalAlert(message) {
            document.getElementById('custom-alert-message').innerText = message;
            document.getElementById('custom-alert-modal').classList.remove('hidden');
        }

        function closeCustomAlert() {
            document.getElementById('custom-alert-modal').classList.add('hidden');
        }

        let currentConfirmCallback = null;
        function showModalConfirm(message, callback) {
            document.getElementById('custom-confirm-message').innerText = message;
            document.getElementById('custom-confirm-modal').classList.remove('hidden');
            currentConfirmCallback = callback;
        }

        function closeCustomConfirm(result) {
            document.getElementById('custom-confirm-modal').classList.add('hidden');
            if (currentConfirmCallback) {
                currentConfirmCallback(result);
                currentConfirmCallback = null;
            }
        }

        // 드롭다운 외부 클릭 시 닫기
        window.addEventListener('click', function(e) {
            const dropdown = document.getElementById('user-dropdown');
            const toggleBtn = document.getElementById('main-display-name');
            if (dropdown && toggleBtn && !toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }

            const ownerDropdown = document.getElementById('owner-dropdown');
            const ownerToggleBtn = document.getElementById('owner-display-name');
            if (ownerDropdown && ownerToggleBtn && !ownerToggleBtn.contains(e.target) && !ownerDropdown.contains(e.target)) {
                ownerDropdown.classList.add('hidden');
            }

            const tenantDropdown = document.getElementById('tenant-dropdown');
            const tenantToggleBtn = document.getElementById('tenant-display-name');
            if (tenantDropdown && tenantToggleBtn && !tenantToggleBtn.contains(e.target) && !tenantDropdown.contains(e.target)) {
                tenantDropdown.classList.add('hidden');
            }

            const authDropdown = document.getElementById('auth-dropdown');
            const authToggleBtn = document.getElementById('auth-display-name');
            if (authDropdown && authToggleBtn && !authToggleBtn.contains(e.target) && !authDropdown.contains(e.target)) {
                authDropdown.classList.add('hidden');
            }
            
            // 모든 빌딩 메뉴 닫기
            if (typeof ownerBuildings !== 'undefined') {
                ownerBuildings.forEach(function(b, idx) {
                    const bMenu = document.getElementById('building-menu-' + idx);
                    if (bMenu) {
                        const btn = bMenu.previousElementSibling;
                        if (btn && !btn.contains(e.target) && !bMenu.contains(e.target)) {
                            bMenu.classList.add('hidden');
                        }
                    }
                });
            }
        });

        function updateDropdownDashboardVisibility() {
            // 모든 대시보드 링크를 찾아서 isAuthenticated 상태에 따라 표시/숨김
            const dropdowns = ['user-dropdown', 'owner-dropdown', 'tenant-dropdown', 'auth-dropdown', 'rd-dropdown', 'bm-dropdown'];
            dropdowns.forEach(id => {
                const menu = document.getElementById(id);
                if (menu) {
                    const items = menu.getElementsByTagName('a');
                    for (let item of items) {
                        if (item.textContent.trim() === '대시보드') {
                            if (isAuthenticated) {
                                item.style.display = 'block';
                            } else {
                                item.style.display = 'none';
                            }
                        }
                    }
                }
            });
        }

        function toggleUserMenu(e) {
            e.stopPropagation();
            updateDropdownDashboardVisibility();
            document.getElementById('user-dropdown').classList.toggle('hidden');
            const subMenu = document.getElementById('auth-sub-menu');
            if(subMenu) subMenu.classList.add('hidden');
        }

        function toggleOwnerMenu(e) {
            e.stopPropagation();
            updateDropdownDashboardVisibility();
            document.getElementById('owner-dropdown').classList.toggle('hidden');
        }

        function toggleTenantMenu(e) {
            e.stopPropagation();
            updateDropdownDashboardVisibility();
            document.getElementById('tenant-dropdown').classList.toggle('hidden');
        }

        function toggleAuthMenu(e) {
            e.stopPropagation();
            updateDropdownDashboardVisibility();
            document.getElementById('auth-dropdown').classList.toggle('hidden');
        }

        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');
            if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');
            if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');
            if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');
            if(document.getElementById('map-app')) document.getElementById('map-app').classList.add('hidden');
            if(document.getElementById('story-detail-app')) document.getElementById('story-detail-app').classList.add('hidden');
            if(document.getElementById('auth-page')) document.getElementById('auth-page').classList.add('hidden');
            if(document.getElementById('add-building-view')) document.getElementById('add-building-view').classList.add('hidden');
            if(document.getElementById('building-management-page')) document.getElementById('building-management-page').classList.add('hidden');
            if(document.getElementById('owner-add-material-view')) document.getElementById('owner-add-material-view').classList.add('hidden');
            if(document.getElementById('owner-material-history-view')) document.getElementById('owner-material-history-view').classList.add('hidden');
            if(document.getElementById('owner-add-complaint-view')) document.getElementById('owner-add-complaint-view').classList.add('hidden');
            if(document.getElementById('owner-complete-complaint-view')) document.getElementById('owner-complete-complaint-view').classList.add('hidden');
            if(document.getElementById('room-detail-page')) {
                document.getElementById('room-detail-page').classList.add('hidden');
                // 호실 수정 뷰 닫힘/숨김 처리 시 첨부 이미지 및 OCR UI 초기화
                if (viewName !== 'room-detail-page') {
                    const textDisplay = document.getElementById('rd-ocr-drag-text');
                    const dropZone = document.getElementById('rd-ocr-drag-zone');
                    if (textDisplay && dropZone) {
                        textDisplay.innerHTML = '클릭하거나 임대차 계약서 이미지를 여기에 놓으세요';
                        dropZone.style.borderColor = '#a0aec0';
                        dropZone.style.backgroundColor = '#ffffff';
                        dropZone.style.boxShadow = '';
                        const fileInput = document.getElementById('rd-ocr-file-input');
                        if (fileInput) fileInput.value = '';
                        const uploadWrapper = document.getElementById('rd-ocr-upload-wrapper');
                        if (uploadWrapper) uploadWrapper.classList.remove('hidden');
                        const previewContainer = document.getElementById('rd-ocr-preview-container');
                        if (previewContainer) previewContainer.classList.add('hidden');
                        const previewImg = document.getElementById('rd-ocr-preview-img');
                        if (previewImg) previewImg.src = '';
                        
                        // 비활성화되었던 폼 요소 복구
                        const formElements = document.querySelectorAll('#room-detail-edit-form input, #room-detail-edit-form select, #room-detail-edit-form button');
                        formElements.forEach(el => {
                            el.disabled = false;
                        });
                    }
                }
            }
            if(document.getElementById('ocr-extraction-view')) document.getElementById('ocr-extraction-view').classList.add('hidden');
            if(document.getElementById('admin-user-edit-app')) document.getElementById('admin-user-edit-app').classList.add('hidden');

            if (viewName === 'login') {
                document.getElementById('login-view').classList.remove('hidden');
            } else if (viewName === 'signup') {
                document.getElementById('signup-view').classList.remove('hidden');
            } else if (viewName === 'main-app') {
                document.getElementById('main-app').classList.remove('hidden');
            } else if (viewName === 'admin-users-app') {
                if(document.getElementById('admin-users-app')) {
                    document.getElementById('admin-users-app').classList.remove('hidden');
                    if (typeof loadAdminUsers === 'function') loadAdminUsers();
                }
            } else if (viewName === 'admin-user-edit-app') {
                if(document.getElementById('admin-user-edit-app')) {
                    document.getElementById('admin-user-edit-app').classList.remove('hidden');
                }
            } else if (viewName === 'admin-settings-app') {
                if(document.getElementById('admin-settings-app')) {
                    document.getElementById('admin-settings-app').classList.remove('hidden');
                    if (typeof loadGeminiKeyIntoAdmin === 'function') loadGeminiKeyIntoAdmin();
                }
            } else if (viewName === 'admin-app') {
                if(document.getElementById('admin-app')) {
                    document.getElementById('admin-app').classList.remove('hidden');
                    if (typeof loadAdminDashboardStats === 'function') {
                        loadAdminDashboardStats();
                    }
                }
            } else if (viewName === 'map-app') {
                document.getElementById('map-app').classList.remove('hidden');
            } else if (viewName === 'story-detail-app') {
                document.getElementById('story-detail-app').classList.remove('hidden');
            } else if (viewName === 'ocr-extraction-view') {
                if(document.getElementById('ocr-extraction-view')) {
                    document.getElementById('ocr-extraction-view').classList.remove('hidden');
                    // 모든 OCR 폼 입력란 값 초기화
                    const ocrFields = document.querySelectorAll('#ocr-fields-container input, #ocr-fields-container select');
                    ocrFields.forEach(el => {
                        if (el.tagName === 'SELECT') {
                            el.selectedIndex = 0;
                        } else {
                            el.value = '';
                        }
                    });
                    setTimeout(() => {
                        const ownerNameEl = document.getElementById('owner-display-name');
                        const ocrOwnerNameEl = document.getElementById('ocr-owner-display-name');
                        if (ownerNameEl && ocrOwnerNameEl) {
                            ocrOwnerNameEl.innerHTML = ownerNameEl.innerHTML;
                        }
                        if (typeof initOcrInteractions === 'function') {
                            initOcrInteractions();
                        }
                        if (typeof setOcrMode === 'function') {
                            setOcrMode('magnifier');
                        }
                    }, 200);
                }
            } else if (viewName === 'building-management-page') {
                if(document.getElementById('building-management-page')) document.getElementById('building-management-page').classList.remove('hidden');
            } else if (viewName === 'add-building-view') {
                if(document.getElementById('add-building-view')) document.getElementById('add-building-view').classList.remove('hidden');
            } else if (viewName === 'auth-page') {
                document.getElementById('auth-page').classList.remove('hidden');
                // 마이페이지 진입 시 DB 연동하여 최신 상태 확인
                if (supabaseClient) {
                    supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                            supabaseClient.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
                                if (profile) {
                                    globalUserRole = profile.role;
                                    supabaseClient.from('buildings').select('*').eq('owner_id', session.user.id).then(({ data: bData }) => {
                                        const isReallyAuth = profile.role === 'owner' ? (bData && bData.length > 0) : profile.is_verified;
                                        isAuthenticated = isReallyAuth; // 전역 상태 업데이트
                                        renderAuthPage(profile, isReallyAuth, bData);
                                    });
                                }
                            });
                        }
                    });
                } else {
                    renderAuthPage({ name: document.getElementById('main-display-name').textContent.replace(' 님', '').trim() || '홍길동', phone: '010-1234-5678', role: globalUserRole }, isAuthenticated, ownerBuildings);
                }
                
                function renderAuthPage(profile, isAuth, buildings) {
                    if(document.getElementById('auth-choice-container')) {
                        document.getElementById('auth-choice-container').classList.remove('hidden');
                        
                        const nameInput = document.getElementById('common-edit-name');
                        nameInput.value = profile.name || '';
                        
                        if (isAuth) {
                            nameInput.readOnly = true;
                            nameInput.style.backgroundColor = '#edf2f7';
                            nameInput.style.cursor = 'not-allowed';
                            nameInput.title = '2차 인증이 완료되어 이름을 변경할 수 없습니다.';
                            
                            const label = nameInput.previousElementSibling;
                            if (label && !label.innerHTML.includes('fa-circle-check')) {
                                label.innerHTML += ' <span style="font-size: 11px; color: var(--point-orange); margin-left: 5px;"><i class="fa-solid fa-circle-check"></i> 인증됨</span>';
                            }
                        } else {
                            nameInput.readOnly = false;
                            nameInput.style.backgroundColor = '#f8fafc';
                            nameInput.style.cursor = 'text';
                            nameInput.title = '';
                            
                            const label = nameInput.previousElementSibling;
                            if (label) {
                                label.innerHTML = '가입자 성함';
                            }
                        }
                        
                        document.getElementById('common-edit-phone').value = profile.phone || '010-1234-5678';

                        document.getElementById('auth-owner-form').classList.add('hidden');
                        document.getElementById('auth-tenant-form').classList.add('hidden');
                        
                        if (globalUserRole === 'owner') {
                            document.getElementById('auth-owner-form').classList.remove('hidden');
                            
                            if (isAuth) {
                                document.getElementById('auth-owner-form-content').classList.add('hidden');
                                document.getElementById('auth-owner-completed').classList.remove('hidden');
                                if (buildings && buildings.length > 0) {
                                    const bList = document.getElementById('auth-completed-buildings-list');
                                    bList.innerHTML = buildings.map((b) => {
                                        const verifiedBadge = (b.is_verified !== false) ? '<span style="font-size: 11px; background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; margin-left: 5px;"><i class="fa-solid fa-check"></i> 2차 인증 완료</span>' : '';
                                        return `
                                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #edf2f7; text-align: left; margin-bottom: 10px;">
                                            <p style="font-size: 13px; color: #4a5568; margin: 0 0 5px 0;"><strong>등록 건물명:</strong> ${b.name || '-'} ${verifiedBadge}</p>
                                            <p style="font-size: 13px; color: #4a5568; margin: 0;"><strong>등록 주소:</strong> ${b.address || '-'}</p>
                                        </div>
                                        `;
                                    }).join('');
                                }
                            } else {
                                document.getElementById('auth-owner-form-content').classList.remove('hidden');
                                document.getElementById('auth-owner-completed').classList.add('hidden');
                            }
                        } else {
                            document.getElementById('auth-tenant-form').classList.remove('hidden');
                        }
                    }
                }
            } else if (viewName === 'owner-app') {
                if (!isAuthenticated) {
                    showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
                    showView('main-app');
                    return;
                }
                document.getElementById('owner-app').classList.remove('hidden');
                if (typeof isAuthenticated !== 'undefined' && isAuthenticated) {
                    renderOwnerBuildings();
                }
                loadInventory();
                loadComplaints();
                checkPendingInvites();
                renderOwnerBuildings();
            } else if (viewName === 'add-building-view') {
                if (!isAuthenticated) {
                    showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
                    showView('main-app');
                    return;
                }
                document.getElementById('add-building-view').classList.remove('hidden');
            } else if (viewName === 'tenant-app') {
                if (!isAuthenticated) {
                    showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
                    showView('main-app');
                    return;
                }
                document.getElementById('tenant-app').classList.remove('hidden');
                checkTenantMatchStatus();
            } else if (viewName === 'building-management-page') {
                if (!isAuthenticated) {
                    showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
                    showView('main-app');
                    return;
                }
                document.getElementById('building-management-page').classList.remove('hidden');
            } else if (viewName === 'room-detail-page') {
                if (!isAuthenticated) {
                    showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
                    showView('main-app');
                    return;
                }
                if (document.getElementById('room-detail-page')) {
                    document.getElementById('room-detail-page').classList.remove('hidden');
                }
            } else if (viewName === 'owner-add-material-view') {
                if(document.getElementById('owner-add-material-view')) document.getElementById('owner-add-material-view').classList.remove('hidden');
            } else if (viewName === 'owner-material-history-view') {
                if(document.getElementById('owner-material-history-view')) document.getElementById('owner-material-history-view').classList.remove('hidden');
            } else if (viewName === 'owner-add-complaint-view') {
                if(document.getElementById('owner-add-complaint-view')) document.getElementById('owner-add-complaint-view').classList.remove('hidden');
            } else if (viewName === 'owner-complete-complaint-view') {
                if(document.getElementById('owner-complete-complaint-view')) document.getElementById('owner-complete-complaint-view').classList.remove('hidden');
            }
        }

        function openStoryDetail(storyId) {
            showView('story-detail-app');
            setTimeout(() => {
                if (storyId) {
                    const el = document.getElementById(storyId);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.scrollTo(0, 0);
                }
            }, 100);
        }

        let globalUserRole = 'owner';

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';

            if (!supabaseClient) {
                // 기존 모의 로직 (Supabase 연동 전 작동)
                const namePrefix = email.split('@')[0].toUpperCase();
                if (email.toLowerCase().includes('tenant')) {
                    globalUserRole = 'tenant';
                } else if (email.toLowerCase().includes('owner')) {
                    globalUserRole = 'owner';
                } else {
                    globalUserRole = 'owner'; 
                }
                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                if (document.getElementById('auth-display-name')) {
                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                if (document.getElementById('rd-display-name')) {
                    document.getElementById('rd-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                if (document.getElementById('bm-display-name')) {
                    document.getElementById('bm-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                isAuthenticated = false;
                showView('main-app');
                return;
            }

            // Supabase 로그인 처리
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                showModalAlert('로그인 실패: ' + error.message);
                return;
            }

            if (data.user) {
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (profileError || !profile) {
                    console.error('Profile fetch error:', profileError);
                    showModalAlert('프로필 조회 실패: ' + (profileError ? profileError.message : '데이터 없음'));
                    return;
                }

                globalUserRole = profile.role;
                const namePrefix = profile.name;
                
                document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                if (document.getElementById('auth-display-name')) {
                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                if (document.getElementById('rd-display-name')) {
                    document.getElementById('rd-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                if (document.getElementById('bm-display-name')) {
                    document.getElementById('bm-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                }
                
                isAuthenticated = false; // 기본값
                
                // is_verified 처리 (관리자가 수동 승인한 경우)
                if (profile.is_verified) {
                    isAuthenticated = true;
                }

                // 임대인일 경우 등록된 건물 가져오기
                if (profile.role === 'owner') {
                    const { data: bData, error: bError } = await supabaseClient
                        .from('buildings')
                        .select('*')
                        .eq('owner_id', data.user.id);
                    
                    if (!bError && bData && bData.length > 0) {
                        ownerBuildings = bData;
                        markUserVerified(); // 건물이 있으면 2차 인증 완료로 처리
                    }
                }

                if (window.IS_ADMIN_ROUTE) {
                    if (profile.role === 'admin') {
                        showView('admin-app');
                        loadAdminUsers();
                        loadAdminBuildings();
                    } else {
                        showModalAlert('관리자 권한이 없습니다.');
                        showView('main-app');
                    }
                } else if (profile.role === 'admin') {
                    showView('admin-app');
                    loadAdminUsers();
                    loadAdminBuildings();
                } else if (isAuthenticated) {
                    showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
                } else {
                    showView('main-app');
                }
            }
        }

        async function handleSignup(e) {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const name = document.getElementById('signup-name').value;
            const roleEl = document.querySelector('input[name="signup-role"]:checked');
            const role = roleEl ? roleEl.value : 'owner';

            if (!supabaseClient) {
                // 기존 모의 로직 (Supabase 연동 전 작동)
                globalUserRole = role;
                showModalAlert(name + '님, 가입이 완료되었습니다. 로그인해주세요.');
                showView('login');
                return;
            }

            // Supabase 회원가입 처리
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                showModalAlert('회원가입 실패: ' + error.message);
                return;
            }

            if (data.user) {
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .insert([{
                        id: data.user.id,
                        email: email,
                        name: name,
                        role: role
                    }]);

                if (profileError) {
                    showModalAlert('프로필 저장 실패: ' + profileError.message);
                    return;
                }
            }

            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = password;
            showModalAlert(name + '님, 가입이 완료되었습니다. 로그인해주세요.');
            showView('login');
        }

        function handleLogout() {
            isAuthenticated = false;
            showView('login');
        }

        function authenticateRole(role) {
            markUserVerified(); // 인증 완료 상태로 전환
            if (role === 'owner') {
                showModalAlert('임대인 인증이 완료되었습니다.');
                showView('owner-app');
            } else if (role === 'tenant') {
                showModalAlert('임차인 인증이 완료되었습니다.');
                showView('tenant-app');
            }
        }

        function goToDashboard() {
            if (isAuthenticated) {
                showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
            } else {
                showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
            }
        }

        let ownerBuildings = [];
        let ownerContractFile = null;

        function handleContractUpload(event) {
            const file = event.target.files[0];
            if (file) {
                ownerContractFile = file;
                const icon = document.getElementById('contract-upload-icon');
                const text = document.getElementById('contract-upload-text');
                const box = document.getElementById('contract-upload-box');
                
                icon.className = 'fa-solid fa-file-circle-check';
                icon.style.color = 'var(--point-orange)';
                text.innerHTML = '<strong style="color: var(--point-orange);">' + file.name + '</strong><br>파일이 첨부되었습니다.';
                box.style.borderColor = 'var(--point-orange)';
                box.style.backgroundColor = '#fffaf0';
            }
        }

        async function authenticateOwnerDetailed(event) {
            event.preventDefault();
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
                                const sessionData = await supabaseClient.auth.getSession();
                                const session = sessionData?.data?.session;
                                if (!session) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('세션이 만료되었습니다. 다시 로그인해 주세요.');
                                    return;
                                }
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
                                        address: bAddr,
                                        room: result.extractedTenant.room,
                                        tenant_name: result.extractedTenant.name
                                    };
                                    const { error: tenantErr } = await supabaseClient.from('tenants').insert([tenantInsertData]);
                                    if (!tenantErr) {
                                        tenantAddMsg = '\n[임차인: ' + result.extractedTenant.name + '(' + result.extractedTenant.room + ') 자동 등록됨]';
                                        if (typeof activeTenantsData === 'undefined') window.activeTenantsData = [];
                                        activeTenantsData.push({ address: bAddr, room: result.extractedTenant.room, tenantName: result.extractedTenant.name });
                                    }
                                }
                            }
                            
                            // 2차 인증 성공 시, 곧바로 호실 및 임대차 상세 정보 수정 페이지로 이동한 뒤 페이지 내에서 AI 추출이 진행되도록 합니다.
                            document.getElementById('loading-view').classList.add('hidden');

                            // 로컬 캐시 빌딩 정보 확인 및 갱신
                            if (!ownerBuildings) ownerBuildings = [];
                            let bIdx = ownerBuildings.findIndex(b => b.id === targetBuildingId);
                            if (bIdx === -1) {
                                ownerBuildings.push({
                                    id: targetBuildingId,
                                    name: bName,
                                    address: bAddr,
                                    is_verified: true,
                                    floors: 1,
                                    rooms: []
                                });
                                bIdx = ownerBuildings.length - 1;
                            } else {
                                ownerBuildings[bIdx].is_verified = true;
                            }

                            // 추출한 호실 번호 확인 (2차 인증 OCR 결과인 result.extractedTenant 정보 우선 활용)
                            let roomNum = '101호';
                            if (result.extractedTenant && result.extractedTenant.room && result.extractedTenant.room !== '미지정') {
                                roomNum = result.extractedTenant.room;
                                if (!roomNum.endsWith('호')) roomNum += '호';
                            }

                            // 해당 호실이 캐시에 없으면 생성
                            if (!ownerBuildings[bIdx].rooms) ownerBuildings[bIdx].rooms = [];
                            let rIdx = ownerBuildings[bIdx].rooms.findIndex(r => r.roomNumber === roomNum);
                            if (rIdx === -1) {
                                ownerBuildings[bIdx].rooms.push({
                                    roomNumber: roomNum,
                                    type: '원룸',
                                    room_status: '입주중'
                                });
                                rIdx = ownerBuildings[bIdx].rooms.length - 1;
                            }

                            // 중복 계약서 검증 (이미지 또는 동일 건물/호실 중복 방지)
                            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                                // 1. 이미지 데이터 중복 체크
                                const { data: existingImg, error: imgErr } = await supabaseClient
                                    .from('contracts')
                                    .select('id')
                                    .eq('contract_image_url', base64Data)
                                    .maybeSingle();
                                
                                if (!imgErr && existingImg) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('동일한 계약서 이미지가 이미 시스템에 존재합니다.');
                                    return;
                                }

                                // 2. 해당 건물 및 호실 계약 중복 체크
                                const { data: existingContract, error: checkError } = await supabaseClient
                                    .from('contracts')
                                    .select('id')
                                    .eq('building_id', targetBuildingId)
                                    .eq('room_number', roomNum)
                                    .maybeSingle();

                                if (!checkError && existingContract) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    showModalAlert('해당 호실에 계약서가 이미 등록되어 존재합니다.');
                                    return;
                                }
                            }

                            // 원래 있던 호실 상세 정보 페이지 바로 호출 (AI 추출은 페이지 내에서 진행하도록 null 전달)
                            markUserVerified();
                            await openRoomDetailPage(bIdx, rIdx, null, base64Data);
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

        function initDragAndDrop() {
            const dropZone = document.getElementById('drag-drop-zone');
            const fileInput = document.getElementById('owner-contract-file');
            const fileNameDisplay = document.getElementById('drag-drop-file-name');
            const dropIcon = document.getElementById('drag-drop-icon');
            const dropText = document.getElementById('drag-drop-text');

            if (!dropZone || !fileInput) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.style.borderColor = 'var(--point-orange)';
                    dropZone.style.backgroundColor = '#fffaf0';
                    dropIcon.style.color = 'var(--point-orange)';
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.style.borderColor = '#cbd5e0';
                    dropZone.style.backgroundColor = '#f8fafc';
                    dropIcon.style.color = '#a0aec0';
                }, false);
            });

            dropZone.addEventListener('drop', (e) => {
                let dt = e.dataTransfer;
                let files = dt.files;
                if (files && files.length > 0) {
                    fileInput.files = files;
                    updateFileDisplay(files[0]);
                }
            }, false);

            fileInput.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    updateFileDisplay(this.files[0]);
                }
            });

            function updateFileDisplay(file) {
                dropIcon.className = 'fa-solid fa-file-circle-check';
                dropIcon.style.color = 'var(--point-orange)';
                dropText.innerHTML = '<strong style="color: var(--point-orange);">' + file.name + '</strong>';
                fileNameDisplay.innerText = '파일이 정상적으로 첨부되었습니다.';
                dropZone.style.borderColor = 'var(--point-orange)';
                dropZone.style.backgroundColor = '#fffaf0';
            }
        }
        
        // 스크립트가 실행될 때 초기화 (문서 파싱 후)
        document.addEventListener('DOMContentLoaded', initDragAndDrop);
        // 만약 이미 로드되었다면 즉시 실행
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            initDragAndDrop();
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
                
                // 매칭된 임차인 가져오기 (건물 ID 또는 주소 매칭)
                const matchedTenantsForBuilding = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).filter(function(m) { 
                    return m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim()); 
                });
                
                if (!b.rooms) b.rooms = [];
                matchedTenantsForBuilding.forEach(function(m) {
                    const foundRoom = b.rooms.find(function(r) { return r.roomNumber === m.room; });
                    if (foundRoom) {
                        if (m.roomType && m.roomType !== '미지정') {
                            foundRoom.type = m.roomType;
                        }
                        foundRoom.room_status = m.roomStatus || m.room_status || foundRoom.room_status;
                        foundRoom.roomStatus = m.roomStatus || m.room_status || foundRoom.roomStatus;
                    } else if (m.room) {
                        b.rooms.push({ 
                            roomNumber: m.room, 
                            type: m.roomType || '미지정',
                            room_status: m.roomStatus || m.room_status || '공실',
                            roomStatus: m.roomStatus || m.room_status || '공실'
                        });
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
                                    const hasValidTenant = matched && matched.status !== 'vacant' && matched.tenantName && matched.tenantName !== '이름 없음' && matched.tenantName.trim() !== '';
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
            updateOwnerDashboardStats();
        }

        function updateOwnerDashboardStats() {
            if (!ownerBuildings) return;
            
            // 1. 보유 건물 수
            const bCountEl = document.getElementById('owner-stat-buildings');
            if (bCountEl) bCountEl.innerText = ownerBuildings.length + ' 개';

            // 2. 관리 호실 수 및 입주율/공실 계산
            let totalRooms = 0;
            let occupiedRooms = 0;
            
            ownerBuildings.forEach(b => {
                if (b.rooms && b.rooms.length > 0) {
                    totalRooms += b.rooms.length;
                    b.rooms.forEach(r => {
                        // activeTenantsData에서 해당 건물/호실의 최신 매칭 상태 파악
                        const matched = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).find(m => {
                            return m.room === r.roomNumber && (m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim()));
                        });
                        
                        // 방의 상태가 '입주중'이거나, 매칭된 임차인이 있고 상태가 'vacant'가 아닌 경우 입주중으로 판단
                        const isOccupied = (r.room_status === '입주중' || r.roomStatus === '입주중') || 
                                           (matched && matched.status !== 'vacant' && (matched.roomStatus === '입주중' || matched.room_status === '입주중' || (matched.tenantName && matched.tenantName !== '이름 없음' && matched.tenantName.trim() !== '')));
                        
                        if (isOccupied) {
                            occupiedRooms++;
                        }
                    });
                }
            });
            
            const rCountEl = document.getElementById('owner-stat-rooms');
            if (rCountEl) rCountEl.innerText = totalRooms + ' 개';
            
            // 3. 입주율 (공실)
            const occupancyEl = document.getElementById('owner-stat-occupancy');
            if (occupancyEl) {
                if (totalRooms === 0) {
                    occupancyEl.innerText = '0% (0호)';
                } else {
                    const rate = Math.round((occupiedRooms / totalRooms) * 100);
                    const vacantCount = totalRooms - occupiedRooms;
                    occupancyEl.innerText = rate + '% (공실 ' + vacantCount + '호)';
                }
            }

            // 4. 하자보수 요청
            const pendingEl = document.getElementById('owner-stat-pending');
            if (pendingEl) {
                pendingEl.innerText = '1 건';
            }
        }

        function toggleBuildingMenu(idx, event) {
            event.stopPropagation();
            const menu = document.getElementById('building-menu-' + idx);
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('[id^="building-menu-"]').forEach(el => el.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
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

        function toggleBmMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById('bm-dropdown');
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu').forEach(el => el.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        }
        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('[id^="building-menu-"]') && !e.target.closest('button[onclick^="toggleBuildingMenu"]')) {
                document.querySelectorAll('[id^="building-menu-"]').forEach(el => el.classList.add('hidden'));
            }
            if (!e.target.closest('.room-dropdown-menu') && !e.target.closest('button[onclick^="toggleRoomMenu"]')) {
                document.querySelectorAll('.room-dropdown-menu').forEach(el => el.classList.add('hidden'));
            }
            if (!e.target.closest('#rd-dropdown') && !e.target.closest('#rd-display-name')) {
                const rd = document.getElementById('rd-dropdown');
                if (rd) rd.classList.add('hidden');
            }
            if (!e.target.closest('#bm-dropdown') && !e.target.closest('#bm-display-name')) {
                const bm = document.getElementById('bm-dropdown');
                if (bm) bm.classList.add('hidden');
            }
        });

        function openBuildingManagementPage(idx) {
            const b = ownerBuildings[idx];
            showView('building-management-page');
            const content = document.getElementById('building-management-content');
            
            content.innerHTML = '<div class="card" style="border-top: 4px solid var(--primary-light-blue);">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">' +
                    '<div class="card-title" style="margin-bottom: 0;"><i class="fa-solid fa-building"></i> 건물 상세 관리</div>' +
                    '<button class="btn" style="background: #edf2f7; color: #4a5568; padding: 6px 12px; font-size: 12px;" onclick="showView(\'owner-app\')"><i class="fa-solid fa-xmark"></i> 닫기</button>' +
                '</div>' +
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
            
            // 매칭된 임차인 호실 정보 동적 보강
            if (!b.rooms) b.rooms = [];
            const matchedTenants = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).filter(function(m) { 
                return m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim()); 
            });
            
            matchedTenants.forEach(function(m) {
                const foundRoom = b.rooms.find(function(r) { return r.roomNumber === m.room; });
                if (foundRoom) {
                    if (m.roomType && m.roomType !== '미지정') {
                        foundRoom.type = m.roomType;
                    }
                    foundRoom.room_status = m.roomStatus || m.room_status || foundRoom.room_status;
                    foundRoom.roomStatus = m.roomStatus || m.room_status || foundRoom.roomStatus;
                } else if (m.room) {
                    b.rooms.push({ 
                        roomNumber: m.room, 
                        type: m.roomType || '미지정',
                        room_status: m.roomStatus || m.room_status || '공실',
                        roomStatus: m.roomStatus || m.room_status || '공실'
                    });
                }
            });

            if (b.rooms.length === 0) {
                list.innerHTML = '<p style="color: #a0aec0; font-size: 13px;">등록된 호실이 없습니다.</p>';
                return;
            }
            list.innerHTML = b.rooms.map(function(r, rIdx) {
                const matched = activeTenantsData.find(function(m) { 
                    return m.room === r.roomNumber && (m.building_id === b.id || m.buildingId === b.id || (m.address && b.address && m.address.trim() === b.address.trim())); 
                });
                const badge = matched ? '<span style="background: #e6fffa; color: #319795; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; border: 1px solid #b2f5ea;"><i class="fa-solid fa-user-check"></i> 입주: ' + matched.tenantName + '</span>' : '';
                
                const actionButtons = matched ? 
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold; font-size: 12px;">삭제</button>' :
                    '<button onclick="openManualTenantModal(' + idx + ', ' + rIdx + ')" style="background: none; border: 1px solid #3182ce; border-radius: 4px; padding: 2px 8px; color: #3182ce; cursor: pointer; font-size: 11px; margin-right: 8px;">수동 등록</button>' +
                    '<button onclick="deleteRoomFromPage(' + idx + ', ' + rIdx + ')" style="background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold; font-size: 12px;">삭제</button>';

                const typeStr = (r.type && r.type !== '미지정') ? ' <span style="font-size: 12px; color: #718096;">(' + r.type + ')</span>' : '';

                return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; background: #f8fafc;">' +
                    '<span><strong style="color: var(--primary-deep-navy);">' + r.roomNumber + '</strong>' + typeStr + badge + '</span>' +
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
                        building_id: bId,
                        owner_id: session.user.id,
                        room_number: rNum,
                        room_type: '미지정',
                        room_status: '입주중',
                        status: 'manual',
                        tenant_name: tName,
                        tenant_phone: tPhone,
                        start_date: sDate || null,
                        end_date: eDate || null,
                        contract_image_url: fileBase64 // 단순 텍스트 컬럼에 임시 저장
                    };

                    const { error } = await supabaseClient.from('contracts').insert([payload]);
                    if (error) {
                        console.error('수동 등록 실패:', error);
                        showModalAlert('DB 저장 실패: ' + error.message + '\n(참고: contracts 테이블에 tenant_name 등의 추가 컬럼이 반영되어 있어야 합니다.)');
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
                                showModalAlert('DB 삭제 실패: ' + error.message + ' (Supabase RLS DELETE 정책을 확인해주세요.)');
                                return;
                            }
                        } catch (e) {
                            console.error(e);
                            showModalAlert('오류가 발생했습니다.');
                            return;
                        }
                    }
                    const wasPrimary = b.isPrimary;
                    ownerBuildings.splice(idx, 1);
                    if (wasPrimary && ownerBuildings.length > 0) {
                        ownerBuildings[0].isPrimary = true;
                    }
                    showModalAlert('건물이 삭제되었습니다.');
                    renderOwnerBuildings();
                    
                    // 건물이 모두 삭제된 경우
                    if (ownerBuildings.length === 0) {
                        isAuthenticated = false; // 인증 초기화 처리
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
            b.rooms.push({ roomNumber: num, type: type, room_status: '공실', roomStatus: '공실' });
            
            if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                try {
                    const sessionData = await supabaseClient.auth.getSession();
                    const session = sessionData?.data?.session;
                    if (session) {
                        const { data, error } = await supabaseClient.from('contracts').insert([{
                            building_id: b.id,
                            owner_id: session.user.id,
                            status: 'manual',
                            room_number: num,
                            room_count: type === '투룸' ? 2 : 1,
                            room_type: type,
                            room_status: '공실',
                            bathroom_count: 1,
                            living_room_count: 0,
                            veranda_count: 1,
                            deposit: 0,
                            monthly_rent: 0,
                            maintenance_fee: 0,
                            cleaning_fee: 0
                        }]).select();

                        if (error) {
                            console.error('호실 추가 DB 저장 실패:', error);
                            showModalAlert('DB 저장 실패: ' + error.message);
                            return;
                        }

                        if (data && data.length > 0) {
                            const newC = data[0];
                            if (typeof activeTenantsData === 'undefined') activeTenantsData = [];
                            activeTenantsData.push({
                                id: newC.id,
                                building_id: newC.building_id,
                                tenantName: newC.tenant_name || '이름 없음',
                                room: newC.room_number,
                                roomType: newC.room_type || '미지정',
                                roomStatus: newC.room_status || '공실',
                                address: b.address,
                                isManual: newC.status === 'manual',
                                tenantPhone: newC.tenant_phone || '',
                                deposit: newC.deposit || 0,
                                monthlyRent: newC.monthly_rent || 0,
                                maintenanceFee: newC.maintenance_fee || 0,
                                cleaningFee: newC.cleaning_fee || 0,
                                contractDate: newC.contract_date || '',
                                leaseStartDate: newC.lease_start_date || '',
                                leaseEndDate: newC.lease_end_date || '',
                                status: newC.status || ''
                            });
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

        async function openRoomDetailPage(bIdx, rIdx, preExtractedData = null, preBase64 = null) {
            isRdLoading = true;
            try {
                const b = ownerBuildings[bIdx];
                if (!b) {
                    showModalAlert('건물 정보를 찾을 수 없습니다.');
                    return;
                }
                const r = b.rooms[rIdx];
                if (!r) {
                    showModalAlert('호실 정보를 찾을 수 없습니다.');
                    return;
                }

                showView('room-detail-page');

                document.getElementById('rd-building-idx').value = bIdx;
                document.getElementById('rd-room-idx').value = rIdx;

                // 기본 필드 초기화 및 룸 정보 표시
                document.getElementById('rd-room-number').value = r.roomNumber;
                document.getElementById('rd-room-type').value = r.type || '미지정';
                document.getElementById('rd-contract-id').value = '';
                document.getElementById('rd-broker-id').value = '';
                document.getElementById('rd-floor-type').value = '지상';
                document.getElementById('rd-floor-no').value = '';
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
                document.getElementById('rd-room-count').value = '';
                document.getElementById('rd-bathroom-count').value = '';
                document.getElementById('rd-living-room-count').value = '';
                document.getElementById('rd-veranda-count').value = '';

                // OCR 보임/숨김 UI 초기화 (사전에 추출된 데이터가 없는 경우만 초기화)
                if (!preExtractedData) {
                    const uploadWrapper = document.getElementById('rd-ocr-upload-wrapper');
                    if (uploadWrapper) uploadWrapper.classList.remove('hidden');
                    const previewContainer = document.getElementById('rd-ocr-preview-container');
                    if (previewContainer) previewContainer.classList.add('hidden');
                    const previewImg = document.getElementById('rd-ocr-preview-img');
                    if (previewImg) previewImg.src = '';
                }

                let matched = null;
                if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                    try {
                        const { data, error } = await supabaseClient.from('contracts')
                            .select('*, brokers(*)')
                            .eq('building_id', b.id)
                            .eq('room_number', r.roomNumber)
                            .maybeSingle();
                        
                        if (!error && data) {
                            const bData = data.brokers;
                            matched = {
                                id: data.id,
                                room: data.room_number,
                                roomType: data.room_type,
                                roomStatus: data.room_status,
                                area: data.area,
                                floorType: data.floor_type || '지상',
                                floorNo: data.floor_no || '',
                                status: data.status,
                                tenantName: data.tenant_name,
                                tenantPhone: data.tenant_phone,
                                deposit: data.deposit,
                                monthlyRent: data.monthly_rent,
                                maintenanceFee: data.maintenance_fee,
                                cleaningFee: data.cleaning_fee,
                                contractDate: data.contract_date,
                                leaseStartDate: data.lease_start_date,
                                leaseEndDate: data.lease_end_date,
                                brokerId: data.broker_id,
                                brokerAgency: bData ? bData.agency_name : data.broker_agency_name,
                                brokerRep: bData ? bData.representative_name : data.broker_rep_name,
                                brokerAddress: bData ? bData.address : data.broker_address,
                                brokerPhone: bData ? bData.phone : data.broker_phone,
                                brokerRegNumber: bData ? bData.registration_no : data.broker_reg_number,
                                contractImageUrl: data.contract_image_url || '',
                                roomCount: data.room_count,
                                bathroomCount: data.bathroom_count,
                                livingRoomCount: data.living_room_count,
                                verandaCount: data.veranda_count
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
                    document.getElementById('rd-broker-id').value = matched.brokerId || matched.broker_id || '';
                    if (matched.roomType || matched.room_type) {
                        document.getElementById('rd-room-type').value = matched.roomType || matched.room_type;
                    }
                    document.getElementById('rd-floor-type').value = matched.floorType || matched.floor_type || '지상';
                    document.getElementById('rd-floor-no').value = matched.floorNo || matched.floor_no || '';
                    document.getElementById('rd-area').value = matched.area || '';
                    document.getElementById('rd-room-status').value = matched.roomStatus || matched.room_status || ((matched.status !== 'vacant') ? '입주중' : '공실');

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
                    
                    document.getElementById('rd-room-count').value = matched.roomCount !== undefined ? matched.roomCount : '';
                    document.getElementById('rd-bathroom-count').value = matched.bathroomCount !== undefined ? matched.bathroomCount : '';
                    document.getElementById('rd-living-room-count').value = matched.livingRoomCount !== undefined ? matched.livingRoomCount : '';
                    document.getElementById('rd-veranda-count').value = matched.verandaCount !== undefined ? matched.verandaCount : '';

                    // 추가: 기존 계약서 이미지가 있을 경우 미리보기 바인딩
                    if (matched.contractImageUrl) {
                        const uploadWrapper = document.getElementById('rd-ocr-upload-wrapper');
                        if (uploadWrapper) uploadWrapper.classList.add('hidden');
                        
                        const previewContainer = document.getElementById('rd-ocr-preview-container');
                        const previewImg = document.getElementById('rd-ocr-preview-img');
                        if (previewContainer && previewImg) {
                            previewImg.src = matched.contractImageUrl;
                            previewContainer.classList.remove('hidden');
                            setTimeout(() => {
                                initRdOcrInteractions();
                                setRdOcrMode('magnifier');
                            }, 100);
                        }
                    }
                }

                // 사전에 추출된 OCR 정보가 전달된 경우 폼 필드 강제 업데이트
                if (preExtractedData) {
                    if (preExtractedData.ocr_room_type) document.getElementById('rd-room-type').value = preExtractedData.ocr_room_type;
                    if (preExtractedData.ocr_area) document.getElementById('rd-area').value = parseFloat(preExtractedData.ocr_area) || '';
                    if (preExtractedData.ocr_room_count) document.getElementById('rd-room-count').value = preExtractedData.ocr_room_count;
                    if (preExtractedData.ocr_bathroom_count) document.getElementById('rd-bathroom-count').value = preExtractedData.ocr_bathroom_count;
                    if (preExtractedData.ocr_living_room_count) document.getElementById('rd-living-room-count').value = preExtractedData.ocr_living_room_count;
                    if (preExtractedData.ocr_veranda_count) document.getElementById('rd-veranda-count').value = preExtractedData.ocr_veranda_count;
                    if (preExtractedData.ocr_deposit) {
                        const dep = parseInt(preExtractedData.ocr_deposit.toString().replace(/[^0-9]/g, ''));
                        if (!isNaN(dep)) document.getElementById('rd-deposit').value = dep;
                    }
                    if (preExtractedData.ocr_monthly_rent) {
                        const rent = parseInt(preExtractedData.ocr_monthly_rent.toString().replace(/[^0-9]/g, ''));
                        if (!isNaN(rent)) document.getElementById('rd-monthly-rent').value = rent;
                    }
                    if (preExtractedData.ocr_maintenance_fee) {
                        const fee = parseInt(preExtractedData.ocr_maintenance_fee.toString().replace(/[^0-9]/g, ''));
                        if (!isNaN(fee)) document.getElementById('rd-maintenance-fee').value = fee;
                    }
                    if (preExtractedData.ocr_cleaning_fee) {
                        const fee = parseInt(preExtractedData.ocr_cleaning_fee.toString().replace(/[^0-9]/g, ''));
                        if (!isNaN(fee)) document.getElementById('rd-cleaning-fee').value = fee;
                    }
                    if (preExtractedData.ocr_tenant_name) document.getElementById('rd-tenant-name').value = preExtractedData.ocr_tenant_name;
                    if (preExtractedData.ocr_tenant_phone) document.getElementById('rd-tenant-phone').value = preExtractedData.ocr_tenant_phone;
                    
                    const formatOcrDate = (dStr) => {
                        if (!dStr) return '';
                        return dStr.replace(/-/g, '.');
                    };
                    if (preExtractedData.ocr_contract_date) document.getElementById('rd-contract-date').value = formatOcrDate(preExtractedData.ocr_contract_date);
                    if (preExtractedData.ocr_lease_start_date) document.getElementById('rd-lease-start-date').value = formatOcrDate(preExtractedData.ocr_lease_start_date);
                    if (preExtractedData.ocr_lease_end_date) document.getElementById('rd-lease-end-date').value = formatOcrDate(preExtractedData.ocr_lease_end_date);
                    
                    if (preExtractedData.ocr_broker_agency_name) document.getElementById('rd-broker-agency').value = preExtractedData.ocr_broker_agency_name;
                    if (preExtractedData.ocr_broker_representative) document.getElementById('rd-broker-rep').value = preExtractedData.ocr_broker_representative;
                    if (preExtractedData.ocr_broker_address) document.getElementById('rd-broker-address').value = preExtractedData.ocr_broker_address;
                    if (preExtractedData.ocr_broker_phone) document.getElementById('rd-broker-phone').value = preExtractedData.ocr_broker_phone;
                    if (preExtractedData.ocr_broker_registration_no) document.getElementById('rd-broker-reg-number').value = preExtractedData.ocr_broker_registration_no;
                    
                    document.getElementById('rd-room-status').value = '입주중';
                }

                // 전달받은 base64 이미지로 미리보기 바인딩
                if (preBase64) {
                    const uploadWrapper = document.getElementById('rd-ocr-upload-wrapper');
                    if (uploadWrapper) uploadWrapper.classList.add('hidden');
                    
                    const previewContainer = document.getElementById('rd-ocr-preview-container');
                    const previewImg = document.getElementById('rd-ocr-preview-img');
                    if (previewContainer && previewImg) {
                        previewImg.src = preBase64;
                        previewContainer.classList.remove('hidden');
                        setTimeout(() => {
                            initRdOcrInteractions();
                            setRdOcrMode('magnifier');
                        }, 100);
                    }

                    // 2차 인증 직후 등으로 이미지만 직접 넘어온 경우, 상세 페이지 내에서 실시간 AI 추출을 실행
                    if (!preExtractedData) {
                        // AI 분석 중 폼 내 입력 요소 비활성화 처리
                        const formElements = document.querySelectorAll('#room-detail-edit-form input, #room-detail-edit-form select, #room-detail-edit-form button');
                        formElements.forEach(el => {
                            if (el.id !== 'rd-ocr-file-input') {
                                el.disabled = true;
                            }
                        });

                        // 임시 로딩 피드백 제공 (진행바 및 로딩 뷰 표시)
                        const loadingView = document.getElementById('loading-view');
                        if (loadingView) {
                            loadingView.querySelector('h3').innerText = 'AI 모델을 통해 계약서 데이터를 상세 추출 중입니다...';
                            loadingView.classList.remove('hidden');
                        }

                        const saveBtn = document.getElementById('btn-save-room-detail');
                        const originalBtnText = saveBtn ? saveBtn.innerHTML : '변경사항 저장';
                        if (saveBtn) {
                            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI 정보 추출 중...';
                        }

                        (async () => {
                            try {
                                const response = await fetch('/api/gemini-extract', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        imageBase64: preBase64,
                                        apiKey: await getGeminiApiKey()
                                    })
                                });
                                const result = await response.json();

                                // 폼 활성화 복원 및 진행바 숨김
                                formElements.forEach(el => {
                                    el.disabled = false;
                                });
                                if (saveBtn) saveBtn.innerHTML = originalBtnText;
                                if (loadingView) {
                                    loadingView.classList.add('hidden');
                                    loadingView.querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                }

                                if (response.ok && result.success && result.data) {
                                    const extData = result.data;
                                    
                                    // 각 필드에 AI 추출 결과 자동 기입
                                    if (extData.ocr_room_number) {
                                        let roomVal = extData.ocr_room_number.toString().trim();
                                        if (roomVal && roomVal !== '미지정') {
                                            if (!roomVal.endsWith('호')) roomVal += '호';
                                            document.getElementById('rd-room-number').value = roomVal;
                                            
                                            // 캐시 상의 방 번호도 동기화하여 최종 저장 시 일관성 유지
                                            if (ownerBuildings[bIdx] && ownerBuildings[bIdx].rooms && ownerBuildings[bIdx].rooms[rIdx]) {
                                                ownerBuildings[bIdx].rooms[rIdx].roomNumber = roomVal;
                                            }
                                        }
                                    }
                                    if (extData.ocr_room_type) document.getElementById('rd-room-type').value = extData.ocr_room_type;
                                    if (extData.ocr_room_count) document.getElementById('rd-room-count').value = extData.ocr_room_count;
                                    if (extData.ocr_bathroom_count) document.getElementById('rd-bathroom-count').value = extData.ocr_bathroom_count;
                                    if (extData.ocr_living_room_count) document.getElementById('rd-living-room-count').value = extData.ocr_living_room_count;
                                    if (extData.ocr_veranda_count) document.getElementById('rd-veranda-count').value = extData.ocr_veranda_count;
                                    if (extData.ocr_area) document.getElementById('rd-area').value = parseFloat(extData.ocr_area) || '';
                                    if (extData.ocr_deposit) {
                                        const dep = parseInt(extData.ocr_deposit.toString().replace(/[^0-9]/g, ''));
                                        if (!isNaN(dep)) document.getElementById('rd-deposit').value = dep;
                                    }
                                    if (extData.ocr_monthly_rent) {
                                        const rent = parseInt(extData.ocr_monthly_rent.toString().replace(/[^0-9]/g, ''));
                                        if (!isNaN(rent)) document.getElementById('rd-monthly-rent').value = rent;
                                    }
                                    if (extData.ocr_maintenance_fee) {
                                        const fee = parseInt(extData.ocr_maintenance_fee.toString().replace(/[^0-9]/g, ''));
                                        if (!isNaN(fee)) document.getElementById('rd-maintenance-fee').value = fee;
                                    }
                                    if (extData.ocr_cleaning_fee) {
                                        const fee = parseInt(extData.ocr_cleaning_fee.toString().replace(/[^0-9]/g, ''));
                                        if (!isNaN(fee)) document.getElementById('rd-cleaning-fee').value = fee;
                                    }
                                    if (extData.ocr_tenant_name) document.getElementById('rd-tenant-name').value = extData.ocr_tenant_name;
                                    if (extData.ocr_tenant_phone) document.getElementById('rd-tenant-phone').value = extData.ocr_tenant_phone;
                                    
                                    const formatOcrDate = (dStr) => {
                                        if (!dStr) return '';
                                        return dStr.replace(/-/g, '.');
                                    };
                                    if (extData.ocr_contract_date) document.getElementById('rd-contract-date').value = formatOcrDate(extData.ocr_contract_date);
                                    if (extData.ocr_lease_start_date) document.getElementById('rd-lease-start-date').value = formatOcrDate(extData.ocr_lease_start_date);
                                    if (extData.ocr_lease_end_date) document.getElementById('rd-lease-end-date').value = formatOcrDate(extData.ocr_lease_end_date);
                                    
                                    if (extData.ocr_broker_agency_name) document.getElementById('rd-broker-agency').value = extData.ocr_broker_agency_name;
                                    if (extData.ocr_broker_representative) document.getElementById('rd-broker-rep').value = extData.ocr_broker_representative;
                                    if (extData.ocr_broker_address) document.getElementById('rd-broker-address').value = extData.ocr_broker_address;
                                    if (extData.ocr_broker_phone) document.getElementById('rd-broker-phone').value = extData.ocr_broker_phone;
                                    if (extData.ocr_broker_registration_no) document.getElementById('rd-broker-reg-number').value = extData.ocr_broker_registration_no;
                                    
                                    document.getElementById('rd-room-status').value = '입주중';
                                    
                                    showModalAlert('계약서 AI 정보 추출이 성공적으로 완료되었습니다.');
                                    
                                    // 변경 이력 감지를 위한 초기 상태 값 재세팅 및 변경 사항 체크
                                    initialRoomDetailState = getRoomDetailFormState();
                                    checkRoomDetailChanges();
                                } else {
                                    showModalAlert(result.error || '계약서 AI 추출에 실패했습니다.');
                                }
                            } catch (err) {
                                console.error('Auto Gemini extract error:', err);
                                formElements.forEach(el => {
                                    el.disabled = false;
                                });
                                if (saveBtn) saveBtn.innerHTML = originalBtnText;
                            }
                        })();
                    }
                }


                setTimeout(initRdDragAndDrop, 100);
            } catch (e) {
                console.error("openRoomDetailPage 에러:", e);
                showModalAlert("상세 페이지 로딩 중 오류가 발생했습니다: " + e.message);
            } finally {
                // Capture initial state and disable save button by default after settling
                setTimeout(() => {
                    initialRoomDetailState = getRoomDetailFormState();
                    const saveBtn = document.getElementById('btn-save-room-detail');
                    if (saveBtn) saveBtn.disabled = true;
                    isRdLoading = false;
                }, 300);
            }
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
                            apiKey: await getGeminiApiKey()
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

                    // 1. 계약서 상의 호실과 현재 선택한 호실 비교
                    const currentRoomNum = document.getElementById('rd-room-number').value.trim();
                    let extractedRoomNum = data.ocr_room_number ? data.ocr_room_number.toString().trim() : '';
                    
                    const currentDigits = currentRoomNum.replace(/[^0-9]/g, '');
                    const extractedDigits = extractedRoomNum.replace(/[^0-9]/g, '');
                    
                    if (extractedDigits && currentDigits && extractedDigits !== currentDigits) {
                        showModalAlert('계약서의 호실 정보(' + extractedRoomNum + ')가 현재 선택된 호실(' + currentRoomNum + ')과 다릅니다.');
                        
                        showModalConfirm('계약서의 호실(' + extractedRoomNum + ')이 현재 호실(' + currentRoomNum + ')과 다릅니다. 새로운 호실로 추가하시겠습니까?', async function(confirmed) {
                            if (confirmed) {
                                const bIdx = parseInt(document.getElementById('rd-building-idx').value);
                                const b = ownerBuildings[bIdx];
                                if (!b) return;
                                
                                if (!b.rooms) b.rooms = [];
                                
                                // 동일 호실 이미 존재 여부 검사 (숫자 기준 비교)
                                const isExist = b.rooms.some(function(r) {
                                    return r.roomNumber.toString().replace(/[^0-9]/g, '') === extractedDigits;
                                });
                                
                                if (isExist) {
                                    showModalAlert('동일한 호실(' + extractedRoomNum + ')이 이미 존재합니다.');
                                    return;
                                }
                                
                                // 새 호실 추가
                                b.rooms.push({ roomNumber: extractedRoomNum, type: data.ocr_room_type || '원룸' });
                                
                                // Supabase DB contracts 저장 진행
                                if (typeof supabaseClient !== 'undefined' && supabaseClient && b.id) {
                                    try {
                                        const sessionData = await supabaseClient.auth.getSession();
                                        const session = sessionData?.data?.session;
                                        if (session) {
                                            const dep = data.ocr_deposit ? parseInt(data.ocr_deposit.replace(/[^0-9]/g, '')) : 0;
                                            const rent = data.ocr_monthly_rent ? parseInt(data.ocr_monthly_rent.replace(/[^0-9]/g, '')) : 0;
                                            const mFee = data.ocr_maintenance_fee ? parseInt(data.ocr_maintenance_fee.replace(/[^0-9]/g, '')) : 0;
                                            const cFee = data.ocr_cleaning_fee ? parseInt(data.ocr_cleaning_fee.replace(/[^0-9]/g, '')) : 0;
                                            
                                            let brokerId = null;
                                            const regNo = data.ocr_broker_registration_no ? data.ocr_broker_registration_no.trim() : '';
                                            if (regNo) {
                                                try {
                                                    const { data: existingBrokers, error: selectErr } = await supabaseClient
                                                        .from('brokers')
                                                        .select('id')
                                                        .eq('registration_no', regNo);
                                                    
                                                    if (!selectErr && existingBrokers && existingBrokers.length > 0) {
                                                        brokerId = existingBrokers[0].id;
                                                        await supabaseClient.from('brokers').update({
                                                            agency_name: data.ocr_broker_agency_name,
                                                            representative_name: data.ocr_broker_representative,
                                                            address: data.ocr_broker_address,
                                                            phone: data.ocr_broker_phone
                                                        }).eq('id', brokerId);
                                                    } else {
                                                        const { data: newBroker, error: insertErr } = await supabaseClient
                                                            .from('brokers')
                                                            .insert([{
                                                                agency_name: data.ocr_broker_agency_name || '공인중개사사무소',
                                                                representative_name: data.ocr_broker_representative,
                                                                registration_no: regNo,
                                                                address: data.ocr_broker_address,
                                                                phone: data.ocr_broker_phone
                                                            }])
                                                            .select();
                                                        
                                                        if (!insertErr && newBroker && newBroker.length > 0) {
                                                            brokerId = newBroker[0].id;
                                                        }
                                                    }
                                                } catch(bErr) {
                                                    console.error('중개소 처리 예외:', bErr);
                                                }
                                            }

                                            const newContractPayload = {
                                                building_id: b.id,
                                                owner_id: session.user.id,
                                                room_number: extractedRoomNum,
                                                room_count: data.ocr_room_type === '투룸' ? 2 : 1,
                                                room_type: data.ocr_room_type || '원룸',
                                                room_status: '입주중',
                                                area: data.ocr_area ? parseFloat(data.ocr_area) : null,
                                                deposit: isNaN(dep) ? 0 : dep,
                                                monthly_rent: isNaN(rent) ? 0 : rent,
                                                maintenance_fee: isNaN(mFee) ? 0 : mFee,
                                                cleaning_fee: isNaN(cFee) ? 0 : cFee,
                                                tenant_name: data.ocr_tenant_name || '이름 없음',
                                                tenant_phone: data.ocr_tenant_phone || '',
                                                contract_date: data.ocr_contract_date ? data.ocr_contract_date.replace(/-/g, '.') : null,
                                                lease_start_date: data.ocr_lease_start_date ? data.ocr_lease_start_date.replace(/-/g, '.') : null,
                                                lease_end_date: data.ocr_lease_end_date ? data.ocr_lease_end_date.replace(/-/g, '.') : null,
                                                broker_id: brokerId,
                                                status: 'manual'
                                            };
                                            
                                            const { data: insertedData, error: insError } = await supabaseClient.from('contracts')
                                                .insert([newContractPayload])
                                                .select();
                                                
                                            if (insError) {
                                                console.error('새 호실 계약 등록 실패:', insError);
                                                showModalAlert('새 호실 등록 저장 실패: ' + insError.message);
                                                return;
                                            }
                                            
                                            // activeTenantsData 갱신
                                            if (insertedData && insertedData[0]) {
                                                const newC = insertedData[0];
                                                if (typeof activeTenantsData === 'undefined') window.activeTenantsData = [];
                                                activeTenantsData.push({
                                                    id: newC.id,
                                                    building_id: b.id,
                                                    room: newC.room_number,
                                                    tenantName: newC.tenant_name,
                                                    tenantPhone: newC.tenant_phone,
                                                    deposit: newC.deposit,
                                                    monthlyRent: newC.monthly_rent,
                                                    maintenanceFee: newC.maintenance_fee,
                                                    cleaningFee: newC.cleaning_fee,
                                                    contractDate: newC.contract_date,
                                                    leaseStartDate: newC.lease_start_date,
                                                    leaseEndDate: newC.lease_end_date,
                                                    brokerAgency: newC.broker_agency,
                                                    brokerRep: newC.broker_rep,
                                                    brokerAddress: newC.broker_address,
                                                    brokerPhone: newC.broker_phone,
                                                    brokerRegNumber: newC.broker_reg_number,
                                                    status: newC.status
                                                });
                                            }
                                        }
                                    } catch(e) {
                                        console.error(e);
                                    }
                                }
                                
                                const addedRoomIdx = b.rooms.length - 1;
                                showModalAlert(extractedRoomNum + '호가 신규 추가되어 상세페이지로 이동합니다.');
                                
                                openRoomDetailPage(bIdx, addedRoomIdx, data, base64Data);
                            } else {
                                resetRdOcrUi();
                            }
                        });
                        return;
                    }
                    
                    // 추출 성공 시 각 폼 필드 채우기 (동일 호실일 때만 기존 폼 기입 진행)
                    if (data.ocr_room_type) document.getElementById('rd-room-type').value = data.ocr_room_type;
                    if (data.ocr_area) document.getElementById('rd-area').value = parseFloat(data.ocr_area) || '';
                    
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
                    
                    document.getElementById('rd-room-status').value = '입주중';
                    if (typeof checkRoomDetailChanges === 'function') {
                        checkRoomDetailChanges();
                    }

                    showModalAlert('계약서 OCR 정보가 성공적으로 자동 입력되었습니다.');
                    
                    textDisplay.innerHTML = `<span style="color: var(--point-orange); font-weight: bold;"><i class="fa-solid fa-circle-check"></i> ${file.name} 추출 완료</span>`;
                    
                    // 이미지 노출 및 업로드 영역 감추기
                    const uploadWrapper = document.getElementById('rd-ocr-upload-wrapper');
                    if (uploadWrapper) uploadWrapper.classList.add('hidden');

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
                const uploadWrapper = document.getElementById('rd-ocr-upload-wrapper');
                if (uploadWrapper) uploadWrapper.classList.remove('hidden');
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
                } else if (['rd-deposit', 'rd-monthly-rent', 'rd-maintenance-fee', 'rd-cleaning-fee', 'rd-room-count', 'rd-bathroom-count', 'rd-living-room-count', 'rd-veranda-count'].includes(fieldId)) {
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

                if (typeof checkRoomDetailChanges === 'function') {
                    checkRoomDetailChanges();
                }
            }
        }

        function closeRdExtractionPopup() {
            const popup = document.getElementById('rd-extraction-popup');
            if (popup) popup.style.display = 'none';
        }

        async function saveRoomDetailEdit() {
            const loadingView = document.getElementById('loading-view');
            if (loadingView) {
                loadingView.classList.remove('hidden');
                loadingView.querySelector('h3').innerText = '변경사항을 저장하고 있습니다...';
                const p = loadingView.querySelector('p');
                if (p) p.innerText = '데이터를 안전하게 저장하고 있습니다. 잠시만 기다려 주세요.';
            }
            const saveBtn = document.getElementById('btn-save-room-detail');
            let originalBtnHtml = '';
            if (saveBtn) {
                originalBtnHtml = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중...';
            }

            const restoreSaveBtn = () => {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHtml || '변경사항 저장';
                }
                if (loadingView) {
                    loadingView.classList.add('hidden');
                    loadingView.querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                    const p = loadingView.querySelector('p');
                    if (p) p.innerText = '잠시만 기다려 주세요.';
                }
            };

            try {
                const bIdx = parseInt(document.getElementById('rd-building-idx').value);
                const rIdx = parseInt(document.getElementById('rd-room-idx').value);
                const contractId = document.getElementById('rd-contract-id').value;

                const b = ownerBuildings[bIdx];
                if (!b) {
                    showModalAlert('건물 정보를 찾을 수 없습니다.');
                    restoreSaveBtn();
                    return;
                }
                const r = b.rooms[rIdx];
                if (!r) {
                    showModalAlert('호실 정보를 찾을 수 없습니다.');
                    restoreSaveBtn();
                    return;
                }

                const roomType = document.getElementById('rd-room-type').value;
                const floorType = document.getElementById('rd-floor-type').value;
                const floorNo = document.getElementById('rd-floor-no').value.trim();
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

                const roomCount = document.getElementById('rd-room-count').value !== '' ? parseInt(document.getElementById('rd-room-count').value) : null;
                const bathroomCount = document.getElementById('rd-bathroom-count').value !== '' ? parseInt(document.getElementById('rd-bathroom-count').value) : null;
                const livingRoomCount = document.getElementById('rd-living-room-count').value !== '' ? parseInt(document.getElementById('rd-living-room-count').value) : null;
                const verandaCount = document.getElementById('rd-veranda-count').value !== '' ? parseInt(document.getElementById('rd-veranda-count').value) : null;

                // 로컬 구조 변경
                r.type = roomType;
                r.floor_type = floorType;
                r.floor_no = floorNo;
                r.room_count = roomCount;
                r.bathroom_count = bathroomCount;
                r.living_room_count = livingRoomCount;
                r.veranda_count = verandaCount;

                if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                    const sessionData = await supabaseClient.auth.getSession();
                    const session = sessionData?.data?.session;

                    const loadedBrokerId = document.getElementById('rd-broker-id').value;
                    let brokerId = loadedBrokerId || null;

                    const brokerFieldsChanged = 
                        !initialRoomDetailState ||
                        brokerAgency !== initialRoomDetailState.brokerAgency ||
                        brokerRep !== initialRoomDetailState.brokerRep ||
                        brokerAddress !== initialRoomDetailState.brokerAddress ||
                        brokerPhone !== initialRoomDetailState.brokerPhone ||
                        brokerRegNumber !== initialRoomDetailState.brokerRegNumber;

                    if (session && brokerRegNumber && brokerRegNumber.trim() !== '' && (brokerFieldsChanged || !brokerId)) {
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

                    // 추가: 새로 업로드되거나 기존에 미리보기 중인 계약서 이미지(Base64) 추출
                    const previewImg = document.getElementById('rd-ocr-preview-img');
                    const newContractImg = (previewImg && previewImg.src && previewImg.src.startsWith('data:image/')) ? previewImg.src : null;

                    if (contractId) {
                        // 기존 계약이 있으면 업데이트
                        const updatePayload = {
                            room_count: roomCount,
                            bathroom_count: bathroomCount,
                            living_room_count: livingRoomCount,
                            veranda_count: verandaCount,
                            room_type: roomType,
                            floor_type: floorType,
                            floor_no: floorNo,
                            room_status: roomStatus,
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
                            status: (roomStatus === '입주중' ? 'manual' : 'vacant')
                        };
                        if (newContractImg) {
                            updatePayload.contract_image_url = newContractImg;
                        }

                        const { error } = await supabaseClient.from('contracts')
                            .update(updatePayload)
                            .eq('id', contractId);
                        if (error) {
                            console.error('계약 업데이트 실패:', error);
                            showModalAlert('변경사항 저장 실패: ' + error.message);
                            restoreSaveBtn();
                            return;
                        }
                    } else if (session) {
                        // 새 계약 생성
                        const insertPayload = {
                            building_id: b.id,
                            owner_id: session.user.id,
                            room_number: r.roomNumber,
                            room_count: roomCount,
                            bathroom_count: bathroomCount,
                            living_room_count: livingRoomCount,
                            veranda_count: verandaCount,
                            room_type: roomType,
                            floor_type: floorType,
                            floor_no: floorNo,
                            room_status: roomStatus,
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
                            status: (roomStatus === '입주중' ? 'manual' : 'vacant')
                        };
                        if (newContractImg) {
                            insertPayload.contract_image_url = newContractImg;
                        }

                        const { error } = await supabaseClient.from('contracts')
                            .insert([insertPayload]);
                        if (error) {
                            console.error('새 계약 생성 실패:', error);
                            showModalAlert('변경사항 저장 실패: ' + error.message);
                            restoreSaveBtn();
                            return;
                        }
                    }
                }

                showModalAlert('호실 정보가 성공적으로 업데이트되었습니다.');
                restoreSaveBtn();
                showView('owner-app');
                loadActiveTenants();
            } catch(e) {
                console.error(e);
                showModalAlert('오류가 발생했습니다: ' + e.message);
                restoreSaveBtn();
            }
        }

        function authenticateTenantDetailed(event) {
            event.preventDefault();
            markUserVerified();
            showModalAlert('임대인에게 인증 코드를 발송했습니다. 승인 시 최종 인증이 완료됩니다.');
            showView('tenant-app');
        }


        function handleWriteStory() {
            if (!isAuthenticated) {
                showModalAlert('2차 인증(임대인/임차인) 완료 후 방 등록이 가능합니다.');
                return;
            }
            showModalAlert('방 등록 기능은 준비 중입니다.');
        }

        function handleCommentSubmit() {
            if (!isAuthenticated) {
                showModalAlert('2차 인증(임대인/임차인) 완료 후 댓글 작성이 가능합니다.');
                return;
            }
            showModalAlert('댓글이 성공적으로 등록되었습니다!');
        }

        // 임차인이 임대인 초대 신청
        function handleSendInviteToOwner(e) {
            e.preventDefault();
            const ownerName = document.getElementById('invite-owner-name').value;
            const ownerPhone = document.getElementById('invite-owner-phone').value;
            const room = document.getElementById('invite-room').value;
            const tenantName = document.getElementById('tenant-display-name').innerText;

            fetch('/api/invite-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerName, ownerPhone, room, tenantName })
            })
            .then(res => res.json())
            .then(res => {
                showModalAlert('임대인 ' + ownerName + '님에게 매칭 및 가입 유도 알림톡 초대가 성공적으로 발송되었습니다!');
                document.getElementById('invite-owner-name').value = '';
                document.getElementById('invite-owner-phone').value = '';
                document.getElementById('invite-room').value = '';
            });
        }

        // 임대인의 보류 중인 임차인 매칭 요청 목록 로드
        async function loadActiveTenants() {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        const { data, error } = await supabaseClient
                            .from('contracts')
                            .select('*')
                            .eq('owner_id', session.user.id)
                            .in('status', ['matched', 'manual', 'vacant']);
                        
                        if (!error && data) {
                            // Map Supabase fields to frontend fields
                            activeTenantsData = data.map(d => ({
                                id: d.id,
                                building_id: d.building_id,
                                tenantName: d.tenant_name || '이름 없음',
                                room: d.room_number,
                                roomType: d.room_type || '미지정',
                                roomStatus: d.room_status || '공실',
                                address: d.address,
                                isManual: d.status === 'manual',
                                tenantPhone: d.tenant_phone || '',
                                deposit: d.deposit || 0,
                                monthlyRent: d.monthly_rent || 0,
                                maintenanceFee: d.maintenance_fee || 0,
                                cleaningFee: d.cleaning_fee || 0,
                                contractDate: d.contract_date || '',
                                leaseStartDate: d.start_date || '',
                                leaseEndDate: d.end_date || '',
                                brokerAgency: d.broker_agency || '',
                                brokerRep: d.broker_rep || '',
                                brokerAddress: d.broker_address || '',
                                brokerPhone: d.broker_phone || '',
                                brokerRegNumber: d.broker_reg_number || '',
                                area: d.area || '',
                                status: d.status || '',
                                contractImageUrl: d.contract_image_url || ''
                            }));
                        }
                    }
                } catch(e) { console.error(e); }
            } else {
                // Fallback to mock API if no Supabase
                try {
                    const res = await fetch('/api/matched-tenants');
                    const data = await res.json();
                    activeTenantsData = data;
                } catch(e) { console.error(e); }
            }

            const data = (activeTenantsData || []).filter(function(d) { return d.roomStatus === '입주중'; });
            const section = document.getElementById('active-tenants-section');
            if (data.length === 0) {
                section.innerHTML = '';
                return;
            }
            section.innerHTML = '<div class="card" style="border-top: 4px solid #3182ce;">' +
                '<div class="card-title" style="margin-bottom: 15px;"><i class="fa-solid fa-users"></i> 현재 관리 중인 임차인</div>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">' +
                data.map(function(m) {
                    const phoneInfo = m.tenantPhone ? '<div style="font-size: 12px; color: #718096; margin-top: 4px;">' + m.tenantPhone + '</div>' : '';
                    return '<div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">' +
                        '<div>' +
                        '<div style="font-size: 14px; font-weight: bold; color: var(--primary-deep-navy);"><span style="font-size: 11px; font-weight: bold; background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">' + m.room + '</span>' + m.tenantName + '</div>' +
                        phoneInfo +
                        '</div>' +
                        '<button class="btn" style="padding: 6px 12px; font-size: 12px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="showModalAlert(&quot;채널 연결 준비 중입니다.&quot;)">메시지</button>' +
                    '</div>';
                }).join('') +
                '</div></div>';
            
            // 건물 목록 다시 렌더링하여 배지 업데이트
            renderOwnerBuildings();
        }

        function checkPendingInvites() {
            loadActiveTenants();
            fetch('/api/pending-invites')
                .then(res => res.json())
                .then(data => {
                    const section = document.getElementById('pending-invites-section');
                    section.innerHTML = data.map((inv, idx) => `
                        <div class="pending-invite-card">
                            <div>
                                <h4 style="color: var(--point-orange); font-weight:700;"><i class="fa-solid fa-envelope-open-text"></i> 임차인 연계 요청이 있습니다.</h4>
                                <p style="font-size:13px; margin-top:4px;"><b>세입자:</b> ${inv.tenantName} | <b>요청 호실:</b> ${inv.room}</p>
                            </div>
                            <button class="btn btn-orange" onclick="acceptInvite(${idx})">매칭 승인</button>
                        </div>
                    `).join('');
                });
        }

        function acceptInvite(idx) {
            fetch('/api/accept-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: idx })
            })
            .then(res => res.json())
            .then(() => {
                showModalAlert('임차인 매칭 승인이 완료되어 계약 공간이 동기화되었습니다!');
                checkPendingInvites();
            });
        }

        function checkTenantMatchStatus() {
            const tenantName = document.getElementById('tenant-display-name').innerText.trim();
            fetch('/api/tenant-status?name=' + encodeURIComponent(tenantName))
                .then(res => res.json())
                .then(data => {
                    const unmatchedView = document.getElementById('tenant-unmatched-view');
                    const matchedView = document.getElementById('tenant-matched-view');
                    if (data.matched) {
                        unmatchedView.classList.add('hidden');
                        matchedView.classList.remove('hidden');
                        document.getElementById('matched-owner-name').innerText = data.info.ownerName;
                        document.getElementById('matched-owner-phone').innerText = data.info.ownerPhone;
                        document.getElementById('matched-room').innerText = data.info.room;
                    } else {
                        unmatchedView.classList.remove('hidden');
                        matchedView.classList.add('hidden');
                    }
                });
        }

        function handleComplaintSubmit(e) {
            e.preventDefault();
            const titleInput = document.getElementById('complaint-title');
            const descInput = document.getElementById('complaint-desc');
            const fileInput = document.getElementById('complaint-file');
            
            const rawTitle = titleInput.value.trim();
            const description = descInput.value.trim();
            
            // 매칭된 방이 있다면 제목에 추가
            const roomElem = document.getElementById('matched-room');
            const roomText = roomElem ? roomElem.innerText.trim() : '';
            const title = roomText ? `[${roomText}] ${rawTitle}` : rawTitle;

            fetch('/api/complaints/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showModalAlert('민원이 성공적으로 접수되었습니다. 임대인 대시보드에 실시간 반영됩니다.');
                    titleInput.value = '';
                    descInput.value = '';
                    if (fileInput) fileInput.value = '';
                } else {
                    showModalAlert('민원 접수 실패: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                showModalAlert('서버 통신 중 오류가 발생했습니다.');
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
                                    const newBuilding = { name: bName, address: bAddr, isPrimary: ownerBuildings.length === 0, floors: 1, rooms: [{ roomNumber: '101호', type: '원룸', room_status: '공실' }] };
                                    ownerBuildings.push(newBuilding);
                                    document.getElementById('loading-view').classList.add('hidden');
                                    renderOwnerBuildings();
                                    
                                    document.getElementById('add-building-address').value = '';
                                    document.getElementById('add-building-name').value = '';
                                    fileInput.value = '';
                                    if (submitBtn) submitBtn.disabled = false;

                                    const bIdx = ownerBuildings.length - 1;
                                    await openRoomDetailPage(bIdx, 0);
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

                                if (error) {
                                    showModalAlert('건물 등록 실패: ' + error.message);
                                    if (submitBtn) submitBtn.disabled = false;
                                    return;
                                }

                                if (!ownerBuildings) ownerBuildings = [];
                                const newB = insertedData[0];
                                newB.rooms = [{ roomNumber: '101호', type: '원룸', room_status: '공실' }];
                                ownerBuildings.push(newB);

                                // Supabase DB에 101호 기본 계약/호실 데이터 추가
                                const { data: contractData, error: contractErr } = await supabaseClient.from('contracts').insert([{
                                    building_id: newB.id,
                                    owner_id: session.user.id,
                                    status: 'manual',
                                    room_number: '101호',
                                    room_count: 1,
                                    room_type: '원룸',
                                    room_status: '공실',
                                    bathroom_count: 1,
                                    living_room_count: 0,
                                    veranda_count: 1,
                                    deposit: 0,
                                    monthly_rent: 0,
                                    maintenance_fee: 0,
                                    cleaning_fee: 0
                                }]).select();

                                if (!contractErr && contractData && contractData.length > 0) {
                                    const newC = contractData[0];
                                    if (typeof activeTenantsData === 'undefined') activeTenantsData = [];
                                    activeTenantsData.push({
                                        id: newC.id,
                                        building_id: newC.building_id,
                                        tenantName: newC.tenant_name || '이름 없음',
                                        room: newC.room_number,
                                        roomType: newC.room_type || '미지정',
                                        roomStatus: newC.room_status || '공실',
                                        address: bAddr,
                                        isManual: newC.status === 'manual',
                                        tenantPhone: newC.tenant_phone || '',
                                        deposit: newC.deposit || 0,
                                        monthlyRent: newC.monthly_rent || 0,
                                        maintenanceFee: newC.maintenance_fee || 0,
                                        cleaningFee: newC.cleaning_fee || 0,
                                        contractDate: newC.contract_date || '',
                                        leaseStartDate: newC.lease_start_date || '',
                                        leaseEndDate: newC.lease_end_date || '',
                                        status: newC.status || ''
                                    });
                                }

                                renderOwnerBuildings();

                                document.getElementById('add-building-address').value = '';
                                document.getElementById('add-building-name').value = '';
                                fileInput.value = '';
                                if (submitBtn) submitBtn.disabled = false;

                                const bIdx = ownerBuildings.findIndex(b => b.id === newB.id);
                                await openRoomDetailPage(bIdx, 0);
                            } catch (error) {
                                document.getElementById('loading-view').classList.add('hidden');
                                document.getElementById('loading-view').querySelector('h3').innerText = '데이터를 처리 중입니다...';
                                showModalAlert('인증 중 오류가 발생했습니다: ' + error.message);
                            }
                        }

        function runOcr() {
            const fileInput = document.getElementById('dashboard-contract-upload-input');
            if (fileInput) fileInput.click();
        }

        async function handleDashboardContractUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const loadingView = document.getElementById('loading-view');
            if (loadingView) {
                loadingView.querySelector('h3').innerText = '계약서 정보를 분석 중입니다...';
                loadingView.classList.remove('hidden');
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64Data = e.target.result;
                
                // Canvas 이미지 전처리 (흑백 대비 극대화)
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
                    
                    const threshold = 140;
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
                    const preprocessedBase64 = canvas.toDataURL('image/png');

                    try {
                        const ownerName = document.getElementById('common-edit-name').value || document.getElementById('main-display-name').textContent.replace(' 님', '').trim() || '김임대';
                        const response = await fetch('/api/verify-contract-ocr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                imageBase64: preprocessedBase64,
                                ownerName: ownerName,
                                bAddr: ''
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (!response.ok || !result.success) {
                            if (loadingView) loadingView.classList.add('hidden');
                            showModalAlert(result.error || result.message || '인증 실패: 계약서 분석을 완료할 수 없습니다.');
                            return;
                        }

                        let targetBuilding = (ownerBuildings && ownerBuildings.length > 0) ? ownerBuildings[0] : null;
                        
                        if (result.extractedAddress && ownerBuildings && ownerBuildings.length > 0) {
                            const found = ownerBuildings.find(b => b.address && b.address.includes(result.extractedAddress.trim()));
                            if (found) targetBuilding = found;
                        }
                        
                        if (!targetBuilding) {
                            if (loadingView) loadingView.classList.add('hidden');
                            showModalAlert('등록된 건물 정보가 없습니다. 대시보드 우측의 [건물 추가] 버튼을 통해 먼저 건물을 등록해 주세요.');
                            return;
                        }

                        let bIdx = ownerBuildings.findIndex(b => b.id === targetBuilding.id);
                        if (bIdx === -1) bIdx = 0;

                        let roomNum = '101호';
                        if (result.extractedTenant && result.extractedTenant.room && result.extractedTenant.room !== '미지정') {
                            roomNum = result.extractedTenant.room;
                            if (!roomNum.endsWith('호')) roomNum += '호';
                        }

                        if (!ownerBuildings[bIdx].rooms) ownerBuildings[bIdx].rooms = [];
                        let rIdx = ownerBuildings[bIdx].rooms.findIndex(r => r.roomNumber === roomNum);
                        if (rIdx === -1) {
                            ownerBuildings[bIdx].rooms.push({
                                roomNumber: roomNum,
                                type: '원룸',
                                room_status: '입주중'
                            });
                            rIdx = ownerBuildings[bIdx].rooms.length - 1;
                        }

                        // 중복 계약서 검증 (이미지 또는 동일 건물/호실 중복 방지)
                        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                            // 1. 이미지 데이터 중복 체크
                            const { data: existingImg, error: imgErr } = await supabaseClient
                                .from('contracts')
                                .select('id')
                                .eq('contract_image_url', base64Data)
                                .maybeSingle();
                            
                            if (!imgErr && existingImg) {
                                if (loadingView) loadingView.classList.add('hidden');
                                showModalAlert('동일한 계약서 이미지가 이미 시스템에 존재합니다.');
                                return;
                            }

                            // 2. 해당 건물 및 호실 계약 중복 체크
                            const { data: existingContract, error: checkError } = await supabaseClient
                                .from('contracts')
                                .select('id')
                                .eq('building_id', targetBuilding.id)
                                .eq('room_number', roomNum)
                                .maybeSingle();

                            if (!checkError && existingContract) {
                                if (loadingView) loadingView.classList.add('hidden');
                                showModalAlert('해당 호실에 계약서가 이미 등록되어 존재합니다.');
                                return;
                            }
                        }

                        if (loadingView) loadingView.classList.add('hidden');
                        
                        // 호실 상세 페이지 바로 오픈 & AI 정밀 추출 실행
                        await openRoomDetailPage(bIdx, rIdx, null, base64Data);

                    } catch (error) {
                        console.error(error);
                        if (loadingView) loadingView.classList.add('hidden');
                        showModalAlert('OCR 분석 중 오류가 발생했습니다: ' + error.message);
                    }
                };
                img.src = base64Data;
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        }

        function loadInventory() {
            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    const list = document.getElementById('inventory-list');
                    if (!list) return;
                    list.innerHTML = data.map(item => {
                        const imgUrl = item.image_url || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2EwYWVjMCI+PHBhdGggZD0iTTE5IDNINWMtMS4xIDAtMiAuOS0yIDJ2MTRjMCAxLjEuOSAyIDIgMmgxNGMxLjEgMCAyLS45IDItMlY1YzAtMS4xLS45LTItMi0yeW0tMSAxNkg2di0yaDEydjJ6bTAtNEg2di0yaDEydjJ6bTAtNEg2VjhoMTJ2NHoiLz48L3N2Zz4=';
                        return `
                            <div class="inventory-item" style="display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid #edf2f7;">
                                <img src="${imgUrl}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: contain; border: 1px solid #edf2f7; background: #f7fafc; padding: 3px; box-sizing: border-box;" />
                                <div style="flex: 1;">
                                    <h4 onclick="openMaterialHistoryModal('${item.id}', '${item.name}')" style="margin: 0; font-size: 14px; font-weight: 600; color: #2d3748; cursor: pointer; display: inline-block; transition: color 0.15s;" onmouseover="this.style.color='var(--point-orange)'" onmouseout="this.style.color='#2d3748'">${item.name} <i class="fa-solid fa-clock-rotate-left" style="font-size: 10px; color: #a0aec0; margin-left: 4px;"></i></h4>
                                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                                        <span style="font-size: 12px; color: #718096; display: inline-flex; align-items: center; gap: 4px;">
                                            재고:
                                            <span style="display: inline-flex; align-items: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f7fafc;">
                                                <button onclick="adjustInventoryStock('${item.id}', -1)" style="border: none; background: #edf2f7; color: #4a5568; cursor: pointer; padding: 2px 6px; font-size: 11px; font-weight: bold; line-height: 1;">-</button>
                                                <span style="padding: 0 8px; font-weight: 600; color: #2d3748; min-width: 14px; text-align: center; font-size: 11px;">${item.stock}</span>
                                                <button onclick="adjustInventoryStock('${item.id}', 1)" style="border: none; background: #edf2f7; color: #4a5568; cursor: pointer; padding: 2px 6px; font-size: 11px; font-weight: bold; line-height: 1;">+</button>
                                            </span>
                                            개
                                        </span>
                                        <a href="https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.name)}" target="_blank" style="font-size: 11px; color: var(--primary-light-blue); text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                                            <i class="fa-solid fa-cart-shopping" style="font-size: 10px;"></i> 최저가 구매
                                        </a>
                                    </div>
                                </div>
                                <span class="badge ${item.is_low_stock ? 'badge-orange' : 'badge-blue'}">${item.badge_text}</span>
                            </div>
                        `;
                    }).join('');
                });
        }

        // 수동 재고 증감 처리 함수
        function adjustInventoryStock(itemId, amount) {
            fetch('/api/inventory/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: itemId, amount: amount })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadInventory();
                } else {
                    showModalAlert('재고 조정 실패: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                showModalAlert('서버 통신 중 오류가 발생했습니다.');
            });
        }

        // 자재 추가 모달 제어 및 등록
        function openAddMaterialModal() {
            document.getElementById('am-name').value = '';
            document.getElementById('am-stock').value = '0';
            document.getElementById('am-min-required').value = '2';
            const imgInput = document.getElementById('am-image');
            if (imgInput) imgInput.value = '';
            showView('owner-add-material-view');
        }

        // 자재 추가 모달 비활성화
        function closeAddMaterialModal() {
            showView('owner-app');
        }

        // 신규 자재 및 이미지 등록 처리
        function submitAddMaterial() {
            const name = document.getElementById('am-name').value.trim();
            const stock = document.getElementById('am-stock').value.trim();
            const minRequired = document.getElementById('am-min-required').value.trim();
            const fileInput = document.getElementById('am-image');

            if (!name) {
                showModalAlert('자재명을 입력해주세요.');
                return;
            }

            const sendPayload = (imageUrl = '') => {
                fetch('/api/inventory/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        stock: parseInt(stock) || 0,
                        minRequired: parseInt(minRequired) || 0,
                        imageUrl: imageUrl
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showModalAlert('신규 자재 품목이 등록되었습니다.');
                        closeAddMaterialModal();
                        loadInventory();
                    } else {
                        showModalAlert('자재 등록 실패: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error(err);
                    showModalAlert('서버 통신 중 오류가 발생했습니다.');
                });
            };

            if (fileInput && fileInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    sendPayload(e.target.result);
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                sendPayload('');
            }
        }

        // 히스토리 모달 제어 및 로드
        function openMaterialHistoryModal(itemId, itemName) {
            const nameElem = document.getElementById('mh-item-name');
            if (nameElem) nameElem.innerText = itemName;

            const listElem = document.getElementById('mh-history-list');
            if (listElem) listElem.innerHTML = '<p style="font-size: 13px; color: #718096; padding: 15px; text-align:center;">이력을 불러오는 중...</p>';

            fetch(`/api/inventory/history?itemId=${encodeURIComponent(itemId)}`)
                .then(res => res.json())
                .then(txs => {
                    if (!listElem) return;
                    if (txs.length === 0) {
                        listElem.innerHTML = '<p style="font-size: 13px; color: #718096; padding: 15px; text-align:center;">입출고 이력이 없습니다.</p>';
                        return;
                    }

                    listElem.innerHTML = txs.map(t => {
                        const isPlus = t.amount >= 0;
                        const badgeColor = t.type === 'in' ? '#2b6cb0' : '#e53e3e';
                        const badgeBg = t.type === 'in' ? '#ebf8ff' : '#fff5f5';
                        const sign = isPlus ? '+' : '';
                        
                        return `
                            <div style="padding: 12px 10px; border-bottom: 1px solid #edf2f7; display: flex; flex-direction: column; gap: 4px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 11px; color: #a0aec0;">${t.date}</span>
                                    <span style="font-size: 11px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; padding: 2px 6px; border-radius: 4px;">
                                        ${sign}${t.amount}개 (${t.type === 'in' ? '입고' : '출고'})
                                    </span>
                                </div>
                                <div style="font-size: 13px; color: #2d3748; font-weight: 500;">
                                    ${t.description}
                                </div>
                            </div>
                        `;
                    }).join('');
                })
                .catch(err => {
                    console.error(err);
                    if (listElem) listElem.innerHTML = '<p style="font-size: 13px; color: #e53e3e; padding: 15px; text-align:center;">이력을 불러오지 못했습니다.</p>';
                });

            showView('owner-material-history-view');
        }

        function closeMaterialHistoryModal() {
            showView('owner-app');
        }

        // 하자보수 목록 로드 및 렌더링
        function loadComplaints() {
            fetch('/api/complaints')
                .then(res => res.json())
                .then(data => {
                    const list = document.getElementById('complaint-list');
                    if (!list) return;
                    if (data.length === 0) {
                        list.innerHTML = '<p style="font-size: 13px; color: #718096; padding: 10px;">접수된 하자보수 요청이 없습니다.</p>';
                        return;
                    }
                    list.innerHTML = data.map((comp) => {
                        const isDone = comp.status === '완료';
                        const statusColor = isDone ? '#319795' : 'var(--point-orange)';
                        const statusBg = isDone ? '#e6fffa' : '#fff5eb';
                        const dotColor = isDone ? '#319795' : 'var(--point-orange)';
                        const dotShadow = isDone ? '#b2f5ea' : '#ffedd5';
                        
                        let actionButton = '';
                        if (!isDone) {
                            actionButton = `<button class="btn" style="padding: 4px 8px; font-size: 11px; margin-top: 8px; background: var(--primary-light-blue); color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="openCompleteComplaintModal('${comp.id}')">완료 처리</button>`;
                        }
                        
                        return `
                            <div style="position: relative; padding-left: 24px; border-left: 2px solid #e2e8f0; margin-left: 10px; padding-bottom: 5px;">
                                <div style="position: relative;">
                                    <div style="position: absolute; left: -30px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 0 4px ${dotShadow};"></div>
                                    <span style="font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">${comp.status}</span>
                                    <h5 style="font-size: 14px; font-weight: 600; color: #2d3748; margin: 0 0 4px 0;">${comp.title}</h5>
                                    <p style="font-size: 12px; color: #718096; margin: 0; line-height: 1.5;">${comp.description}</p>
                                    ${actionButton}
                                </div>
                            </div>
                        `;
                    }).join('');
                });
        }

        // 하자보수 완료 처리 모달 제어 및 API 전송
        function openCompleteComplaintModal(complaintId) {
            document.getElementById('cc-complaint-id').value = complaintId;
            
            // 자재 목록 로드하여 셀렉트 박스 바인딩
            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    const select = document.getElementById('cc-material-select');
                    if (select) {
                        select.innerHTML = '<option value="">사용 안 함 / 기타</option>' + 
                            data.map(item => `<option value="${item.id}">${item.name} (현재 재고: ${item.stock}개)</option>`).join('');
                    }
                });
                
            showView('owner-complete-complaint-view');
        }
        
        function closeCompleteComplaintModal() {
            showView('owner-app');
        }
        
        function submitCompleteComplaint() {
            const complaintId = document.getElementById('cc-complaint-id').value;
            const materialId = document.getElementById('cc-material-select').value;
            
            fetch('/api/complaints/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    complaintId: complaintId,
                    materialId: materialId
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showModalAlert('하자보수 완료 처리가 정상적으로 완료되었습니다.');
                    closeCompleteComplaintModal();
                    loadComplaints();
                    loadInventory();
                } else {
                    showModalAlert('완료 처리 중 오류가 발생했습니다: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                showModalAlert('서버 통신 중 오류가 발생했습니다.');
            });
        }

        // 하자 수동 등록 모달 제어 및 등록
        function openAddComplaintModal() {
            const buildingGroup = document.getElementById('ac-building-group');
            const buildingSelect = document.getElementById('ac-building-select');
            const roomSelect = document.getElementById('ac-room-select');
            
            document.getElementById('ac-title').value = '';
            document.getElementById('ac-desc').value = '';
            
            if (typeof ownerBuildings === 'undefined' || ownerBuildings.length === 0) {
                showModalAlert('등록된 건물이 없습니다. 건물 관리에서 먼저 건물을 추가해 주세요.');
                return;
            }

            // 건물 목록 세팅
            buildingSelect.innerHTML = ownerBuildings.map((b, idx) => `<option value="${idx}">${b.name}</option>`).join('');

            // 건물이 1개인 경우 건물 선택 감춤, 2개 이상인 경우 노출
            if (ownerBuildings.length === 1) {
                buildingGroup.style.display = 'none';
            } else {
                buildingGroup.style.display = 'block';
            }

            // 첫 번째 건물 기준 호실 목록 세팅
            onComplaintBuildingChange();
            
            showView('owner-add-complaint-view');
        }

        function onComplaintBuildingChange() {
            const buildingSelect = document.getElementById('ac-building-select');
            const roomSelect = document.getElementById('ac-room-select');
            const selectedIdx = parseInt(buildingSelect.value);
            
            if (isNaN(selectedIdx) || !ownerBuildings[selectedIdx]) {
                roomSelect.innerHTML = '<option value="">등록된 호실 없음</option>';
                return;
            }

            const b = ownerBuildings[selectedIdx];
            if (!b.rooms || b.rooms.length === 0) {
                roomSelect.innerHTML = '<option value="">등록된 호실 없음</option>';
                return;
            }

            roomSelect.innerHTML = b.rooms.map(r => `<option value="${r.roomNumber}">${r.roomNumber}호</option>`).join('') 
                + '<option value="공용부">공용부</option>';
        }

        function closeAddComplaintModal() {
            showView('owner-app');
        }

        function submitAddComplaint() {
            const buildingSelect = document.getElementById('ac-building-select');
            const roomSelect = document.getElementById('ac-room-select');
            const rawTitle = document.getElementById('ac-title').value.trim();
            const description = document.getElementById('ac-desc').value.trim();

            if (!rawTitle) {
                showModalAlert('하자 내용을 입력해주세요.');
                return;
            }

            const selectedIdx = parseInt(buildingSelect.value);
            const b = ownerBuildings[selectedIdx];
            const roomVal = roomSelect.value;
            
            // 호실 정보를 제목 접두사에 매칭
            // 건물이 여러 개인 경우 건물명도 함께 표시 (예: "[그린빌라 302호] 세면대 누수")
            let titlePrefix = '';
            if (ownerBuildings.length > 1 && b) {
                titlePrefix = `[${b.name} ${roomVal === '공용부' ? '공용부' : roomVal + '호'}] `;
            } else {
                titlePrefix = `[${roomVal === '공용부' ? '공용부' : roomVal + '호'}] `;
            }
            
            const title = titlePrefix + rawTitle;

            fetch('/api/complaints/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showModalAlert('하자보수 요청이 수동 등록되었습니다.');
                    closeAddComplaintModal();
                    loadComplaints();
                } else {
                    showModalAlert('등록 실패: ' + data.error);
                }
            })
            .catch(err => {
                console.error(err);
                showModalAlert('서버 통신 중 오류가 발생했습니다.');
            });
        }

        let apiSigunguCd = '';
        let apiBjdongCd = '';
        let apiPlatGbCd = '0';
        let apiBun = '';
        let apiJi = '';

        function execDaumPostcode() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('owner-building-address').value = data.address;
                    if (data.buildingName && data.buildingName !== '') {
                        document.getElementById('owner-building-name').value = data.buildingName;
                    }
                    
                    // API 연동을 위한 코드 추출 로직
                    if (data.bcode && data.bcode.length === 10) {
                        apiSigunguCd = data.bcode.substring(0, 5);
                        apiBjdongCd = data.bcode.substring(5, 10);
                    }
                    
                    const jibunStr = data.jibunAddress || data.autoJibunAddress || '';
                    if (jibunStr.includes('산 ')) {
                        apiPlatGbCd = '1';
                    } else {
                        apiPlatGbCd = '0';
                    }
                    
                    // 지번 추출 (마지막 덩어리가 보통 "10-227" 형태)
                    const tokens = jibunStr.split(' ');
                    const lastToken = tokens[tokens.length - 1];
                    if (lastToken) {
                        const parts = lastToken.split('-');
                        apiBun = parts[0].padStart(4, '0');
                        apiJi = (parts.length > 1 ? parts[1] : '0').padStart(4, '0');
                    }
                }
            }).open();
        }

        function execDaumPostcodeForTenant() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('tenant-search-address').value = data.address;
                    document.getElementById('tenant-registered-section').classList.add('hidden');
                    document.getElementById('tenant-unregistered-section').classList.add('hidden');
                }
            }).open();
        }

        function execDaumPostcodeForBroker() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('rd-broker-address').value = data.address;
                    if (typeof checkRoomDetailChanges === 'function') {
                        checkRoomDetailChanges();
                    }
                }
            }).open();
        }

        function execDaumPostcodeForOcrBroker() {
            new daum.Postcode({
                oncomplete: function(data) {
                    document.getElementById('ocr_broker_address').value = data.address;
                }
            }).open();
        }

        let currentFoundOwnerName = '';

        function searchBuildingForTenant() {
            const address = document.getElementById('tenant-search-address').value;
            const room = document.getElementById('tenant-search-room').value;
            if (!address) {
                showModalAlert('주소를 먼저 검색해주세요.');
                return;
            }
            if (!room) {
                showModalAlert('호실을 입력해주세요.');
                return;
            }

            fetch('/api/search-building?address=' + encodeURIComponent(address))
                .then(res => res.json())
                .then(data => {
                    if (data.isRegistered) {
                        currentFoundOwnerName = '대표'; // 실제로는 data.building의 소유자명을 사용해야 하지만 데모용이므로 하드코딩
                        document.getElementById('tenant-found-owner-name').innerText = currentFoundOwnerName;
                        document.getElementById('tenant-registered-section').classList.remove('hidden');
                        document.getElementById('tenant-unregistered-section').classList.add('hidden');
                    } else {
                        document.getElementById('tenant-registered-section').classList.add('hidden');
                        document.getElementById('tenant-unregistered-section').classList.remove('hidden');
                    }
                });
        }

        function requestAuthToOwner() {
            const address = document.getElementById('tenant-search-address').value;
            const room = document.getElementById('tenant-search-room').value;
            const tenantName = document.getElementById('common-edit-name').value || '임차인';

            fetch('/api/invite-owner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantName: tenantName,
                    address: address,
                    room: room,
                    ownerName: currentFoundOwnerName
                })
            }).then(() => {
                markUserVerified();
                showModalAlert('임대인에게 성공적으로 인증 요청을 발송했습니다!\n임대인이 승인하면 대시보드에서 계약 정보가 연동됩니다.');
                showView('tenant-app');
            });
        }

        function sendInviteToOwner() {
            const phone = document.getElementById('tenant-invite-phone').value;
            if (!phone) {
                showModalAlert('임대인 전화번호를 입력해주세요.');
                return;
            }
            markUserVerified();
            showModalAlert(phone + ' 번호로 모두의 방 가입 초대 문자가 발송되었습니다!\n임대인이 가입하시면 추후 자동으로 연동 신청이 가능합니다.');
            showView('tenant-app');
        }
        let adminUsersData = [];

        async function loadAdminUsers() {
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
                const sDate = new Date(startDate.replace(/\./g, '-'));
                filtered = filtered.filter(u => new Date(u.created_at) >= sDate);
            }
            if (endDate) {
                const end = new Date(endDate.replace(/\./g, '-'));
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
                    const verifyStatus = b.is_verified ? '<span style="color: #3182ce; font-weight: 600;">2차 인증 완료</span>' : `<span style="color: #dd6b20; font-weight: 600;">미인증</span>`;
                    bldgHtml += `<tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 8px;">${b.name || '-'}</td>
                        <td style="padding: 12px 8px;">${b.address || '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;">${b.floors ? b.floors + '층' : '-'}</td>
                        <td style="padding: 12px 8px; text-align: center;">${bDate}</td>
                        <td style="padding: 12px 8px; text-align: center;">${verifyStatus}</td>
                        <td style="padding: 12px 8px; text-align: center; display: flex; gap: 5px; justify-content: center;">
                            <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568; cursor: pointer;" onclick="openAdminEditModal('${ownerId}', '', '')">수정</button>
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
                    showModalAlert('인증 상태 변경 실패: ' + error.message);
                    return;
                }
                loadAdminUsers();
            });
        }

        function openAdminEditModal(id, name, phone) {
            document.getElementById('admin-edit-id').value = id;
            document.getElementById('admin-edit-name').value = name;
            document.getElementById('admin-edit-phone').value = phone;
            document.getElementById('admin-edit-modal').classList.remove('hidden');
        }

        function closeAdminEditModal() {
            document.getElementById('admin-edit-modal').classList.add('hidden');
        }

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

        // --- Custom Calendar Logic ---
        let calendarTargetId = '';
        let currentCalDate = new Date();
        let selectedCalDateStr = '';

        function openCalendarModal(targetId) {
            calendarTargetId = targetId;
            const targetVal = document.getElementById(targetId).value;
            selectedCalDateStr = targetVal;
            if (targetVal) {
                const parts = targetVal.split('.');
                if(parts.length === 3) {
                    currentCalDate = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    currentCalDate = new Date();
                }
            } else {
                currentCalDate = new Date();
            }
            currentCalMode = 'date';
            renderCalendar();
            document.getElementById('calendar-modal').classList.remove('hidden');
        }

        function closeCalendarModal() {
            document.getElementById('calendar-modal').classList.add('hidden');
        }

        function resetCalendarToToday() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = year + '.' + month + '.' + d;
                filterAdminUsers();
            }
            closeCalendarModal();
        }

        function clearCalendarDate() {
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = '';
                filterAdminUsers();
                if (typeof checkRoomDetailChanges === 'function') {
                    checkRoomDetailChanges();
                }
            }
            closeCalendarModal();
        }

        let decadePageStart = 1920;
        let selectedDecadeStart = 2020;

        function changeCalendarRange(offset) {
            if (currentCalMode === 'date') {
                currentCalDate.setMonth(currentCalDate.getMonth() + offset);
            } else if (currentCalMode === 'month') {
                currentCalDate.setFullYear(currentCalDate.getFullYear() + offset);
            } else if (currentCalMode === 'year') {
                selectedDecadeStart += (offset * 12);
            } else if (currentCalMode === 'decade') {
                decadePageStart += (offset * 120);
            }
            renderCalendar();
        }

        let currentCalMode = 'date';

        function switchCalendarMode(mode) {
            if (mode === 'decade') {
                decadePageStart = Math.floor(currentCalDate.getFullYear() / 10) * 10 - 50;
            } else if (mode === 'year') {
                selectedDecadeStart = Math.floor(currentCalDate.getFullYear() / 10) * 10;
            }
            currentCalMode = mode;
            renderCalendar();
        }

        function setCalendarDecade(startYear) {
            selectedDecadeStart = startYear;
            currentCalMode = 'year';
            renderCalendar();
        }

        function setCalendarYearMonth(val, type) {
            if (type === 'year') {
                currentCalDate.setFullYear(parseInt(val));
                currentCalMode = 'month';
            } else if (type === 'month') {
                currentCalDate.setMonth(parseInt(val));
                currentCalMode = 'date';
            }
            renderCalendar();
        }

        function renderCalendar() {
            const year = currentCalDate.getFullYear();
            const month = currentCalDate.getMonth();
            
            let headerHtml = `
                <div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var(--primary-deep-navy); font-size:15px;" onmouseover="this.style.background='#edf2f7'" onmouseout="this.style.background='transparent'" onclick="switchCalendarMode('decade')">${year}년</div>
                <div style="cursor:pointer; padding:2px 5px; border-radius:4px; font-weight:bold; color:var(--primary-deep-navy); font-size:15px;" onmouseover="this.style.background='#edf2f7'" onmouseout="this.style.background='transparent'" onclick="switchCalendarMode('month')">${month + 1}월</div>
            `;
            document.getElementById('calendar-month-year').innerHTML = headerHtml;

            const gridEl = document.getElementById('calendar-grid');
            const daysHeader = document.getElementById('calendar-days-header');
            
            let gridHtml = '';

            if (currentCalMode === 'decade') {
                daysHeader.style.display = 'none';
                gridEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                for (let d = decadePageStart; d < decadePageStart + 120; d += 10) {
                    gridHtml += `
                        <div style="padding: 15px 5px; cursor: pointer; border-radius: 4px; transition: 0.2s;" 
                             onmouseover="this.style.background='#edf2f7'" 
                             onmouseout="this.style.background='transparent'" 
                             onclick="setCalendarDecade(${d})">${d}년대</div>
                    `;
                }
            } else if (currentCalMode === 'year') {
                daysHeader.style.display = 'none';
                gridEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                for (let y = selectedDecadeStart; y < selectedDecadeStart + 12; y++) {
                    gridHtml += `
                        <div style="padding: 15px 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; ${y === year ? 'background:var(--primary-light-blue);color:white;' : ''}" 
                             onmouseover="if(${y !== year}) this.style.background='#edf2f7'" 
                             onmouseout="if(${y !== year}) this.style.background='transparent'" 
                             onclick="setCalendarYearMonth(${y}, 'year')">${y}</div>
                    `;
                }
            } else if (currentCalMode === 'month') {
                daysHeader.style.display = 'none';
                gridEl.style.gridTemplateColumns = 'repeat(4, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                for (let m = 0; m < 12; m++) {
                    gridHtml += `
                        <div style="padding: 10px 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; ${m === month ? 'background:var(--primary-light-blue);color:white;' : ''}" 
                             onmouseover="if(${m !== month}) this.style.background='#edf2f7'" 
                             onmouseout="if(${m !== month}) this.style.background='transparent'" 
                             onclick="setCalendarYearMonth(${m}, 'month')">${m + 1}월</div>
                    `;
                }
            } else {
                daysHeader.style.display = 'grid';
                gridEl.style.gridTemplateColumns = 'repeat(7, 1fr)';
                gridEl.style.maxHeight = 'none';
                gridEl.style.overflowY = 'visible';
                const firstDay = new Date(year, month, 1).getDay();
                const lastDate = new Date(year, month + 1, 0).getDate();

                for (let i = 0; i < firstDay; i++) {
                    gridHtml += '<div></div>';
                }
                const realToday = new Date();
                const isCurrentMonth = (realToday.getFullYear() === year && realToday.getMonth() === month);
                const todayDate = realToday.getDate();

                for (let d = 1; d <= lastDate; d++) {
                    const dateStr = year + '.' + String(month + 1).padStart(2, '0') + '.' + String(d).padStart(2, '0');
                    const isToday = isCurrentMonth && d === todayDate;
                    const isSelected = (dateStr === selectedCalDateStr);
                    
                    const dayOfWeek = new Date(year, month, d).getDay();
                    let textColor = '#2d3748';
                    if (dayOfWeek === 0) textColor = '#e53e3e';
                    else if (dayOfWeek === 6) textColor = '#3182ce';

                    let styleStr = 'padding: 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: ' + textColor + ';';
                    if (isSelected) {
                        styleStr += ' background: var(--primary-light-blue); color: white; font-weight: bold; border: 1px solid var(--primary-light-blue);';
                    } else if (isToday) {
                        styleStr += ' border: 1px solid var(--primary-light-blue); color: var(--primary-light-blue); font-weight: bold;';
                    } else {
                        styleStr += ' border: 1px solid transparent;';
                    }

                    gridHtml += `
                        <div style="${styleStr}" 
                             onmouseover="if(!${isSelected}) this.style.background='#edf2f7'" 
                             onmouseout="if(!${isSelected}) this.style.background='transparent'" 
                             onclick="selectCalendarDate('${dateStr}')">${d}</div>
                    `;
                }
            }
            gridEl.innerHTML = gridHtml;
        }

        function selectCalendarDate(dateStr) {
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = dateStr;
                filterAdminUsers();
                if (typeof checkRoomDetailChanges === 'function') {
                    checkRoomDetailChanges();
                }
            }
            closeCalendarModal();
        }

// RESTORED FUNCTION: toggleAdminUsersMenu
function toggleAdminUsersMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-users-dropdown').classList.toggle('hidden');
        }

// RESTORED FUNCTION: toggleAdminSettingsMenu
function toggleAdminSettingsMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-settings-dropdown').classList.toggle('hidden');
        }

// RESTORED FUNCTION: toggleAdminMenu
function toggleAdminMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-dropdown').classList.toggle('hidden');
        }

// RESTORED FUNCTION: toggleAdminUserEditMenu
function toggleAdminUserEditMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-user-edit-dropdown').classList.toggle('hidden');
        }

// RESTORED FUNCTION: openUserEditPage
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

// RESTORED FUNCTION: saveAdminUserEditData
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

// RESTORED FUNCTION: loadAdminDashboardStats
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

// RESTORED FUNCTION: saveGeminiKey
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

// RESTORED FUNCTION: loadGeminiKeyIntoAdmin
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

// RESTORED FUNCTION: getGeminiApiKey
async function getGeminiApiKey() {
            if (!supabaseClient) return null;
            try {
                const { data, error } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY');
                if (error) {
                    console.error('system_settings 조회 에러:', error);
                }
                return (data && data.length > 0) ? data[0].key_value : null;
            } catch(e) {
                console.error('getGeminiApiKey 예외 발생:', e);
                return null;
            }
        }

// RESTORED FUNCTION: executeGeminiExtraction
async function executeGeminiExtraction() {
            const previewImage = document.getElementById('ocr-preview-img');
            if (!previewImage || !previewImage.src || previewImage.src === '') {
                showModalAlert('분석할 계약서 이미지가 없습니다.');
                return;
            }
            
            document.getElementById('loading-view').querySelector('h3').innerText = 'AI 모델을 통해 16개 항목을 추출 중입니다...';
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
                    'ocr_room_number', 'ocr_tenant_name', 'ocr_tenant_phone', 'ocr_area', 'ocr_deposit', 'ocr_monthly_rent', 'ocr_maintenance_fee', 'ocr_cleaning_fee',
                    'ocr_contract_date', 'ocr_lease_start_date', 'ocr_lease_end_date', 'ocr_broker_agency_name', 'ocr_broker_representative', 'ocr_broker_address',
                    'ocr_broker_phone', 'ocr_broker_registration_no'
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

// RESTORED FUNCTION: submitExtractedContract
async function submitExtractedContract(event) {
            event.preventDefault();
            if (!supabaseClient) {
                showView('owner-app');
                showModalAlert('AI 계약서 추출 정보가 성공적으로 저장되었습니다! (로컬 시뮬레이션 모드)');
                if (typeof renderOwnerBuildings === 'function') {
                    renderOwnerBuildings();
                }
                return;
            }
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

            // Get all input and select values
            const inputs = document.querySelectorAll('#ocr-fields-container input, #ocr-fields-container select');
            const contractData = {};
            inputs.forEach(input => {
                contractData[input.id] = input.value;
            });

            document.getElementById('loading-view').querySelector('h3').innerText = '데이터베이스에 저장 중입니다...';
            document.getElementById('loading-view').classList.remove('hidden');

            try {
                // 중개인 정보 저장 정책 동기화 (brokers 테이블 삽입 및 broker_id 링크 연동)
                let brokerId = null;
                const brokerRegNumber = contractData['ocr_broker_registration_no'] ? contractData['ocr_broker_registration_no'].trim() : '';
                const brokerAgency = contractData['ocr_broker_agency_name'] || '';
                const brokerRep = contractData['ocr_broker_representative'] || '';
                const brokerAddress = contractData['ocr_broker_address'] || '';
                const brokerPhone = contractData['ocr_broker_phone'] || '';

                if (brokerRegNumber) {
                    try {
                        const { data: existingBrokers, error: selectErr } = await supabaseClient
                            .from('brokers')
                            .select('id')
                            .eq('registration_no', brokerRegNumber);
                        
                        if (!selectErr && existingBrokers && existingBrokers.length > 0) {
                            brokerId = existingBrokers[0].id;
                            await supabaseClient.from('brokers').update({
                                agency_name: brokerAgency,
                                representative_name: brokerRep,
                                address: brokerAddress,
                                phone: brokerPhone
                            }).eq('id', brokerId);
                        } else {
                            const { data: newBroker, error: insertErr } = await supabaseClient
                                .from('brokers')
                                .insert([{
                                    agency_name: brokerAgency || '공인중개사사무소',
                                    representative_name: brokerRep,
                                    registration_no: brokerRegNumber,
                                    address: brokerAddress,
                                    phone: brokerPhone
                                }])
                                .select();
                            
                            if (!insertErr && newBroker && newBroker.length > 0) {
                                brokerId = newBroker[0].id;
                            }
                        }
                    } catch (bErr) {
                        console.error('중개소 처리 예외:', bErr);
                    }
                }

                // 계약서 이미지(Base64) 연동
                const previewImg = document.getElementById('ocr-preview-img');
                const newContractImg = (previewImg && previewImg.src && previewImg.src.startsWith('data:image/')) ? previewImg.src : null;

                // Insert Contract Payload 동기화
                const insertPayload = {
                    building_id: buildingId,
                    owner_id: session.user.id,
                    status: 'matched',
                    room_number: contractData['ocr_room_number'],
                    room_count: contractData['ocr_room_type'] === '투룸' ? 2 : (contractData['ocr_room_type'] === '쓰리룸' ? 3 : 1),
                    room_type: contractData['ocr_room_type'] || '원룸',
                    room_status: contractData['ocr_room_status'] || '입주중',
                    floor_type: contractData['ocr_floor_type'] || '지상',
                    floor_no: contractData['ocr_floor_no'] || '',
                    bathroom_count: 1,
                    living_room_count: 0,
                    veranda_count: 1,
                    area: contractData['ocr_area'] ? parseFloat(contractData['ocr_area']) : null,
                    deposit: contractData['ocr_deposit'] ? parseInt(contractData['ocr_deposit']) : 0,
                    monthly_rent: contractData['ocr_monthly_rent'] ? parseInt(contractData['ocr_monthly_rent']) : 0,
                    maintenance_fee: contractData['ocr_maintenance_fee'] ? parseInt(contractData['ocr_maintenance_fee']) : 0,
                    cleaning_fee: contractData['ocr_cleaning_fee'] ? parseInt(contractData['ocr_cleaning_fee']) : 0,
                    contract_date: contractData['ocr_contract_date'] ? contractData['ocr_contract_date'].replace(/-/g, '.') : null,
                    lease_start_date: contractData['ocr_lease_start_date'] ? contractData['ocr_lease_start_date'].replace(/-/g, '.') : null,
                    lease_end_date: contractData['ocr_lease_end_date'] ? contractData['ocr_lease_end_date'].replace(/-/g, '.') : null,
                    broker_id: brokerId
                };
                if (newContractImg) {
                    insertPayload.contract_image_url = newContractImg;
                }

                const { error: cError } = await supabaseClient
                    .from('contracts')
                    .insert([insertPayload]);

                if (cError) {
                    throw new Error('계약서 세부정보 저장 실패: ' + cError.message);
                }

                // 로컬 캐시 호실 정보 동기화
                if (ownerBuildings) {
                    const localBIdx = ownerBuildings.findIndex(b => b.id === buildingId);
                    if (localBIdx !== -1) {
                        const roomNum = contractData['ocr_room_number'];
                        const roomType = contractData['ocr_room_type'] || '원룸';
                        const floorType = contractData['ocr_floor_type'] || '지상';
                        const floorNo = contractData['ocr_floor_no'] || '';
                        const roomStatus = contractData['ocr_room_status'] || '입주중';
                        if (roomNum) {
                            if (!ownerBuildings[localBIdx].rooms) ownerBuildings[localBIdx].rooms = [];
                            const existsIdx = ownerBuildings[localBIdx].rooms.findIndex(r => r.roomNumber === roomNum);
                            if (existsIdx !== -1) {
                                ownerBuildings[localBIdx].rooms[existsIdx].type = roomType;
                                ownerBuildings[localBIdx].rooms[existsIdx].floor_type = floorType;
                                ownerBuildings[localBIdx].rooms[existsIdx].floor_no = floorNo;
                                ownerBuildings[localBIdx].rooms[existsIdx].room_status = roomStatus;
                            } else {
                                ownerBuildings[localBIdx].rooms.push({ 
                                    roomNumber: roomNum, 
                                    type: roomType,
                                    floor_type: floorType,
                                    floor_no: floorNo,
                                    room_status: roomStatus
                                });
                            }
                        }
                    }
                }

                document.getElementById('loading-view').classList.add('hidden');
                showView('owner-app');
                showModalAlert('AI 계약서 추출 정보가 성공적으로 저장되었습니다!');
                
                // Refresh list if possible
                if (typeof loadActiveTenants === 'function') {
                    await loadActiveTenants();
                } else if (typeof renderOwnerBuildings === 'function') {
                    renderOwnerBuildings();
                }

            } catch (err) {
                document.getElementById('loading-view').classList.add('hidden');
                showModalAlert('데이터베이스 저장 중 오류가 발생했습니다: ' + err.message);
            }
        }

// RESTORED FUNCTION: selectDateFromCalendar
function selectDateFromCalendar(dateStr) {
            if (calendarTargetId) {
                document.getElementById(calendarTargetId).value = dateStr;
                filterAdminUsers();
            }
            closeCalendarModal();
        }

// RESTORED FUNCTION: loadOcrImage
function loadOcrImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('ocr-preview-img');
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 돋보기 및 선택 AI 추출 관련 전역 상태
let ocrMode = 'magnifier';
let isDragging = false;
let startX = 0, startY = 0;
let lastExtractedText = '';

function setOcrMode(mode) {
    ocrMode = mode;
    const btnMag = document.getElementById('btn-mode-magnifier');
    const btnSel = document.getElementById('btn-mode-select');
    const lens = document.getElementById('magnifier-lens');
    const selectionBox = document.getElementById('selection-box');
    
    if (lens) lens.style.display = 'none';
    if (selectionBox) selectionBox.style.display = 'none';
    closeExtractionPopup();
    
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

function initOcrInteractions() {
    const wrapper = document.getElementById('ocr-image-wrapper');
    const img = document.getElementById('ocr-preview-img');
    const lens = document.getElementById('magnifier-lens');
    const selectionBox = document.getElementById('selection-box');
    
    if (!wrapper || !img) return;
    
    wrapper.addEventListener('mousemove', function(e) {
        const rect = img.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const wrapX = e.clientX - wrapperRect.left;
        const wrapY = e.clientY - wrapperRect.top;
        
        if (ocrMode === 'magnifier') {
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
        } else if (ocrMode === 'select' && isDragging) {
            const currentX = wrapX;
            const currentY = wrapY;
            
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const left = Math.min(currentX, startX);
            const top = Math.min(currentY, startY);
            
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
        if (ocrMode !== 'select') return;
        const wrapperRect = wrapper.getBoundingClientRect();
        
        isDragging = true;
        startX = e.clientX - wrapperRect.left;
        startY = e.clientY - wrapperRect.top;
        
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.display = 'block';
        
        closeExtractionPopup();
    });
    
    window.addEventListener('mouseup', function(e) {
        if (ocrMode !== 'select' || !isDragging) return;
        isDragging = false;
        
        const rect = img.getBoundingClientRect();
        const boxRect = selectionBox.getBoundingClientRect();
        
        const cropX = boxRect.left - rect.left;
        const cropY = boxRect.top - rect.top;
        const cropW = boxRect.width;
        const cropH = boxRect.height;
        
        if (cropW > 10 && cropH > 10) {
            triggerSelectiveOcr(cropX, cropY, cropW, cropH, e.clientX, e.clientY);
        } else {
            selectionBox.style.display = 'none';
        }
    });
}

async function triggerSelectiveOcr(x, y, w, h, screenX, screenY) {
    const img = document.getElementById('ocr-preview-img');
    const popup = document.getElementById('extraction-popup');
    const textPreview = document.getElementById('extracted-text-preview');
    
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
                lastExtractedText = result.text;
                textPreview.innerText = result.text;
            } else {
                lastExtractedText = '';
                textPreview.innerText = '텍스트 추출 실패';
            }
        } catch (err) {
            textPreview.innerText = '에러: ' + err.message;
        }
    };
    tempImg.src = img.src;
}

function applySelectedText(fieldId) {
    const el = document.getElementById(fieldId);
    if (el && lastExtractedText) {
        let text = lastExtractedText;
        if (fieldId === 'ocr_room_number') {
            text = text.replace(/[^0-9]/g, '');
        } else if (fieldId === 'ocr_area') {
            text = text.replace(/[m㎡²\s]/gi, '');
        }
        el.value = text;
        
        const originalBg = el.style.backgroundColor;
        el.style.transition = 'background-color 0.5s';
        el.style.backgroundColor = '#e6fffa';
        setTimeout(() => {
            el.style.backgroundColor = originalBg;
        }, 1000);
        
        closeExtractionPopup();
        
        const selectionBox = document.getElementById('selection-box');
        if (selectionBox) selectionBox.style.display = 'none';
    }
}

function closeExtractionPopup() {
    const popup = document.getElementById('extraction-popup');
    if (popup) popup.style.display = 'none';
}

function toggleOcrOwnerMenu(e) {
    e.stopPropagation();
    document.getElementById('ocr-owner-dropdown').classList.toggle('hidden');
}
