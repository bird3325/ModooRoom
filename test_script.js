const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The `htmlTemplate` starts around line 24.
let match = code.match(/const htmlTemplate = `([\s\S]*?)`;\n\nconst server/);
if (!match) {
    console.log("Could not extract htmlTemplate");
    process.exit(1);
}

let html = match[1];
let scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!scripts) {
    console.log("No scripts found");
    process.exit(1);
}

let lastScript = scripts[scripts.length - 1];
let scriptBody = lastScript.replace(/<script>/, '').replace(/<\/script>/, '');
fs.writeFileSync('script_eval3.js', scriptBody);

try {
    const vm = require('vm');
    new vm.Script(scriptBody);
    console.log("Syntax is VALID!");
} catch (e) {
    console.log("Syntax Error in extracted script:", e.message);
    const lines = scriptBody.split('\n');
    let matchLine = e.stack.match(/evalmachine\.<anonymous>:(\d+)/);
    if (matchLine) {
        let errLine = parseInt(matchLine[1]);
        console.log(`Error is at line ${errLine}:`);
        for (let i = errLine - 5; i <= errLine + 5; i++) {
            if (i >= 1 && i <= lines.length) {
                console.log(`${i}: ${lines[i-1]}`);
            }
        }
    } else {
        console.log(e.stack);
    }
}
