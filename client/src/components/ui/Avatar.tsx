import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  status?: 'online' | 'offline' | string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  name = 'User',
  size = 'md',
  isOnline = false,
  showOnlineStatus = false,
  status,
  className
}) => {
  const effectiveOnline = status === 'online' || isOnline;
  const effectiveShowStatus = status !== undefined ? true : showOnlineStatus;
  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  };

  const dotSizeStyles = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-4 h-4 ring-2',
    '2xl': 'w-5 h-5 ring-4',
  };

  // Generate deterministic gradient background based on username initials
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className={clsx("relative inline-flex flex-shrink-0", className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={clsx(
            "rounded-full object-cover border border-nova-border/60",
            sizeStyles[size]
          )}
        />
      ) : (
        <div
          className={clsx(
            "rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-tr from-nova-primary to-nova-accent border border-nova-border/60 shadow-sm",
            sizeStyles[size]
          )}
        >
          {initials}
        </div>
      )}

      {effectiveShowStatus && (
        <span
          className={clsx(
            "absolute bottom-0 right-0 rounded-full ring-nova-card",
            effectiveOnline ? "bg-nova-success" : "bg-slate-500",
            dotSizeStyles[size]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
