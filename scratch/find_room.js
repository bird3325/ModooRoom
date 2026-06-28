const fs = require('fs');
const content = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/app.js', 'utf8');

// 'room' 단어가 포함된 줄이나 함수 선언을 찾아봅니다.
const lines = content.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((line, index) => {
    if (line.toLowerCase().includes('room') || line.includes('호실')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
