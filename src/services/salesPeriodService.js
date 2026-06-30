const API = import.meta.env.VITE_API_URL || '';

export async function getSalesPeriods(type = 'MONTHLY', limit = 12) {
  const res = await fetch(`${API}/api/admin/sales-periods?type=${type}&limit=${limit}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Error al cargar los períodos de ventas.');
  }
  return res.json();
}

export async function refreshSalesPeriods() {
  const res = await fetch(`${API}/api/admin/sales-periods/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Error al actualizar los períodos.');
  }
  return res.json();
}
