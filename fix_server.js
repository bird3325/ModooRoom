const fs = require('fs');
const path = require('path');

const headJs = fs.readFileSync('server_head.js', 'utf8');
const curJs = fs.readFileSync('server.js', 'utf8');

// Get the server block from server_head.js
const headServerStart = headJs.indexOf('const server = http.createServer(');
if (headServerStart === -1) {
    console.error('Could not find server in server_head.js');
    process.exit(1);
}
let newServerBlock = headJs.substring(headServerStart);

// The old route string to be replaced
const oldRouteStr = `  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html' || parsedUrl.pathname === '/admin')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    let content = htmlTemplate;
    if (parsedUrl.pathname === '/admin') {
      content = content.replace('</head>', '<script>window.IS_ADMIN_ROUTE = true;</script></head>');
    }
    res.end(content);
  }`;

const newRouteStr = `  // 정적 파일 서빙 로직 (CSS, JS)
  if (req.method === 'GET' && (parsedUrl.pathname.startsWith('/css/') || parsedUrl.pathname.startsWith('/js/'))) {
    const filePath = path.join(__dirname, 'public', parsedUrl.pathname);
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    if (ext === '.css') contentType = 'text/css; charset=utf-8';
    if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
    
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        return res.end(content);
    } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
    }
  }

  // HTML 서빙 로직
  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html' || parsedUrl.pathname === '/admin')) {
    try {
        let content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (parsedUrl.pathname === '/admin') {
            content = content.replace('</head>', '<script>window.IS_ADMIN_ROUTE = true;</script></head>');
        }
        return res.end(content);
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Error loading index.html');
    }
  }`;

newServerBlock = newServerBlock.replace(oldRouteStr, newRouteStr);

// Get the top portion of the current server.js (before createServer)
const curServerStart = curJs.indexOf('const server = http.createServer(');
if (curServerStart === -1) {
    console.error('Could not find server in server.js');
    process.exit(1);
}
const topPortion = curJs.substring(0, curServerStart);

// Combine and write
fs.writeFileSync('server.js', topPortion + newServerBlock, 'utf8');
console.log('server.js fixed perfectly.');
