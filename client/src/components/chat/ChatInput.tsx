import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Image,
  FileText,
  MapPin,
  UserPlus,
  BarChart2,
  X,
  Sparkles,
} from 'lucide-react';
import { Message } from '../../types';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void;
  onSendVoiceMessage?: (blob: Blob, duration: number) => void;
  onTyping?: (isTyping: boolean) => void;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onUpdateMessage?: (messageId: string, content: string) => void;
  onShareLocation?: () => void;
  onShareContact?: () => void;
  onCreatePoll?: () => void;
  onTriggerAIWrite?: (currentText: string) => void;
  isGroup?: boolean;
}

const COMMON_EMOJIS = ['😊', '😂', '❤️', '🔥', '👍', '🎉', '🚀', '🙏', '😍', '👏', '✨', '💡'];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendVoiceMessage,
  onTyping,
  replyToMessage,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onUpdateMessage,
  onShareLocation,
  onShareContact,
  onCreatePoll,
  onTriggerAIWrite,
  isGroup = false,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Trigger typing event with debounce
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && selectedFiles.length === 0) return;

    if (editingMessage && onUpdateMessage) {
      onUpdateMessage(editingMessage.id, trimmed);
      onCancelEdit?.();
    } else {
      onSendMessage(trimmed, selectedFiles.length > 0 ? selectedFiles : undefined);
      if (onCancelReply) onCancelReply();
    }

    setText('');
    setSelectedFiles([]);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (onTyping) onTyping(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
      setShowAttachmentMenu(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative border-t border-nova-border bg-nova-card/95 backdrop-blur-md p-3">
      {/* Reply Banner */}
      {replyToMessage && (
        <div className="flex items-center justify-between bg-nova-dark/90 border border-nova-border rounded-xl px-3 py-2 mb-2 text-xs">
          <div className="min-w-0 pr-2">
            <span className="font-bold text-nova-accent block">
              Replying to {replyToMessage.sender?.username || 'User'}
            </span>
            <p className="text-nova-muted truncate">{replyToMessage.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-md text-nova-muted hover:text-white hover:bg-nova-card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between bg-nova-primary/20 border border-nova-primary/40 rounded-xl px-3 py-2 mb-2 text-xs text-white">
          <div className="min-w-0 pr-2">
            <span className="font-bold text-nova-accent block">Editing Message</span>
            <p className="text-slate-300 truncate">{editingMessage.content}</p>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1 rounded-md text-nova-muted hover:text-white hover:bg-nova-card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Files Preview List */}
      {selectedFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
          {selectedFiles.map((f, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-nova-dark border border-nova-border text-xs text-slate-200"
            >
              <FileText className="w-3.5 h-3.5 text-nova-accent" />
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-nova-muted hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Input Row */}
      <div className="flex items-end gap-2">
        {/* Attachment menu button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            className="p-2.5 rounded-xl text-nova-muted hover:text-white hover:bg-nova-dark transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment Popup Menu */}
          {showAttachmentMenu && (
            <div className="absolute bottom-12 left-0 w-52 bg-nova-card border border-nova-border rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark rounded-xl flex items-center gap-2.5"
              >
                <Image className="w-4 h-4 text-blue-400" /> Photos & Videos
              </button>

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark rounded-xl flex items-center gap-2.5"
              >
                <FileText className="w-4 h-4 text-purple-400" /> Documents & Files
              </button>

              {onShareLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    onShareLocation();
                  }}
                  className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark rounded-xl flex items-center gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-red-400" /> Share Location
                </button>
              )}

              {onShareContact && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    onShareContact();
                  }}
                  className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark rounded-xl flex items-center gap-2.5"
                >
                  <UserPlus className="w-4 h-4 text-green-400" /> Share Contact
                </button>
              )}

              {isGroup && onCreatePoll && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentMenu(false);
                    onCreatePoll();
                  }}
                  className="w-full px-3 py-2 text-left text-slate-200 hover:text-white hover:bg-nova-dark rounded-xl flex items-center gap-2.5"
                >
                  <BarChart2 className="w-4 h-4 text-yellow-400" /> Create Group Poll
                </button>
              )}
            </div>
          )}
        </div>

        {/* Text Input Container */}
        <div className="flex-1 relative bg-nova-dark border border-nova-border rounded-2xl flex items-center px-3 py-1.5 focus-within:border-nova-primary focus-within:ring-1 focus-within:ring-nova-primary transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-nova-muted outline-none resize-none max-h-32 custom-scrollbar py-1"
          />

          {/* AI Writing Assistant Pill */}
          {onTriggerAIWrite && text.length > 5 && (
            <button
              type="button"
              onClick={() => onTriggerAIWrite(text)}
              className="p-1.5 text-nova-accent hover:text-white hover:bg-nova-card rounded-lg transition-colors mr-1"
              title="AI Writing Assistant"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* Emoji Picker Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowAttachmentMenu(false);
              }}
              className="p-1.5 text-nova-muted hover:text-white rounded-lg transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Quick Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-10 right-0 p-2 bg-nova-card border border-nova-border rounded-2xl shadow-2xl z-50 grid grid-cols-4 gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-nova-dark rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Send / Mic button */}
        {text.trim() || selectedFiles.length > 0 ? (
          <button
            type="button"
            onClick={handleSend}
            className="p-3 rounded-2xl bg-gradient-to-r from-nova-primary to-blue-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="Send Message"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onSendVoiceMessage) {
                // Trigger voice recorder
              }
            }}
            className="p-3 rounded-2xl bg-nova-card border border-nova-border text-nova-muted hover:text-white hover:bg-nova-dark transition-all flex items-center justify-center"
            title="Record Voice Message"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
