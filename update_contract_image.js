const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// The line to replace:
// broker_phone: contractData['ocr_broker_phone']
const oldInsert = `broker_phone: contractData['ocr_broker_phone']`;
const newInsert = `broker_phone: contractData['ocr_broker_phone'],
                        contract_image_url: document.getElementById('ocr-preview-img').src`;

if (content.includes(oldInsert)) {
    content = content.replace(oldInsert, newInsert);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Successfully updated server.js with contract_image_url');
} else {
    console.log('Could not find insert statement in server.js');
}
