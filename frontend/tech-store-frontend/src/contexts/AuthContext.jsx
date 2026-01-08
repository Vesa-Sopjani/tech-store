// frontend/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  validateSession, 
  getCurrentUser, 
  logout as authLogout,
  login as authServiceLogin // ✅ Shto këtë import
} from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kontrollo statusin e login gjatë ngarkimit
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      const isValid = await validateSession();
      
      if (isValid) {
        console.log('✅ Session is valid, getting user data...');
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (profileError) {
          console.warn('⚠️ Could not fetch user profile:', profileError);
          // Megjithatë vazhdo si të autentifikuar
          setIsAuthenticated(true);
        }
      } else {
        console.log('❌ Session invalid or expired');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ MODIFIKO: Login me server dhe vendos user data
  const login = async (identifier, password) => {
    try {
      console.log('🔐 AuthContext login called with:', identifier);
      
      // ✅ Përdor authService.js për të bërë login në server
      const userData = await authServiceLogin(identifier, password);
      
      console.log('✅ AuthContext login successful, user:', userData);
      
      // ✅ Vendos user data në state
      setUser(userData);
      setIsAuthenticated(true);
      
      toast.success(`Mirë se vini, ${userData.username || userData.email}!`);
      
      return userData;
    } catch (error) {
      console.error('❌ AuthContext login error:', error);
      throw error; // Rikthe error për ta trajtuar në Login.jsx
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.warn('⚠️ Logout API error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      toast.info('Ju jeni çkyçur me sukses');
    }
  };

  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login, // ✅ Tani funksionon me server
    logout,
    updateUser,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};