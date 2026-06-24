const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const regex = /<div class="user-profile">\s*<button class="btn-logout" onclick="logout\(\)".*?<\/button>\s*<\/div>\s*<\/nav>/;
const newAdminNav = `<div class="user-profile" style="position: relative;">
                  <button id="admin-display-name" class="btn-logout" style="border:none; font-weight: 500; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 5px; color: white; background: transparent;" onclick="toggleAdminMenu(event)">
                      관리자 메뉴 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>
                  </button>
                  <div id="admin-dropdown" class="dropdown-menu hidden" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: var(--card-shadow); padding: 8px 0; min-width: 150px; z-index: 1000; margin-top: 10px;">
                      <a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">메인 페이지</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      <a href="#" class="dropdown-item" onclick="logout(); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #e53e3e;">로그아웃</a>
                  </div>
              </div>
          </nav>`;

if (regex.test(content)) {
    content = content.replace(regex, newAdminNav);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Successfully replaced navbar');
} else {
    console.log('Regex did not match');
}
