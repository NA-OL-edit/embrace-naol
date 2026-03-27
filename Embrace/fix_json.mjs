import fs from 'fs';

const files = [
  "3d-sculpted-portrait-pendant-with-cuban-link-chain.png",
  "box-clasp-cuban-link-chain.png",
  "classic-cuban-link-chain.png",
  "pyramid-step-cut-signet-ring.png",
  "starburst-geometric-signet-ring.png",
  "Logo.png",
  "premium-cuban-link-set.png",
  "solitaire-engagement-ring-with-channel-stones.png",
  "custom-archangel-michael.png",
  "custom-eritrea-map-pendan.png",
  "custom-eritrea-map-pendant-with-diamond-accents.jpg",
  "full-iced-white-gold-miami-cuban-link-necklace.png",
  "gold-lion-head-medallion-ring.png",
  "h-link-diamond-wedding-and-engagement-set.png",
  "high-polish-yellow-gold-cuban-link-stack.png",
  "iconography-religious-pendant.png",
  "mini-yellow-gold-diamond-piece-pendants.png",
  "mixed-gold-link-bracelet-array.png",
  "modern-solitaire-diamond-ring.png",
  "rose-gold-diamond-miami-cuban-link-bracelet.png",
  "slayer-of-dragons.png",
  "solid-yellow-gold-miami-cuban-link-necklace.png",
  "stacked-yellow-and-white-gold-diamond-cuban-chains.png",
  "two-tone-religious.png",
  "yellow-gold-diamond-miami-cuban-link-bracelet.png",
  "heavyweight-cuban-link-bracelet.png",
  "portfolio-2.jpg",
  "portfolio-3.jpg"
];

const manualMap = {
  'Stacked Yellow & White Gold Diamond Cuban Chains.png': 'stacked-yellow-and-white-gold-diamond-cuban-chains.png',
  'H-Link Diamond Wedding & Engagement Set.png': 'h-link-diamond-wedding-and-engagement-set.png',
  'Solitaire Engagement Ring with Channel Diamonds.jpg': 'solitaire-engagement-ring-with-channel-stones.png',
  'Gemini_Generated_Image_72r93p72r93p72r9.png': 'portfolio-2.jpg',
  'p (7).png': 'portfolio-3.jpg',
  'portfolio-4.jpg': 'portfolio-2.jpg',
  'Pavé Band Ring Collection.jpg': 'portfolio-3.jpg',
  'Round Filigree Floral Pendant.jpg': 'portfolio-2.jpg',
  'Luxury Cut and Rough Gemstone Display Set.png': 'portfolio-3.jpg',
  'Luxury Gemstone Necklace and Ring Showcase Set.png': 'portfolio-2.jpg',
  'Luxury Multi-Cut Gemstone Ring Showcase.png': 'portfolio-3.jpg',
  'Asscher-Cut Luxury Gemstone Ring.png': 'portfolio-2.jpg',
  'Radiant-Cut Gemstone Swirl Pendant.png': 'portfolio-3.jpg',
  'Constellation Diamond-Style Cuff Bracelet.png': 'portfolio-2.jpg'
};

const jsonPath = './src/data/jewelryCatalog.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let toggle = true;
const mappingTable = [];

data.jewelryCatalog.forEach(item => {
  // 1. Clean 'N/A'
  for (const key in item) {
    if (item[key] === 'N/A') {
      delete item[key];
    }
  }

  // 2. Standardize fields (ensure some casing format if necessary)
  // For color, clarity, carat, we just keep their current values since they look OK in the UI, 
  // but if they were completely missing they are now removed so they won't render 'N/A'.

  // 3. Fix image matching
  const originalId = item.id;
  let finalFile = null;
  let isFallback = false;

  if (manualMap[originalId]) {
    finalFile = manualMap[originalId];
    if (finalFile.startsWith('portfolio-')) isFallback = true;
  } else {
    const normId = originalId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = files.find(f => f.toLowerCase().replace(/[^a-z0-9]/g, '') === normId);
    if (matched) {
      finalFile = matched;
    } else {
      // Not found, use fallback
      finalFile = toggle ? 'portfolio-2.jpg' : 'portfolio-3.jpg';
      toggle = !toggle;
      isFallback = true;
    }
  }

  item.id = finalFile; // Exact filename string

  mappingTable.push({
    name: item.name || item.description || originalId,
    file: finalFile,
    fallback: isFallback
  });
});

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4));

// Generate Markdown Table
let md = '# Image Mapping Table\n\n| Product Name | File Used | Fallback Used |\n|---|---|---|\n';
mappingTable.forEach(m => {
  md += `| ${m.name} | \`${m.file}\` | ${m.fallback ? '**YES**' : 'No'} |\n`;
});

fs.writeFileSync('C:\\Users\\EICUSER\\.gemini\\antigravity\\brain\\a8f147fc-0772-4b8f-8580-27a82433c7ad\\image_mapping.md', md);

console.log("JSON cleaned and mappings updated!");
