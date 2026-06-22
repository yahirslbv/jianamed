import styles from '../styles/App.module.css';

export default function StatusBadge({ children, tone = 'neutral' }) {
  const className = {
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    info: styles.badgeInfo,
    neutral: styles.badgeNeutral,
  }[tone] || styles.badgeNeutral;

  return <span className={`${styles.statusBadge} ${className}`}>{children}</span>;
}
