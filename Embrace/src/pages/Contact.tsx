import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, Send } from 'lucide-react';
import { z } from 'zod';
import { FadeUp } from '@/components/AnimationWrappers';

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .regex(/^[a-zA-Z\u00C0-\u00FF\s'-]+$/, 'Name contains invalid characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be under 255 characters'),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be under 200 characters'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be under 2000 characters'),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_SUBMISSIONS = 3;

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'rate-limited'>('idle');

  const submissionTimestamps = useRef<number[]>([]);

  const isRateLimited = useCallback(() => {
    const now = Date.now();
    submissionTimestamps.current = submissionTimestamps.current.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    return submissionTimestamps.current.length >= MAX_SUBMISSIONS;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isRateLimited()) {
      setSubmitStatus('rate-limited');
      return;
    }

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof typeof formData;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    submissionTimestamps.current.push(Date.now());

    try {
      setSubmitStatus('submitting');
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setSubmitStatus('error');
    }
  };

  return (
    <main className="pt-20">
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)' }} />
        <div className="relative mx-auto max-w-7xl">
          <FadeUp>
            <p className="font-body text-sm font-light uppercase tracking-[0.4em] text-primary">Contact</p>
            <h1 className="luxury-heading mt-4 text-foreground">
              Let's Create <span className="text-gold-gradient">Together</span>
            </h1>
          </FadeUp>
        </div>
      </section>

      <section className="section-padding bg-card">
        <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-2">
          <FadeUp>
            <div>
              <h2 className="luxury-subheading text-foreground">Get in Touch</h2>
              <p className="luxury-body mt-4 text-muted-foreground">
                Whether you have a project in mind or simply want to learn more about our capabilities,
                we'd love to hear from you.
              </p>

              <div className="mt-12 space-y-8">
                {[
                  { icon: MapPin, label: 'Visit Us', value: 'Address: Addis Ababa, Ethiopia and UAE, Dubai Kampala, Uganda' },
                  { icon: Mail, label: 'Email', value: 'info@embracerefiningandcasting.com' },
                  { icon: Phone, label: 'Call', value: '+256769947948, +251943814444, +251943794444' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-border bg-background">
                      <item.icon className="h-5 w-5 text-primary" strokeWidth={1} />
                    </div>
                    <div>
                      <p className="font-body text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 font-body text-sm text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitStatus === 'rate-limited' && (
                <p className="text-sm text-destructive" role="alert">
                  Too many submissions. Please wait a minute before trying again.
                </p>
              )}
              {submitStatus === 'success' && (
                <p className="text-sm text-primary" role="status">
                  Thank you for your inquiry. We will respond within 24 hours.
                </p>
              )}
              {submitStatus === 'error' && (
                <p className="text-sm text-destructive" role="alert">
                  Submission failed. Please try again shortly.
                </p>
              )}
              {[
                { name: 'name' as const, label: 'Full Name', type: 'text', maxLength: 100 },
                { name: 'email' as const, label: 'Email Address', type: 'email', maxLength: 255 },
                { name: 'subject' as const, label: 'Subject', type: 'text', maxLength: 200 },
              ].map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block font-body text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    required
                    maxLength={field.maxLength}
                    value={formData[field.name]}
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      if (errors[field.name]) setErrors((prev) => ({ ...prev, [field.name]: undefined }));
                      if (submitStatus === 'success' || submitStatus === 'error') setSubmitStatus('idle');
                    }}
                    className="w-full border border-border bg-background px-4 py-3 font-body text-sm font-light text-foreground outline-none transition-colors focus:border-primary"
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                  />
                  {errors[field.name] && (
                    <p id={`${field.name}-error`} className="mt-1 text-xs text-destructive" role="alert">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label className="mb-2 block font-body text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  maxLength={2000}
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
                    if (submitStatus === 'success' || submitStatus === 'error') setSubmitStatus('idle');
                  }}
                  className="w-full resize-none border border-border bg-background px-4 py-3 font-body text-sm font-light text-foreground outline-none transition-colors focus:border-primary"
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                />
                {errors.message && (
                  <p id="message-error" className="mt-1 text-xs text-destructive" role="alert">
                    {errors.message}
                  </p>
                )}
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitStatus === 'submitting'}
                className="inline-flex w-full items-center justify-center gap-3 border border-primary bg-primary px-8 py-4 font-body text-sm font-medium uppercase tracking-[0.15em] text-primary-foreground transition-all duration-500 hover:shadow-gold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitStatus === 'submitting' ? 'Sending...' : 'Send Inquiry'}
                <Send size={16} />
              </motion.button>
            </form>
          </FadeUp>
        </div>
      </section>
    </main>
  );
}
