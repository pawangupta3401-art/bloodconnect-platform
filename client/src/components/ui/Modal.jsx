import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Design System Modal
 * Backdrop rgba(0,0,0,0.5), white container, 8px radius, max-width 480px / 720px (large)
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'standard', // 'standard' (480px) | 'large' (720px)
  footer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ds-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`ds-modal ${size === 'large' ? 'ds-modal-lg' : ''}`}>
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
          <h3 style={{ font: 'var(--ds-text-h3)', color: 'var(--ds-charcoal)', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-slate-gray)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ font: 'var(--ds-text-body)', color: 'var(--ds-dark-gray)' }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--ds-border-gray)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
