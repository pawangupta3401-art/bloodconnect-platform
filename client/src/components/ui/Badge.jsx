import React from 'react';

/**
 * Design System Status / Tag Badge
 * Status: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral'
 */
export function Badge({
  children,
  status = 'primary',
  className = '',
  style = {},
}) {
  const statusStyles = {
    primary: { bg: 'rgba(26, 58, 92, 0.1)', color: 'var(--ds-primary)', border: '1px solid rgba(26, 58, 92, 0.2)' },
    success: { bg: 'rgba(47, 133, 90, 0.1)', color: 'var(--ds-success)', border: '1px solid rgba(47, 133, 90, 0.2)' },
    warning: { bg: 'rgba(192, 86, 33, 0.1)', color: 'var(--ds-warning)', border: '1px solid rgba(192, 86, 33, 0.2)' },
    error: { bg: 'rgba(197, 48, 48, 0.1)', color: 'var(--ds-error)', border: '1px solid rgba(197, 48, 48, 0.2)' },
    info: { bg: 'rgba(43, 108, 176, 0.1)', color: 'var(--ds-info)', border: '1px solid rgba(43, 108, 176, 0.2)' },
    neutral: { bg: 'var(--ds-light-gray)', color: 'var(--ds-slate-gray)', border: '1px solid var(--ds-border-gray)' },
  };

  const currentStyle = statusStyles[status] || statusStyles.primary;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        font: 'var(--ds-text-caption)',
        fontWeight: 600,
        backgroundColor: currentStyle.bg,
        color: currentStyle.color,
        border: currentStyle.border,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
