import { Flame, Gem, Shield, Award, Layers, Sparkles } from 'lucide-react';
import { FadeUp } from '@/components/AnimationWrappers';

const services = [
  {
    icon: Flame,
    title: 'Gold Refining',
    desc: 'Our state-of-the-art refining process transforms raw gold into metal of the highest purity. Using advanced electrolytic and chemical methods, we consistently achieve 99.99% (four nines) purity.',
    features: ['Electrolytic refining', 'Chemical processing', 'Purity certification', 'Scrap recovery'],
  },
  {
    icon: Gem,
    title: 'Jewelry Casting',
    desc: 'Precision lost-wax casting for individual bespoke pieces and production runs. Our master casters work with gold, silver, platinum, and palladium alloys.',
    features: ['Lost-wax casting', 'Centrifugal casting', 'Vacuum casting', 'Multi-metal alloys'],
  },
  {
    icon: Shield,
    title: 'Assay & Testing',
    desc: 'Our ISO-accredited laboratory provides comprehensive precious metals analysis. From fire assay to X-ray fluorescence, we deliver certified results.',
    features: ['Fire assay', 'XRF analysis', 'ICP-OES testing', 'Hallmarking'],
  },
  {
    icon: Sparkles,
    title: 'Custom Design',
    desc: 'From concept sketches to 3D CAD modeling, our design team creates unique jewelry pieces that push the boundaries of craftsmanship.',
    features: ['3D CAD modeling', 'Rapid prototyping', 'Stone setting', 'Hand finishing'],
  },
  {
    icon: Layers,
    title: 'Precious Metal Trading',
    desc: 'Buy and sell refined gold, silver, and platinum at competitive market rates. Secure storage and insured delivery worldwide.',
    features: ['Market-rate pricing', 'Secure vaulting', 'Insured delivery', 'Investment bars'],
  },
  {
    icon: Award,
    title: 'Consultation',
    desc: 'Expert advisory services for jewelers, investors, and collectors. We guide you through every step of your precious metals journey.',
    features: ['Material selection', 'Process optimization', 'Quality audits', 'Training'],
  },
];

export default function Services() {
  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)' }} />
        <div className="relative mx-auto max-w-7xl">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Services</p>
            <h1 className="luxury-heading mt-4 max-w-3xl text-foreground">
              The Full Spectrum of <span className="text-gold-gradient">Excellence</span>
            </h1>
            <p className="luxury-body mt-6 max-w-2xl text-muted-foreground">
              From raw ore to finished masterpiece, our comprehensive suite of services
              covers every aspect of precious metal refinement and jewelry creation.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-card">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <FadeUp key={service.title} delay={i * 0.08}>
                <div className="group relative flex h-full flex-col border border-border bg-background p-8 transition-all duration-500 hover:border-primary/30 hover:shadow-gold">
                  <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 transition-transform duration-700 group-hover:scale-[2]" />
                  <service.icon className="relative h-10 w-10 text-primary" strokeWidth={1} />
                  <h3 className="relative mt-6 font-display text-2xl font-medium text-foreground">{service.title}</h3>
                  <p className="relative mt-4 flex-1 font-body text-sm font-light leading-relaxed text-muted-foreground">
                    {service.desc}
                  </p>
                  <div className="relative mt-6 border-t border-border pt-6">
                    <div className="grid grid-cols-2 gap-2">
                      {service.features.map((f) => (
                        <span key={f} className="font-body text-xs font-light text-muted-foreground">
                          • {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="section-padding">
        <div className="mx-auto max-w-5xl">
          <FadeUp>
            <p className="text-center font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Process</p>
            <h2 className="luxury-subheading mt-4 text-center text-foreground">How We Work</h2>
          </FadeUp>

          <div className="mt-16 grid gap-px bg-border md:grid-cols-4">
            {[
              { step: '01', title: 'Consultation', desc: 'We discuss your needs and establish specifications.' },
              { step: '02', title: 'Analysis', desc: 'Material assessment and process planning.' },
              { step: '03', title: 'Execution', desc: 'Precision refining or casting with quality controls.' },
              { step: '04', title: 'Delivery', desc: 'Certified results with secure, insured delivery.' },
            ].map((item, i) => (
              <FadeUp key={item.step} delay={i * 0.15}>
                <div className="flex h-full flex-col bg-background p-8">
                  <span className="font-display text-4xl font-light text-primary/30">{item.step}</span>
                  <h3 className="mt-4 font-display text-xl font-medium text-foreground">{item.title}</h3>
                  <p className="mt-3 font-body text-sm font-light text-muted-foreground">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
