const fs = require('fs');
const content = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/app.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('function ') || line.includes('const ') && line.includes('=>') || line.includes('let ') && line.includes('=>')) {
        if (line.includes('function') || line.includes('=>')) {
            console.log(`${index + 1}: ${line.trim()}`);
        }
    }
});
