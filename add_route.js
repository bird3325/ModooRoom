const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const newRoute = `
  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/extract-text-ocr') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const imageBase64 = data.imageBase64;

        if (!imageBase64) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: false, error: '이미지가 누락되었습니다.' }));
        }

        const tesseract = require('tesseract.js');
        const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        console.log('[부분 OCR 분석 시작]');
        const result = await tesseract.recognize(buffer, 'kor');
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, text: result.data.text }));
      } catch (err) {
        console.error('OCR Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
`;

code = code.replace(`} else if (req.method === 'POST' && parsedUrl.pathname === '/api/verify-contract-ocr') {`, newRoute + `  } else if (req.method === 'POST' && parsedUrl.pathname === '/api/verify-contract-ocr') {`);

fs.writeFileSync('server.js', code);
console.log('Added /api/extract-text-ocr');
