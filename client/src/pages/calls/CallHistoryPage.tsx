import React, { useState, useEffect } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Calendar,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { Call } from '../../types';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

export const CallHistoryPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filter, setFilter] = useState<'all' | 'missed' | 'audio' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/calls/history/');
      setCalls(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = calls.filter((call) => {
    if (filter === 'missed' && call.status !== 'missed') return false;
    if (filter === 'audio' && call.call_type !== 'audio') return false;
    if (filter === 'video' && call.call_type !== 'video') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const callerMatch = call.caller.username.toLowerCase().includes(q);
      const receiverMatch = call.receiver?.username.toLowerCase().includes(q);
      return callerMatch || receiverMatch;
    }
    return true;
  });

  const formatDuration = (secs?: number | null) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full custom-scrollbar">
          {/* Page Title & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link to="/chat" className="text-nova-muted hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-white tracking-tight">Call History</h1>
              </div>
              <p className="text-xs text-nova-muted">Recent incoming, outgoing, and missed calls</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-nova-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-nova-card border border-nova-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 border-b border-nova-border pb-3 mb-6">
            {[
              { key: 'all', label: 'All Calls' },
              { key: 'missed', label: 'Missed' },
              { key: 'audio', label: 'Voice Calls' },
              { key: 'video', label: 'Video Calls' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filter === tab.key
                    ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                    : 'bg-nova-card text-nova-muted hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Call Log List */}
          {loading ? (
            <div className="py-20 text-center text-xs text-nova-muted animate-pulse">
              Loading call logs...
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 rounded-3xl bg-nova-card border border-nova-border flex items-center justify-center text-nova-muted mx-auto mb-3">
                <Phone className="w-8 h-8 opacity-40" />
              </div>
              <h3 className="text-base font-bold text-white">No calls found</h3>
              <p className="text-xs text-nova-muted mt-1">Make a voice or video call to see it here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCalls.map((call) => {
                const partner = call.caller;
                const isMissed = call.status === 'missed';

                return (
                  <div
                    key={call.id}
                    className="p-4 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-4 group hover:border-nova-primary/50 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Avatar src={partner.avatar_url} alt={partner.username} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-white truncate">{partner.username}</h4>
                          {isMissed ? (
                            <Badge variant="error" size="sm">
                              Missed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm">
                              {call.status}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-nova-muted">
                          {isMissed ? (
                            <PhoneMissed className="w-3.5 h-3.5 text-nova-error" />
                          ) : (
                            <PhoneIncoming className="w-3.5 h-3.5 text-nova-success" />
                          )}
                          <span>
                            {new Date(call.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span>{formatDuration(call.duration)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => showToast(`Initiating call with ${partner.username}...`, 'info')}
                        className="p-2.5 rounded-xl bg-nova-dark border border-nova-border text-nova-muted hover:text-nova-accent hover:border-nova-accent transition-colors"
                        title={call.call_type === 'video' ? 'Redial Video' : 'Redial Voice'}
                      >
                        {call.call_type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallHistoryPage;
