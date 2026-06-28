const fs = require('fs');

let content = '';
try {
    const raw = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/old_index.html');
    if (raw[0] === 0xff && raw[1] === 0xfe) {
        content = raw.toString('utf16le');
    } else {
        content = raw.toString('utf8');
    }
} catch(e) {
    console.error(e);
}

const startIndex = content.indexOf('<script>');
const endIndex = content.lastIndexOf('</script>');
const jsCode = content.substring(startIndex, endIndex);

function extractFunction(content, funcName) {
    const regexList = [
        new RegExp(`(?:async\\s+)?function\\s+${funcName}\\s*\\(`, 'g'),
        new RegExp(`(?:const|let|var)\\s+${funcName}\\s*=\\s*(?:async\\s*)?\\(`, 'g')
    ];
    let match = null;
    let foundIndex = -1;
    let matchedPattern = null;

    for (const r of regexList) {
        r.lastIndex = 0;
        match = r.exec(content);
        if (match) {
            foundIndex = match.index;
            matchedPattern = match[0];
            break;
        }
    }

    if (foundIndex === -1) return null;

    let braceIndex = content.indexOf('{', foundIndex + matchedPattern.length - 1);
    if (braceIndex === -1) return null;

    let braceCount = 1;
    let i = braceIndex + 1;
    while (braceCount > 0 && i < content.length) {
        const char = content[i];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        i++;
    }

    if (braceCount === 0) {
        return content.substring(foundIndex, i);
    }
    return null;
}

// toggleVerification과 openAdminEditModal 추출
let toggleVerifCode = `function toggleVerification(id, currentStatus) {
    if (!supabaseClient) return;
    showModalConfirm(currentStatus ? '2차 인증을 취소하시겠습니까?' : '2차 인증을 수동으로 승인하시겠습니까?', async (res) => {
        if (!res) return;
        
        const { error } = await supabaseClient.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
        if (error) {
            if (error.message.includes('is_verified')) {
                showModalAlert('데이터베이스(profiles)에 is_verified 컬럼이 없습니다.\\nSupabase SQL Editor에서 profiles 테이블에 is_verified (boolean) 컬럼을 추가해 주세요.');
            } else {
                showModalAlert('인증 상태 변경 실패: ' + error.message);
            }
            return;
        }
        loadAdminUsers();
    });
}`;

let openModalCode = extractFunction(jsCode, 'openAdminEditModal');

if (toggleVerifCode && openModalCode) {
    const adminPath = 'c:/Users/bird3/100 shop/ModooRoom/public/js/views/adminController.js';
    const adminContent = fs.readFileSync(adminPath, 'utf8');
    
    // 지워진 영역 바로 위인 '건물 정보를 불러오지 못했습니다.' 가 포함된 중괄호 닫기 라인 찾기
    const targetAnchor = `loadingTr.innerHTML = '<td colspan="6" style="padding: 15px; background: #fff5f5; text-align: center; color: #e53e3e; font-size: 13px;">건물 정보를 불러오지 못했습니다.</td>';
            }`;
            
    const targetAnchorIdx = adminContent.indexOf(targetAnchor);
    if (targetAnchorIdx !== -1) {
        const insertionIdx = targetAnchorIdx + targetAnchor.length;
        const restoredAdmin = adminContent.substring(0, insertionIdx) + "\n\n" + toggleVerifCode + "\n\n" + openModalCode + "\n\n" + adminContent.substring(insertionIdx);
        fs.writeFileSync(adminPath, restoredAdmin, 'utf8');
        console.log('Successfully restored adminController.js functions!');
    } else {
        console.error('Failed to locate insertion point in adminController.js');
    }
} else {
    console.error('Failed to extract original functions');
}
