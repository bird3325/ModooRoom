const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'views');
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('href="#"')) {
            content = content.replace(/href="#"/g, 'href="javascript:void(0)"');
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed: ' + file);
        }
    }
});
