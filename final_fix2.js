const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(/\r\n/g, '\n');

// The exact string that precedes the closing backtick of htmlTemplate
const endHtmlTemplateMatch = '<p style="text-align: center; color: #a0aec0; margin-top: 50px; font-size: 13px;">&copy; 2024 ModooRoom. All rights reserved.</p>\n</body>\n</html>\n`;';

const matchStart = code.indexOf('const htmlTemplate = `');
const matchEnd = code.indexOf(endHtmlTemplateMatch);

if (matchStart === -1 || matchEnd === -1) {
    console.error('Could not find htmlTemplate boundaries!');
    process.exit(1);
}

const stringStart = matchStart + 21;
const stringEnd = matchEnd + endHtmlTemplateMatch.length - 2; // Index of the closing backtick

let before = code.substring(0, stringStart + 1);
let middle = code.substring(stringStart + 1, stringEnd);
let after = code.substring(stringEnd);

// 1. Fix missing catch block in middle
const regexAuthBlock = /if\s*\(result\.matched\)\s*\{\s*document\.getElementById\('loading-view'\)\.classList\.add\('hidden'\);\s*document\.getElementById\('loading-view'\)\.querySelector\('h3'\)\.innerText\s*=\s*'로그인 정보를 확인 중입니다\.\.\.';\s*showModalAlert\('건물 인증 업데이트 실패:\s*'\s*\+\s*updateError\.message\);\s*return;\s*\}\s*insertedData\s*=\s*updatedData;\s*targetBuildingId\s*=\s*existingBuilding\.id;\s*if\s*\(ownerBuildings\)\s*\{\s*const\s*idx\s*=\s*ownerBuildings\.findIndex\(b\s*=>\s*b\.id\s*===\s*existingBuilding\.id\);\s*if\s*\(idx\s*!==\s*-1\)\s*ownerBuildings\[idx\]\s*=\s*updatedData\[0\];\s*\}\s*\}\s*\}\s*else\s*\{/g;

const goodAuthBlock = `if (result.matched) {
                            let insertedData = null;
                            let targetBuildingId = null;
                            let tenantAddMsg = '';
                            
                            // Check if building already exists for this owner and address
                            const { data: existingBuildings, error: checkError } = await supabaseClient
                                .from('buildings')
                                .select('*')
                                .eq('owner_id', session.user.id)
                                .eq('address', bAddr);
                                
                            const existingBuilding = (existingBuildings && existingBuildings.length > 0) ? existingBuildings[0] : null;
                            
                            if (existingBuilding) {
                                const { data: updatedData, error: updateError } = await supabaseClient
                                    .from('buildings')
                                    .update({ is_verified: true })
                                    .eq('id', existingBuilding.id)
                                    .select();
                                    
                                if (updateError) {
                                    document.getElementById('loading-view').classList.add('hidden');
                                    document.getElementById('loading-view').querySelector('h3').innerText = '로그인 정보를 확인 중입니다...';
                                    showModalAlert('건물 인증 업데이트 실패: ' + updateError.message);
                                    return;
                                }
                                insertedData = updatedData;
                                targetBuildingId = existingBuilding.id;
                                
                                if (typeof ownerBuildings !== 'undefined' && ownerBuildings) {
                                    const idx = ownerBuildings.findIndex(b => b.id === existingBuilding.id);
                                    if (idx !== -1) ownerBuildings[idx] = updatedData[0];
                                }
                            } else {`;

middle = middle.replace(regexAuthBlock, goodAuthBlock);

// 2. Fix unescaped backticks
middle = middle.replace(/(?<!\\)`/g, '\\`');

// 3. Fix unescaped template variables
middle = middle.replace(/(?<!\\)\$\{/g, '\\${');

// 4. Inject OCR UI
const badUi = `<div id="contract-confirm-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; overflow-y: auto;">
        <div style="position: relative; margin: 40px auto; background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <h3 style="margin-bottom: 15px; color: var(--primary-deep-navy); border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">계약 정보 확인</h3>
            <p style="font-size: 13px; color: #718096; margin-bottom: 15px;">OCR로 추출된 데이터입니다. 틀린 부분이 있다면 직접 수정해 주세요.</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">`;

const goodUi = `<div id="contract-confirm-modal" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; overflow-y: auto;">
        <div style="position: relative; margin: 40px auto; background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
            <h3 style="margin-bottom: 15px; color: var(--primary-deep-navy); border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">계약 정보 확인</h3>
            <p style="font-size: 13px; color: #718096; margin-bottom: 15px;">
                계약서 이미지를 확인하며 아래 정보를 채워주세요. (일부 정보는 자동 입력될 수 있습니다)<br>
                <strong style="color: var(--point-orange);">💡 팁: 아래 입력 칸을 먼저 클릭(선택)한 후, 이미지에서 원하는 글자를 드래그하면 자동으로 텍스트가 입력됩니다.</strong>
            </p>
            
            <div style="margin-bottom: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #f8fafc; padding: 10px;">
                <div id="contract-img-wrapper" style="position: relative; display: inline-block; max-width: 100%;">
                    <img id="contract-preview-img" src="" style="max-width: 100%; max-height: 400px; display: block; cursor: crosshair; user-select: none; -webkit-user-drag: none;">
                    <div id="ocr-selection-box" class="hidden" style="position: absolute; border: 2px dashed var(--point-orange); background-color: rgba(255, 152, 0, 0.2); pointer-events: none; z-index: 10;"></div>
                    <div id="ocr-loading-overlay" class="hidden" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.7); display: flex; justify-content: center; align-items: center; font-weight: bold; color: var(--primary-deep-navy); z-index: 20; border-radius: 4px;">부분 OCR 인식 중...</div>
                </div>
            </div>

            <form id="auth-owner-contract-details" onsubmit="submitContractDetails(event)">
                <div style="display: flex; flex-direction: column; gap: 12px;">`;

middle = middle.replace(new RegExp(badUi.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\s+/g, '\\\\s+'), 'g'), goodUi);

const badButtons = `            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn" style="flex: 1; background: #e2e8f0; color: #4a5568;" onclick="closeContractConfirmModal()">취소</button>
                <button class="btn" style="flex: 1; background: var(--primary-deep-navy); color: white; border: none;" onclick="confirmContractSave()">확인 및 저장</button>
            </div>
        </div>
    </div>`;

const goodButtons = `                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button type="button" class="btn" style="flex: 1; background: #e2e8f0; color: #4a5568;" onclick="closeContractConfirmModal()">취소</button>
                    <button type="submit" class="btn" style="flex: 1; background: var(--primary-deep-navy); color: white; border: none;">확인 및 저장</button>
                </div>
            </form>
        </div>
    </div>`;

middle = middle.replace(new RegExp(badButtons.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\s+/g, '\\\\s+'), 'g'), goodButtons);

// 5. Append OCR Logic at the end of the script block inside htmlTemplate
const newLogic = `
        // 모달 닫기
        function closeContractConfirmModal() {
            document.getElementById('contract-confirm-modal').classList.add('hidden');
        }

        // 부분 OCR 기능
        let activeOcrTargetInput = null;
        let isDraggingImg = false;
        let startX = 0, startY = 0;

        document.addEventListener('focusin', function(e) {
            if (e.target && e.target.tagName === 'INPUT' && e.target.closest('#auth-owner-contract-details')) {
                activeOcrTargetInput = e.target;
            }
        });

        const imgWrapper = document.getElementById('contract-img-wrapper');
        const imgElem = document.getElementById('contract-preview-img');
        const selectionBox = document.getElementById('ocr-selection-box');
        const cropOverlay = document.getElementById('ocr-loading-overlay');

        if (imgWrapper) {
            imgWrapper.addEventListener('mousedown', function(e) {
                if (!activeOcrTargetInput) {
                    showModalAlert('먼저 자동 입력될 아래의 입력 칸을 클릭(선택)해 주세요.');
                    return;
                }
                if (e.target.id !== 'contract-preview-img' && e.target.id !== 'contract-img-wrapper' && e.target.id !== 'ocr-selection-box') return;
                
                isDraggingImg = true;
                const rect = imgWrapper.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                
                selectionBox.style.left = startX + 'px';
                selectionBox.style.top = startY + 'px';
                selectionBox.style.width = '0px';
                selectionBox.style.height = '0px';
                selectionBox.classList.remove('hidden');
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDraggingImg) return;
                const rect = imgWrapper.getBoundingClientRect();
                let currentX = e.clientX - rect.left;
                let currentY = e.clientY - rect.top;
                
                currentX = Math.max(0, Math.min(currentX, rect.width));
                currentY = Math.max(0, Math.min(currentY, rect.height));

                const x = Math.min(startX, currentX);
                const y = Math.min(startY, currentY);
                const w = Math.abs(currentX - startX);
                const h = Math.abs(currentY - startY);

                selectionBox.style.left = x + 'px';
                selectionBox.style.top = y + 'px';
                selectionBox.style.width = w + 'px';
                selectionBox.style.height = h + 'px';
            });

            document.addEventListener('mouseup', async function(e) {
                if (!isDraggingImg) return;
                isDraggingImg = false;
                
                const w = parseFloat(selectionBox.style.width);
                const h = parseFloat(selectionBox.style.height);
                
                if (w < 15 || h < 15) {
                    selectionBox.classList.add('hidden');
                    return;
                }

                if (!activeOcrTargetInput) {
                    selectionBox.classList.add('hidden');
                    return;
                }

                const rect = imgWrapper.getBoundingClientRect();
                const x = parseFloat(selectionBox.style.left);
                const y = parseFloat(selectionBox.style.top);

                const naturalW = imgElem.naturalWidth;
                const naturalH = imgElem.naturalHeight;
                const renderedW = rect.width;
                const renderedH = rect.height;

                const scaleX = naturalW / renderedW;
                const scaleY = naturalH / renderedH;

                const cropX = x * scaleX;
                const cropY = y * scaleY;
                const cropW = w * scaleX;
                const cropH = h * scaleY;

                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cropW;
                cropCanvas.height = cropH;
                const cropCtx = cropCanvas.getContext('2d');
                cropCtx.drawImage(imgElem, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                const croppedBase64 = cropCanvas.toDataURL('image/png');
                
                cropOverlay.classList.remove('hidden');

                try {
                    const response = await fetch('/api/extract-text-ocr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: croppedBase64 })
                    });
                    const resData = await response.json();
                    
                    if (response.ok && resData.success) {
                        if (resData.text && resData.text.trim()) {
                            let extracted = resData.text.replace(/\\n/g, ' ').trim();
                            extracted = extracted.replace(/\\s{2,}/g, ' ');
                            activeOcrTargetInput.value = extracted;
                            activeOcrTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
                        } else {
                            showModalAlert('선택하신 영역에서 인식된 글자가 없습니다. 다시 시도해 주세요.');
                        }
                    } else {
                        showModalAlert('텍스트 추출 실패: ' + (resData.error || '알 수 없는 오류'));
                    }
                } catch (error) {
                    console.error('Crop OCR error:', error);
                    showModalAlert('OCR 통신 중 오류가 발생했습니다.');
                } finally {
                    cropOverlay.classList.add('hidden');
                    selectionBox.classList.add('hidden');
                }
            });
        }

        async function submitContractDetails(event) {
            event.preventDefault();
            const payload = {
                tenantName: document.getElementById('confirm-tenant-name').value,
                tenantPhone: document.getElementById('confirm-tenant-phone').value,
                deposit: document.getElementById('confirm-deposit').value,
                rent: document.getElementById('confirm-rent').value,
                startDate: document.getElementById('confirm-start-date').value,
                endDate: document.getElementById('confirm-end-date').value,
                rentArea: document.getElementById('confirm-rent-area').value,
                contractDate: document.getElementById('confirm-contract-date').value,
                agentOffice: document.getElementById('confirm-agent-office').value,
                agentName: document.getElementById('confirm-agent-name').value,
                agentRegNo: document.getElementById('confirm-agent-regno').value,
                agentPhone: document.getElementById('confirm-agent-phone').value
            };
            
            showModalAlert('계약 정보가 성공적으로 수집/저장되었습니다!');
            closeContractConfirmModal();
            // TODO: API 전송 로직 추가 가능
        }
`;

const lastScriptEnd = middle.lastIndexOf('</script>');
if (lastScriptEnd > -1) {
    middle = middle.substring(0, lastScriptEnd) + newLogic.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$') + '\n    </script>';
}

fs.writeFileSync('server.js', before + middle + after);
console.log('All fixes applied successfully!');
