import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-nova-dark text-nova-text">
      <nav className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between border-b border-nova-border/40">
        <Link to="/" className="flex items-center gap-2 text-sm text-nova-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-bold text-lg text-white">Terms of Service</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8 text-sm text-nova-muted leading-relaxed">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Terms of Service</h1>
          <p className="text-xs text-slate-400">Effective Date: November 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
          <p>By creating an account or using ChatNova, you agree to comply with and be bound by these terms.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. Acceptable Use Policy</h2>
          <p>Users must not engage in harassment, spamming, impersonation, or transmitting harmful or malicious content. Violations may result in immediate suspension or termination of accounts.</p>
        </section>
      </main>
    </div>
  );
};

export default TermsPage;
