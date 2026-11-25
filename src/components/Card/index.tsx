import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const Card = ({
  title,
  subtitle,
  headerRight,
  footer,
  className = '',
  children,
}: CardProps) => {
  return (
    <div className={`card btcc-card ${className}`.trim()}>
      <div className="card-body">
        {(title || subtitle || headerRight) && (
          <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div>
              {title && <h2 className="h6 fw-bold mb-0">{title}</h2>}
              {subtitle && <div className="small text-muted mt-1">{subtitle}</div>}
            </div>
            {headerRight && <div>{headerRight}</div>}
          </div>
        )}
        {children}
      </div>
      {footer && <div className="card-footer bg-transparent border-top">{footer}</div>}
    </div>
  );
};
