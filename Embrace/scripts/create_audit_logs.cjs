const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('test@admin.com', 'testadmin1234');
    
    // Create audit_logs collection
    try {
      await pb.collections.create({
        name: 'audit_logs',
        type: 'base',
        schema: [
          { name: 'event', type: 'text', required: true },
          { name: 'user', type: 'text' },
          { name: 'details', type: 'text' }
        ],
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
      });
      console.log('Created audit_logs collection');
    } catch (e) {
      console.log('audit_logs already exists or failed:', e.message);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
