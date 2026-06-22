import styles from '../styles/App.module.css';

export default function ToastMessage({ message, tone = 'success', onClose }) {
  if (!message) return null;
  return (
    <div className={`${styles.toastMessage} ${tone === 'error' ? styles.toastError : ''}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar mensaje">Cerrar</button>
    </div>
  );
}
