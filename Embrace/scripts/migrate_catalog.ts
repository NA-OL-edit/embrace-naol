import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  console.log("Authenticating as superadmin...");
  console.log("Authenticating as superadmin...");
  try {
    // Try the dedicated ingest admin
    await pb.collection("_superusers").authWithPassword('test@admin.com', 'testadmin1234');
  } catch (err1) {
    console.error("Auth failed completely.", err1.message);
    return;
  }

  console.log("Updating products collection schema...");
  const collection = await pb.collections.getOne('products');
  const existingFields = collection.fields || [];
  
  const textFieldsToAdd = [
    'name', 'shape', 'color', 'clarity', 'carat', 
    'main_diamond_weight', 'metal_weight', 'replacement_value'
  ];
  
  collection.fields = existingFields.filter(f => !textFieldsToAdd.includes(f.name));
  
  for (const name of textFieldsToAdd) {
    collection.fields.push({
      name: name,
      type: 'text',
      required: false,
      presentable: name === 'name',
    });
  }
  
  await pb.collections.update('products', collection);
  console.log("Schema correctly updated via API!");

  const catalogData = JSON.parse(fs.readFileSync('src/data/jewelryCatalog.json', 'utf8'));
  const items = catalogData.jewelryCatalog || catalogData;
  console.log(`Preparing to migrate ${items.length} records...`);

  const assetDirs = [
    'src/assets',
    'src/assets/portfolio/raw',
    'src/assets/portfolio/custom',
    'src/assets/portfolio/casting',
    'src/assets/portfolio/refining'
  ];

  for (const item of items) {
    const filename = item.id;
    let filePath = null;
    
    for (const dir of assetDirs) {
      const p = path.join(dir, filename);
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
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

    if (filePath) {
      const buffer = fs.readFileSync(filePath);
      const blob = new Blob([buffer]);
      formData.append('image', blob, filename);
    } else {
      console.warn(`[WARN] Image not found: ${filename}`);
    }

    try {
      await pb.collection('products').create(formData);
      console.log(`[OK] Migrated: ${item.name}`);
    } catch (err) {
      console.error(`[ERROR] Failed to migrate ${item.name}:`, err.message);
    }
  }
}

run().catch(console.error);
