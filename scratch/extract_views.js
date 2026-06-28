const fs = require("fs");
const path = require("path");

const html = fs.readFileSync("index.html", "utf8");

function extractDiv(id) {
    const doubleIdx = html.indexOf(`id="${id}"`);
    const singleIdx = html.indexOf(`id='${id}'`);
    const idIndex = doubleIdx !== -1 ? doubleIdx : singleIdx;
    if (idIndex === -1) {
        return null;
    }
    
    // Find the opening tag '<div' before the idIndex
    let startIndex = idIndex;
    while (startIndex > 0) {
        if (html.substring(startIndex, startIndex + 4) === "<div") {
            break;
        }
        startIndex--;
    }
    
    // Count opening and closing divs to find the matching closing div
    let openDivs = 0;
    let index = startIndex;
    
    while (index < html.length) {
        if (html.substring(index, index + 4) === "<div") {
            openDivs++;
            index += 4;
        } else if (html.substring(index, index + 6) === "</div>") {
            openDivs--;
            index += 6;
            if (openDivs === 0) {
                return html.substring(startIndex, index);
            }
        } else {
            index++;
        }
    }
    return null;
}

const views = {
    'login-view': 'login.html',
    'signup-view': 'signup.html',
    'main-app': 'main.html',
    'map-app': 'map.html',
    'story-detail-app': 'story-detail.html',
    'owner-app': 'owner.html',
    'tenant-app': 'tenant.html',
    'auth-page': 'auth.html',
    'add-building-view': 'add-building.html',
    'building-management-page': 'building-management.html',
    'admin-app': 'admin.html',
    'ocr-extraction-view': 'ocr.html'
};

fs.mkdirSync("public/views", { recursive: true });

for (const [id, file] of Object.entries(views)) {
    const content = extractDiv(id);
    if (content) {
        fs.writeFileSync(`public/views/${file}`, content, "utf8");
        console.log(`Saved ${file} successfully.`);
    } else {
        console.log(`Failed to extract ${id} / ${file}`);
    }
}
