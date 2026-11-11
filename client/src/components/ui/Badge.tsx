import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className
}) => {
  const variantStyles = {
    primary: 'bg-nova-primary/20 text-blue-400 border border-nova-primary/30',
    accent: 'bg-nova-accent/20 text-cyan-400 border border-nova-accent/30',
    success: 'bg-nova-success/20 text-green-400 border border-nova-success/30',
    danger: 'bg-nova-error/20 text-red-400 border border-nova-error/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    muted: 'bg-nova-border/50 text-nova-muted border border-nova-border',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium rounded-md',
    md: 'text-xs px-2.5 py-1 font-semibold rounded-lg',
  };

  return (
    <span className={clsx("inline-flex items-center gap-1 select-none", variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </span>
  );
};

export default Badge;
