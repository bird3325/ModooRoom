const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// 1. Add ocr-extraction-view HTML
const ocrViewHTML = `
    <!-- 계약서 OCR 인터랙티브 추출 뷰 -->
    <div id="ocr-extraction-view" class="hidden">
        <nav class="navbar">
            <div class="navbar-brand" style="cursor: pointer;" onclick="showView('add-building-view')">
                <i class="fa-solid fa-arrow-left"></i>
                <span style="margin-left: 5px;">뒤로 가기</span>
            </div>
            <div style="font-size: 14px; font-weight: bold; color: var(--primary-deep-navy);">계약서 데이터 수동 추출</div>
        </nav>
        
        <div class="main-container" style="max-width: 1200px; display: flex; flex-direction: column; gap: 20px;">
            <p style="font-size: 14px; color: #4a5568; line-height: 1.5; background: #ebf8fa; padding: 15px; border-radius: 8px; border: 1px solid #b2ebf2;">
                <i class="fa-solid fa-info-circle" style="color: #00acc1;"></i> 좌측의 계약서 이미지를 확인하고, 각 항목의 <strong>[자동/수동 추출]</strong> 버튼을 눌러 계약서의 15가지 핵심 데이터를 파싱하세요. 추출된 데이터는 자동으로 장부에 연동됩니다.
            </p>
            
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <!-- Left: Image Viewer -->
                <div style="flex: 1; min-width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; position: relative;">
                    <h4 style="margin-top: 0; color: #2d3748; font-size: 15px; margin-bottom: 15px;"><i class="fa-solid fa-file-image"></i> 첨부된 계약서 이미지</h4>
                    <div style="width: 100%; height: 600px; overflow: auto; border: 1px solid #cbd5e0; background: #fff; display: flex; align-items: center; justify-content: center; position: relative;">
                        <img id="ocr-preview-img" src="" style="max-width: 100%; max-height: 100%; object-fit: contain; cursor: crosshair;" onclick="handleImageClickForExtraction(event)">
                    </div>
                </div>

                <!-- Right: Form -->
                <div style="flex: 1; min-width: 300px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                    <form onsubmit="submitExtractedContract(event)">
                        <h4 style="margin-top: 0; color: #2d3748; font-size: 15px; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; margin-bottom: 15px;">추출 대상 15개 항목</h4>
                        
                        <div style="height: 520px; overflow-y: auto; padding-right: 10px; margin-bottom: 15px;" id="ocr-fields-container">
                            <!-- 15 Fields -->
                        </div>
                        
                        <button type="submit" class="btn btn-orange" style="width: 100%; justify-content: center; padding: 14px; font-size: 15px;">
                            최종 등록 및 인증 완료
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
`;

// Insert after add-building-view closes
content = content.replace('<!-- 내 건물 관리 페이지 -->', ocrViewHTML + '\n    <!-- 내 건물 관리 페이지 -->');

// 2. Modify showView
content = content.replace(
    /if\s*\(\s*document\.getElementById\('add-building-view'\)\s*\)\s*document\.getElementById\('add-building-view'\)\.classList\.add\('hidden'\);/g,
    `if(document.getElementById('add-building-view')) document.getElementById('add-building-view').classList.add('hidden');
            if(document.getElementById('ocr-extraction-view')) document.getElementById('ocr-extraction-view').classList.add('hidden');`
);
content = content.replace(
    /\} else if \(viewName === 'add-building-view'\) \{([\s\S]*?)document\.getElementById\('add-building-view'\)\.classList\.remove\('hidden'\);([\s\S]*?)\}/g,
    `} else if (viewName === 'add-building-view') {
                document.getElementById('add-building-view').classList.remove('hidden');
            } else if (viewName === 'ocr-extraction-view') {
                document.getElementById('ocr-extraction-view').classList.remove('hidden');
            }`
);

fs.writeFileSync('server.js', content, 'utf8');
console.log('HTML and showView updated.');
