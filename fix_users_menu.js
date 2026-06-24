const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// 1. Fix admin-app dropdown
let adminDropdownStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('id="admin-dropdown"')) {
        adminDropdownStart = i;
        break;
    }
}
if (adminDropdownStart !== -1) {
    let replaced = false;
    for (let i = adminDropdownStart; i < adminDropdownStart + 20; i++) {
        if (lines[i].includes('관리자 대시보드</a>')) {
            // Check if "회원 관리" is already there
            if (!lines[i+1].includes('회원 관리') && !lines[i+2].includes('회원 관리')) {
                lines.splice(i + 1, 0, `                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="showView('admin-users-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">회원 관리</a>`);
                replaced = true;
                break;
            }
        }
    }
}

// 2. We need to move the '전체 회원 관리' card content from admin-app to admin-users-app!
let adminAppUsersTitleIdx = lines.findIndex(l => l.includes('<div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>'));
let adminUsersAppCardIdx = lines.findIndex((l, idx) => idx > adminAppUsersTitleIdx && l.includes('id="admin-users-app"'));

// Actually, wait, admin-users-app is AFTER admin-app.
// Let's find admin-users-app first
let adminUsersAppIdx = lines.findIndex(l => l.includes('id="admin-users-app"'));
let cardStartIdx = -1;
let cardEndIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>')) {
        if (i < adminUsersAppIdx) {
            // It's in admin-app! We need to move it!
            cardStartIdx = i;
            while(cardStartIdx >= 0 && !lines[cardStartIdx].includes('<div class="card">')) {
                cardStartIdx--;
            }
            // Find the end of the card
            cardEndIdx = cardStartIdx + 1;
            let openDivs = 1; // we know we are inside <div class="card">
            while(cardEndIdx < lines.length && openDivs > 0) {
                if (lines[cardEndIdx].includes('<div ') || lines[cardEndIdx].includes('<div>')) {
                    openDivs += (lines[cardEndIdx].match(/<div/g) || []).length;
                }
                if (lines[cardEndIdx].includes('</div>')) {
                    openDivs -= (lines[cardEndIdx].match(/<\/div>/g) || []).length;
                }
                if (openDivs <= 0) break;
                cardEndIdx++;
            }
            
            // Extract it
            let cardContent = lines.splice(cardStartIdx + 1, cardEndIdx - cardStartIdx - 1);
            
            // Insert placeholder in admin-app
            const placeholderCard = [
                '                <div class="card-title"><i class="fa-solid fa-chart-pie"></i> 관리자 대시보드</div>',
                '                <div style="padding: 40px 20px; text-align: center; color: #718096;">',
                '                    <i class="fa-solid fa-layer-group" style="font-size: 48px; color: #cbd5e0; margin-bottom: 20px;"></i>',
                '                    <h3 style="margin-bottom: 10px; color: #4a5568;">환영합니다, 관리자님!</h3>',
                '                    <p style="margin: 0; line-height: 1.6;">우측 상단의 메뉴를 클릭하여 <strong>회원 관리</strong> 또는 <strong>시스템 설정</strong> 메뉴로 이동하실 수 있습니다.</p>',
                '                </div>'
            ];
            lines.splice(cardStartIdx + 1, 0, ...placeholderCard);

            // Now find admin-users-app again because indices changed
            let newAdminUsersAppIdx = lines.findIndex(l => l.includes('id="admin-users-app"'));
            let emptyCardIdx = -1;
            for(let j = newAdminUsersAppIdx; j < lines.length; j++) {
                if(lines[j].includes('<div class="main-container">')) {
                    emptyCardIdx = j + 1; // <div class="card">
                    lines.splice(emptyCardIdx + 1, 0, ...cardContent);
                    break;
                }
            }
            break;
        }
    }
}

fs.writeFileSync('server.js', lines.join('\n'), 'utf8');
console.log('Fixed users menu and content');
