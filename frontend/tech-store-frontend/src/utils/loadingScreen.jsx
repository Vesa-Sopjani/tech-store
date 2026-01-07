// components/common/LoadingScreen.jsx
import React from 'react';

const LoadingScreen = ({ message = 'Duke ngarkuar...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export const SmallLoadingSpinner = () => (
  <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
);

export default LoadingScreen;