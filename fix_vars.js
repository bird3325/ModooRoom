const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const matchStart = code.indexOf('const htmlTemplate = `');
if (matchStart > -1) {
    const stringStart = matchStart + 21;
    const lastBacktick = code.lastIndexOf('`;');
    
    if (lastBacktick > -1) {
        let before = code.substring(0, stringStart + 1);
        let middle = code.substring(stringStart + 1, lastBacktick);
        let after = code.substring(lastBacktick);
        
        // Escape all ${ that are not already escaped
        middle = middle.replace(/(?<!\\)\$\{/g, '\\${');
        
        fs.writeFileSync('server.js', before + middle + after);
        console.log('Fixed ${!');
    }
}
