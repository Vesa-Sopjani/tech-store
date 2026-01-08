// frontend/src/services/api.js
import { fetchWithAuth } from './authService';

const API_BASE = '/api';

// Dashboard API calls
export const dashboardAPI = {
  getStats: () => fetchWithAuth(`${API_BASE}/admin/dashboard/stats`),
  getRecentOrders: () => fetchWithAuth(`${API_BASE}/admin/orders/recent`),
  getTopProducts: () => fetchWithAuth(`${API_BASE}/admin/products/top`),
  getSalesData: (days) => fetchWithAuth(`${API_BASE}/admin/sales/last-${days}-days`),
  getCategoryDistribution: () => fetchWithAuth(`${API_BASE}/admin/categories/distribution`)
};

// Products API calls
export const productsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`${API_BASE}/admin/products${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchWithAuth(`${API_BASE}/admin/products/${id}`),
  create: (data) => fetchWithAuth(`${API_BASE}/admin/products`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => fetchWithAuth(`${API_BASE}/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => fetchWithAuth(`${API_BASE}/admin/products/${id}`, {
    method: 'DELETE'
  })
};

// Categories API calls
export const categoriesAPI = {
  getAll: () => fetchWithAuth(`${API_BASE}/admin/categories`),
  create: (data) => fetchWithAuth(`${API_BASE}/admin/categories`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => fetchWithAuth(`${API_BASE}/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => fetchWithAuth(`${API_BASE}/admin/categories/${id}`, {
    method: 'DELETE'
  })
};

// Users API calls
export const usersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`${API_BASE}/admin/users${query ? `?${query}` : ''}`);
  },
  getStats: () => fetchWithAuth(`${API_BASE}/admin/users/stats`),
  create: (data) => fetchWithAuth(`${API_BASE}/admin/users`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => fetchWithAuth(`${API_BASE}/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => fetchWithAuth(`${API_BASE}/admin/users/${id}`, {
    method: 'DELETE'
  }),
  lock: (id) => fetchWithAuth(`${API_BASE}/admin/users/${id}/lock`, {
    method: 'POST'
  }),
  unlock: (id) => fetchWithAuth(`${API_BASE}/admin/users/${id}/unlock`, {
    method: 'POST'
  })
};

// Orders API calls
export const ordersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`${API_BASE}/admin/orders${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchWithAuth(`${API_BASE}/admin/orders/${id}`),
  getStats: () => fetchWithAuth(`${API_BASE}/admin/orders/stats`),
  updateStatus: (id, status) => fetchWithAuth(`${API_BASE}/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  }),
  updatePayment: (id, paymentStatus) => fetchWithAuth(`${API_BASE}/admin/orders/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify({ payment_status: paymentStatus })
  }),
  delete: (id) => fetchWithAuth(`${API_BASE}/admin/orders/${id}`, {
    method: 'DELETE'
  })
};