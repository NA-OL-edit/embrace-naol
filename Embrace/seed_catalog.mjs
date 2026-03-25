import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://127.0.0.1:8090';
const EMAIL = 'naolsamuel7@gmail.com';
const PASSWORD = 'Ch@nge@Sabaktani7@';
const ASSETS_ROOT = path.join(__dirname, 'src', 'assets');
const CATALOG_PATH = path.join(__dirname, 'src', 'data', 'jewelryCatalog.json');

// Recursively find all image files under a directory
function findAllImages(dir, found = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findAllImages(full, found);
    else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
      // Key by basename for easy lookup
      found[entry.name] = full;
    }
  }
  return found;
}

async function seed() {
  // 1. Auth
  const authRes = await fetch(`${BASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD })
  });
  const { token } = await authRes.json();
  console.log('✓ Authenticated');

  // 2. Load catalog
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')).jewelryCatalog;
  console.log(`✓ Loaded catalog: ${catalog.length} entries`);

  // 3. Index all images
  const imageIndex = findAllImages(ASSETS_ROOT);
  console.log(`✓ Found ${Object.keys(imageIndex).length} images on disk`);

  // 4. Clear existing test records (optional — skip records with real product_id)
  const existing = await fetch(`${BASE_URL}/api/collections/products/records?perPage=200`, {
    headers: { Authorization: token }
  });
  const existingData = await existing.json();
  let cleared = 0;
  for (const rec of existingData.items || []) {
    if (!rec.product_id || rec.product_id.startsWith('TEST') || rec.product_id.startsWith('UPLOAD')) {
      await fetch(`${BASE_URL}/api/collections/products/records/${rec.id}`, {
        method: 'DELETE', headers: { Authorization: token }
      });
      cleared++;
    }
  }
  console.log(`✓ Cleared ${cleared} placeholder records`);

  // 5. Seed each catalog entry
  let uploaded = 0, skipped = 0;
  for (const item of catalog) {
    const fd = new FormData();

    // Map catalog fields → PocketBase fields
    fd.append('product_id', item.productId && item.productId !== 'N/A' ? item.productId : `CAT-${String(uploaded + 1).padStart(3, '0')}`);
    fd.append('description', item.name || '');
    fd.append('main_diamond_shape', item.mainDiamondShape && item.mainDiamondShape !== 'N/A' ? item.mainDiamondShape : (item.shape || ''));
    fd.append('main_diamond_weight', item.mainDiamondWeight && item.mainDiamondWeight !== 'N/A' ? parseFloat(item.mainDiamondWeight) : '');
    fd.append('main_diamond_clarity', item.mainDiamondClarity && item.mainDiamondClarity !== 'N/A' ? item.mainDiamondClarity : (item.clarity || ''));
    fd.append('main_diamond_color', item.mainDiamondColor && item.mainDiamondColor !== 'N/A' ? item.mainDiamondColor : (item.color || ''));
    fd.append('cut', item.cut && item.cut !== 'N/A' ? item.cut : '');
    fd.append('symmetry', item.symmetry && item.symmetry !== 'N/A' ? item.symmetry : '');
    fd.append('polish', item.polish && item.polish !== 'N/A' ? item.polish : '');
    fd.append('secondary_diamond_weight', item.secondaryDiamondWeight && item.secondaryDiamondWeight !== 'N/A' ? parseFloat(item.secondaryDiamondWeight) : '');
    fd.append('secondary_diamond_clarity', item.secondaryDiamondClarity && item.secondaryDiamondClarity !== 'N/A' ? item.secondaryDiamondClarity : '');
    fd.append('secondary_diamond_color', item.secondaryDiamondColor && item.secondaryDiamondColor !== 'N/A' ? item.secondaryDiamondColor : '');
    fd.append('metal_type', item.metalType && item.metalType !== 'N/A' ? item.metalType : '');
    fd.append('metal_purity', item.metalPurity && item.metalPurity !== 'N/A' ? item.metalPurity : '');
    fd.append('metal_color', item.metalColor && item.metalColor !== 'N/A' ? item.metalColor : (item.color || ''));
    fd.append('metal_weight', item.metalWeight && item.metalWeight !== 'N/A' ? parseFloat(item.metalWeight) : '');
    fd.append('replacement_value', item.replacementValue && item.replacementValue !== 'N/A' ? parseFloat(item.replacementValue.replace(/[$,]/g, '')) : '');
    fd.append('certification', item.certification && item.certification !== 'N/A' ? item.certification : '');

    // Find image by filename (the `id` field in the catalog is the filename)
    const imgFilename = item.id;
    const imgPath = imageIndex[imgFilename];
    if (imgPath) {
      const imgBuf = fs.readFileSync(imgPath);
      const mime = imgFilename.match(/\.jpe?g$/i) ? 'image/jpeg' : 'image/png';
      fd.append('image', new Blob([imgBuf], { type: mime }), imgFilename);
    } else {
      console.log(`  ⚠ No image found for: ${imgFilename}`);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/collections/products/records`, {
        method: 'POST',
        headers: { Authorization: token },
        body: fd
      });
      if (res.ok) {
        uploaded++;
        console.log(`  ✓ [${uploaded}] ${item.name}`);
      } else {
        const err = await res.json();
        console.error(`  ✗ ${item.name}: ${JSON.stringify(err.message)}`);
        skipped++;
      }
    } catch (e) {
      console.error(`  ✗ ${item.name}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done — ${uploaded} uploaded, ${skipped} failed`);
}

seed().catch(console.error);
