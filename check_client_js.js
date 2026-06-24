const fs = require('fs');
const html = fs.readFileSync('server.js', 'utf8');

// Extract everything inside <script> tags
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    fs.writeFileSync(`temp_script_${count}.js`, match[1], 'utf8');
    try {
        require('child_process').execSync(`node -c temp_script_${count}.js`);
        console.log(`Script ${count} is valid.`);
    } catch (e) {
        console.error(`Script ${count} has SYNTAX ERRORS:`, e.message);
    }
    count++;
}
