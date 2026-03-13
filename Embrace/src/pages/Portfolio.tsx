import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FadeUp } from '@/components/AnimationWrappers';
import { listMedia, type MediaImage } from '@/lib/media';
import jewelryCatalog from '@/data/jewelryCatalog.json';

const SAVED_PROJECTS_KEY = 'savedPortfolioProjects';

type Project = {
  id: string;
  img: string;
  imgMedium?: string;
  imgLarge?: string;
  alt: string;
  title: string;
  cat: string;
  desc: string;
};

type CatalogItem = {
  id: string;
  name: string;
  shape: string;
  color: string;
  clarity: string;
  carat: string;
};

const localImageModules = import.meta.glob('../assets/portfolio/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function toTitle(value: string) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[()]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryFromPath(relativePath: string) {
  const folder = (relativePath.split('/')[0] || '').toLowerCase();
  if (folder === 'casting') return 'Casting';
  if (folder === 'refining') return 'Refining';
  return 'Custom';
}

function descriptionFromCategory(cat: string) {
  if (cat === 'Casting') return 'High-precision casting engineered for timeless luxury pieces';
  if (cat === 'Refining') return 'Precision gold refining with premium finishing details';
  return 'Bespoke custom design crafted for signature statements';
}

const JEWELRY_CATALOG: CatalogItem[] = jewelryCatalog.jewelryCatalog;

const KEYWORD_PRIORITY = [
  'eritrea',
  'cuban',
  'lion',
  'jesus',
  'archangel',
  'byzantine',
  'franco',
  'bracelet',
  'necklace',
  'pendant',
];

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeId(value: string) {
  return value.trim().toLowerCase();
}

function stripExtension(value: string) {
  return value.replace(/\.[^.]+$/, '');
}

function getFileNameFromSrc(src: string | undefined) {
  if (!src) return '';
  const clean = src.split('?')[0].split('#')[0];
  try {
    const url = new URL(clean, window.location.origin);
    const base = url.pathname.split('/').pop() || '';
    return decodeURIComponent(base);
  } catch {
    const base = clean.split('/').pop() || '';
    return decodeURIComponent(base);
  }
}

function scoreNameMatch(title: string, name: string) {
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

function findSpecByName(title: string, fileNameBase: string) {
  if (!title && !fileNameBase) return null;
  let best: CatalogItem | null = null;
  let bestScore = -Infinity;
  let tie = false;

  JEWELRY_CATALOG.forEach((item) => {
    const scoreFromTitle = title ? scoreNameMatch(title, item.name) : -1;
    const scoreFromFile = fileNameBase ? scoreNameMatch(fileNameBase, item.name) : -1;
    const score = Math.max(scoreFromTitle, scoreFromFile);
    if (score > bestScore) {
      bestScore = score;
      best = item;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  });

  if (bestScore <= 0 || tie) return null;
  return best;
}

function findCatalogItem(project: Project | null) {
  if (!project) return null;
  const src = project.imgLarge || project.imgMedium || project.img;
  const fileName = getFileNameFromSrc(src);
  if (fileName) {
    const normalizedFileName = normalizeId(fileName);
    const direct = JEWELRY_CATALOG.find((item) => normalizeId(item.id) === normalizedFileName);
    if (direct) return direct;
    const baseMatch = JEWELRY_CATALOG.find(
      (item) => stripExtension(normalizeId(item.id)) === stripExtension(normalizedFileName)
    );
    if (baseMatch) return baseMatch;
  }
  const baseName = fileName ? stripExtension(fileName) : '';
  const normalizedTitle = normalizeForMatch(project.title);
  if (baseName === 'portfolio-2' || normalizedTitle === 'portfolio 2') {
    return JEWELRY_CATALOG.find((item) => normalizeId(item.id) === 'portfolio-2.jpg') || null;
  }
  if (baseName === 'portfolio-3' || normalizedTitle === 'portfolio 3') {
    return JEWELRY_CATALOG.find((item) => normalizeId(item.id) === 'portfolio-3.jpg') || null;
  }
  return findSpecByName(project.title, baseName);
}

function hasCatalogMatch(project: Project) {
  const fileName = getFileNameFromSrc(project.imgLarge || project.imgMedium || project.img);
  if (!fileName) return false;
  const normalizedFileName = normalizeId(fileName);
  return JEWELRY_CATALOG.some(
    (item) => normalizeId(item.id) === normalizedFileName || stripExtension(normalizeId(item.id)) === stripExtension(normalizedFileName)
  );
}

const PORTFOLIO_EXCLUDE_IDS = new Set(['p (7).png', 'portfolio-4.jpg', 'f (4).jpg']);
const PORTFOLIO_EXCLUDE_TITLES = new Set(['p 7', 'portfolio 4', 'f 4']);

function isModalAllowed(project: Project | null) {
  return !!project;
}

function isPortfolioExcluded(project: Project) {
  const catalogItem = findCatalogItem(project);
  if (catalogItem && PORTFOLIO_EXCLUDE_IDS.has(catalogItem.id)) return true;
  const titleNorm = normalizeForMatch(project.title);
  if (titleNorm && PORTFOLIO_EXCLUDE_TITLES.has(titleNorm)) return true;
  const fileName = getFileNameFromSrc(project.imgLarge || project.imgMedium || project.img);
  return fileName ? PORTFOLIO_EXCLUDE_IDS.has(fileName) : false;
}

const fallbackProjects: Project[] = Object.entries(localImageModules)
  .map(([modulePath, img], index) => {
    const relativePath = modulePath.replace('../assets/portfolio/', '');
    const name = relativePath.split('/').pop() || relativePath;
    const title = toTitle(name);
    const cat = categoryFromPath(relativePath);
    return {
      id: `${toSlug(relativePath)}-${index + 1}`,
      img,
      alt: title,
      title,
      cat,
      desc: descriptionFromCategory(cat),
    };
  })
  .filter((item) => {
    if (isPortfolioExcluded(item)) return false;
    const t = item.title.toLowerCase();
    return t !== 'hero bg' && t !== 'about bg' && t !== 'logo';
  });

function mapMediaImageToProject(image: MediaImage): Project {
  return {
    id: image.id,
    img: image.variants.thumb || image.variants.medium || image.variants.large,
    imgMedium: image.variants.medium,
    imgLarge: image.variants.large,
    alt: image.alt || image.title,
    title: image.title,
    cat: image.category,
    desc: image.description,
  };
}

function buildSrcSet(project: Project) {
  const urls = [project.img, project.imgMedium, project.imgLarge].filter(Boolean) as string[];
  const uniqueUrls = Array.from(new Set(urls));
  if (uniqueUrls.length < 2) return undefined;

  const medium = project.imgMedium || project.img;
  const large = project.imgLarge || medium;
  return `${project.img} 480w, ${medium} 960w, ${large} 1440w`;
}

export default function Portfolio() {
  const [active, setActive] = useState('All');
  const [projects, setProjects] = useState<Project[]>(fallbackProjects);
  const [selected, setSelected] = useState<Project | null>(null);
  const [savedProjects, setSavedProjects] = useState<Record<string, boolean>>({});
  const [loadingAction, setLoadingAction] = useState<'reserve' | 'enquire' | null>(null);
  const [activePopup, setActivePopup] = useState<'reserve' | null>(null);
  const [reserveStep, setReserveStep] = useState<'confirm' | 'form' | 'thankyou'>('confirm');
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', message: '' });
  const specTableRef = useRef<HTMLDivElement | null>(null);
  const [specScrollNeeded, setSpecScrollNeeded] = useState(false);
  const navigate = useNavigate();

  const categories = ['All', ...Array.from(new Set(projects.map((p) => p.cat)))];
  const filtered = active === 'All' ? projects : projects.filter((p) => p.cat === active);
  const catalogItem = findCatalogItem(selected);
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
        const response = await listMedia({ limit: 500 });
        if (cancelled) return;

        if (response.items.length > 0) {
          const mediaProjects = response.items.map(mapMediaImageToProject).filter((item) => !isPortfolioExcluded(item));
          const matchedCount = mediaProjects.filter(hasCatalogMatch).length;
          if (matchedCount > 0 && matchedCount === mediaProjects.length) {
            setProjects(mediaProjects);
          } else {
            setProjects(fallbackProjects);
          }
        } else {
          setProjects(fallbackProjects);
        }
      } catch {
        if (!cancelled) {
          setProjects(fallbackProjects);
        }
      }
    };

    void loadCatalog();
    return () => {
      cancelled = true;
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

  useLayoutEffect(() => {
    if (!specTableRef.current) return;
    const contentHeight = specTableRef.current.scrollHeight;
    setSpecScrollNeeded(contentHeight > 220);
  }, [catalogItem, selected?.title]);

  const specValue = (value: string) => (value && value.trim() ? value : 'N/A');

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
              {filtered.map((project, i) => {
                const catalogItem = findCatalogItem(project);
                const cardTitle = catalogItem?.name ?? project.title;
                const cardAlt = catalogItem?.name ?? (project.alt || project.title);

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
                      <img
                        src={project.imgMedium || project.img}
                        srcSet={buildSrcSet(project)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        alt={cardAlt}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
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

                  <div
                    className="mt-8"
                    style={specScrollNeeded ? { maxHeight: 220, overflowY: 'auto' } : { overflow: 'visible' }}
                  >
                    <div ref={specTableRef} className="portfolio-spec-table border border-primary/30">
                      {[
                        ['Shape', specValue(displaySpec.shape)],
                        ['Color', specValue(displaySpec.color)],
                        ['Clarity', specValue(displaySpec.clarity)],
                        ['Carat', specValue(displaySpec.carat)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="grid grid-cols-2 border-b border-primary/25 px-5 py-4 last:border-b-0"
                        >
                          <span className="portfolio-spec-label font-body text-xs uppercase tracking-[0.2em] text-primary">{label}</span>
                          <span className="portfolio-spec-value text-right font-body text-sm text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
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
