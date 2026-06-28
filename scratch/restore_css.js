const fs = require('fs');
const path = require('path');

let content = '';
try {
    content = fs.readFileSync(path.join(__dirname, '../server_head.js'), 'utf8');
} catch(e) {
    console.error('Failed to read server_head.js:', e);
    process.exit(1);
}

// Extract all CSS code between <style> and </style> in server_head.js
const regex = /<style>([\s\S]*?)<\/style>/g;
let match;
const cssBlocks = [];

while ((match = regex.exec(content)) !== null) {
    cssBlocks.push(match[1].trim());
}

if (cssBlocks.length > 0) {
    const cssPath = path.join(__dirname, '../public/css/style.css');
    // Ensure styles are written cleanly in UTF-8
    fs.writeFileSync(cssPath, cssBlocks.join('\n\n'), 'utf8');
    console.log(`Successfully restored style.css! (${cssBlocks.length} CSS blocks restored, size: ${fs.statSync(cssPath).size} bytes)`);
} else {
    console.error('No <style> blocks found in server_head.js');
}
