// frontend/components/auth/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiPhone, 
  FiMapPin,
  FiEdit2, 
  FiSave, 
  FiX,
  FiCalendar,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiPackage,
  FiCreditCard,
  FiHeart
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    address: ''
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        full_name: user.full_name || user.name || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      // Here you would make an API call to update the user
      // For now, we'll just update the local state
      updateUser(formData);
      
      toast.success(
        <div className="flex items-center">
          <FiCheckCircle className="mr-2" />
          Profili u përditësua me sukses!
        </div>
      );
      
      setIsEditing(false);
    } catch (error) {
      toast.error(
        <div className="flex items-center">
          <FiAlertCircle className="mr-2" />
          Gabim gjatë përditësimit të profilit
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original user data
    setFormData({
      username: user.username || '',
      email: user.email || '',
      full_name: user.full_name || user.name || '',
      phone: user.phone || '',
      address: user.address || ''
    });
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('sq-AL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block p-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-6">
            <FiUser className="text-6xl text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Nuk jeni të kyçur</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Ju lutem kyçuni për të parë profilin tuaj.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-xl transition-shadow"
          >
            Kyçu tani
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
            <FiUser className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Profili Im
          </h1>
          <p className="text-gray-600">
            Menaxho informacionin dhe preferencat e llogarisë tënde
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Column - User Info Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                  {user.username?.charAt(0)?.toUpperCase() || 
                   user.email?.charAt(0)?.toUpperCase() || 
                   'U'}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{user.username}</h2>
                <p className="text-gray-600 text-sm truncate mb-4">{user.email}</p>
                
                <div className="space-y-3 mb-6">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === 'admin' || user.role === 'administrator' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' || user.role === 'administrator' ? 'Administrator' : 'Klient'}
                  </div>
                  
                  <div className="text-sm text-gray-500 flex items-center justify-center">
                    <FiCalendar className="mr-2" />
                    Anëtar që nga {formatDate(user.created_at || user.createdAt)}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border-t pt-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <FiPackage className="text-2xl text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">12</div>
                    <div className="text-xs text-gray-500">Porosi</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <FiHeart className="text-2xl text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">5</div>
                    <div className="text-xs text-gray-500">Wishlist</div>
                  </div>
                </div>
              </div>

             
            </div>
          </div>

          {/* Right Column - Profile Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Informacioni Personal</h2>
                  <p className="text-gray-600">Përditësoni detajet e profilit tuaj</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                  >
                    <FiEdit2 className="mr-2" />
                    Modifiko Profilin
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
                    >
                      <FiSave className="mr-2" />
                      {loading ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <FiX className="mr-2" />
                      Anulo
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Username */}
                <div>
                  <label className="flex items-center text-gray-700 mb-2">
                    <FiUser className="mr-2" />
                    Emri i përdoruesit
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">{user.username}</div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center text-gray-700 mb-2">
                    <FiMail className="mr-2" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">{user.email}</div>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="flex items-center text-gray-700 mb-2">
                    <FiUser className="mr-2" />
                    Emri i plotë
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Shkruani emrin tuaj të plotë"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      {user.full_name || user.name || 'Nuk është vendosur'}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center text-gray-700 mb-2">
                    <FiPhone className="mr-2" />
                    Telefoni
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="+355 XX XXX XXX"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      {user.phone || 'Nuk është vendosur'}
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="flex items-center text-gray-700 mb-2">
                    <FiMapPin className="mr-2" />
                    Adresa
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Shkruani adresën tuaj të plotë"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[80px]">
                      {user.address || 'Nuk është vendosur'}
                    </div>
                  )}
                </div>

                {/* Account Security */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FiShield className="mr-2 text-blue-500" />
                    Siguria e Llogarisë
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <FiCheckCircle className="text-green-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Llogaria e verifikuar</p>
                        <p className="text-sm text-gray-600">Emaili është konfirmuar me sukses</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <FiCalendar className="text-blue-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Anëtar që</p>
                        <p className="text-sm text-gray-600">{formatDate(user.created_at || user.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role Info */}
                <div className="pt-4">
                  <div className="text-sm text-gray-500">
                    <p>
                      <span className="font-medium">Roli:</span>{' '}
                      <span className={`font-semibold ${
                        user.role === 'admin' || user.role === 'administrator' 
                          ? 'text-red-600' 
                          : 'text-blue-600'
                      }`}>
                        {user.role === 'admin' || user.role === 'administrator' ? 'Administrator' : 'Klient'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <button
                onClick={() => navigate('/orders')}
                className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-blue-100 rounded-lg mr-4">
                    <FiPackage className="text-xl text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Porositë e mia</h3>
                    <p className="text-sm text-gray-600">Shiko historikun e porosive</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/wishlist')}
                className="bg-white rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-pink-100 rounded-lg mr-4">
                    <FiHeart className="text-xl text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Wishlist</h3>
                    <p className="text-sm text-gray-600">Produktet e tu të preferuar</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Të dhënat tuaja janë të sigurta dhe të fshehtëzuara sipas politikës sonë të privatësisë.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;