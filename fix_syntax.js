const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const matchStart = code.indexOf('const htmlTemplate = `');
if (matchStart > -1) {
    const stringStart = matchStart + 21; // The index of the backtick
    const stringEnd = code.lastIndexOf('`;\n\nconst server = http.createServer'); // Wait, earlier this failed.
    // Let's just find the last \`; before module.exports or end of file
    const lastBacktick = code.lastIndexOf('`;');
    
    if (lastBacktick > -1) {
        let before = code.substring(0, stringStart + 1);
        let middle = code.substring(stringStart + 1, lastBacktick);
        let after = code.substring(lastBacktick);
        
        // Escape all backticks in middle that are not already escaped
        middle = middle.replace(/(?<!\\)`/g, '\\`');
        
        fs.writeFileSync('server.js', before + middle + after);
        console.log('Fixed backticks!');
    } else {
        console.log('End not found');
    }
}
