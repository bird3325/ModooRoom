const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(/\\n\s*if\(document/g, '\n            if(document');

fs.writeFileSync('server.js', content, 'utf8');
console.log('Fixed literal backslash n!');
