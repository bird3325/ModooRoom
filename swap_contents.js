const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

let adminAppIdx = lines.findIndex(l => l.includes('id="admin-app"'));
let usersAppIdx = lines.findIndex(l => l.includes('id="admin-users-app"'));
let cardTitleIdx = lines.findIndex(l => l.includes('전체 회원 관리'));

// Extract card
let cardStart = cardTitleIdx;
while (cardStart >= 0 && !lines[cardStart].includes('<div class="card">')) {
    cardStart--;
}

let cardEnd = cardStart + 1;
let openDivs = 1;
while(cardEnd < lines.length && openDivs > 0) {
    if (lines[cardEnd].includes('<div ') || lines[cardEnd].includes('<div>')) {
        openDivs += (lines[cardEnd].match(/<div/g) || []).length;
    }
    if (lines[cardEnd].includes('</div>')) {
        openDivs -= (lines[cardEnd].match(/<\/div>/g) || []).length;
    }
    if (openDivs <= 0) break;
    cardEnd++;
}

let cardContent = lines.splice(cardStart + 1, cardEnd - cardStart - 1);

const placeholderCard = [
    '                <div class="card-title"><i class="fa-solid fa-chart-pie"></i> 관리자 대시보드</div>',
    '                <div style="padding: 40px 20px; text-align: center; color: #718096;">',
    '                    <i class="fa-solid fa-layer-group" style="font-size: 48px; color: #cbd5e0; margin-bottom: 20px;"></i>',
    '                    <h3 style="margin-bottom: 10px; color: #4a5568;">환영합니다, 관리자님!</h3>',
    '                    <p style="margin: 0; line-height: 1.6;">우측 상단의 메뉴를 클릭하여 <strong>회원 관리</strong> 또는 <strong>시스템 설정</strong> 메뉴로 이동하실 수 있습니다.</p>',
    '                </div>'
];

lines.splice(cardStart + 1, 0, ...placeholderCard);

// Now find where to insert into admin-users-app
usersAppIdx = lines.findIndex(l => l.includes('id="admin-users-app"'));
let mainContainerIdx = -1;
for(let i=usersAppIdx; i<lines.length; i++) {
    if(lines[i].includes('<div class="main-container">')) {
        mainContainerIdx = i;
        break;
    }
}

// Find <div class="card"> inside admin-users-app
let usersAppCardIdx = -1;
for(let i=mainContainerIdx; i<lines.length; i++) {
    if(lines[i].includes('<div class="card">')) {
        usersAppCardIdx = i;
        break;
    }
}

lines.splice(usersAppCardIdx + 1, 0, ...cardContent);

fs.writeFileSync('server.js', lines.join('\n'), 'utf8');
console.log('Successfully swapped contents');
