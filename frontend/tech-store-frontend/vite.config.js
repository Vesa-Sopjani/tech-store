import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/products': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      '/api/orders': {
        target: 'http://localhost:5002', 
        changeOrigin: true
      },
      '/api/auth': {
        target: 'http://localhost:5003',
        changeOrigin: true
      },
      '/api/users': {
        target: 'http://localhost:5003',
        changeOrigin: true
      }
    }
  }
})