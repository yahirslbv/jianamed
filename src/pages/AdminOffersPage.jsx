import { useEffect, useMemo, useState } from 'react';
import { getCategories } from '../services/categoryService.js';
import { getLaboratories } from '../services/laboratoryService.js';
import {
  createOffer,
  getOffers,
  updateOffer,
  updateOfferStatus,
} from '../services/offerService.js';
import { getProducts, productTypeOptions } from '../services/productService.js';
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
  const scopeValue = offer[scopeType] || '';

  return {
    title: offer.title,
    description: offer.description || '',
    discountType: offer.discountType,
    discountValue: String(offer.discountValue),
    startsAt: new Date(offer.startsAt).toISOString().slice(0, 16),
    endsAt: new Date(offer.endsAt).toISOString().slice(0, 16),
    scopeType,
    scopeValue,
    isActive: offer.isActive,
  };
}

function getDiscountLabel(offer) {
  return offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : `$${offer.discountValue}`;
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyOffer);
  const [editingId, setEditingId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const scopeOptions = useMemo(() => {
    if (form.scopeType === 'productId') return products;
    if (form.scopeType === 'laboratoryId') return laboratories;
    if (form.scopeType === 'categoryId') return categories;
    return productTypeOptions;
  }, [categories, form.scopeType, laboratories, products]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');

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
    } catch (requestError) {
      setError(requestError.message || 'No fue posible cargar las ofertas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleScopeTypeChange = (scopeType) => {
    setForm((current) => ({ ...current, scopeType, scopeValue: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
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
      const savedOffer = editingId
        ? await updateOffer(editingId, payload)
        : await createOffer(payload);
      setOffers((current) => {
        const remaining = current.filter((offer) => offer.id !== savedOffer.id);
        return [savedOffer, ...remaining];
      });
      setSuccess(editingId ? 'Oferta actualizada.' : 'Oferta creada.');
      setEditingId('');
      setForm(emptyOffer());
    } catch (requestError) {
      setError(requestError.message || 'No fue posible guardar la oferta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (offer) => {
    setEditingId(offer.id);
    setForm(getFormValues(offer));
    setError('');
    setSuccess('');
  };

  const handleToggleStatus = async (offer) => {
    setError('');
    try {
      const updatedOffer = await updateOfferStatus(offer.id, !offer.isActive);
      setOffers((current) => current.map((item) => (item.id === updatedOffer.id ? updatedOffer : item)));
      setSuccess(updatedOffer.isActive ? 'Oferta activada.' : 'Oferta desactivada.');
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar la oferta.');
    }
  };

  return (
    <section className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.privateHeader}>
        <div>
          <p className={styles.eyebrow}>Administracion</p>
          <h1>Ofertas</h1>
          <p>Define una condicion comercial por producto, laboratorio, categoria o tipo.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadData}>
          Actualizar listado
        </button>
      </div>

      {error && <p className={styles.formError}>{error}</p>}
      {success && <p className={styles.addedMessage}>{success}</p>}

      <div className={styles.adminProductWorkspace}>
        <div>
          {isLoading ? (
            <div className={styles.emptyState}>
              <h2>Cargando ofertas</h2>
            </div>
          ) : (
            <div className={styles.adminOfferList}>
              {offers.map((offer) => (
                <article className={styles.adminOfferRow} key={offer.id}>
                  <div>
                    <span className={offer.isActive ? styles.offerTag : styles.inactiveTag}>
                      {offer.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    <h2>{offer.title}</h2>
                    <p>{offer.scope.label} - {getDiscountLabel(offer)}</p>
                  </div>
                  <div className={styles.adminOfferActions}>
                    <button className={styles.secondarySmall} type="button" onClick={() => handleEdit(offer)}>
                      Editar
                    </button>
                    <button className={styles.textButton} type="button" onClick={() => handleToggleStatus(offer)}>
                      {offer.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </article>
              ))}
              {!offers.length && <div className={styles.emptyState}><h2>No hay ofertas registradas</h2></div>}
            </div>
          )}
        </div>

        <form className={styles.adminProductForm} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <h2>{editingId ? 'Editar oferta' : 'Crear oferta'}</h2>
            {editingId && (
              <button className={styles.textButton} type="button" onClick={() => { setEditingId(''); setForm(emptyOffer()); }}>
                Cancelar edicion
              </button>
            )}
          </div>
          <div className={styles.adminProductFormGrid}>
            <label>
              Titulo
              <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} required />
            </label>
            <label>
              Tipo de descuento
              <select value={form.discountType} onChange={(event) => updateForm('discountType', event.target.value)}>
                <option value="PERCENTAGE">Porcentaje</option>
                <option value="FIXED_AMOUNT">Monto fijo</option>
              </select>
            </label>
            <label>
              Valor
              <input min="0.01" step="0.01" type="number" value={form.discountValue} onChange={(event) => updateForm('discountValue', event.target.value)} required />
            </label>
            <label>
              Alcance
              <select value={form.scopeType} onChange={(event) => handleScopeTypeChange(event.target.value)}>
                <option value="productId">Producto</option>
                <option value="laboratoryId">Laboratorio</option>
                <option value="categoryId">Categoria</option>
                <option value="productType">Tipo de producto</option>
              </select>
            </label>
            <label>
              {form.scopeType === 'productId' ? 'Producto' : form.scopeType === 'laboratoryId' ? 'Laboratorio' : form.scopeType === 'categoryId' ? 'Categoria' : 'Tipo'}
              <select value={form.scopeValue} onChange={(event) => updateForm('scopeValue', event.target.value)} required>
                <option value="">Selecciona una opcion</option>
                {scopeOptions.map((option) => (
                  <option key={option.id || option.value} value={option.id || option.value}>
                    {option.name || option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Inicio
              <input type="datetime-local" value={form.startsAt} onChange={(event) => updateForm('startsAt', event.target.value)} required />
            </label>
            <label>
              Fin
              <input type="datetime-local" value={form.endsAt} onChange={(event) => updateForm('endsAt', event.target.value)} required />
            </label>
          </div>
          <label>
            Descripcion
            <textarea rows="4" value={form.description} onChange={(event) => updateForm('description', event.target.value)} />
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} />
            Activa
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear oferta'}
          </button>
        </form>
      </div>
    </section>
  );
}
