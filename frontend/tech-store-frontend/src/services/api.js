// services/api.js
const API_BASE_URL = 'http://localhost:5001';

export const apiRequest = async (endpoint, options = {}) => {
  try {
    console.log(`🌐 API Request: ${API_BASE_URL}${endpoint}`, options.method || 'GET');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};

// Products API
export const productService = {
  getAll: () => apiRequest('/api/products'),
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

// Categories API
export const categoryService = {
  getAll: () => apiRequest('/api/categories'),
};