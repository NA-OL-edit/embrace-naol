const fs = require('fs');

async function run() {
    // 📥 Load JSON
    const catalog = JSON.parse(
        fs.readFileSync('./Embrace/src/data/jewelryCatalog.json', 'utf8')
    ).jewelryCatalog;

    // 🔐 Authenticate (PocketBase superuser)
    const authRes = await fetch(
        'http://127.0.0.1:8090/api/collections/_superusers/auth-with-password',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identity: 'temp_admin@test.com',
                password: 'password123456'
            })
        }
    ).then(r => r.json());

    if (!authRes.token) {
        console.log('❌ Auth failed');
        return;
    }

    console.log('✅ Authenticated');

    // 📦 Fetch all products
    const productsRes = await fetch(
        'http://127.0.0.1:8090/api/collections/products/records?perPage=500',
        {
            headers: { 'Authorization': authRes.token }
        }
    ).then(r => r.json());

    const records = productsRes.items;

    // 🔧 Helpers
    const parseNum = (val) => {
        if (!val || val === 'N/A') return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(/[^0-9.-]+/g, "")) || 0;
    };

    const cleanStr = (val) => {
        if (!val || val === 'N/A') return '';
        return val.toString().trim();
    };

    let updatedCount = 0;
    let skippedCount = 0;

    // 🔁 Loop through JSON
    for (const jsonItem of catalog) {

        if (!jsonItem.productId) {
            console.log(`⚠️ Skipped (no productId): ${jsonItem.name}`);
            skippedCount++;
            continue;
        }

        // ✅ STRICT MATCH ONLY
        const record = records.find(r =>
            r.product_id === jsonItem.productId
        );

        if (!record) {
            console.log(`⚠️ No match in DB: ${jsonItem.productId}`);
            skippedCount++;
            continue;
        }

        // 🧠 Build payload
        const payload = {
            // BASIC
            name: cleanStr(jsonItem.name),
            product_id: cleanStr(jsonItem.productId),

            shape: cleanStr(jsonItem.shape),
            color: cleanStr(jsonItem.color),
            clarity: cleanStr(jsonItem.clarity),
            carat: cleanStr(jsonItem.carat),

            description: cleanStr(jsonItem.description),

            // MAIN DIAMOND
            main_diamond_shape: cleanStr(jsonItem.mainDiamondShape),
            main_diamond_weight: parseNum(jsonItem.mainDiamondWeight),
            main_diamond_clarity: cleanStr(jsonItem.mainDiamondClarity),
            main_diamond_color: cleanStr(jsonItem.mainDiamondColor),

            cut: cleanStr(jsonItem.cut),
            symmetry: cleanStr(jsonItem.symmetry),
            polish: cleanStr(jsonItem.polish),

            // SECONDARY
            secondary_diamond_weight: parseNum(jsonItem.secondaryDiamondWeight),
            secondary_diamond_clarity: cleanStr(jsonItem.secondaryDiamondClarity),
            secondary_diamond_color: cleanStr(jsonItem.secondaryDiamondColor),

            // METAL
            metal_type: cleanStr(jsonItem.metalType),
            metal_purity: cleanStr(jsonItem.metalPurity),
            metal_color: cleanStr(jsonItem.metalColor),
            metal_weight: parseNum(jsonItem.metalWeight),

            // OTHER
            replacement_value: parseNum(jsonItem.replacementValue),
            certification: cleanStr(jsonItem.certification)
        };

        // 🛠 Update record
        await fetch(
            `http://127.0.0.1:8090/api/collections/products/records/${record.id}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authRes.token
                },
                body: JSON.stringify(payload)
            }
        );

        console.log(`✅ Updated: ${jsonItem.productId}`);
        updatedCount++;
    }

    // 📊 Summary
    console.log('\n📊 RESULT:');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⚠️ Skipped: ${skippedCount}`);
}

run();