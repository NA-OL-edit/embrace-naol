import PocketBase from 'pocketbase';

const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function setupInquiries() {
    const pb = new PocketBase(BASE_URL);
    try {
        console.log("Authenticating...");
        await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD);
        
        console.log("Creating 'inquiries' collection...");
        const collection = {
            name: 'inquiries',
            type: 'base',
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '', // Public can create
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'email', type: 'email', required: true },
                { name: 'subject', type: 'text' },
                { name: 'message', type: 'text', required: true },
                { 
                    name: 'status', 
                    type: 'select', 
                    options: { maxSelect: 1, values: ['new', 'read', 'archived'] } 
                }
            ]
        };

        try {
            await pb.collections.create(collection);
            console.log("'inquiries' collection created successfully.");
        } catch (err) {
            if (err.response?.data?.name?.code === 'validation_not_unique') {
                console.log("'inquiries' collection already exists.");
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error("Error setting up inquiries collection:", err.message);
    }
}

setupInquiries();
