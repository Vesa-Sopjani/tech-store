// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL;


// Helper function for API calls
export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('techstore_token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Auth API
export const authService = {
  login: async (credentials) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  verify: async () => {
    return apiRequest('/api/auth/verify');
  },

  logout: () => {
    localStorage.removeItem('techstore_token');
    localStorage.removeItem('techstore_user');
  },
};

// Products API
export const productService = {
  getAll: () => apiRequest('/api/products'),
  getById: (id) => apiRequest(`/api/products/${id}`),
  create: (product) => apiRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  update: (id, product) => apiRequest(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  delete: (id) => apiRequest(`/api/products/${id}`, {
    method: 'DELETE',
  }),
};

// Orders API
export const orderService = {
  getAll: () => apiRequest('/api/orders'),
  getById: (id) => apiRequest(`/api/orders/${id}`),
  create: (order) => apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }),
  getUserOrders: (userId) => apiRequest(`/api/orders/user/${userId}`),
};

export const categoryService = {
  getAll: () => apiRequest('/api/categories'),
  getById: (id) => apiRequest(`/api/categories/${id}`),
  getPopular: () => apiRequest('/api/categories/popular'), // ← vetëm kjo shtohet nëse do përdorësh "popular"
  create: (category) => apiRequest('/api/categories', {
    method: 'POST',
    body: JSON.stringify(category),
  }),
  update: (id, category) => apiRequest(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(category),
  }),
  delete: (id) => apiRequest(`/api/categories/${id}`, {
    method: 'DELETE',
  }),
};


// Add to your existing api.js
export const adminService = {
  getStatistics: () => apiRequest('/api/admin/statistics'),
  getRealtimeData: () => apiRequest('/api/admin/realtime'),
  getOrders: (params) => apiRequest(`/api/admin/orders?${new URLSearchParams(params)}`),
  updateOrderStatus: (orderId, status) => 
    apiRequest(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
  
  // Grafana specific
  getGrafanaDashboards: () => apiRequest('/api/grafana/dashboards'),
  getGrafanaMetrics: () => apiRequest('/api/grafana/metrics'),
};
// Users API (admin only)
export const userService = {
  getAll: () => apiRequest('/api/users'),
  getById: (id) => apiRequest(`/api/users/${id}`),
  update: (id, userData) => apiRequest(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  delete: (id) => apiRequest(`/api/users/${id}`, {
    method: 'DELETE',
  }),
};