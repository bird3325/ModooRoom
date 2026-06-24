const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

const adminAppIdx = lines.findIndex(l => l.includes('id="admin-app"'));
const usersAppIdx = lines.findIndex(l => l.includes('id="admin-users-app"'));
const settingsAppIdx = lines.findIndex(l => l.includes('id="admin-settings-app"'));
const usersCardIdx = lines.findIndex(l => l.includes('전체 회원 관리'));

console.log('adminAppIdx:', adminAppIdx);
console.log('usersAppIdx:', usersAppIdx);
console.log('settingsAppIdx:', settingsAppIdx);
console.log('usersCardIdx:', usersCardIdx);
