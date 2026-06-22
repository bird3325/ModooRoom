const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The exact string in server.js:
// gridHtml += `
//     <div style="\${styleStr}" 
//          onmouseover="if(!\${isSelected}) this.style.background='#edf2f7'" 
//          onmouseout="if(!\${isSelected}) this.style.background='transparent'" 
//          onclick="selectCalendarDate('\${dateStr}')">\${d}</div>
// `;

let match = code.match(/gridHtml \+= `([\s\S]*?)`;/);
if (match) {
    let inner = match[1];
    let newInner = inner.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    let replacement = 'gridHtml += \\`' + newInner + '\\`;';
    code = code.replace(match[0], replacement);
    console.log('Fixed gridHtml backticks via regex match');
} else {
    console.log('Could not find gridHtml backticks');
}

fs.writeFileSync('server.js', code);
