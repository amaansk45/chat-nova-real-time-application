import React, { useState } from 'react';
import Sidebar from '../layout/Sidebar';

interface ChatLayoutProps {
  children: React.ReactNode;
  conversationList: React.ReactNode;
  rightPane?: React.ReactNode;
  showRightPane?: boolean;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  conversationList,
  rightPane,
  showRightPane = false,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nova-dark text-slate-100 antialiased selection:bg-nova-primary selection:text-white">
      {/* 1. Main Icon Navigation Sidebar */}
      <Sidebar />

      {/* 2. Middle Column: Conversations List */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-nova-border bg-nova-sidebar z-10">
        {conversationList}
      </div>

      {/* 3. Main Chat Viewport */}
      <div className="flex-1 flex flex-col h-full bg-nova-dark overflow-hidden relative">
        {children}
      </div>

      {/* 4. Optional Right-Side Info/Media Pane */}
      {showRightPane && rightPane && (
        <div className="hidden xl:block w-80 lg:w-96 flex-shrink-0 h-full border-l border-nova-border bg-nova-sidebar animate-in slide-in-from-right duration-200 z-10">
          {rightPane}
        </div>
      )}
    </div>
  );
};

export default ChatLayout;
