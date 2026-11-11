import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MessageSquare,
  Phone,
  Video,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { User } from '../../types';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'suggestions'>('contacts');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Add Contact Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    loadContacts();
    loadSuggestions();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/social/contacts/');
      const list = res.data.results || res.data || [];
      setContacts(list.map((item: any) => item.contact_user || item));
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await api.get('/api/social/suggestions/');
      setSuggestions(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addIdentifier.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/social/contacts/', {
        identifier: addIdentifier.trim(),
      });
      showToast('Contact added successfully!', 'success');
      setIsAddModalOpen(false);
      setAddIdentifier('');
      loadContacts();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Contact not found or already added.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartChat = async (user: User) => {
    try {
      await api.post('/api/chat/conversations/direct/', {
        username_or_email: user.username,
      });
      navigate('/chat');
    } catch (err) {
      showToast('Failed to start conversation.', 'error');
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full custom-scrollbar">
          {/* Page Title & Add Contact Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Contacts Directory</h1>
              <p className="text-xs text-nova-muted">Connect, manage relationships, and discover new contacts</p>
            </div>

            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Add New Contact
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="w-4 h-4 text-nova-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts by name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-nova-card border border-nova-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-nova-border pb-3 mb-6">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'contacts'
                  ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                  : 'bg-nova-card text-nova-muted hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> My Contacts ({contacts.length})
            </button>

            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'suggestions'
                  ? 'bg-nova-primary text-white shadow-md shadow-blue-500/20'
                  : 'bg-nova-card text-nova-muted hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Friend Suggestions ({suggestions.length})
            </button>
          </div>

          {/* Tab 1: My Contacts */}
          {activeTab === 'contacts' && (
            <div>
              {loading ? (
                <div className="py-20 text-center text-xs text-nova-muted animate-pulse">
                  Loading contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-nova-card border border-nova-border flex items-center justify-center text-nova-muted mx-auto mb-3">
                    <Users className="w-8 h-8 opacity-40" />
                  </div>
                  <h3 className="text-base font-bold text-white">No contacts yet</h3>
                  <p className="text-xs text-nova-muted mt-1">Add colleagues and friends to start messaging.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-4 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-3 shadow-md hover:border-nova-primary/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={contact.avatar_url}
                          alt={contact.username}
                          size="md"
                          status={contact.is_online ? 'online' : 'offline'}
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {contact.first_name ? `${contact.first_name} ${contact.last_name || ''}` : contact.username}
                          </h4>
                          <span className="text-xs text-nova-muted block truncate">@{contact.username}</span>
                          <span className="text-[11px] text-nova-accent truncate block mt-0.5">
                            {contact.status_message || 'Available'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleStartChat(contact)}
                          className="p-2.5 rounded-xl bg-nova-dark border border-nova-border text-nova-muted hover:text-white hover:border-nova-primary transition-colors"
                          title="Message"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Suggestions */}
          {activeTab === 'suggestions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((user) => (
                <div
                  key={user.id}
                  className="p-4 bg-nova-card border border-nova-border rounded-2xl flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={user.avatar_url} alt={user.username} size="md" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{user.username}</h4>
                      <p className="text-xs text-nova-muted truncate">{user.bio || 'ChatNova user'}</p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await api.post('/api/social/contacts/', { identifier: user.username });
                        showToast(`Added ${user.username} to contacts!`, 'success');
                        loadContacts();
                        setSuggestions((prev) => prev.filter((s) => s.id !== user.id));
                      } catch (err) {
                        showToast('Failed to add contact.', 'error');
                      }
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Contact"
        size="sm"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <Input
            label="Username, Email, or Phone"
            type="text"
            placeholder="alexwalker or alex@example.com"
            value={addIdentifier}
            onChange={(e) => setAddIdentifier(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContactsPage;
