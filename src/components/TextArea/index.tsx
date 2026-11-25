import type { ChangeEvent } from 'react';

export interface TextAreaProps {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const TextArea = ({
  id,
  name,
  label,
  value,
  onChange,
  rows = 3,
  placeholder = '',
  disabled = false,
  error,
  required = false,
}: TextAreaProps) => {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label fw-medium">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      <textarea
        id={id}
        name={name ?? id}
        rows={rows}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, e)}
      />
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
};
