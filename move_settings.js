const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// The exact string to find and extract
const settingsCardStr = `                <div class="card" style="margin-bottom: 20px; border-top: 4px solid #667eea;">
                    <div class="card-title"><i class="fa-solid fa-gear"></i> 시스템 설정 (API Key)</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 5px;">Gemini API Key</label>
                            <input type="password" id="admin-gemini-key" class="form-control" placeholder="AIzaSy..." style="width: 100%; max-width: 400px; display: inline-block;">
                            <button class="btn btn-orange" onclick="saveGeminiKey()">저장</button>
                        </div>
                        <p style="font-size: 12px; color: #718096; margin: 0;">이 키는 system_settings 테이블에 안전하게 저장되며, AI OCR 자동 추출 시 우선적으로 사용됩니다.</p>
                    </div>
                </div>`;

if (content.includes(settingsCardStr)) {
    // 1. Remove it from current location
    content = content.replace(settingsCardStr + '\\n', '');
    content = content.replace(settingsCardStr, ''); // fallback without newline

    // 2. Create the new admin-settings-app
    const newSettingsApp = `
    <!-- 시스템 설정 페이지 -->
    <div id="admin-settings-app" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('admin-app')">
                <i class="fa-solid fa-arrow-left"></i>
                <span style="margin-left: 5px;">관리자 메인으로 돌아가기</span>
            </div>
            <div class="user-profile">
                <button class="btn-logout" onclick="logout()" style="color: white; border-color: #4a5568;"><i class="fa-solid fa-right-from-bracket"></i> 로그아웃</button>
            </div>
        </nav>
        <div class="main-container">
${settingsCardStr}
        </div>
    </div>
`;
    // Insert it before admin-app
    content = content.replace('    <!-- 어드민 페이지 -->', newSettingsApp + '\\n    <!-- 어드민 페이지 -->');

    // 3. Add to admin-dropdown
    const dropdownLink = `<a href="#" class="dropdown-item" onclick="showView('admin-settings-app'); document.getElementById('admin-dropdown').classList.add('hidden');" style="color: #4a5568;">시스템 설정</a>\\n                      <hr style="margin: 5px 0; border: none; border-top: 1px solid #e2e8f0;">\\n                      <a href="#" class="dropdown-item" onclick="showView('main-app');`;
    
    // Find `<a href="#" class="dropdown-item" onclick="showView('main-app');` and replace
    content = content.replace(`<a href="#" class="dropdown-item" onclick="showView('main-app');`, dropdownLink);

    // 4. Update showView
    // Add hide logic
    const hideLogic = `if(document.getElementById('admin-settings-app')) document.getElementById('admin-settings-app').classList.add('hidden');`;
    content = content.replace(`if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');`, 
        `if(document.getElementById('admin-app')) document.getElementById('admin-app').classList.add('hidden');\\n            ${hideLogic}`
    );

    // Add show logic
    const showLogic = `} else if (viewName === 'admin-settings-app') {
                document.getElementById('admin-settings-app').classList.remove('hidden');`;
    content = content.replace(`} else if (viewName === 'admin-app') {`, 
        `${showLogic}\\n            } else if (viewName === 'admin-app') {`
    );

    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Successfully moved settings to new page.');
} else {
    console.log('Could not find settingsCardStr in server.js');
}
