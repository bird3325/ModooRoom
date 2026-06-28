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

async function runMigration() {
    console.log('\n--- Creating brokers table and updating contracts schema ---');
    
    // We will query check if brokers table exists.
    // However, since we cannot run arbitrary SQL commands easily via PostgREST directly (without postgres raw connection or RPC), 
    // we can check if we can insert/select from brokers, or if there is an RPC we can use.
    // If not, we will inform the user of the SQL script they can run in Supabase SQL editor.
    // Wait, let's see if we can check if brokers table can be accessed.
    try {
        const res = await fetch(`${url}/rest/v1/brokers?limit=1`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        console.log('Status checking brokers table:', res.status);
        if (res.status === 404) {
            console.log('Brokers table does not exist. Please run the SQL migration in Supabase SQL Editor.');
        } else {
            console.log('Brokers table might already exist or is restricted (RLS). Status code:', res.status);
        }
    } catch(err) {
        console.error(err);
    }
}

runMigration();
