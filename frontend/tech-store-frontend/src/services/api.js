const API_BASE_URL = 'http://localhost:5001'; // Përdor direkt

export const apiRequest = async (endpoint, options = {}) => {
  try {
    console.log(`🌐 API Request: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    console.log(`📨 Response status: ${response.status}`);
    
    const data = await response.json();
    console.log('📊 API Response:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
};

// Products API
export const productService = {
  getAll: () => apiRequest('/api/products'),
  getById: (id) => apiRequest(`/api/products/${id}`), // Ky ekziston
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
  getById: (id) => apiRequest(`/api/categories/${id}`),
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