import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Header = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Debug - shfaq të dhënat e përdoruesit
  console.log('User data:', user)
  console.log('User role:', user?.role)
  console.log('Is admin?', user?.role === 'admin')

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <Link to="/" className="logo">
            🛍️ Tech Store
          </Link>
          
          <ul className="nav-links">
            <li><Link to="/">🏠 Produktet</Link></li>
            
            {user ? (
              <>
                <li><Link to="/cart">🛒 Shporta</Link></li>
                <li><Link to="/orders">📦 Porositë e Mia</Link></li>
                
                {/* Shfaq Admin Dashboard vetëm për administratorë */}
                {user.role === 'admin' && (
                  <li>
                    <Link to="/admin" style={{ color: '#ffeb3b', fontWeight: 'bold' }}>
                      🎛️ Admin
                    </Link>
                  </li>
                )}
                
                <li>
                  <Link to="/profile">
                    👤 {user.username} 
                    {user.role === 'admin' && ' (Admin)'}
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={handleLogout}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'white', 
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    🚪 Dil
                  </button>
                </li>
              </>
            ) : (
              <>
                <li><Link to="/login">🔐 Hyr</Link></li>
                <li><Link to="/register">📝 Regjistrohu</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header