import { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/reportService.js';
import styles from '../styles/App.module.css';

const formatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

function summarizeDetails(value) {
  try {
    const details = JSON.parse(value || '{}');
    return Object.entries(details).slice(0, 3).map(([key, item]) => `${key}: ${typeof item === 'object' ? '...' : item}`).join(' | ');
  } catch {
    return value || 'Sin detalles';
  }
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAuditLogs().then(setLogs).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false));
  }, []);

  return <section className={`${styles.section} ${styles.softSection}`}><div className={styles.privateHeader}><div><p className={styles.eyebrow}>Administracion</p><h1>Auditoria</h1><p>Actividad reciente de productos, ofertas, pedidos y exportaciones.</p></div></div>{error ? <div className={styles.emptyState}><p>{error}</p></div> : isLoading ? <div className={styles.emptyState}><p>Cargando bitacora...</p></div> : <div className={styles.tableWrapper}><table className={styles.reportTable}><thead><tr><th>Fecha</th><th>Usuario</th><th>Accion</th><th>Entidad</th><th>Detalles</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{formatter.format(new Date(log.createdAt))}</td><td>{log.user?.email || 'Sistema'}</td><td>{log.action}</td><td>{log.entity}</td><td>{summarizeDetails(log.details)}</td></tr>)}</tbody></table></div>}</section>;
}
