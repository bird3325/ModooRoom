const fs = require('fs');
let content = '';
try {
    const raw = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/old_index.html');
    if (raw[0] === 0xff && raw[1] === 0xfe) {
        content = raw.toString('utf16le');
    } else {
        content = raw.toString('utf8');
    }
} catch(e) {
    console.error(e);
}

const lines = content.split('\n');
lines.forEach((line, index) => {
    // 호실이 들어가거나 room이 들어가는 부분 중 화면 id나 class, 혹은 button을 검색
    if ((line.includes('id=') || line.includes('class=')) && (line.toLowerCase().includes('room') || line.toLowerCase().includes('tenant') || line.toLowerCase().includes('detail'))) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
