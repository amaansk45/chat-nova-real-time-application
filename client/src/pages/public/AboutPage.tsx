import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Target, Users, Sparkles, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-nova-dark text-nova-text">
      <nav className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between border-b border-nova-border/40">
        <Link to="/" className="flex items-center gap-2 text-sm text-nova-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-bold text-lg text-white">About ChatNova</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
          Our Vision for Next-Gen Messaging
        </h1>
        <p className="text-lg text-nova-muted leading-relaxed mb-12">
          ChatNova was founded to bridge the gap between high-speed consumer chat apps and powerful collaboration tools. We believe that privacy, performance, and intelligent assistance should be available out-of-the-box for everyone.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-nova-card border border-nova-border p-6 rounded-2xl">
            <Shield className="w-8 h-8 text-nova-primary mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Uncompromising Security</h3>
            <p className="text-sm text-nova-muted">
              Built with cryptographic protocols supporting end-to-end encryption key bundles, 2FA, OTP verification, and strict session isolation.
            </p>
          </div>
          <div className="bg-nova-card border border-nova-border p-6 rounded-2xl">
            <Sparkles className="w-8 h-8 text-nova-accent mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">AI-Enhanced Productivity</h3>
            <p className="text-sm text-nova-muted">
              Context-aware smart replies, automated translations across 10+ languages, and voice transcription make communication effortless.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
