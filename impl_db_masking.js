const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Backend /api/gemini-extract: Read apiKey from body
content = content.replace(
    /const base64Data = data.imageBase64.replace\(\/\^data:image\\\\\/\\\\w\+;base64,\/, ""\);\s*const \{ GoogleGenAI \} = require\('@google\/genai'\);\s*const ai = new GoogleGenAI\(\{ apiKey: process.env.GEMINI_API_KEY \}\);/,
    `const base64Data = data.imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
        const apiKeyToUse = data.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKeyToUse) {
           res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
           return res.end(JSON.stringify({ success: false, error: 'GEMINI_API_KEY가 관리자 DB 설정이나 서버 .env에 설정되지 않았습니다.' }));
        }
        
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: apiKeyToUse });`
);
content = content.replace(
    /if \(\!process\.env\.GEMINI_API_KEY\) \{[\s\S]*?\}\s*const data = JSON\.parse\(body\);/,
    `const data = JSON.parse(body);`
);

// 2. Add Tesseract.js to <head>
content = content.replace(
    '</head>',
    '    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>\\n</head>'
);

// 3. Add Admin API Key Setting UI
const adminSection = `
                <div class="card" style="margin-bottom: 20px;">
                    <div class="card-title"><i class="fa-solid fa-gear"></i> 시스템 설정 (API Key)</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 5px;">Gemini API Key</label>
                            <input type="password" id="admin-gemini-key" class="input-field" placeholder="AIzaSy..." style="width: 100%; max-width: 400px; display: inline-block;">
                            <button class="btn btn-orange" onclick="saveGeminiKey()">저장</button>
                        </div>
                        <p style="font-size: 12px; color: #718096; margin: 0;">이 키는 system_settings 테이블에 안전하게 저장되며, 자동 추출 시 우선적으로 사용됩니다.</p>
                    </div>
                </div>
`;
content = content.replace(
    '<div class="card-title"><i class="fa-solid fa-users-gear"></i> 사용자 회원 관리</div>',
    adminSection + '\\n                <div class="card-title"><i class="fa-solid fa-users-gear"></i> 사용자 회원 관리</div>'
);

// 4. Add Frontend JS for Settings and Masking Logic
const executeGeminiReplacement = `
        async function saveGeminiKey() {
            const keyVal = document.getElementById('admin-gemini-key').value.trim();
            if(!keyVal) return showModalAlert('키를 입력해주세요.');
            
            const { error } = await supabaseClient.from('system_settings').upsert(
                { key_name: 'GEMINI_API_KEY', key_value: keyVal },
                { onConflict: 'key_name' }
            );
            
            if (error) {
                console.error(error);
                showModalAlert('저장 실패: system_settings 테이블이 없거나 권한이 없습니다. (Supabase에서 테이블 생성 확인)');
            } else {
                showModalAlert('API Key가 DB에 성공적으로 저장되었습니다.');
            }
        }

        async function loadGeminiKeyIntoAdmin() {
            const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
            if (data && data.key_value) {
                const el = document.getElementById('admin-gemini-key');
                if (el) el.value = data.key_value;
            }
        }

        async function executeGeminiExtraction() {
            const img = document.getElementById('ocr-preview-img');
            if (!img || !img.src) {
                showModalAlert('이미지가 없습니다.');
                return;
            }

            document.getElementById('loading-view').classList.remove('hidden');
            document.getElementById('loading-view').querySelector('h3').innerText = '1/2 🚀 주민등록번호 탐지 및 자동 모자이크 중... (약 2~5초 소요)';

            try {
                // 0. Fetch API Key from DB first
                let dbApiKey = null;
                try {
                    const { data: sData } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                    if (sData) dbApiKey = sData.key_value;
                } catch(e) { console.log('system_settings not available'); }

                // 1. Tesseract로 주민번호 탐지 및 마스킹
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

                let maskedCount = 0;
                
                // Tesseract.js (frontend)
                if (window.Tesseract) {
                    const worker = await Tesseract.createWorker('kor', 1, {
                        logger: m => console.log(m)
                    });
                    
                    const ret = await worker.recognize(img.src);
                    
                    // 주민번호 정규식: 6자리 숫자 - 7자리 숫자(또는 1자리 이상)
                    const juminRegex = /\\d{6}\\s*-\\s*\\d{1,7}/;
                    
                    ret.data.words.forEach(word => {
                        // 좀 더 공격적으로 주민번호 앞뒷자리 형태의 숫자를 검출
                        if (juminRegex.test(word.text) || (word.text.includes('-') && /\\d{6}/.test(word.text))) {
                            const bbox = word.bbox;
                            ctx.fillStyle = 'black';
                            ctx.fillRect(bbox.x0 - 5, bbox.y0 - 5, (bbox.x1 - bbox.x0) + 10, (bbox.y1 - bbox.y0) + 10);
                            maskedCount++;
                        }
                    });
                    await worker.terminate();
                } else {
                    console.warn('Tesseract is not loaded on frontend.');
                }
                
                const maskedBase64 = canvas.toDataURL('image/jpeg', 0.85);

                document.getElementById('loading-view').querySelector('h3').innerText = '2/2 ✨ 마스킹된 이미지를 Gemini AI로 분석 중...';

                // 2. Gemini로 전송
                const res = await fetch('/api/gemini-extract', {
                    method: 'POST',
                    body: JSON.stringify({ imageBase64: maskedBase64, apiKey: dbApiKey })
                });
                
                const result = await res.json();
                document.getElementById('loading-view').classList.add('hidden');
                
                if (result.success) {
                    const data = result.data;
                    Object.keys(data).forEach(key => {
                        const input = document.getElementById(key);
                        if (input) {
                            input.value = data[key] || '';
                            input.style.backgroundColor = '#ebf8fa';
                            setTimeout(() => input.style.backgroundColor = '', 1000);
                        }
                    });
                    showModalAlert(\`AI 추출 성공! (주민번호 \${maskedCount}곳 마스킹 처리됨)\\n폼을 확인하고 등록해주세요.\`);
                } else {
                    showModalAlert('AI 추출 실패: ' + result.error);
                }
            } catch (err) {
                document.getElementById('loading-view').classList.add('hidden');
                showModalAlert('오류 발생: ' + err.message);
                console.error(err);
            }
        }
`;

content = content.replace(/async function executeGeminiExtraction\(\) \{[\s\S]*?\}\n        \}\n/m, executeGeminiReplacement + "\\n");

// Also add loadGeminiKeyIntoAdmin() call inside loadAdminUsers() so it loads when admin page opens
content = content.replace(
    'async function loadAdminUsers() {',
    'async function loadAdminUsers() {\\n            loadGeminiKeyIntoAdmin();'
);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully implemented DB masking and API key UI');
