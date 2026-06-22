import { useEffect, useId, useRef } from 'react';
import styles from '../styles/App.module.css';

function getFocusableElements(container) {
  return Array.from(
    container?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || [],
  );
}

export default function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    triggerRef.current = document.activeElement;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.confirmOverlay} role="presentation" onMouseDown={onClose}>
      <section className={styles.confirmDialog} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
        <div className={styles.confirmActions}>
          <button className={styles.secondarySmall} type="button" ref={cancelRef} onClick={onClose}>Cancelar</button>
          <button className={styles.dangerSmall} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
