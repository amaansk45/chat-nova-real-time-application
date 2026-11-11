import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, ShieldCheck, Video, Sparkles,
  Zap, Lock, Users, ArrowRight, CheckCircle2
} from 'lucide-react';
import Button from '../../components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-nova-dark text-nova-text selection:bg-nova-primary selection:text-white">
      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nova-primary to-nova-accent p-0.5 shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-nova-dark rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black bg-gradient-to-tr from-nova-primary to-nova-accent bg-clip-text text-transparent">
                N
              </span>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ChatNova
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-nova-muted">
          <Link to="/features" className="hover:text-nova-text transition-colors">Features</Link>
          <Link to="/about" className="hover:text-nova-text transition-colors">About</Link>
          <Link to="/privacy" className="hover:text-nova-text transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-nova-text transition-colors">Terms</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 text-center flex flex-col items-center">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-nova-primary/20 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-nova-accent/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nova-card border border-nova-border text-nova-accent text-xs font-semibold uppercase tracking-wider mb-8 shadow-xl">
          <Sparkles className="w-3.5 h-3.5" /> Next Generation Real-Time Messaging
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-[1.1] mb-6">
          Connect. Communicate. <br />
          <span className="bg-gradient-to-r from-nova-primary to-nova-accent bg-clip-text text-transparent">
            Share Without Boundaries.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-nova-muted max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          ChatNova brings instant messaging, crystal-clear WebRTC audio & video calls, disappearing stories, end-to-end encryption, and built-in AI tools into one unified platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/register">
            <Button size="lg" variant="primary" className="shadow-2xl shadow-blue-600/40">
              Start Chatting Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/features">
            <Button size="lg" variant="secondary">
              Explore All Features
            </Button>
          </Link>
        </div>

        {/* Hero Preview Card */}
        <div className="mt-16 w-full max-w-5xl rounded-3xl p-1 bg-gradient-to-b from-nova-border to-transparent shadow-2xl">
          <div className="rounded-[22px] bg-nova-card border border-nova-border/60 overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 text-left">
              <span className="text-xs font-semibold text-nova-accent tracking-wider uppercase">Live Experience</span>
              <h3 className="text-2xl font-bold text-white mt-1 mb-2">Engineered for Velocity & Privacy</h3>
              <p className="text-sm text-nova-muted mb-4">
                WebSocket powered message delivery with delivery receipts, typing indicators, rich media attachments, and WebRTC calling.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-nova-success" /> Instant WebSocket Delivery</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-nova-success" /> WebRTC HD Calls</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-nova-success" /> End-to-End Encryption</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-nova-success" /> Built-in Nova AI Copilot</div>
              </div>
            </div>
            <div className="w-full md:w-80 bg-nova-dark/90 rounded-2xl p-4 border border-nova-border/70 flex flex-col gap-3">
              <div className="flex items-center gap-3 border-b border-nova-border/60 pb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-xs text-white">N</div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Nova AI Copilot</h4>
                  <span className="text-[10px] text-nova-success">Active Online</span>
                </div>
              </div>
              <div className="bg-nova-card/80 p-2.5 rounded-xl text-xs text-slate-200">
                👋 Hello! How can I assist with your messages or calls today?
              </div>
              <div className="bg-nova-primary/20 border border-nova-primary/30 p-2.5 rounded-xl text-xs text-blue-200 self-end">
                Summarize our latest team discussion please!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-nova-border/50">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-white">Built for Every Communication Need</h2>
          <p className="text-sm text-nova-muted mt-2">Inspired by the speed of Telegram, intimacy of WhatsApp, and community tools of Discord.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-nova-card border border-nova-border p-8 rounded-3xl hover:border-nova-primary/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-nova-primary flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real-Time Messaging</h3>
            <p className="text-sm text-nova-muted leading-relaxed">
              One-on-one chats, group conversations, read receipts, emoji reactions, reply threading, pins, stars, and offline sync.
            </p>
          </div>

          <div className="bg-nova-card border border-nova-border p-8 rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-nova-accent flex items-center justify-center mb-6">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">HD Audio & Video Calls</h3>
            <p className="text-sm text-nova-muted leading-relaxed">
              Ultra low-latency WebRTC audio and video calling with camera toggle, mute, screen sharing, and call history logs.
            </p>
          </div>

          <div className="bg-nova-card border border-nova-border p-8 rounded-3xl hover:border-indigo-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Communication Tools</h3>
            <p className="text-sm text-nova-muted leading-relaxed">
              Smart reply recommendations, instant conversation summaries, multi-language translation, and voice note transcription.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-nova-border py-12 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-nova-muted gap-4">
        <p>© 2026 ChatNova. Connect. Communicate. Share. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/about" className="hover:text-white transition-colors">About</Link>
          <Link to="/features" className="hover:text-white transition-colors">Features</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
