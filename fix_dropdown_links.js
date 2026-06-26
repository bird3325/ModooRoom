const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace href="#" class="dropdown-item" with href="javascript:void(0)" class="dropdown-item"
// Also capture cases with style or other attributes, e.g. <a href="#" class="dropdown-item" onclick="..."
// A general regex: href="#" followed by class="dropdown-item" or vice versa.
// Let's replace any href="#" inside <a> tag if it has class="dropdown-item"
const regex = /<a\s+href="#"\s+class="dropdown-item"/g;
html = html.replace(regex, '<a href="javascript:void(0)" class="dropdown-item"');

// Let's also catch any other links in dropdowns that might have styles or other attributes
// E.g., <a href="#" onclick="..." class="dropdown-item"
const regex2 = /href="#"/g;
// We can parse the HTML or do a safe string replacement for all <a href="#" class="dropdown-item"
// Let's find all href="#" inside tags and replace them if they are dropdown-items.
// Actually, replacing href="#" with href="javascript:void(0)" is generally safe for all navigation items in this single-page app!
// Since it's a SPA using showView, no links should actually navigate via href="#".
html = html.replace(/href="#"/g, 'href="javascript:void(0)"');

fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log('Successfully updated all href="#" to href="javascript:void(0)" in index.html');
