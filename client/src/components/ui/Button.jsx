import React from 'react';

/**
 * Design System Button
 * Variants: 'primary' | 'secondary' | 'ghost' | 'disabled'
 */
export function Button({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  type = 'button',
  icon: Icon,
  className = '',
  style = {},
  ...props
}) {
  const getVariantClass = () => {
    if (disabled || variant === 'disabled') return 'ds-btn ds-disabled';
    if (variant === 'secondary') return 'ds-btn ds-btn-secondary';
    if (variant === 'ghost' || variant === 'tertiary') return 'ds-btn ds-btn-ghost';
    return 'ds-btn ds-btn-primary';
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${getVariantClass()} ${className}`}
      style={style}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  );
}

export default Button;
