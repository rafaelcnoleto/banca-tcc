import type { ReactNode } from 'react';

export type AlertVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

export const Alert = ({
  variant = 'info',
  title,
  onClose,
  className = '',
  children,
}: AlertProps) => {
  return (
    <div
      className={`alert alert-${variant} ${onClose ? 'alert-dismissible' : ''} ${className}`.trim()}
      role="alert"
    >
      {title && <div className="fw-bold mb-1">{title}</div>}
      <div>{children}</div>
      {onClose && (
        <button
          type="button"
          className="btn-close"
          aria-label="Fechar"
          onClick={onClose}
        />
      )}
    </div>
  );
};
