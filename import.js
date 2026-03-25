const fs = require('fs');

async function run() {
    const catalog = JSON.parse(fs.readFileSync('./Embrace/src/data/jewelryCatalog.json', 'utf8'));

    const authRes = await fetch('http://127.0.0.1:8090/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'temp_admin@test.com', password: 'password123456' })
    }).then(r => r.json());
    
    if(!authRes.token) {
        console.error("Auth failed:", authRes);
        return;
    }
    const token = authRes.token;

    const productsRes = await fetch('http://127.0.0.1:8090/api/collections/products/records?perPage=500', {
        headers: { 'Authorization': token }
    }).then(r => r.json());

    const records = productsRes.items;
    console.log(`Found ${records.length} records in PB.`);
    
    const parseNum = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(/[^0-9.-]+/g,"")) || 0;
    };

    let updatedCount = 0;

    for (const jsonItem of catalog.jewelryCatalog) {
        const record = records.find(r => r.product_id === jsonItem.productId || r.description === jsonItem.description);
        
        if (record) {
            const payload = {
                name: jsonItem.name || '',
                shape: jsonItem.shape || '',
                color: jsonItem.color || '',
                clarity: jsonItem.clarity || '',
                carat: jsonItem.carat || '',
                replacement_value: parseNum(jsonItem.replacementValue)
            };

            const patchRes = await fetch(`http://127.0.0.1:8090/api/collections/products/records/${record.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(payload)
            }).then(r => r.json());

            if (patchRes.id) updatedCount++;
            else console.error("Failed to patch:", patchRes);
        }
    }
    
    console.log(`Successfully mapped and updated ${updatedCount} records to include the new master fields.`);
}

run();
