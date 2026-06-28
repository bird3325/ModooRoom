const fs = require('fs');
const path = require('path');

let url = '';
let key = '';
try {
    const envPath = 'c:/Users/bird3/100 shop/ModooRoom/.env';
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const k = match[1];
                let v = (match[2] || '').trim();
                if (k === 'SUPABASE_URL') url = v;
                if (k === 'SUPABASE_ANON_KEY') key = v;
            }
        });
    }
} catch(e) {
    console.error(e);
}

url = url.replace(/[\r\n]/g, '').trim();
key = key.replace(/[\r\n]/g, '').trim();

async function runMockSave() {
    console.log('\n--- Simulating room detail save logic ---');
    try {
        // Step 1: Simulate check existing broker
        const brokerRegNo = 'MOCK-REG-12345';
        const brokerAgency = '테스트공인중개사';
        const brokerRep = '이중개';
        const brokerAddress = '서울시 마포구';
        const brokerPhone = '02-111-2222';
        
        console.log('1. Checking existing broker in database...');
        const selectRes = await fetch(`${url}/rest/v1/brokers?registration_no=eq.${brokerRegNo}`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const selectData = await selectRes.json();
        console.log('Select result status:', selectRes.status, selectData);
        
        // Since table might not be migrated yet on live db, we expect this check to help us confirm if RLS/schema error occurs.
    } catch(err) {
        console.error(err);
    }
}

runMockSave();
