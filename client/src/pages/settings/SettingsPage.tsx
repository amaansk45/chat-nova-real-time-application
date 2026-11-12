import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Smartphone,
  Eye,
  Palette,
  Volume2,
  Trash2,
  Key,
  LogOut,
  Check,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

type SettingsTab = 'privacy' | 'security' | 'devices' | 'blocked' | 'appearance';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('privacy');

  // Privacy states
  const [hideLastSeen, setHideLastSeen] = useState(false);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [readReceiptPrivacy, setReadReceiptPrivacy] = useState(true);
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

  // Security states
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is_2fa_enabled || false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Devices & Sessions
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    loadProfileSettings();
    loadDevices();
    loadBlockedUsers();
  }, []);

  const loadProfileSettings = async () => {
    try {
      const res = await api.get('/api/social/profile/');
      const data = res.data;
      setHideLastSeen(data.hide_last_seen || false);
      setHideOnlineStatus(data.hide_online_status || false);
      setReadReceiptPrivacy(data.read_receipt_privacy ?? true);
      setProfilePhotoPrivacy(data.profile_photo_privacy || 'everyone');
    } catch (err) {
      // Fallback
    }
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await api.get('/api/auth/sessions/');
      setDevices(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const res = await api.get('/api/security/blocked-users/');
      setBlockedUsers(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await api.patch('/api/social/profile/', {
        hide_last_seen: hideLastSeen,
        hide_online_status: hideOnlineStatus,
        read_receipt_privacy: readReceiptPrivacy,
        profile_photo_privacy: profilePhotoPrivacy,
      });
      showToast('Privacy preferences updated!', 'success');
      refreshUser();
    } catch (err) {
      showToast('Failed to save privacy settings.', 'error');
    }
  };

  const handleToggle2FA = async () => {
    try {
      const res = await api.post('/api/auth/2fa/toggle/');
      setIs2FAEnabled(res.data.is_2fa_enabled);
      showToast(
        res.data.is_2fa_enabled ? 'Two-Factor Authentication activated!' : 'Two-Factor Authentication disabled.',
        'info'
      );
      refreshUser();
    } catch (err) {
      showToast('Failed to toggle 2FA.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      showToast('Password changed successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to change password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.post(`/api/auth/sessions/${sessionId}/revoke/`);
      setDevices((prev) => prev.filter((d) => d.id !== sessionId));
      showToast('Device session revoked.', 'info');
    } catch (err) {
      showToast('Failed to revoke session.', 'error');
    }
  };

  const handleUnblock = async (blockedId: string) => {
    try {
      await api.delete(`/api/security/blocked-users/${blockedId}/`);
      setBlockedUsers((prev) => prev.filter((b) => b.id !== blockedId));
      showToast('User unblocked.', 'success');
    } catch (err) {
      showToast('Failed to unblock user.', 'error');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full custom-scrollbar">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Preferences</h1>
            <p className="text-xs text-nova-muted">Configure privacy controls, account security, devices, and appearance</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-nova-border pb-3 mb-6 overflow-x-auto no-scrollbar">
            {[
              { key: 'privacy', label: 'Privacy Controls', icon: <Eye className="w-4 h-4" /> },
              { key: 'security', label: 'Security & 2FA', icon: <Shield className="w-4 h-4" /> },
              { key: 'devices', label: 'Active Devices', icon: <Smartphone className="w-4 h-4" /> },
              { key: 'blocked', label: 'Blocked Accounts', icon: <UserX className="w-4 h-4" /> },
              { key: 'appearance', label: 'Appearance & Sounds', icon: <Palette className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                    : 'bg-nova-card text-nova-muted hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-4 bg-nova-card border border-nova-border rounded-2xl space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Hide Last Seen</h4>
                    <p className="text-xs text-nova-muted">Do not let others see when you were last online</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideLastSeen}
                    onChange={(e) => setHideLastSeen(e.target.checked)}
                    className="w-5 h-5 rounded text-nova-primary bg-nova-dark border-nova-border"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-nova-border/50">
                  <div>
                    <h4 className="text-sm font-bold text-white">Hide Online Status</h4>
                    <p className="text-xs text-nova-muted">Appear offline even while actively messaging</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideOnlineStatus}
                    onChange={(e) => setHideOnlineStatus(e.target.checked)}
                    className="w-5 h-5 rounded text-nova-primary bg-nova-dark border-nova-border"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-nova-border/50">
                  <div>
                    <h4 className="text-sm font-bold text-white">Read Receipts</h4>
                    <p className="text-xs text-nova-muted">Send double blue checkmarks when you read messages</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceiptPrivacy}
                    onChange={(e) => setReadReceiptPrivacy(e.target.checked)}
                    className="w-5 h-5 rounded text-nova-primary bg-nova-dark border-nova-border"
                  />
                </div>

                <div className="pt-3 border-t border-nova-border/50">
                  <h4 className="text-sm font-bold text-white mb-1">Profile Photo Privacy</h4>
                  <p className="text-xs text-nova-muted mb-2">Choose who can view your profile avatar</p>
                  <select
                    value={profilePhotoPrivacy}
                    onChange={(e) => setProfilePhotoPrivacy(e.target.value as any)}
                    className="w-full bg-nova-dark border border-nova-border rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleSavePrivacy}>
                    <Check className="w-4 h-4 mr-1.5" /> Save Privacy Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              {/* 2FA Card */}
              <div className="p-4 bg-nova-card border border-nova-border rounded-2xl shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nova-primary/20 text-nova-accent flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h4>
                      <p className="text-xs text-nova-muted">Require an OTP verification code during login</p>
                    </div>
                  </div>
                  <Button
                    variant={is2FAEnabled ? 'danger' : 'primary'}
                    size="sm"
                    onClick={handleToggle2FA}
                  >
                    {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>
              </div>

              {/* Change Password Form */}
              <div className="p-4 bg-nova-card border border-nova-border rounded-2xl shadow-md">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-nova-accent" /> Change Password
                </h4>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" size="sm" isLoading={isChangingPassword}>
                    Update Password
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-3 max-w-2xl">
              {loadingDevices ? (
                <div className="py-12 text-center text-xs text-nova-muted animate-pulse">
                  Loading device sessions...
                </div>
              ) : devices.length === 0 ? (
                <div className="p-4 bg-nova-card border border-nova-border rounded-2xl text-center text-xs text-nova-muted">
                  No other active device sessions found.
                </div>
              ) : (
                devices.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-nova-dark text-nova-accent flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {session.device_name || session.device_type || 'Browser Client'}
                        </h4>
                        <span className="text-[11px] text-nova-muted font-mono">
                          IP: {session.ip_address || '127.0.0.1'} • {new Date(session.created_at || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="px-3 py-1.5 rounded-xl bg-nova-error/10 hover:bg-nova-error/20 text-nova-error border border-nova-error/30 text-xs font-bold transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: BLOCKED ACCOUNTS */}
          {activeTab === 'blocked' && (
            <div className="space-y-3 max-w-2xl">
              {loadingBlocked ? (
                <div className="py-12 text-center text-xs text-nova-muted animate-pulse">
                  Loading blocked accounts...
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="p-8 bg-nova-card border border-nova-border rounded-2xl text-center text-xs text-nova-muted">
                  You haven't blocked any users.
                </div>
              ) : (
                blockedUsers.map((blocked) => (
                  <div
                    key={blocked.id}
                    className="p-4 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={blocked.blocked_user?.avatar_url} alt="User" size="md" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{blocked.blocked_user?.username}</h4>
                        <span className="text-[11px] text-nova-muted">
                          Blocked on {new Date(blocked.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => handleUnblock(blocked.id)}>
                      Unblock
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-4 bg-nova-card border border-nova-border rounded-2xl space-y-4 shadow-md">
                <h4 className="text-sm font-bold text-white">Visual Color Theme</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      theme === 'dark' ? 'border-nova-primary bg-nova-primary/10' : 'border-nova-border bg-nova-dark'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full bg-blue-600" />
                      <h5 className="text-xs font-bold text-white">Dark Navy (Default)</h5>
                    </div>
                    <p className="text-[11px] text-nova-muted">Electric blue accents with deep navy contrast</p>
                  </div>

                  <div
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      theme === 'light' ? 'border-nova-primary bg-nova-primary/10' : 'border-nova-border bg-nova-dark'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full bg-cyan-400" />
                      <h5 className="text-xs font-bold text-white">Light Titanium</h5>
                    </div>
                    <p className="text-[11px] text-nova-muted">High-contrast daytime readability theme</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
