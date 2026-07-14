import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CenterModal from '../components/CenterModal.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
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
import { formatCurrencyMXN, formatDiscount, normalizeMoneyInput, parseCurrencyInput } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

const DAY_MS = 24 * 60 * 60 * 1000;
// datetime-local trabaja en hora local; restar el offset antes de usar toISOString
// evita que una oferta "desde ahora" quede 7 h en el futuro (bug de zona horaria).
const toDateTimeInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const defaultDate = () => toDateTimeInput(new Date());
const futureDate = () => toDateTimeInput(new Date(Date.now() + 30 * DAY_MS));

const SCOPE_TYPES = [
  { key: 'productId', label: 'Un producto', hint: 'El descuento aplica a un solo producto del catálogo.' },
  { key: 'laboratoryId', label: 'Un laboratorio', hint: 'Aplica a todos los productos de un laboratorio.' },
  { key: 'categoryId', label: 'Una categoría', hint: 'Aplica a todos los productos de una categoría.' },
  { key: 'productType', label: 'Un tipo de producto', hint: 'Aplica a todos los productos de un tipo (genéricos, OTC, etc.).' },
];

const DURATION_PRESETS = [
  { days: 7, label: '1 semana' },
  { days: 15, label: '15 días' },
  { days: 30, label: '1 mes' },
  { days: 90, label: '3 meses' },
];

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
    startsAt: toDateTimeInput(new Date(offer.startsAt)),
    endsAt: toDateTimeInput(new Date(offer.endsAt)),
    scopeType,
    scopeValue: offer[scopeType] || '',
    isActive: offer.isActive !== false,
  };
}

// Estado único y sin ambigüedad por oferta: una oferta pausada no aplica aunque
// esté en fechas; una expirada ya no aplica aunque siga "activa" en la BD.
function getOfferState(offer) {
  if (!offer.isActive) return 'paused';
  const now = new Date();
  if (new Date(offer.endsAt) < now) return 'expired';
  if (new Date(offer.startsAt) > now) return 'scheduled';
  return 'current';
}

const STATE_LABELS = { current: 'Vigente', scheduled: 'Programada', paused: 'Pausada', expired: 'Expirada' };
const STATE_TONES = { current: 'success', scheduled: 'info', paused: 'neutral', expired: 'neutral' };

function formatDate(value) {
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function FormSection({ title, hint, children }) {
  return (
    <section className={styles.formSection}>
      <h3>{title}</h3>
      {hint && <p className={styles.offerSectionHint}>{hint}</p>}
      {children}
    </section>
  );
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

  const groupScopeOptions = useMemo(() => {
    if (form.scopeType === 'laboratoryId') return laboratories;
    if (form.scopeType === 'categoryId') return categories;
    return productTypeOptions;
  }, [categories, form.scopeType, laboratories]);

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
      return (!query || [offer.title, offer.description, getScopeLabel(offer)].some((value) => normalizeText(value).includes(query)))
        && (filters.status === 'all' || getOfferState(offer) === filters.status);
    });
  }, [filters, offers, products, laboratories, categories]);

  const metrics = useMemo(() => ({
    current: offers.filter((offer) => getOfferState(offer) === 'current').length,
    scheduled: offers.filter((offer) => getOfferState(offer) === 'scheduled').length,
    paused: offers.filter((offer) => getOfferState(offer) === 'paused').length,
    expired: offers.filter((offer) => getOfferState(offer) === 'expired').length,
  }), [offers]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const handleScopeTypeChange = (scopeType) => setForm((current) => ({ ...current, scopeType, scopeValue: '' }));

  const applyDuration = (days) => {
    setForm((current) => ({
      ...current,
      startsAt: toDateTimeInput(new Date()),
      endsAt: toDateTimeInput(new Date(Date.now() + days * DAY_MS)),
    }));
  };

  // Productos que la oferta afectaría, con precio final calculado — el corazón
  // de la vista previa: el admin ve el efecto real antes de guardar.
  const preview = useMemo(() => {
    const rawValue = parseCurrencyInput(form.discountValue);
    if (rawValue === null || rawValue === 0) return null;
    if (form.discountType === 'PERCENTAGE' && rawValue > 10000) return null;

    let affected = [];
    if (form.scopeType === 'productId') affected = products.filter((product) => product.id === form.scopeValue);
    else if (form.scopeType === 'laboratoryId') affected = products.filter((product) => product.laboratoryId === form.scopeValue);
    else if (form.scopeType === 'categoryId') affected = products.filter((product) => product.categoryId === form.scopeValue);
    else if (form.scopeType === 'productType') affected = products.filter((product) => product.productType === form.scopeValue);
    affected = affected.filter((product) => product.isActive !== false);
    if (!affected.length) return null;

    const priced = affected.map((product) => {
      const baseCents = Math.round(Number(product.originalPrice ?? product.price) * 100);
      const discountCents = form.discountType === 'PERCENTAGE'
        ? Math.round((baseCents * rawValue) / 10000)
        : Math.min(baseCents, rawValue);
      return { name: product.name, baseCents, finalCents: baseCents - discountCents };
    });

    return {
      count: priced.length,
      sample: priced[0],
      zeroCount: form.discountType === 'FIXED_AMOUNT' ? priced.filter((item) => item.finalCents === 0 && item.baseCents > 0).length : 0,
    };
  }, [form.discountType, form.discountValue, form.scopeType, form.scopeValue, products]);

  const rangeSummary = useMemo(() => {
    const starts = new Date(form.startsAt);
    const ends = new Date(form.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) return null;
    const days = Math.max(1, Math.round((ends - starts) / DAY_MS));
    return `Del ${formatDate(starts)} al ${formatDate(ends)} · ${days} día${days === 1 ? '' : 's'}`;
  }, [form.startsAt, form.endsAt]);

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
      setError('Ponle un nombre a la oferta (paso 1).');
      return false;
    }
    const discountValueCents = parseCurrencyInput(form.discountValue);
    if (discountValueCents === null || (form.discountType === 'PERCENTAGE' && discountValueCents > 10000)) {
      setError(form.discountType === 'PERCENTAGE'
        ? 'El porcentaje de descuento debe estar entre 0 y 100 (paso 2).'
        : 'El descuento fijo debe ser un monto en MXN igual o mayor a 0 (paso 2).');
      return false;
    }
    if (!form.scopeValue) {
      setError('Selecciona a qué se aplicará la oferta (paso 3).');
      return false;
    }
    if (!form.startsAt || !form.endsAt || new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError('La fecha de fin debe ser posterior al inicio (paso 4).');
      return false;
    }
    if (form.discountType === 'FIXED_AMOUNT' && form.scopeType === 'productId') {
      const product = products.find((item) => item.id === form.scopeValue);
      if (product && discountValueCents > (parseCurrencyInput(product.originalPrice ?? product.price) ?? 0)) {
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
      discountValue: normalizeMoneyInput(form.discountValue),
      // El input datetime-local es hora local; se envía en ISO UTC para que el
      // servidor (en cualquier zona horaria) guarde el instante correcto.
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
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
      setToast(updatedOffer.isActive ? 'Oferta reanudada' : 'Oferta pausada');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar el estado.');
    }
  };

  const scopeHint = SCOPE_TYPES.find((scope) => scope.key === form.scopeType)?.hint;

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.adminPageHeader}>
        <div><p className={styles.eyebrow}>Administración</p><h1>Gestión de ofertas</h1><p>Crea descuentos por producto, laboratorio, categoría o tipo, y controla su vigencia.</p></div>
        <div className={styles.adminHeaderActions}>
          <button className={styles.secondaryButton} type="button" onClick={loadData}>Actualizar</button>
          <button className={styles.primaryButton} type="button" onClick={openCreate}>Nueva oferta</button>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <article><span>Vigentes ahora</span><strong>{metrics.current}</strong></article>
        <article><span>Programadas</span><strong>{metrics.scheduled}</strong></article>
        <article><span>Pausadas</span><strong>{metrics.paused}</strong></article>
        <article><span>Expiradas</span><strong>{metrics.expired}</strong></article>
      </div>

      <div className={styles.adminToolbar}>
        <label className={styles.adminSearch}><span className={styles.srOnly}>Buscar ofertas</span><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Buscar oferta" /></label>
        <label className={styles.srOnly} htmlFor="offer-status-filter">Filtrar por estado</label>
        <select id="offer-status-filter" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="all">Todos los estados</option><option value="current">Vigentes</option><option value="scheduled">Programadas</option><option value="paused">Pausadas</option><option value="expired">Expiradas</option></select>
        {(filters.query || filters.status !== 'all') && <button className={styles.textButton} type="button" onClick={() => setFilters({ query: '', status: 'all' })}>Limpiar filtros</button>}
      </div>

      {error && !panel && <p className={styles.formError}>{error}</p>}
      {isLoading ? <div className={styles.emptyState}><h2>Cargando ofertas</h2></div>
        : !offers.length ? <div className={styles.emptyState}><h2>Aún no hay ofertas</h2><p>Crea la primera: eliges el descuento, a qué productos aplica y por cuánto tiempo.</p><button className={styles.primaryButton} type="button" onClick={openCreate}>Crear mi primera oferta</button></div>
          : !visibleOffers.length ? <div className={styles.emptyState}><h2>Sin resultados</h2><button className={styles.secondarySmall} type="button" onClick={() => setFilters({ query: '', status: 'all' })}>Limpiar filtros</button></div>
            : <div className={styles.tableWrapper}>
              <table className={`${styles.adminDataTable} ${styles.offerDataTable}`}>
                <thead><tr><th>Título</th><th>Descuento</th><th>Aplica a</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>{visibleOffers.map((offer) => {
                  const state = getOfferState(offer);
                  const daysLeft = state === 'current' ? Math.max(1, Math.ceil((new Date(offer.endsAt) - Date.now()) / DAY_MS)) : null;
                  return <tr key={offer.id}>
                    <td><strong>{offer.title}</strong>{offer.description && <div className={styles.tableDescription}>{offer.description}</div>}</td>
                    <td><div className={styles.rowBadges}><StatusBadge tone="info">{formatDiscount(offer)}</StatusBadge></div></td>
                    <td>{getScopeLabel(offer)}</td>
                    <td>{formatDate(offer.startsAt)} – {formatDate(offer.endsAt)}{daysLeft !== null && <div className={styles.tableDescription}>quedan {daysLeft} día{daysLeft === 1 ? '' : 's'}</div>}</td>
                    <td><div className={styles.rowBadges}><StatusBadge tone={STATE_TONES[state]}>{STATE_LABELS[state]}</StatusBadge></div></td>
                    <td><div className={styles.actionButtonsGroup}><button className={styles.actionButtonEdit} type="button" onClick={() => openEdit(offer)}>Editar</button><button className={offer.isActive ? styles.actionButtonDeactivate : styles.actionButtonActivate} type="button" onClick={() => setStatusCandidate(offer)}>{offer.isActive ? 'Pausar' : 'Reanudar'}</button></div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>}

      <CenterModal open={panel === 'form'} title={selectedOffer ? 'Editar oferta' : 'Nueva oferta'} onClose={closePanel}>
        <form className={styles.singleForm} onSubmit={saveOffer}>
          <FormSection title="1 · ¿Cómo se llama la oferta?">
            <div className={styles.wizardGrid}>
              <label className={styles.wizardFull}>Nombre<input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Ej. Semana de genéricos -15%" required /></label>
              <label className={styles.wizardFull}>Descripción <span className={styles.offerOptional}>(opcional, la ven tus clientes)</span><textarea rows="2" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
            </div>
          </FormSection>

          <FormSection title="2 · ¿Cuánto descuento?">
            <div className={styles.offerChipGroup} role="radiogroup" aria-label="Tipo de descuento">
              <button type="button" className={`${styles.offerChip} ${form.discountType === 'PERCENTAGE' ? styles.offerChipActive : ''}`} aria-pressed={form.discountType === 'PERCENTAGE'} onClick={() => updateForm('discountType', 'PERCENTAGE')}>% Porcentaje</button>
              <button type="button" className={`${styles.offerChip} ${form.discountType === 'FIXED_AMOUNT' ? styles.offerChipActive : ''}`} aria-pressed={form.discountType === 'FIXED_AMOUNT'} onClick={() => updateForm('discountType', 'FIXED_AMOUNT')}>$ Monto fijo</button>
            </div>
            <div className={styles.wizardGrid}>
              <label>Valor ({form.discountType === 'PERCENTAGE' ? '%' : 'MXN'})<input min="0" max={form.discountType === 'PERCENTAGE' ? '100' : undefined} step="0.01" type="number" value={form.discountValue} onChange={(event) => updateForm('discountValue', event.target.value)} placeholder={form.discountType === 'PERCENTAGE' ? 'Ej. 15' : 'Ej. 50.00'} required /><small className={styles.formHint}>{form.discountType === 'PERCENTAGE' ? 'Se descuenta ese porcentaje del precio base.' : 'Se resta ese monto del precio base de cada producto.'}</small></label>
            </div>
          </FormSection>

          <FormSection title="3 · ¿A qué se aplica?" hint={scopeHint}>
            <div className={styles.offerChipGroup} role="radiogroup" aria-label="Aplicar a">
              {SCOPE_TYPES.map((scope) => (
                <button key={scope.key} type="button" className={`${styles.offerChip} ${form.scopeType === scope.key ? styles.offerChipActive : ''}`} aria-pressed={form.scopeType === scope.key} onClick={() => handleScopeTypeChange(scope.key)}>{scope.label}</button>
              ))}
            </div>
            {form.scopeType === 'productId'
              ? <ProductPicker products={products} value={form.scopeValue} onChange={(id) => updateForm('scopeValue', id)} />
              : (
                <label className={styles.wizardFull}>
                  {SCOPE_TYPES.find((scope) => scope.key === form.scopeType)?.label}
                  <select value={form.scopeValue} onChange={(event) => updateForm('scopeValue', event.target.value)} required>
                    <option value="">Selecciona</option>
                    {groupScopeOptions.map((option) => <option key={option.id || option.value} value={option.id || option.value}>{option.name || option.label}</option>)}
                  </select>
                </label>
              )}
          </FormSection>

          <FormSection title="4 · ¿Por cuánto tiempo?">
            <div className={styles.offerChipGroup} aria-label="Duración rápida">
              {DURATION_PRESETS.map((preset) => (
                <button key={preset.days} type="button" className={styles.offerChip} onClick={() => applyDuration(preset.days)}>Desde hoy · {preset.label}</button>
              ))}
            </div>
            <div className={styles.wizardGrid}>
              <label>Inicio<input type="datetime-local" value={form.startsAt} onChange={(event) => updateForm('startsAt', event.target.value)} required /></label>
              <label>Fin<input type="datetime-local" value={form.endsAt} onChange={(event) => updateForm('endsAt', event.target.value)} required /></label>
            </div>
            {rangeSummary && <p className={styles.offerRangeSummary}>{rangeSummary}</p>}
            <label className={styles.offerActiveToggle}><input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} /> Publicar al guardar <span className={styles.offerOptional}>(si la desmarcas queda pausada y no aplica hasta que la reanudes)</span></label>
          </FormSection>

          <aside className={styles.offerPreview} aria-live="polite">
            <h3>Vista previa</h3>
            {preview ? (
              <>
                <p className={styles.offerPreviewCount}>{preview.count === 1 ? 'Aplica a 1 producto' : `Aplica a ${preview.count} productos activos`}</p>
                <p className={styles.offerPreviewPrice}>
                  <span>{preview.sample.name}</span>
                  <s>{formatCurrencyMXN(preview.sample.baseCents / 100)}</s>
                  <strong>{formatCurrencyMXN(preview.sample.finalCents / 100)}</strong>
                </p>
                {preview.zeroCount > 0 && <p className={styles.offerPreviewWarn}>⚠ {preview.zeroCount} producto{preview.zeroCount === 1 ? ' quedaría' : 's quedarían'} en $0.00 con este monto fijo — considera usar porcentaje.</p>}
              </>
            ) : (
              <p className={styles.offerPreviewHint}>Completa el descuento (paso 2) y a qué aplica (paso 3) para ver aquí el efecto en los precios.</p>
            )}
          </aside>

          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.singleFormActions}><button className={styles.secondarySmall} type="button" onClick={closePanel}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : selectedOffer ? 'Guardar cambios' : 'Crear oferta'}</button></div>
        </form>
      </CenterModal>
      <ConfirmDialog open={Boolean(statusCandidate)} title={statusCandidate?.isActive ? 'Pausar oferta' : 'Reanudar oferta'} description={statusCandidate?.isActive ? 'Los precios volverán a la normalidad mientras esté pausada; puedes reanudarla cuando quieras.' : 'La oferta volverá a aplicar sus descuentos (si está dentro de su vigencia).'} confirmLabel={statusCandidate?.isActive ? 'Pausar' : 'Reanudar'} onClose={() => setStatusCandidate(null)} onConfirm={confirmStatusChange} />
      <ToastMessage message={toast} onClose={() => setToast('')} />
    </section>
  );
}
