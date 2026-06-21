import { useMemo, useState } from 'react';
import BranchCard from './BranchCard.jsx';
import { branches as defaultBranches } from '../data/branches.js';
import styles from '../styles/App.module.css';

export default function BranchesSection({ branches = defaultBranches }) {
  const [locationFilter, setLocationFilter] = useState('');

  const locations = useMemo(
    () =>
      Array.from(new Set(branches.flatMap((branch) => [branch.state, branch.city]))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [branches],
  );

  const visibleBranches = branches.filter(
    (branch) => !locationFilter || branch.state === locationFilter || branch.city === locationFilter,
  );

  return (
    <section className={`${styles.section} ${styles.softSection}`} id="sucursales">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Atención cercana</p>
        <h2>Sucursales</h2>
        <p>Consulta dirección, horario y canales de contacto de la distribuidora.</p>
      </div>

      <div className={styles.branchToolbar}>
        <label>
          Filtrar por estado o ciudad
          <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
            <option value="">Todas las ubicaciones</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.branchGrid}>
        {visibleBranches.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}
      </div>
    </section>
  );
}
