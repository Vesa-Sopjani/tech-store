import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productService } from '../services/api'

const ProductDetail = () => {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await productService.getProductById(id)
      if (response.data.success) {
        setProduct(response.data.data)
      }
    } catch (error) {
      console.error('Gabim në marrjen e produktit:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = () => {
    // Implementimi i shtimit në shportë
    alert(`Produkti ${product.name} u shtua në shportë!`)
  }

  if (loading) {
    return <div className="loading">Duke ngarkuar produktin...</div>
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Produkti nuk u gjet</h2>
        <Link to="/" className="btn btn-primary">Kthehu në Produktet</Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <img 
            src={product.image_url || '/placeholder-product.jpg'} 
            alt={product.name}
            style={{ 
              width: '100%', 
              borderRadius: '10px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          />
        </div>
        
        <div>
          <h1>{product.name}</h1>
          <p className="product-price" style={{ fontSize: '2rem' }}>
            {product.price} €
          </p>
          
          <p style={{ marginBottom: '1rem' }}>
            Kategoria: <strong>{product.category_name}</strong>
          </p>
          
          <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
            {product.description}
          </p>

          <div className="form-group">
            <label className="form-label">Sasia:</label>
            <input
              type="number"
              min="1"
              max={product.stock_quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="form-control"
              style={{ width: '100px' }}
            />
            <small>Në stok: {product.stock_quantity}</small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
              onClick={addToCart}
              className="btn btn-primary"
              disabled={product.stock_quantity === 0}
            >
              {product.stock_quantity === 0 ? 'Joa në Stok' : 'Shto në Shportë'}
            </button>
            <Link to="/" className="btn btn-secondary">
              Kthehu
            </Link>
          </div>
        </div>
      </div>

      {/* Specifikimet */}
      {product.specifications && (
        <div style={{ marginTop: '3rem' }}>
          <h3>Specifikimet Teknike</h3>
          <div style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <pre>{JSON.stringify(JSON.parse(product.specifications), null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetail