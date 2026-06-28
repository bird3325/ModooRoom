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

async function runTestExtract() {
    console.log('\n--- Testing Gemini Extraction API via post request ---');
    try {
        const payload = {
            imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            apiKey: 'invalid_key_testing_error'
        };
        const res = await fetch(`http://localhost:3000/api/gemini-extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        console.log('Status code:', res.status);
        const json = await res.json();
        console.log('Response body:', json);
    } catch(err) {
        console.error(err);
    }
}

runTestExtract();
