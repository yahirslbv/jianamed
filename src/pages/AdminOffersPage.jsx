import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CenterModal from '../components/CenterModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ToastMessage from '../components/ToastMessage.jsx';
import { getCategories } from '../services/categoryService.js';
import { getLaboratories } from '../services/laboratoryService.js';
import {
  createOffer,
  getOffers,
  updateOffer,
  updateOfferStatus,
} from '../services/offerService.js';
import { getProducts, productTypeOptions } from '../services/productService.js';
import { formatCurrencyMXN, formatDiscount } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

const defaultDate = () => new Date().toISOString().slice(0, 16);
const futureDate = () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 16);

const emptyOffer = () => ({
  title: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  startsAt: defaultDate(),
  endsAt: futureDate(),
  scopeType: 'productId',
  scopeValue: '',
  isActive: true,
});

function getFormValues(offer) {
  const scopeType = offer.productId
    ? 'productId'
    : offer.laboratoryId
      ? 'laboratoryId'
      : offer.categoryId
        ? 'categoryId'
        : 'productType';

  return {
    title: offer.title || '',
    description: offer.description || '',
    discountType: offer.discountType || 'PERCENTAGE',
    discountValue: String(offer.discountValue ?? ''),
    startsAt: new Date(offer.startsAt).toISOString().slice(0, 16),
    endsAt: new Date(offer.endsAt).toISOString().slice(0, 16),
    scopeType,
    scopeValue: offer[scopeType] || '',
    isActive: offer.isActive !== false,
  };
}

function getDiscountLabel(offer) {
  return formatDiscount(offer);
}

function getOfferTiming(offer) {
  const now = new Date();
  if (new Date(offer.endsAt) < now) return 'expired';
  if (new Date(offer.startsAt) > now) return 'scheduled';
  return 'current';
}

function getTimingLabel(timing) {
  return { current: 'Vigente', scheduled: 'Programada', expired: 'Expirada' }[timing];
}

function getTimingTone(timing) {
  return { current: 'success', scheduled: 'info', expired: 'neutral' }[timing];
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function FormSection({ title, children }) {
  return <section className={styles.formSection}><h3>{title}</h3>{children}</section>;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyOffer);
  const [panel, setPanel] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [filters, setFilters] = useState({ query: '', status: 'all' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusCandidate, setStatusCandidate] = useState(null);

  const scopeOptions = useMemo(() => {
    if (form.scopeType === 'productId') return products;
    if (form.scopeType === 'laboratoryId') return laboratories;
    if (form.scopeType === 'categoryId') return categories;
    return productTypeOptions;
  }, [categories, form.scopeType, laboratories, products]);

  const getScopeLabel = (offer) => {
    if (offer.scope?.label) return offer.scope.label;
    if (offer.productId) return products.find((item) => item.id === offer.productId)?.name || 'Producto';
    if (offer.laboratoryId) return laboratories.find((item) => item.id === offer.laboratoryId)?.name || 'Laboratorio';
    if (offer.categoryId) return categories.find((item) => item.id === offer.categoryId)?.name || 'Categoría';
    return productTypeOptions.find((item) => item.value === offer.productType)?.label || offer.productType || 'Sin alcance';
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedOffers, loadedProducts, loadedLaboratories, loadedCategories] = await Promise.all([
        getOffers({ includeInactive: true }),
        getProducts({ includeInactive: 'true' }),
        getLaboratories({ includeInactive: true }),
        getCategories({ includeInactive: true }),
      ]);
      setOffers(loadedOffers);
      setProducts(loadedProducts);
      setLaboratories(loadedLaboratories);
      setCategories(loadedCategories);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar las ofertas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visibleOffers = useMemo(() => {
    const query = normalizeText(filters.query);
    return offers.filter((offer) => {
      const timing = getOfferTiming(offer);
      return (!query || [offer.title, offer.description, getScopeLabel(offer)].some((value) => normalizeText(value).includes(query)))
        && (filters.status === 'all'
          || (filters.status === 'active' && offer.isActive)
          || (filters.status === 'inactive' && !offer.isActive)
          || filters.status === timing);
    });
  }, [filters, offers, products, laboratories, categories]);

  const metrics = useMemo(() => ({
    active: offers.filter((offer) => offer.isActive).length,
    current: offers.filter((offer) => getOfferTiming(offer) === 'current').length,
    scheduled: offers.filter((offer) => getOfferTiming(offer) === 'scheduled').length,
    expired: offers.filter((offer) => getOfferTiming(offer) === 'expired').length,
  }), [offers]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const handleScopeTypeChange = (scopeType) => setForm((current) => ({ ...current, scopeType, scopeValue: '' }));

  const openCreate = () => {
    setSelectedOffer(null);
    setForm(emptyOffer());
    setError('');
    setPanel('form');
  };

  const openEdit = (offer) => {
    setSelectedOffer(offer);
    setForm(getFormValues(offer));
    setError('');
    setPanel('form');
  };

  const closePanel = () => {
    if (!isSaving) {
      setPanel(null);
      setError('');
    }
  };

  const validateOffer = () => {
    if (!form.title.trim()) {
      setError('Indica el nombre de la oferta.');
      return false;
    }
    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 0 || (form.discountType === 'PERCENTAGE' && discountValue > 100)) {
      setError(form.discountType === 'PERCENTAGE'
        ? 'El porcentaje de descuento debe estar entre 0 y 100.'
        : 'El descuento fijo debe ser un monto en MXN igual o mayor a 0.');
      return false;
    }
    if (!form.scopeValue) {
      setError('Selecciona dónde se aplicará la oferta.');
      return false;
    }
    if (!form.startsAt || !form.endsAt || new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('La vigencia debe tener una fecha final posterior al inicio.');
      return false;
    }
    if (form.discountType === 'FIXED_AMOUNT' && form.scopeType === 'productId') {
      const product = products.find((item) => item.id === form.scopeValue);
      if (product && discountValue > Number(product.originalPrice ?? product.price)) {
        setError(`El descuento fijo no puede ser mayor al precio base de ${product.name} (${formatCurrencyMXN(product.originalPrice ?? product.price)}).`);
        return false;
      }
    }
    setError('');
    return true;
  };

  const saveOffer = async (event) => {
    event.preventDefault();
    if (!validateOffer()) return;
    setIsSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      isActive: form.isActive,
      productId: form.scopeType === 'productId' ? form.scopeValue : null,
      laboratoryId: form.scopeType === 'laboratoryId' ? form.scopeValue : null,
      categoryId: form.scopeType === 'categoryId' ? form.scopeValue : null,
      productType: form.scopeType === 'productType' ? form.scopeValue : null,
    };

    try {
      const savedOffer = selectedOffer ? await updateOffer(selectedOffer.id, payload) : await createOffer(payload);
      setOffers((current) => [savedOffer, ...current.filter((offer) => offer.id !== savedOffer.id)]);
      setPanel(null);
      setToast(selectedOffer ? 'Oferta actualizada' : 'Oferta creada');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible guardar la oferta.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    const offer = statusCandidate;
    setStatusCandidate(null);
    try {
      const updatedOffer = await updateOfferStatus(offer.id, !offer.isActive);
      setOffers((current) => current.map((item) => (item.id === updatedOffer.id ? updatedOffer : item)));
      setToast(updatedOffer.isActive ? 'Oferta activada' : 'Oferta desactivada');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar el estado.');
    }
  };

  const scopeLabel = form.scopeType === 'productId'
    ? 'Producto'
    : form.scopeType === 'laboratoryId'
      ? 'Laboratorio'
      : form.scopeType === 'categoryId'
        ? 'Categoría'
        : 'Tipo de producto';

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.adminPageHeader}>
        <div><p className={styles.eyebrow}>Administración</p><h1>Gestión de ofertas</h1><p>Condiciones comerciales por producto, laboratorio o categoría.</p></div>
        <div className={styles.adminHeaderActions}>
          <button className={styles.secondaryButton} type="button" onClick={loadData}>Actualizar</button>
          <button className={styles.primaryButton} type="button" onClick={openCreate}>Nueva oferta</button>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <article><span>Activas</span><strong>{metrics.active}</strong></article>
        <article><span>Vigentes</span><strong>{metrics.current}</strong></article>
        <article><span>Programadas</span><strong>{metrics.scheduled}</strong></article>
        <article><span>Expiradas</span><strong>{metrics.expired}</strong></article>
      </div>

      <div className={styles.adminToolbar}>
        <label className={styles.adminSearch}><span className={styles.srOnly}>Buscar ofertas</span><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Buscar oferta" /></label>
        <label className={styles.srOnly} htmlFor="offer-status-filter">Filtrar por estado</label>
        <select id="offer-status-filter" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="all">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="current">Vigentes</option><option value="scheduled">Programadas</option><option value="expired">Expiradas</option></select>
        {(filters.query || filters.status !== 'all') && <button className={styles.textButton} type="button" onClick={() => setFilters({ query: '', status: 'all' })}>Limpiar filtros</button>}
      </div>

      {error && <p className={styles.formError}>{error}</p>}
      {isLoading ? <div className={styles.emptyState}><h2>Cargando ofertas</h2></div> : !visibleOffers.length ? <div className={styles.emptyState}><h2>Sin resultados</h2><button className={styles.secondarySmall} type="button" onClick={() => setFilters({ query: '', status: 'all' })}>Limpiar filtros</button></div> : <div className={styles.tableWrapper}>
        <table className={`${styles.adminDataTable} ${styles.offerDataTable}`}>
          <thead><tr><th>Título</th><th>Descuento</th><th>Aplicación</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{visibleOffers.map((offer) => {
            const timing = getOfferTiming(offer);
            return <tr key={offer.id}>
              <td><strong>{offer.title}</strong>{offer.description && <div className={styles.tableDescription}>{offer.description}</div>}</td>
              <td>{offer.discountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto fijo (MXN)'}<div className={styles.rowBadges}><StatusBadge tone="info">{getDiscountLabel(offer)}</StatusBadge></div></td>
              <td>{getScopeLabel(offer)}</td><td>{formatDate(offer.startsAt)}<br />{formatDate(offer.endsAt)}</td>
              <td><div className={styles.rowBadges}><StatusBadge tone={offer.isActive ? 'success' : 'neutral'}>{offer.isActive ? 'Activa' : 'Inactiva'}</StatusBadge><StatusBadge tone={getTimingTone(timing)}>{getTimingLabel(timing)}</StatusBadge></div></td>
              <td><div className={styles.actionButtonsGroup}><button className={styles.actionButtonEdit} type="button" onClick={() => openEdit(offer)}>Editar</button><button className={offer.isActive ? styles.actionButtonDeactivate : styles.actionButtonActivate} type="button" onClick={() => setStatusCandidate(offer)}>{offer.isActive ? 'Desactivar' : 'Activar'}</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}

      <CenterModal open={panel === 'form'} title={selectedOffer ? 'Editar oferta' : 'Nueva oferta'} onClose={closePanel}>
        <form className={styles.singleForm} onSubmit={saveOffer}>
          <FormSection title="Información de la oferta">
            <div className={styles.wizardGrid}>
              <label className={styles.wizardFull}>Nombre de la oferta<input value={form.title} onChange={(event) => updateForm('title', event.target.value)} required /></label>
              <label className={styles.wizardFull}>Descripción<textarea rows="4" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
            </div>
          </FormSection>

          <FormSection title="Descuento">
            <div className={styles.wizardGrid}>
              <label>Tipo de descuento<select value={form.discountType} onChange={(event) => updateForm('discountType', event.target.value)}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED_AMOUNT">Monto fijo</option></select></label>
              <label>Valor ({form.discountType === 'PERCENTAGE' ? '%' : 'MXN'})<input min="0" max={form.discountType === 'PERCENTAGE' ? '100' : undefined} step="0.01" type="number" value={form.discountValue} onChange={(event) => updateForm('discountValue', event.target.value)} required /><small className={styles.formHint}>{form.discountType === 'PERCENTAGE' ? 'De 0 a 100%.' : 'Monto descontado del precio base.'}</small></label>
            </div>
          </FormSection>

          <FormSection title="Aplicación">
            <div className={styles.wizardGrid}>
              <label>Aplicar a<select value={form.scopeType} onChange={(event) => handleScopeTypeChange(event.target.value)}><option value="productId">Producto</option><option value="laboratoryId">Laboratorio</option><option value="categoryId">Categoría</option><option value="productType">Tipo de producto</option></select></label>
              <label>{scopeLabel}<select value={form.scopeValue} onChange={(event) => updateForm('scopeValue', event.target.value)} required><option value="">Selecciona</option>{scopeOptions.map((option) => <option key={option.id || option.value} value={option.id || option.value}>{option.name || option.label}</option>)}</select></label>
            </div>
          </FormSection>

          <FormSection title="Vigencia">
            <div className={styles.wizardGrid}>
              <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={(event) => updateForm('startsAt', event.target.value)} required /></label>
              <label>Fin<input type="datetime-local" value={form.endsAt} onChange={(event) => updateForm('endsAt', event.target.value)} required /></label>
              <fieldset className={styles.wizardFull}><legend>Estado</legend><label><input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} /> Oferta activa</label></fieldset>
            </div>
          </FormSection>

          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.singleFormActions}><button className={styles.secondarySmall} type="button" onClick={closePanel}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
        </form>
      </CenterModal>
      <ConfirmDialog open={Boolean(statusCandidate)} title={statusCandidate?.isActive ? 'Desactivar oferta' : 'Activar oferta'} description={statusCandidate?.isActive ? 'La oferta dejará de aplicarse a nuevos pedidos.' : 'La oferta volverá a aplicarse a nuevos pedidos.'} confirmLabel={statusCandidate?.isActive ? 'Desactivar' : 'Activar'} onClose={() => setStatusCandidate(null)} onConfirm={confirmStatusChange} />
      <ToastMessage message={toast} onClose={() => setToast('')} />
    </section>
  );
}
