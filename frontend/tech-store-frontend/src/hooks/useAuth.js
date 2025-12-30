// hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import { 
  getUserData, 
  isAuthenticated, 
  subscribeToAuthState,
  isLoggedIn as checkIsLoggedIn
} from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status
  const checkAuthStatus = useCallback(async () => {
    try {
      // Check locally first
      const localUser = getUserData();
      setUser(localUser);
      
      // Then verify with server
      const isAuth = await isAuthenticated();
      setIsAuthenticated(isAuth);
      
      // If server says not authenticated but we have local data, clear it
      if (!isAuth && localUser) {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(() => {
      checkAuthStatus();
    });
    
    return unsubscribe;
  }, [checkAuthStatus]);

  return {
    user,
    isAuthenticated,
    isLoading,
    checkAuthStatus,
    isLoggedIn: checkIsLoggedIn // Synchronous check
  };
};