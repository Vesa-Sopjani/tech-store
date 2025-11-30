import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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

    console.log('Login attempt with:', formData)

    try {
      const response = await authService.login(formData)
      console.log('Login response:', response.data)
      
      if (response.data.success) {
        console.log('Login successful, user role:', response.data.data.user.role)
        login(response.data.data.user, response.data.data.token)
        navigate('/')
      }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response)
      setError(error.response?.data?.message || 'Gabim në hyrje')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Hyr në Llogari</h2>
      
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
          <label className="form-label">Username ose Email:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-control"
            placeholder="admin"
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
            placeholder="admin123"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? 'Duke hyrë...' : 'Hyr'}
        </button>
      </form>

      {/* Informacion për admin login */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#fff3cd', 
        borderRadius: '8px',
        border: '1px solid #ffeaa7'
      }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#856404' }}>🎛️ Kredencialet e Adminit</h4>
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
          <strong>Username:</strong> admin<br/>
          <strong>Password:</strong> admin123<br/>
          <strong>Email:</strong> admin@techstore.com
        </p>
      </div>
      
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        Nuk ke llogari? <Link to="/register">Regjistrohu këtu</Link>
      </p>
    </div>
  )
}

export default Login