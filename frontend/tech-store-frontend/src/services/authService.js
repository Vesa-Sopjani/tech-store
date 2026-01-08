// services/authService.js
import { 
  API_URL, 
  API_KEY, 
  OAUTH2_CONFIG,
  STORAGE_KEYS 
} from "../utils/constants";

/**
 * Authentication Service - MODIFIKUAR PËR COOKIES DHE LOOP FIX
 */

// Variablat për të kontrolluar request-et e përsëritura
let sessionCheckInProgress = false;
let userProfileCheckInProgress = false;
let lastSessionCheck = 0;
const SESSION_CHECK_COOLDOWN = 2000; // 2 sekonda ndërmjet kontrollimeve

// Auth state listeners për real-time updates
const authStateListeners = new Set();

// Debug function for Docker environments
const debugDockerRequest = (url, options) => {
  console.group('🐳 Docker Request Debug');
  console.log('🌐 API_URL from constants:', API_URL);
  console.log('🔗 Request URL:', url);
  console.log('📡 Origin:', window.location.origin);
  console.log('🍪 Document cookies:', document.cookie);
  console.log('🔧 Request options:', {
    method: options.method,
    credentials: options.credentials,
    mode: options.mode || 'cors',
    headers: options.headers,
    hasBody: !!options.body,
    bodyType: typeof options.body
  });
  
  if (options.body) {
    try {
      const parsedBody = JSON.parse(options.body);
      // Mask password for security
      const safeBody = { ...parsedBody };
      if (safeBody.password) {
        safeBody.password = '***' + (safeBody.password.length > 2 ? safeBody.password.slice(-2) : '**');
      }
      console.log('📦 Request body (masked):', safeBody);
    } catch (e) {
      console.log('📦 Request body (raw):', options.body);
    }
  }
  console.groupEnd();
};

// Get authentication headers for API requests
export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };
  
  return headers;
};

// Get authentication headers with credentials
export const getAuthHeadersWithCredentials = (additionalHeaders = {}) => {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...additionalHeaders
  };
};

// Ruaj user data në localStorage dhe notify listeners
export const setUserData = (userData) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    console.log('💾 User data stored in localStorage:', {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role
    });
    notifyAuthStateChange(); // Notify all listeners
  } catch (error) {
    console.error('Error storing user data:', error);
  }
};

// Subscribe to auth state changes
export const subscribeToAuthState = (callback) => {
  authStateListeners.add(callback);
  return () => authStateListeners.delete(callback);
};

// Notify all listeners when auth state changes
export const notifyAuthStateChange = () => {
  authStateListeners.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error('Error in auth state listener:', error);
    }
  });
};

export const oauth2Login = async (provider) => {
  try {
    const response = await fetch(`/api/auth/oauth/${provider}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`OAuth2 login failed for ${provider}`);
    }
    
    const data = await response.json();
    
    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No redirect URL received');
    }
    
  } catch (error) {
    console.error('❌ OAuth2 login error:', error);
    throw error;
  }
};

// Get user data
export const getUserData = () => {
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Clear all user data (logout) dhe notify listeners
export const clearUserData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    notifyAuthStateChange(); // Notify all listeners
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

// Check if user is authenticated (duke kontrolluar me server)
export const isAuthenticated = async () => {
  try {
    const response = await fetch(`/api/auth/validate`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
};

// Login me email/password - FIXED VERSION
export const login = async (identifier, password, captchaData = null) => {
  console.group('🔐 Login Process');
  
  try {
    // Debug environment - FIXED: Use import.meta.env
    console.log('🏷️ Environment Info:', {
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
      API_URL: API_URL,
      VITE_API_URL: import.meta.env.VITE_API_URL || 'Not set',
      isLocalhost: API_URL.includes('localhost') || API_URL.includes('127.0.0.1'),
      isDockerNetwork: API_URL.includes('backend:') || API_URL.includes('frontend:')
    });
    
    // Determine the best request format
    console.log('📋 Determining request format...');
    const isEmail = identifier.includes('@');
    console.log('📧 Identifier analysis:', {
      identifier,
      isEmail,
      length: identifier.length
    });
    
    // Create request body - Simple and clean
    let requestBody = {
      identifier: identifier.trim(),
      password: password
    };
    
    // For Docker debugging, check if we need email/username separately
    if (isEmail) {
      requestBody.email = identifier.trim();
    } else {
      requestBody.username = identifier.trim();
    }
    
    if (captchaData) {
      requestBody.captchaId = captchaData.id;
      requestBody.captchaText = captchaData.text;
      console.log('🛡️ CAPTCHA included in request');
    }
    
    // Create safe log version (mask password)
    const logBody = { ...requestBody };
    if (logBody.password) {
      logBody.password = '***' + (password.length > 2 ? password.slice(-2) : '**');
    }
    console.log('📤 Request body (masked):', logBody);
    console.log('📦 Request body structure:', Object.keys(requestBody));
    
    // Prepare fetch options
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Origin': window.location.origin,
        'X-Client-Time': new Date().toISOString()
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(requestBody)
    };
    
    // Debug the request
    debugDockerRequest(`/api/auth/login`, fetchOptions);
    
    console.log('📨 Sending login request...');
    const startTime = Date.now();
    
    const response = await fetch(`/api/auth/login`, fetchOptions);
    const responseTime = Date.now() - startTime;
    
    console.log('⏱️ Response time:', responseTime + 'ms');
    console.log('📨 Response status:', response.status, response.statusText);
    
    // Log response headers
    console.log('📋 Response headers:');
    const headers = {};
    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
      console.log(`  ${key}: ${value}`);
      
      if (key.toLowerCase() === 'set-cookie') {
        console.log('🍪 Set-Cookie detected:', value);
      }
    }
    
    // Handle response based on status
    if (!response.ok) {
      console.log('❌ Login request failed');
      
      let errorData;
      let errorMessage = `Login failed: ${response.status}`;
      
      try {
        errorData = await response.json();
        console.error('❌ Error response JSON:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        if (errorData.code === 'INVALID_CREDENTIALS') {
          errorMessage = 'Email/username ose fjalëkalim i gabuar';
        } else if (errorData.code === 'ACCOUNT_LOCKED') {
          errorMessage = 'Llogaria është bllokuar përkohësisht';
        } else if (errorData.code === 'TOO_MANY_ATTEMPTS') {
          errorMessage = 'Shumë tentativa të dështuara. Ju lutem prisni 15 minuta';
        }
      } catch (jsonError) {
        try {
          const text = await response.text();
          console.error('❌ Error response text:', text);
          errorMessage = text || errorMessage;
        } catch (textError) {
          console.error('❌ Could not read error response:', textError);
        }
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.headers = headers;
      error.responseTime = responseTime;
      
      throw error;
    }
    
    // SUCCESS - Parse response
    console.log('✅ Login successful!');
    const data = await response.json();
    console.log('📊 Response data keys:', Object.keys(data));
    
    if (data.user) {
      console.log('👤 User data received:', {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role
      });
      
      setUserData(data.user);
      
      if (data.token) {
        console.log('🔑 Token received:', data.token.substring(0, 20) + '...');
      }
      
      console.groupEnd();
      return data.user;
    } else if (data.data) {
      console.log('👤 User data (alternative format):', data.data);
      setUserData(data.data);
      console.groupEnd();
      return data.data;
    } else {
      console.warn('⚠️ No user data in response, but status was OK');
      console.groupEnd();
      throw new Error('No user data in successful response');
    }
    
  } catch (error) {
    console.error('❌ Login process failed:', {
      message: error.message,
      status: error.status,
      stack: error.stack?.split('\n')[0]
    });
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('🌐 Network error detected. Possible causes:');
      console.error('  1. Backend server is down');
      console.error('  2. CORS configuration issue');
      console.error('  3. Docker network misconfiguration');
      console.error('  4. Wrong API_URL:', API_URL);
      
      console.log('💡 Try running: docker-compose logs backend');
      console.log('💡 Check if backend is accessible:', `${API_URL}/api/health`);
    }
    
    console.groupEnd();
    throw error;
  }
};

// Alternative login with format detection
export const loginWithFormatDetection = async (identifier, password) => {
  console.log('🔄 Trying login with format detection...');
  
  const formats = [
    { identifier: identifier, password: password },
    { email: identifier, password: password },
    { username: identifier, password: password },
    { login: identifier, password: password }
  ];
  
  const formatNames = ['identifier', 'email', 'username', 'login'];
  
  for (let i = 0; i < formats.length; i++) {
    console.log(`🔄 Attempt ${i + 1}: ${formatNames[i]}`);
    
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formats[i])
      });
      
      console.log(`📨 Response for ${formatNames[i]}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success with format: ${formatNames[i]}`);
        
        if (data.user) {
          setUserData(data.user);
          return {
            user: data.user,
            formatUsed: formatNames[i]
          };
        }
      }
      
      if (i === formats.length - 1) {
        const errorText = await response.text();
        throw new Error(`All formats failed. Last error: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      console.log(`⚠️ Format ${formatNames[i]} failed:`, error.message);
      
      if (i === formats.length - 1) {
        throw new Error(`Login failed after trying ${formats.length} formats`);
      }
    }
  }
};

// Test Docker connectivity
export const testDockerConnectivity = async () => {
  console.group('🐳 Docker Connectivity Test');
  
  const tests = [
    { name: 'Health Check', url: '/api/health', method: 'GET' },
    { name: 'CORS Test', url: '/api/test-cors', method: 'GET' },
    { name: 'Cookies Test', url: '/api/debug/cookies', method: 'GET' },
    { name: 'Auth Test', url: '/api/auth/test', method: 'GET' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      
      const response = await fetch(`${API_URL}${test.url}`, {
        method: test.method,
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const result = {
        name: test.name,
        url: test.url,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      };
      
      if (response.ok) {
        try {
          const data = await response.json();
          result.data = data;
          console.log(`✅ ${test.name}: Success`, data);
        } catch {
          const text = await response.text();
          result.text = text;
          console.log(`✅ ${test.name}: Success (text)`, text);
        }
      } else {
        console.log(`❌ ${test.name}: Failed - ${response.status}`);
      }
      
      results.push(result);
      
    } catch (error) {
      console.log(`💥 ${test.name}: Error - ${error.message}`);
      results.push({
        name: test.name,
        url: test.url,
        error: error.message,
        ok: false
      });
    }
  }
  
  console.log('📊 Summary:');
  results.forEach(result => {
    console.log(`  ${result.ok ? '✅' : '❌'} ${result.name}: ${result.status || result.error}`);
  });
  
  console.groupEnd();
  return results;
};

// Register
export const register = async (userData) => {
  try {
    console.log('📝 Attempting registration...');
    
    console.log('📦 Registration data:', {
      email: userData.email,
      username: userData.username,
      hasPassword: !!userData.password
    });
    
    const response = await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    
    console.log('📨 Register response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
    
    const data = await response.json();
    console.log('✅ Registration successful:', data);
    
    if (data.user) {
      setUserData(data.user);
      return data;
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    throw error;
  }
};

// Logout
export const logout = async () => {
  try {
    console.log('🚪 Attempting logout...');
    
    const response = await fetch(`/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    console.log('📨 Logout response status:', response.status);
    
    clearUserData();
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Logout successful:', data);
      return data;
    }
    
    throw new Error('Logout failed');
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    clearUserData();
    throw error;
  }
};

// Refresh token
export const refreshAccessToken = async () => {
  try {
    console.log('🔄 Attempting token refresh...');
    
    const response = await fetch(`/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    
    console.log('📨 Refresh response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Token refresh failed:', error);
      throw new Error(error.message || 'Token refresh failed');
    }
    
    const data = await response.json();
    console.log('✅ Token refresh successful');
    
    return data;
    
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    throw error;
  }
};

// Fetch me auto-retry dhe token refresh
export const fetchWithAuth = async (url, options = {}) => {
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers
    }
  };
  
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await fetch(url, fetchOptions);
    
    if (response.status === 401) {
      console.log('⚠️ Token expired, attempting refresh...');
      
      try {
        await refreshAccessToken();
        
        console.log('🔄 Retrying request after token refresh...');
        const retryResponse = await fetch(url, fetchOptions);
        return retryResponse;
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed, redirecting to login...');
        clearUserData();
        window.location.href = '/login';
        throw refreshError;
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
    throw error;
  }
};

// Get current user profile
export const getCurrentUser = async () => {
  try {
    if (userProfileCheckInProgress) {
      console.log('⏳ User profile check already in progress, skipping...');
      throw new Error('Profile check in progress');
    }
    
    userProfileCheckInProgress = true;
    
    const response = await fetchWithAuth(`/api/users/profile`);
    
    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      setUserData(data.data);
      userProfileCheckInProgress = false;
      return data.data;
    }
    
    userProfileCheckInProgress = false;
    return null;
    
  } catch (error) {
    userProfileCheckInProgress = false;
    console.error('❌ Get user error:', error);
    throw error;
  }
};

// Check if user has role
export const hasRole = (role) => {
  const user = getUserData();
  return user && user.role === role;
};

// Check if user is admin
export const isAdmin = () => {
  return hasRole('admin');
};

// Validate session
export const validateSession = async () => {
  try {
    if (sessionCheckInProgress) {
      console.log('⏳ Session check already in progress, skipping...');
      return false;
    }
    
    const now = Date.now();
    if (now - lastSessionCheck < SESSION_CHECK_COOLDOWN) {
      console.log('⏳ Session check cooldown active, skipping...');
      return false;
    }
    
    sessionCheckInProgress = true;
    lastSessionCheck = now;
    
    const response = await fetch(`/api/auth/validate`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      try {
        const data = await response.json();
        if (data.user) {
          setUserData(data.user);
          sessionCheckInProgress = false;
          return true;
        }
      } catch (jsonError) {
        console.warn('Session validation JSON parse error:', jsonError);
        sessionCheckInProgress = false;
        return true;
      }
    }
    
    sessionCheckInProgress = false;
    return false;
    
  } catch (error) {
    sessionCheckInProgress = false;
    console.error('Session validation error:', error);
    return false;
  }
};

// Function to reset check flags
export const resetCheckFlags = () => {
  sessionCheckInProgress = false;
  userProfileCheckInProgress = false;
  lastSessionCheck = 0;
};

// Debounced session check
export const debouncedValidateSession = (() => {
  let timeoutId = null;
  
  return async () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await validateSession();
        resolve(result);
      }, 300);
    });
  };
})();

// Check if user is logged in
export const isLoggedIn = () => {
  return !!getUserData();
};

// Simplified session check
export const quickSessionCheck = async () => {
  try {
    const response = await fetch(`/api/auth/validate`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      try {
        const data = await response.json();
        if (data.user) {
          setUserData(data.user);
          return true;
        }
      } catch {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Quick session check error:', error);
    return false;
  }
};

// Update user data partially
export const updateUserData = (updates) => {
  const currentUser = getUserData();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...updates };
    setUserData(updatedUser);
    return updatedUser;
  }
  return null;
};

// ✅ CORRECT DEFAULT EXPORT - NO EXTRA RETURN STATEMENTS
export default {
  getAuthHeaders,
  getAuthHeadersWithCredentials,
  setUserData,
  getUserData,
  clearUserData,
  isAuthenticated,
  login,
  loginWithFormatDetection,
  testDockerConnectivity,
  register,
  logout,
  refreshAccessToken,
  fetchWithAuth,
  getCurrentUser,
  hasRole,
  isAdmin,
  validateSession,
  debouncedValidateSession,
  resetCheckFlags,
  subscribeToAuthState,
  notifyAuthStateChange,
  isLoggedIn,
  quickSessionCheck,
  updateUserData
};