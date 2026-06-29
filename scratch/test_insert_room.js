const fs = require('fs');

let url = 'https://pwcoopfawdcuknvaywqf.supabase.co';
let key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y29vcGZhd2RjdWtudmF5d3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzgzOTgsImV4cCI6MjA5NzIxNDM5OH0.wzjD3J5GI9ULc76z4-PtBlPZXjZ3VzZslEHrN7pUWp0';

async function testInsert() {
    console.log('\n--- Testing room insertion ---');
    // First, let's fetch a building ID to use as a foreign key.
    try {
        const buildRes = await fetch(`${url}/rest/v1/buildings?limit=1`, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const buildings = await buildRes.json();
        if (buildings.length === 0) {
            console.log('No buildings found to test insertion.');
            return;
        }
        const b = buildings[0];
        console.log('Using building:', b.id, b.name);

        // Try inserting the contract
        const contractPayload = {
            building_id: b.id,
            owner_id: b.owner_id,
            status: 'manual',
            room_number: '999호_테스트',
            room_count: 1,
            room_type: '원룸',
            room_status: '공실',
            bathroom_count: 1,
            living_room_count: 0,
            veranda_count: 1,
            deposit: 0,
            monthly_rent: 0,
            maintenance_fee: 0,
            cleaning_fee: 0
        };

        const res = await fetch(`${url}/rest/v1/contracts`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(contractPayload)
        });
        console.log('Status:', res.status);
        const json = await res.json();
        console.log('Response:', json);
    } catch(err) {
        console.error(err);
    }
}

testInsert();
