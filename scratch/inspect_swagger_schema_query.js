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
    console.log('\n--- Querying API definition from Supabase root endpoint ---');
    try {
        const res = await fetch(`${url}/rest/v1/?apikey=${key}`, {
            method: 'GET'
        });
        console.log('Status:', res.status);
        const json = await res.json();
        const contractsDef = json.definitions?.contracts;
        if (contractsDef) {
            console.log('Contracts Columns:', Object.keys(contractsDef.properties));
            console.log('Broker related properties:', Object.keys(contractsDef.properties).filter(k => k.includes('broker')));
        } else {
            console.log('Contracts definition not found. Definitions list:', Object.keys(json.definitions || {}));
        }
    } catch(err) {
        console.error(err);
    }
}

testFetch();
