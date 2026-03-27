const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('test@admin.com', 'testadmin1234');
    const record = await pb.collection('_superusers').getFirstListItem('email="naolediting7@gmail.com"');
    await pb.collection('_superusers').update(record.id, {
      password: 'admin123456',
      passwordConfirm: 'admin123456'
    });
    console.log('Password reset successfully for naolediting7@gmail.com');
  } catch (err) {
    console.error(err);
  }
}
run();
