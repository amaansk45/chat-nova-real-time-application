import React, { useState, useEffect } from 'react';
import { Users, Shield, Lock, Globe, Plus, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';
import { User } from '../../types';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: any) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(false);
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchContact, setSearchContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      const res = await api.get('/api/social/contacts/');
      const list = res.data.results || res.data || [];
      setContacts(list.map((c: any) => c.contact_user || c));
    } catch (err) {
      // Fallback
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a group name.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/groups/', {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        only_admins_can_send: onlyAdminsCanSend,
        member_ids: selectedUserIds,
      });

      showToast(`Group "${name}" created successfully!`, 'success');
      onGroupCreated(res.data);
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to create group.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.username.toLowerCase().includes(searchContact.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group Conversation" size="md">
      <form onSubmit={handleCreateGroup} className="space-y-4">
        <Input
          label="Group Name"
          type="text"
          placeholder="Engineering Core Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<Users className="w-4 h-4" />}
          required
        />

        <div>
          <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider block mb-1">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is the purpose of this group?"
            rows={2}
            className="w-full bg-nova-dark border border-nova-border rounded-xl p-3 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary resize-none"
          />
        </div>

        {/* Permissions */}
        <div className="space-y-2 p-3 bg-nova-dark/80 border border-nova-border rounded-2xl">
          <label className="flex items-center justify-between text-xs cursor-pointer select-none">
            <span className="flex items-center gap-2 text-white">
              {isPublic ? <Globe className="w-4 h-4 text-nova-accent" /> : <Lock className="w-4 h-4 text-slate-400" />}
              <span>{isPublic ? 'Public Group (Anyone can join via link)' : 'Private Group (Invite only)'}</span>
            </span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded text-nova-primary bg-nova-card border-nova-border"
            />
          </label>

          <label className="flex items-center justify-between text-xs cursor-pointer select-none pt-2 border-t border-nova-border/50">
            <span className="flex items-center gap-2 text-white">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span>Announcement Mode (Only admins can send messages)</span>
            </span>
            <input
              type="checkbox"
              checked={onlyAdminsCanSend}
              onChange={(e) => setOnlyAdminsCanSend(e.target.checked)}
              className="w-4 h-4 rounded text-nova-primary bg-nova-card border-nova-border"
            />
          </label>
        </div>

        {/* Member selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-nova-muted uppercase tracking-wider">
              Add Members ({selectedUserIds.length} selected)
            </label>
          </div>

          <input
            type="text"
            placeholder="Search contacts to add..."
            value={searchContact}
            onChange={(e) => setSearchContact(e.target.value)}
            className="w-full bg-nova-dark border border-nova-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary mb-2"
          />

          <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredContacts.length === 0 ? (
              <p className="text-xs text-nova-muted text-center py-4">No contacts found</p>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedUserIds.includes(contact.id);
                return (
                  <div
                    key={contact.id}
                    onClick={() => toggleSelectUser(contact.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-nova-primary/20 border border-nova-primary/40' : 'hover:bg-nova-dark'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={contact.avatar_url} alt={contact.username} size="sm" />
                      <div>
                        <span className="text-xs font-bold text-white block">{contact.username}</span>
                        <span className="text-[10px] text-nova-muted">{contact.email}</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-nova-primary border-nova-primary text-white'
                          : 'border-nova-border text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-nova-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!name.trim()}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;
