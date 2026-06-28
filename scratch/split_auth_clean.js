const fs = require('fs');

const markUserVerified = `function markUserVerified() {
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

const saveMyInfo = `async function saveMyInfo() {
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

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            showModalAlert('로그인이 필요합니다.');
            return;
        }

        const { error } = await supabaseClient.from('profiles').update({ name, phone }).eq('id', session.user.id);
        if (error) {
            showModalAlert('개인정보 수정 실패: ' + error.message);
            return;
        }

        if (pwd) {
            const { error: pwdError } = await supabaseClient.auth.updateUser({ password: pwd });
            if (pwdError) {
                showModalAlert('비밀번호 수정 실패: ' + pwdError.message);
                return;
            }
        }

        showModalAlert('개인정보가 성공적으로 수정되었습니다.');
        showView('auth-page');
    } catch(e) {
        console.error(e);
        showModalAlert('오류가 발생했습니다.');
    }
}`;

const renderAuthPage = `function renderAuthPage(profile, isAuth, buildings) {
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
                        return \`
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #edf2f7; text-align: left; margin-bottom: 10px;">
                            <p style="font-size: 13px; color: #4a5568; margin: 0 0 5px 0;"><strong>등록 건물명:</strong> \${b.name || '-'} \${verifiedBadge}</p>
                            <p style="font-size: 13px; color: #4a5568; margin: 0;"><strong>등록 주소:</strong> \${b.address || '-'}</p>
                        </div>
                        \`;
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
}`;

const handleLogin = `async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';

    if (!supabaseClient) {
        const namePrefix = email.split('@')[0].toUpperCase();
        if (email.toLowerCase().includes('tenant')) {
            globalUserRole = 'tenant';
        } else if (email.toLowerCase().includes('owner')) {
            globalUserRole = 'owner';
        } else {
            globalUserRole = 'owner'; 
        }
        if (document.getElementById('main-display-name')) {
            document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        if (document.getElementById('owner-display-name')) {
            document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        if (document.getElementById('tenant-display-name')) {
            document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        if (document.getElementById('auth-display-name')) {
            document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        isAuthenticated = false;
        showView('main-app');
        return;
    }

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
        
        if (document.getElementById('main-display-name')) {
            document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        if (document.getElementById('owner-display-name')) {
            document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        if (document.getElementById('tenant-display-name')) {
            document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        if (document.getElementById('auth-display-name')) {
            document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
        }
        
        isAuthenticated = false; // 기본값
        if (profile.is_verified) {
            isAuthenticated = true;
        }

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
}`;

const handleSignup = `async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;
    const roleEl = document.querySelector('input[name="signup-role"]:checked');
    const role = roleEl ? roleEl.value : 'owner';

    if (!supabaseClient) {
        globalUserRole = role;
        showModalAlert(name + '님, 가입이 완료되었습니다. 로그인해주세요.');
        showView('login');
        return;
    }

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
}`;

const handleLogout = `function handleLogout() {
    isAuthenticated = false;
    showView('login');
}`;

const authenticateRole = `function authenticateRole(role) {
    markUserVerified(); // 인증 완료 상태로 전환
    if (role === 'owner') {
        showModalAlert('임대인 인증이 완료되었습니다.');
        showView('owner-app');
    } else if (role === 'tenant') {
        showModalAlert('임차인 인증이 완료되었습니다.');
        showView('tenant-app');
    }
}`;

const goToDashboard = `function goToDashboard() {
    if (isAuthenticated) {
        showView(globalUserRole === 'owner' ? 'owner-app' : 'tenant-app');
    } else {
        showModalAlert('2차 인증(계약서 인증)을 완료해야 대시보드를 이용할 수 있습니다. 마이페이지에서 2차 인증을 진행해주세요.');
    }
}`;

const authPath = 'c:/Users/bird3/100 shop/ModooRoom/public/js/views/authController.js';
fs.writeFileSync(authPath, [
    markUserVerified,
    saveMyInfo,
    renderAuthPage,
    handleLogin,
    handleSignup,
    handleLogout,
    authenticateRole,
    goToDashboard
].join('\n\n'), 'utf8');

console.log('Regenerated static clean authController.js successfully!');
