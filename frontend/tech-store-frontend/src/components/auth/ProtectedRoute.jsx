// frontend/src/components/common/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = [], requireEmailVerification = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setCheckedAuth(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || !checkedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Duke verifikuar aksesin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireEmailVerification && user && !user.email_verified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && user) {
    const userRole = user.role || user.roles?.[0];
    const hasRequiredRole = roles.includes(userRole);
    
    if (!hasRequiredRole) {
      console.log('❌ Role not allowed:', userRole, 'required:', roles);
      
      // Nëse është admin por s'ka të drejtë për këtë route specifike, ridrejto te dashboard
      if (userRole === 'admin' || userRole === 'administrator') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log('✅ Access granted to:', location.pathname);
  return children;
};

export default ProtectedRoute;