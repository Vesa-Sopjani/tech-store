import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productService } from '../services/api'

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [filters])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await productService.getAllProducts(filters)
      if (response.data.success) {
        setProducts(response.data.data)
      }
    } catch (error) {
      console.error('Gabim në marrjen e produkteve:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await productService.getCategories()
      if (response.data.success) {
        setCategories(response.data.data)
      }
    } catch (error) {
      console.error('Gabim në marrjen e kategorive:', error)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return <div className="loading">Duke ngarkuar produktet...</div>
  }

  return (
    <div>
      <div className="filters" style={{ 
        padding: '1rem 0', 
        display: 'flex', 
        gap: '1rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Kërko produkte..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="form-control"
            style={{ minWidth: '200px' }}
          />
        </div>
        
        <div className="form-group">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="form-control"
          >
            <option value="">Të gjitha kategoritë</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <input
            type="number"
            placeholder="Çmimi minimal"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="form-control"
            style={{ width: '150px' }}
          />
        </div>

        <div className="form-group">
          <input
            type="number"
            placeholder="Çmimi maksimal"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="form-control"
            style={{ width: '150px' }}
          />
        </div>
      </div>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <img 
              src={product.image_url || '/placeholder-product.jpg'} 
              alt={product.name}
              className="product-image"
            />
            <h3 className="product-name">{product.name}</h3>
            <p className="product-price">{product.price} €</p>
            <p className="product-description">
              {product.description?.substring(0, 100)}...
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to={`/product/${product.id}`} className="btn btn-primary">
                Shiko Detajet
              </Link>
              <button className="btn btn-success">
                Shto në Shportë
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>Nuk u gjet asnjë produkt</h3>
          <p>Provoni të ndryshoni filtrat e kërkimit</p>
        </div>
      )}
    </div>
  )
}

export default ProductList