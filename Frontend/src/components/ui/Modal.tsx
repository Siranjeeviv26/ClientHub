import React, { Fragment, useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  const modalContent = (
    <div className="modal-overlay" onClick={closeOnOverlayClick ? onClose : undefined} role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined} aria-describedby={description ? 'modal-description' : undefined}>
      <div className={clsx('modal', sizeClasses[size])} onClick={(e) => e.stopPropagation()}>
        {(title || description || showCloseButton) && (
          <div className="modal-header">
            <div>
              {title && <h2 id="modal-title" className="text-lg font-semibold text-gray-900">{title}</h2>}
              {description && <p id="modal-description" className="mt-1 text-sm text-gray-500">{description}</p>}
            </div>
            {showCloseButton && (
              <button onClick={onClose} className="btn-ghost p-1 rounded-lg hover:bg-gray-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}