const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Fix literal \\n in document.getElementById('admin-settings-app').classList.add('hidden');
content = content.replace(/\\n\s*if\(document\.getElementById\('admin-settings-app'\)\) document\.getElementById\('admin-settings-app'\)\.classList\.add\('hidden'\);/g, 
"\\n              if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');");

// Fix literal \\n in } else if (viewName === 'admin-app') {
content = content.replace(/\\n\s*\}\s*else\s*if\s*\(\s*viewName\s*===\s*'admin-app'\s*\)\s*\{/g, 
"\\n              } else if (viewName === 'admin-app') {");

// 2. Remove the wrong dropdown item from owner-dropdown
// The wrong string has a literal \\n in it. Let's find it.
const wrongDropdown = `<a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>\\n                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\\n                      <a href="#" class="dropdown-item" onclick="showView('main-app');`;

content = content.replace(wrongDropdown, `<a href="#" class="dropdown-item" onclick="showView('main-app');`);

// 3. Add to the admin-dropdown (the correct one)
// Look for admin-dropdown's 메인 페이지 link
const adminMainLink = `<a href="#" class="dropdown-item" onclick="showView('main-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">메인 페이지</a>`;
const adminSettingsLink = `<a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>
                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">
                      ${adminMainLink}`;

// Replace only if it hasn't been replaced yet
if (!content.includes(`onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown')`)) {
    content = content.replace(adminMainLink, adminSettingsLink);
}

// Write back
fs.writeFileSync('server.js', content, 'utf8');
console.log("Fixed settings menu");
