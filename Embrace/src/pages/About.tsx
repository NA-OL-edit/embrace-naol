import { FadeUp, SlideIn } from '@/components/AnimationWrappers';
import aboutBg from '@/assets/back.png';

const milestones = [
  { year: '2005', title: 'Founded', desc: 'Established as a boutique gold refinery in California.' },
  { year: '2010', title: 'Jewelry Division', desc: 'Expanded into precision jewelry casting services.' },
  { year: '2017', title: 'Global Reach', desc: 'Began serving clients across 10+ countries worldwide.' },
  { year: '2020', title: 'Innovation Lab', desc: 'Launched advanced 3D printing and CAD design capabilities.' },
  { year: '2026', title: 'Industry Leader', desc: 'Recognized as a top-tier refinery with 99.99% purity standards.' },
];

export default function About() {
  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-end overflow-hidden">
        <div className="absolute inset-0">
          <img fetchPriority="high" src={aboutBg} alt="Refinery workshop" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-12">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Our Story</p>
            <h1 className="luxury-heading mt-4 text-foreground">
              A Legacy of <span className="text-gold-gradient">Precision</span>
            </h1>
          </FadeUp>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding">
        <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-2">
          <FadeUp>
            <div>
              <h2 className="luxury-subheading text-foreground">Crafting Excellence Since 2005</h2>
              <p className="luxury-body mt-6 text-muted-foreground">
                Embrace Jewelery was born from a singular vision: to elevate the art of fine jewelry
                and bespoke craftsmanship to timeless standards. Our founders, master artisans
                with generations of expertise, established a workshop where design meets precision.
              </p>
              <p className="luxury-body mt-4 text-muted-foreground">
                Today, we operate one of the most advanced precious metals facilities in the world,
                combining centuries-old craftsmanship with cutting-edge technology to deliver results
                that exceed expectations.
              </p>
            </div>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="space-y-8">
              <div className="bg-glass-gold p-8">
                <span className="font-display text-4xl font-light text-primary">99.99%</span>
                <p className="mt-2 font-body text-sm font-light text-muted-foreground">
                  Our refining process achieves four-nines purity, the highest standard in the industry.
                </p>
              </div>
              <div className="bg-glass-gold p-8">
                <span className="font-display text-4xl font-light text-primary">ISO 9001</span>
                <p className="mt-2 font-body text-sm font-light text-muted-foreground">
                  Certified quality management systems across all operations.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-card">
        <div className="mx-auto max-w-4xl">
          <FadeUp>
            <p className="text-center font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Milestones</p>
            <h2 className="luxury-subheading mt-4 text-center text-foreground">Our Journey</h2>
          </FadeUp>

          <div className="relative mt-16">
            {/* Line */}
            <div className="absolute left-8 top-0 h-full w-px bg-border md:left-1/2" />

            {milestones.map((m, i) => (
              <SlideIn key={m.year} delay={i * 0.1}>
                <div className={`relative mb-12 flex items-start gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="hidden flex-1 md:block" />
                  <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center border border-primary bg-background">
                    <span className="font-display text-sm font-medium text-primary">{m.year}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-medium text-foreground">{m.title}</h3>
                    <p className="mt-2 font-body text-sm font-light text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </SlideIn>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
