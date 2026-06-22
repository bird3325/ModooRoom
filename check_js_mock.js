const http = require('http');
const originalCreateServer = http.createServer;
http.createServer = function(handler) {
    const mockReq = { method: 'GET', url: '/' };
    const mockRes = {
        writeHead: () => {},
        end: (html) => {
            const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
            for(let i=0; i<scriptMatches.length; i++) {
                require('fs').writeFileSync('script_eval'+i+'.js', scriptMatches[i][1]);
                try {
                    const vm = require('vm');
                    new vm.Script(scriptMatches[i][1]);
                    console.log('Script ' + i + ' Valid!');
                } catch(e) {
                    console.log('Script ' + i + ' Error: ' + e.message);
                }
            }
            process.exit(0);
        }
    };
    handler(mockReq, mockRes);
    return { listen: () => {} };
};
require('./server.js');
