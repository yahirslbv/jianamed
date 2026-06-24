import { useEffect, useMemo, useState } from 'react';
import CenterModal from '../components/CenterModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ToastMessage from '../components/ToastMessage.jsx';
import {
  createInternalUser,
  getInternalUsers,
  resetInternalUserPassword,
  updateInternalUser,
  updateInternalUserRole,
  updateInternalUserStatus,
} from '../services/userService.js';
import styles from '../styles/App.module.css';

const roles = ['ADMIN', 'SALES', 'SUPERVISOR'];
const roleLabels = { ADMIN: 'Administrador', SALES: 'Vendedor', SUPERVISOR: 'Supervisor' };
const emptyUser = { name: '', email: '', role: 'SALES', password: '', isActive: true };

function formValues(user) {
  return user ? { name: user.name, email: user.email, role: user.role, password: '', isActive: user.isActive } : emptyUser;
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

function makeTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [metric, setMetric] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      setUsers(await getInternalUsers());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const metrics = useMemo(() => ({
    ADMIN: users.filter((user) => user.role === 'ADMIN').length,
    SALES: users.filter((user) => user.role === 'SALES').length,
    SUPERVISOR: users.filter((user) => user.role === 'SUPERVISOR').length,
    INACTIVE: users.filter((user) => !user.isActive).length,
  }), [users]);

  const visibleUsers = useMemo(() => users.filter((user) => {
    const searchable = [user.name, user.email, roleLabels[user.role]]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? user.isActive : !user.isActive);
    const matchesMetric = !metric || (metric === 'INACTIVE' ? !user.isActive : user.role === metric);
    return searchable && matchesRole && matchesStatus && matchesMetric;
  }), [metric, query, roleFilter, statusFilter, users]);

  const replaceUser = (updated) => {
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const openCreate = () => {
    setError('');
    setForm(emptyUser);
    setModal({ kind: 'form' });
  };

  const openEdit = (user) => {
    setError('');
    setForm(formValues(user));
    setModal({ kind: 'form', user });
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      setError('Nombre, correo y rol son obligatorios.');
      return;
    }
    if (!modal.user && form.password.length < 8) {
      setError('La contraseña temporal debe tener al menos 8 caracteres.');
      return;
    }

    try {
      const saved = modal.user
        ? await updateInternalUser(modal.user.id, form)
        : await createInternalUser(form);
      setUsers((current) => modal.user ? current.map((user) => user.id === saved.id ? saved : user) : [saved, ...current]);
      setModal(null);
      setError('');
      setToast(modal.user ? 'Usuario interno actualizado' : 'Usuario interno creado');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const changeStatus = async (user) => {
    try {
      const updated = await updateInternalUserStatus(user.id, !user.isActive);
      replaceUser(updated);
      setToast('Estado del usuario actualizado');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveRole = async (event) => {
    event.preventDefault();
    try {
      const updated = await updateInternalUserRole(modal.user.id, form.role);
      replaceUser(updated);
      setModal(null);
      setToast('Rol del usuario actualizado');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (form.password.length < 8) {
      setError('La contraseña temporal debe tener al menos 8 caracteres.');
      return;
    }
    try {
      await resetInternalUserPassword(modal.user.id, form.password);
      setModal(null);
      setError('');
      setToast('Contraseña restablecida y sesiones anteriores revocadas');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const toggleMetric = (nextMetric) => setMetric((current) => current === nextMetric ? '' : nextMetric);
  const clearFilters = () => { setQuery(''); setRoleFilter(''); setStatusFilter(''); setMetric(''); };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.adminPageHeader}>
        <div>
          <p className={styles.eyebrow}>Administración</p>
          <h1>Cuentas internas</h1>
          <p>Gestiona usuarios administrativos, vendedores y supervisores.</p>
        </div>
        <div className={styles.adminHeaderActions}>
          <button className={styles.secondaryButton} type="button" onClick={load}>Actualizar</button>
          <button className={styles.primaryButton} type="button" onClick={openCreate}>Nuevo usuario</button>
        </div>
      </div>

      <div className={styles.metricGrid}>
        {[
          ['ADMIN', 'Administradores'],
          ['SALES', 'Vendedores'],
          ['SUPERVISOR', 'Supervisores'],
          ['INACTIVE', 'Inactivos'],
        ].map(([key, label]) => (
          <button key={key} type="button" className={metric === key ? styles.metricCardActive : ''} onClick={() => toggleMetric(key)}>
            <span>{label}</span><strong>{metrics[key]}</strong><small>Filtrar usuarios</small>
          </button>
        ))}
      </div>

      <div className={styles.adminToolbar}>
        <label className={styles.adminSearch}>
          <span className={styles.srOnly}>Buscar usuarios</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, correo o rol" />
        </label>
        <label>
          <span className={styles.srOnly}>Filtrar por rol</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">Todos los roles</option>
            {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>
        <label>
          <span className={styles.srOnly}>Filtrar por estado</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
        {(query || roleFilter || statusFilter || metric) && <button className={styles.textButton} type="button" onClick={clearFilters}>Limpiar filtros</button>}
      </div>

      {error && <p className={styles.formError} role="alert">{error}</p>}
      <div className={styles.tableWrapper}>
        <table className={styles.adminDataTable}>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td><StatusBadge tone={user.role === 'ADMIN' ? 'info' : 'neutral'}>{roleLabels[user.role] || user.role}</StatusBadge></td>
                <td><StatusBadge tone={user.isActive ? 'success' : 'neutral'}>{user.isActive ? 'Activo' : 'Inactivo'}</StatusBadge></td>
                <td>{formatDate(user.createdAt)}</td>
                <td className={styles.actionsCell}>
                  <div className={styles.actionButtonsGroup}>
                    <button className={styles.actionButtonView} type="button" onClick={() => openEdit(user)}>Ver / editar</button>
                    <button className={styles.actionButtonEdit} type="button" onClick={() => { setError(''); setForm(formValues(user)); setModal({ kind: 'role', user }); }}>Cambiar rol</button>
                    <button className={user.isActive ? styles.actionButtonDeactivate : styles.actionButtonActivate} type="button" onClick={() => changeStatus(user)}>{user.isActive ? 'Desactivar' : 'Activar'}</button>
                    <button className={styles.actionButtonEdit} type="button" onClick={() => { setError(''); setForm({ ...formValues(user), password: '' }); setModal({ kind: 'password', user }); }}>Restablecer contraseña</button>
                  </div>
                </td>
              </tr>
            ))}
            {!visibleUsers.length && <tr><td colSpan="6">No hay usuarios internos que coincidan con los filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      <CenterModal open={modal?.kind === 'form'} title={modal?.user ? 'Editar usuario interno' : 'Nuevo usuario interno'} onClose={() => setModal(null)}>
        <form className={styles.singleForm} onSubmit={saveUser}>
          <div className={styles.wizardGrid}>
            <label>Nombre<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
            <label>Correo<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label>Rol<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
            {!modal?.user && <div className={styles.passwordField}><label>Contraseña temporal<input type="text" value={form.password} autoComplete="new-password" minLength="8" onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></label><button className={styles.textButton} type="button" onClick={() => setForm((current) => ({ ...current, password: makeTemporaryPassword() }))}>Generar temporal</button></div>}
            <fieldset className={styles.wizardFull}><legend>Estado de acceso</legend><label><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Usuario activo</label></fieldset>
          </div>
          <div className={styles.singleFormActions}><button className={styles.secondarySmall} type="button" onClick={() => setModal(null)}>Cancelar</button><button className={styles.primaryButton} type="submit">Guardar usuario</button></div>
        </form>
      </CenterModal>

      <CenterModal open={modal?.kind === 'role'} title="Cambiar rol" onClose={() => setModal(null)} size="detail">
        <form className={styles.singleForm} onSubmit={saveRole}>
          <p>Actualiza el rol de <strong>{modal?.user?.name}</strong>. Los permisos actuales siguen reservados para ADMIN.</p>
          <label>Rol<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <div className={styles.singleFormActions}><button className={styles.secondarySmall} type="button" onClick={() => setModal(null)}>Cancelar</button><button className={styles.primaryButton} type="submit">Guardar rol</button></div>
        </form>
      </CenterModal>

      <CenterModal open={modal?.kind === 'password'} title="Restablecer contraseña" onClose={() => setModal(null)} size="detail">
        <form className={styles.singleForm} onSubmit={savePassword}>
          <p>Define una contraseña temporal para <strong>{modal?.user?.email}</strong>. Sus sesiones existentes se cerrarán.</p>
          <label>Nueva contraseña temporal<input type="text" value={form.password} autoComplete="new-password" minLength="8" onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required /></label>
          <button className={styles.textButton} type="button" onClick={() => setForm((current) => ({ ...current, password: makeTemporaryPassword() }))}>Generar temporal</button>
          <div className={styles.singleFormActions}><button className={styles.secondarySmall} type="button" onClick={() => setModal(null)}>Cancelar</button><button className={styles.primaryButton} type="submit">Restablecer contraseña</button></div>
        </form>
      </CenterModal>
      <ToastMessage message={toast} onClose={() => setToast('')} />
    </section>
  );
}
