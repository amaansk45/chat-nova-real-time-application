import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-nova-dark text-nova-text">
      <nav className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between border-b border-nova-border/40">
        <Link to="/" className="flex items-center gap-2 text-sm text-nova-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-bold text-lg text-white">Privacy Policy</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8 text-sm text-nova-muted leading-relaxed">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">ChatNova Privacy Policy</h1>
          <p className="text-xs text-slate-400">Effective Date: November 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Principles of User Privacy</h2>
          <p>ChatNova is built with privacy-first architecture. We do not sell your personal data or conversation metadata to third parties.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. End-to-End Encryption</h2>
          <p>For conversations protected with end-to-end encryption keys, messages and media are cryptographically encrypted on your device. Only you and the intended recipient possess the decryption keys.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">3. Data Retention and Disappearing Messages</h2>
          <p>Messages configured with disappearing timers (24 hours, 7 days, 90 days) are automatically purged from servers and client storage upon expiration.</p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
