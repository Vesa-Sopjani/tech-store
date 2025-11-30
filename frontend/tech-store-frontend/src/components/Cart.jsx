import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/api';

const Cart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock data për shportën (në vend të kësaj, do të merrej nga localStorage ose context)
  useEffect(() => {
    const mockCartItems = [
      {
        id: 1,
        product_id: 1,
        name: 'MacBook Pro 14"',
        price: 2499.99,
        quantity: 1,
        image_url: '/placeholder-product.jpg'
      },
      {
        id: 2,
        product_id: 3,
        name: 'iPhone 15 Pro',
        price: 1199.99,
        quantity: 2,
        image_url: '/placeholder-product.jpg'
      }
    ];
    setCartItems(mockCartItems);
  }, []);

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Ju duhet të jeni të loguar për të bërë porosi!');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        user_id: user.id,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        shipping_address: 'Adresa e dërgimit do të vendoset këtu',
        payment_method: 'card'
      };

      const response = await orderService.createOrder(orderData);
      
      if (response.data.success) {
        alert('Porosia u krijua me sukses!');
        setCartItems([]); // Pastro shportën pas porosisë
      }
    } catch (error) {
      console.error('Gabim në krijimin e porosisë:', error);
      alert('Gabim në krijimin e porosisë: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>🛒 Shporta Juaj është e zbrazët</h2>
        <p>Shkoni te produktet për të shtuar artikuj në shportë.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <h1>🛒 Shporta e Blerjeve</h1>
      
      <div className="cart-items">
        {cartItems.map(item => (
          <div key={item.id} className="cart-item">
            <img 
              src={item.image_url} 
              alt={item.name}
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
            />
            <div style={{ flex: 1, marginLeft: '1rem' }}>
              <h3>{item.name}</h3>
              <p className="product-price">{item.price} €</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                -
              </button>
              <span style={{ minWidth: '30px', textAlign: 'center' }}>
                {item.quantity}
              </span>
              <button 
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                +
              </button>
            </div>
            <div style={{ marginLeft: '1rem', textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                {(item.price * item.quantity).toFixed(2)} €
              </p>
              <button 
                onClick={() => removeFromCart(item.id)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                🗑️ Hiq
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <h2>Totali: {calculateTotal().toFixed(2)} €</h2>
        <button 
          onClick={handleCheckout}
          className="btn btn-success"
          disabled={loading || !user}
          style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}
        >
          {loading ? 'Duke procesuar...' : '🛒 Bli Tani'}
        </button>
        {!user && (
          <p style={{ color: '#dc3545', marginTop: '0.5rem' }}>
            * Duhet të jeni të loguar për të bërë porosi
          </p>
        )}
      </div>
    </div>
  );
};

// Eksporti si default
export default Cart;