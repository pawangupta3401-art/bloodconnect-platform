import React from 'react';

/**
 * Design System Card
 * White background, 8px radius, Level 1 elevation shadow, 24px padding
 */
export function Card({
  children,
  title,
  subtitle,
  headerAction,
  className = '',
  style = {},
  ...props
}) {
  return (
    <div className={`ds-card ${className}`} style={style} {...props}>
      {(title || subtitle || headerAction) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--ds-border-gray)',
          }}
        >
          <div>
            {title && (
              <h3 style={{ font: 'var(--ds-text-h3)', color: 'var(--ds-charcoal)', margin: 0 }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ font: 'var(--ds-text-body-sm)', color: 'var(--ds-slate-gray)', margin: '4px 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
