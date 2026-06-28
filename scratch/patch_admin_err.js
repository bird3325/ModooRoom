const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '../public/js/views/adminController.js');
let content = fs.readFileSync(adminPath, 'utf8');

// Find function toggleVerification
const anchor = "function toggleVerification(id, currentStatus) {";
const startIdx = content.indexOf(anchor);

if (startIdx !== -1) {
    // Find the end of this function (matching brace)
    let braceCount = 0;
    let endIdx = -1;
    let started = false;
    
    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            started = true;
        } else if (content[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
    
    if (endIdx !== -1) {
        const before = content.substring(0, startIdx);
        const after = content.substring(endIdx);
        
        // Use backticks for multi-line string in showModalAlert to avoid SyntaxError
        const newFunc = `function toggleVerification(id, currentStatus) {
            if (!supabaseClient) return;
            showModalConfirm(currentStatus ? '2차 인증을 취소하시겠습니까?' : '2차 인증을 수동으로 승인하시겠습니까?', async (res) => {
                if (!res) return;
                
                const { error } = await supabaseClient.from('profiles').update({ is_verified: !currentStatus }).eq('id', id);
                if (error) {
                    if (error.message && error.message.includes('is_verified')) {
                        showModalAlert(\`데이터베이스(profiles)에 is_verified 컬럼이 없습니다.
Supabase SQL Editor에서 profiles 테이블에 is_verified (boolean) 컬럼을 추가해 주세요.

(로컬 테스트를 위해 화면 상에서 승인 상태를 임시로 강제 전환합니다.)\`);
                        // 로컬 메모리 데이터를 강제로 토글하여 테스트를 우회 진행할 수 있도록 처리
                        const userIdx = adminUsersData.findIndex(u => u.id === id);
                        if (userIdx !== -1) {
                            adminUsersData[userIdx].is_verified = !currentStatus;
                            renderAdminUsers(adminUsersData);
                        }
                    } else {
                        showModalAlert('인증 상태 변경 실패: ' + error.message);
                    }
                    return;
                }
                loadAdminUsers();
            });
        }`;
        
        fs.writeFileSync(adminPath, before + newFunc + after, 'utf8');
        console.log('Successfully patched adminController.js toggleVerification with safe multiline template literal!');
    } else {
        console.error('Failed to locate end of toggleVerification');
    }
} else {
    console.error('Failed to locate toggleVerification start in adminController.js');
}

// Append missing functions
const missingFuncs = `

// MANUALLY RESTORED: openAdminEditModal
function openAdminEditModal(id, name, phone) {
    const editId = document.getElementById('admin-edit-id');
    const editName = document.getElementById('admin-edit-name');
    const editPhone = document.getElementById('admin-edit-phone');
    const editModal = document.getElementById('admin-edit-modal');
    
    if (editId) editId.value = id;
    if (editName) editName.value = name;
    if (editPhone) editPhone.value = phone;
    if (editModal) editModal.classList.remove('hidden');
}

// MANUALLY RESTORED: closeAdminEditModal
function closeAdminEditModal() {
    const editModal = document.getElementById('admin-edit-modal');
    if (editModal) editModal.classList.add('hidden');
}

// MANUALLY RESTORED: saveAdminUserEdit
async function saveAdminUserEdit() {
    const id = document.getElementById('admin-edit-id').value;
    const name = document.getElementById('admin-edit-name').value;
    const phone = document.getElementById('admin-edit-phone').value;

    const { error } = await supabaseClient.from('profiles').update({ name, phone }).eq('id', id);
    if (error) {
        showModalAlert('수정 실패: ' + error.message);
        return;
    }
    showModalAlert('수정되었습니다.');
    closeAdminEditModal();
    loadAdminUsers();
}
`;

content = fs.readFileSync(adminPath, 'utf8');
if (!content.includes('function openAdminEditModal')) {
    fs.writeFileSync(adminPath, content + missingFuncs, 'utf8');
    console.log('Successfully appended missing admin modal functions!');
} else {
    console.log('Admin modal functions already exist in adminController.js');
}
