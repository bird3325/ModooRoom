const fs = require('fs');
const text = fs.readFileSync('server_head.js', 'utf8');
let appJs = fs.readFileSync('public/js/app.js', 'utf8');

const missingFunctions = [
    'toggleAdminUsersMenu',
    'toggleAdminSettingsMenu',
    'toggleAdminMenu',
    'toggleAdminUserEditMenu',
    'openUserEditPage',
    'saveAdminUserEditData',
    'loadAdminDashboardStats',
    'saveGeminiKey',
    'loadGeminiKeyIntoAdmin',
    'getGeminiApiKey',
    'executeGeminiExtraction',
    'submitExtractedContract',
    'selectDateFromCalendar'
];

let addedFunctionsHtml = '';

for (const fn of missingFunctions) {
    if (appJs.includes(`function ${fn}`)) continue; // already has it
    
    // Find the start of the function in server_head.js
    // e.g. function toggleAdminMenu(e) {
    const fnRegex = new RegExp(`function\\s+${fn}\\s*\\([^)]*\\)\\s*\\{`, 'g');
    const match = fnRegex.exec(text);
    if (!match) {
        console.log(`Could not find ${fn} in server_head.js`);
        continue;
    }
    
    let startIdx = match.index;
    let depth = 0;
    let endIdx = startIdx;
    let inBrace = false;
    
    for (let i = startIdx; i < text.length; i++) {
        if (text[i] === '{') {
            depth++;
            inBrace = true;
        } else if (text[i] === '}') {
            depth--;
        }
        
        if (inBrace && depth === 0) {
            endIdx = i + 1;
            break;
        }
    }
    
    let fnCode = text.substring(startIdx, endIdx);
    addedFunctionsHtml += `\n\n// RESTORED FUNCTION: ${fn}\n${fnCode}`;
}

if (addedFunctionsHtml.length > 0) {
    fs.writeFileSync('public/js/app.js', appJs + addedFunctionsHtml, 'utf8');
    console.log('Restored missing functions to app.js');
} else {
    console.log('No missing functions added.');
}
