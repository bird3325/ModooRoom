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
const idx = lines.findIndex(l => l.includes('async function handleLogin'));
console.log('Line index:', idx + 1);

if (idx !== -1) {
    for (let i = idx; i < idx + 100; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
} else {
    console.log('handleLogin not found');
}
