import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/api';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await orderService.getUserOrders(user.id);
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error('Gabim në marrjen e porosive:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const response = await orderService.getOrderById(orderId);
      if (response.data.success) {
        setSelectedOrder(response.data.data);
      }
    } catch (error) {
      console.error('Gabim në marrjen e detajeve të porosisë:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'processing': return '#007bff';
      case 'shipped': return '#17a2b8';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div className="loading">Duke ngarkuar porositë...</div>;
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <h1>📦 Porositë e Mia</h1>
      
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>Nuk keni asnjë porosi</h3>
          <p>Shkoni te produktet për të bërë porosinë tuaj të parë!</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card" style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '1rem',
              cursor: 'pointer'
            }} onClick={() => viewOrderDetails(order.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Porosia #{order.id}</h3>
                  <p>Data: {new Date(order.created_at).toLocaleDateString('sq-AL')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {order.total_amount} €
                  </p>
                  <span style={{
                    background: getStatusColor(order.status),
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '15px',
                    fontSize: '0.8rem'
                  }}>
                    {order.status}
                  </span>
                </div>
              </div>
              <p>Artikuj: {order.item_count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal për detajet e porosisë */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h2>Detajet e Porosisë #{selectedOrder.id}</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <p><strong>Statusi:</strong> 
                <span style={{ 
                  color: getStatusColor(selectedOrder.status),
                  marginLeft: '0.5rem'
                }}>
                  {selectedOrder.status}
                </span>
              </p>
              <p><strong>Data:</strong> {new Date(selectedOrder.created_at).toLocaleString('sq-AL')}</p>
              <p><strong>Totali:</strong> {selectedOrder.total_amount} €</p>
              <p><strong>Adresa e Dërgimit:</strong> {selectedOrder.shipping_address}</p>
              <p><strong>Metoda e Pagesës:</strong> {selectedOrder.payment_method}</p>
            </div>

            <h3>Artikujt e Porosisë:</h3>
            <div className="order-items">
              {selectedOrder.items && selectedOrder.items.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #eee'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img 
                      src={item.image_url} 
                      alt={item.product_name}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }}
                    />
                    <div>
                      <p style={{ fontWeight: 'bold' }}>{item.product_name}</p>
                      <p>Sasia: {item.quantity}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p>{item.unit_price} €</p>
                    <p style={{ fontWeight: 'bold' }}>{item.total_price} €</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSelectedOrder(null)}
              className="btn btn-secondary"
              style={{ marginTop: '1rem' }}
            >
              Mbylle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;