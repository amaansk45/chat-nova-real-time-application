import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare, CircleDot, PhoneCall, Bot,
  Users, StickyNote, Settings, ShieldCheck, LogOut
} from 'lucide-react';
import { clsx } from 'clsx';
import { Avatar } from '../ui/Avatar';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export interface SidebarProps {
  currentUser?: User | null;
  unreadMessagesTotal?: number;
  missedCallsTotal?: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser: propUser,
  unreadMessagesTotal = 0,
  missedCallsTotal = 0,
  onLogout
}) => {
  const { user: authUser, logout } = useAuth();
  const currentUser = propUser !== undefined ? propUser : authUser;
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    else logout();
  };

  const navItems = [
    { to: '/chat', icon: MessageSquare, label: 'Chats', badge: unreadMessagesTotal },
    { to: '/stories', icon: CircleDot, label: 'Stories' },
    { to: '/calls', icon: PhoneCall, label: 'Calls', badge: missedCallsTotal },
    { to: '/ai', icon: Bot, label: 'Nova AI' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/notes', icon: StickyNote, label: 'Notes' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (currentUser?.is_staff) {
    navItems.push({ to: '/admin', icon: ShieldCheck, label: 'Admin' });
  }

  return (
    <aside className="w-18 md:w-20 bg-nova-sidebar border-r border-nova-border flex flex-col items-center py-5 justify-between select-none z-20 flex-shrink-0">
      {/* Brand Logo */}
      <div className="flex flex-col items-center gap-4">
        <NavLink to="/chat" className="relative group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-nova-primary to-nova-accent p-0.5 shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-nova-dark rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black bg-gradient-to-tr from-nova-primary to-nova-accent bg-clip-text text-transparent">
                N
              </span>
            </div>
          </div>
        </NavLink>

        {/* Primary Navigation Icons */}
        <nav className="flex flex-col items-center gap-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  clsx(
                    "relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group",
                    isActive
                      ? "bg-nova-primary text-white shadow-lg shadow-blue-500/30"
                      : "text-nova-muted hover:text-nova-text hover:bg-nova-card"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-nova-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-nova-sidebar shadow-sm">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-nova-card border border-nova-border text-nova-text text-xs rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Avatar & Logout */}
      <div className="flex flex-col items-center gap-3">
        <NavLink to="/profile" title="My Profile" className="group">
          <Avatar
            src={currentUser?.avatar_url}
            name={currentUser?.username}
            size="md"
            isOnline={true}
            showOnlineStatus={true}
            className="group-hover:ring-2 ring-nova-primary transition-all cursor-pointer"
          />
        </NavLink>

        <button
          onClick={handleLogout}
          title="Log Out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-nova-muted hover:text-nova-error hover:bg-nova-card transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
