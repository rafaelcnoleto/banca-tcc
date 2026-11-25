import type { ChangeEvent } from 'react';

export interface InputProps {
  id: string;
  name?: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'datetime-local' | 'time' | 'url';
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  required?: boolean;
  helpText?: string;
}

export const Input = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  disabled = false,
  error,
  min,
  max,
  step,
  required = false,
  helpText,
}: InputProps) => {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label fw-medium">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      <input
        id={id}
        name={name ?? id}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value, e)}
      />
      {helpText && !error && <div className="form-text">{helpText}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
};
