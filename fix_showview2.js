const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const oldShowView = `        function showView(viewName) {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('owner-app').classList.add('hidden');
            document.getElementById('tenant-app').classList.add('hidden');
            if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');
            if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');
            if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');
            if(document.getElementById('map-app')) document.getElementById('map-app').classList.add('hidden');
            if(document.getElementById('story-detail-app')) document.getElementById('story-detail-app').classList.add('hidden');
            if(document.getElementById('auth-page')) document.getElementById('auth-page').classList.add('hidden');
            if(document.getElementById('add-building-view')) document.getElementById('add-building-view').classList.add('hidden');
            if(document.getElementById('building-management-page')) document.getElementById('building-management-page').classList.add('hidden');
            if(document.getElementById('ocr-extraction-view')) document.getElementById('ocr-extraction-view').classList.add('hidden');

            if (viewName === 'login') {
                document.getElementById('login-view').classList.remove('hidden');
            } else if (viewName === 'signup') {
                document.getElementById('signup-view').classList.remove('hidden');
            } else if (viewName === 'main-app') {
                document.getElementById('main-app').classList.remove('hidden');
            } else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');
            } else if (viewName === 'admin-users-app') {
                document.getElementById('admin-users-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {
                document.getElementById('admin-app').classList.remove('hidden');
            } else if (viewName === 'map-app') {
                document.getElementById('map-app').classList.remove('hidden');
            } else if (viewName === 'story-detail-app') {
                document.getElementById('story-detail-app').classList.remove('hidden');
            } else if (viewName === 'auth-page') {
                document.getElementById('auth-page').classList.remove('hidden');`;

// Let's find exactly the range to replace.
let lines = content.split('\n');
let startIdx = lines.findIndex(l => l.includes('function showView('));
let endIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes('// 마이페이지 진입 시'));

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx, ...oldShowView.split('\n'));
}

fs.writeFileSync('server.js', lines.join('\n'), 'utf8');
console.log('Fixed showView fully');
