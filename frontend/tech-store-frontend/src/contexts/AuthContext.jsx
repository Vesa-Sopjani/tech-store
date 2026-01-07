// frontend/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  validateSession, 
  getCurrentUser, 
  logout as authLogout,
  login as authServiceLogin
} from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Kontrollo statusin e login gjatë ngarkimit
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthContext: Starting initial auth check...');
        
        // Shiko në localStorage për të dhëna të shpejta
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);
            console.log('📦 AuthContext: Using cached user data');
          } catch (e) {
            console.warn('⚠️ AuthContext: Failed to parse cached user');
          }
        }

        // Kontrollo me server për session të vlefshme
        const isValid = await validateSession();
        
        if (isValid) {
          console.log('✅ AuthContext: Session is valid');
          
          // Merr të dhënat e reja të përdoruesit
          try {
            const userData = await getCurrentUser();
            setUser(userData);
            setIsAuthenticated(true);
            
            // Ruaj në localStorage për përdorim të shpejtë
            localStorage.setItem('user', JSON.stringify(userData));
            
            console.log('📊 AuthContext: User data loaded:', userData.role);
          } catch (profileError) {
            console.warn('⚠️ AuthContext: Could not fetch user profile:', profileError);
            // Përdor të dhënat e cache-ur nëse janë të disponueshme
            if (!storedUser) {
              setIsAuthenticated(false);
              setUser(null);
              localStorage.removeItem('user');
            }
          }
        } else {
          console.log('❌ AuthContext: Session invalid or expired');
          setIsAuthenticated(false);
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('❌ AuthContext: Error during initial auth check:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialCheckDone(true);
        console.log('🏁 AuthContext: Initial auth check completed');
      }
    };

    initializeAuth();
  }, []);

  // ✅ MODIFIKO: Login me server dhe vendos user data
  const login = async (identifier, password) => {
    try {
      console.log('🔐 AuthContext login called with:', identifier);
      
      const userData = await authServiceLogin(identifier, password);
      
      console.log('✅ AuthContext login successful, user:', userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      // Ruaj në localStorage për përdorim të shpejtë
      localStorage.setItem('user', JSON.stringify(userData));
      
      toast.success(`Mirë se vini, ${userData.username || userData.email}!`);
      
      return userData;
    } catch (error) {
      console.error('❌ AuthContext login error:', error);
      throw error;
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
    localStorage.setItem('user', JSON.stringify({ ...user, ...newUserData }));
  };

  // Funksion për të kontrolluar nëse tashmë po bëhet initial check
  const isCheckingAuth = () => loading && !initialCheckDone;

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    updateUser,
    checkAuthStatus: async () => {
      setLoading(true);
      await validateSession();
      setLoading(false);
    },
    isCheckingAuth // Shto këtë për të ndaluar checks të shumta
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};