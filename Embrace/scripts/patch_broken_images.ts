import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const KEYWORD_PRIORITY = [
  'eritrea', 'cuban', 'lion', 'jesus', 'archangel',
  'byzantine', 'franco', 'bracelet', 'necklace', 'pendant',
  'asscher', 'gemstone', 'display'
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
  if (!fs.existsSync(dir)) return filelist;
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
  const adminEmail = process.env.PB_ADMIN_EMAIL || 'test@admin.com';
  const adminPass = process.env.PB_ADMIN_PASSWORD || 'testadmin1234';
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPass);
  
  const records = await pb.collection('products').getFullList();
  const broken = records.filter(r => !r.image);
  
  console.log(`Found ${broken.length} items with NO image attached.`);
  if (broken.length === 0) return;

  const assetDirs = ['src/assets/portfolio', 'src/assets'];
  let allFiles = [];
  for (const dir of assetDirs) {
    allFiles = allFiles.concat(walkSync(dir));
  }
  
  const validExts = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];
  allFiles = allFiles.filter(f => validExts.includes(path.extname(f).toLowerCase()));

  for (const record of broken) {
    const itemName = record.name;
    let bestFile = null;
    let bestScore = -Infinity;

    for (const filePath of allFiles) {
      const filenameBase = path.basename(filePath).replace(/\.[^.]+$/, '');
      if (filenameBase.toLowerCase().includes('logo') || filenameBase.toLowerCase().includes('bg')) continue;
      
      const score = scoreNameMatch(itemName, filenameBase);
      if (score > bestScore) {
        bestScore = score;
        bestFile = filePath;
      }
    }

    if (bestFile) {
      console.log(`Patching [${itemName}] -> ${path.basename(bestFile)} (Score: ${bestScore})`);
      
      const formData = new FormData();
      const buffer = fs.readFileSync(bestFile);
      const filename = path.basename(bestFile);
      const blob = new Blob([buffer]);
      formData.append('image', blob, filename);

      try {
        await pb.collection('products').update(record.id, formData);
        console.log(`[OK] Updated ${itemName}`);
      } catch (err) {
        console.error(`[ERROR] Failed to update ${itemName}:`, err.message);
      }
    } else {
      console.log(`[WARN] Still no file found for ${itemName}`);
    }
  }
  
  console.log("Patching complete.");
}

run().catch(console.error);
