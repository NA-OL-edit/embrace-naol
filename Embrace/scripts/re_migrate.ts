import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const KEYWORD_PRIORITY = [
  'eritrea', 'cuban', 'lion', 'jesus', 'archangel',
  'byzantine', 'franco', 'bracelet', 'necklace', 'pendant'
];

function normalizeForMatch(value) {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreNameMatch(title, name) {
  const titleNorm = normalizeForMatch(title);
  const nameNorm = normalizeForMatch(name);
  if (!titleNorm || !nameNorm) return -1;
  if (titleNorm === nameNorm) return 10000;

  let score = 0;
  if (nameNorm.includes(titleNorm) || titleNorm.includes(nameNorm)) score += 500;

  const titleTokens = new Set(titleNorm.split(' ').filter(Boolean));
  const nameTokens = new Set(nameNorm.split(' ').filter(Boolean));
  let overlap = 0;
  titleTokens.forEach((token) => {
    if (nameTokens.has(token)) overlap += 1;
  });
  score += overlap * 25;

  let keywordHits = 0;
  KEYWORD_PRIORITY.forEach((keyword) => {
    const inTitle = titleNorm.includes(keyword);
    const inName = nameNorm.includes(keyword);
    if (inTitle && inName) keywordHits += 1;
  });
  score += keywordHits * 200;

  score -= Math.abs(titleNorm.length - nameNorm.length);
  return score;
}

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
  console.log("Authenticating...");
  const adminEmail = process.env.PB_ADMIN_EMAIL || 'test@admin.com';
  const adminPass = process.env.PB_ADMIN_PASSWORD || 'testadmin1234';
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPass);

  console.log("Fetching all existing products to clear them out...");
  const records = await pb.collection('products').getFullList({ fields: 'id' });
  console.log(`Deleting ${records.length} existing products to start fresh...`);
  
  // Delete in chunks/sequentially to avoid rate limits
  for (const record of records) {
    await pb.collection('products').delete(record.id);
  }
  console.log("Database cleared.");

  // Gather all local files
  console.log("Gathering local image files...");
  const assetDirs = [
    'src/assets/portfolio',
    'src/assets',
  ];
  let allFiles = [];
  for (const dir of assetDirs) {
    if (fs.existsSync(dir)) {
      allFiles = allFiles.concat(walkSync(dir));
    }
  }
  
  // Filter only images
  const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];
  allFiles = allFiles.filter(f => validExts.includes(path.extname(f).toLowerCase()));

  // Unpack JSON
  const catalogData = JSON.parse(fs.readFileSync('src/data/jewelryCatalog.json', 'utf8'));
  const items = catalogData.jewelryCatalog || catalogData;
  console.log(`Found ${items.length} items in JSON to map.`);

  // To keep track of files we've mapped
  const matchedFiles = new Set();
  let count = 0;

  for (const item of items) {
    const itemName = item.name;
    const baseId = item.id.replace(/\.[^.]+$/, ''); // Strip extension

    let bestFile = null;
    let bestScore = -Infinity;

    for (const filePath of allFiles) {
      if (matchedFiles.has(filePath)) continue; // Already consumed
      const filenameBase = path.basename(filePath).replace(/\.[^.]+$/, '');
      
      const s1 = scoreNameMatch(itemName, filenameBase);
      const s2 = scoreNameMatch(baseId, filenameBase);
      const score = Math.max(s1, s2);
      
      if (score > bestScore && score > 0) {
        bestScore = score;
        bestFile = filePath;
      }
    }

    if (bestFile) {
      matchedFiles.add(bestFile);
      console.log(`Matched [${item.id}] -> ${path.basename(bestFile)} (Score: ${bestScore})`);
    } else {
      console.log(`[WARN] No matching file found for ${item.id}`);
    }

    const formData = new FormData();
    formData.append('product_id', item.productId !== 'N/A' ? item.productId : '');
    formData.append('description', item.description !== 'N/A' ? item.description : '');
    formData.append('name', item.name);
    formData.append('shape', item.shape);
    formData.append('color', item.color);
    formData.append('clarity', item.clarity);
    formData.append('carat', item.carat);
    
    const mappings = {
      'main_diamond_shape': item.mainDiamondShape,
      'main_diamond_weight': item.mainDiamondWeight,
      'main_diamond_clarity': item.mainDiamondClarity,
      'main_diamond_color': item.mainDiamondColor,
      'cut': item.cut,
      'symmetry': item.symmetry,
      'polish': item.polish,
      'secondary_diamond_weight': item.secondaryDiamondWeight,
      'secondary_diamond_clarity': item.secondaryDiamondClarity,
      'secondary_diamond_color': item.secondaryDiamondColor,
      'metal_type': item.metalType,
      'metal_purity': item.metalPurity,
      'metal_color': item.metalColor,
      'metal_weight': item.metalWeight,
      'replacement_value': item.replacementValue,
      'certification': item.certification
    };

    for (const [k, v] of Object.entries(mappings)) {
      if (v && v !== 'N/A') {
        formData.append(k, String(v));
      }
    }

    if (bestFile) {
      const buffer = fs.readFileSync(bestFile);
      const filename = path.basename(bestFile);
      const blob = new Blob([buffer]);
      formData.append('image', blob, filename);
    }

    try {
      await pb.collection('products').create(formData);
      count++;
    } catch (err) {
      console.error(`[ERROR] Failed to insert ${item.name}:`, err.message);
    }
  }
  
  // Now add any files that weren't matched in the JSON
  console.log("Checking for unmapped standalone files...");
  for (const filePath of allFiles) {
    if (matchedFiles.has(filePath)) continue;
    
    const filename = path.basename(filePath);
    const title = filename.replace(/\.[^.]+$/, '').replace(/[()-_]/g, ' ').trim();
    if (title.toLowerCase().includes('hero bg') || title.toLowerCase().includes('about bg') || title.toLowerCase() === 'logo') {
      continue;
    }

    const relativePath = filePath.split(path.sep).join('/');
    // Check if it's already an asset inside regular src/assets that shouldn't be a product
    if (relativePath.split('/').length < 4 && !relativePath.includes('portfolio')) {
      // It's in src/assets/ directly, skip generic assets
      continue;
    }

    let cat = 'Custom';
    if (relativePath.includes('/casting/')) cat = 'Casting';
    if (relativePath.includes('/refining/')) cat = 'Refining';

    console.log(`Adding standalone fallback: ${filename} (${cat})`);

    const formData = new FormData();
    formData.append('name', title);
    formData.append('description', cat === 'Casting' ? 'High-precision casting engineered for timeless luxury pieces' : 
                                   cat === 'Refining' ? 'Precision gold refining with premium finishing details' : 
                                   'Bespoke custom design crafted for signature statements');
    
    formData.append('shape', 'N/A');
    formData.append('color', 'N/A');
    formData.append('clarity', 'N/A');
    formData.append('carat', 'N/A');
    
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer]);
    formData.append('image', blob, filename);

    try {
      await pb.collection('products').create(formData);
      count++;
    } catch (err) {
      console.error(`[ERROR] Failed to insert standalone ${filename}:`, err.message);
    }
  }

  console.log(`Re-migration completely finished! Total products in DB: ${count}`);
}

run().catch(console.error);
