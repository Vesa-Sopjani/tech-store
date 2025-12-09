// frontend/src/components/Cart.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiPlus, FiMinus, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Cart = ({ cartItems, removeFromCart, updateCartQuantity, cartTotal }) => {
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.warning('Your cart is empty!');
      return;
    }
    toast.success('Proceeding to checkout...');
    // In real app, redirect to checkout page
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
          <div className="relative p-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
            <span className="text-6xl">🛒</span>
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h3>
        <p className="text-gray-600 mb-8">Add some amazing products to get started!</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-xl hover:shadow-purple-500/25 transition-all"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Shopping Cart</h1>
        <p className="text-gray-600 mt-2">You have {cartItems.length} item(s) in your cart</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cartItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-40 h-40 bg-gray-100 rounded-xl overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                      <p className="text-gray-600 mt-1">{item.category}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3 bg-gray-100 rounded-full px-4 py-2">
                        <button 
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <FiMinus />
                        </button>
                        <span className="font-semibold text-lg w-8 text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <FiPlus />
                        </button>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Price per unit</div>
                      <div className="text-lg font-semibold">${item.price}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Link 
              to="/" 
              className="flex items-center px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-full hover:bg-purple-50 transition-colors"
            >
              <FiArrowLeft className="mr-2" />
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">FREE</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${(cartTotal * 0.08).toFixed(2)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${(cartTotal * 1.08).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-xl hover:shadow-purple-500/25 transition-all"
            >
              Proceed to Checkout
            </button>

            <div className="mt-8 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">
                  ✓
                </div>
                Free returns within 30 days
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">
                  ✓
                </div>
                Secure SSL encryption
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">
                  ✓
                </div>
                24/7 customer support
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;