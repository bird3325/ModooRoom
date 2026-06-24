const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\\n');

let newLines = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('메인 페이지') && (line.includes('admin-settings-dropdown') || line.includes('admin-dropdown'))) {
        // This is the line we want to remove.
        // We also want to remove the preceding <hr> line if it exists.
        if (newLines.length > 0 && newLines[newLines.length - 1].includes('<hr')) {
            newLines.pop(); // remove the <hr>
        }
        continue; // skip the '메인 페이지' line
    }
    newLines.push(line);
}

fs.writeFileSync('server.js', newLines.join('\\n'), 'utf8');
console.log('Successfully removed main page safely');
