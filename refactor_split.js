const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync('index.html', 'utf8');

// 1. Extract CSS
const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
    console.error('No <style> found!');
    process.exit(1);
}
const cssContent = styleMatch[1].trim();
let newHtml = htmlContent.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/css/style.css">');

// 2. Extract JS
const scriptMatch = newHtml.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.error('No <script> found!');
    process.exit(1);
}
const jsContent = scriptMatch[1].trim();
newHtml = newHtml.replace(/<script>[\s\S]*?<\/script>/, '<script src="/js/app.js"></script>');

// 3. Write files
fs.mkdirSync('public/css', { recursive: true });
fs.mkdirSync('public/js', { recursive: true });

fs.writeFileSync('public/css/style.css', cssContent, 'utf8');
fs.writeFileSync('public/js/app.js', jsContent, 'utf8');
fs.writeFileSync('index.html', newHtml, 'utf8');

console.log('Successfully separated CSS and JS from index.html.');
