const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

const adminDropdownIdx = lines.findIndex(l => l.includes('id="admin-dropdown"'));
console.log("--- ADMIN APP DROPDOWN ---");
if (adminDropdownIdx !== -1) {
    console.log(lines.slice(adminDropdownIdx, adminDropdownIdx + 15).join('\n'));
} else {
    console.log("NOT FOUND");
}

const settingsDropdownIdx = lines.findIndex(l => l.includes('id="admin-settings-dropdown"'));
console.log("\n--- SETTINGS APP DROPDOWN ---");
if (settingsDropdownIdx !== -1) {
    console.log(lines.slice(settingsDropdownIdx, settingsDropdownIdx + 15).join('\n'));
} else {
    console.log("NOT FOUND");
}

const usersDropdownIdx = lines.findIndex(l => l.includes('id="admin-users-dropdown"'));
console.log("\n--- USERS APP DROPDOWN ---");
if (usersDropdownIdx !== -1) {
    console.log(lines.slice(usersDropdownIdx, usersDropdownIdx + 15).join('\n'));
} else {
    console.log("NOT FOUND");
}
