import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  FileText,
  Music,
  Link2,
  Search,
  Download,
  ExternalLink,
  Play,
  ArrowLeft,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Attachment } from '../../types';
import api from '../../utils/api';
import VoicePlayer from '../../components/media/VoicePlayer';

type GalleryTab = 'media' | 'docs' | 'audio' | 'links';

export const MediaGalleryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<GalleryTab>('media');
  const [search, setSearch] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [activeTab]);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/media/gallery/', {
        params: { tab: activeTab },
      });
      setAttachments(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const filtered = attachments.filter((att) =>
    att.file_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full custom-scrollbar">
          {/* Page Title & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to="/chat" className="text-nova-muted hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-white tracking-tight">Shared Media Gallery</h1>
              </div>
              <p className="text-xs text-nova-muted">Browse all photos, videos, files, and voice recordings</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-nova-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search file name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-nova-card border border-nova-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-nova-border pb-3 mb-6">
            {[
              { key: 'media', label: 'Photos & Videos', icon: <ImageIcon className="w-4 h-4" /> },
              { key: 'docs', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
              { key: 'audio', label: 'Voice & Audio', icon: <Music className="w-4 h-4" /> },
              { key: 'links', label: 'Shared Links', icon: <Link2 className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as GalleryTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                    : 'bg-nova-card text-nova-muted hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="py-20 text-center text-xs text-nova-muted animate-pulse">
              Loading files...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 rounded-3xl bg-nova-card border border-nova-border flex items-center justify-center text-nova-muted mx-auto mb-3">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-base font-bold text-white">No files found</h3>
              <p className="text-xs text-nova-muted mt-1">Shared media from your conversations will appear here.</p>
            </div>
          ) : (
            <>
              {activeTab === 'media' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filtered.map((att) => (
                    <div
                      key={att.id}
                      onClick={() =>
                        setLightboxUrl({
                          url: att.file_url,
                          type: att.media_type === 'video' ? 'video' : 'image',
                        })
                      }
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-nova-card border border-nova-border cursor-pointer shadow-md"
                    >
                      <img
                        src={att.thumbnail_url || att.file_url}
                        alt={att.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                        <span className="text-[11px] text-white truncate font-medium">{att.file_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-3 group hover:border-nova-primary/50 transition-all shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-nova-primary/20 text-nova-accent flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{att.file_name}</h4>
                        <span className="text-[10px] text-nova-muted font-mono">
                          {(att.file_size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <a
                        href={att.file_url}
                        download={att.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-nova-dark text-nova-muted hover:text-white transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 bg-nova-card border border-nova-border rounded-2xl flex flex-col gap-2 shadow-md"
                    >
                      <span className="text-xs font-bold text-white truncate">{att.file_name}</span>
                      <VoicePlayer
                        audioUrl={att.file_url}
                        duration={att.duration || undefined}
                        waveformData={att.waveform_data || undefined}
                      />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'links' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{att.file_name}</h4>
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-nova-accent hover:underline truncate block mt-0.5"
                        >
                          {att.file_url}
                        </a>
                      </div>
                      <a
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-nova-dark text-nova-muted hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {lightboxUrl.type === 'image' ? (
              <img
                src={lightboxUrl.url}
                alt="Full preview"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={lightboxUrl.url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl"
              />
            )}
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-nova-accent p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGalleryPage;
