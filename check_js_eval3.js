const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
const match = code.indexOf('const htmlTemplate = `');
if (match > -1) {
    const endMatch = code.indexOf('`;', match + 22);
    if (endMatch > -1) {
        let htmlRaw = code.substring(match + 22, endMatch);
        let htmlEvaluated = htmlRaw.replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\');
        
        const scriptMatches = [...htmlEvaluated.matchAll(/<script>([\s\S]*?)<\/script>/g)];
        for(let i=0; i<scriptMatches.length; i++) {
            fs.writeFileSync('script_eval'+i+'.js', scriptMatches[i][1]);
            try {
                const vm = require('vm');
                new vm.Script(scriptMatches[i][1]);
                console.log('Script ' + i + ' Valid!');
            } catch(e) {
                console.log('Script ' + i + ' Error: ' + e.message);
            }
        }
    } else {
        console.log('End match not found');
    }
}
