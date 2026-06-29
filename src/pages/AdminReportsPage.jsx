import { useEffect, useMemo, useState } from 'react';
import { getCategories } from '../services/categoryService.js';
import { getLaboratories } from '../services/laboratoryService.js';
import { getProducts, healthFractionOptions, productTypeOptions } from '../services/productService.js';
import { exportReportCsv, exportReportPdf, getReportPreview } from '../services/reportService.js';
import styles from '../styles/App.module.css';

const reportOptions = [
  { value: 'orders', label: 'Pedidos' },
  { value: 'products', label: 'Productos' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'offers', label: 'Ofertas' },
  { value: 'customers', label: 'Clientes' },
];

const yesNoOptions = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
];

function SelectField({ label, value, options, onChange }) {
  return (
    <label>
      {label}
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function TextField({ label, type = 'text', value, onChange }) {
  return (
    <label>
      {label}
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function AdminReportsPage() {
  const [type, setType] = useState('orders');
  const [filters, setFilters] = useState({});
  const [preview, setPreview] = useState(null);
  const [catalogData, setCatalogData] = useState({ products: [], laboratories: [], categories: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getProducts({ includeInactive: 'true' }),
      getLaboratories({ includeInactive: true }),
      getCategories({ includeInactive: true }),
    ]).then(([products, laboratories, categories]) => setCatalogData({ products, laboratories, categories })).catch(() => {});
  }, []);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters({});
  const scopeOptions = useMemo(() => ({
    laboratories: [{ value: '', label: 'Todos' }, ...catalogData.laboratories.map((item) => ({ value: item.id, label: item.name }))],
    categories: [{ value: '', label: 'Todas' }, ...catalogData.categories.map((item) => ({ value: item.id, label: item.name }))],
    products: [{ value: '', label: 'Todos' }, ...catalogData.products.map((item) => ({ value: item.id, label: item.name }))],
    types: [{ value: '', label: 'Todos' }, ...productTypeOptions],
    fractions: [{ value: '', label: 'Todas' }, ...healthFractionOptions],
  }), [catalogData]);

  const applyFilters = async () => {
    setIsLoading(true);
    setError('');
    try {
      setPreview(await getReportPreview(type, filters));
    } catch (requestError) {
      setError(requestError.message || 'No fue posible generar la vista previa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { applyFilters(); }, [type]);

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setFilters({});
    setPreview(null);
  };

  const handleExport = async (format) => {
    setIsExporting(format);
    setError('');
    try {
      await (format === 'csv' ? exportReportCsv(type, filters) : exportReportPdf(type, filters));
    } catch (requestError) {
      setError(requestError.message || 'No fue posible exportar el reporte.');
    } finally {
      setIsExporting('');
    }
  };

  const renderFilters = () => {
    if (type === 'orders') return <>
      <TextField label="Fecha desde" type="date" value={filters.dateFrom} onChange={(value) => updateFilter('dateFrom', value)} />
      <TextField label="Fecha hasta" type="date" value={filters.dateTo} onChange={(value) => updateFilter('dateTo', value)} />
      <SelectField label="Estado" value={filters.status} onChange={(value) => updateFilter('status', value)} options={[{ value: '', label: 'Todos' }, ...['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUPPLIED', 'CANCELLED'].map((value) => ({ value, label: value }))]} />
      <TextField label="Cliente" value={filters.client} onChange={(value) => updateFilter('client', value)} />
      <TextField label="Correo" value={filters.email} onChange={(value) => updateFilter('email', value)} />
      <TextField label="Folio" value={filters.folio} onChange={(value) => updateFilter('folio', value)} />
      <TextField label="Monto mínimo" type="number" value={filters.minAmount} onChange={(value) => updateFilter('minAmount', value)} />
      <TextField label="Monto máximo" type="number" value={filters.maxAmount} onChange={(value) => updateFilter('maxAmount', value)} />
      <SelectField label="Con descuento" value={filters.hasDiscount} onChange={(value) => updateFilter('hasDiscount', value)} options={yesNoOptions} />
      <SelectField label="Solo cancelados" value={filters.cancelled} onChange={(value) => updateFilter('cancelled', value)} options={yesNoOptions} />
      <SelectField label="Solo pendientes" value={filters.pending} onChange={(value) => updateFilter('pending', value)} options={yesNoOptions} />
      <SelectField label="Solo aprobados" value={filters.approved} onChange={(value) => updateFilter('approved', value)} options={yesNoOptions} />
    </>;
    if (type === 'products') return <>
      <SelectField label="Laboratorio" value={filters.laboratoryId} onChange={(value) => updateFilter('laboratoryId', value)} options={scopeOptions.laboratories} />
      <SelectField label="Categoría" value={filters.categoryId} onChange={(value) => updateFilter('categoryId', value)} options={scopeOptions.categories} />
      <SelectField label="Tipo" value={filters.productType} onChange={(value) => updateFilter('productType', value)} options={scopeOptions.types} />
      <SelectField label="Fracción sanitaria" value={filters.healthFraction} onChange={(value) => updateFilter('healthFraction', value)} options={scopeOptions.fractions} />
      <SelectField label="Activo" value={filters.isActive} onChange={(value) => updateFilter('isActive', value)} options={yesNoOptions} />
      <SelectField label="Tiene imagen" value={filters.hasImage} onChange={(value) => updateFilter('hasImage', value)} options={yesNoOptions} />
      <SelectField label="Tiene oferta" value={filters.hasOffer} onChange={(value) => updateFilter('hasOffer', value)} options={yesNoOptions} />
      <SelectField label="Stock bajo" value={filters.lowStock} onChange={(value) => updateFilter('lowStock', value)} options={yesNoOptions} />
      <SelectField label="Sin stock" value={filters.outOfStock} onChange={(value) => updateFilter('outOfStock', value)} options={yesNoOptions} />
      <TextField label="Precio mínimo" type="number" value={filters.minPrice} onChange={(value) => updateFilter('minPrice', value)} />
      <TextField label="Precio máximo" type="number" value={filters.maxPrice} onChange={(value) => updateFilter('maxPrice', value)} />
      <SelectField label="Requiere receta" value={filters.requiresPrescription} onChange={(value) => updateFilter('requiresPrescription', value)} options={yesNoOptions} />
      <SelectField label="Receta retenida" value={filters.requiresRetainedPrescription} onChange={(value) => updateFilter('requiresRetainedPrescription', value)} options={yesNoOptions} />
      <SelectField label="Controlado" value={filters.isControlled} onChange={(value) => updateFilter('isControlled', value)} options={yesNoOptions} />
    </>;
    if (type === 'inventory') return <>
      <SelectField label="Laboratorio" value={filters.laboratoryId} onChange={(value) => updateFilter('laboratoryId', value)} options={scopeOptions.laboratories} />
      <SelectField label="Categoría" value={filters.categoryId} onChange={(value) => updateFilter('categoryId', value)} options={scopeOptions.categories} />
      <SelectField label="Stock bajo" value={filters.lowStock} onChange={(value) => updateFilter('lowStock', value)} options={yesNoOptions} />
      <SelectField label="Sin stock" value={filters.outOfStock} onChange={(value) => updateFilter('outOfStock', value)} options={yesNoOptions} />
      <TextField label="Stock mayor a" type="number" value={filters.stockGreaterThan} onChange={(value) => updateFilter('stockGreaterThan', value)} />
      <TextField label="Stock menor a" type="number" value={filters.stockLessThan} onChange={(value) => updateFilter('stockLessThan', value)} />
      <SelectField label="Activo" value={filters.isActive} onChange={(value) => updateFilter('isActive', value)} options={yesNoOptions} />
    </>;
    if (type === 'offers') return <>
      <SelectField label="Activa" value={filters.isActive} onChange={(value) => updateFilter('isActive', value)} options={yesNoOptions} />
      <SelectField label="Vigencia" value={filters.validity} onChange={(value) => updateFilter('validity', value)} options={[{ value: '', label: 'Todas' }, { value: 'CURRENT', label: 'Vigente' }, { value: 'EXPIRED', label: 'Expirada' }, { value: 'SCHEDULED', label: 'Programada' }]} />
      <SelectField label="Producto" value={filters.productId} onChange={(value) => updateFilter('productId', value)} options={scopeOptions.products} />
      <SelectField label="Laboratorio" value={filters.laboratoryId} onChange={(value) => updateFilter('laboratoryId', value)} options={scopeOptions.laboratories} />
      <SelectField label="Categoría" value={filters.categoryId} onChange={(value) => updateFilter('categoryId', value)} options={scopeOptions.categories} />
      <SelectField label="Descuento" value={filters.discountType} onChange={(value) => updateFilter('discountType', value)} options={[{ value: '', label: 'Todos' }, { value: 'PERCENTAGE', label: 'Porcentaje' }, { value: 'FIXED_AMOUNT', label: 'Monto fijo' }]} />
      <TextField label="Fecha desde" type="date" value={filters.dateFrom} onChange={(value) => updateFilter('dateFrom', value)} />
      <TextField label="Fecha hasta" type="date" value={filters.dateTo} onChange={(value) => updateFilter('dateTo', value)} />
    </>;
    return <>
      <TextField label="Estado" value={filters.state} onChange={(value) => updateFilter('state', value)} />
      <TextField label="Ciudad" value={filters.city} onChange={(value) => updateFilter('city', value)} />
      <SelectField label="Autorizado" value={filters.isAuthorized} onChange={(value) => updateFilter('isAuthorized', value)} options={yesNoOptions} />
      <SelectField label="Licencia sanitaria" value={filters.hasSanitaryLicense} onChange={(value) => updateFilter('hasSanitaryLicense', value)} options={yesNoOptions} />
      <SelectField label="Cliente activo" value={filters.isActive} onChange={(value) => updateFilter('isActive', value)} options={yesNoOptions} />
    </>;
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div><p className={styles.eyebrow}>Administración</p><h1>Reportes e informes</h1><p>Consulta, filtra y exporta información operativa. Cada exportación queda registrada.</p></div>
      </div>
      <div className={styles.reportWorkspace}>
        <aside className={styles.reportFilters}>
          <label>Tipo de reporte<select value={type} onChange={(event) => handleTypeChange(event.target.value)}>{reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className={styles.reportFilterGrid}>{renderFilters()}</div>
          <div className={styles.reportActions}><button className={styles.primarySmall} type="button" onClick={applyFilters} disabled={isLoading}>{isLoading ? 'Aplicando...' : 'Aplicar filtros'}</button><button className={styles.secondarySmall} type="button" onClick={clearFilters}>Limpiar filtros</button></div>
        </aside>
        <div className={styles.reportResults}>
          <div className={styles.reportToolbar}><div><strong>{preview?.total ?? 0} registros</strong><p>{preview?.title || 'Vista previa del reporte'}</p></div><div className={styles.reportActions}><button className={styles.secondarySmall} type="button" onClick={() => handleExport('csv')} disabled={Boolean(isExporting)}>{isExporting === 'csv' ? 'Exportando...' : 'Exportar CSV'}</button><button className={styles.primarySmall} type="button" onClick={() => handleExport('pdf')} disabled={Boolean(isExporting)}>{isExporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}</button></div></div>
          {error ? <div className={styles.emptyState}><h2>No fue posible generar el reporte</h2><p>{error}</p></div> : isLoading ? <div className={styles.emptyState}><h2>Generando vista previa</h2><p>Estamos aplicando los filtros seleccionados.</p></div> : !preview?.rows.length ? <div className={styles.emptyState}><h2>No hay resultados</h2><p>Prueba con otros filtros para generar el informe.</p></div> : <div className={styles.tableWrapper}><table className={styles.reportTable}><thead><tr>{preview.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 12).map((row, index) => <tr key={index}>{preview.columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}</tr>)}</tbody></table></div>}
          {preview?.rows.length > 12 && <p className={styles.reportFootnote}>Vista previa limitada a 12 registros. La exportación incluye todos los resultados filtrados.</p>}
          <p className={styles.catalogNotice}>Las exportaciones se registran para control interno y no incluyen contraseñas, hashes ni sesiones.</p>
        </div>
      </div>
    </section>
  );
}
