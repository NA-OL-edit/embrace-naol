import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FadeUp } from '@/components/AnimationWrappers';
import pb, { getImageUrl } from '@/lib/pocketbase';

const SAVED_PROJECTS_KEY = 'savedPortfolioProjects';

type CatalogItem = {
  id: string;
  name: string;
  shape: string;
  color: string;
  clarity: string;
  carat: string;
  productId?: string;
  description?: string;
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

type Project = {
  id: string;
  img: string;
  imgMedium?: string;
  imgLarge?: string;
  alt: string;
  title: string;
  cat: string;
  desc: string;
  catalogItem?: CatalogItem;
};

type SpecRow = {
  label: string;
  value: string;
};

const localImageModules = import.meta.glob('../assets/portfolio/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function SpecAccordionSection({
  title,
  rows,
  isOpen,
  onToggle,
}: {
  title: string;
  rows: SpecRow[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-primary/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-body text-xs uppercase tracking-[0.32em] text-primary">{title}</span>
        <ChevronDown
          size={18}
          className={`text-primary transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden transition-all duration-300 ease-in-out"
          >
            <div className="max-h-[300px] overflow-y-auto pr-2 luxury-scrollbar">
              <div className="portfolio-spec-table border-t border-primary/25">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-2 border-b border-primary/25 px-5 py-4 last:border-b-0"
                  >
                    <span className="portfolio-spec-label font-body text-xs uppercase tracking-[0.2em] text-primary">
                      {row.label}
                    </span>
                    <span className="portfolio-spec-value text-right font-body text-sm text-white">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildSrcSet(project: Project) {
  const urls = [project.img, project.imgMedium, project.imgLarge].filter(Boolean) as string[];
  const uniqueUrls = Array.from(new Set(urls));
  if (uniqueUrls.length < 2) return undefined;

  const medium = project.imgMedium || project.img;
  const large = project.imgLarge || medium;
  return `${project.img} 480w, ${medium} 960w, ${large} 1440w`;
}

function isModalAllowed(project: Project | null) {
  return !!project;
}

export default function Portfolio() {
  const [active, setActive] = useState('All');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [savedProjects, setSavedProjects] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'reserve' | 'enquire' | null>(null);
  const [activePopup, setActivePopup] = useState<'reserve' | null>(null);
  const [reserveStep, setReserveStep] = useState<'confirm' | 'form' | 'thankyou'>('confirm');
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', message: '' });
  const [openSections, setOpenSections] = useState({ diamond: true, metal: false });
  const navigate = useNavigate();
  const initialTitleRef = useRef<string>(document.title);

  useEffect(() => {
    document.title = selected?.title
      ? `Embrace Jewellery - ${selected.title}`
      : 'Embrace Jewellery - Portfolio';
  }, [selected?.title]);

  useEffect(() => {
    return () => {
      document.title = initialTitleRef.current;
    };
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.cat)))],
    [projects],
  );
  const filtered = useMemo(
    () => (active === 'All' ? projects : projects.filter((p) => p.cat === active)),
    [active, projects],
  );
  
  const catalogItem = selected?.catalogItem;
  const displayTitle = catalogItem?.name || selected?.title || 'N/A';
  const displaySpec = catalogItem ?? {
    name: displayTitle,
    shape: 'N/A',
    color: 'N/A',
    clarity: 'N/A',
    carat: 'N/A',
  };

  useEffect(() => {
    const raw = localStorage.getItem(SAVED_PROJECTS_KEY);
    if (!raw) return;
    try {
      setSavedProjects(JSON.parse(raw));
    } catch {
      setSavedProjects({});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        setLoadError(null);
        const dbProducts = await pb.collection('products').getFullList({ sort: '-created' });
        if (cancelled) return;

        if (dbProducts && dbProducts.length > 0) {
          const pbProjects = dbProducts.map((p: any) => {
            const imageName = Array.isArray(p.image) ? p.image[0] : p.image;
            const imgUrl = imageName
              ? ((pb as any).files?.getUrl
                  ? (pb as any).files.getUrl(p, imageName, { thumb: '900x675' })
                  : getImageUrl(p.collectionId, p.id, imageName, '900x675'))
              : '';

            const title = String(p.name || '').trim() || 'Jewelry Piece';
            const shape = String(p.shape || '').trim();
            const metal = [p.metal_color, p.metal_type].filter(Boolean).join(' ');
            const altParts = [`Embrace Jewellery`, title, shape, metal].filter(Boolean);

            return {
              id: p.id,
              img: imgUrl,
              imgMedium: imgUrl,
              imgLarge: imgUrl,
              alt: altParts.join(' - '),
              title,
              cat: p.product_id ? 'Store' : 'Custom',
              desc: p.description || 'Luxury piece',
              catalogItem: {
                id: p.id,
                name: p.name,
                shape: p.shape,
                color: p.color,
                clarity: p.clarity,
                carat: p.carat,
                productId: p.product_id,
                description: p.description,
                mainDiamondShape: p.main_diamond_shape,
                mainDiamondWeight: p.main_diamond_weight,
                mainDiamondClarity: p.main_diamond_clarity,
                mainDiamondColor: p.main_diamond_color,
                cut: p.cut,
                symmetry: p.symmetry,
                polish: p.polish,
                secondaryDiamondWeight: p.secondary_diamond_weight,
                secondaryDiamondClarity: p.secondary_diamond_clarity,
                secondaryDiamondColor: p.secondary_diamond_color,
                metalType: p.metal_type,
                metalPurity: p.metal_purity,
                metalColor: p.metal_color,
                metalWeight: p.metal_weight,
                replacementValue: p.replacement_value,
                certification: p.certification,
              },
            };
          });
          setProjects(pbProjects);
        }
      } catch (err) {
        console.error("Failed to load products from PocketBase", err);
        if (!cancelled) {
          setProjects([]);
          const status = (err as any)?.status;
          if (status === 401 || status === 403) {
            setLoadError("Catalog is private. Update PocketBase products list/view rules to allow public read.");
          } else {
            setLoadError("Unable to load jewelry catalog. Please try again shortly.");
          }
        }
      }
    };

    void loadCatalog();

    let unsubscribe: null | (() => void) = null;
    pb.collection('products')
      .subscribe('*', (event: any) => {
        if (cancelled) return;

        setProjects((prev) => {
          const action = String(event?.action || "");
          const record = event?.record;
          if (!record?.id) return prev;

          if (action === 'delete') {
            return prev.filter((p) => p.id !== record.id);
          }

          const imageName = Array.isArray(record.image) ? record.image[0] : record.image;
          const imgUrl = imageName
            ? ((pb as any).files?.getUrl
                ? (pb as any).files.getUrl(record, imageName, { thumb: '900x675' })
                : getImageUrl(record.collectionId, record.id, imageName, '900x675'))
            : '';

          const title = String(record.name || '').trim() || 'Jewelry Piece';
          const shape = String(record.shape || '').trim();
          const metal = [record.metal_color, record.metal_type].filter(Boolean).join(' ');
          const altParts = [`Embrace Jewellery`, title, shape, metal].filter(Boolean);

          const nextProject: Project = {
            id: record.id,
            img: imgUrl,
            imgMedium: imgUrl,
            imgLarge: imgUrl,
            alt: altParts.join(' - '),
            title,
            cat: record.product_id ? 'Store' : 'Custom',
            desc: record.description || 'Luxury piece',
            catalogItem: {
              id: record.id,
              name: record.name,
              shape: record.shape,
              color: record.color,
              clarity: record.clarity,
              carat: record.carat,
              productId: record.product_id,
              description: record.description,
              mainDiamondShape: record.main_diamond_shape,
              mainDiamondWeight: record.main_diamond_weight,
              mainDiamondClarity: record.main_diamond_clarity,
              mainDiamondColor: record.main_diamond_color,
              cut: record.cut,
              symmetry: record.symmetry,
              polish: record.polish,
              secondaryDiamondWeight: record.secondary_diamond_weight,
              secondaryDiamondClarity: record.secondary_diamond_clarity,
              secondaryDiamondColor: record.secondary_diamond_color,
              metalType: record.metal_type,
              metalPurity: record.metal_purity,
              metalColor: record.metal_color,
              metalWeight: record.metal_weight,
              replacementValue: record.replacement_value,
              certification: record.certification,
            },
          };

          const existingIndex = prev.findIndex((p) => p.id === record.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = nextProject;
            return next;
          }

          return [nextProject, ...prev];
        });
      })
      .then((unsub: any) => {
        unsubscribe = typeof unsub === 'function' ? unsub : null;
      })
      .catch((subErr: any) => {
        console.warn("PocketBase realtime subscription failed", subErr);
      });

    return () => {
      cancelled = true;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (active !== 'All' && !categories.includes(active)) {
      setActive('All');
    }
  }, [active, categories]);

  useEffect(() => {
    if (!selected) return;

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopup(null);
        setSelected(null);
      }
    };

    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [selected]);

  const specValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return 'N/A';
    const text = String(value).trim();
    return text ? text : 'N/A';
  };

  const diamondDetailsRows: SpecRow[] = [
    { label: 'Product ID', value: specValue(catalogItem?.productId || catalogItem?.id || selected?.id || '') },
    { label: 'Description', value: specValue(catalogItem?.description || selected?.desc || '') },
    { label: 'Main Diamond Shape', value: specValue(catalogItem?.mainDiamondShape || displaySpec.shape) },
    { label: 'Main Diamond Weight', value: specValue(catalogItem?.mainDiamondWeight) },
    { label: 'Main Diamond Clarity', value: specValue(catalogItem?.mainDiamondClarity || displaySpec.clarity) },
    { label: 'Main Diamond Color', value: specValue(catalogItem?.mainDiamondColor || displaySpec.color) },
    { label: 'Cut', value: specValue(catalogItem?.cut) },
    { label: 'Symmetry', value: specValue(catalogItem?.symmetry) },
    { label: 'Polish', value: specValue(catalogItem?.polish) },
    { label: 'Secondary Diamond Weight', value: specValue(catalogItem?.secondaryDiamondWeight) },
    { label: 'Secondary Diamond Clarity', value: specValue(catalogItem?.secondaryDiamondClarity) },
    { label: 'Secondary Diamond Color', value: specValue(catalogItem?.secondaryDiamondColor) },
  ];

  const metalCertificationRows: SpecRow[] = [
    { label: 'Metal Type', value: specValue(catalogItem?.metalType) },
    { label: 'Metal Purity', value: specValue(catalogItem?.metalPurity) },
    { label: 'Metal Color', value: specValue(catalogItem?.metalColor) },
    { label: 'Metal Weight (g)', value: specValue(catalogItem?.metalWeight || displaySpec.carat) },
    { label: 'Replacement Value', value: specValue(catalogItem?.replacementValue) },
    { label: 'Certification', value: specValue(catalogItem?.certification) },
  ];

  const toggleSaved = (title: string) => {
    setSavedProjects((prev) => {
      const updated = { ...prev, [title]: !prev[title] };
      localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleReserveClick = async () => {
    setLoadingAction('reserve');
    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoadingAction(null);
    setActivePopup('reserve');
    setReserveStep('confirm');
    setInquiryForm({
      name: '',
      email: '',
      message: `I am interested in reserving the ${selected?.title || 'item'}.`,
    });
  };

  const handleEnquireClick = async () => {
    setLoadingAction('enquire');
    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoadingAction(null);
    setSelected(null);
    navigate('/contact');
  };

  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)' }} />
        <div className="relative mx-auto max-w-7xl">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Portfolio</p>
            <h1 className="luxury-heading mt-4 text-foreground">
              Our <span className="text-gold-gradient">Masterpieces</span>
            </h1>
            <p className="luxury-body mt-6 max-w-2xl text-muted-foreground">
              A curated collection of our finest work in gold refining, precision casting,
              and custom jewelry design.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Filter */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl gap-1 px-6 md:px-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`relative min-h-[44px] px-6 py-4 font-body text-sm font-light uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${active === cat ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-primary'}`}
            >
              {cat}
              {active === cat && (
                <motion.div
                  layoutId="portfolio-tab"
                  className="absolute bottom-0 left-0 right-0 h-px bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Gallery - Depth Cards */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <motion.div layout className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="sm:col-span-2 md:col-span-3 lg:col-span-4 rounded-xl border border-border bg-card/40 p-10 text-center"
                >
                  <p className="font-body text-xs font-light uppercase tracking-[0.3em] text-muted-foreground">
                    {loadError ||
                      (pb.authStore.isValid
                        ? "No jewelry items found. Create products in Admin to see them here."
                        : "No jewelry items returned. If Admin shows products, make the PocketBase 'products' list/view rules public (or set VITE_PB_URL to the correct database).")}
                  </p>
                </motion.div>
              )}
              {filtered.map((project, i) => {
                const catalogItem = project.catalogItem;
                const cardTitle = catalogItem?.name ?? project.title;
                const cardAlt = catalogItem?.name ?? (project.alt || project.title);
                const cardImage = project.imgMedium || project.img;

                return (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, rotateY: -5 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    onClick={() => {
                      if (isModalAllowed(project)) {
                        setSelected(project);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isModalAllowed(project)) {
                          setSelected(project);
                        }
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${cardTitle}`}
                    className="group relative cursor-pointer perspective-[1000px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <motion.div
                      whileHover={{ rotateY: 3, rotateX: -2, scale: 1.02 }}
                      transition={{ duration: 0.4 }}
                      className="relative overflow-hidden border border-border bg-card shadow-elevation"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                      {cardImage ? (
                        <img
                          src={cardImage}
                          srcSet={buildSrcSet(project)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          alt={cardAlt}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/10">
                          <span className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground">No image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <span className="font-body text-[0.65rem] font-light uppercase tracking-[0.3em] text-primary">
                        {project.cat}
                      </span>
                      <h3 className="mt-1 line-clamp-2 font-display text-lg font-medium text-foreground">{cardTitle}</h3>
                      <p className="mt-1 line-clamp-1 font-body text-xs font-light text-muted-foreground">{project.desc}</p>
                    </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Portfolio Popup Modal */}
      <AnimatePresence>
        {selected && isModalAllowed(selected) && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActivePopup(null);
              setSelected(null);
            }}
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative mx-auto w-full max-w-6xl overflow-hidden"
              style={{
                background: 'hsl(var(--obsidian) / 0.9)',
                border: '1px solid hsl(var(--gold) / 0.52)',
                boxShadow: '0 30px 90px hsl(0 0% 0% / 0.55), 0 0 28px hsl(var(--gold) / 0.16)',
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.title} specifications`}
            >
              <button
                type="button"
                onClick={() => toggleSaved(selected.title)}
                aria-pressed={!!savedProjects[selected.title]}
                aria-label={savedProjects[selected.title] ? `Remove ${selected.title} from saved` : `Save ${selected.title}`}
                className="absolute left-4 top-4 z-10 inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center border border-primary/50 bg-black/35 text-primary transition-all duration-200 hover:bg-primary/12 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/70"
              >
                <Heart
                  size={18}
                  className={savedProjects[selected.title] ? 'fill-primary text-primary' : 'text-primary'}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePopup(null);
                  setSelected(null);
                }}
                className="absolute right-4 top-4 z-10 inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center border border-primary/40 bg-black/30 text-primary transition-all duration-200 hover:bg-primary/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/70"
                aria-label="Close popup"
              >
                X
              </button>

              <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
                <div className="relative h-full min-h-[320px] overflow-hidden md:min-h-[560px]">
                  <img
                    src={selected.imgLarge || selected.imgMedium || selected.img}
                    srcSet={buildSrcSet(selected)}
                    sizes="(max-width: 768px) 100vw, 60vw"
                    alt={selected.alt || selected.title}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30" />
                </div>

                <div className="flex flex-col p-6 md:p-10">
                  <p className="font-body text-xs uppercase tracking-[0.32em] text-primary">Portfolio Piece</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                    {displayTitle}
                  </h2>

                  <div className="mt-8 space-y-4">
                    <SpecAccordionSection
                      title="Diamond Details"
                      rows={diamondDetailsRows}
                      isOpen={openSections.diamond}
                      onToggle={() =>
                        setOpenSections((prev) => ({ ...prev, diamond: !prev.diamond }))
                      }
                    />
                    <SpecAccordionSection
                      title="Metal & Certification"
                      rows={metalCertificationRows}
                      isOpen={openSections.metal}
                      onToggle={() => setOpenSections((prev) => ({ ...prev, metal: !prev.metal }))}
                    />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleReserveClick}
                      disabled={loadingAction !== null}
                      aria-label="Reserve this item now"
                      className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-primary px-6 py-3 font-body text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-all duration-300 hover:shadow-gold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'reserve' ? 'Processing...' : 'Reserve Now'}
                    </button>
                    <button
                      type="button"
                      onClick={handleEnquireClick}
                      disabled={loadingAction !== null}
                      aria-label="Enquire about this item"
                      className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-transparent px-6 py-3 font-body text-xs font-semibold uppercase tracking-[0.22em] text-primary transition-all duration-300 hover:bg-primary/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'enquire' ? 'Redirecting...' : 'Enquire'}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {activePopup === 'reserve' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      className="w-full max-w-md border border-primary/50 bg-[hsl(var(--obsidian)/0.96)] p-6 shadow-elevation"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Reservation confirmation"
                    >
                      {reserveStep === 'confirm' && (
                        <>
                          <h3 className="font-display text-2xl text-primary">Reservation Initiated</h3>
                          <p className="mt-3 font-body text-sm text-foreground">
                            Your reservation request for <span className="text-primary">{selected.title}</span> has been started.
                            Our team will contact you shortly.
                          </p>
                          <div className="mt-6 flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActivePopup(null)}
                              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Close reservation confirmation"
                            >
                              Close
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReserveStep('form');
                                setInquiryForm((prev) => ({
                                  ...prev,
                                  message: `I am interested in reserving the ${selected.title}.`,
                                }));
                              }}
                              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-primary px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Continue to inquiry form"
                            >
                              Continue
                            </button>
                          </div>
                        </>
                      )}

                      {reserveStep === 'form' && (
                        <form
                          className="space-y-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setReserveStep('thankyou');
                          }}
                        >
                          <h3 className="font-display text-2xl text-primary">Inquiry Details</h3>
                          <div className="space-y-3">
                            <input
                              type="text"
                              name="name"
                              placeholder="Name"
                              value={inquiryForm.name}
                              onChange={(e) => setInquiryForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="h-11 w-full border border-primary/50 bg-transparent px-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            />
                            <input
                              type="email"
                              name="email"
                              placeholder="Email"
                              value={inquiryForm.email}
                              onChange={(e) => setInquiryForm((prev) => ({ ...prev, email: e.target.value }))}
                              className="h-11 w-full border border-primary/50 bg-transparent px-4 font-display text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            />
                            <textarea
                              name="message"
                              value={inquiryForm.message}
                              onChange={(e) => setInquiryForm((prev) => ({ ...prev, message: e.target.value }))}
                              rows={4}
                              className="w-full resize-none border border-primary/50 bg-transparent px-4 py-3 font-display text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              required
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActivePopup(null)}
                              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-transparent px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Close inquiry form"
                            >
                              Close
                            </button>
                            <button
                              type="submit"
                              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-primary px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Submit inquiry"
                            >
                              Submit
                            </button>
                          </div>
                        </form>
                      )}

                      {reserveStep === 'thankyou' && (
                        <>
                          <h3 className="font-display text-2xl text-primary">Thank You</h3>
                          <p className="mt-3 font-body text-sm text-foreground">
                            Thank you, our concierge will contact you shortly.
                          </p>
                          <div className="mt-6">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePopup(null);
                                setSelected(null);
                                setReserveStep('confirm');
                              }}
                              className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-primary px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label="Close thank you message"
                            >
                              Close
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
