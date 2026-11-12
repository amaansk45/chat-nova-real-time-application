import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Send, Heart, Flame } from 'lucide-react';
import { StoryFeedGroup, StoryItem } from '../../types';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';
import { useToast } from '../ui/Toast';

interface StoryViewerModalProps {
  group: StoryFeedGroup | null;
  onClose: () => void;
  onReplyToStory?: (storyId: string, replyText: string) => void;
  onReactToStory?: (storyId: string, emoji: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  group,
  onClose,
  onReplyToStory,
  onReactToStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const { showToast } = useToast();

  const activeStory: StoryItem | undefined = group?.statuses[currentIndex];

  // Mark status as viewed
  useEffect(() => {
    if (activeStory && !group?.is_me) {
      api.post(`/api/status/${activeStory.id}/view/`).catch(() => {});
    }
  }, [activeStory?.id, group?.is_me]);

  // Story progression timer (5000ms = 5s)
  useEffect(() => {
    if (!group || isPaused) return;

    setProgress(0);
    const interval = 50; // update every 50ms
    const step = 100 / (5000 / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, group, isPaused]);

  const handleNext = () => {
    if (!group) return;
    if (currentIndex < group.statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeStory) return;

    if (onReplyToStory) {
      onReplyToStory(activeStory.id, replyText.trim());
      showToast('Reply sent!', 'success');
      setReplyText('');
    }
  };

  const handleQuickReact = (emoji: string) => {
    if (!activeStory) return;
    if (onReactToStory) {
      onReactToStory(activeStory.id, emoji);
      showToast(`Reacted with ${emoji}`, 'info');
    }
  };

  if (!group || !activeStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-0 sm:p-4 select-none">
      {/* Viewer Box */}
      <div
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="relative w-full sm:max-w-md h-full sm:h-[85vh] bg-nova-dark rounded-none sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10"
      >
        {/* Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {group.statuses.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
                className="h-full bg-white transition-all duration-75"
              />
            </div>
          ))}
        </div>

        {/* Top Header */}
        <div className="relative z-30 pt-7 px-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2.5">
            <Avatar src={group.user.avatar_url} alt={group.user.username} size="sm" />
            <div>
              <h4 className="text-xs font-bold text-white leading-none">
                {group.user.first_name || group.user.username}
              </h4>
              <span className="text-[10px] text-slate-300">
                {new Date(activeStory.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Story Content */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {activeStory.media_type === 'text' ? (
            <div
              style={{
                background: activeStory.background_color || 'linear-gradient(135deg, #1e3a8a, #06b6d4)',
              }}
              className="w-full h-full flex items-center justify-center p-8 text-center"
            >
              <p
                style={{ fontFamily: activeStory.font_style || 'inherit' }}
                className="text-xl sm:text-2xl font-bold text-white leading-relaxed drop-shadow-md select-text"
              >
                {activeStory.text_content}
              </p>
            </div>
          ) : activeStory.media_type === 'image' ? (
            <div className="w-full h-full relative">
              <img
                src={activeStory.media_url || ''}
                alt="Story"
                className="w-full h-full object-cover"
              />
              {activeStory.caption && (
                <div className="absolute bottom-4 inset-x-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl text-center text-xs text-white">
                  {activeStory.caption}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full relative">
              <video
                src={activeStory.media_url || ''}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Invisible Left / Right Touch Nav */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-20"
          />
        </div>

        {/* Bottom Bar: Owner Viewers or Reply Input */}
        <div className="relative z-30 p-3 bg-gradient-to-t from-black/90 to-transparent">
          {group.is_me ? (
            <div className="flex items-center justify-center">
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                <Eye className="w-4 h-4 text-nova-accent" />
                <span>{activeStory.views_count} viewers</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Quick Emojis */}
              <div className="flex items-center justify-center gap-4">
                {['❤️', '🔥', '😂', '👏', '😍', '🎉'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReact(emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${group.user.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2 rounded-full bg-nova-primary text-white disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;
