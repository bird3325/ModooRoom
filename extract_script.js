const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const startIdx = code.indexOf('<script>');
const endIdx = code.lastIndexOf('</script>');

if (startIdx > -1 && endIdx > -1) {
    let script = code.substring(startIdx + 8, endIdx);
    fs.writeFileSync('script_eval2.js', script);
    try {
        require('vm').Script(script);
        console.log('Syntax is valid!');
    } catch (e) {
        console.log('Syntax error:', e.message);
        let lines = script.split('\n');
        let errLineMatch = e.stack.match(/evalmachine\.<anonymous>:(\d+)/);
        if (errLineMatch) {
            let errLine = parseInt(errLineMatch[1]);
            for (let i = errLine - 5; i <= errLine + 5; i++) {
                console.log((i) + ': ' + lines[i-1]);
            }
        } else {
            console.log(e.stack);
        }
    }
}
