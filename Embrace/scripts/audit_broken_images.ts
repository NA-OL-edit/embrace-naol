import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const pb = new PocketBase('http://127.0.0.1:8090');

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
}

async function run() {
  await pb.collection("_superusers").authWithPassword('test@admin.com', 'testadmin1234');
  const records = await pb.collection('products').getFullList();
  
  const broken = records.filter(r => !r.image);
  console.log(`Found ${broken.length} items with NO image attached.`);
  
  for (const b of broken) {
    console.log(`- ${b.name} (${b.id})`);
  }
}

run().catch(console.error);
