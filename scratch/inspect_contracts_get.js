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
    console.log('\n--- Querying contracts table schema using GET ---');
    try {
        const res = await fetch(`${url}/rest/v1/contracts?limit=1`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Prefer': 'count=exact'
            }
        });
        console.log('Status:', res.status);
        const text = await res.json();
        console.log('Sample Row keys:', text.length > 0 ? Object.keys(text[0]) : 'No rows');
    } catch(err) {
        console.error(err);
    }
}

testFetch();
