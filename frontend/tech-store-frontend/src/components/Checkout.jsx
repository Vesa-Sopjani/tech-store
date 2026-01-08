// frontend/src/components/Checkout.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiMapPin, FiCheck, FiArrowLeft, FiTruck, FiPackage } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Checkout = ({ cartItems: initialCartItems, cartTotal: initialCartTotal }) => {
  const navigate = useNavigate();
  
  // Përdor useRef për të shmangur re-rendering
  const cartItemsRef = useRef(initialCartItems);
  const cartTotalRef = useRef(initialCartTotal);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  
  // Përditëso ref vetëm kur props ndryshojnë vërtet
  useEffect(() => {
    cartItemsRef.current = initialCartItems;
    cartTotalRef.current = initialCartTotal;
  }, [initialCartItems, initialCartTotal]);

  // Merr të dhënat e përdoruesit vetëm një herë
  useEffect(() => {
    if (hasMounted) return;
    
    const userData = JSON.parse(localStorage.getItem('user'));
    console.log('User from localStorage:', userData);
    
    if (userData) {
      setUser(userData);
      
      // Nëse useri ka adresë të ruajtur, përdor atë
      if (userData.shipping_address) {
        setSelectedAddress(userData.shipping_address);
        setUseSavedAddress(true);
      }
    }
    
    setHasMounted(true);
  }, [hasMounted]);

  // Përdor useCallback me varësi të qarta
  const updateUserAddress = useCallback(async (address, userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${userId}/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shipping_address: address })
      });
      
      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating address:', error);
      return false;
    }
  }, []); // Pa varësi

  const handleConfirmOrder = useCallback(async () => {
  const currentCartItems = cartItemsRef.current;
  const currentUser = user;
  
  if (!selectedAddress && !newAddress) {
    toast.error('Please provide a shipping address');
    return;
  }

  const shippingAddress = useSavedAddress ? selectedAddress : newAddress;

  // Kontrollo nëse user ekziston
  if (!currentUser?.id) {
    toast.error('User information not found. Please login again.');
    navigate('/login');
    return;
  }

  // Kontrollo nëse ka produkte
  if (!currentCartItems || currentCartItems.length === 0) {
    toast.error('Your cart is empty');
    navigate('/cart');
    return;
  }

  setLoading(true);

  try {
    const orderData = {
      user_id: currentUser.id,
      items: currentCartItems.map(item => ({
        product_id: parseInt(item.id),
        quantity: item.quantity,
        price: item.price
      })),
      shipping_address: shippingAddress,
      payment_method: 'cash_on_delivery',
      payment_status: 'pending'
    };

    console.log('Sending order data:', orderData);
    console.log('Current cookies:', document.cookie);
    
    // 1. Së pari përdor me credentials për cookies
    const response = await fetch('http://localhost:5002/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Mos përdor Authorization header kur përdor cookies
      },
      credentials: 'include', // Kjo është SHUMË e rëndësishme për cookies
      body: JSON.stringify(orderData)
    });

    console.log('Order API Response Status:', response.status);
    
    // 2. Nëse fail për shkak të token, përdor fallback me token në localStorage
    if (response.status === 401) {
      console.log('Token cookie not working, trying with localStorage token...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      
      // Fallback: Përdor token nga localStorage
      const fallbackResponse = await fetch('http://localhost:5002/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      return handleResponse(fallbackResponse);
    }
    
    return handleResponse(response);
    
  } catch (error) {
    console.error('Order error:', error);
    toast.error(`Failed to place order: ${error.message}`);
  } finally {
    setLoading(false);
  }
  
  // Funksion ndihmës për të përpunuar response
  async function handleResponse(response) {
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (!response.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        throw new Error(errorJson.message || `Server error ${response.status}`);
      } catch (e) {
        throw new Error(`Server returned ${response.status}: ${responseText}`);
      }
    }
    
    const result = JSON.parse(responseText);
    console.log('Order API Success Response:', result);

   // Në handleConfirmOrder, ndryshoni këtë pjesë:
if (result.success) {
  toast.success('Order placed successfully! Payment will be made on delivery.');
  
  // Përditëso adresën e përdoruesit nëse është e re
  if (!useSavedAddress && currentUser) {
    await updateUserAddress(shippingAddress, currentUser.id);
    // Përditëso localStorage
    const updatedUser = { ...currentUser, shipping_address: shippingAddress };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }
  
  // Pastro cart
  localStorage.removeItem('cart');
  
  // Kthehu në faqen e porosive me delay
  setTimeout(() => {
    navigate('/my-orders');
  }, 1500);

    } else {
      throw new Error(result.message || 'Failed to place order');
    }
  }
}, [user, selectedAddress, newAddress, useSavedAddress, navigate, updateUserAddress]);

  // Nëse nuk ka produkte në cart
  if (!initialCartItems || initialCartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
          <div className="relative p-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
            <span className="text-6xl">🛒</span>
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h3>
        <p className="text-gray-600 mb-8">Add some products to checkout!</p>
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft className="mr-2" />
          Back to Cart
        </button>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-600">Complete your order with delivery details</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Delivery Info */}
        <div className="md:col-span-2 space-y-8">
          {/* Delivery Address Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl mr-4">
                <FiHome className="text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delivery Address</h3>
                <p className="text-gray-600">Where should we deliver your order?</p>
              </div>
            </div>

            {user?.shipping_address && (
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <input
                    type="radio"
                    id="savedAddress"
                    checked={useSavedAddress}
                    onChange={() => setUseSavedAddress(true)}
                    className="mr-3"
                  />
                  <label htmlFor="savedAddress" className="font-medium">
                    Use saved address
                  </label>
                </div>
                
                {useSavedAddress && (
                  <div className="ml-9 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start">
                      <FiMapPin className="text-blue-500 mt-1 mr-3" />
                      <div>
                        <p className="font-medium">{selectedAddress}</p>
                        <p className="text-sm text-gray-600 mt-1">Saved address from your profile</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center mb-4">
                <input
                  type="radio"
                  id="newAddress"
                  checked={!useSavedAddress}
                  onChange={() => setUseSavedAddress(false)}
                  className="mr-3"
                />
                <label htmlFor="newAddress" className="font-medium">
                  {user?.shipping_address ? 'Use different address' : 'Enter delivery address'}
                </label>
              </div>
              
              {!useSavedAddress && (
                <div className="ml-9">
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Enter your full address including street, city, postal code..."
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Please provide a complete and accurate address for delivery
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl mr-4">
                <FiPackage className="text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payment Method</h3>
                <p className="text-gray-600">How would you like to pay?</p>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white border border-green-300 rounded-lg mr-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Cash on Delivery</h4>
                    <p className="text-gray-600">Pay when you receive your order</p>
                  </div>
                </div>
                <FiCheck className="text-2xl text-green-600" />
              </div>
              
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <FiCheck className="text-green-500 mr-2" />
                    No online payment required
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="text-green-500 mr-2" />
                    Pay cash to the delivery person
                  </li>
                  <li className="flex items-center">
                    <FiCheck className="text-green-500 mr-2" />
                    Get invoice with your order
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {initialCartItems.map(item => (
                <div key={`${item.id}-${item.quantity}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg mr-3 overflow-hidden">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg mr-3 overflow-hidden flex items-center justify-center">
  {item.image ? (
    <img 
      src={item.image} 
      alt={item.name}
      className="w-full h-full object-cover"
      onError={(e) => {
        // Nëse fotoja dështon, zëvendëso me div
        e.target.style.display = 'none';
        const parent = e.target.parentElement;
        parent.innerHTML = '<span class="text-gray-500 text-xs">Image</span>';
      }}
    />
  ) : (
    <span className="text-gray-500 text-xs">Image</span>
  )}
</div>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${initialCartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">FREE</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8%)</span>
                <span>${(initialCartTotal * 0.08).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${(initialCartTotal * 1.08).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={loading || (!selectedAddress && !newAddress)}
              className={`w-full py-4 rounded-full font-semibold text-lg transition-all ${
                loading || (!selectedAddress && !newAddress)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:shadow-purple-500/25'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  <FiTruck className="inline mr-2" />
                  Confirm Order & Pay on Delivery
                </>
              )}
            </button>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start">
                <FiPackage className="text-blue-500 mt-1 mr-3" />
                <div>
                  <p className="font-medium text-sm">Delivery Information</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Delivery usually takes 2-3 business days. You'll receive tracking information via email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;