const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Replace the navbar of admin-settings-app
const adminSettingsAppStart = '<div id="admin-settings-app" class="hidden">';
const adminSettingsAppRegex = /<div id="admin-settings-app" class="hidden">\s*<nav class="navbar" style="background: #2d3748;">[\s\S]*?<\/nav>/;
const newSettingsNav = `<div id="admin-settings-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-app')">
                <i class="fa-solid fa-user-shield"></i>
                <span style="margin-left: 5px;">모두의 방 <span style="font-size:12px; color:#a0aec0;">[관리자 전용 - 시스템 설정]</span></span>
            </div>
            <div class="user-profile" style="position: relative;">
                  <button id="admin-settings-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminSettingsMenu(event)">
                      관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                  </button>
                  <div id="admin-settings-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">메인 페이지</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>
              </div>
        </nav>`;

content = content.replace(adminSettingsAppRegex, newSettingsNav);

// 2. Replace the dropdown of admin-app to match the 4 items
const adminDropdownRegex = /<div id="admin-dropdown" class="dropdown-menu hidden"[\s\S]*?<\/div>/;
const newAdminDropdown = `<div id="admin-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">관리자 대시보드</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">메인 페이지</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>`;
content = content.replace(adminDropdownRegex, newAdminDropdown);

// 3. Add toggleAdminSettingsMenu function
const toggleAdminSettingsMenuFunc = `        function toggleAdminSettingsMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-settings-dropdown').classList.toggle('hidden');
        }

        function toggleAdminMenu(e) {`;
content = content.replace(`        function toggleAdminMenu(e) {`, toggleAdminSettingsMenuFunc);

// 4. Add click-outside logic
const clickOutsideLogic = `
            const adminSettingsDropdown = document.getElementById('admin-settings-dropdown');
            const adminSettingsToggleBtn = document.getElementById('admin-settings-display-name');
            if (adminSettingsDropdown && adminSettingsToggleBtn && !adminSettingsToggleBtn.contains(e.target) && !adminSettingsDropdown.contains(e.target)) {
                adminSettingsDropdown.classList.add('hidden');
            }

            const adminDropdown`;
content = content.replace(`            const adminDropdown`, clickOutsideLogic);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully updated navbars');
