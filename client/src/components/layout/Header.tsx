import React from 'react';
import { Search, Bell, Sparkles, Shield, Wifi } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  currentUser?: User | null;
  onSearchClick?: () => void;
  rightContent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'ChatNova',
  subtitle,
  currentUser,
  onSearchClick,
  rightContent
}) => {
  return (
    <header className="h-16 border-b border-nova-border bg-nova-card/60 backdrop-blur-md px-6 flex items-center justify-between select-none flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-nova-text flex items-center gap-2">
            {title}
            {currentUser?.is_verified && (
              <Shield className="w-3.5 h-3.5 text-nova-primary" />
            )}
          </h1>
          {subtitle && (
            <p className="text-xs text-nova-muted">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {rightContent}

        {/* Global Search trigger */}
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="p-2 rounded-xl text-nova-muted hover:text-nova-text hover:bg-nova-border/60 transition-colors"
            title="Search messages and contacts"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Connection status badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Connected</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
