// frontend/src/services/apiService.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003';

/**
 * Generic fetch wrapper with error handling
 */
const fetchWrapper = async (endpoint, options = {}) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`API Request [${requestId}]:`, {
      endpoint: `${API_BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      body: options.body
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    // Log response status
    console.log(`API Response [${requestId}]:`, {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    let responseData;
    try {
      responseData = await response.json();
      console.log(`API Response Data [${requestId}]:`, responseData);
    } catch (parseError) {
      console.error(`API Response Parse Error [${requestId}]:`, parseError);
      throw new Error(`Invalid JSON response from server: ${response.statusText}`);
    }

    // Check if response is OK
    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error(`API Error [${requestId}]:`, error);
    throw error;
  }
};

// CAPTCHA API
export const captchaAPI = {
  generate: () => fetchWrapper('/api/captcha/generate', {
    method: 'GET',
  }),
  
  verify: (id, input) => fetchWrapper('/api/captcha/verify', {
    method: 'POST',
    body: JSON.stringify({ id, input }),
  }),
};

// Auth API
export const authAPI = {
  login: (credentials) => fetchWrapper('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  register: (userData) => fetchWrapper('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  profile: () => fetchWrapper('/api/users/profile'),
};

// Events API
export const eventsAPI = {
  publish: (eventData) => fetchWrapper('/api/events/publish', {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),
};

// Audit API
export const auditAPI = {
  log: (auditData) => fetchWrapper('/api/audit/log', {
    method: 'POST',
    body: JSON.stringify(auditData),
  }),
};

export default fetchWrapper;