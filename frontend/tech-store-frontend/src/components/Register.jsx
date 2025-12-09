// src/components/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLock, FiHome, FiPhone } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    address: '',
    phone: '',
    role: 'customer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Fjalëkalimet nuk përputhen');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere');
      setLoading(false);
      return;
    }

    try {
      // Prepare data for API
      const submitData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        address: formData.address,
        phone: formData.phone,
        role: formData.role
      };

      const response = await authService.register(submitData);
      
      if (response.success) {
        register(response.data.user, response.data.token);
        navigate('/');
      } else {
        throw new Error(response.message || 'Regjistrimi dështoi');
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Fallback for testing
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        toast.warning('API nuk është në dispozicion. Duke krijuar llogari demo...');
        
        // Create demo user
        const demoUser = {
          id: Date.now(),
          name: formData.full_name || formData.username,
          email: formData.email,
          role: formData.role,
          address: formData.address,
          phone: formData.phone
        };
        
        setTimeout(() => {
          register(demoUser, 'demo-token-' + Date.now());
          toast.success('Llogaria demo u krijua me sukses!');
          navigate('/');
        }, 1000);
      } else {
        setError(error.message);
        toast.error(error.message || 'Regjistrimi dështoi. Ju lutemi provoni përsëri.');
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4">
            <FiUser className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Krijo Llogari të Re</h2>
          <p className="text-gray-600 mt-2">Bashkohu me komunitetin tonë teknologjik</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form fields same as before */}
            {/* ... (keep all your form fields from previous code) */}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center py-3 bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {loading ? 'Po regjistrohem...' : 'Regjistrohu'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Keni tashmë llogari?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Kyçu këtu
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;