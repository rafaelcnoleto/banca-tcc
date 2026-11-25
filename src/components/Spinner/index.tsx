export interface SpinnerProps {
  label?: string;
  size?: 'sm' | 'md';
}

export const Spinner = ({ label = 'Carregando...', size = 'md' }: SpinnerProps) => {
  const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-4 text-muted">
      <div className={`spinner-border text-primary ${sizeClass}`} role="status">
        <span className="visually-hidden">{label}</span>
      </div>
      <span className="small fw-medium">{label}</span>
    </div>
  );
};
