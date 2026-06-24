const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Regex to remove the <hr> and the <a> tag for "메인 페이지" in both dropdowns
const mainPageRegex = /\\s*<hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\\s*<a href="#" class="dropdown-item" onclick="showView\\('main-app'\\); document\.getElementById\\('admin-settings-dropdown'\\)\.classList\.add\\('hidden'\\);" style="color: #4a5568;">메인 페이지<\/a>/g;

content = content.replace(mainPageRegex, '');

const mainPageRegex2 = /\\s*<hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\\s*<a href="#" class="dropdown-item" onclick="showView\\('main-app'\\); document\.getElementById\\('admin-dropdown'\\)\.classList\.add\\('hidden'\\);" style="color: #4a5568;">메인 페이지<\/a>/g;

content = content.replace(mainPageRegex2, '');

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully removed main page from dropdowns');
