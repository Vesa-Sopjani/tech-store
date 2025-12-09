// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on app start
    const savedUser = localStorage.getItem('techstore_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('techstore_user');
        localStorage.removeItem('techstore_token');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    const userWithToken = {
      ...userData,
      token: token || userData.token
    };
    
    setUser(userWithToken);
    localStorage.setItem('techstore_user', JSON.stringify(userWithToken));
    if (token) {
      localStorage.setItem('techstore_token', token);
    }
    toast.success(`Mirë se vini, ${userData.name}!`);
  };

  const register = (userData, token) => {
    const userWithToken = {
      ...userData,
      token: token || userData.token
    };
    
    setUser(userWithToken);
    localStorage.setItem('techstore_user', JSON.stringify(userWithToken));
    if (token) {
      localStorage.setItem('techstore_token', token);
    }
    toast.success('Regjistrimi u krye me sukses!');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('techstore_user');
    localStorage.removeItem('techstore_token');
    toast.info('Jeni çkyçur me sukses');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};