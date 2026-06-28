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

async function testFetch() {
    console.log('\n--- Querying buildings ---');
    try {
        const res = await fetch(`${url}/rest/v1/buildings?select=*&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await res.json();
        console.log('Status:', res.status);
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('Sample Record:', data[0]);
        } else {
            console.log('No data or error:', data);
        }
    } catch(err) {
        console.error(err);
    }
}

testFetch();
