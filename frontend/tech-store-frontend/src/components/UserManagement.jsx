import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminService.getUsers();
      if (response.data.success) {
        setUsers(response.data.data.users || []);
      }
    } catch (error) {
      console.error('Gabim në marrjen e përdoruesve:', error);
      // Të dhëna demo nëse shërbimi nuk është i disponueshëm
      setUsers([
        {
          id: 1,
          username: 'admin',
          email: 'admin@techstore.com',
          full_name: 'Administrator',
          role: 'admin',
          created_at: new Date().toISOString(),
          order_count: 0,
          total_spent: 0
        },
        {
          id: 2,
          username: 'user1',
          email: 'user1@email.com',
          full_name: 'John Doe',
          role: 'customer',
          created_at: new Date().toISOString(),
          order_count: 3,
          total_spent: 450.75
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      console.log('Përditësimi i rolit:', userId, newRole);
      alert(`Roli i përdoruesit u ndryshua në ${newRole}! (Demo)`);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Gabim në përditësimin e rolit:', error);
      alert('Gabim në përditësimin e rolit');
    }
  };

  const sendEmail = (userEmail) => {
    const subject = prompt('Titulli i email-it:');
    const message = prompt('Mesazhi:');
    
    if (subject && message) {
      console.log('Dërgimi i email-it:', { to: userEmail, subject, message });
      alert(`Email u dërgua në ${userEmail}! (Demo)`);
    }
  };

  if (loading) {
    return <div className="loading">🔄 Duke ngarkuar përdoruesit...</div>;
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h2>👥 Menaxhimi i Përdoruesve</h2>
        <div className="stats-overview">
          <div className="stat">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">Total Përdorues</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {users.filter(u => u.role === 'admin').length}
            </span>
            <span className="stat-label">Administratorë</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {users.filter(u => u.role === 'customer').length}
            </span>
            <span className="stat-label">Klientë</span>
          </div>
        </div>
      </div>

      {/* Tabela e përdoruesve */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Emri i Plotë</th>
              <th>Roli</th>
              <th>Porosi</th>
              <th>Shpenzuar</th>
              <th>Data e Regjistrimit</th>
              <th>Veprime</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>#{user.id}</td>
                <td>
                  <strong>{user.username}</strong>
                  {user.role === 'admin' && ' 👑'}
                </td>
                <td>{user.email}</td>
                <td>{user.full_name}</td>
                <td>
                  <select 
                    value={user.role} 
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className={`role-select ${user.role}`}
                  >
                    <option value="customer">👤 Customer</option>
                    <option value="admin">👑 Admin</option>
                    <option value="moderator">🛡️ Moderator</option>
                  </select>
                </td>
                <td>{user.order_count || 0}</td>
                <td>{parseFloat(user.total_spent || 0).toFixed(2)} €</td>
                <td>{new Date(user.created_at).toLocaleDateString('sq-AL')}</td>
                <td>
                  <div className="user-actions">
                    <button 
                      className="btn btn-info btn-sm"
                      onClick={() => sendEmail(user.email)}
                      title="Dërgo Email"
                    >
                      📧
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedUser(user)}
                      title="Shiko Detaje"
                    >
                      👀
                    </button>
                    <button 
                      className="btn btn-warning btn-sm"
                      onClick={() => {
                        if (window.confirm(`Bllokoj ${user.username}?`)) {
                          alert(`Përdoruesi ${user.username} u bllokua! (Demo)`);
                        }
                      }}
                      title="Blloko"
                    >
                      🚫
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="empty-state">
          <p>👥 Nuk ka përdorues të regjistruar</p>
        </div>
      )}

      {/* Modal për detajet e përdoruesit */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>👤 Detajet e Përdoruesit</h3>
            
            <div className="user-details">
              <div className="detail-row">
                <label>ID:</label>
                <span>#{selectedUser.id}</span>
              </div>
              <div className="detail-row">
                <label>Username:</label>
                <span>{selectedUser.username}</span>
              </div>
              <div className="detail-row">
                <label>Email:</label>
                <span>{selectedUser.email}</span>
              </div>
              <div className="detail-row">
                <label>Emri i Plotë:</label>
                <span>{selectedUser.full_name}</span>
              </div>
              <div className="detail-row">
                <label>Roli:</label>
                <span className={`role-badge ${selectedUser.role}`}>
                  {selectedUser.role}
                </span>
              </div>
              <div className="detail-row">
                <label>Total Porosi:</label>
                <span>{selectedUser.order_count || 0}</span>
              </div>
              <div className="detail-row">
                <label>Total Shpenzuar:</label>
                <span>{parseFloat(selectedUser.total_spent || 0).toFixed(2)} €</span>
              </div>
              <div className="detail-row">
                <label>Anëtar që:</label>
                <span>{new Date(selectedUser.created_at).toLocaleString('sq-AL')}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => sendEmail(selectedUser.email)}
              >
                📧 Dërgo Email
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Mbylle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;