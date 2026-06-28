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

const columnsToTest = [
    'broker_registration_no', 'broker_reg_number', 'broker_registration_number', 'broker_reg_no'
];

async function testFetch() {
    console.log('\n--- Finding which registration columns exist in contracts table ---');
    for (const col of columnsToTest) {
        try {
            const payload = { building_id: '00000000-0000-0000-0000-000000000000' };
            payload[col] = 'test';
            
            const res = await fetch(`${url}/rest/v1/contracts`, {
                method: 'POST',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (res.status === 400 && json.message && json.message.includes('Could not find')) {
                // Column does not exist
            } else {
                console.log(`Column SUCCESS or other error for [${col}]: Status ${res.status}`, json);
            }
        } catch(err) {
            console.error(col, err);
        }
    }
}

testFetch();
