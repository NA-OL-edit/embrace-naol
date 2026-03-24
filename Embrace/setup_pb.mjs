import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function setup() {
    try {
        console.log("Authenticating as superuser...");
        let authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
        });
        
        if (!authRes.ok) {
            // Fallback for older PocketBase versions
            console.log("Trying legacy admin auth...");
            authRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
            });
            if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
        }
        
        const { token } = await authRes.json();
        console.log("Authenticated successfully.");

        console.log("Creating 'products' collection...");
        const collectionData = {
            name: 'products',
            type: 'base',
            listRule: '',
            viewRule: '',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            schema: [
                { name: 'product_id', type: 'text' },
                { name: 'description', type: 'text' },
                { name: 'main_diamond_shape', type: 'text' },
                { name: 'main_diamond_weight', type: 'number' },
                { name: 'main_diamond_clarity', type: 'text' },
                { name: 'main_diamond_color', type: 'text' },
                { name: 'cut', type: 'text' },
                { name: 'symmetry', type: 'text' },
                { name: 'polish', type: 'text' },
                { name: 'secondary_diamond_weight', type: 'number' },
                { name: 'secondary_diamond_clarity', type: 'text' },
                { name: 'secondary_diamond_color', type: 'text' },
                { name: 'metal_type', type: 'text' },
                { name: 'metal_purity', type: 'text' },
                { name: 'metal_color', type: 'text' },
                { name: 'metal_weight', type: 'number' },
                { name: 'replacement_value', type: 'number' },
                { name: 'certification', type: 'text' },
                { 
                    name: 'image', 
                    type: 'file', 
                    options: { 
                        maxSelect: 1, 
                        mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp']
                    } 
                }
            ]
        };

        const createRes = await fetch(`${BASE_URL}/api/collections`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify(collectionData)
        });

        if (!createRes.ok) {
            const errText = await createRes.text();
            if (errText.includes('validation_not_unique')) {
                console.log("Collection 'products' already exists, continuing...");
            } else {
                throw new Error(`Collection creation failed: ${errText}`);
            }
        } else {
            console.log("Collection created successfully.");
        }

        console.log("Creating test record...");
        const formData = new FormData();
        formData.append('product_id', 'TEST-001');
        formData.append('description', 'Test Diamond Ring');
        formData.append('main_diamond_shape', 'Round');
        formData.append('certification', 'GIA');

        // Read file into Blob
        const imagePath = 'C:\\Users\\EICUSER\\.gemini\\antigravity\\brain\\ac39a311-5161-405f-a55e-8e2ece7f0554\\diamond_ring_test_1774351494955.png';
        const imageBuffer = fs.readFileSync(imagePath);
        formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'diamond_ring.png');

        const recordRes = await fetch(`${BASE_URL}/api/collections/products/records`, {
            method: 'POST',
            headers: { 'Authorization': token },
            body: formData
        });

        if (!recordRes.ok) {
            throw new Error(`Record creation failed: ${await recordRes.text()}`);
        }

        const record = await recordRes.json();
        console.log("Test record created successfully. ID:", record.id);
        
    } catch (err) {
        console.error("Error setting up PocketBase:");
        console.error(err.message);
    }
}

setup();
