import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Camera,
  Check,
  Copy,
  ShieldCheck,
  Save,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

export const UserProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [copiedId, setCopiedId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setBio(user.bio || '');
      setStatusMessage(user.status_message || '');
      setPhoneNumber(user.phone_number || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch('/api/social/profile/', {
        first_name: firstName,
        last_name: lastName,
        bio,
        status_message: statusMessage,
        phone_number: phoneNumber,
      });

      showToast('Profile updated successfully!', 'success');
      await refreshUser();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const res = await api.patch('/api/social/profile/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setAvatarUrl(res.data.avatar || res.data.avatar_url);
        showToast('Profile picture updated!', 'success');
        refreshUser();
      } catch (err) {
        showToast('Failed to upload picture.', 'error');
      }
    }
  };

  const copyUserId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    showToast('User ID copied!', 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full custom-scrollbar">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Link to="/chat" className="text-nova-muted hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Your Profile</h1>
              <p className="text-xs text-nova-muted">Manage your public persona, bio, and contact credentials</p>
            </div>
          </div>

          {/* Profile Card Container */}
          <div className="bg-nova-card border border-nova-border rounded-3xl overflow-hidden shadow-2xl mb-6">
            {/* Cover Banner */}
            <div className="h-36 sm:h-44 bg-gradient-to-r from-blue-900 via-indigo-950 to-cyan-900 relative">
              <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Avatar & Identifiers Row */}
            <div className="px-6 pb-6 relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-6">
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-nova-dark shadow-2xl overflow-hidden">
                    <Avatar src={avatarUrl} alt={user?.username || 'User'} size="xl" className="w-full h-full" />
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-2 rounded-xl bg-nova-primary text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    title="Change Avatar"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0 sm:pl-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl font-bold text-white truncate">
                      {firstName ? `${firstName} ${lastName}` : user?.username}
                    </h2>
                    {user?.is_verified && (
                      <span title="Verified Account">
                        <ShieldCheck className="w-5 h-5 text-nova-accent" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-nova-muted">@{user?.username}</span>
                </div>

                {/* Unique ID Badge */}
                <div
                  onClick={copyUserId}
                  className="px-3 py-1.5 rounded-xl bg-nova-dark border border-nova-border flex items-center gap-2 cursor-pointer hover:border-nova-accent transition-colors"
                  title="Click to copy ID"
                >
                  <span className="text-[11px] font-mono text-nova-muted">
                    ID: {user?.id?.slice(0, 8)}...
                  </span>
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-nova-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-nova-muted" />
                  )}
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    type="text"
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    label="Last Name"
                    type="text"
                    placeholder="Walker"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    icon={<Mail className="w-4 h-4 text-nova-muted" />}
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+1 555 123 4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    icon={<Phone className="w-4 h-4 text-nova-muted" />}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1.5">
                    Status Message
                  </label>
                  <Input
                    type="text"
                    placeholder="Available • At work • Ready to connect"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1.5">
                    Bio & About
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Write a brief description about yourself, interests, and background..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-nova-dark border border-nova-border rounded-xl p-3 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary resize-none custom-scrollbar"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-1.5" /> Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
