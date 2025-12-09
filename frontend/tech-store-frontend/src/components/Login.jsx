// src/components/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login(formData);
      
      if (response.success) {
        login(response.data.user, response.data.token);
        navigate('/');
      } else {
        throw new Error(response.message || 'Kyçja dështoi');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback for testing
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        toast.warning('API nuk është në dispozicion. Duke përdorur demo llogari...');
        
        // Demo user for testing
        const demoUser = {
          id: 1,
          name: formData.email.split('@')[0] || 'Përdorues',
          email: formData.email,
          role: formData.email === 'admin@techstore.com' ? 'admin' : 'customer',
          address: 'Adresa demo',
          phone: '+355 69 123 4567'
        };
        
        setTimeout(() => {
          login(demoUser, 'demo-token-' + Date.now());
          toast.success('Mirë se vini në modalitetin demo!');
          navigate('/');
        }, 1000);
      } else {
        toast.error(error.message || 'Kyçja dështoi. Ju lutemi provoni përsëri.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Demo credentials
  const useAdminCredentials = () => {
    setFormData({
      email: 'admin@techstore.com',
      password: 'admin123'
    });
  };

  const useCustomerCredentials = () => {
    setFormData({
      email: 'customer@example.com',
      password: 'password123'
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <FiLogIn className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Mirë se vini përsëri</h2>
          <p className="text-gray-600 mt-2">Kyçuni në llogarinë tuaj</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input pl-10"
                  placeholder="ju@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fjalëkalimi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center py-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Po kyçem...
                </>
              ) : (
                'Kyçu'
              )}
            </button>

            {/* Demo buttons */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={useAdminCredentials}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
              >
                🔐 Përdor Kredencialet e Adminit (Demo)
              </button>
              
              <button
                type="button"
                onClick={useCustomerCredentials}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                👤 Përdor Kredencialet e Klientit (Demo)
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Nuk keni llogari?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                Krijo llogari të re
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;