const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Replace double backslash backticks with single backslash backticks
code = code.replace(/\\\\`/g, '\\`');

fs.writeFileSync('server.js', code);
