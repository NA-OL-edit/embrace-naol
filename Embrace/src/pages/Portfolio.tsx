import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeUp } from '@/components/AnimationWrappers';
import portfolio1 from '@/assets/portfolio-1.jpg';
import portfolio2 from '@/assets/portfolio-2.jpg';
import portfolio3 from '@/assets/portfolio-3.jpg';
import portfolio4 from '@/assets/portfolio-4.jpg';

const categories = ['All', 'Refining', 'Casting', 'Custom'];

const projects = [
  { img: portfolio1, title: 'Royal Signet Ring', cat: 'Casting', desc: '24K gold signet with diamond pavé setting' },
  { img: portfolio2, title: 'Investment Bars', cat: 'Refining', desc: '99.99% pure gold bullion, 1kg certified bars' },
  { img: portfolio3, title: 'Heritage Necklace', cat: 'Custom', desc: 'Bespoke diamond and gold statement necklace' },
  { img: portfolio4, title: 'Artisan Pendant', cat: 'Casting', desc: 'Hand-cast pendant with organic gold texture' },
  { img: portfolio1, title: 'Eternity Band', cat: 'Custom', desc: 'Channel-set diamond eternity ring in 18K' },
  { img: portfolio2, title: 'Refined Ingots', cat: 'Refining', desc: 'Small-batch artisan gold ingots for collectors' },
];

export default function Portfolio() {
  const [active, setActive] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = active === 'All' ? projects : projects.filter((p) => p.cat === active);

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
              className={`relative px-6 py-4 font-body text-sm font-light uppercase tracking-[0.15em] transition-colors
                ${active === cat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
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
                  key={project.title + project.cat}
                  layout
                  initial={{ opacity: 0, scale: 0.9, rotateY: -5 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className="group relative cursor-pointer perspective-[1000px]"
                >
                  <motion.div
                    whileHover={{ rotateY: 3, rotateX: -2, scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden border border-border bg-card shadow-elevation"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={project.img}
                        alt={project.title}
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
                    {/* Glass reflection overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
