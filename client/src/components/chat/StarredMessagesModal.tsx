import React, { useState, useEffect } from 'react';
import { Star, Trash2, ExternalLink, Calendar, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import { Message } from '../../types';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface StarredMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToMessage: (messageId: string, conversationId: string) => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({
  isOpen,
  onClose,
  onJumpToMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadStarredMessages();
    }
  }, [isOpen]);

  const loadStarredMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/chat/messages/starred/');
      setMessages(res.data.results || res.data || []);
    } catch (err) {
      showToast('Failed to load starred messages.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (id: string) => {
    try {
      await api.post(`/api/chat/messages/${id}/star/`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      showToast('Message unstarred.', 'info');
    } catch (err) {
      showToast('Failed to unstar message.', 'error');
    }
  };

  const filtered = messages.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Starred Messages" size="lg">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-nova-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search starred messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-nova-dark border border-nova-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary"
          />
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-nova-muted animate-pulse">
              Loading starred messages...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-10 h-10 text-nova-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-300">No starred messages</p>
              <p className="text-xs text-nova-muted mt-1">
                Star important messages to easily find them later.
              </p>
            </div>
          ) : (
            filtered.map((msg) => (
              <div
                key={msg.id}
                className="p-3 bg-nova-dark/80 border border-nova-border rounded-2xl flex items-start justify-between gap-3 group hover:border-nova-primary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-nova-accent">
                      {msg.sender?.username || 'User'}
                    </span>
                    <span className="text-[10px] text-nova-muted">
                      {new Date(msg.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-3 select-text leading-relaxed">
                    {msg.content || `[${msg.message_type}]`}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      onJumpToMessage(msg.id, msg.conversation_id);
                      onClose();
                    }}
                    className="p-1.5 rounded-lg text-nova-muted hover:text-white hover:bg-nova-card transition-colors"
                    title="Jump to message"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleUnstar(msg.id)}
                    className="p-1.5 rounded-lg text-yellow-400 hover:text-red-400 hover:bg-nova-card transition-colors"
                    title="Remove star"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default StarredMessagesModal;
