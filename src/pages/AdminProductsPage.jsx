import { useEffect, useMemo, useState } from 'react';
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
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getFormValues(product) {
  return {
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

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    query: '',
    laboratoryId: '',
    categoryId: '',
    healthFraction: '',
    productType: '',
    status: 'all',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const visibleProducts = useMemo(() => {
    const query = normalizeText(filters.query.trim());

    return products.filter((product) => {
      const textMatches =
        !query ||
        [product.sku, product.name, product.commercialName, product.activeIngredient, product.laboratoryName]
          .filter(Boolean)
          .map(normalizeText)
          .some((value) => value.includes(query));
      const statusMatches =
        filters.status === 'all' ||
        (filters.status === 'active' && product.isActive) ||
        (filters.status === 'inactive' && !product.isActive);

      return (
        textMatches &&
        (!filters.laboratoryId || product.laboratoryId === filters.laboratoryId) &&
        (!filters.categoryId || product.categoryId === filters.categoryId) &&
        (!filters.healthFraction || product.healthFraction === filters.healthFraction) &&
        (!filters.productType || product.productType === filters.productType) &&
        statusMatches
      );
    });
  }, [filters, products]);

  const updateForm = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleImageFileChange = (event) => {
    const [file] = event.target.files;
    setImageFile(file || null);

    if (!file) {
      setImagePreview(form.imageUrl || '');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => setImagePreview(String(reader.result || '')));
    reader.readAsDataURL(file);
  };

  const handleImageUrlChange = (value) => {
    updateForm('imageUrl', value);
    if (!imageFile) setImagePreview(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number.parseInt(form.stock, 10),
        imageFile,
      };
      const product = editingId
        ? await updateProduct(editingId, payload)
        : await createProduct(payload);

      setProducts((currentProducts) => {
        const remainingProducts = currentProducts.filter((currentProduct) => currentProduct.id !== product.id);
        return [product, ...remainingProducts].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSuccess(editingId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
      setEditingId(null);
      setForm(emptyProduct);
      setImageFile(null);
      setImagePreview('');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm(getFormValues(product));
    setImageFile(null);
    setImagePreview(product.image || product.imageUrl || '');
    setError('');
    setSuccess('');
  };

  const handleToggleStatus = async (product) => {
    setError('');
    try {
      const updatedProduct = await updateProductStatus(product.id, !product.isActive);
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === updatedProduct.id ? updatedProduct : currentProduct,
        ),
      );
      setSuccess(updatedProduct.isActive ? 'Producto activado.' : 'Producto desactivado.');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar el estado.');
    }
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Administración</p>
          <h1>Productos</h1>
          <p>Administra catálogo, disponibilidad y campos regulatorios desde la API.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => loadData()}>
          Actualizar listado
        </button>
      </div>

      <div className={styles.adminProductWorkspace}>
        <div>
          <div className={styles.adminProductFilters}>
            <label>
              Buscar
              <input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Nombre, SKU, laboratorio o activo"
              />
            </label>
            <label>
              Laboratorio
              <select
                value={filters.laboratoryId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, laboratoryId: event.target.value }))
                }
              >
                <option value="">Todos</option>
                {laboratories.map((laboratory) => (
                  <option key={laboratory.id} value={laboratory.id}>
                    {laboratory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoría
              <select
                value={filters.categoryId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fracción sanitaria
              <select
                value={filters.healthFraction}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, healthFraction: event.target.value }))
                }
              >
                <option value="">Todas</option>
                {healthFractionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={filters.productType}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, productType: event.target.value }))
                }
              >
                <option value="">Todos</option>
                {productTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </label>
          </div>

          {error && <p className={styles.formError}>{error}</p>}
          {success && <p className={styles.formSuccess}>{success}</p>}

          {isLoading ? (
            <div className={styles.emptyState}>
              <h2>Cargando productos</h2>
              <p>Estamos consultando la base de datos.</p>
            </div>
          ) : (
            <div className={styles.adminProductList}>
              {visibleProducts.map((product) => (
                <article className={styles.adminProductRow} key={product.id}>
                  <div>
                    <span className={product.isActive ? styles.statusPill : styles.inactivePill}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <h2>{product.name}</h2>
                    <p>{product.sku}</p>
                    <p>
                      {product.laboratoryName} - {product.category}
                    </p>
                  </div>
                  <div className={styles.adminProductMeta}>
                    <span>{product.productTypeLabel || product.type}</span>
                    <span>{product.healthFraction || 'No aplica'}</span>
                    <strong>${Number(product.price).toFixed(2)}</strong>
                    <span>Stock {product.stock}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.secondarySmall} type="button" onClick={() => handleEdit(product)}>
                      Editar
                    </button>
                    <button
                      className={product.isActive ? styles.secondarySmall : styles.primarySmall}
                      type="button"
                      onClick={() => handleToggleStatus(product)}
                    >
                      {product.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </article>
              ))}
              {!visibleProducts.length && (
                <div className={styles.emptyState}>
                  <h2>No hay productos con esos filtros</h2>
                </div>
              )}
            </div>
          )}
        </div>

        <form className={styles.adminProductForm} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <h2>{editingId ? 'Editar producto' : 'Crear producto'}</h2>
            {editingId && (
              <button
                className={styles.textButton}
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyProduct);
                  setImageFile(null);
                  setImagePreview('');
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>
          <div className={styles.adminProductFormGrid}>
            <label>
              SKU
              <input value={form.sku} onChange={(event) => updateForm('sku', event.target.value)} required />
            </label>
            <label>
              Nombre comercial
              <input
                value={form.commercialName}
                onChange={(event) => updateForm('commercialName', event.target.value)}
                required
              />
            </label>
            <label>
              Denominación genérica
              <input
                value={form.genericName}
                onChange={(event) => updateForm('genericName', event.target.value)}
                required
              />
            </label>
            <label>
              Principio activo
              <input
                value={form.activeIngredient}
                onChange={(event) => updateForm('activeIngredient', event.target.value)}
                required
              />
            </label>
            <label>
              Laboratorio
              <select
                value={form.laboratoryId}
                onChange={(event) => updateForm('laboratoryId', event.target.value)}
                required
              >
                <option value="">Selecciona un laboratorio</option>
                {laboratories.filter((laboratory) => laboratory.isActive !== false).map((laboratory) => (
                  <option key={laboratory.id} value={laboratory.id}>
                    {laboratory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoría
              <select
                value={form.categoryId}
                onChange={(event) => updateForm('categoryId', event.target.value)}
                required
              >
                <option value="">Selecciona una categoría</option>
                {categories.filter((category) => category.isActive !== false).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Forma farmacéutica
              <input
                value={form.pharmaceuticalForm}
                onChange={(event) => updateForm('pharmaceuticalForm', event.target.value)}
                required
              />
            </label>
            <label>
              Concentración
              <input
                value={form.concentration}
                onChange={(event) => updateForm('concentration', event.target.value)}
                required
              />
            </label>
            <label>
              Presentación
              <input
                value={form.presentation}
                onChange={(event) => updateForm('presentation', event.target.value)}
                required
              />
            </label>
            <label>
              Registro sanitario
              <input
                value={form.sanitaryRegistration}
                onChange={(event) => updateForm('sanitaryRegistration', event.target.value)}
              />
            </label>
            <label>
              Fracción sanitaria
              <select
                value={form.healthFraction}
                onChange={(event) => updateForm('healthFraction', event.target.value)}
              >
                {healthFractionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo de producto
              <select value={form.productType} onChange={(event) => updateForm('productType', event.target.value)}>
                {productTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Precio
              <input
                min="0"
                step="0.01"
                type="number"
                value={form.price}
                onChange={(event) => updateForm('price', event.target.value)}
                required
              />
            </label>
            <label>
              Stock
              <input
                min="0"
                type="number"
                value={form.stock}
                onChange={(event) => updateForm('stock', event.target.value)}
                required
              />
            </label>
            <label>
              Imagen URL
              <input value={form.imageUrl} onChange={(event) => handleImageUrlChange(event.target.value)} />
            </label>
            <label>
              Subir imagen
              <input
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                type="file"
                onChange={handleImageFileChange}
              />
            </label>
          </div>
          {imagePreview && (
            <div className={styles.productImagePreview}>
              <img src={imagePreview} alt="Vista previa del producto" />
            </div>
          )}
          <div className={styles.adminProductChecks}>
            <label>
              <input
                type="checkbox"
                checked={form.requiresPrescription}
                onChange={(event) => updateForm('requiresPrescription', event.target.checked)}
              />
              Requiere receta
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.requiresRetainedPrescription}
                onChange={(event) => updateForm('requiresRetainedPrescription', event.target.checked)}
              />
              Requiere receta retenida
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isControlled}
                onChange={(event) => updateForm('isControlled', event.target.checked)}
              />
              Producto controlado
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm('isActive', event.target.checked)}
              />
              Activo
            </label>
          </div>
          <label>
            Descripción informativa
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              required
            />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando producto...' : editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </form>
      </div>
    </section>
  );
}
