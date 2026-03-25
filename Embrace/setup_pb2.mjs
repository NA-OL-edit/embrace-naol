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
            authRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
            });
            if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
        }
        
        const { token } = await authRes.json();
        console.log("Authenticated successfully.");

        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': token 
        };

        // Collection 1: categories
        console.log("Creating 'categories' collection...");
        const categoriesData = {
            name: 'categories',
            type: 'base',
            listRule: null, // "leave empty" in UI means null (admin only)
            viewRule: null,
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            schema: [
                { name: 'name', type: 'text' },
                { 
                    name: 'type', 
                    type: 'select', 
                    options: { maxSelect: 1, values: ['Diamond', 'Metal cert', 'Album'] } 
                },
                { name: 'description', type: 'text' },
                { 
                    name: 'status', 
                    type: 'select', 
                    options: { maxSelect: 1, values: ['active', 'draft'] } 
                },
                { 
                    name: 'image', 
                    type: 'file', 
                    options: { maxSelect: 1, mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'] } 
                }
            ]
        };

        let res1 = await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(categoriesData) });
        if (!res1.ok) {
            const err = await res1.text();
            if(!err.includes('validation_not_unique')) throw new Error(`categories failed: ${err}`);
        } else {
            console.log("categories collection created successfully.");
        }

        // Collection 2: logs
        console.log("Creating 'logs' collection...");
        const logsData = {
            name: 'logs',
            type: 'base',
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: null,
            deleteRule: null,
            schema: [
                { name: 'admin_email', type: 'text' },
                { name: 'action', type: 'text' },
                { name: 'target', type: 'text' }
            ]
        };

        let res2 = await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(logsData) });
        if (!res2.ok) {
            const err = await res2.text();
            if(!err.includes('validation_not_unique')) throw new Error(`logs failed: ${err}`);
        } else {
            console.log("logs collection created successfully.");
        }

        // Collection 3: settings
        console.log("Creating 'settings' collection...");
        const settingsData = {
            name: 'settings',
            type: 'base',
            listRule: null,
            viewRule: null,
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            schema: [
                { name: 'key', type: 'text' },
                { name: 'value', type: 'text' }
            ]
        };

        let res3 = await fetch(`${BASE_URL}/api/collections`, { method: 'POST', headers, body: JSON.stringify(settingsData) });
        if (!res3.ok) {
            const err = await res3.text();
            if(!err.includes('validation_not_unique')) throw new Error(`settings failed: ${err}`);
        } else {
            console.log("settings collection created successfully.");
        }

        console.log("Adding starter records to 'settings'...");
        const records = [
            { key: 'site_name', value: 'Embrace Refreshing' },
            { key: 'email_on_upload', value: 'true' },
            { key: 'weekly_summary', value: 'false' }
        ];

        for (const rec of records) {
            const recRes = await fetch(`${BASE_URL}/api/collections/settings/records`, {
                method: 'POST',
                headers,
                body: JSON.stringify(rec)
            });
            if (!recRes.ok) throw new Error(`Record failed: ${await recRes.text()}`);
            console.log(`Record created: ${rec.key}`);
        }

        console.log("All collections and records successfully created!");
        
    } catch (err) {
        console.error("Error setting up PocketBase:");
        console.error(err.message);
    }
}

setup();
