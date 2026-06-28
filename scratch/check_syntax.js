const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = [
    '../public/js/app.js',
    '../public/js/views/authController.js',
    '../public/js/views/ownerController.js',
    '../public/js/views/tenantController.js',
    '../public/js/views/adminController.js'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        // Compile the code to check for syntax errors
        new vm.Script(code);
        console.log(`[PASS] ${file}`);
    } catch (e) {
        console.error(`[FAIL] ${file}`);
        console.error(e.stack || e);
    }
});
