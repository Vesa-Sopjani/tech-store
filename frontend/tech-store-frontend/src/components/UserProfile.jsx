import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authService.getProfile();
      if (response.data.success) {
        setProfile(response.data.data);
        setFormData({
          email: response.data.data.email,
          full_name: response.data.data.full_name,
          address: response.data.data.address,
          phone: response.data.data.phone
        });
      }
    } catch (error) {
      console.error('Gabim në marrjen e profilit:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await authService.updateProfile(formData);
      if (response.data.success) {
        setProfile(response.data.data);
        setEditing(false);
        alert('Profili u përditësua me sukses!');
      }
    } catch (error) {
      console.error('Gabim në përditësimin e profilit:', error);
      alert('Gabim në përditësimin e profilit');
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

  if (loading && !profile) {
    return <div className="loading">Duke ngarkuar profilin...</div>;
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <h1>👤 Profili i Përdoruesit</h1>
      
      {!editing ? (
        <div className="profile-info" style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '600px'
        }}>
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>Email:</strong> {profile?.email}</p>
          <p><strong>Emri i Plotë:</strong> {profile?.full_name}</p>
          <p><strong>Adresa:</strong> {profile?.address || 'Nuk është vendosur'}</p>
          <p><strong>Telefon:</strong> {profile?.phone || 'Nuk është vendosur'}</p>
          <p><strong>Roli:</strong> {profile?.role}</p>
          <p><strong>Anëtar që:</strong> {new Date(profile?.created_at).toLocaleDateString('sq-AL')}</p>
          
          <button 
            onClick={() => setEditing(true)}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            ✏️ Përditëso Profilin
          </button>
        </div>
      ) : (
        <form onSubmit={handleUpdate} style={{ 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '600px'
        }}>
          <div className="form-group">
            <label className="form-label">Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Emri i Plotë:</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Adresa:</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="form-control"
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Telefon:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-control"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Duke përditësuar...' : '💾 Ruaj Ndryshimet'}
            </button>
            <button 
              type="button" 
              onClick={() => setEditing(false)}
              className="btn btn-secondary"
            >
              ❌ Anulo
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserProfile;