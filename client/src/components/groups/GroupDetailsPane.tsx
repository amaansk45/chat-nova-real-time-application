import React, { useState } from 'react';
import {
  Users,
  Shield,
  Link2,
  Copy,
  Check,
  UserMinus,
  UserPlus,
  LogOut,
  MoreVertical,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Conversation, ConversationMember, User } from '../../types';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface GroupDetailsPaneProps {
  conversation: Conversation;
  currentUser: User | null;
  onClose: () => void;
  onGroupUpdated: () => void;
}

export const GroupDetailsPane: React.FC<GroupDetailsPaneProps> = ({
  conversation,
  currentUser,
  onClose,
  onGroupUpdated,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteToken, setInviteToken] = useState<string>('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const { showToast } = useToast();

  const members = conversation.members || [];
  const currentMember = members.find((m) => m.user.id === currentUser?.id);
  const isCurrentUserAdmin =
    currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleGenerateInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await api.post(`/api/groups/${conversation.id}/invite-link/`);
      const link = `${window.location.origin}/join/${res.data.token || res.data.invite_code}`;
      setInviteToken(link);
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      showToast('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      showToast('Failed to generate invite link.', 'error');
    } finally {
      setLoadingInvite(false);
    }
  };

  const handlePromote = async (memberId: string) => {
    try {
      await api.post(`/api/groups/${conversation.id}/members/${memberId}/promote/`);
      showToast('Member promoted to admin.', 'success');
      onGroupUpdated();
    } catch (err) {
      showToast('Failed to promote member.', 'error');
    }
  };

  const handleDemote = async (memberId: string) => {
    try {
      await api.post(`/api/groups/${conversation.id}/members/${memberId}/demote/`);
      showToast('Admin demoted to regular member.', 'info');
      onGroupUpdated();
    } catch (err) {
      showToast('Failed to demote member.', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member from the group?')) {
      try {
        await api.delete(`/api/groups/${conversation.id}/members/${memberId}/`);
        showToast('Member removed.', 'info');
        onGroupUpdated();
      } catch (err) {
        showToast('Failed to remove member.', 'error');
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        await api.post(`/api/groups/${conversation.id}/leave/`);
        showToast('You have left the group.', 'info');
        onClose();
        onGroupUpdated();
      } catch (err) {
        showToast('Failed to leave group.', 'error');
      }
    }
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto custom-scrollbar space-y-6">
      {/* Group Card */}
      <div className="text-center pt-2">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-nova-primary to-nova-accent p-0.5 shadow-xl mb-3">
          <div className="w-full h-full bg-nova-card rounded-[22px] flex items-center justify-center font-black text-2xl text-white">
            {conversation.display_title[0]?.toUpperCase() || 'G'}
          </div>
        </div>
        <h3 className="text-base font-bold text-white">{conversation.display_title}</h3>
        <span className="text-xs text-nova-muted">{members.length} participants</span>
      </div>

      {/* Invite Link Action */}
      <div className="p-3 bg-nova-dark/80 border border-nova-border rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-nova-accent" /> Group Invite Link
          </span>
          <button
            onClick={handleGenerateInvite}
            disabled={loadingInvite}
            className="text-xs text-nova-accent hover:underline flex items-center gap-1 font-semibold"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-nova-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Members Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-nova-muted uppercase tracking-wider">
            Group Members ({members.length})
          </h4>
        </div>

        <div className="space-y-1.5">
          {members.map((member) => {
            const isMe = member.user.id === currentUser?.id;
            const isOwner = member.role === 'owner';
            const isAdmin = member.role === 'admin';

            return (
              <div
                key={member.id}
                className="p-2.5 bg-nova-dark/60 border border-nova-border/60 rounded-xl flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={member.user.avatar_url} alt={member.user.username} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {member.user.username} {isMe && '(You)'}
                      </span>
                      {isOwner && (
                        <Badge variant="warning" size="sm">
                          Owner
                        </Badge>
                      )}
                      {isAdmin && (
                        <Badge variant="primary" size="sm">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-nova-muted">
                      {member.user.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Admin actions on other members */}
                {isCurrentUserAdmin && !isMe && !isOwner && (
                  <div className="flex items-center gap-1">
                    {isAdmin ? (
                      <button
                        onClick={() => handleDemote(member.id)}
                        className="p-1 rounded text-nova-muted hover:text-white"
                        title="Demote from Admin"
                      >
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePromote(member.id)}
                        className="p-1 rounded text-nova-muted hover:text-nova-accent"
                        title="Make Group Admin"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 rounded text-nova-muted hover:text-nova-error"
                      title="Remove Member"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave Group Action */}
      <div className="pt-4 border-t border-nova-border/60">
        <button
          onClick={handleLeaveGroup}
          className="w-full p-3 rounded-2xl bg-nova-error/10 hover:bg-nova-error/20 text-nova-error border border-nova-error/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Leave Group
        </button>
      </div>
    </div>
  );
};

export default GroupDetailsPane;
