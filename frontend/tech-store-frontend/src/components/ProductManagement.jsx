import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock_quantity: '',
    image_url: '',
    specifications: '{}'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productService.getAllProducts();
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Gabim në marrjen e produkteve:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id),
        stock_quantity: parseInt(formData.stock_quantity),
        specifications: JSON.parse(formData.specifications)
      };

      if (editingProduct) {
        // Përditëso produktin ekzistues
        console.log('Përditësimi i produktit:', editingProduct.id, productData);
        alert(`Produkti ${productData.name} u përditësua! (Demo)`);
      } else {
        // Krijo produkt të ri
        console.log('Krijimi i produktit të ri:', productData);
        alert(`Produkti ${productData.name} u krijua! (Demo)`);
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        stock_quantity: '',
        image_url: '',
        specifications: '{}'
      });
      
      // Rifresko listën
      fetchProducts();
    } catch (error) {
      console.error('Gabim në ruajtjen e produktit:', error);
      alert('Gabim në ruajtjen e produktit');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.category_id || '',
      stock_quantity: product.stock_quantity,
      image_url: product.image_url || '',
      specifications: JSON.stringify(product.specifications || {}, null, 2)
    });
    setShowForm(true);
  };

  const handleDelete = async (productId, productName) => {
    if (window.confirm(`Jeni i sigurt që dëshironi të fshini produktin "${productName}"?`)) {
      try {
        console.log('Fshirja e produktit:', productId);
        alert(`Produkti ${productName} u fshi! (Demo)`);
        fetchProducts();
      } catch (error) {
        console.error('Gabim në fshirjen e produktit:', error);
        alert('Gabim në fshirjen e produktit');
      }
    }
  };

  if (loading) {
    return <div className="loading">🔄 Duke ngarkuar produktet...</div>;
  }

  return (
    <div className="product-management">
      <div className="management-header">
        <h2>📦 Menaxhimi i Produkteve</h2>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              category_id: '',
              stock_quantity: '',
              image_url: '',
              specifications: '{}'
            });
            setShowForm(true);
          }}
        >
          ➕ Shto Produkt të Ri
        </button>
      </div>

      {/* Forma për shtim/përditësim */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingProduct ? '✏️ Përditëso Produktin' : '➕ Shto Produkt të Ri'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Emri i Produktit:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Përshkrimi:</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Çmimi (€):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Stoku:</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>URL e Fotografisë:</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="form-group">
                <label>Specifikimet (JSON):</label>
                <textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                  rows="4"
                  placeholder='{"processor": "Intel i7", "ram": "16GB"}'
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? '💾 Ruaj Ndryshimet' : '➕ Krijo Produkt'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  ❌ Anulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista e produkteve */}
      <div className="products-list">
        <h3>Lista e Produkteve ({products.length})</h3>
        
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img 
                  src={product.image_url || '/placeholder-product.jpg'} 
                  alt={product.name}
                />
              </div>
              
              <div className="product-info">
                <h4>{product.name}</h4>
                <p className="product-price">{product.price} €</p>
                <p className="product-stock">
                  Stoku: {product.stock_quantity} 
                  {product.stock_quantity < 10 && <span className="low-stock"> ⚠️</span>}
                </p>
                <p className="product-description">
                  {product.description?.substring(0, 100)}...
                </p>
              </div>

              <div className="product-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleEdit(product)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(product.id, product.name)}
                >
                  🗑️ Fshi
                </button>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="empty-state">
            <p>🤷‍♂️ Nuk ka produkte të disponueshme</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              ➕ Shto Produktin e Parë
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;