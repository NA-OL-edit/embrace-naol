const fs = require('fs');

async function run() {
    const catalog = JSON.parse(fs.readFileSync('./Embrace/src/data/jewelryCatalog.json', 'utf8')).jewelryCatalog;

    const authRes = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'temp_admin@test.com', password: 'password123456' })
    }).then(r => r.json());
    
    if(!authRes.token) return;

    const productsRes = await fetch('http://127.0.0.1:8090/api/collections/products/records?perPage=500', {
        headers: { 'Authorization': authRes.token }
    }).then(r => r.json());

    const records = productsRes.items;
    console.log(`Found ${records.length} records in PB.`);
    
    let matchedCount = 0;
    for (const jsonItem of catalog) {
        // Find matching record based on how they were incorrectly mapped previously
        const record = records.find(r => r.description === jsonItem.name || r.product_id === jsonItem.id || r.product_id === jsonItem.productId);
        if (record) matchedCount++;
        else console.log("Could not find match for:", jsonItem.name);
    }
    console.log("Total matched:", matchedCount);
}
run();
