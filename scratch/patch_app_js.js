const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../public/js/app.js');
let content = fs.readFileSync(appPath, 'utf8');

// Replace standard newlines
content = content.replace(/\r\n/g, '\n');

// Find the start of DOMContentLoaded and end of DOMContentLoaded
const startStr = "document.addEventListener('DOMContentLoaded', () => {";
const startIdx = content.indexOf(startStr);

if (startIdx !== -1) {
    // Find the matching closing brace for DOMContentLoaded (which ends around line 115)
    // We can count braces starting from startIdx
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
            // Find the end of the event listener statement, usually "});"
            const nextClose = content.indexOf(');', i);
            if (nextClose !== -1 && nextClose - i < 5) {
                endIdx = nextClose + 2;
            } else {
                endIdx = i + 1;
            }
            break;
        }
    }
    
    if (endIdx !== -1) {
        const before = content.substring(0, startIdx);
        const after = content.substring(endIdx);
        
        const newDomContent = `document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const initDateStr = today.getFullYear() + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + String(today.getDate()).padStart(2, '0');
            
            const prevMonth = new Date(today);
            prevMonth.setMonth(prevMonth.getMonth() - 1);
            const prevMonthStr = prevMonth.getFullYear() + '.' + String(prevMonth.getMonth() + 1).padStart(2, '0') + '.' + String(prevMonth.getDate()).padStart(2, '0');

            // 뷰 템플릿 목록
            const views = [
                'login.html', 'signup.html', 'main.html', 'owner.html', 
                'tenant.html', 'admin.html', 'map.html', 'story-detail.html', 
                'auth.html', 'add-building.html', 'building-management.html', 
                'ocr.html', 'room.html'
            ];

            // 모든 뷰 템플릿 로딩 후 초기화 진행
            Promise.all(
                views.map(view => 
                    fetch('/views/' + view)
                        .then(res => {
                            if (!res.ok) throw new Error(view + ' load failed');
                            return res.text();
                        })
                )
            ).then(htmls => {
                const container = document.getElementById('app-view-container');
                if (container) {
                    container.innerHTML = htmls.join('\\n');
                }

                const startInput = document.getElementById('admin-filter-start');
                const endInput = document.getElementById('admin-filter-end');
                if (startInput) startInput.value = prevMonthStr;
                if (endInput) endInput.value = initDateStr;

                const todayDisplay = document.getElementById('calendar-today-display');
                if (todayDisplay) {
                    todayDisplay.innerText = '오늘: ' + initDateStr;
                }

                return fetch('/api/config/supabase');
            })
            .then(res => {
                if (res) return res.json();
            })
            .then(async config => {
                if (!config) return;
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
                if (document.getElementById('loading-view')) {
                    document.getElementById('loading-view').classList.add('hidden');
                }
                showView('login');
            })
            .catch(err => {
                console.error('설정을 불러오는 데 실패했습니다.', err);
                if (document.getElementById('loading-view')) {
                    document.getElementById('loading-view').classList.add('hidden');
                }
                showView('login');
            });
        });`;
        
        fs.writeFileSync(appPath, before + newDomContent + after, 'utf8');
        console.log('Successfully patched app.js DOMContentLoaded listener!');
    } else {
        console.error('Failed to locate DOMContentLoaded in app.js');
    }
} else {
    console.error('Failed to locate DOMContentLoaded start in app.js');
}
