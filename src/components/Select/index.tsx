import type { ChangeEvent } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id: string;
  name?: string;
  label: string;
  value: string | number;
  onChange: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const Select = ({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error,
  required = false,
}: SelectProps) => {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label fw-medium">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      <select
        id={id}
        name={name ?? id}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, e)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
};
