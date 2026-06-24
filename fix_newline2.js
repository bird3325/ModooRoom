const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

c = c.split('\\n').join('\n');

fs.writeFileSync('server.js', c, 'utf8');
console.log('Fixed literally literal backslash n!');
