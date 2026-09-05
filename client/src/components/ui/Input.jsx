import React from 'react';

/**
 * Design System Input Field
 * Features: Label, helper text, error state, clean 6px radius, #E2E8F0 border
 */
export function Input({
  label,
  error,
  helperText,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  style = {},
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            font: 'var(--ds-text-body-sm)',
            fontWeight: 600,
            color: 'var(--ds-charcoal)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`ds-input ${error ? 'ds-error' : ''} ${className}`}
        style={style}
        {...props}
      />
      {error && (
        <span style={{ color: 'var(--ds-error)', font: 'var(--ds-text-caption)' }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span style={{ color: 'var(--ds-slate-gray)', font: 'var(--ds-text-caption)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
}

export default Input;
