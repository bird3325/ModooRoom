const fs = require('fs');

// old_index.html에서 script 태그 내부의 자바스크립트 전체를 가져와서 
// markUserVerified와 saveMyInfo를 다시 정교하게 추출합니다.
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

// script 태그 영역 찾기
const scriptStartIdx = content.indexOf('<script src="/js/app.js">'); // 아, index.html에는 app.js가 있고 js 로직은 index.html 내부에 있었을 수 있습니다.
// old_index.html을 직접 확인해 봅니다.
const scriptLines = content.split('\n');

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

// old_index.html의 script 내용 추출
const startIndex = content.indexOf('<script>');
const endIndex = content.lastIndexOf('</script>');
if (startIndex !== -1 && endIndex !== -1) {
    const jsCode = content.substring(startIndex, endIndex);
    const func1 = extractFunction(jsCode, 'markUserVerified');
    const func2 = extractFunction(jsCode, 'saveMyInfo');
    
    console.log('markUserVerified extracted:', !!func1);
    console.log('saveMyInfo extracted:', !!func2);
    
    // authController.js를 다시 온전한 상태로 조립합니다.
    const authControllerContent = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/views/authController.js', 'utf8');
    
    // authControllerContent에 saveMyInfo가 온전히 살아있으므로 앞에 markUserVerified만 조립해서 덮어씁니다.
    const restoredCode = `function markUserVerified() {
            isAuthenticated = true;
            if (supabaseClient) {
                supabaseClient.auth.getSession().then(({ data: { session } }) => {
                    if (session && session.user) {
                        supabaseClient.from('profiles').update({ is_verified: true }).eq('id', session.user.id).then(({ error }) => {
                            if (error && error.message.includes('is_verified')) {
                                console.warn('Supabase profiles 테이블에 is_verified 컬럼이 없습니다. (DB 스키마 추가 필요)');
                            }
                        });
                    }
                });
            }
        }\n\n` + authControllerContent;
        
    fs.writeFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/views/authController.js', restoredCode, 'utf8');
    console.log('Successfully restored authController.js with guard logic!');
} else {
    console.error('Failed to extract scripts from old_index.html');
}
