const fs = require('fs');
const path = require('path');

let s = fs.readFileSync('server.js', 'utf8');

// Find the start of htmlTemplate
const startIdx = s.indexOf('const htmlTemplate = `');
const endIdx = s.indexOf('const server = http.createServer(');

if (startIdx !== -1 && endIdx !== -1) {
    const beforeTemplate = s.substring(0, startIdx);
    const afterTemplate = s.substring(endIdx);
    s = beforeTemplate + '\n' + afterTemplate;
    console.log('htmlTemplate removed.');
} else {
    console.log('htmlTemplate not found or already removed');
}

// Modify routing logic
const newRoute = `  // 정적 파일 서빙 로직 (CSS, JS)
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

s = s.replace(/  if \(req\.method === 'GET' && \(parsedUrl\.pathname === '\/' \|\| parsedUrl\.pathname === '\/index\.html' \|\| parsedUrl\.pathname === '\/admin'\)\) \{[\s\S]*?  \}/, newRoute);

fs.writeFileSync('server.js', s, 'utf8');
console.log('server.js successfully refactored');
