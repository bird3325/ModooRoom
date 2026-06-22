const fs = require('fs');
const code = fs.readFileSync('server.js', 'utf8');
const match = code.indexOf('const htmlTemplate = `');
if (match > -1) {
    const endMatch = code.lastIndexOf('`;');
    if (endMatch > -1) {
        const html = code.substring(match + 22, endMatch);
        const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
        for(let i=0; i<scriptMatches.length; i++) {
            fs.writeFileSync('script'+i+'.js', scriptMatches[i][1]);
            try {
                new require('vm').Script(scriptMatches[i][1]);
                console.log('script ' + i + ' is valid');
            } catch(e) {
                console.log('script ' + i + ' is invalid: ' + e.message);
            }
        }
    }
}
