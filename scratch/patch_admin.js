const fs = require('fs');

const adminPath = 'c:/Users/bird3/100 shop/ModooRoom/public/js/views/adminController.js';
let content = fs.readFileSync(adminPath, 'utf8');

const targetStr = `function toggleVerification(id, currentStatus) {
            if (!supabaseClient) return;
            showModalConfirm(currentStatus ? '2차 인증을 취소하시겠습니까?' : '2차 인증을 수동으로 승인하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
                if (error) {
                    showModalAlert('인증 상태 변경 실패: ' + error.message);
                    return;
                }
                loadAdminUsers();
            });
        }`;

const replacementStr = `function toggleVerification(id, currentStatus) {
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

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
const normalizedReplacement = replacementStr.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
    const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync(adminPath, newContent, 'utf8');
    console.log('Successfully patched adminController.js with is_verified guard!');
} else {
    console.error('Failed to locate target toggleVerification function in adminController.js');
}
