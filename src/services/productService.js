import { products as fallbackProducts } from '../data/products.js';
import { apiClient, shouldUseLocalFallback } from './apiClient.js';

export const productTypeOptions = [
  { value: 'MEDICINE', label: 'Medicamento' },
  { value: 'GENERIC', label: 'Genérico' },
  { value: 'OTC', label: 'OTC' },
  { value: 'RX', label: 'RX' },
  { value: 'HEALING_MATERIAL', label: 'Material de curación' },
  { value: 'SUPPLEMENT', label: 'Suplemento' },
  { value: 'PERFUMERY', label: 'Perfumería' },
  { value: 'NATURISM', label: 'Naturismo' },
  { value: 'MEDICAL_SUPPLY', label: 'Insumo médico' },
];

export const healthFractionOptions = [
  { value: 'NOT_APPLICABLE', label: 'No aplica' },
  { value: 'FRACTION_I', label: 'Fracción I' },
  { value: 'FRACTION_II', label: 'Fracción II' },
  { value: 'FRACTION_III', label: 'Fracción III' },
  { value: 'FRACTION_IV', label: 'Fracción IV' },
  { value: 'FRACTION_V', label: 'Fracción V' },
  { value: 'FRACTION_VI', label: 'Fracción VI' },
];

const classificationByProductType = {
  MEDICINE: 'Medicamento',
  GENERIC: 'Genérico',
  OTC: 'OTC',
  RX: 'RX',
  HEALING_MATERIAL: 'Material de curación',
  SUPPLEMENT: 'Suplemento',
  PERFUMERY: 'Perfumería',
  NATURISM: 'Naturismo',
  MEDICAL_SUPPLY: 'Material de curación',
};

function getAvailability(stock) {
  if (stock <= 0) return { status: 'out', label: 'Sin existencia' };
  if (stock <= 30) return { status: 'low', label: 'Existencia limitada' };
  return { status: 'available', label: 'Disponible' };
}

export function mapApiProduct(product) {
  if (product.name) {
    return {
      ...product,
      isActive: product.isActive !== false,
      healthFraction: product.healthFraction || 'NOT_APPLICABLE',
      productType: product.productType || product.type || '',
    };
  }

  const availability = getAvailability(product.stock);
  return {
    ...product,
    name: product.commercialName,
    laboratoryName: product.laboratory?.name || '',
    category: product.category?.name || '',
    type: product.productTypeLabel || product.productType,
    classification: classificationByProductType[product.productType] || product.productTypeLabel,
    availabilityStatus: availability.status,
    availability: availability.label,
    image: product.imageUrl || null,
  };
}

function filterFallbackProducts(params = {}) {
  return fallbackProducts.filter((product) => {
    if (params.includeInactive === 'true') return true;
    return true;
  });
}

export async function getProducts(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

  try {
    const response = await apiClient(`/products${searchParams.size ? `?${searchParams}` : ''}`);
    return response.products.map(mapApiProduct);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return filterFallbackProducts(params);
    throw error;
  }
}

export async function getProduct(id) {
  try {
    const response = await apiClient(`/products/${id}`);
    return mapApiProduct(response.product);
  } catch (error) {
    if (shouldUseLocalFallback(error)) return fallbackProducts.find((product) => product.id === id) || null;
    throw error;
  }
}

function createProductRequestBody(product) {
  if (!product.imageFile) return product;

  const formData = new FormData();
  Object.entries(product).forEach(([key, value]) => {
    if (key === 'imageFile' || value === undefined || value === null) return;
    formData.append(key, String(value));
  });
  formData.append('image', product.imageFile);
  return formData;
}

export async function createProduct(product) {
  const response = await apiClient('/products', {
    method: 'POST',
    body: createProductRequestBody(product),
  });
  return mapApiProduct(response.product);
}

export async function updateProduct(id, product) {
  const response = await apiClient(`/products/${id}`, {
    method: 'PUT',
    body: createProductRequestBody(product),
  });
  return mapApiProduct(response.product);
}

export async function updateProductStatus(id, isActive) {
  const response = await apiClient(`/products/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  });
  return mapApiProduct(response.product);
}
