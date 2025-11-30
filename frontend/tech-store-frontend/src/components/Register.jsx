import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    address: '',
    phone: '',
    role: 'customer' // Default role
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password-et nuk përputhen')
      setLoading(false)
      return
    }

    try {
      const { confirmPassword, ...submitData } = formData
      const response = await authService.register(submitData)
      
      if (response.data.success) {
        login(response.data.data.user, response.data.data.token)
        navigate('/')
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Gabim në regjistrim')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Krijo Llogari të Re</h2>
      
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '0.75rem', 
          borderRadius: '5px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        
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
          <label className="form-label">Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Konfirmo Password-in:</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        {/* Opsioni i fshehtë për admin (mund të hiqet në prodhim) */}
        <div className="form-group">
          <label className="form-label">Roli:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-control"
          >
            <option value="customer">👤 Përdorues i Rregullt</option>
            <option value="admin">🎛️ Administrator</option>
          </select>
          <small style={{ color: '#6c757d' }}>
            * Zgjidh "Administrator" vetëm nëse je duke krijuar llogari admin
          </small>
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
        
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? 'Duke u regjistruar...' : 'Regjistrohu'}
        </button>
      </form>

      {/* Informacion për admin login */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#e7f3ff', 
        borderRadius: '8px',
        border: '1px solid #b3d9ff'
      }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0066cc' }}>🔐 Kredencialet e Adminit</h4>
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
          <strong>Username:</strong> admin<br/>
          <strong>Password:</strong> admin123<br/>
          <strong>Email:</strong> admin@techstore.com
        </p>
      </div>
      
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        Ke tashmë llogari? <Link to="/login">Hyr këtu</Link>
      </p>
    </div>
  )
}

export default Register