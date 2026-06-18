const http = require('http');
const url = 'http://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?ServiceKey=' + encodeURIComponent('Sp2MXcn5bmwgIPzPlhgcWxaATxxiWgTGRbDQUZRLrOpHrrjbFr7T8gk6jJnanHDSpCdpxUmIQGxvX9Zp6NQ/TA==') + '&sigunguCd=11620&bjdongCd=10200&platGbCd=0&bun=0010&ji=0227';
const urlObj = new URL(url);
const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'GET'
};
http.get(options, r=>{
    console.log("Status:", r.statusCode);
    r.on('data', d=>console.log(d.toString()));
});
