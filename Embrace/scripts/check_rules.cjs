const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('test@admin.com', 'testadmin1234');
    const collections = await pb.collections.getFullList();
    console.log('Collections and Rules:');
    collections.forEach(c => {
      console.log(`- ${c.name}:`);
      console.log(`  listRule: ${c.listRule}`);
      console.log(`  viewRule: ${c.viewRule}`);
      console.log(`  createRule: ${c.createRule}`);
      console.log(`  updateRule: ${c.updateRule}`);
      console.log(`  deleteRule: ${c.deleteRule}`);
    });
  } catch (err) {
    console.error(err);
  }
}
run();
