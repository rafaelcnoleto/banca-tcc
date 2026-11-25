import type { ReactNode } from 'react';

export interface ModalProps {
  show: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  children: ReactNode;
}

export const Modal = ({
  show,
  title,
  onClose,
  footer,
  size,
  children,
}: ModalProps) => {
  if (!show) return null;

  const dialogSize = size ? `modal-${size}` : '';

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${dialogSize}`}>
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">{title}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Fechar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
};
