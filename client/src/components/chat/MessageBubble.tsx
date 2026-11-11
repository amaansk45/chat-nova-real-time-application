import React from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  MapPin,
  UserCheck,
  CornerUpLeft,
  MoreHorizontal,
  Smile,
  Shield,
  Play,
  Share2,
} from 'lucide-react';
import { Message, User } from '../../types';
import Avatar from '../ui/Avatar';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  currentUser?: User | null;
  isGroup?: boolean;
  onReply: (message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  onOpenActions: (message: Message, e: React.MouseEvent) => void;
  onOpenMedia?: (url: string, type: 'image' | 'video') => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  currentUser,
  isGroup = false,
  onReply,
  onReact,
  onOpenActions,
  onOpenMedia,
}) => {
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStatusTicks = () => {
    if (!isMe) return null;
    const status = message.delivery_status || 'sent';

    if (status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-nova-accent inline ml-1" title="Read" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline ml-1" title="Delivered" />;
    }
    return <Check className="w-3.5 h-3.5 text-slate-400 inline ml-1" title="Sent" />;
  };

  if (message.is_deleted_for_everyone) {
    return (
      <div className={`flex my-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className="bg-nova-card/50 border border-nova-border/50 text-nova-muted text-xs italic px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
          <span>This message was deleted</span>
        </div>
      </div>
    );
  }

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="space-y-2 mt-2">
        {message.attachments.map((att) => {
          if (att.media_type === 'image') {
            return (
              <div
                key={att.id}
                onClick={() => onOpenMedia && onOpenMedia(att.file_url, 'image')}
                className="relative rounded-xl overflow-hidden cursor-pointer max-w-sm group border border-nova-border/30"
              >
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="w-full max-h-64 object-cover hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>
            );
          }

          if (att.media_type === 'video') {
            return (
              <div
                key={att.id}
                onClick={() => onOpenMedia && onOpenMedia(att.file_url, 'video')}
                className="relative rounded-xl overflow-hidden cursor-pointer max-w-sm border border-nova-border/30 bg-black"
              >
                <video src={att.file_url} className="w-full max-h-64 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/20 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-nova-primary/90 flex items-center justify-center text-white shadow-lg">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>
              </div>
            );
          }

          // Document / Other
          return (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-nova-dark/60 border border-nova-border/60 max-w-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-nova-primary/20 text-nova-accent flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{att.file_name}</p>
                <p className="text-[10px] text-nova-muted">
                  {(att.file_size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <a
                href={att.file_url}
                download={att.file_name}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-nova-card hover:bg-nova-primary/20 text-nova-muted hover:text-white transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLocation = () => {
    if (message.message_type !== 'location' || !message.metadata?.latitude) return null;
    const { latitude, longitude, address } = message.metadata;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="block mt-2 p-3 rounded-xl bg-nova-dark/70 border border-nova-border/70 hover:border-nova-primary transition-colors max-w-sm"
      >
        <div className="flex items-center gap-2 text-nova-accent mb-1 font-semibold text-xs">
          <MapPin className="w-4 h-4 text-nova-error" /> Shared Location
        </div>
        <p className="text-xs text-white truncate">{address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</p>
        <span className="text-[10px] text-nova-muted mt-1 block hover:underline">Open in Google Maps →</span>
      </a>
    );
  };

  const renderContact = () => {
    if (message.message_type !== 'contact' || !message.metadata?.contact_name) return null;
    const { contact_name, contact_phone } = message.metadata;

    return (
      <div className="mt-2 p-3 rounded-xl bg-nova-dark/70 border border-nova-border/70 max-w-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-nova-accent/20 text-nova-accent flex items-center justify-center font-bold">
          <UserCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-bold text-white truncate">{contact_name}</h5>
          <p className="text-[11px] text-nova-muted truncate">{contact_phone || 'No phone number'}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`group relative flex items-end gap-2 my-1 px-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sender Avatar for group chats */}
      {!isMe && isGroup && (
        <Avatar
          src={message.sender?.avatar_url}
          alt={message.sender?.username || 'User'}
          size="sm"
          className="mb-1 flex-shrink-0"
        />
      )}

      {/* Bubble Container */}
      <div className={`relative max-w-[70%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Hover Quick Actions Bar */}
        <div
          className={`absolute -top-7 ${
            isMe ? 'right-0' : 'left-0'
          } hidden group-hover:flex items-center gap-1 bg-nova-card border border-nova-border px-2 py-0.5 rounded-full shadow-lg z-10 text-nova-muted`}
        >
          {['👍', '❤️', '😂', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(message, emoji)}
              className="hover:scale-125 transition-transform text-xs p-1"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => onReply(message)}
            className="p-1 hover:text-white transition-colors"
            title="Reply"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => onOpenActions(message, e)}
            className="p-1 hover:text-white transition-colors"
            title="More Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bubble Body */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
            isMe
              ? 'bg-gradient-to-r from-nova-primary to-blue-600 text-white rounded-br-none'
              : 'bg-nova-card text-slate-100 border border-nova-border rounded-bl-none'
          }`}
        >
          {/* Group Sender Name */}
          {!isMe && isGroup && message.sender && (
            <div className="text-[11px] font-bold text-nova-accent mb-1 tracking-wide">
              {message.sender.first_name || message.sender.username}
            </div>
          )}

          {/* Forward Banner */}
          {message.forward_from_id && (
            <div className="flex items-center gap-1 text-[10px] text-nova-muted mb-1 italic">
              <Share2 className="w-3 h-3" /> Forwarded
            </div>
          )}

          {/* Quoted Reply Banner */}
          {message.reply_to && (
            <div
              className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                isMe ? 'bg-black/20 border-white/60 text-white/90' : 'bg-nova-dark/80 border-nova-primary text-slate-300'
              }`}
            >
              <span className="font-bold text-[11px] block text-nova-accent">
                {message.reply_to.sender?.username || 'User'}
              </span>
              <p className="truncate text-[11px]">{message.reply_to.content}</p>
            </div>
          )}

          {/* Text Message Content */}
          {message.content && (
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed select-text">
              {message.content}
            </p>
          )}

          {/* Media Attachments */}
          {renderAttachments()}

          {/* Location & Contact custom blocks */}
          {renderLocation()}
          {renderContact()}

          {/* Metadata Row: Timestamp + Edited + Status Ticks */}
          <div
            className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
              isMe ? 'text-blue-100' : 'text-nova-muted'
            }`}
          >
            {message.disappears_at && (
              <Clock className="w-3 h-3 text-nova-accent inline mr-0.5" title="Disappearing message" />
            )}
            {message.is_edited && <span className="italic mr-0.5">(edited)</span>}
            <span>{formatTime(message.created_at)}</span>
            {renderStatusTicks()}
          </div>
        </div>

        {/* Reactions Pill Display */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}
          >
            {/* Aggregate reactions by emoji */}
            {Object.entries(
              message.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                onClick={() => onReact(message, emoji)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-nova-card border border-nova-border text-xs cursor-pointer hover:bg-nova-dark transition-colors shadow-sm"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[10px] font-bold text-nova-muted">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
