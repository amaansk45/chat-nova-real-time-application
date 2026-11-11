import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Trash2, Send, Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface ScheduledMessage {
  id: string;
  conversation_id: string;
  content: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  created_at: string;
}

interface ScheduledMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ScheduledMessagesModal: React.FC<ScheduledMessagesModalProps> = ({
  isOpen,
  onClose,
  conversationId,
}) => {
  const [scheduledList, setScheduledList] = useState<ScheduledMessage[]>([]);
  const [content, setContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadScheduled();
    }
  }, [isOpen, conversationId]);

  const loadScheduled = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/chat/scheduled-messages/', {
        params: { conversation_id: conversationId },
      });
      setScheduledList(res.data.results || res.data || []);
    } catch (err) {
      // Endpoint fallback
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !scheduleDate) {
      showToast('Please provide both message content and a valid future date/time.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/chat/scheduled-messages/', {
        conversation_id: conversationId,
        content: content.trim(),
        scheduled_for: new Date(scheduleDate).toISOString(),
      });
      setScheduledList((prev) => [res.data, ...prev]);
      setContent('');
      setScheduleDate('');
      showToast('Message scheduled successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to schedule message.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      await api.delete(`/api/chat/scheduled-messages/${id}/`);
      setScheduledList((prev) => prev.filter((m) => m.id !== id));
      showToast('Scheduled message cancelled.', 'info');
    } catch (err) {
      showToast('Failed to cancel scheduled message.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scheduled Messages" size="md">
      <div className="space-y-6">
        {/* New Schedule Form */}
        <form onSubmit={handleScheduleSubmit} className="p-4 bg-nova-dark/70 border border-nova-border rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-nova-accent" /> Schedule a New Message
          </h4>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type the message you want to send in the future..."
            rows={2}
            className="w-full bg-nova-card border border-nova-border rounded-xl p-3 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary resize-none"
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="flex-1 bg-nova-card border border-nova-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nova-primary"
              required
            />
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              <Send className="w-3.5 h-3.5 mr-1" /> Schedule
            </Button>
          </div>
        </form>

        {/* Existing List */}
        <div>
          <h4 className="text-xs font-semibold text-nova-muted uppercase tracking-wider mb-2">
            Upcoming Scheduled Messages
          </h4>

          <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
            {loading ? (
              <p className="text-xs text-nova-muted text-center py-4">Loading queue...</p>
            ) : scheduledList.length === 0 ? (
              <p className="text-xs text-nova-muted text-center py-6">No scheduled messages for this chat.</p>
            ) : (
              scheduledList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-nova-dark border border-nova-border rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white truncate">{item.content}</p>
                    <span className="text-[11px] text-nova-accent flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.scheduled_for).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancelScheduled(item.id)}
                    className="p-1.5 rounded-lg text-nova-muted hover:text-red-400 hover:bg-nova-card transition-colors"
                    title="Cancel schedule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduledMessagesModal;
