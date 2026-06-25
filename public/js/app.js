// Supabase 동적 초기화
        let supabaseClient = null;

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
                                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                if (document.getElementById('auth-display-name')) {
                                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
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
            document.getElementById('owner-display-name').innerHTML = name + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
            document.getElementById('tenant-display-name').innerHTML = name + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';

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

        function toggleUserMenu(e) {
            e.stopPropagation();
            document.getElementById('user-dropdown').classList.toggle('hidden');
            const subMenu = document.getElementById('auth-sub-menu');
            if(subMenu) subMenu.classList.add('hidden');
        }

        function toggleOwnerMenu(e) {
            e.stopPropagation();
            document.getElementById('owner-dropdown').classList.toggle('hidden');
        }

        function toggleTenantMenu(e) {
            e.stopPropagation();
            document.getElementById('tenant-dropdown').classList.toggle('hidden');
        }

        function toggleAuthMenu(e) {
            e.stopPropagation();
            document.getElementById('auth-dropdown').classList.toggle('hidden');
        }

        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');
            if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');
            if(document.getElementById('map-app')) document.getElementById('map-app').classList.add('hidden');
            if(document.getElementById('story-detail-app')) document.getElementById('story-detail-app').classList.add('hidden');
            if(document.getElementById('auth-page')) document.getElementById('auth-page').classList.add('hidden');
            if(document.getElementById('add-building-view')) document.getElementById('add-building-view').classList.add('hidden');
            if(document.getElementById('building-management-page')) document.getElementById('building-management-page').classList.add('hidden');

            if (viewName === 'login') {
                document.getElementById('login-view').classList.remove('hidden');
            } else if (viewName === 'signup') {
                document.getElementById('signup-view').classList.remove('hidden');
            } else if (viewName === 'main-app') {
                document.getElementById('main-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {
                if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.remove('hidden');
            } else if (viewName === 'map-app') {
                document.getElementById('map-app').classList.remove('hidden');
            } else if (viewName === 'story-detail-app') {
                document.getElementById('story-detail-app').classList.remove('hidden');
            } else if (viewName === 'auth-page') {
                document.getElementById('auth-page').classList.remove('hidden');
                // 마이페이지 진입 시 DB 연동하여 최신 상태 확인
                if (supabaseClient) {
                    supabaseClient.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                            supabaseClient.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
                                if (profile) {
                                    globalUserRole = profile.role;
                                    supabaseClient.from('buildings').select('*').eq('owner_id', session.user.id).eq('is_verified', true).then(({ data: bData }) => {
                                        const isReallyAuth = profile.is_verified || (bData && bData.length > 0);
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
                document.getElementById('owner-app').classList.remove('hidden');
                if (typeof isAuthenticated !== 'undefined' && isAuthenticated) {
                    renderOwnerBuildings();
                }
                loadInventory();
                checkPendingInvites();
                renderOwnerBuildings();
            } else if (viewName === 'add-building-view') {
                document.getElementById('add-building-view').classList.remove('hidden');
            } else if (viewName === 'tenant-app') {
                document.getElementById('tenant-app').classList.remove('hidden');
                checkTenantMatchStatus();
            } else if (viewName === 'building-management-page') {
                document.getElementById('building-management-page').classList.remove('hidden');
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
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                if (document.getElementById('auth-display-name')) {
                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
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
                document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                if (document.getElementById('auth-display-name')) {
                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
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
                                    tenantAddMsg = '
[임차인: ' + result.extractedTenant.name + '(' + result.extractedTenant.room + ') 자동 등록됨]';
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
                            showModalAlert('계약서 인증이 성공적으로 완료되었습니다.
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
                        showModalAlert('OCR 분석 중 오류가 발생했습니다.');
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
                
                // 매칭된 임차인 가져오기 (이 건물의 주소와 일치하는 임차인)
                const matchedTenantsForBuilding = (typeof activeTenantsData !== 'undefined' ? activeTenantsData : []).filter(function(m) { return m.address === b.address; });
                
                let allRoomsMap = {};
                if (b.rooms && b.rooms.length > 0) {
                    b.rooms.forEach(function(r) {
                        allRoomsMap[r.roomNumber] = r.type;
                    });
                }
                matchedTenantsForBuilding.forEach(function(m) {
                    if (!allRoomsMap[m.room]) {
                        allRoomsMap[m.room] = '미지정';
                    }
                });
                
                const allRoomKeys = Object.keys(allRoomsMap);
                var roomsHtml = '';
                if (allRoomKeys.length > 0) {
                    roomsHtml = '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #edf2f7; font-size: 12px; color: #4a5568;">' +
                                '<strong>호실 및 임차인 현황:</strong><br>' +
                                allRoomKeys.map(function(roomNum) {
                                    const matched = matchedTenantsForBuilding.find(function(m) { return m.room === roomNum; });
                                    const badge = matched ? '<span style="color:#319795; font-weight:bold; margin-left:4px;">[' + matched.tenantName + ' 입주중]</span>' : '';
                                    const typeStr = allRoomsMap[roomNum] === '미지정' ? '' : ' (' + allRoomsMap[roomNum] + ')';
                                    return '<span style="display: inline-block; background: #f7fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; margin-right: 5px; margin-top: 5px;">' +
                                           '<i class="fa-solid fa-door-closed" style="color:#a0aec0; margin-right:3px;"></i>' + roomNum + typeStr + badge +
                                           '</span>';
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
        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('[id^="building-menu-"]') && !e.target.closest('button[onclick^="toggleBuildingMenu"]')) {
                document.querySelectorAll('[id^="building-menu-"]').forEach(el => el.classList.add('hidden'));
            }
        });

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
                        address: bAddr,
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
                        showModalAlert('DB 저장 실패: ' + error.message + '

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

        function addRoomFromPage(idx) {
            const num = document.getElementById('bm-add-room-num').value;
            const type = document.getElementById('bm-add-room-type').value;
            if (!num) return showModalAlert('호실 번호를 입력해주세요.');
            if (!ownerBuildings[idx].rooms) ownerBuildings[idx].rooms = [];
            ownerBuildings[idx].rooms.push({ roomNumber: num, type: type });
            document.getElementById('bm-add-room-num').value = '';
            renderRoomList(idx);
            renderOwnerBuildings();
        }

        function deleteRoomFromPage(bIdx, rIdx) {
            ownerBuildings[bIdx].rooms.splice(rIdx, 1);
            renderRoomList(bIdx);
            renderOwnerBuildings();
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
                            .in('status', ['matched', 'manual']);
                        
                        if (!error && data) {
                            // Map Supabase fields to frontend fields
                            activeTenantsData = data.map(d => ({
                                id: d.id,
                                tenantName: d.tenant_name || '이름 없음',
                                room: d.room_number,
                                address: d.address,
                                isManual: d.status === 'manual'
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

            const data = activeTenantsData || [];
            const section = document.getElementById('active-tenants-section');
            if (data.length === 0) {
                section.innerHTML = '';
                return;
            }
            section.innerHTML = '<div class="card" style="border-top: 4px solid #3182ce;">' +
                '<div class="card-title" style="margin-bottom: 15px;"><i class="fa-solid fa-users"></i> 현재 관리 중인 임차인</div>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">' +
                data.map(function(m) {
                    const manualBadge = m.isManual ? '<span style="font-size: 10px; background: #ed8936; color: white; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">수동등록</span>' : '';
                    return '<div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">' +
                        '<div>' +
                        '<div style="font-size: 14px; font-weight: bold; color: var(--primary-deep-navy);">' + m.tenantName + manualBadge + ' <span style="font-size: 11px; font-weight: normal; background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">' + m.room + '</span></div>' +
                        '<div style="font-size: 12px; color: #718096; margin-top: 4px;">상태: 안전 거주 중</div>' +
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
            showModalAlert('민원이 성공적으로 접수되었습니다. 임대인에게 알림이 발송됩니다.');
            document.getElementById('complaint-title').value = '';
            document.getElementById('complaint-desc').value = '';
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
                                    showModalAlert('새 건물 추가가 완료되었습니다.
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
                                
                                showModalAlert('새 건물 추가가 완료되었습니다.
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

        function runOcr() {
            const container = document.getElementById('ocr-result');
            container.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-light-blue); margin-bottom:10px;"></i><br>OCR 분석 중...</div>';
            fetch('/api/ocr')
                .then(res => res.json())
                .then(res => {
                    container.innerHTML = `
                        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary-light-blue); font-size:13px;">
                            <b>소재지:</b> ${res.data.property.address} ${res.data.property.room_number}<br>
                            <b>임차인:</b> ${res.data.tenant.name}님
                        </div>
                    `;
                });
        }

        function loadInventory() {
            fetch('/api/inventory')
                .then(res => res.json())
                .then(data => {
                    const list = document.getElementById('inventory-list');
                    list.innerHTML = data.map(item => `
                        <div class="inventory-item">
                            <div>
                                <h4>${item.name}</h4>
                                <span style="font-size:12px; color:#718096;">재고: ${item.stock}개</span>
                            </div>
                            <span class="badge ${item.is_low_stock ? 'badge-orange' : 'badge-blue'}">${item.badge_text}</span>
                        </div>
                    `).join('');
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
                showModalAlert('임대인에게 성공적으로 인증 요청을 발송했습니다!
임대인이 승인하면 대시보드에서 계약 정보가 연동됩니다.');
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
            showModalAlert(phone + ' 번호로 모두의 방 가입 초대 문자가 발송되었습니다!
임대인이 가입하시면 추후 자동으로 연동 신청이 가능합니다.');
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
                const sDate = new Date(startDate.replace(/./g, '-'));
                filtered = filtered.filter(u => new Date(u.created_at) >= sDate);
            }
            if (endDate) {
                const end = new Date(endDate.replace(/./g, '-'));
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
                    actionHtml = `<button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openAdminEditModal('${u.id}', '${u.name}', '${u.phone || ''}')">수정</button>`;
                } else if (u.role === 'owner') {
                    actionHtml = `
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568; margin-right: 4px;" onclick="toggleOwnerBuildings('${u.id}', this)"><i class="fa-solid fa-building"></i> 건물</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openAdminEditModal('${u.id}', '${u.name}', '${u.phone || ''}')">수정</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: none; border: none; color: #e53e3e; cursor: pointer; font-weight: bold;" onclick="deleteAdminUser('${u.id}')">삭제</button>
                    `;
                } else {
                    actionHtml = `
                        <button class="${verifyBtnClass}" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="toggleVerification('${u.id}', ${u.is_verified})">${verifyBtnText}</button>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px; background: white; border: 1px solid #cbd5e0; color: #4a5568;" onclick="openAdminEditModal('${u.id}', '${u.name}', '${u.phone || ''}')">수정</button>
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

                    let styleStr = padding: 5px; cursor: pointer; border-radius: 4px; transition: 0.2s; color: ;;
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
            }
            closeCalendarModal();
        }