import React from 'react';
import { Pin, VolumeX, Image, Mic, FileText, Check, CheckCheck } from 'lucide-react';
import { Conversation } from '../../types';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isTyping?: boolean;
  typingUser?: string;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  isTyping = false,
  typingUser,
  onClick,
}) => {
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const isThisWeek = now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
    if (isThisWeek) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderLastMessageSnippet = () => {
    if (isTyping) {
      return (
        <span className="text-nova-accent font-medium italic flex items-center gap-1 text-xs animate-pulse">
          <span>{typingUser || 'Someone'} is typing...</span>
        </span>
      );
    }

    const last = conversation.last_message;
    if (!last) {
      return <span className="text-nova-muted text-xs italic">No messages yet</span>;
    }

    let prefix = '';
    if (conversation.type === 'group' && last.sender_username) {
      prefix = `${last.sender_username}: `;
    }

    let contentIcon = null;
    if (last.message_type === 'image') contentIcon = <Image className="w-3.5 h-3.5 inline mr-1 text-nova-muted" />;
    else if (last.message_type === 'voice') contentIcon = <Mic className="w-3.5 h-3.5 inline mr-1 text-nova-accent" />;
    else if (last.message_type === 'document') contentIcon = <FileText className="w-3.5 h-3.5 inline mr-1 text-nova-muted" />;

    return (
      <span className="text-nova-muted text-xs truncate max-w-[190px] block">
        {contentIcon}
        <span className="font-medium text-slate-400">{prefix}</span>
        {last.content || (last.message_type !== 'text' ? `[${last.message_type}]` : '')}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-nova-primary/15 border border-nova-primary/30 shadow-md shadow-blue-500/5'
          : 'hover:bg-nova-card border border-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={conversation.display_avatar || conversation.other_participant?.avatar_url}
          alt={conversation.display_title}
          size="md"
          status={conversation.type === 'direct' ? (conversation.other_participant?.is_online ? 'online' : 'offline') : undefined}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4
            className={`text-sm font-semibold truncate ${
              isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {conversation.display_title}
          </h4>
          <span className="text-[11px] text-nova-muted flex-shrink-0">
            {formatTime(conversation.last_message?.created_at || conversation.updated_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {renderLastMessageSnippet()}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conversation.is_muted && (
              <VolumeX className="w-3.5 h-3.5 text-nova-muted" title="Muted" />
            )}
            {conversation.is_pinned && (
              <Pin className="w-3.5 h-3.5 text-nova-accent fill-nova-accent/20" title="Pinned" />
            )}
            {conversation.unread_count > 0 && (
              <Badge variant="primary" size="sm" rounded>
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
