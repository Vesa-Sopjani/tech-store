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
    const response = await fetch(`${API_URL}/api/auth/oauth/${provider}`, {
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
    const response = await fetch(`${API_URL}/api/auth/validate`, {
      method: 'GET',
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
};

// Login me email/password - ME RETRY LIMIT
// authService.js - në funksionin login
export const login = async (identifier, password, captchaData = null) => {
  try {
    // ✅ Krijo request body
    let requestBody = {
      identifier: identifier,
      password: password
    };
    
    // ✅ Shto email si fallback nëse identifier është email
    if (identifier.includes('@')) {
      requestBody.email = identifier;
    } else {
      requestBody.username = identifier;
    }
    
    if (captchaData) {
      requestBody.captchaId = captchaData.id;
      requestBody.captchaText = captchaData.text;
    }
    
    console.log('🔐 Attempting login...');
    
    // ✅ MOS shfaq password në log!
    console.log('📤 Sending data:', { 
      identifier: identifier,
      hasPassword: !!password, // Vetëm trego nëse ka password
      passwordLength: password?.length, // Vetëm gjatësia
      isEmail: identifier.includes('@')
    });
    
    // ✅ Ose përdor mask për password
    const maskedRequestBody = {
      ...requestBody,
      password: '***' + (password ? password.slice(-2) : '') // Shfaq vetëm 2 karakteret e fundit
    };
    console.log('📤 Sending data (masked):', maskedRequestBody);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(requestBody) // ✅ Kjo përmban password të plotë
    });
    
    console.log('📨 Login response status:', response.status);
    
    
    if (!response.ok) {
      let errorMessage = 'Login failed';
      
      try {
        const errorData = await response.json();
        console.error('❌ Login failed with data:', errorData);
        errorMessage = errorData.message || `Login failed with status: ${response.status}`;
      } catch (parseError) {
        const errorText = await response.text();
        console.error('❌ Login failed with text:', errorText);
        errorMessage = `Login failed with status: ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ Login successful:', data);
    
    if (data.user) {
      setUserData(data.user);
      return data.user;
    }
    
    throw new Error('User data not received');
    
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

// Register
export const register = async (userData) => {
  try {
    console.log('📝 Attempting registration...');
    
    const response = await fetch(`${API_URL}/api/auth/register`, {
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
    
    const response = await fetch(`${API_URL}/api/auth/logout`, {
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

// Refresh token - ME COOLDOWN
export const refreshAccessToken = async () => {
  try {
    console.log('🔄 Attempting token refresh...');
    
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
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

// Fetch me auto-retry dhe token refresh - ME RATE LIMITING
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
    
    // Nëse tokeni ka skaduar (401), provo refresh
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

export const getCachedUser = () => {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting cached user:', error);
    return null;
  }
};

// Get current user profile - ME ANTI-LOOP PROTECTION
export const getCurrentUser = async (forceRefresh = false) => {
  try {
    // Nëse nuk kërkohet refresh dhe ka cache, ktheje atë
    if (!forceRefresh) {
      const cachedUser = getCachedUser();
      if (cachedUser) {
        console.log('📦 Using cached user data');
        return cachedUser;
      }
    }
    
    userProfileCheckInProgress = true;
    
    const response = await fetchWithAuth(`${API_URL}/api/users/profile`);
    
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
    // Nëse dështon, provo cache
    const cachedUser = getCachedUser();
    if (cachedUser) {
      console.warn('⚠️ Using cached user due to error:', error.message);
      return cachedUser;
    }
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

// Validate session - ME ANTI-LOOP PROTECTION
export const validateSession = async () => {
  try {
    // Nëse tashmë po bëhet një kontroll, mos e përsërit
    if (sessionCheckInProgress) {
      console.log('⏳ Session check already in progress, skipping...');
      return false;
    }
    
    // Cooldown check: mos lejo shumë kontrollime të shpejta
    const now = Date.now();
    if (now - lastSessionCheck < SESSION_CHECK_COOLDOWN) {
      console.log('⏳ Session check cooldown active, skipping...');
      return false;
    }
    
    sessionCheckInProgress = true;
    lastSessionCheck = now;
    
    const response = await fetch(`${API_URL}/api/auth/validate`, {
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
        // Nëse response.ok është true por nuk mund të parse JSON,
        // e konsiderojmë valid session
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

// Function to reset check flags (për debug)
export const resetCheckFlags = () => {
  sessionCheckInProgress = false;
  userProfileCheckInProgress = false;
  lastSessionCheck = 0;
};

// Debounced session check (për useEffect në komponentë)
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
      }, 300); // 300ms debounce
    });
  };
})();

// Check if user is logged in (synchronously from localStorage)
export const isLoggedIn = () => {
  return !!getUserData();
};

// Simplified session check without cooldown (for AuthContext)
export const quickSessionCheck = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/validate`, {
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
        // Nëse nuk mund të parse JSON por statusi është OK
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

// Export all functions
export default {
  getAuthHeaders,
  getAuthHeadersWithCredentials,
  setUserData,
  getUserData,
  clearUserData,
  isAuthenticated,
  login,
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