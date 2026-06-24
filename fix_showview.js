const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// Fix the literal '\n' characters in the code. 
// They look like: \n              } else if (viewName === 'admin-app') {
// Wait, I will just search and replace them literally.
content = content.replace(/\\n\s*\} else if \(viewName === 'admin-app'\) \{/g, `
              } else if (viewName === 'admin-app') {`);

content = content.replace(/\\n\s*if\(document\.getElementById\('admin-settings-app'\)\)/g, `
              if(document.getElementById('admin-settings-app'))`);

// To be extremely safe, let's just re-write the showView block for these apps:
/*
            if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');\n              if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');
              if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');
*/
content = content.replace(/if\(document\.getElementById\('admin-app'\)\) document\.getElementById\('admin-app'\)\.classList\.add\('hidden'\);\\n\s*if\(document\.getElementById\('admin-settings-app'\)\) document\.getElementById\('admin-settings-app'\)\.classList\.add\('hidden'\);/g,
`            if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');
            if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');`);


// Also there is double addition of admin-users-app hidden:
// if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');
// if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');
content = content.replace(/if\(document\.getElementById\('admin-users-app'\)\) document\.getElementById\('admin-users-app'\)\.classList\.add\('hidden'\);\s*if\(document\.getElementById\('admin-users-app'\)\) document\.getElementById\('admin-users-app'\)\.classList\.add\('hidden'\);/g,
`if(document.getElementById('admin-users-app')) document.getElementById('admin-users-app').classList.add('hidden');`);

// And for the else ifs:
/*
            } else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');\n              } else if (viewName === 'admin-app') {
              } else if (viewName === 'admin-users-app') {
                  document.getElementById('admin-users-app').classList.remove('hidden');
                if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.remove('hidden');
*/
const badElseIf = `            } else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');\\n              } else if (viewName === 'admin-app') {
              } else if (viewName === 'admin-users-app') {
                  document.getElementById('admin-users-app').classList.remove('hidden');
                if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.remove('hidden');`;

const goodElseIf = `            } else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');
            } else if (viewName === 'admin-users-app') {
                document.getElementById('admin-users-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {
                document.getElementById('admin-app').classList.remove('hidden');`;

content = content.replace(badElseIf, goodElseIf);

// Because I'm not 100% sure about the exact whitespace, let's use a robust regex for the bad else if.
content = content.replace(/\} else if \(viewName === 'admin-settings-app'\) \{\s*document\.getElementById\('admin-settings-app'\)\.classList\.remove\('hidden'\);\s*\\n\s*\}\s*else if \(viewName === 'admin-app'\)\s*\{\s*\}\s*else if \(viewName === 'admin-users-app'\)\s*\{\s*document\.getElementById\('admin-users-app'\)\.classList\.remove\('hidden'\);\s*if\(document\.getElementById\('admin-app'\)\) document\.getElementById\('admin-app'\)\.classList\.remove\('hidden'\);/,
`            } else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');
            } else if (viewName === 'admin-users-app') {
                document.getElementById('admin-users-app').classList.remove('hidden');
            } else if (viewName === 'admin-app') {
                if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.remove('hidden');`);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Fixed showView');
