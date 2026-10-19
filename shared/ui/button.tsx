import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

const variants = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  secondary: 'bg-surface text-fg border border-border hover:bg-bg',
  danger: 'bg-danger text-primary-fg hover:opacity-90',
  ghost: 'text-fg hover:bg-bg',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

type ButtonStyle = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

/** Button styling for elements that are not buttons, such as links. */
export function buttonClassName({ variant = 'primary', size = 'md', className }: ButtonStyle = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyle & {
    loading?: boolean;
  };

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
