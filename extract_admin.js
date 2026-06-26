const fs = require('fs');

const text = fs.readFileSync('server_head.js', 'utf8');

// Helper to extract a div block
function extractBlock(id) {
    const startStr = `<div id="${id}"`;
    const startIdx = text.indexOf(startStr);
    if (startIdx === -1) return '';
    
    // We will find the next major app or modal as the boundary.
    // Let's find the closing tag by counting divs
    let depth = 0;
    let inDiv = false;
    let endIdx = startIdx;
    
    // A simple regex to find all <div and </div
    const regex = /<\/?div[^>]*>/gi;
    regex.lastIndex = startIdx;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        if (match[0].toLowerCase().startsWith('<div')) {
            depth++;
            inDiv = true;
        } else if (match[0].toLowerCase().startsWith('</div')) {
            depth--;
        }
        
        if (inDiv && depth === 0) {
            endIdx = match.index + match[0].length;
            break;
        }
    }
    
    return text.substring(startIdx, endIdx);
}

const adminUsersApp = extractBlock('admin-users-app');
const adminSettingsApp = extractBlock('admin-settings-app');
const adminApp = extractBlock('admin-app');
const adminUserEditApp = extractBlock('admin-user-edit-app');

const combinedAdminHtml = `\n    <!-- [RESTORED ADMIN SECTION] -->\n` + 
    adminUsersApp + '\n\n' + 
    adminSettingsApp + '\n\n' + 
    adminApp + '\n\n' + 
    adminUserEditApp + `\n    <!-- [/RESTORED ADMIN SECTION] -->\n`;

// Read index.html
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Remove current admin-app block from index.html using the same depth logic
const idxStart = indexHtml.indexOf('<div id="admin-app"');
if (idxStart !== -1) {
    let depth = 0;
    let inDiv = false;
    let idxEnd = idxStart;
    const regex = /<\/?div[^>]*>/gi;
    regex.lastIndex = idxStart;
    let match;
    while ((match = regex.exec(indexHtml)) !== null) {
        if (match[0].toLowerCase().startsWith('<div')) { depth++; inDiv = true; }
        else if (match[0].toLowerCase().startsWith('</div')) { depth--; }
        if (inDiv && depth === 0) {
            idxEnd = match.index + match[0].length;
            break;
        }
    }
    indexHtml = indexHtml.substring(0, idxStart) + combinedAdminHtml + indexHtml.substring(idxEnd);
    fs.writeFileSync('index.html', indexHtml, 'utf8');
    console.log('Successfully injected admin parts into index.html');
} else {
    // If not found, insert before modal
    const insertPos = indexHtml.indexOf('<!-- 회원 수정 모달 -->');
    if (insertPos !== -1) {
        indexHtml = indexHtml.substring(0, insertPos) + combinedAdminHtml + indexHtml.substring(insertPos);
        fs.writeFileSync('index.html', indexHtml, 'utf8');
        console.log('Inserted admin parts before modal in index.html');
    } else {
        console.log('Could not find insert position in index.html');
    }
}
