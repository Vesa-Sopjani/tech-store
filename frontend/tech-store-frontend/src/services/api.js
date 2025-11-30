import axios from 'axios'

// Konfigurimi bazë i axios
const API = axios.create({
  baseURL: 'http://localhost:5001',
  timeout: 10000,
})

// Interceptor për të shtuar tokenin automatikisht
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Shërbimet e Produkteve
export const productService = {
  getAllProducts: (filters = {}) => 
    API.get('/api/products', { params: filters }),
  
  getProductById: (id) => 
    API.get(`/api/products/${id}`),
  
  getCategories: () => 
    API.get('/api/categories')
}

// Shërbimet e Porosive
export const orderService = {
  createOrder: (orderData) => 
    axios.post('http://localhost:5002/api/orders', orderData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  getUserOrders: (userId) => 
    axios.get(`http://localhost:5002/api/orders/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  getOrderById: (id) => 
    axios.get(`http://localhost:5002/api/orders/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
}

// Shërbimet e Autentikimit
export const authService = {
  login: (credentials) => 
    axios.post('http://localhost:5003/api/auth/login', credentials),
  
  register: (userData) => 
    axios.post('http://localhost:5003/api/auth/register', userData),
  
  getProfile: () => 
    axios.get('http://localhost:5003/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  updateProfile: (profileData) => 
    axios.put('http://localhost:5003/api/users/profile', profileData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
}

// Shërbimet e Adminit
export const adminService = {
  getStatistics: () => 
    axios.get('http://localhost:5004/api/admin/statistics', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  getOrders: (params = {}) => 
    axios.get('http://localhost:5004/api/admin/orders', {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  getUsers: (params = {}) => 
    axios.get('http://localhost:5004/api/admin/users', {
      params,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  getRealtimeData: () => 
    axios.get('http://localhost:5004/api/admin/realtime', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }),
  
  updateOrderStatus: (orderId, status) => 
    axios.put(`http://localhost:5004/api/admin/orders/${orderId}/status`, 
      { status },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    )
}

export default API