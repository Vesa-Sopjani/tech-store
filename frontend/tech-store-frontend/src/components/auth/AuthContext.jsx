import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../../services/apiService';
import { publishKafkaEvent } from '../../services/eventService';


const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState({
    accessToken: null,
    refreshToken: null
  });
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('tech_store_user');
        const storedTokens = localStorage.getItem('tech_store_tokens');

        if (storedUser && storedTokens) {
          const parsedUser = JSON.parse(storedUser);
          const parsedTokens = JSON.parse(storedTokens);

          // Validate token expiration
          if (isTokenExpired(parsedTokens.accessToken)) {
            // Try to refresh token
            try {
              const newTokens = await refreshAccessToken(parsedTokens.refreshToken);
              if (newTokens) {
                setUser(parsedUser);
                setTokens(newTokens);
                localStorage.setItem('tech_store_tokens', JSON.stringify(newTokens));
              } else {
                clearAuth();
              }
            } catch {
              clearAuth();
            }
          } else {
            setUser(parsedUser);
            setTokens(parsedTokens);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // Refresh access token
  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await authAPI.refreshToken(refreshToken);
      
      if (response.success) {
        return response.data.tokens;
      }
      
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  };

  // Set up token refresh interval
  useEffect(() => {
    let refreshInterval;

    if (tokens.refreshToken) {
      // Refresh token 1 minute before expiration
      refreshInterval = setInterval(async () => {
        if (isTokenExpired(tokens.accessToken)) {
          try {
            const newTokens = await refreshAccessToken(tokens.refreshToken);
            if (newTokens) {
              setTokens(newTokens);
              localStorage.setItem('tech_store_tokens', JSON.stringify(newTokens));
              
              // Log token refresh
              await publishKafkaEvent('token.refreshed', {
                userId: user?.id,
                timestamp: new Date().toISOString()
              });
            } else {
              clearAuth();
              toast.info('Your session has expired. Please log in again.');
            }
          } catch (error) {
            console.error('Auto token refresh failed:', error);
          }
        }
      }, 60000); // Check every minute
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [tokens, user]);

  // Login function
  const login = (userData, tokensData) => {
    setUser(userData);
    setTokens(tokensData);
    
    // Store in localStorage
    localStorage.setItem('tech_store_user', JSON.stringify(userData));
    localStorage.setItem('tech_store_tokens', JSON.stringify(tokensData));
    
    // Store tokens in session storage for service workers
    if (tokensData.accessToken) {
      sessionStorage.setItem('access_token', tokensData.accessToken);
    }
    
    // Publish login event
    publishKafkaEvent('user.session_started', {
      userId: userData.id,
      username: userData.username,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  };

  // Logout function
  // Në AuthContext.jsx - modifiko logout funksionin
const logout = async () => {
  try {
    console.log('🚪 AuthContext logout called');
    
    // Call server logout API
    await authLogout();
    
    // Clear all cookies
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
    
    // Clear all localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear service worker tokens
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active.postMessage({ type: 'CLEAR_TOKENS' });
      });
    }
    
    setUser(null);
    setIsAuthenticated(false);
    
    console.log('✅ AuthContext logout completed');
    toast.info('Ju jeni çkyçur me sukses');
    
  } catch (error) {
    console.warn('⚠️ Logout API error:', error);
    
    // Still clear local state even if server fails
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
    
    toast.info('Ju jeni çkyçur nga aplikacioni');
  }
};

  // Clear auth data
  const clearAuth = () => {
    setUser(null);
    setTokens({ accessToken: null, refreshToken: null });
    
    // Clear storage
    localStorage.removeItem('tech_store_user');
    localStorage.removeItem('tech_store_tokens');
    sessionStorage.removeItem('access_token');
    
    // Clear any service worker tokens
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active.postMessage({ type: 'CLEAR_TOKENS' });
      });
    }
  };

  // Update user profile
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('tech_store_user', JSON.stringify(updatedUser));
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!tokens.accessToken && !isTokenExpired(tokens.accessToken);
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Get authorization header for API calls
  const getAuthHeader = () => {
    if (tokens.accessToken) {
      return { 'Authorization': `Bearer ${tokens.accessToken}` };
    }
    return {};
  };

  // Verify email
  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      
      if (response.success && user) {
        // Update user state
        const updatedUser = { ...user, email_verified: true };
        updateUser(updatedUser);
        
        toast.success('Email verified successfully!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Email verification failed:', error);
      toast.error('Email verification failed. Please try again.');
      return false;
    }
  };

  // Resend verification email
  const resendVerification = async (email) => {
    try {
      const response = await authAPI.resendVerification(email);
      
      if (response.success) {
        toast.success('Verification email sent! Check your inbox.');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Resend verification failed:', error);
      toast.error('Failed to send verification email.');
      return false;
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword(email);
      
      if (response.success) {
        toast.success('Password reset instructions sent to your email.');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Forgot password failed:', error);
      toast.error('Failed to send password reset email.');
      return false;
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      const response = await authAPI.resetPassword(token, newPassword);
      
      if (response.success) {
        toast.success('Password reset successfully! You can now log in.');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Password reset failed:', error);
      toast.error('Failed to reset password.');
      return false;
    }
  };

  const value = {
    user,
    tokens,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    getAuthHeader,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;