const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

c = c.replace(/classList\.add\('hidden'\);\\n\s*if\(document/g, "classList.add('hidden');\n            if(document");
c = c.replace(/classList\.remove\('hidden'\);\\n\s*\} else if/g, "classList.remove('hidden');\n            } else if");

fs.writeFileSync('server.js', c, 'utf8');
console.log('Fixed syntax errors caused by previous scripts!');
