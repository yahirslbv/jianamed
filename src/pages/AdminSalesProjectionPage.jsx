import { useCallback, useEffect, useState } from 'react';
import { getSalesPeriods, refreshSalesPeriods } from '../services/salesPeriodService.js';
import styles from '../styles/App.module.css';

const TABS = [
  { type: 'DAILY', label: 'Diario' },
  { type: 'WEEKLY', label: 'Semanal' },
  { type: 'MONTHLY', label: 'Mensual' },
  { type: 'ANNUAL', label: 'Anual' },
];

function fmxn(cents) {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function Pct({ value }) {
  if (value === null || value === undefined) return <span className={styles.salesMuted}>—</span>;
  const sign = value > 0 ? '+' : '';
  return (
    <span className={value > 0 ? styles.trendUp : value < 0 ? styles.trendDown : styles.salesMuted}>
      {sign}{value}%
    </span>
  );
}

function MetricCards({ period }) {
  return (
    <div className={styles.salesMetricGrid}>
      <article>
        <span>Ingresos</span>
        <strong>{fmxn(period.revenueCents)}</strong>
        <small>Proyección: {fmxn(period.projectedRevenueCents)}</small>
        {period.vsLast && (
          <small><Pct value={period.vsLast.revenuePct} /> vs período anterior</small>
        )}
      </article>
      <article>
        <span>Pedidos surtidos</span>
        <strong>{period.orderCount.toLocaleString('es-MX')}</strong>
        <small>Proyección: {period.projectedOrderCount.toLocaleString('es-MX')}</small>
        {period.vsLast && (
          <small><Pct value={period.vsLast.orderCountPct} /> vs período anterior</small>
        )}
      </article>
      <article>
        <span>Unidades vendidas</span>
        <strong>{period.unitsSold.toLocaleString('es-MX')}</strong>
        <small>Proyección: {period.projectedUnitsSold.toLocaleString('es-MX')}</small>
        {period.vsLast && (
          <small><Pct value={period.vsLast.unitsSoldPct} /> vs período anterior</small>
        )}
      </article>
    </div>
  );
}

export default function AdminSalesProjectionPage() {
  const [activeType, setActiveType] = useState('MONTHLY');
  const [periods, setPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (type) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getSalesPeriods(type, 13);
      setPeriods(data.periods || []);
    } catch (err) {
      setError(err.message || 'No fue posible cargar los períodos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(activeType); }, [activeType, load]);

  const handleTabChange = (type) => {
    setActiveType(type);
    setPeriods([]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      await refreshSalesPeriods();
      await load(activeType);
    } catch (err) {
      setError(err.message || 'No fue posible actualizar los períodos.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const current = periods[0] || null;
  const history = periods.slice(1);

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Administración</p>
          <h1>Proyección de ventas</h1>
          <p>
            Basado en pedidos con estado Surtido. La proyección del período actual usa el ritmo de ventas
            del período en curso; los períodos anteriores usan el promedio histórico.
          </p>
        </div>
        <div>
          <button
            className={styles.primarySmall}
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? 'Calculando...' : 'Actualizar datos'}
          </button>
        </div>
      </div>

      <div className={styles.salesTabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            className={activeType === tab.type ? styles.salesTabActive : styles.salesTab}
            onClick={() => handleTabChange(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.formError} role="alert" style={{ maxWidth: '1240px', margin: '0 auto 16px' }}>
          {error}
        </p>
      )}

      {isLoading ? (
        <div className={styles.emptyState}>
          <h2>Cargando períodos...</h2>
          <p>Consultando el historial de pedidos.</p>
        </div>
      ) : !periods.length ? (
        <div className={styles.emptyState}>
          <h2>Sin datos disponibles</h2>
          <p>
            Presiona "Actualizar datos" para calcular los períodos desde el historial de pedidos surtidos.
          </p>
          <button className={styles.primarySmall} type="button" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Calculando...' : 'Actualizar datos'}
          </button>
        </div>
      ) : (
        <>
          {current && (
            <div className={styles.salesCurrentSection}>
              <h2 className={styles.salesSectionTitle}>Período actual — {current.label}</h2>
              <MetricCards period={current} />
            </div>
          )}

          {history.length > 0 && (
            <div className={styles.salesHistorySection}>
              <h2 className={styles.salesSectionTitle}>Historial</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Ingresos</th>
                      <th>Proyección</th>
                      <th>Pedidos</th>
                      <th>Proyección</th>
                      <th>Unidades</th>
                      <th>Proyección</th>
                      <th>Ref. vs ant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((p) => (
                      <tr key={p.id}>
                        <td>{p.label}</td>
                        <td>{fmxn(p.revenueCents)}</td>
                        <td>{fmxn(p.projectedRevenueCents)}</td>
                        <td>{p.orderCount.toLocaleString('es-MX')}</td>
                        <td>{p.projectedOrderCount.toLocaleString('es-MX')}</td>
                        <td>{p.unitsSold.toLocaleString('es-MX')}</td>
                        <td>{p.projectedUnitsSold.toLocaleString('es-MX')}</td>
                        <td><Pct value={p.vsLast?.revenuePct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
