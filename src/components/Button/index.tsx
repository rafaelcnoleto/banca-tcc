import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark'
  | 'outline-primary'
  | 'outline-secondary'
  | 'outline-success'
  | 'outline-danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'lg';
  icon?: string;
}

export const Button = ({
  label,
  children,
  variant = 'primary',
  size,
  type = 'button',
  icon,
  className = '',
  disabled = false,
  ...rest
}: ButtonProps) => {
  const sizeClass = size ? `btn-${size}` : '';
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}
      disabled={disabled}
      {...rest}
    >
      {icon && <i className={`bi ${icon} me-1`} aria-hidden="true" />}
      {children ?? label}
    </button>
  );
};
