import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FadeUp } from '@/components/AnimationWrappers';
import { listMedia, type MediaImage } from '@/lib/media';
import f1Img from '@/assets/portfolio/custom/f (1).jpg';
import f3Img from '@/assets/portfolio/custom/f (3).jpg';
import f4Img from '@/assets/portfolio/refining/f (4).jpg';
import g12Img from '@/assets/portfolio/casting/g1 (2).png';
import g13Img from '@/assets/portfolio/refining/g1 (3).png';
import g14Img from '@/assets/portfolio/casting/g1 (4).png';
import g15Img from '@/assets/portfolio/custom/g1 (5).png';
import g16Img from '@/assets/portfolio/casting/g1 (6).png';
import g17Img from '@/assets/portfolio/casting/g1 (7).png';
import g18Img from '@/assets/portfolio/custom/g1 (8).png';
import geminiImg from '@/assets/portfolio/casting/Custom.png';
import p1Img from '@/assets/portfolio/refining/p (1).png';
import p2Img from '@/assets/portfolio/refining/p (2).png';
import p3Img from '@/assets/portfolio/custom/p (3).png';
import p4Img from '@/assets/portfolio/refining/p (4).png';
import p5Img from '@/assets/portfolio/casting/p (5).png';
import p6Img from '@/assets/portfolio/custom/p (6).png';
import p7Img from '@/assets/portfolio/refining/portfolio-3.jpg';

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

const fallbackProjects: Project[] = [
  // REFINING (6)
  { id: 'molten-pour', img: f4Img, alt: 'Molten Pour', title: 'Molten Pour', cat: 'Refining', desc: 'Precision gold casting into industrial molds' },
  { id: 'diamond-selection', img: p1Img, alt: 'Diamond Selection', title: 'Diamond Selection', cat: 'Refining', desc: 'Raw and brilliant-cut diamonds in luxury display' },
  { id: 'heritage-necklace', img: p7Img, alt: 'Heritage Necklace', title: 'Heritage Necklace', cat: 'Refining', desc: 'Bespoke diamond and gold statement piece' },
  { id: 'masterpiece-collection', img: p2Img, alt: 'Masterpiece Collection', title: 'Masterpiece Collection', cat: 'Refining', desc: 'Curated emerald-cut diamond gallery display' },
  { id: 'asscher-solitaire', img: p4Img, alt: 'Asscher Solitaire', title: 'Asscher Solitaire', cat: 'Refining', desc: 'Monumental Asscher-cut diamond in vault presentation' },
  { id: 'signature-cuban', img: g13Img, alt: 'Signature Cuban', title: 'Signature Cuban', cat: 'Refining', desc: 'Heavy-gauge gold link with mirror-polish finish' },

  // CASTING (6)
  { id: 'cuban-bracelet', img: g12Img, alt: 'Cuban Bracelet', title: 'Cuban Bracelet', cat: 'Casting', desc: 'Miami Cuban link with high-security box clasp' },
  { id: 'pyramid-signet', img: g14Img, alt: 'Pyramid Signet', title: 'Pyramid Signet', cat: 'Casting', desc: 'Architectural 18K gold ring with center diamond' },
  { id: 'cuban-heirloom', img: g16Img, alt: 'Cuban Heirloom', title: 'Cuban Heirloom', cat: 'Casting', desc: 'Solid gold chain with crown-engraved insignia' },
  { id: 'divine-icon', img: g17Img, alt: 'Divine Icon', title: 'Divine Icon', cat: 'Casting', desc: 'Diamond-encrusted Jesus piece on heavy gold chain' },
  { id: 'radiant-twist', img: p5Img, alt: 'Radiant Twist', title: 'Radiant Twist', cat: 'Casting', desc: 'Radiant-cut diamond in rose gold infinity swirl' },
  { id: 'celestial-signet', img: geminiImg, alt: 'Celestial Signet', title: 'Celestial Signet', cat: 'Casting', desc: '3D-engineered 18K gold star-motif signet' },
  // CUSTOM (6)
  { id: 'artisan-band-set', img: f1Img, alt: 'Artisan Band Set', title: 'Artisan Band Set', cat: 'Custom', desc: '24K Four distinct gold bands with diamond accents' },
  { id: 'signature-link', img: f3Img, alt: 'Signature Link', title: 'Signature Link', cat: 'Custom', desc: 'Classic heavy-gauge gold link chain with a high-polish finish' },
  { id: 'monarch-cuban', img: g15Img, alt: 'Monarch Cuban', title: 'Monarch Cuban', cat: 'Custom', desc: 'Substantial 10K gold chain with a crown-engraved box clasp' },
  { id: 'channel-solitaire', img: g18Img, alt: 'Channel Solitaire', title: 'Channel Solitaire', cat: 'Custom', desc: 'Round brilliant diamond in an 18K channel-set diamond band' },
  { id: 'jewelry-showcase', img: p3Img, alt: 'Jewelry Showcase', title: 'Jewelry Showcase', cat: 'Custom', desc: 'Bespoke diamond rings featuring oval and emerald master-cuts' },
  { id: 'stardust-cuff', img: p6Img, alt: 'Stardust Cuff', title: 'Stardust Cuff', cat: 'Custom', desc: 'Polished white gold cuff with star-set brilliant diamonds' },
];

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
  const navigate = useNavigate();

  const categories = ['All', ...Array.from(new Set(projects.map((p) => p.cat)))];
  const filtered = active === 'All' ? projects : projects.filter((p) => p.cat === active);

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
          setProjects(response.items.map(mapMediaImageToProject));
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
          <motion.div layout className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((project, i) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, rotateY: -5 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  onClick={() => setSelected(project)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(project);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open details for ${project.title}`}
                  className="group relative cursor-pointer perspective-[1000px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <motion.div
                    whileHover={{ rotateY: 3, rotateX: -2, scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden border border-border bg-card shadow-elevation"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={project.imgMedium || project.img}
                        srcSet={buildSrcSet(project)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        alt={project.alt || project.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className="font-body text-xs font-light uppercase tracking-[0.3em] text-primary">
                        {project.cat}
                      </span>
                      <h3 className="mt-1 font-display text-xl font-medium text-foreground">{project.title}</h3>
                      <p className="mt-1 font-body text-sm font-light text-muted-foreground">{project.desc}</p>
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Portfolio Popup Modal */}
      <AnimatePresence>
        {selected && (
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
                    {selected.title}
                  </h2>

                  <div className="mt-8 border border-primary/30">
                    {[
                      ['Shape', 'Round Brilliant'],
                      ['Cut', 'Excellent'],
                      ['Color', 'D'],
                      ['Clarity', 'VVS1'],
                      ['Carat', '2.10 ct'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-2 border-b border-primary/25 px-5 py-4 last:border-b-0"
                      >
                        <span className="font-body text-xs uppercase tracking-[0.2em] text-primary">{label}</span>
                        <span className="text-right font-body text-sm text-white">{value}</span>
                      </div>
                    ))}
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
                            setActivePopup(null);
                            setSelected(null);
                            navigate('/contact');
                          }}
                          className="inline-flex h-11 min-h-[44px] w-full items-center justify-center border border-primary bg-primary px-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:shadow-gold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Continue to contact page"
                        >
                          Continue
                        </button>
                      </div>
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
