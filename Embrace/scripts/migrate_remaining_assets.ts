import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

function toTitle(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[()]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function run() {
  console.log("Authenticating as superadmin...");
  try {
    await pb.collection("_superusers").authWithPassword('test@admin.com', 'testadmin1234');
  } catch (err1) {
    console.error("Auth failed completely.", err1.message);
    return;
  }

  // Fetch all existing products to see what we've already uploaded.
  const existingProducts = await pb.collection('products').getFullList({ fields: 'id,image' });
  // Map Pocketbase original filenames (Pocketbase renames files with random strings, but it retains the original name in the media library or we check the JSON data)
  // Wait, Pocketbase `image` field is just a string `filename_jfwkehf.jpg`. It's hard to match against exactly.
  // We can instead fetch the original JSON to know which files are already handled.
  
  const catalogData = JSON.parse(fs.readFileSync('src/data/jewelryCatalog.json', 'utf8'));
  const items = catalogData.jewelryCatalog || catalogData;
  const knownFiles = new Set(items.map((i) => i.id.toLowerCase()));
  
  console.log(`Found ${knownFiles.size} known files from jewelryCatalog.json. Scanning for new ones...`);

  // Recursively find all files in src/assets/portfolio
  const walkSync = (dir, filelist = []) => {
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
  };

  const allFiles = walkSync('src/assets/portfolio');
  const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];

  let count = 0;

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    if (!validExts.includes(ext)) continue;

    const filename = path.basename(filePath);
    
    // Skip if already in the known catalog
    if (knownFiles.has(filename.toLowerCase())) {
      continue;
    }
    
    // Skip logo and other utility backgrounds
    const title = toTitle(filename);
    if (title.toLowerCase().includes('hero bg') || title.toLowerCase().includes('about bg') || title.toLowerCase() === 'logo') {
      continue;
    }

    // Determine category based on folder
    const relativePath = filePath.split(path.sep).join('/');
    let cat = 'Custom';
    if (relativePath.includes('/casting/')) cat = 'Casting';
    if (relativePath.includes('/refining/')) cat = 'Refining';

    console.log(`Processing remaining asset: ${filename} (${cat})`);

    const formData = new FormData();
    formData.append('name', title);
    
    // Fallback info for general unlinked images
    formData.append('description', cat === 'Casting' ? 'High-precision casting engineered for timeless luxury pieces' : 
                                   cat === 'Refining' ? 'Precision gold refining with premium finishing details' : 
                                   'Bespoke custom design crafted for signature statements');
    
    // The previous catalog fallback categorized missing items into their own 'portfolio' classification
    formData.append('shape', 'N/A');
    formData.append('color', 'N/A');
    formData.append('clarity', 'N/A');
    formData.append('carat', 'N/A');
    
    // Ensure we send it as a File/Blob
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer]);
    formData.append('image', blob, filename);

    try {
      await pb.collection('products').create(formData);
      console.log(`[OK] Migrated new asset: ${filename}`);
      count++;
    } catch (err) {
      console.error(`[ERROR] Failed to migrate ${filename}:`, err.message);
    }
  }
  
  console.log(`Migration Complete: ${count} remaining standalone assets successfully uploaded.`);
}

run().catch(console.error);
