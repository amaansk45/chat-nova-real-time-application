import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  Search,
  Pin,
  MoreVertical,
  ArrowLeft,
  Volume2,
  VolumeX,
  Archive,
  Trash2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Conversation } from '../../types';
import Avatar from '../ui/Avatar';

interface ChatWindowHeaderProps {
  conversation: Conversation;
  isTyping?: boolean;
  onBackMobile?: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleSearch: () => void;
  onToggleInfo: () => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onClearChat: () => void;
  onBlockUser?: () => void;
}

export const ChatWindowHeader: React.FC<ChatWindowHeaderProps> = ({
  conversation,
  isTyping,
  onBackMobile,
  onVoiceCall,
  onVideoCall,
  onToggleSearch,
  onToggleInfo,
  onToggleMute,
  onTogglePin,
  onArchive,
  onClearChat,
  onBlockUser,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderStatus = () => {
    if (isTyping) {
      return (
        <span className="text-xs text-nova-accent font-medium animate-pulse flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-nova-accent animate-ping" />
          typing...
        </span>
      );
    }
    if (conversation.type === 'group') {
      const count = conversation.members?.length || 0;
      return <span className="text-xs text-nova-muted">{count > 0 ? `${count} members` : 'Group'}</span>;
    }
    const other = conversation.other_participant;
    if (other?.is_online) {
      return (
        <span className="text-xs text-nova-success font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-nova-success animate-pulse" />
          Online
        </span>
      );
    }
    if (other?.last_seen) {
      const date = new Date(other.last_seen);
      return (
        <span className="text-xs text-nova-muted">
          Last seen {date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    }
    return <span className="text-xs text-nova-muted">Offline</span>;
  };

  return (
    <div className="h-16 px-4 bg-nova-card/90 backdrop-blur-md border-b border-nova-border flex items-center justify-between z-20">
      {/* Left: Avatar & Info */}
      <div className="flex items-center gap-3 min-w-0">
        {onBackMobile && (
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 rounded-lg text-nova-muted hover:text-white hover:bg-nova-dark"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={onToggleInfo}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
        >
          <Avatar
            src={conversation.display_avatar || conversation.other_participant?.avatar_url}
            alt={conversation.display_title}
            size="md"
            status={conversation.type === 'direct' ? (conversation.other_participant?.is_online ? 'online' : 'offline') : undefined}
          />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate group-hover:text-nova-accent transition-colors">
              {conversation.display_title}
            </h3>
            {renderStatus()}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onVoiceCall}
          className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-dark transition-colors"
          title="Voice Call"
        >
          <Phone className="w-5 h-5" />
        </button>

        <button
          onClick={onVideoCall}
          className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-dark transition-colors"
          title="Video Call"
        >
          <Video className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleSearch}
          className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-dark transition-colors"
          title="Search in Chat"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleInfo}
          className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-dark transition-colors"
          title="Conversation Details"
        >
          <Info className="w-5 h-5" />
        </button>

        {/* More Menu Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-dark transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-nova-card border border-nova-border rounded-2xl shadow-2xl py-1.5 z-50 text-xs">
              <button
                onClick={() => {
                  onToggleMute();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark flex items-center gap-2.5"
              >
                {conversation.is_muted ? <Volume2 className="w-4 h-4 text-nova-success" /> : <VolumeX className="w-4 h-4 text-nova-muted" />}
                {conversation.is_muted ? 'Unmute Notifications' : 'Mute Notifications'}
              </button>

              <button
                onClick={() => {
                  onTogglePin();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark flex items-center gap-2.5"
              >
                <Pin className="w-4 h-4 text-nova-muted" />
                {conversation.is_pinned ? 'Unpin Conversation' : 'Pin to Top'}
              </button>

              <button
                onClick={() => {
                  onArchive();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark flex items-center gap-2.5"
              >
                <Archive className="w-4 h-4 text-nova-muted" />
                {conversation.is_archived ? 'Unarchive Chat' : 'Archive Chat'}
              </button>

              <div className="my-1 border-t border-nova-border/50" />

              <button
                onClick={() => {
                  onClearChat();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-nova-error hover:bg-nova-error/10 flex items-center gap-2.5"
              >
                <Trash2 className="w-4 h-4" /> Clear Chat History
              </button>

              {conversation.type === 'direct' && onBlockUser && (
                <button
                  onClick={() => {
                    onBlockUser();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-nova-error hover:bg-nova-error/10 flex items-center gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4" /> Block User
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindowHeader;
