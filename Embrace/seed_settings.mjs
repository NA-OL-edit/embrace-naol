import PocketBase from 'pocketbase';

const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';

async function seedSettings() {
    const pb = new PocketBase(BASE_URL);
    try {
        await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD);
        
        const settings = [
            { key: 'contact_email', value: 'info@embracerefiningandcasting.com' },
            { key: 'contact_phone', value: '+256769947948, +251943814444, +251943794444' },
            { key: 'contact_address', value: 'Addis Ababa, Ethiopia and Kampala, Uganda' }
        ];

        for (const s of settings) {
            try {
                // Check if exists
                const existing = await pb.collection('settings').getFirstListItem(`key="${s.key}"`);
                await pb.collection('settings').update(existing.id, { value: s.value });
                console.log(`Updated setting: ${s.key}`);
            } catch (err) {
                await pb.collection('settings').create(s);
                console.log(`Created setting: ${s.key}`);
            }
        }
    } catch (err) {
        console.error("Error seeding settings:", err.message);
    }
}

seedSettings();
