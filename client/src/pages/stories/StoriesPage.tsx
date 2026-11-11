import React, { useState, useEffect } from 'react';
import { Plus, Clock, Eye, Sparkles, Image as ImageIcon } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StoryBar from '../../components/stories/StoryBar';
import StoryViewerModal from '../../components/stories/StoryViewerModal';
import StoryCreatorModal from '../../components/stories/StoryCreatorModal';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { StoryFeedGroup } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useToast } from '../../components/ui/Toast';

export const StoriesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [storyGroups, setStoryGroups] = useState<StoryFeedGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StoryFeedGroup | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/status/feed/');
      setStoryGroups(res.data.results || res.data || []);
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const myGroup = storyGroups.find((g) => g.is_me) || null;
  const contactGroups = storyGroups.filter((g) => !g.is_me);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full custom-scrollbar">
          {/* Page Title & Add Button */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Status & Stories</h1>
              <p className="text-xs text-nova-muted">Share photos, videos, and thoughts that disappear after 24 hours</p>
            </div>

            <Button variant="primary" onClick={() => setIsCreatorOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Post New Status
            </Button>
          </div>

          {/* Story Bar Tray */}
          <div className="mb-8 rounded-2xl overflow-hidden border border-nova-border shadow-lg">
            <StoryBar
              currentUser={user}
              myStories={myGroup}
              stories={contactGroups}
              onOpenMyStory={() => myGroup && setActiveGroup(myGroup)}
              onCreateStory={() => setIsCreatorOpen(true)}
              onSelectStoryGroup={(group) => setActiveGroup(group)}
            />
          </div>

          {/* Recent Updates Grid */}
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Recent Contact Updates
          </h3>

          {loading ? (
            <div className="py-20 text-center text-xs text-nova-muted animate-pulse">
              Loading stories feed...
            </div>
          ) : contactGroups.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 rounded-3xl bg-nova-card border border-nova-border flex items-center justify-center text-nova-muted mx-auto mb-3">
                <Clock className="w-8 h-8 opacity-40" />
              </div>
              <h4 className="text-base font-bold text-white">No active status updates</h4>
              <p className="text-xs text-nova-muted mt-1">When your contacts post a 24-hour status, they will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {contactGroups.map((group) => {
                const latestStatus = group.statuses[group.statuses.length - 1];
                if (!latestStatus) return null;

                return (
                  <div
                    key={group.user.id}
                    onClick={() => setActiveGroup(group)}
                    className="group p-4 bg-nova-card border border-nova-border rounded-3xl cursor-pointer hover:border-nova-primary/50 transition-all shadow-md relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-0.5 rounded-full bg-gradient-to-tr from-nova-primary to-nova-accent">
                        <Avatar src={group.user.avatar_url} alt={group.user.username} size="md" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white truncate">
                          {group.user.first_name || group.user.username}
                        </h4>
                        <span className="text-[10px] text-nova-muted">
                          {new Date(latestStatus.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Preview box */}
                    <div className="h-32 rounded-2xl overflow-hidden bg-nova-dark border border-nova-border/60 flex items-center justify-center relative">
                      {latestStatus.media_type === 'text' ? (
                        <div
                          style={{
                            background:
                              latestStatus.background_color ||
                              'linear-gradient(135deg, #1e3a8a, #06b6d4)',
                          }}
                          className="w-full h-full flex items-center justify-center p-3 text-center"
                        >
                          <p className="text-xs font-bold text-white line-clamp-3">
                            {latestStatus.text_content}
                          </p>
                        </div>
                      ) : (
                        <img
                          src={latestStatus.media_url || ''}
                          alt="Thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {activeGroup && (
        <StoryViewerModal
          group={activeGroup}
          onClose={() => setActiveGroup(null)}
          onReplyToStory={(storyId, reply) => {
            api.post(`/api/status/${storyId}/reply/`, { reply });
          }}
          onReactToStory={(storyId, emoji) => {
            api.post(`/api/status/${storyId}/react/`, { emoji });
          }}
        />
      )}

      {/* Story Creator Modal */}
      <StoryCreatorModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onStoryCreated={loadStories}
      />
    </div>
  );
};

export default StoriesPage;
