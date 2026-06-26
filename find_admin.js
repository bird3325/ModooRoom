const fs = require('fs');
const text = fs.readFileSync('server_head.js', 'utf8');
const lines = text.split('\n');
lines.forEach((line, i) => {
    if(line.includes('<div id="admin-')) console.log(i + 1, line.trim());
});
