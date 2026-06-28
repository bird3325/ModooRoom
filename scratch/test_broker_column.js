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

// Clean url and key
url = url.replace(/[\r\n]/g, '').trim();
key = key.replace(/[\r\n]/g, '').trim();

async function testFetch() {
    console.log('\n--- Checking schema by calling RPC or attempting POST schema violation ---');
    try {
        const res = await fetch(`${url}/rest/v1/contracts`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                building_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID to trigger parser validation before db check
                broker_agency: 'test'
            })
        });
        console.log('Status:', res.status);
        const json = await res.json();
        console.log('Result:', json);
    } catch(err) {
        console.error(err);
    }
}

testFetch();
