const fs = require('fs');
const content = fs.readFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/app.js', 'utf8');

const targetStr = `                        if (session && session.user) {
                            const { data: profile, error: profileError } = await supabaseClient
                                if (profile.role === 'owner') {
                                    const { data: bData, error: bError } = await supabaseClient
                                        .from('buildings')
                                        .select('*')
                                        .eq('owner_id', session.user.id);
                                    
                                    if (!bError && bData && bData.length > 0) {
                                        ownerBuildings = bData;
                                        markUserVerified(); // 건물이 있으면 2차 인증 완료로 처리
                                    }
                                }`;

const replacementStr = `                        if (session && session.user) {
                            const { data: profile, error: profileError } = await supabaseClient
                                .from('profiles')
                                .select('*')
                                .eq('id', session.user.id)
                                .single();

                            if (!profileError && profile) {
                                globalUserRole = profile.role;
                                const namePrefix = profile.name;
                                if (document.getElementById('main-display-name')) {
                                    document.getElementById('main-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                if (document.getElementById('owner-display-name')) {
                                    document.getElementById('owner-display-name').innerHTML = namePrefix + ' 파트너 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                if (document.getElementById('tenant-display-name')) {
                                    document.getElementById('tenant-display-name').innerHTML = namePrefix + ' 입주민 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                if (document.getElementById('auth-display-name')) {
                                    document.getElementById('auth-display-name').innerHTML = namePrefix + ' 님 <i class="fa-solid fa-chevron-down" style="font-size: 10px;"></i>';
                                }
                                
                                isAuthenticated = false; // 기본값

                                // 임대인일 경우 등록된 건물 가져오기
                                if (profile.role === 'owner') {
                                    const { data: bData, error: bError } = await supabaseClient
                                        .from('buildings')
                                        .select('*')
                                        .eq('owner_id', session.user.id);
                                    
                                    if (!bError && bData && bData.length > 0) {
                                        ownerBuildings = bData;
                                        markUserVerified(); // 건물이 있으면 2차 인증 완료로 처리
                                    }
                                }`;

// CRLF나 LF 차이 극복을 위해 모든 줄바꿈을 \n으로 정규화하여 교체 시도
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
const normalizedReplacement = replacementStr.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/app.js', newContent, 'utf8');
    console.log('Successfully fixed app.js');
} else {
    console.log('Target string not found in app.js. Trying line by line replacement.');
    // 라인 단위 교체 시도
    const lines = normalizedContent.split('\n');
    const startIdx = lines.findIndex(l => l.includes("const { data: profile, error: profileError } = await supabaseClient"));
    if (startIdx !== -1 && lines[startIdx + 1].includes("if (profile.role === 'owner')")) {
        const replacementLines = normalizedReplacement.split('\n');
        // 'if (session && session.user) {' 부분이 1줄 위에 있음
        const outerStart = startIdx - 1;
        // 'if (profile.role === owner)'의 끝인 '}'가 몇 줄 밑에 있는지 검색
        let outerEnd = startIdx + 1;
        while (outerEnd < lines.length && !lines[outerEnd].includes('is_verified 처리')) {
            outerEnd++;
        }
        // 'is_verified 처리' 바로 직전에 닫는 중괄호가 2개 있어야 함
        const count = 2;
        let deleteEnd = outerEnd - 1;
        while (deleteEnd > startIdx && lines[deleteEnd].trim() === '') {
            deleteEnd--;
        }
        
        lines.splice(outerStart, deleteEnd - outerStart + 1, ...replacementLines);
        fs.writeFileSync('c:/Users/bird3/100 shop/ModooRoom/public/js/app.js', lines.join('\n'), 'utf8');
        console.log('Successfully fixed app.js via line interpolation');
    } else {
        console.error('Failed to locate target content');
    }
}
