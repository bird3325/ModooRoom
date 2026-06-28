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

// script 안의 JS 영역 추출
const startIndex = content.indexOf('<script>');
const endIndex = content.lastIndexOf('</script>');
const jsCode = content.substring(startIndex, endIndex);

// 8개 함수명 정의
const authFuncNames = [
    'markUserVerified', 'saveMyInfo', 'renderAuthPage',
    'handleLogin', 'handleSignup', 'handleLogout', 'authenticateRole', 'goToDashboard'
];

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

    // 함수의 온전한 끝 중괄호를 구하기 위해 괄호 밸런스를 측정
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

const extracted = [];

for (const name of authFuncNames) {
    let code = extractFunction(jsCode, name);
    if (code) {
        if (name === 'markUserVerified') {
            code = `function markUserVerified() {
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
        }`;
        }
        extracted.push(code);
        console.log(`Extracted: ${name}`);
    } else {
        console.error(`FAILED to extract: ${name}`);
    }
}

// views/authController.js에 덮어쓰기
const outPath = 'c:/Users/bird3/100 shop/ModooRoom/public/js/views/authController.js';
fs.writeFileSync(outPath, extracted.join('\n\n'), 'utf8');
console.log('Regenerated clean authController.js!');
