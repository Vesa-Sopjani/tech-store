import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = [], requireEmailVerification = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  console.log('🔒 ProtectedRoute:', {
    user,
    isAuthenticated: typeof isAuthenticated === 'function' ? isAuthenticated() : isAuthenticated,
    loading,
    roles,
    location: location.pathname
  });

  if (loading) {
    // Show loading spinner while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Kontrollo në mënyrë të fleksibël nëse është funksion apo boolean
  let authenticated = false;
  
  if (typeof isAuthenticated === 'function') {
    authenticated = isAuthenticated();
  } else {
    authenticated = Boolean(isAuthenticated);
  }

  if (!authenticated) {
    // Redirect to login if not authenticated
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if email verification is required
  if (requireEmailVerification && user && !user.email_verified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (roles.length > 0 && user) {
    const userRole = user.role || user.roles?.[0];
    const hasRequiredRole = roles.includes(userRole);
    
    if (!hasRequiredRole) {
      console.log('❌ Role not allowed:', userRole, 'required:', roles);
      // Redirect to unauthorized page or home
      return <Navigate to="/unauthorized" replace />;
    }
  }

  console.log('✅ Access granted to:', location.pathname);
  return children;
};

// Higher-order component for protected pages
export const withProtection = (Component, options = {}) => {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Component for showing different content based on auth state
export const AuthBasedContent = ({ 
  authenticated, 
  unauthenticated, 
  loadingComponent 
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading && loadingComponent) {
    return loadingComponent;
  }

  let isAuth = false;
  
  if (typeof isAuthenticated === 'function') {
    isAuth = isAuthenticated();
  } else {
    isAuth = Boolean(isAuthenticated);
  }

  return isAuth ? authenticated : unauthenticated;
};

export default ProtectedRoute;