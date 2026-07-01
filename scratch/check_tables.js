process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');

let url = '';
let key = '';
try {
    const envPath = path.join(__dirname, '../.env');
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

async function checkTable(tableName) {
    try {
        const res = await fetch(`${url}/rest/v1/${tableName}?limit=1`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        console.log(`Table '${tableName}' check: status = ${res.status}`);
        return res.status;
    } catch(err) {
        console.error(`Error checking '${tableName}':`, err);
        return 500;
    }
}

async function run() {
    await checkTable('complaints');
    await checkTable('inventory_items');
    await checkTable('inventory_transactions');
}

run();
