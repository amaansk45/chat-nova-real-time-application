import React, { useState, useMemo } from 'react';
import { Search, Plus, MessageSquarePlus, Users, Archive, Filter } from 'lucide-react';
import { Conversation } from '../../types';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  typingMap?: Record<string, string>; // conversationId -> typing username
}

type FilterTab = 'all' | 'direct' | 'groups' | 'unread' | 'archived';

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onNewGroup,
  typingMap = {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (activeTab === 'archived') {
        if (!c.is_archived) return false;
      } else {
        if (c.is_archived) return false; // Hide archived from normal tabs
        if (activeTab === 'direct' && c.type !== 'direct') return false;
        if (activeTab === 'groups' && c.type !== 'group') return false;
        if (activeTab === 'unread' && c.unread_count === 0) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = c.display_title.toLowerCase().includes(query);
        const matchesLastMsg = c.last_message?.content.toLowerCase().includes(query);
        return matchesTitle || matchesLastMsg;
      }

      return true;
    });
  }, [conversations, activeTab, searchQuery]);

  const pinnedConversations = useMemo(() => {
    return filteredConversations.filter((c) => c.is_pinned);
  }, [filteredConversations]);

  const unpinnedConversations = useMemo(() => {
    return filteredConversations.filter((c) => !c.is_pinned);
  }, [filteredConversations]);

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'direct', label: 'Direct' },
    { key: 'groups', label: 'Groups' },
    {
      key: 'unread',
      label: 'Unread',
      count: conversations.filter((c) => !c.is_archived && c.unread_count > 0).length,
    },
    {
      key: 'archived',
      label: 'Archived',
      count: conversations.filter((c) => c.is_archived).length,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-nova-sidebar border-r border-nova-border select-none">
      {/* Top Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-card transition-colors"
              title="New Direct Message"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>
            <button
              onClick={onNewGroup}
              className="p-2 rounded-xl text-nova-muted hover:text-white hover:bg-nova-card transition-colors"
              title="New Group Chat"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-nova-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-nova-dark border border-nova-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-nova-muted focus:outline-none focus:border-nova-primary focus:ring-1 focus:ring-nova-primary transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-nova-primary text-white shadow-sm shadow-blue-500/20'
                  : 'bg-nova-dark text-nova-muted hover:text-white hover:bg-nova-card'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-nova-primary/20 text-nova-accent'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Item List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-nova-card flex items-center justify-center text-nova-muted mb-3 border border-nova-border">
              <Archive className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No conversations found</p>
            <p className="text-xs text-nova-muted mt-1">
              {searchQuery ? 'Try searching a different name' : 'Start a new conversation to connect'}
            </p>
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedConversations.length > 0 && (
              <div className="pt-2 pb-1">
                <span className="text-[11px] font-semibold text-nova-muted uppercase tracking-wider px-2">
                  Pinned Chats
                </span>
                <div className="mt-1 space-y-1">
                  {pinnedConversations.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conversation={c}
                      isSelected={selectedId === c.id}
                      isTyping={Boolean(typingMap[c.id])}
                      typingUser={typingMap[c.id]}
                      onClick={() => onSelect(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All / Unpinned Section */}
            {unpinnedConversations.length > 0 && (
              <div className="pt-2 pb-1">
                {pinnedConversations.length > 0 && (
                  <span className="text-[11px] font-semibold text-nova-muted uppercase tracking-wider px-2">
                    All Messages
                  </span>
                )}
                <div className="mt-1 space-y-1">
                  {unpinnedConversations.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conversation={c}
                      isSelected={selectedId === c.id}
                      isTyping={Boolean(typingMap[c.id])}
                      typingUser={typingMap[c.id]}
                      onClick={() => onSelect(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
