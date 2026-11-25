import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { formatarBytes } from '../../models';

export interface FileInputProps {
  id: string;
  label?: string;
  accept?: string;
  file?: File | null;
  onChange: (file: File | null, event?: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  helperText?: string;
}

export const FileInput = ({
  id,
  label,
  accept = 'application/pdf',
  file = null,
  onChange,
  error,
  disabled = false,
  helperText = 'ou clique para selecionar · somente .pdf · máx. 20 MB',
}: FileInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selecionado = e.target.files?.[0] ?? null;
    onChange(selecionado, e);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    onChange(dropped);
  };

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="form-label fw-medium">
          {label}
        </label>
      )}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`btcc-dropzone ${dragging ? 'btcc-dropzone-active' : ''} ${
          error ? 'btcc-dropzone-error' : ''
        }`}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <i className="bi bi-cloud-arrow-up fs-1 text-primary d-block mb-2" aria-hidden="true" />
        <div className="fw-semibold text-dark">Arraste o PDF aqui</div>
        <div className="small text-muted">{helperText}</div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className={`form-control d-none ${error ? 'is-invalid' : ''}`}
          disabled={disabled}
          onChange={handleFileChange}
        />
      </div>

      {file && (
        <div className="border rounded-3 p-2 mt-2 bg-white d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2 min-w-0">
            <i className="bi bi-file-earmark-pdf-fill text-danger fs-4" aria-hidden="true" />
            <div className="text-truncate">
              <div className="fw-semibold small text-truncate">{file.name}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                {formatarBytes(file.size)} · Pronto para envio
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = '';
              onChange(null);
            }}
            disabled={disabled}
          >
            Remover
          </button>
        </div>
      )}

      {error && <div className="invalid-feedback d-block mt-1">{error}</div>}
    </div>
  );
};
