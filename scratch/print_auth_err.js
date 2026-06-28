const fs = require('fs');
const content = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/views/authController.js', 'utf8');

const lines = content.split('\n');
console.log('Total lines in authController.js:', lines.length);

for (let i = 210; i < Math.min(lines.length, 240); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
