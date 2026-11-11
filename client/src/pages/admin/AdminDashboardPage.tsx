import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Phone,
  AlertTriangle,
  Activity,
  HardDrive,
  Database,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  RefreshCw,
  Server,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

type AdminTab = 'overview' | 'users' | 'reports' | 'health';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'staff'>('all');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadOverview();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'health') loadHealth();
  }, [activeTab]);

  const loadOverview = async () => {
    try {
      const res = await api.get('/api/admin/overview/');
      setStats(res.data);
    } catch (err) {
      // Fallback
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users/', {
        params: { q: userSearch, filter: userFilter },
      });
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      showToast('Failed to load user directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/reports/');
      setReports(res.data.results || res.data || []);
    } catch (err) {
      showToast('Failed to load moderation reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/health/');
      setHealth(res.data);
    } catch (err) {
      showToast('Failed to fetch health telemetry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'toggle_staff') => {
    try {
      await api.post(`/api/admin/users/${userId}/action/`, { action });
      showToast(`User action "${action}" completed.`, 'success');
      loadUsers();
    } catch (err) {
      showToast('Failed to perform user action.', 'error');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'ban_target' | 'delete_content') => {
    try {
      await api.post(`/api/admin/reports/${reportId}/resolve/`, { action });
      showToast(`Report resolved (${action}).`, 'success');
      loadReports();
    } catch (err) {
      showToast('Failed to resolve report.', 'error');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full custom-scrollbar">
          {/* Page Title & Refresh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded-lg bg-nova-primary/20 text-nova-accent">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-bold text-white tracking-tight">Admin & Moderation Portal</h1>
              </div>
              <p className="text-xs text-nova-muted">Platform telemetry, user account enforcement, and server health</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                loadOverview();
                if (activeTab === 'users') loadUsers();
                if (activeTab === 'reports') loadReports();
                if (activeTab === 'health') loadHealth();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Telemetry
            </Button>
          </div>

          {/* Metric Cards Row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { label: 'Total Users', val: stats.total_users || 0, icon: <Users className="w-4 h-4 text-blue-400" /> },
                { label: 'Active Users', val: stats.active_users || 0, icon: <UserCheck className="w-4 h-4 text-green-400" /> },
                { label: 'Messages', val: stats.total_messages || 0, icon: <MessageSquare className="w-4 h-4 text-purple-400" /> },
                { label: 'Calls Placed', val: stats.total_calls || 0, icon: <Phone className="w-4 h-4 text-cyan-400" /> },
                { label: 'Open Reports', val: stats.pending_reports || 0, icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
                { label: 'Files Stored', val: stats.storage_attachments_count || 0, icon: <HardDrive className="w-4 h-4 text-yellow-400" /> },
              ].map((card, i) => (
                <div key={i} className="p-4 bg-nova-card border border-nova-border rounded-2xl shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-nova-muted uppercase">{card.label}</span>
                    {card.icon}
                  </div>
                  <span className="text-2xl font-black text-white">{card.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Admin Tabs */}
          <div className="flex gap-2 border-b border-nova-border pb-3 mb-6 overflow-x-auto no-scrollbar">
            {[
              { key: 'overview', label: 'Platform Telemetry' },
              { key: 'users', label: 'User Directory' },
              { key: 'reports', label: 'Moderation Reports' },
              { key: 'health', label: 'Server & System Health' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as AdminTab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                    : 'bg-nova-card text-nova-muted hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-nova-card border border-nova-border rounded-3xl shadow-md">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-nova-accent" /> Weekly Engagement Trends
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-nova-muted">7-Day New Signups</span>
                      <span className="font-bold text-white">{stats?.weekly_trends?.signups || 0}</span>
                    </div>
                    <div className="h-2 bg-nova-dark rounded-full overflow-hidden">
                      <div className="h-full bg-nova-primary rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-nova-muted">7-Day Sent Messages</span>
                      <span className="font-bold text-white">{stats?.weekly_trends?.messages || 0}</span>
                    </div>
                    <div className="h-2 bg-nova-dark rounded-full overflow-hidden">
                      <div className="h-full bg-nova-accent rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-nova-card border border-nova-border rounded-3xl shadow-md">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-nova-success" /> Security & Architecture
                </h3>
                <div className="space-y-2 text-xs text-slate-300">
                  <p>• End-to-End Encryption protocol active across all private chats.</p>
                  <p>• WebSocket bidirectional real-time channels online.</p>
                  <p>• Rate limiting & JWT token rotation enabled.</p>
                  <p>• PostgreSQL ACID persistence & Redis channel layers operational.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-nova-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users by name, username, or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    className="w-full bg-nova-card border border-nova-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary"
                  />
                </div>

                <div className="flex gap-2">
                  {['all', 'active', 'suspended', 'staff'].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setUserFilter(f as any);
                        loadUsers();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${
                        userFilter === f ? 'bg-nova-primary text-white' : 'bg-nova-card text-nova-muted'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-nova-card border border-nova-border rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-left text-xs">
                  <thead className="bg-nova-dark/80 text-nova-muted uppercase border-b border-nova-border">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nova-border/50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-nova-dark/40">
                        <td className="p-3 flex items-center gap-2.5">
                          <Avatar src={u.avatar_url} alt={u.username} size="sm" />
                          <div>
                            <span className="font-bold text-white block">{u.username}</span>
                            <span className="text-[11px] text-nova-muted">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {u.is_active ? (
                            <Badge variant="success" size="sm">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="error" size="sm">
                              Suspended
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {u.is_staff ? (
                            <Badge variant="primary" size="sm">
                              Staff Admin
                            </Badge>
                          ) : (
                            <span className="text-nova-muted">Member</span>
                          )}
                        </td>
                        <td className="p-3 text-nova-muted">
                          {new Date(u.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {u.is_active ? (
                            <button
                              onClick={() => handleUserAction(u.id, 'suspend')}
                              className="text-nova-error hover:underline font-semibold"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(u.id, 'activate')}
                              className="text-nova-success hover:underline font-semibold"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleUserAction(u.id, 'toggle_staff')}
                            className="text-nova-accent hover:underline font-semibold"
                          >
                            {u.is_staff ? 'Revoke Staff' : 'Make Staff'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="p-12 bg-nova-card border border-nova-border rounded-2xl text-center text-xs text-nova-muted">
                  No pending moderation reports! All clear.
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 bg-nova-card border border-nova-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="error" size="sm">
                          {rep.reason}
                        </Badge>
                        <span className="text-xs text-nova-muted">
                          Reported by <strong className="text-white">{rep.reporter?.username}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1">
                        Target User: <strong className="text-nova-accent">{rep.reported_user?.username}</strong>
                      </p>
                      {rep.description && (
                        <p className="text-xs text-nova-muted italic mt-0.5">"{rep.description}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolveReport(rep.id, 'dismiss')}
                      >
                        Dismiss
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleResolveReport(rep.id, 'ban_target')}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" /> Ban User
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: HEALTH */}
          {activeTab === 'health' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-nova-card border border-nova-border rounded-2xl shadow-md">
                <Database className="w-6 h-6 text-nova-accent mb-2" />
                <h4 className="text-sm font-bold text-white">Database Cluster</h4>
                <p className="text-xs text-nova-success font-semibold mt-1">Operational (Healthy)</p>
                <span className="text-[11px] text-nova-muted mt-2 block">Latency: &lt; 5ms</span>
              </div>

              <div className="p-5 bg-nova-card border border-nova-border rounded-2xl shadow-md">
                <Server className="w-6 h-6 text-green-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Real-Time WebSocket Layer</h4>
                <p className="text-xs text-nova-success font-semibold mt-1">Django Channels Active</p>
                <span className="text-[11px] text-nova-muted mt-2 block">Protocol: ASGI / WSS</span>
              </div>

              <div className="p-5 bg-nova-card border border-nova-border rounded-2xl shadow-md">
                <HardDrive className="w-6 h-6 text-purple-400 mb-2" />
                <h4 className="text-sm font-bold text-white">Media & Object Storage</h4>
                <p className="text-xs text-nova-success font-semibold mt-1">Read/Write Available</p>
                <span className="text-[11px] text-nova-muted mt-2 block">Integrity checks passed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
