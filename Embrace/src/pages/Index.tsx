import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Gem, Flame, Shield, Award } from 'lucide-react';
import HeroScene from '@/components/HeroScene';
import { FadeUp, ScaleIn } from '@/components/AnimationWrappers';
import heroBg from '@/assets/hero-bg.jpg';
import portfolio1 from '@/assets/portfolio-1.jpg';
import portfolio2 from '@/assets/portfolio-2.jpg';
import portfolio3 from '@/assets/portfolio-3.jpg';

const stats = [
  { value: '99.99%', label: 'Purity Guaranteed' },
  { value: '25+', label: 'Years of Excellence' },
  { value: '5,000+', label: 'Projects Delivered' },
  { value: '40+', label: 'Countries Served' },
];

const services = [
  { icon: Flame, title: 'Gold Refining', desc: 'State-of-the-art refining processes achieving the highest purity standards.' },
  { icon: Gem, title: 'Jewelry Casting', desc: 'Precision lost-wax casting for bespoke and production jewelry.' },
  { icon: Shield, title: 'Assay & Testing', desc: 'Certified laboratory analysis with internationally recognized standards.' },
  { icon: Award, title: 'Custom Design', desc: 'From concept to creation, we bring your vision to life in precious metals.' },
];

export default function Index() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-background/80" />
          <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)' }} />
        </div>

        {/* 3D Scene */}
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-3xl"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-6 font-body text-sm font-light uppercase tracking-[0.4em] text-primary"
            >
              Gold Refining & Jewelry Casting
            </motion.p>
            <h1 className="luxury-heading text-foreground">
              Where{' '}
              <span className="text-gold-gradient">Molten Gold</span>
              <br />
              Becomes Art
            </h1>
            <p className="luxury-body mt-8 max-w-xl text-muted-foreground">
              We transform raw precious metals into refined gold of unparalleled purity,
              and cast bespoke jewelry that embodies timeless elegance.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/services"
                className="group inline-flex items-center gap-3 rounded-none border border-primary bg-primary px-8 py-4 font-body text-sm font-medium uppercase tracking-[0.15em] text-primary-foreground transition-all duration-500 hover:shadow-gold"
              >
                Our Services
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-3 rounded-none border border-border px-8 py-4 font-body text-sm font-light uppercase tracking-[0.15em] text-foreground transition-all duration-500 hover:border-primary hover:text-primary"
              >
                View Portfolio
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-body text-xs font-light uppercase tracking-[0.3em] text-muted-foreground">
              Scroll
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-8 w-px bg-primary/40"
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
          {stats.map((stat, i) => (
            <FadeUp key={stat.label} delay={i * 0.1}>
              <div className="flex flex-col items-center border-r border-border px-6 py-12 last:border-r-0 md:py-16">
                <span className="font-display text-3xl font-light text-primary md:text-4xl">{stat.value}</span>
                <span className="mt-2 text-center font-body text-xs font-light uppercase tracking-[0.15em] text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* Services Preview */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">What We Do</p>
            <h2 className="luxury-subheading mt-4 text-foreground">Mastery in Every Detail</h2>
          </FadeUp>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, i) => (
              <FadeUp key={service.title} delay={i * 0.1}>
                <div className="group relative overflow-hidden border border-border bg-card p-8 transition-all duration-500 hover:border-primary/30 hover:shadow-gold">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-700 group-hover:scale-150" />
                  <service.icon className="relative h-8 w-8 text-primary" strokeWidth={1} />
                  <h3 className="relative mt-6 font-display text-xl font-medium text-foreground">{service.title}</h3>
                  <p className="relative mt-3 font-body text-sm font-light leading-relaxed text-muted-foreground">{service.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Preview */}
      <section className="section-padding bg-card">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Portfolio</p>
            <h2 className="luxury-subheading mt-4 text-foreground">Recent Masterpieces</h2>
          </FadeUp>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              { img: portfolio1, title: 'Royal Signet Ring', cat: 'Jewelry Casting' },
              { img: portfolio2, title: 'Investment Gold Bars', cat: 'Gold Refining' },
              { img: portfolio3, title: 'Diamond Necklace', cat: 'Custom Design' },
            ].map((item, i) => (
              <ScaleIn key={item.title} delay={i * 0.15}>
                <Link to="/portfolio" className="group relative block aspect-square overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-background/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <span className="font-body text-xs font-light uppercase tracking-[0.3em] text-primary">{item.cat}</span>
                    <h3 className="mt-2 font-display text-2xl font-light text-foreground">{item.title}</h3>
                  </div>
                </Link>
              </ScaleIn>
            ))}
          </div>

          <FadeUp>
            <div className="mt-12 text-center">
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-3 font-body text-sm font-light uppercase tracking-[0.15em] text-primary transition-colors hover:text-gold-light"
              >
                View Full Portfolio
                <ArrowRight size={16} />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)' }} />
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeUp>
            <h2 className="luxury-heading text-foreground">
              Ready to Create Something{' '}
              <span className="text-gold-gradient">Extraordinary</span>?
            </h2>
            <p className="luxury-body mx-auto mt-6 max-w-lg text-muted-foreground">
              Whether you need gold refining services or custom jewelry casting,
              our artisans are ready to bring your vision to life.
            </p>
            <Link
              to="/contact"
              className="mt-10 inline-flex items-center gap-3 border border-primary bg-primary px-10 py-4 font-body text-sm font-medium uppercase tracking-[0.15em] text-primary-foreground transition-all duration-500 hover:shadow-gold"
            >
              Get in Touch
              <ArrowRight size={16} />
            </Link>
          </FadeUp>
        </div>
      </section>
    </main>
  );
}
