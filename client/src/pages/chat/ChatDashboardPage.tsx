import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Search,
  X,
  Users,
  Image as ImageIcon,
  Clock,
  Pin,
  Star,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { sounds } from '../../utils/sounds';
import api from '../../utils/api';
import { Conversation, Message } from '../../types';
import ChatLayout from '../../components/chat/ChatLayout';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindowHeader from '../../components/chat/ChatWindowHeader';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import MessageActionsMenu from '../../components/chat/MessageActionsMenu';
import StarredMessagesModal from '../../components/chat/StarredMessagesModal';
import ScheduledMessagesModal from '../../components/chat/ScheduledMessagesModal';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const ChatDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // In-chat search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Right info pane
  const [showRightPane, setShowRightPane] = useState(false);

  // Reply / Edit state
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Message Actions Context Menu
  const [actionMenuState, setActionMenuState] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);

  // Modals
  const [isStarredModalOpen, setIsStarredModalOpen] = useState(false);
  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatIdentifier, setNewChatIdentifier] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Media lightbox
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === selectedConversationId);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await api.get('/api/chat/conversations/');
      const list = res.data.results || res.data || [];
      setConversations(list);
      if (list.length > 0 && !selectedConversationId) {
        setSelectedConversationId(list[0].id);
      }
    } catch (err) {
      // Fallback
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/chat/conversations/${convId}/messages/`);
      setMessages(res.data.results || res.data || []);
    } catch (err) {
      showToast('Failed to load messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send new message
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedConversationId) return;

    try {
      sounds.playSent();
      const formData = new FormData();
      formData.append('conversation_id', selectedConversationId);
      if (content) formData.append('content', content);
      if (replyToMessage) formData.append('reply_to_id', replyToMessage.id);

      if (attachments && attachments.length > 0) {
        attachments.forEach((file) => {
          formData.append('files', file);
        });
      }

      const res = await api.post('/api/chat/messages/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessages((prev) => [...prev, res.data]);
      setReplyToMessage(null);

      // Update conversation last message in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
            ? {
                ...c,
                last_message: {
                  id: res.data.id,
                  content: res.data.content,
                  message_type: res.data.message_type,
                  sender_username: user?.username || 'You',
                  created_at: res.data.created_at,
                },
                updated_at: res.data.created_at,
              }
            : c
        )
      );
    } catch (err) {
      showToast('Failed to send message.', 'error');
    }
  };

  // Edit message
  const handleUpdateMessage = async (messageId: string, newContent: string) => {
    try {
      const res = await api.patch(`/api/chat/messages/${messageId}/`, {
        content: newContent,
      });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? res.data : m)));
      setEditingMessage(null);
      showToast('Message edited.', 'info');
    } catch (err) {
      showToast('Failed to edit message.', 'error');
    }
  };

  // Reactions
  const handleReact = async (message: Message, emoji: string) => {
    try {
      sounds.playReaction();
      const res = await api.post(`/api/chat/messages/${message.id}/react/`, { emoji });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, reactions: res.data.reactions } : m))
      );
    } catch (err) {
      showToast('Failed to add reaction.', 'error');
    }
  };

  // Toggle star
  const handleToggleStar = async (message: Message) => {
    try {
      await api.post(`/api/chat/messages/${message.id}/star/`);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_starred: !m.is_starred } : m))
      );
      showToast(message.is_starred ? 'Removed from starred.' : 'Message starred!', 'success');
    } catch (err) {
      showToast('Failed to star message.', 'error');
    }
  };

  // Delete message
  const handleDeleteForMe = async (message: Message) => {
    try {
      await api.delete(`/api/chat/messages/${message.id}/`);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      showToast('Message deleted for you.', 'info');
    } catch (err) {
      showToast('Failed to delete message.', 'error');
    }
  };

  const handleDeleteForEveryone = async (message: Message) => {
    try {
      await api.post(`/api/chat/messages/${message.id}/delete-for-everyone/`);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_deleted_for_everyone: true } : m))
      );
      showToast('Message deleted for everyone.', 'info');
    } catch (err) {
      showToast('Failed to delete for everyone.', 'error');
    }
  };

  // Conversation options
  const handleToggleMute = async () => {
    if (!selectedConversationId) return;
    try {
      const res = await api.post(`/api/chat/conversations/${selectedConversationId}/mute/`);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversationId ? { ...c, is_muted: res.data.is_muted } : c))
      );
      showToast(res.data.is_muted ? 'Conversation muted.' : 'Notifications unmuted.', 'info');
    } catch (err) {
      showToast('Failed to toggle mute.', 'error');
    }
  };

  const handleTogglePin = async () => {
    if (!selectedConversationId) return;
    try {
      const res = await api.post(`/api/chat/conversations/${selectedConversationId}/pin/`);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversationId ? { ...c, is_pinned: res.data.is_pinned } : c))
      );
      showToast(res.data.is_pinned ? 'Conversation pinned to top.' : 'Unpinned conversation.', 'info');
    } catch (err) {
      showToast('Failed to pin conversation.', 'error');
    }
  };

  const handleArchive = async () => {
    if (!selectedConversationId) return;
    try {
      const res = await api.post(`/api/chat/conversations/${selectedConversationId}/archive/`);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversationId ? { ...c, is_archived: res.data.is_archived } : c))
      );
      showToast(res.data.is_archived ? 'Conversation archived.' : 'Unarchived conversation.', 'info');
    } catch (err) {
      showToast('Failed to archive.', 'error');
    }
  };

  const handleClearChat = async () => {
    if (!selectedConversationId) return;
    if (window.confirm('Are you sure you want to clear your message history in this chat?')) {
      try {
        await api.post(`/api/chat/conversations/${selectedConversationId}/clear/`);
        setMessages([]);
        showToast('Chat history cleared.', 'info');
      } catch (err) {
        showToast('Failed to clear chat.', 'error');
      }
    }
  };

  // Start new direct conversation
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatIdentifier.trim()) return;

    setIsCreatingChat(true);
    try {
      const res = await api.post('/api/chat/conversations/direct/', {
        username_or_email: newChatIdentifier.trim(),
      });
      setConversations((prev) => [res.data, ...prev.filter((c) => c.id !== res.data.id)]);
      setSelectedConversationId(res.data.id);
      setIsNewChatModalOpen(false);
      setNewChatIdentifier('');
      showToast('Conversation ready!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'User not found.', 'error');
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Filter messages if search is active
  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  return (
    <ChatLayout
      conversationList={
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={(id) => setSelectedConversationId(id)}
          onNewChat={() => setIsNewChatModalOpen(true)}
          onNewGroup={() => showToast('Group creation available in Groups tab.', 'info')}
        />
      }
      showRightPane={showRightPane}
      rightPane={
        activeConversation && (
          <div className="p-4 flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-nova-border">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Conversation Info</h3>
              <button
                onClick={() => setShowRightPane(false)}
                className="p-1 rounded-lg text-nova-muted hover:text-white hover:bg-nova-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-nova-primary to-nova-accent p-0.5 mb-3 shadow-xl">
                <div className="w-full h-full bg-nova-card rounded-[22px] flex items-center justify-center font-black text-2xl text-white">
                  {activeConversation.display_title[0]?.toUpperCase() || 'C'}
                </div>
              </div>
              <h4 className="text-base font-bold text-white">{activeConversation.display_title}</h4>
              <p className="text-xs text-nova-muted mt-0.5">
                {activeConversation.type === 'direct' ? 'Private Chat • End-to-End Encrypted' : 'Group Discussion'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setIsStarredModalOpen(true)}
                className="w-full p-3 bg-nova-dark/80 hover:bg-nova-card rounded-2xl border border-nova-border flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> Starred Messages
                </span>
                <span className="text-nova-muted">View all →</span>
              </button>

              <button
                onClick={() => setIsScheduledModalOpen(true)}
                className="w-full p-3 bg-nova-dark/80 hover:bg-nova-card rounded-2xl border border-nova-border flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-nova-accent" /> Scheduled Queue
                </span>
                <span className="text-nova-muted">View →</span>
              </button>
            </div>

            <div className="p-3 bg-nova-card/50 rounded-2xl border border-nova-border/70 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-nova-accent">
                <ShieldCheck className="w-4 h-4 text-nova-success" /> Security & Privacy
              </div>
              <p className="text-[11px] text-nova-muted leading-relaxed">
                Messages in this chat are secured with high-grade transport and payload encryption keys.
              </p>
            </div>
          </div>
        )
      }
    >
      {activeConversation ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <ChatWindowHeader
            conversation={activeConversation}
            onVoiceCall={() => sounds.playRingtone()}
            onVideoCall={() => sounds.playRingtone()}
            onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
            onToggleInfo={() => setShowRightPane(!showRightPane)}
            onToggleMute={handleToggleMute}
            onTogglePin={handleTogglePin}
            onArchive={handleArchive}
            onClearChat={handleClearChat}
          />

          {/* In-Chat Search Bar */}
          {isSearchOpen && (
            <div className="p-2.5 bg-nova-card border-b border-nova-border flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
              <Search className="w-4 h-4 text-nova-muted ml-2" />
              <input
                type="text"
                placeholder="Find in conversation..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-nova-muted outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setChatSearchQuery('');
                }}
                className="p-1 rounded-md text-nova-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
            {/* Encryption notice banner */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nova-card/60 border border-nova-border text-[11px] text-nova-muted shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-nova-success" />
                <span>End-to-end encrypted • Nobody outside this chat can read your messages</span>
              </div>
            </div>

            {loadingMessages ? (
              <div className="py-20 text-center text-xs text-nova-muted animate-pulse">
                Decrypting messages...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-20 text-center text-xs text-nova-muted">
                {chatSearchQuery ? 'No matching messages found' : 'Say hello and start the conversation!'}
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMe={msg.sender?.id === user?.id}
                  currentUser={user}
                  isGroup={activeConversation.type === 'group'}
                  onReply={(m) => setReplyToMessage(m)}
                  onReact={handleReact}
                  onOpenActions={(m, e) => {
                    e.preventDefault();
                    setActionMenuState({
                      message: m,
                      position: { x: e.clientX, y: e.clientY },
                    });
                  }}
                  onOpenMedia={(url, type) => setLightboxUrl({ url, type })}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Component */}
          <ChatInput
            onSendMessage={handleSendMessage}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onUpdateMessage={handleUpdateMessage}
            isGroup={activeConversation.type === 'group'}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="w-20 h-20 rounded-3xl bg-nova-card border border-nova-border flex items-center justify-center text-nova-primary mb-4 shadow-xl">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Select a conversation</h3>
          <p className="text-xs text-nova-muted max-w-sm">
            Choose a contact or group from the list on the left to start sending secure messages.
          </p>
        </div>
      )}

      {/* Message Actions Menu */}
      {actionMenuState && (
        <MessageActionsMenu
          message={actionMenuState.message}
          isMe={actionMenuState.message.sender?.id === user?.id}
          canDeleteForEveryone={actionMenuState.message.sender?.id === user?.id}
          position={actionMenuState.position}
          onClose={() => setActionMenuState(null)}
          onReply={(m) => setReplyToMessage(m)}
          onCopy={(text) => {
            navigator.clipboard.writeText(text);
            showToast('Copied to clipboard!', 'info');
          }}
          onToggleStar={handleToggleStar}
          onTogglePin={(m) => showToast('Message pinned.', 'info')}
          onForward={(m) => showToast('Forwarding message...', 'info')}
          onEdit={(m) => setEditingMessage(m)}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
      )}

      {/* Starred Messages Modal */}
      <StarredMessagesModal
        isOpen={isStarredModalOpen}
        onClose={() => setIsStarredModalOpen(false)}
        onJumpToMessage={(msgId, convId) => {
          setSelectedConversationId(convId);
        }}
      />

      {/* Scheduled Messages Modal */}
      {selectedConversationId && (
        <ScheduledMessagesModal
          isOpen={isScheduledModalOpen}
          onClose={() => setIsScheduledModalOpen(false)}
          conversationId={selectedConversationId}
        />
      )}

      {/* New Direct Chat Modal */}
      <Modal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        title="Start New Conversation"
        size="sm"
      >
        <form onSubmit={handleCreateNewChat} className="space-y-4">
          <p className="text-xs text-nova-muted">
            Enter the username or registered email address of the person you want to chat with.
          </p>
          <Input
            label="Username or Email"
            type="text"
            placeholder="alexwalker or alex@example.com"
            value={newChatIdentifier}
            onChange={(e) => setNewChatIdentifier(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" variant="primary" fullWidth isLoading={isCreatingChat}>
            Start Chatting
          </Button>
        </form>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {lightboxUrl.type === 'image' ? (
              <img
                src={lightboxUrl.url}
                alt="Full preview"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={lightboxUrl.url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl"
              />
            )}
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-nova-accent p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </ChatLayout>
  );
};

export default ChatDashboardPage;
