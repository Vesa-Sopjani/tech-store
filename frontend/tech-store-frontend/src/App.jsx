// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart([...cart, { ...product, quantity: 1 }]);
    toast.success(`${product.name} added to cart!`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.info('Item removed from cart');
  };

  const checkout = async () => {
    try {
      const orderData = {
        userId: 'demo-user-id', // In real app, get from auth
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        shippingAddress: '123 Main St, City, Country'
      };

      const response = await axios.post(`${API_BASE_URL}/api/orders`, orderData);
      
      toast.success('Order placed successfully!');
      setCart([]);
      
      console.log('Order created:', response.data);
    } catch (error) {
      toast.error('Failed to place order');
      console.error('Checkout error:', error);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <Link to="/" className="text-2xl font-bold text-blue-600">
                Tech Store
              </Link>
              <div className="space-x-4">
                <Link to="/" className="text-gray-700 hover:text-blue-600">
                  Products
                </Link>
                <Link to="/cart" className="text-gray-700 hover:text-blue-600">
                  Cart ({cart.length})
                </Link>
                <Link to="/orders" className="text-gray-700 hover:text-blue-600">
                  Orders
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <div>
                <h1 className="text-3xl font-bold mb-8">Our Products</h1>
                
                {loading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                          <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                          <p className="text-gray-600 mb-4">{product.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-2xl font-bold text-blue-600">
                              ${product.price}
                            </span>
                            <button
                              onClick={() => addToCart(product)}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            } />

            <Route path="/cart" element={
              <div>
                <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
                
                {cart.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">Your cart is empty</p>
                ) : (
                  <>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                      {cart.map(item => (
                        <div key={item.id} className="p-6 border-b last:border-b-0">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-semibold">{item.name}</h3>
                              <p className="text-gray-600">${item.price} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-xl font-bold">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-2xl font-bold">Total:</span>
                        <span className="text-3xl font-bold text-blue-600">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={checkout}
                        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition text-lg font-semibold"
                      >
                        Proceed to Checkout
                      </button>
                    </div>
                  </>
                )}
              </div>
            } />
          </Routes>
        </div>

        <ToastContainer position="bottom-right" />
      </div>
    </Router>
  );
}

export default App;