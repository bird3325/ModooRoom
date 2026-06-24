const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const startIndex = content.indexOf('<div id="admin-app" class="hidden">');
const endIndex = content.indexOf('<div id="map-app" class="hidden">');

let adminAppSection = content.substring(startIndex, endIndex);

// Replace dropdown to add 회원 관리
const newDropdown = `<a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>`;

adminAppSection = adminAppSection.replace(/<a href="#" class="dropdown-item" onclick="showView\('admin-app'\); document\.getElementById\('admin-dropdown'\)\.classList\.add\('hidden'\);" style="color: #4a5568;">관리자 대시보드<\/a>\s*<hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\s*<a href="#" class="dropdown-item" onclick="showView\('admin-settings-app'\); document\.getElementById\('admin-dropdown'\)\.classList\.add\('hidden'\);" style="color: #4a5568;">시스템 설정<\/a>\s*<hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\s*<a href="#" class="dropdown-item" onclick="logout\(\); document\.getElementById\('admin-dropdown'\)\.classList\.add\('hidden'\);" style="color: #e53e3e;">로그아웃<\/a>/, newDropdown);

// Extract the card content safely
const cardStartStr = '<div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>';
const genericStartStr = '<div class="card">';
const genericStartIdx = adminAppSection.indexOf(genericStartStr);

let innerContent = "";
if (genericStartIdx !== -1) {
    const cardContentRegex = /<div class="card">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*$/;
    const match = adminAppSection.match(cardContentRegex);
    if (match) {
        innerContent = match[1];

        const placeholderCard = `
                <div class="card-title"><i class="fa-solid fa-chart-pie"></i> 관리자 대시보드</div>
                <div style="padding: 40px 20px; text-align: center; color: #718096;">
                    <i class="fa-solid fa-layer-group" style="font-size: 48px; color: #cbd5e0; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: #4a5568;">환영합니다, 관리자님!</h3>
                    <p style="margin: 0; line-height: 1.6;">우측 상단의 메뉴를 클릭하여 <strong>회원 관리</strong> 또는 <strong>시스템 설정</strong> 메뉴로 이동하실 수 있습니다.</p>
                </div>
`;
        adminAppSection = adminAppSection.replace(innerContent, placeholderCard);
    }
}

// Build admin-users-app
const adminUsersApp = `
    <!-- 회원 관리 페이지 -->
    <div id="admin-users-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white;">
                <i class="fa-solid fa-user-shield"></i>
                <span style="margin-left: 5px;">모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용 - 회원 관리]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                  <button id="admin-users-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminUsersMenu(event)">
                      관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                  </button>
                  <div id="admin-users-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-users-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>
              </div>
        </nav>
        <div class="main-container">
            <div class="card">
${innerContent}
            </div>
        </div>
    </div>
`;

content = content.replace(content.substring(startIndex, endIndex), adminAppSection + adminUsersApp);

// Update settings dropdown
const oldSettingsDropdownRegex = /<a href="#" class="dropdown-item" onclick="showView\('admin-app'\); document\.getElementById\('admin-settings-dropdown'\)\.classList\.add\('hidden'\);" style="color: #4a5568;">관리자 대시보드<\/a>\s*<hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\s*<a href="#" class="dropdown-item" onclick="showView\('admin-settings-app'\); document\.getElementById\('admin-settings-dropdown'\)\.classList\.add\('hidden'\);" style="color: #4a5568;">시스템 설정<\/a>\s*<hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\s*<a href="#" class="dropdown-item" onclick="logout\(\); document\.getElementById\('admin-settings-dropdown'\)\.classList\.add\('hidden'\);" style="color: #e53e3e;">로그아웃<\/a>/;

const newSettingsDropdown = `<a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>`;

content = content.replace(oldSettingsDropdownRegex, newSettingsDropdown);

// Add toggle function and click outside
const newToggle = `        function toggleAdminUsersMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-users-dropdown').classList.toggle('hidden');
        }

        function toggleAdminSettingsMenu`;
content = content.replace(`        function toggleAdminSettingsMenu`, newToggle);

const newClickOutside = `
            const adminUsersDropdown = document.getElementById('admin-users-dropdown');
            const adminUsersToggleBtn = document.getElementById('admin-users-display-name');
            if (adminUsersDropdown && adminUsersToggleBtn && !adminUsersToggleBtn.contains(e.target) && !adminUsersDropdown.contains(e.target)) {
                adminUsersDropdown.classList.add('hidden');
            }

            const adminSettingsDropdown`;
content = content.replace(`            const adminSettingsDropdown`, newClickOutside);

// Update showView properly
content = content.replace(`if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');`, 
`if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');
            if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');`);

const badShowViewBlock = `} else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {`;

const goodShowViewBlock = `} else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');
            } else if (viewName === 'admin-users-app') {
                document.getElementById('admin-users-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {`;

content = content.replace(badShowViewBlock, goodShowViewBlock);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully completed new safe users page setup');
