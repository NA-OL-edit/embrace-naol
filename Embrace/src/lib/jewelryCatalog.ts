import jewelryCatalogData from '@/data/jewelryCatalog.json';

export type JewelryCatalogItem = {
  id: string;
  name: string;
  category?: string;
  image?: string;
  description?: string;
  shape?: string;
  color?: string;
  clarity?: string;
  carat?: string;
  productId?: string;
  mainDiamondShape?: string;
  mainDiamondWeight?: string;
  mainDiamondClarity?: string;
  mainDiamondColor?: string;
  cut?: string;
  symmetry?: string;
  polish?: string;
  secondaryDiamondWeight?: string;
  secondaryDiamondClarity?: string;
  secondaryDiamondColor?: string;
  metalType?: string;
  metalPurity?: string;
  metalColor?: string;
  metalWeight?: string;
  replacementValue?: string;
  certification?: string;
};

export type JewelryCatalogResolvedItem = JewelryCatalogItem & {
  category: string;
  imageUrl: string;
  alt: string;
};

const jewelryImageModules = import.meta.glob('../assets/jewelry/**/*.{png,jpg,jpeg,webp,avif,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function resolveJewelryAsset(ref: string) {
  if (!ref) return '';
  const normalized = ref.replace(/^[\\/]+/, '');
  const basename = normalized.replace(/^.*[\\/]/, '').replace(/^\.\/+/, '');
  for (const [key, value] of Object.entries(jewelryImageModules)) {
    if (
      key.endsWith(`/${normalized}`) ||
      key.endsWith(`\\${normalized}`) ||
      (basename && (key.endsWith(`/${basename}`) || key.endsWith(`\\${basename}`)))
    ) {
      return value;
    }
  }
  return '';
}

const DEFAULT_JEWELRY_IMAGE =
  resolveJewelryAsset('./assets/jewelry/aurora-solitaire.svg') || Object.values(jewelryImageModules)[0] || '';

export function getJewelryCatalog(): JewelryCatalogResolvedItem[] {
  const anyData = jewelryCatalogData as any;
  const raw: JewelryCatalogItem[] = Array.isArray(anyData?.jewelryCatalog) ? anyData.jewelryCatalog : [];

  return raw.map((item, idx) => {
    const name = String(item?.name || '').trim() || 'Jewelry Piece';
    const category = String(item?.category || '').trim() || 'Catalog';
    const imageRef = String(item?.image || '').trim();
    const imageUrl = resolveJewelryAsset(imageRef) || DEFAULT_JEWELRY_IMAGE;

    const shape = String(item?.shape || '').trim();
    const metal = [item?.metalColor, item?.metalType].filter(Boolean).join(' ');
    const altParts = ['Embrace Jewellery', name, shape, metal].filter(Boolean);

    return {
      ...item,
      id: String(item?.id || item?.productId || `catalog-${idx}`),
      name,
      category,
      image: imageRef,
      imageUrl,
      alt: altParts.join(' - '),
    };
  });
}

export { DEFAULT_JEWELRY_IMAGE };
