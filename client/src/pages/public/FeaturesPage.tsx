import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare, Video, Mic, Sparkles, Shield,
  Clock, Image, FileText, Check, ArrowLeft
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const featureList = [
    { title: "One-to-One Private Chat", desc: "Fast instant delivery with real-time typing indicators and double-tick receipts.", icon: MessageSquare },
    { title: "Group Conversations", desc: "Support for custom roles, announcement mode, invite links, and interactive polls.", icon: FileText },
    { title: "WebRTC Audio & Video Calls", desc: "Crisp calling with camera controls, mute options, screen sharing, and call logs.", icon: Video },
    { title: "Voice Notes & Audio Waveforms", desc: "MediaRecorder integration with real-time waveform visualization and speed controls.", icon: Mic },
    { title: "24-Hour Stories & Status", desc: "Share photos, videos, or stylized text canvas stories that auto-expire in 24 hours.", icon: Clock },
    { title: "Nova AI Assistant", desc: "Smart replies, automated translation, voice transcription, and conversation summarization.", icon: Sparkles },
    { title: "Privacy Controls", desc: "Hide last seen, hide online presence, toggle read receipts, and block accounts.", icon: Shield },
    { title: "Media Gallery & Documents", desc: "Filter photos, videos, documents, audio clips, and shared links per conversation.", icon: Image },
  ];

  return (
    <div className="min-h-screen bg-nova-dark text-nova-text">
      <nav className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between border-b border-nova-border/40">
        <Link to="/" className="flex items-center gap-2 text-sm text-nova-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="font-bold text-lg text-white">Feature Specifications</span>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Complete Feature Ecosystem</h1>
          <p className="text-nova-muted text-base">Explore all the enterprise and social features built into ChatNova.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureList.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-nova-card border border-nova-border p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-nova-primary/20 text-nova-primary flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-nova-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default FeaturesPage;
