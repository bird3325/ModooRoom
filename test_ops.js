const https = require('https');
const op = 'getBrOwnrInfo';
const url = 'https://apis.data.go.kr/1613000/BldRgstHubService/' + op + '?ServiceKey=Sp2MXcn5bmwgIPzPlhgcWxaATxxiWgTGRbDQUZRLrOpHrrjbFr7T8gk6jJnanHDSpCdpxUmIQGxvX9Zp6NQ%2FTA%3D%3D&sigunguCd=11620&bjdongCd=10200&platGbCd=0&bun=0010&ji=0227';
const urlObj = new URL(url);
https.get({
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    rejectUnauthorized: false
}, r => {
    let d = '';
    r.on('data', chunk => d+=chunk);
    r.on('end', () => {
        console.log("Status:", r.statusCode);
        console.log("Body:", d);
    });
});
