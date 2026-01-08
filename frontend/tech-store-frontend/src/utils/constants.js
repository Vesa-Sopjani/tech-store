// utils/constants.js

// API URLs - Sigurohu që backend-i dhe frontend-i të kenë portet e duhura
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

// API Keys (vendosni në .env file në prodhim)
export const API_KEY = import.meta.env.VITE_API_KEY || 'dev-api-key-12345';
export const CAPTCHA_API_KEY = import.meta.env.VITE_CAPTCHA_API_KEY || 'captcha-dev-key';

// OAuth2 Configuration
export const OAUTH2_CONFIG = {
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
  MICROSOFT_CLIENT_ID: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
  REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI || `${FRONTEND_URL}/oauth/callback`
};

// CAPTCHA Configuration
export const CAPTCHA_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  RETRY_LIMIT: 3,
  MAX_ATTEMPTS: 5
};

// Password Requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  MAX_LENGTH: 128
};

// JWT Configuration - Vetëm për referencë, nuk përdoren direkt në frontend
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  // Këto sekrete përdoren VETËM në backend
  // Në frontend nuk duhet të kemi sekretet!
};

// Rate Limiting
export const RATE_LIMIT = {
  MAX_REQUESTS: 100,
  WINDOW_MS: 15 * 60 * 1000 // 15 minutes
};

// Roles
export const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support'
};

// Status Codes
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// Validation Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-]{8,15}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// ============== ⚠️ NDRYSHIM KRYESOR ==============
// Storage Keys - VETËM PËR USER DATA, JO PËR TOKENA
// Tokenat ruhen në cookies (httpOnly) nga serveri
export const STORAGE_KEYS = {
  // NUK ruajmë tokena në localStorage!
  // ACCESS_TOKEN dhe REFRESH_TOKEN janë në cookies
  USER_DATA: 'tech_store_user_data',    // Vetëm user info
  CART_ITEMS: 'cart_items',             // Shporta
  THEME: 'theme',                       // Theme preference
  LANGUAGE: 'language',                 // Gjuha
  CAPTCHA_CACHE: 'captcha_cache',       // Cache për CAPTCHA
  SESSION_ID: 'session_id'              // Session ID për analytics
};

// Cookie Names - Për referencë
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',    // Vendoset nga serveri (httpOnly)
  REFRESH_TOKEN: 'refreshToken',  // Vendoset nga serveri (httpOnly)
};

// ============== 🌐 COOKIES & AUTH CONFIG ==============
export const AUTH_CONFIG = {
  // Cookies do të dërgohen automatikisht me credentials: 'include'
  // Nuk nevojitet ruajtje manuale e tokenave
  COOKIE_OPTIONS: {
    ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000,      // 15 minuta
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 ditë
    SECURE: import.meta.env.PROD,             // HTTPS vetëm në prodhim
    SAME_SITE: 'lax'                          // Më fleksibël se 'strict'
  },
  
  // API Fetch Configuration
  FETCH_CONFIG: {
    CREDENTIALS: 'include',      // Dërgon cookies automatikisht
    HEADERS: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  },
  
  // Auto-refresh token para skadimit
  AUTO_REFRESH: {
    ENABLED: true,
    THRESHOLD: 5 * 60 * 1000,    // 5 minuta para skadimit
    MAX_RETRIES: 3
  }
};

// Theme Colors
export const COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#10B981',
  DANGER: '#EF4444',
  WARNING: '#F59E0B',
  INFO: '#06B6D4',
  DARK: '#1F2937',
  LIGHT: '#F9FAFB'
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
};

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 10,
  CURRENCY: 'ALL',
  TIMEZONE: 'Europe/Tirane',
  LANGUAGE: 'sq',
  DATE_FORMAT: 'DD/MM/YYYY',
  DECIMAL_SEPARATOR: ',',
  THOUSANDS_SEPARATOR: ' '
};

// Feature Flags
export const FEATURES = {
  ENABLE_CAPTCHA: true,
  ENABLE_2FA: false,
  ENABLE_OAUTH: true,
  ENABLE_ANALYTICS: false,
  ENABLE_EMAIL_VERIFICATION: true,
  ENABLE_TELEMETRY: false,
  USE_COOKIES_FOR_AUTH: true,      // ✅ Përdor cookies për authentication
  USE_HTTP_ONLY_COOKIES: true      // ✅ Përdor httpOnly cookies për siguri
};

// Development mode check
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
export const IS_TEST = import.meta.env.TEST;

// ============== 🛡️ SECURITY CONFIG ==============
export const SECURITY = {
  // Cookies vs localStorage
  AUTH_STRATEGY: 'cookies',  // 'cookies' ose 'localStorage'
  
  // XSS Protection
  XSS_PROTECTION: {
    SANITIZE_INPUT: true,
    CSP_HEADERS: true,
    HTTP_ONLY_COOKIES: true
  },
  
  // CSRF Protection
  CSRF_PROTECTION: {
    ENABLED: true,
    SAME_SITE: 'lax',
    TOKEN_REQUIRED: false  // Me cookies httpOnly, CSRF token nuk është gjithmonë i nevojshëm
  }
};

// ============== 🚀 API ENDPOINTS ==============
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_URL}/api/auth/login`,
    REGISTER: `${API_URL}/api/auth/register`,
    LOGOUT: `${API_URL}/api/auth/logout`,
    REFRESH: `${API_URL}/api/auth/refresh`,
    VALIDATE: `${API_URL}/api/auth/validate`,
    PROFILE: `${API_URL}/api/users/profile`
  },
  
  CAPTCHA: {
    GENERATE: `${API_URL}/api/captcha/generate`,
    VERIFY: `${API_URL}/api/captcha/verify`
  },
  
  USER: {
    PROFILE: `${API_URL}/api/users/profile`,
    UPDATE: `${API_URL}/api/users/update`
  }
};

// ============== 🔧 DEBUG CONFIG ==============
export const DEBUG = {
  LOG_API_CALLS: IS_DEV,
  LOG_COOKIES: IS_DEV,
  LOG_AUTH_FLOW: IS_DEV,
  LOG_REDIRECTS: IS_DEV
};

// Export all as default object
const constants = {
  // API & URLs
  API_URL,
  FRONTEND_URL,
  API_KEY,
  CAPTCHA_API_KEY,
  
  // Configurations
  OAUTH2_CONFIG,
  CAPTCHA_CONFIG,
  PASSWORD_REQUIREMENTS,
  JWT_CONFIG,
  RATE_LIMIT,
  AUTH_CONFIG,
  SECURITY,
  
  // Data
  ROLES,
  STATUS,
  PATTERNS,
  
  // Storage
  STORAGE_KEYS,
  COOKIE_NAMES,
  
  // UI
  COLORS,
  BREAKPOINTS,
  DEFAULTS,
  
  // Features & Flags
  FEATURES,
  DEBUG,
  
  // Environment
  IS_DEV,
  IS_PROD,
  IS_TEST,
  
  // Endpoints
  API_ENDPOINTS
};

export default constants;