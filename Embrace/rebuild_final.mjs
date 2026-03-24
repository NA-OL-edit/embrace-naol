const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function rebuild() {
    let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
    });
    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    // Helper to delete a collection if it exists
    async function deleteIfExists(name) {
        let f = await fetch(`${BASE_URL}/api/collections/${name}`, { headers });
        if (f.ok) {
            const col = await f.json();
            let d = await fetch(`${BASE_URL}/api/collections/${col.id}`, { method: 'DELETE', headers });
            console.log(`Deleted ${name}: ${d.status}`);
        }
    }

    await deleteIfExists('products');
    await deleteIfExists('categories');
    await deleteIfExists('logs');
    await deleteIfExists('settings');

    // PocketBase v0.23 autodate fields require onCreate/onUpdate flags
    const autodates = [
        { name: 'created', type: 'autodate', system: true, onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', system: true, onCreate: true, onUpdate: true }
    ];

    async function createCollection(data) {
        let res = await fetch(`${BASE_URL}/api/collections`, {
            method: 'POST', headers, body: JSON.stringify(data)
        });
        let json = await res.json();
        if (!res.ok) console.error(`Failed creating ${data.name}:`, JSON.stringify(json).slice(0, 300));
        else console.log(`Created ${data.name} ✓`);
        return json;
    }

    await createCollection({
        name: 'products', type: 'base', listRule: '', viewRule: '',
        createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
        fields: [
            ...autodates,
            { name: 'product_id', type: 'text' }, { name: 'description', type: 'text' },
            { name: 'main_diamond_shape', type: 'text' }, { name: 'main_diamond_weight', type: 'number' },
            { name: 'main_diamond_clarity', type: 'text' }, { name: 'main_diamond_color', type: 'text' },
            { name: 'cut', type: 'text' }, { name: 'symmetry', type: 'text' }, { name: 'polish', type: 'text' },
            { name: 'secondary_diamond_weight', type: 'number' }, { name: 'secondary_diamond_clarity', type: 'text' },
            { name: 'secondary_diamond_color', type: 'text' }, { name: 'metal_type', type: 'text' },
            { name: 'metal_purity', type: 'text' }, { name: 'metal_color', type: 'text' },
            { name: 'metal_weight', type: 'number' }, { name: 'replacement_value', type: 'number' },
            { name: 'certification', type: 'text' },
            { name: 'image', type: 'file', maxSelect: 1, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] }
        ]
    });

    await createCollection({
        name: 'categories', type: 'base', listRule: null, viewRule: null,
        createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
        fields: [
            ...autodates,
            { name: 'name', type: 'text' },
            { name: 'type', type: 'select', values: ['Diamond', 'Metal cert', 'Album'], maxSelect: 1 },
            { name: 'description', type: 'text' },
            { name: 'status', type: 'select', values: ['active', 'draft'], maxSelect: 1 },
            { name: 'image', type: 'file', maxSelect: 1 }
        ]
    });

    await createCollection({
        name: 'logs', type: 'base',
        listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""', updateRule: null, deleteRule: null,
        fields: [
            ...autodates,
            { name: 'admin_email', type: 'text' }, { name: 'action', type: 'text' }, { name: 'target', type: 'text' }
        ]
    });

    await createCollection({
        name: 'settings', type: 'base', listRule: null, viewRule: null,
        createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
        fields: [...autodates, { name: 'key', type: 'text' }, { name: 'value', type: 'text' }]
    });

    // Insert settings records
    for (const rec of [
        { key: 'site_name', value: 'Embrace Refreshing' },
        { key: 'email_on_upload', value: 'true' },
        { key: 'weekly_summary', value: 'false' }
    ]) {
        let r = await fetch(`${BASE_URL}/api/collections/settings/records`, {
            method: 'POST', headers, body: JSON.stringify(rec)
        });
        console.log(`Setting ${rec.key}: ${r.status}`);
    }

    // Insert test product with image
    const { default: fs } = await import('fs');
    const pForm = new FormData();
    pForm.append('product_id', 'TEST-001');
    pForm.append('description', 'Test Diamond Ring');
    pForm.append('main_diamond_shape', 'Round');
    pForm.append('certification', 'GIA');
    const imgBuf = fs.readFileSync('C:\\Users\\EICUSER\\.gemini\\antigravity\\brain\\ac39a311-5161-405f-a55e-8e2ece7f0554\\diamond_ring_test_1774351494955.png');
    pForm.append('image', new Blob([imgBuf], { type: 'image/png' }), 'diamond_ring.png');
    let r1 = await fetch(`${BASE_URL}/api/collections/products/records`, {
        method: 'POST', headers: { 'Authorization': token }, body: pForm
    });
    console.log(`Test product: ${r1.status}`);

    console.log("\nVerification:");
    for (const c of ['products', 'categories', 'logs', 'settings']) {
        let res = await fetch(`${BASE_URL}/api/collections/${c}/records?perPage=1&sort=-created`, {
            headers: { 'Authorization': token }
        });
        console.log(`  ${c}: ${res.status}`);
    }
}

rebuild();
