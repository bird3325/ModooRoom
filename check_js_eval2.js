const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
const match = code.indexOf('const htmlTemplate = `');
if (match > -1) {
    const endMatch = code.lastIndexOf('`;\n');
    if (endMatch > -1) {
        let htmlRaw = code.substring(match + 22, endMatch);
        let htmlEvaluated = htmlRaw.replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\');
        
        const scriptMatches = [...htmlEvaluated.matchAll(/<script>([\s\S]*?)<\/script>/g)];
        for(let i=0; i<scriptMatches.length; i++) {
            fs.writeFileSync('script_eval'+i+'.js', scriptMatches[i][1]);
            try {
                const vm = require('vm');
                new vm.Script(scriptMatches[i][1]);
                console.log('Valid!');
            } catch(e) {
                console.log('Error: ' + e.message);
                console.log(e.stack);
            }
        }
    }
}
