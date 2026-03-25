import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  console.log("Authenticating...");
  const adminEmail = process.env.PB_ADMIN_EMAIL || 'test@admin.com';
  const adminPass = process.env.PB_ADMIN_PASSWORD || 'testadmin1234';
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPass);

  const records = await pb.collection('products').getFullList({
    filter: 'name ~ "logo"',
  });
  
  console.log(`Found ${records.length} records matching "logo".`);
  
  for (const record of records) {
    console.log(`Deleting ${record.name} (${record.id})...`);
    await pb.collection('products').delete(record.id);
  }
  
  console.log("Cleanup complete.");
}

run().catch(console.error);
