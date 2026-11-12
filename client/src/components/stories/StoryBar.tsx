import React from 'react';
import { Plus } from 'lucide-react';
import { StoryFeedGroup, User } from '../../types';
import Avatar from '../ui/Avatar';

interface StoryBarProps {
  currentUser?: User | null;
  myStories?: StoryFeedGroup | null;
  stories: StoryFeedGroup[];
  onOpenMyStory: () => void;
  onCreateStory: () => void;
  onSelectStoryGroup: (group: StoryFeedGroup) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({
  currentUser,
  myStories,
  stories,
  onOpenMyStory,
  onCreateStory,
  onSelectStoryGroup,
}) => {
  const hasMyStories = Boolean(myStories && myStories.statuses.length > 0);

  return (
    <div className="flex items-center gap-3.5 overflow-x-auto p-3 bg-nova-sidebar border-b border-nova-border no-scrollbar select-none">
      {/* My Story Button */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group">
        <div className="relative">
          <div
            onClick={hasMyStories ? onOpenMyStory : onCreateStory}
            className={`w-14 h-14 rounded-full p-0.5 transition-all ${
              hasMyStories
                ? 'bg-gradient-to-tr from-nova-primary to-nova-accent'
                : 'border border-dashed border-nova-border hover:border-nova-accent'
            }`}
          >
            <div className="w-full h-full rounded-full bg-nova-card overflow-hidden">
              <Avatar
                src={currentUser?.avatar_url}
                alt={currentUser?.username || 'You'}
                size="lg"
                className="w-full h-full"
              />
            </div>
          </div>

          <button
            onClick={onCreateStory}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-nova-primary text-white flex items-center justify-center border-2 border-nova-sidebar shadow-md hover:scale-110 active:scale-95 transition-transform"
            title="Add Status"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
        <span className="text-[11px] font-medium text-slate-300 truncate max-w-[64px]">
          Your Status
        </span>
      </div>

      {/* Friends' Stories */}
      {stories.map((group) => {
        const hasUnviewed = group.has_unviewed;

        return (
          <div
            key={group.user.id}
            onClick={() => onSelectStoryGroup(group)}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
          >
            <div
              className={`w-14 h-14 rounded-full p-0.5 transition-all ${
                hasUnviewed
                  ? 'bg-gradient-to-tr from-nova-primary via-blue-500 to-nova-accent shadow-md shadow-blue-500/20'
                  : 'bg-nova-border group-hover:bg-slate-600'
              }`}
            >
              <div className="w-full h-full rounded-full bg-nova-card p-0.5 overflow-hidden">
                <Avatar
                  src={group.user.avatar_url}
                  alt={group.user.username}
                  size="lg"
                  className="w-full h-full"
                />
              </div>
            </div>
            <span
              className={`text-[11px] truncate max-w-[64px] ${
                hasUnviewed ? 'font-semibold text-white' : 'text-nova-muted group-hover:text-slate-300'
              }`}
            >
              {group.user.first_name || group.user.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoryBar;
