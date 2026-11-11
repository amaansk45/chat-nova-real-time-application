import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-nova-primary/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variantStyles = {
    primary: "bg-nova-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30",
    secondary: "bg-nova-card hover:bg-nova-border text-nova-text border border-nova-border hover:border-slate-600",
    accent: "bg-nova-accent hover:bg-cyan-500 text-nova-dark font-semibold shadow-lg shadow-cyan-500/20",
    danger: "bg-nova-error hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
    ghost: "bg-transparent hover:bg-nova-card text-nova-muted hover:text-nova-text",
    outline: "bg-transparent border border-nova-primary text-nova-primary hover:bg-nova-primary/10",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3 gap-2.5",
    icon: "p-2.5 w-10 h-10",
  };

  return (
    <button
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {size !== 'icon' && <span>Loading...</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
