const fs = require('fs');
const { execSync } = require('child_process');

try {
    let indexHtml = fs.readFileSync('index.html', 'utf8');
    
    // Get file from git 6a7103e directly
    const oldHtmlBuffer = execSync('git show 6a7103e:index.html');
    const oldHtml = oldHtmlBuffer.toString('utf8');

    const startIdx = oldHtml.indexOf('<div id="admin-app"');
    if (startIdx !== -1) {
        let adminHtml = oldHtml.substring(startIdx);
        
        // Find closing boundary
        const scriptIdx = adminHtml.indexOf('<script');
        if (scriptIdx !== -1) {
            adminHtml = adminHtml.substring(0, scriptIdx);
        } else {
            const bodyIdx = adminHtml.indexOf('</body>');
            if (bodyIdx !== -1) adminHtml = adminHtml.substring(0, bodyIdx);
        }
        
        const insertPos = indexHtml.indexOf('<script src="/js/app.js">');
        if (insertPos !== -1) {
            indexHtml = indexHtml.substring(0, insertPos) + adminHtml + indexHtml.substring(insertPos);
            fs.writeFileSync('index.html', indexHtml, 'utf8');
            console.log('Restored admin HTML successfully without encoding issues.');
        } else {
            console.log('Could not find insert pos in index.html');
        }
    } else {
        console.log('Could not find admin-app in old_index.html');
    }
} catch (e) {
    console.error('Error:', e);
}
