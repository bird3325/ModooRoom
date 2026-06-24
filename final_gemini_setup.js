const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Add API Key input to admin-app
const adminSection = `
                <div class="card" style="margin-bottom: 20px; border-top: 4px solid #667eea;">
                    <div class="card-title"><i class="fa-solid fa-gear"></i> 시스템 설정 (API Key)</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 5px;">Gemini API Key</label>
                            <input type="password" id="admin-gemini-key" class="form-control" placeholder="AIzaSy..." style="width: 100%; max-width: 400px; display: inline-block;">
                            <button class="btn btn-orange" onclick="saveGeminiKey()">저장</button>
                        </div>
                        <p style="font-size: 12px; color: #718096; margin: 0;">이 키는 system_settings 테이블에 안전하게 저장되며, AI OCR 자동 추출 시 우선적으로 사용됩니다.</p>
                    </div>
                </div>
`;

content = content.replace(
    '<div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>',
    adminSection + '                <div class="card-title"><i class="fa-solid fa-users-gear"></i> 전체 회원 관리</div>'
);

// 2. Add save and load functions
const newFunctions = `
        async function saveGeminiKey() {
            const keyVal = document.getElementById('admin-gemini-key').value.trim();
            if(!keyVal) return showModalAlert('키를 입력해주세요.');
            
            const { error } = await supabaseClient.from('system_settings').upsert(
                { key_name: 'GEMINI_API_KEY', key_value: keyVal },
                { onConflict: 'key_name' }
            );
            
            if (error) {
                console.error(error);
                showModalAlert('저장 실패: system_settings 테이블이 없거나 권한이 없습니다.');
            } else {
                showModalAlert('API Key가 성공적으로 저장되었습니다.');
            }
        }

        async function loadGeminiKeyIntoAdmin() {
            if (!supabaseClient) return;
            try {
                const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                if (data && data.key_value) {
                    const el = document.getElementById('admin-gemini-key');
                    if (el) el.value = data.key_value;
                }
            } catch(e) {}
        }

        async function getGeminiApiKey() {
            if (!supabaseClient) return null;
            try {
                const { data } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                return data ? data.key_value : null;
            } catch(e) {
                return null;
            }
        }
`;

content = content.replace(
    'async function executeGeminiExtraction() {',
    newFunctions + '\\n        async function executeGeminiExtraction() {'
);

// 3. Make executeGeminiExtraction send the apiKey
const modifiedBodyRegex = /body:\s*JSON\.stringify\(\{\s*imageBase64:\s*previewImage\.src\s*\}\)/;
const modifiedBodyReplacement = `body: JSON.stringify({
                          imageBase64: previewImage.src,
                          apiKey: await getGeminiApiKey()
                      })`;
content = content.replace(modifiedBodyRegex, modifiedBodyReplacement);

// 4. Call loadGeminiKeyIntoAdmin when loading admin users
content = content.replace(
    'async function loadAdminUsers() {',
    'async function loadAdminUsers() {\\n            loadGeminiKeyIntoAdmin();'
);

// 5. Replace backend /api/gemini-extract logic
const oldBackendLogicRegex = /console\.log\('\\[Gemini API 호출 시뮬레이션 시작\.\.\.\\]'\);[\s\S]*?\}, 1500\);/m;
const newBackendLogic = `
        const apiKeyToUse = data.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKeyToUse) {
           res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
           return res.end(JSON.stringify({ success: false, error: 'GEMINI_API_KEY가 관리자 DB 설정이나 서버 .env에 설정되지 않았습니다.' }));
        }

        const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
        
        const prompt = \`당신은 한국 부동산 임대차 계약서 데이터 추출 전문가입니다. 
주어진 계약서 이미지에서 다음 15가지 항목을 정확히 추출하여 JSON 형식으로 반환하세요.
없거나 식별할 수 없는 값은 빈 문자열 ""로 처리하세요.

[추출 항목]
- ocr_room_number: 임대할 부분 (예: 301호)
- ocr_area: 면적 (예: 30.5)
- ocr_deposit: 보증금 (예: 10000000)
- ocr_rent: 차임(월세) (예: 500000)
- ocr_contract_date: 계약일 (예: 2023-01-01)
- ocr_lease_period: 임대차 기간 (예: 2023-01-01 ~ 2025-01-01)
- ocr_tenant_name: 임차인 성명
- ocr_tenant_phone: 임차인 전화번호
- ocr_broker_address: 개업공인중개사 소재지
- ocr_broker_agency_name: 중개 사무소 명칭
- ocr_broker_rep_name: 중개사 대표자 성명
- ocr_broker_reg_number: 중개사 등록번호
- ocr_broker_phone: 중개사 전화번호
- ocr_maintenance_fee: 관리비
- ocr_cleaning_fee: 퇴실청소비\`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonText = response.text;
        const resultJson = JSON.parse(jsonText);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, data: resultJson }));
`;

content = content.replace(oldBackendLogicRegex, newBackendLogic);

fs.writeFileSync('server.js', content, 'utf8');
console.log('Successfully injected gemini logic into server.js');
