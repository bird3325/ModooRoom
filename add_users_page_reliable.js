const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// 1. Find boundaries of admin-app
let adminAppStart = -1;
let adminAppEnd = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<div id="admin-app" class="hidden">')) {
        adminAppStart = i;
    }
    if (adminAppStart !== -1 && i > adminAppStart && lines[i].includes('<div id="map-app" class="hidden">')) {
        adminAppEnd = i - 1; // End of admin-app is just before map-app
        break;
    }
}

let adminAppLines = lines.slice(adminAppStart, adminAppEnd);

// Find the start of the card inside admin-app
let cardStart = -1;
for (let i = 0; i < adminAppLines.length; i++) {
    if (adminAppLines[i].includes('<div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>')) {
        // The <div class="card"> is a few lines before
        cardStart = i;
        while (cardStart >= 0 && !adminAppLines[cardStart].includes('<div class="card">')) {
            cardStart--;
        }
        break;
    }
}

// The card ends right before the closing divs of the main-container and admin-app
// Let's just find the last 3 closing divs in adminAppLines
let cardEnd = adminAppLines.length - 1;
let divCount = 0;
while (cardEnd >= 0 && divCount < 3) {
    if (adminAppLines[cardEnd].includes('</div>')) {
        divCount++;
    }
    if (divCount < 3) {
        cardEnd--;
    }
}

// Extract the card content
let cardLines = adminAppLines.slice(cardStart, cardEnd + 1);

// Create placeholder card
const placeholderLines = `                <div class="card-title"><i class="fa-solid fa-chart-pie"></i> 관리자 대시보드</div>
                <div style="padding: 40px 20px; text-align: center; color: #718096;">
                    <i class="fa-solid fa-layer-group" style="font-size: 48px; color: #cbd5e0; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: #4a5568;">환영합니다, 관리자님!</h3>
                    <p style="margin: 0; line-height: 1.6;">우측 상단의 메뉴를 클릭하여 <strong>회원 관리</strong> 또는 <strong>시스템 설정</strong> 메뉴로 이동하실 수 있습니다.</p>
                </div>`.split('\n');

// Replace card in adminAppLines
adminAppLines.splice(cardStart + 1, cardEnd - cardStart - 1, ...placeholderLines); // replace inner content, keeping <div class="card"> and </div>

// Add "회원 관리" to adminAppLines dropdown
let newAdminAppLines = [];
for (let i = 0; i < adminAppLines.length; i++) {
    newAdminAppLines.push(adminAppLines[i]);
    if (adminAppLines[i].includes('관리자 대시보드</a>')) {
        newAdminAppLines.push(`                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">`);
        newAdminAppLines.push(`                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>`);
    }
}
adminAppLines = newAdminAppLines;


// Build admin-users-app
const adminUsersAppStr = `    <!-- 회원 관리 페이지 -->
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
${cardLines.join('\n')}
        </div>
    </div>`;

// Replace the old adminApp lines in the main file lines array
lines.splice(adminAppStart, adminAppEnd - adminAppStart, ...adminUsersAppStr.split('\n'), ...adminAppLines);

// Also we need to add "회원 관리" to admin-settings-app dropdown
let newLines = [];
for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    if (lines[i].includes('관리자 대시보드</a>') && lines[i].includes('admin-settings-dropdown')) {
        newLines.push(`                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">`);
        newLines.push(`                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-settings-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>`);
    }

    // Add toggleAdminUsersMenu function
    if (lines[i].includes('function toggleAdminSettingsMenu(e)')) {
        newLines.splice(newLines.length - 1, 0, `        function toggleAdminUsersMenu(e) {
            e.stopPropagation();
            document.getElementById('admin-users-dropdown').classList.toggle('hidden');
        }`);
    }

    // Add click outside
    if (lines[i].includes('const adminSettingsDropdown')) {
        newLines.splice(newLines.length - 1, 0, `            const adminUsersDropdown = document.getElementById('admin-users-dropdown');
            const adminUsersToggleBtn = document.getElementById('admin-users-display-name');
            if (adminUsersDropdown && adminUsersToggleBtn && !adminUsersToggleBtn.contains(e.target) && !adminUsersDropdown.contains(e.target)) {
                adminUsersDropdown.classList.add('hidden');
            }`);
    }

    // Add showView logic
    if (lines[i].includes('if(document.getElementById(\'admin-settings-app\')) document.getElementById(\'admin-settings-app\').classList.add(\'hidden\');')) {
        newLines.push(`              if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');`);
    }
    
    if (lines[i].includes('} else if (viewName === \'admin-settings-app\') {')) {
        // Find the block closure
    }
}

// Manually patch showView block
for (let i = 0; i < newLines.length; i++) {
    if (newLines[i].includes('} else if (viewName === \'admin-settings-app\') {')) {
        newLines.splice(i+2, 0, `              } else if (viewName === 'admin-users-app') {
                  document.getElementById('admin-users-app').classList.remove('hidden');`);
        break;
    }
}

fs.writeFileSync('server.js', newLines.join('\n'), 'utf8');
console.log('Successfully created admin-users-app reliably');
