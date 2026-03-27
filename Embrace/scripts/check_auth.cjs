const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('test@admin.com', 'testadmin1234');
    const records = await pb.collection('_superusers').getFullList();
    console.log('Superusers:');
    records.forEach(r => console.log(` - ${r.email}`));
    
    const users = await pb.collection('users').getFullList();
    console.log('Users:');
    users.forEach(u => console.log(` - ${u.email}`));
  } catch (err) {
    console.error(err);
  }
}
run();
