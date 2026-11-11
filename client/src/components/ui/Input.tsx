import React from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  rightElement,
  className,
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-nova-muted">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-nova-muted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            "w-full bg-nova-dark/80 text-nova-text placeholder:text-nova-muted/50 rounded-xl border border-nova-border px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:border-nova-primary focus:ring-1 focus:ring-nova-primary/50",
            icon && "pl-10",
            rightElement && "pr-10",
            error && "border-nova-error focus:border-nova-error focus:ring-nova-error/50",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs text-nova-error font-medium">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
