const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('test@admin.com', 'testadmin1234');
    
    const collections = ['products', 'categories', 'media_assets', 'settings'];
    for (const name of collections) {
      try {
        const collection = await pb.collections.getOne(name);
        await pb.collections.update(collection.id, {
          listRule: '@request.auth.id != ""',
          viewRule: '@request.auth.id != ""',
          createRule: '@request.auth.id != ""',
          updateRule: '@request.auth.id != ""',
          deleteRule: '@request.auth.id != ""',
        });
        console.log(`Updated rules for ${name}`);
      } catch (e) {
        console.error(`Failed to update ${name}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
