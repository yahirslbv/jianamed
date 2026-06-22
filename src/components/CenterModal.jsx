import { useEffect, useId, useRef } from 'react';
import styles from '../styles/App.module.css';

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export default function CenterModal({ open, title, onClose, children, size = 'wide' }) {
  const titleId = useId();
  const modalRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    triggerRef.current = document.activeElement;
    const modal = modalRef.current;
    const focusable = getFocusableElements(modal);
    (focusable[0] || modal).focus();
    document.body.classList.add('modal-open');

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusableElements(modal);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
      triggerRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.centerModalOverlay} role="presentation">
      <section
        className={`${styles.centerModal} ${size === 'detail' ? styles.centerModalDetail : ''}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex="-1"
      >
        <header className={styles.centerModalHeader}>
          <h2 id={titleId}>{title}</h2>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Cerrar ventana">Cerrar</button>
        </header>
        <div className={styles.centerModalBody}>{children}</div>
      </section>
    </div>
  );
}
