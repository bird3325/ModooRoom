const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

const ocrViewHtml = `    <!-- 계약서 OCR 추출 뷰 -->
    <div id="ocr-extraction-view" class="hidden">
        <nav class="navbar" style="background: #2d3748;">
            <div class="navbar-brand" style="color: white; cursor: pointer;" onclick="showView('owner-app')">
                <i class="fa-solid fa-arrow-left" style="margin-right: 10px;"></i>
                <span>새 건물 계약 등록 (AI 자동 추출)</span>
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
    </div>\n\n`;

const anchor = '    <!-- 4. 임차인 메인 대시보드 -->';

if (!html.includes('id="ocr-extraction-view"')) {
    html = html.replace(anchor, ocrViewHtml + anchor);
    fs.writeFileSync(indexHtmlPath, html, 'utf8');
    console.log('Successfully injected ocr-extraction-view into index.html');
} else {
    console.log('ocr-extraction-view already exists in index.html');
}
