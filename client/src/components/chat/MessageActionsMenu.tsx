import React, { useEffect, useRef } from 'react';
import {
  CornerUpLeft,
  Copy,
  Star,
  Pin,
  Share2,
  Edit2,
  Trash2,
  Sparkles,
  Globe,
  Check,
} from 'lucide-react';
import { Message } from '../../types';

interface MessageActionsMenuProps {
  message: Message;
  isMe: boolean;
  canDeleteForEveryone: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onReply: (m: Message) => void;
  onCopy: (text: string) => void;
  onToggleStar: (m: Message) => void;
  onTogglePin: (m: Message) => void;
  onForward: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDeleteForMe: (m: Message) => void;
  onDeleteForEveryone: (m: Message) => void;
  onSummarize?: (m: Message) => void;
  onTranslate?: (m: Message) => void;
}

export const MessageActionsMenu: React.FC<MessageActionsMenuProps> = ({
  message,
  isMe,
  canDeleteForEveryone,
  position,
  onClose,
  onReply,
  onCopy,
  onToggleStar,
  onTogglePin,
  onForward,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onSummarize,
  onTranslate,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  // Adjust position so it doesn't overflow screen boundaries
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 340),
    left: Math.min(position.x, window.innerWidth - 220),
    zIndex: 9999,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="w-52 bg-nova-card border border-nova-border rounded-2xl shadow-2xl p-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => {
          onReply(message);
          onClose();
        }}
        className="w-full px-3 py-2 text-left hover:bg-nova-dark rounded-xl flex items-center gap-2.5 transition-colors"
      >
        <CornerUpLeft className="w-4 h-4 text-nova-accent" /> Reply
      </button>

      {message.content && (
        <button
          onClick={() => {
            onCopy(message.content);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-nova-dark rounded-xl flex items-center gap-2.5 transition-colors"
        >
          <Copy className="w-4 h-4 text-nova-muted" /> Copy Text
        </button>
      )}

      <button
        onClick={() => {
          onToggleStar(message);
          onClose();
        }}
        className="w-full px-3 py-2 text-left hover:bg-nova-dark rounded-xl flex items-center gap-2.5 transition-colors"
      >
        <Star
          className={`w-4 h-4 ${
            message.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-nova-muted'
          }`}
        />
        {message.is_starred ? 'Unstar Message' : 'Star Message'}
      </button>

      <button
        onClick={() => {
          onTogglePin(message);
          onClose();
        }}
        className="w-full px-3 py-2 text-left hover:bg-nova-dark rounded-xl flex items-center gap-2.5 transition-colors"
      >
        <Pin className="w-4 h-4 text-nova-muted" />
        {message.is_pinned ? 'Unpin Message' : 'Pin Message'}
      </button>

      <button
        onClick={() => {
          onForward(message);
          onClose();
        }}
        className="w-full px-3 py-2 text-left hover:bg-nova-dark rounded-xl flex items-center gap-2.5 transition-colors"
      >
        <Share2 className="w-4 h-4 text-nova-muted" /> Forward
      </button>

      {/* AI actions */}
      {message.content && (
        <>
          <div className="my-1 border-t border-nova-border/50" />
          {onSummarize && (
            <button
              onClick={() => {
                onSummarize(message);
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-nova-dark text-nova-accent rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> AI Summarize
            </button>
          )}

          {onTranslate && (
            <button
              onClick={() => {
                onTranslate(message);
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-nova-dark text-nova-accent rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <Globe className="w-4 h-4" /> Translate Language
            </button>
          )}
        </>
      )}

      {/* Sender only: Edit */}
      {isMe && !message.is_deleted_for_everyone && (
        <>
          <div className="my-1 border-t border-nova-border/50" />
          <button
            onClick={() => {
              onEdit(message);
              onClose();
            }}
            className="w-full px-3 py-2 text-left hover:bg-nova-dark rounded-xl flex items-center gap-2.5 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-nova-primary" /> Edit Message
          </button>
        </>
      )}

      <div className="my-1 border-t border-nova-border/50" />

      {/* Delete for Me */}
      <button
        onClick={() => {
          onDeleteForMe(message);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-nova-error hover:bg-nova-error/10 rounded-xl flex items-center gap-2.5 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Delete for Me
      </button>

      {/* Delete for Everyone */}
      {canDeleteForEveryone && !message.is_deleted_for_everyone && (
        <button
          onClick={() => {
            onDeleteForEveryone(message);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-nova-error hover:bg-nova-error/10 rounded-xl flex items-center gap-2.5 transition-colors font-semibold"
        >
          <Trash2 className="w-4 h-4" /> Delete for Everyone
        </button>
      )}
    </div>
  );
};

export default MessageActionsMenu;
