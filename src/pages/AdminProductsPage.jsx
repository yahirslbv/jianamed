import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CenterModal from '../components/CenterModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ToastMessage from '../components/ToastMessage.jsx';
import { getCategories } from '../services/categoryService.js';
import { getLaboratories } from '../services/laboratoryService.js';
import {
  createProduct,
  getProducts,
  healthFractionOptions,
  productTypeOptions,
  updateProduct,
  updateProductStatus,
} from '../services/productService.js';
import { formatCurrencyMXN } from '../utils/formatters.js';
import styles from '../styles/App.module.css';

const emptyProduct = {
  sku: '',
  commercialName: '',
  genericName: '',
  activeIngredient: '',
  laboratoryId: '',
  categoryId: '',
  pharmaceuticalForm: '',
  concentration: '',
  presentation: '',
  sanitaryRegistration: '',
  healthFraction: 'NOT_APPLICABLE',
  requiresPrescription: false,
  requiresRetainedPrescription: false,
  isControlled: false,
  productType: 'OTC',
  price: '',
  stock: '',
  imageUrl: '',
  description: '',
  isActive: true,
};

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getFormValues(product) {
  return {
    ...emptyProduct,
    sku: product.sku,
    commercialName: product.commercialName || product.name || '',
    genericName: product.genericName || '',
    activeIngredient: product.activeIngredient || '',
    laboratoryId: product.laboratoryId || '',
    categoryId: product.categoryId || '',
    pharmaceuticalForm: product.pharmaceuticalForm || '',
    concentration: product.concentration || '',
    presentation: product.presentation || '',
    sanitaryRegistration: product.sanitaryRegistration || '',
    healthFraction: product.healthFraction || 'NOT_APPLICABLE',
    requiresPrescription: Boolean(product.requiresPrescription),
    requiresRetainedPrescription: Boolean(product.requiresRetainedPrescription),
    isControlled: Boolean(product.isControlled),
    productType: product.productType || 'OTC',
    price: String(product.price ?? ''),
    stock: String(product.stock ?? ''),
    imageUrl: product.imageUrl || '',
    description: product.description || '',
    isActive: product.isActive !== false,
  };
}

function ProductThumbnail({ product }) {
  const source = product.image || product.imageUrl;
  return source
    ? <img className={styles.adminTableImage} src={source} alt="" />
    : <span className={styles.adminTableImageFallback}>Sin imagen</span>;
}

function FormSection({ title, children }) {
  return <section className={styles.formSection}><h3>{title}</h3>{children}</section>;
}

function ProductDetail({ product }) {
  return (
    <div className={styles.detailDrawerContent}>
      <div className={styles.detailHero}>
        <ProductThumbnail product={product} />
        <div>
          <p className={styles.skuText}>{product.sku}</p>
          <h3>{product.name}</h3>
          <StatusBadge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Activo' : 'Inactivo'}</StatusBadge>
        </div>
      </div>
      <details open>
        <summary>Información general</summary>
        <dl className={styles.detailList}>
          <div><dt>Nombre genérico</dt><dd>{product.genericName}</dd></div>
          <div><dt>Principio activo</dt><dd>{product.activeIngredient}</dd></div>
          <div><dt>Presentación</dt><dd>{product.presentation}</dd></div>
          <div><dt>Forma</dt><dd>{product.pharmaceuticalForm}</dd></div>
        </dl>
      </details>
      <details>
        <summary>Clasificación y regulación</summary>
        <dl className={styles.detailList}>
          <div><dt>Laboratorio</dt><dd>{product.laboratoryName}</dd></div>
          <div><dt>Categoría</dt><dd>{product.category}</dd></div>
          <div><dt>Tipo</dt><dd>{product.productTypeLabel || product.type}</dd></div>
          <div><dt>Fracción</dt><dd>{product.healthFraction || 'No aplica'}</dd></div>
          <div><dt>Registro sanitario</dt><dd>{product.sanitaryRegistration || 'No registrado'}</dd></div>
          <div><dt>Receta</dt><dd>{product.requiresPrescription ? 'Requerida' : 'No requerida'}</dd></div>
        </dl>
      </details>
      <details>
        <summary>Inventario y precio</summary>
        <dl className={styles.detailList}>
          <div><dt>Stock</dt><dd>{product.stock}</dd></div>
          <div><dt>Precio base</dt><dd>{formatCurrencyMXN(product.originalPrice ?? product.price)}</dd></div>
          {product.offer && <div><dt>Precio con oferta</dt><dd>{formatCurrencyMXN(product.price)}</dd></div>}
          <div><dt>Oferta</dt><dd>{product.offer?.title || 'Sin oferta activa'}</dd></div>
        </dl>
      </details>
      {product.description && <details><summary>Nota informativa</summary><p className={styles.productDescription}>{product.description}</p></details>}
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ query: '', laboratoryId: '', categoryId: '', healthFraction: '', productType: '', status: 'all' });
  const [metricFilter, setMetricFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [panel, setPanel] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusCandidate, setStatusCandidate] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedProducts, loadedLaboratories, loadedCategories] = await Promise.all([
        getProducts({ includeInactive: 'true' }),
        getLaboratories({ includeInactive: true }),
        getCategories({ includeInactive: true }),
      ]);
      setProducts(loadedProducts);
      setLaboratories(loadedLaboratories);
      setCategories(loadedCategories);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar los productos.');
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

  const visibleProducts = useMemo(() => {
    const query = normalizeText(filters.query);
    return products.filter((product) => (
      (!query || [product.sku, product.name, product.commercialName, product.activeIngredient, product.laboratoryName].some((value) => normalizeText(value).includes(query)))
      && (!filters.laboratoryId || product.laboratoryId === filters.laboratoryId)
      && (!filters.categoryId || product.categoryId === filters.categoryId)
      && (!filters.healthFraction || product.healthFraction === filters.healthFraction)
      && (!filters.productType || product.productType === filters.productType)
      && (filters.status === 'all' || (filters.status === 'active' && product.isActive) || (filters.status === 'inactive' && !product.isActive))
      && (!metricFilter
        || (metricFilter === 'active' && product.isActive)
        || (metricFilter === 'outOfStock' && product.stock <= 0)
        || (metricFilter === 'withOffer' && product.offer)
        || (metricFilter === 'withoutImage' && !(product.image || product.imageUrl)))
    ));
  }, [filters, metricFilter, products]);

  const metrics = useMemo(() => ({
    active: products.filter((product) => product.isActive).length,
    outOfStock: products.filter((product) => product.stock <= 0).length,
    withOffer: products.filter((product) => product.offer).length,
    withoutImage: products.filter((product) => !(product.image || product.imageUrl)).length,
  }), [products]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const resetFilters = () => {
    setFilters({ query: '', laboratoryId: '', categoryId: '', healthFraction: '', productType: '', status: 'all' });
    setMetricFilter('');
  };
  const toggleMetricFilter = (metric) => setMetricFilter((current) => (current === metric ? '' : metric));
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const openCreate = () => {
    setForm(emptyProduct);
    setSelectedProduct(null);
    setImageFile(null);
    setImagePreview('');
    setError('');
    setPanel('form');
  };

  const openEdit = (product) => {
    setForm(getFormValues(product));
    setSelectedProduct(product);
    setImageFile(null);
    setImagePreview(product.image || product.imageUrl || '');
    setError('');
    setPanel('form');
  };

  const closePanel = () => {
    if (!isSaving) {
      setPanel(null);
      setError('');
    }
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    if (!file) {
      setImagePreview(form.imageUrl || '');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => setImagePreview(String(reader.result || '')));
    reader.readAsDataURL(file);
  };

  const validateProduct = () => {
    const requiredFields = [
      'sku', 'commercialName', 'genericName', 'activeIngredient', 'pharmaceuticalForm',
      'concentration', 'presentation', 'laboratoryId', 'categoryId', 'productType', 'price', 'stock',
    ];
    const missing = requiredFields.find((field) => String(form[field] ?? '').trim() === '');
    if (missing) {
      setError('Completa los campos requeridos antes de guardar.');
      return false;
    }
    if (Number(form.price) < 0 || Number.parseInt(form.stock, 10) < 0) {
      setError('Precio y stock deben ser valores válidos.');
      return false;
    }
    setError('');
    return true;
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!validateProduct()) return;
    setIsSaving(true);
    setError('');
    try {
      const payload = { ...form, price: Number(form.price), stock: Number.parseInt(form.stock, 10), imageFile };
      const saved = selectedProduct ? await updateProduct(selectedProduct.id, payload) : await createProduct(payload);
      setProducts((current) => [saved, ...current.filter((product) => product.id !== saved.id)].sort((a, b) => a.name.localeCompare(b.name)));
      setPanel(null);
      setToast(selectedProduct ? 'Producto actualizado' : 'Producto creado');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    const product = statusCandidate;
    setStatusCandidate(null);
    try {
      const updated = await updateProductStatus(product.id, !product.isActive);
      setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setToast(updated.isActive ? 'Producto activado' : 'Producto desactivado');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar el estado.');
    }
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.adminPageHeader}>
        <div><p className={styles.eyebrow}>Administración</p><h1>Gestión de productos</h1><p>Catálogo, inventario y requisitos regulatorios.</p></div>
        <div className={styles.adminHeaderActions}>
          <button className={styles.secondaryButton} type="button" onClick={loadData}>Actualizar</button>
          <a className={styles.secondaryButton} href="#/admin/importar-productos">Importar productos</a>
          <button className={styles.primaryButton} type="button" onClick={openCreate}>Nuevo producto</button>
        </div>
      </div>

      <div className={styles.metricGrid} aria-label="Filtros rápidos de productos">
        <button className={metricFilter === 'active' ? styles.metricCardActive : ''} type="button" aria-pressed={metricFilter === 'active'} onClick={() => toggleMetricFilter('active')}><span>Activos</span><strong>{metrics.active}</strong><small>Ver productos</small></button>
        <button className={metricFilter === 'outOfStock' ? styles.metricCardActive : ''} type="button" aria-pressed={metricFilter === 'outOfStock'} onClick={() => toggleMetricFilter('outOfStock')}><span>Sin stock</span><strong>{metrics.outOfStock}</strong><small>Ver productos</small></button>
        <button className={metricFilter === 'withOffer' ? styles.metricCardActive : ''} type="button" aria-pressed={metricFilter === 'withOffer'} onClick={() => toggleMetricFilter('withOffer')}><span>Con oferta</span><strong>{metrics.withOffer}</strong><small>Ver productos</small></button>
        <button className={metricFilter === 'withoutImage' ? styles.metricCardActive : ''} type="button" aria-pressed={metricFilter === 'withoutImage'} onClick={() => toggleMetricFilter('withoutImage')}><span>Sin imagen</span><strong>{metrics.withoutImage}</strong><small>Ver productos</small></button>
      </div>

      <div className={styles.adminToolbar}>
        <label className={styles.adminSearch}><span className={styles.srOnly}>Buscar productos</span><input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Buscar producto o SKU" /></label>
        <button className={styles.secondarySmall} type="button" onClick={() => setShowFilters((value) => !value)}>{showFilters ? 'Ocultar filtros' : 'Filtros avanzados'}</button>
        {(filters.query || filters.status !== 'all' || filters.laboratoryId || filters.categoryId || filters.healthFraction || filters.productType || metricFilter) && <button className={styles.textButton} type="button" onClick={resetFilters}>Limpiar filtros</button>}
      </div>
      {metricFilter && <p className={styles.activeFilterNotice}>Filtro rápido activo: <strong>{{ active: 'Activos', outOfStock: 'Sin stock', withOffer: 'Con oferta', withoutImage: 'Sin imagen' }[metricFilter]}</strong>. Se combina con los filtros avanzados.</p>}

      {showFilters && <div className={styles.advancedFilters}>
        <label>Laboratorio<select value={filters.laboratoryId} onChange={(event) => updateFilter('laboratoryId', event.target.value)}><option value="">Todos</option>{laboratories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Categoría<select value={filters.categoryId} onChange={(event) => updateFilter('categoryId', event.target.value)}><option value="">Todas</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Tipo<select value={filters.productType} onChange={(event) => updateFilter('productType', event.target.value)}><option value="">Todos</option>{productTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Fracción<select value={filters.healthFraction} onChange={(event) => updateFilter('healthFraction', event.target.value)}><option value="">Todas</option>{healthFractionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Estado<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label>
      </div>}

      {error && <p className={styles.formError}>{error}</p>}
      {isLoading ? <div className={styles.emptyState}><h2>Cargando productos</h2></div> : !visibleProducts.length ? <div className={styles.emptyState}><h2>Sin resultados</h2><button className={styles.secondarySmall} type="button" onClick={resetFilters}>Limpiar filtros</button></div> : <div className={styles.tableWrapper}>
        <table className={`${styles.adminDataTable} ${styles.productDataTable}`}>
          <colgroup className={styles.productTableColumns}>
            <col /><col /><col /><col /><col /><col /><col /><col /><col />
          </colgroup>
          <thead><tr><th>Imagen</th><th>SKU</th><th>Producto</th><th>Laboratorio</th><th>Categoría</th><th>Stock</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{visibleProducts.map((product) => <tr key={product.id}>
            <td className={styles.productImageCell}><ProductThumbnail product={product} /></td>
            <td className={styles.skuCell}>{product.sku}</td>
            <td className={styles.productNameCell}><strong title={product.name}>{product.name}</strong><div className={styles.rowBadges}>{product.offer && <StatusBadge tone="success">Oferta</StatusBadge>}{product.stock <= 0 && <StatusBadge tone="danger">Sin stock</StatusBadge>}{product.stock > 0 && product.stock <= 30 && <StatusBadge tone="warning">Stock bajo</StatusBadge>}</div></td>
            <td className={styles.laboratoryCell} title={product.laboratoryName}>{product.laboratoryName}</td><td className={styles.categoryCell} title={product.category}>{product.category}</td><td className={styles.stockCell}>{product.stock}</td><td className={styles.priceCell}>{formatCurrencyMXN(product.price)}</td>
            <td className={styles.statusCell}><StatusBadge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Activo' : 'Inactivo'}</StatusBadge></td>
            <td className={styles.actionsCell}><div className={styles.actionButtonsGroup}><button className={styles.actionButtonView} type="button" onClick={() => { setSelectedProduct(product); setPanel('detail'); }}>Ver</button><button className={styles.actionButtonEdit} type="button" onClick={() => openEdit(product)}>Editar</button><button className={product.isActive ? styles.actionButtonDeactivate : styles.actionButtonActivate} type="button" onClick={() => setStatusCandidate(product)}>{product.isActive ? 'Desactivar' : 'Activar'}</button></div></td>
          </tr>)}</tbody>
        </table>
      </div>}

      <CenterModal open={panel === 'detail'} title="Detalle de producto" onClose={closePanel} size="detail">{selectedProduct && <ProductDetail product={selectedProduct} />}</CenterModal>
      <CenterModal open={panel === 'form'} title={selectedProduct ? 'Editar producto' : 'Nuevo producto'} onClose={closePanel}>
        <form className={styles.singleForm} onSubmit={saveProduct}>
          <FormSection title="Información básica">
            <div className={styles.wizardGrid}>
              <label>SKU<input value={form.sku} onChange={(event) => updateForm('sku', event.target.value)} required /></label>
              <label>Nombre comercial<input value={form.commercialName} onChange={(event) => updateForm('commercialName', event.target.value)} required /></label>
              <label>Denominación genérica<input value={form.genericName} onChange={(event) => updateForm('genericName', event.target.value)} required /></label>
              <label>Principio activo<input value={form.activeIngredient} onChange={(event) => updateForm('activeIngredient', event.target.value)} required /></label>
              <label>Forma farmacéutica<input value={form.pharmaceuticalForm} onChange={(event) => updateForm('pharmaceuticalForm', event.target.value)} required /></label>
              <label>Concentración<input value={form.concentration} onChange={(event) => updateForm('concentration', event.target.value)} required /></label>
              <label className={styles.wizardFull}>Presentación<input value={form.presentation} onChange={(event) => updateForm('presentation', event.target.value)} required /></label>
            </div>
          </FormSection>

          <FormSection title="Clasificación">
            <div className={styles.wizardGrid}>
              <label>Laboratorio<select value={form.laboratoryId} onChange={(event) => updateForm('laboratoryId', event.target.value)} required><option value="">Selecciona</option>{laboratories.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Categoría<select value={form.categoryId} onChange={(event) => updateForm('categoryId', event.target.value)} required><option value="">Selecciona</option>{categories.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className={styles.wizardFull}>Tipo de producto<select value={form.productType} onChange={(event) => updateForm('productType', event.target.value)}>{productTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            </div>
          </FormSection>

          <FormSection title="Regulación">
            <div className={styles.wizardGrid}>
              <label>Registro sanitario<input value={form.sanitaryRegistration} onChange={(event) => updateForm('sanitaryRegistration', event.target.value)} /></label>
              <label>Fracción sanitaria<select value={form.healthFraction} onChange={(event) => updateForm('healthFraction', event.target.value)}>{healthFractionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <fieldset className={styles.wizardFull}><legend>Requisitos</legend><label><input type="checkbox" checked={form.requiresPrescription} onChange={(event) => updateForm('requiresPrescription', event.target.checked)} /> Requiere receta</label><label><input type="checkbox" checked={form.requiresRetainedPrescription} onChange={(event) => updateForm('requiresRetainedPrescription', event.target.checked)} /> Receta retenida</label><label><input type="checkbox" checked={form.isControlled} onChange={(event) => updateForm('isControlled', event.target.checked)} /> Producto controlado</label></fieldset>
            </div>
          </FormSection>

          <FormSection title="Inventario e imagen">
            <div className={styles.wizardGrid}>
              <label>Precio base<input min="0" step="0.01" type="number" value={form.price} onChange={(event) => updateForm('price', event.target.value)} required /><small className={styles.formHint}>Precio unitario antes de descuentos.</small></label>
              <label>Stock<input min="0" type="number" value={form.stock} onChange={(event) => updateForm('stock', event.target.value)} required /></label>
              <label className={styles.wizardFull}>Imagen URL<input value={form.imageUrl} onChange={(event) => { updateForm('imageUrl', event.target.value); if (!imageFile) setImagePreview(event.target.value); }} /></label>
              <label className={styles.wizardFull}>Subir imagen<input accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" type="file" onChange={handleImageFileChange} /></label>
              {imagePreview && <div className={`${styles.productImagePreview} ${styles.wizardFull}`}><img src={imagePreview} alt="Vista previa" /></div>}
              <label className={styles.wizardFull}>Descripción<textarea rows="4" value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
            </div>
          </FormSection>

          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.singleFormActions}><button className={styles.secondarySmall} type="button" onClick={closePanel}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</button></div>
        </form>
      </CenterModal>
      <ConfirmDialog open={Boolean(statusCandidate)} title={statusCandidate?.isActive ? 'Desactivar producto' : 'Activar producto'} description={statusCandidate?.isActive ? 'El producto dejará de estar disponible para clientes.' : 'El producto volverá a estar disponible para clientes.'} confirmLabel={statusCandidate?.isActive ? 'Desactivar' : 'Activar'} onClose={() => setStatusCandidate(null)} onConfirm={confirmStatusChange} />
      <ToastMessage message={toast} onClose={() => setToast('')} />
    </section>
  );
}
