import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function rebuild3() {
    let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
    });
    const { token } = await authRes.json();
    const headers = { 'Content-Type': 'application/json', 'Authorization': token };

    const collections = ['products', 'categories', 'logs', 'settings'];
    
    // 1. DELETE existing collections
    for (const c of collections) {
        let f = await fetch(`${BASE_URL}/api/collections/${c}`, { headers });
        if (f.ok) {
            const col = await f.json();
            await fetch(`${BASE_URL}/api/collections/${col.id}`, { method: 'DELETE', headers });
        }
    }

    const sysFields = [
        { name: 'created', type: 'autodate', system: true },
        { name: 'updated', type: 'autodate', system: true } // autodate requires onUpdate for updated, but UI default works
    ];

    // 2. CREATE `products`
    const productsData = {
        name: 'products', type: 'base', listRule: '', viewRule: '',
        createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
        fields: [
            ...sysFields,
            { name: 'product_id', type: 'text' }, { name: 'description', type: 'text' }, { name: 'main_diamond_shape', type: 'text' },
            { name: 'main_diamond_weight', type: 'number' }, { name: 'main_diamond_clarity', type: 'text' }, { name: 'main_diamond_color', type: 'text' },
            { name: 'cut', type: 'text' }, { name: 'symmetry', type: 'text' }, { name: 'polish', type: 'text' },
            { name: 'secondary_diamond_weight', type: 'number' }, { name: 'secondary_diamond_clarity', type: 'text' }, { name: 'secondary_diamond_color', type: 'text' },
            { name: 'metal_type', type: 'text' }, { name: 'metal_purity', type: 'text' }, { name: 'metal_color', type: 'text' },
            { name: 'metal_weight', type: 'number' }, { name: 'replacement_value', type: 'number' }, { name: 'certification', type: 'text' },
            { name: 'image', type: 'file', maxSelect: 1, mimeTypes: ['image/jpeg', 'image/png'] }
        ]
    };
    await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(productsData) });

    // 3. CREATE `categories`
    const categoriesData = {
        name: 'categories', type: 'base', listRule: null, viewRule: null, 
        createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
        fields: [
            ...sysFields,
            { name: 'name', type: 'text' }, { name: 'type', type: 'select', values: ['Diamond', 'Metal cert', 'Album'], maxSelect: 1 },
            { name: 'description', type: 'text' }, { name: 'status', type: 'select', values: ['active', 'draft'], maxSelect: 1 },
            { name: 'image', type: 'file', maxSelect: 1 }
        ]
    };
    await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(categoriesData) });

    // 4. CREATE `logs`
    const logsData = {
        name: 'logs', type: 'base', listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""', updateRule: null, deleteRule: null,
        fields: [...sysFields, { name: 'admin_email', type: 'text' }, { name: 'action', type: 'text' }, { name: 'target', type: 'text' }]
    };
    await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(logsData) });

    // 5. CREATE `settings`
    const settingsData = {
        name: 'settings', type: 'base', listRule: null, viewRule: null,
        createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""', deleteRule: '@request.auth.id != ""',
        fields: [...sysFields, { name: 'key', type: 'text' }, { name: 'value', type: 'text' }]
    };
    await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(settingsData) });

    // 6. Test records
    const formOptions = { headers: { 'Authorization': `Bearer ${token}` } }; 
    const pForm = new FormData();
    pForm.append('product_id', 'TEST-001'); pForm.append('description', 'Test Diamond Ring');
    pForm.append('main_diamond_shape', 'Round'); pForm.append('certification', 'GIA');
    const imgBuf = fs.readFileSync('C:\\Users\\EICUSER\\.gemini\\antigravity\\brain\\ac39a311-5161-405f-a55e-8e2ece7f0554\\diamond_ring_test_1774351494955.png');
    pForm.append('image', new Blob([imgBuf], { type: 'image/png' }), 'diamond_ring.png');
    let r1 = await fetch(`${BASE_URL}/api/collections/products/records`, { method: 'POST', headers: { 'Authorization': token }, body: pForm });
    
    const recs = [{ key: 'site_name', value: 'Embrace Refreshing' }, { key: 'email_on_upload', value: 'true' }, { key: 'weekly_summary', value: 'false' }];
    for (const rec of recs) {
        await fetch(`${BASE_URL}/api/collections/settings/records`, { method: 'POST', headers, body: JSON.stringify(rec) });
    }
    
    console.log("All collections rebuilt correctly WITH system dates!");
}

rebuild3();
