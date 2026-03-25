import React, { useState } from 'react';
import { adminLogin } from '@/lib/pocketbase';
import { toast } from 'sonner';
import { FadeUp } from './AnimationWrappers';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await adminLogin(email, password);
      toast.success('Access granted. Welcome to the Command Center.');
      onLogin(); // Refresh parent state
    } catch (err: any) {
      toast.error('Invalid credentials. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0f0b07]">
      {/* Background gradients similar to Index */}
      <div className="absolute inset-0" style={{ background: 'var(--gradient-dark)' }} />
      <div className="absolute inset-0" style={{ background: 'var(--gradient-radial-gold)' }} />
      
      <FadeUp>
        <div className="relative z-10 w-full max-w-md border border-primary/20 bg-background/40 backdrop-blur-xl p-8 md:p-12 shadow-2xl overflow-hidden group">
          {/* Decorative corner */}
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-primary/5 transition-transform duration-700 group-hover:scale-150" />
          
          <div className="text-center mb-10">
            <p className="font-body text-[10px] font-light uppercase tracking-[0.5em] text-primary mb-3">Secure Access</p>
            <h1 className="luxury-subheading text-foreground">Admin <span className="text-gold-gradient">Login</span></h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-semibold text-[#888780] mb-2 uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f0b07] border border-border border-opacity-40 px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30"
                placeholder="admin@site.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#888780] mb-2 uppercase tracking-widest">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f0b07] border border-border border-opacity-40 px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-primary text-primary-foreground py-4 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-500 hover:shadow-gold disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Authorize Access'}
            </button>
          </form>
          
          <p className="mt-10 text-center text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
            Unauthorized access attempts are monitored and logged.
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
