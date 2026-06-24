import sys

content = open('server.js', 'r', encoding='utf-8').read()

ocr_view_html = '''
    <!-- 계약서 OCR 추출 뷰 -->
    <div id="ocr-extraction-view" class="hidden">
        <nav class="navbar">
            <div class="nav-title">
                <i class="fa-solid fa-arrow-left" onclick="showView('owner-app')" style="cursor:pointer; margin-right: 15px;"></i>
                새 건물 계약 등록 (AI 자동 추출)
            </div>
        </nav>
        <div class="content-area" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px; display: flex; gap: 20px; flex-wrap: wrap;">
                
                <!-- 왼쪽: 계약서 이미지 미리보기 -->
                <div style="flex: 1; min-width: 300px; border-right: 1px solid #edf2f7; padding-right: 20px;">
                    <h4 style="margin-top: 0; color: #2d3748; font-size: 15px; margin-bottom: 15px;">계약서 원본 이미지</h4>
                    <div style="background: #f7fafc; border: 1px dashed #cbd5e0; border-radius: 8px; padding: 10px; text-align: center; overflow: hidden; position: relative;">
                        <img id="ocr-preview-img" src="" alt="계약서 미리보기" style="max-width: 100%; max-height: 80vh; object-fit: contain; cursor: crosshair;">
                    </div>
                    <p style="font-size: 12px; color: #718096; margin-top: 10px; line-height: 1.5;">
                        <i class="fa-solid fa-info-circle" style="color: #00acc1;"></i> 좌측 계약서 이미지를 확인하고, <strong>[✨ AI 15개 항목 자동 추출]</strong> 버튼을 누르면 인공지능이 15개 항목을 알아서 채워줍니다. (민감정보 보호를 위해 브라우저에서 자동 마스킹 처리됨). 추출된 결과는 직접 수정 가능합니다.
                    </p>
                    <input type="file" id="ocr-manual-file" accept="image/*" style="margin-top: 10px; font-size: 13px;" onchange="loadOcrImage(event)">
                </div>

                <!-- 오른쪽: 추출 데이터 폼 -->
                <div style="flex: 1; min-width: 300px;">
                    <form onsubmit="submitExtractedContract(event)" style="display: flex; flex-direction: column; height: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; margin-bottom: 15px;">
                            <h4 style="margin: 0; color: #2d3748; font-size: 15px;">계약 정보 15개 항목</h4>
                            <button type="button" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; font-size: 13px; border-radius: 6px; box-shadow: 0 2px 4px rgba(118, 75, 162, 0.3);" onclick="executeGeminiExtraction()">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI 15개 항목 자동 추출
                            </button>
                        </div>
                        
                        <div id="ocr-fields-container" style="flex: 1; overflow-y: auto; padding-right: 10px; max-height: 60vh;">
                            <!-- JS will populate fields here -->
                        </div>

                        <div style="margin-top: 20px; border-top: 1px solid #edf2f7; padding-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="btn" style="background: #e2e8f0; color: #4a5568;" onclick="showView('owner-app')">취소</button>
                            <button type="submit" class="btn btn-orange">최종 등록</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
'''

if 'id="ocr-extraction-view"' not in content:
    content = content.replace('<div id="tenant-app" class="hidden">', ocr_view_html + '\n    <div id="tenant-app" class="hidden">')
    print('Inserted ocr-extraction-view HTML.')

js_logic = '''
        const ocrFieldsList = [
            { id: 'ocr_room_number', label: '호실', placeholder: '예) 302호' },
            { id: 'ocr_area', label: '면적', placeholder: '예) 24.5㎡' },
            { id: 'ocr_deposit', label: '보증금', placeholder: '예) 10000000', type: 'number' },
            { id: 'ocr_rent', label: '월세', placeholder: '예) 550000', type: 'number' },
            { id: 'ocr_contract_date', label: '계약일', placeholder: '예) 2026-06-16' },
            { id: 'ocr_lease_period', label: '임대차 기간', placeholder: '예) 2026-06-16 ~ 2028-06-15' },
            { id: 'ocr_tenant_name', label: '임차인 이름', placeholder: '예) 홍길동' },
            { id: 'ocr_tenant_phone', label: '임차인 전화번호', placeholder: '예) 010-1234-5678' },
            { id: 'ocr_broker_address', label: '개업 공인중개사 소재지', placeholder: '예) 서울시 마포구 마포대로 1' },
            { id: 'ocr_broker_agency_name', label: '사무소명칭', placeholder: '예) 대박공인중개사' },
            { id: 'ocr_broker_rep_name', label: '대표자성명', placeholder: '예) 김대박' },
            { id: 'ocr_broker_reg_number', label: '등록번호', placeholder: '예) 11440-2015-00123' },
            { id: 'ocr_broker_phone', label: '개업 공인중개사 전화', placeholder: '예) 02-987-6543' },
            { id: 'ocr_maintenance_fee', label: '관리비', placeholder: '예) 70000', type: 'number' },
            { id: 'ocr_cleaning_fee', label: '퇴실청소비', placeholder: '예) 100000', type: 'number' }
        ];

        function initializeOcrFields() {
            const container = document.getElementById('ocr-fields-container');
            if (!container) return;
            container.innerHTML = '';
            ocrFieldsList.forEach(f => {
                const type = f.type || 'text';
                container.innerHTML += `
                    <div class="form-group" style="margin-bottom: 12px;">
                        <label style="font-size: 13px; margin-bottom: 4px;">${f.label}</label>
                        <input type="${type}" class="form-control" id="${f.id}" placeholder="${f.placeholder}" style="padding: 8px; font-size: 13px;">
                    </div>
                `;
            });
        }

        function loadOcrImage(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('ocr-preview-img').src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        }

        function runOcr() {
            initializeOcrFields();
            showView('ocr-extraction-view');
        }

        async function executeGeminiExtraction() {
            const img = document.getElementById('ocr-preview-img');
            if (!img || !img.src) {
                showModalAlert('계약서 이미지를 업로드해주세요.');
                return;
            }

            document.getElementById('loading-view').classList.remove('hidden');
            document.getElementById('loading-view').querySelector('h3').innerText = '1/2 🚀 개인정보(주민등록번호) 탐지 및 마스킹 중...';

            try {
                let dbApiKey = null;
                try {
                    const { data: sData } = await supabaseClient.from('system_settings').select('key_value').eq('key_name', 'GEMINI_API_KEY').single();
                    if (sData) dbApiKey = sData.key_value;
                } catch(e) { console.log('system_settings not available'); }

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

                let maskedCount = 0;
                
                if (window.Tesseract) {
                    const worker = await Tesseract.createWorker('kor', 1);
                    const ret = await worker.recognize(img.src);
                    const juminRegex = /\d{6}\s*-\s*\d{1,7}/;
                    
                    ret.data.words.forEach(word => {
                        if (juminRegex.test(word.text) || (word.text.includes('-') && /\d{6}/.test(word.text))) {
                            const bbox = word.bbox;
                            ctx.fillStyle = 'black';
                            ctx.fillRect(bbox.x0 - 5, bbox.y0 - 5, (bbox.x1 - bbox.x0) + 10, (bbox.y1 - bbox.y0) + 10);
                            maskedCount++;
                        }
                    });
                    await worker.terminate();
                }
                
                const maskedBase64 = canvas.toDataURL('image/jpeg', 0.85);

                document.getElementById('loading-view').querySelector('h3').innerText = '2/2 ✨ 마스킹 완료! Gemini AI로 15개 항목 분석 중...';

                const res = await fetch('/api/gemini-extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                    showModalAlert('AI 추출 성공! (주민번호 ' + maskedCount + '곳 마스킹 처리됨)\\n결과를 확인하고 수정해주세요.');
                } else {
                    showModalAlert('AI 추출 실패: ' + result.error);
                }
            } catch (err) {
                document.getElementById('loading-view').classList.add('hidden');
                showModalAlert('오류 발생: ' + err.message);
                console.error(err);
            }
        }

        async function submitExtractedContract(event) {
            event.preventDefault();
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                if (submitBtn.disabled) return;
                submitBtn.disabled = true;
            }
            
            showModalAlert('건물 및 계약 정보가 성공적으로 시스템에 등록되었습니다!');
            showView('owner-app');
            if (submitBtn) submitBtn.disabled = false;
        }
'''

if 'async function executeGeminiExtraction()' not in content:
    # We will replace the old runOcr function with our new runOcr and other logic
    old_runocr_start = content.find('function runOcr() {')
    if old_runocr_start != -1:
        # find the end brace of runOcr
        old_runocr_end = content.find('}', content.find('}', old_runocr_start) + 1) + 1
        content = content[:old_runocr_start] + js_logic + content[old_runocr_end:]
        print('Inserted executeGeminiExtraction and replaced runOcr.')

open('server.js', 'w', encoding='utf-8').write(content)
