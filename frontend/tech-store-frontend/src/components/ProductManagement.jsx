import React, { useState, useEffect, useCallback } from 'react';
import { productService, categoryService } from '../services/api';
import { toast } from 'react-toastify';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [traceId] = useState(`trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [productToUpdateImage, setProductToUpdateImage] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  
  // Simple event emitter simulation
  const emitEvent = useCallback((event, data) => {
    console.log(`📢 [Event] ${event}`, data);
    
    // Simulate Kafka events
    if (event.includes('kafka') || event.includes('product')) {
      console.log(`📨 [Kafka Simulation] Event: ${event}`, data);
    }
  }, []);

  // Helper function to create SVG fallback
  const createFallbackSVG = useCallback((width, height, text = 'No Image') => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f3f4f6"/>
      <circle cx="${width/2}" cy="${height/3}" r="${Math.min(width, height)/6}" fill="#d1d5db"/>
      <rect x="${width/4}" y="${height/2}" width="${width/2}" height="${height/3}" rx="5" fill="#d1d5db"/>
      <text x="${width/2}" y="${height/1.7}" font-family="Arial" font-size="${Math.min(width, height)/10}" 
            fill="#6b7280" text-anchor="middle" dy=".3em">${text}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, []);

  // Image error handler
  const handleImageError = useCallback((e, fallbackText = 'Image Error') => {
    const { width, height } = e.target;
    const fallbackSVG = createFallbackSVG(width || 100, height || 100, fallbackText);
    e.target.src = fallbackSVG;
    e.target.onerror = null; // Prevent infinite loop
  }, [createFallbackSVG]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock_quantity: '',
    image_url: '',
    specifications_text: ''
  });

  useEffect(() => {
    console.log(`🔍 [Trace:${traceId}] ProductManagement mounted`);
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`📊 [Performance] Fetching products...`);
      
      const startTime = performance.now();
      const response = await productService.getAll();
      const latency = performance.now() - startTime;
      
      console.log(`⏱️ API latency: ${latency.toFixed(2)}ms`);
      
      if (response && response.success) {
        setProducts(response.data || []);
        setLastUpdatedTime(new Date());
        
        // Simulate event-driven architecture
        emitEvent('analytics:products_fetched', {
          count: response.data.length,
          latency_ms: latency,
          trace_id: traceId
        });
      } else {
        toast.error('Error fetching products');
        emitEvent('error:api_fetch_failed', {
          trace_id: traceId,
          message: 'Failed to fetch products'
        });
      }
    } catch (error) {
      console.error('❌ Error:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  }, [traceId, emitEvent]);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAll();
      if (response && response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(`🚀 [Event] Submitting product form - Trace: ${traceId}`);
    
    try {
      // Convert specifications from text to object
      const specifications = {};
      if (formData.specifications_text) {
        const lines = formData.specifications_text.split('\n').filter(line => line.trim() !== '');
        lines.forEach(line => {
          const parts = line.split(':').map(part => part.trim());
          if (parts.length >= 2) {
            const key = parts[0];
            const value = parts.slice(1).join(':').trim();
            if (key && value) {
              specifications[key] = value;
            }
          }
        });
      }
      
      // Create product data
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price) || 0,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        image_url: formData.image_url || '',
        specifications: specifications,
        metadata: {
          created_at: new Date().toISOString(),
          version: '1.0.0',
          trace_id: traceId
        }
      };
      
      // Data validation
      if (productData.price < 0) {
        toast.error('Price cannot be negative');
        return;
      }
      
      if (productData.stock_quantity < 0) {
        toast.error('Stock quantity cannot be negative');
        return;
      }
      
      // Send to backend
      if (editingProduct) {
        console.log(`✏️ Updating product ${editingProduct.id}...`);
        await productService.update(editingProduct.id, productData);
        
        // Simulate Kafka event
        emitEvent('kafka:product_updated', {
          product_id: editingProduct.id,
          product_name: productData.name,
          timestamp: new Date().toISOString(),
          trace_id: traceId
        });
        
        toast.success('Product updated successfully!');
      } else {
        console.log('➕ Creating new product...');
        await productService.create(productData);
        
        // Simulate Kafka event
        emitEvent('kafka:product_created', {
          product: productData,
          timestamp: new Date().toISOString(),
          trace_id: traceId
        });
        
        toast.success('Product created successfully!');
      }
      
      // Reset and refresh
      setShowForm(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        stock_quantity: '',
        image_url: '',
        specifications_text: ''
      });
      
      fetchProducts();
      
    } catch (error) {
      console.error('❌ Error saving product:', error);
      toast.error('Error: ' + (error.message || 'Something went wrong'));
      
      // Simulate DLQ
      emitEvent('error:dlq_product_save_failed', {
        error: error.message,
        data: formData,
        trace_id: traceId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleEdit = (product) => {
    console.log('✏️ Editing:', product);
    
    // Convert specifications from object to text
    let specificationsText = '';
    if (product.specifications && typeof product.specifications === 'object') {
      Object.entries(product.specifications).forEach(([key, value]) => {
        specificationsText += `${key}: ${value}\n`;
      });
    }
    
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      category_id: product.category_id || '',
      stock_quantity: product.stock_quantity || '',
      image_url: product.image_url || '',
      specifications_text: specificationsText
    });
    setShowForm(true);
  };

  // Funksioni i ri për fshirje me modal
  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await productService.delete(productToDelete.id);
      
      // Simulate event-driven notification
      emitEvent('product:deleted', {
        productId: productToDelete.id,
        productName: productToDelete.name,
        timestamp: new Date().toISOString(),
        trace_id: traceId
      });
      
      // Simulate Kafka event
      emitEvent('kafka:product_deleted', {
        product_id: productToDelete.id,
        product_name: productToDelete.name,
        timestamp: new Date().toISOString(),
        trace_id: traceId
      });
      
      toast.success(`Product "${productToDelete.name}" deleted successfully!`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error deleting product');
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  // Funksioni për shtimin e fotos
  const handleAddImageClick = (product) => {
    setProductToUpdateImage(product);
    setNewImageUrl(product.image_url || '');
    setShowAddImageModal(true);
  };

  const handleUpdateImage = async () => {
    if (!productToUpdateImage) return;
    
    try {
      const updatedProduct = {
        ...productToUpdateImage,
        image_url: newImageUrl.trim()
      };
      
      await productService.update(productToUpdateImage.id, updatedProduct);
      toast.success('Image updated successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error('Error updating image');
    } finally {
      setShowAddImageModal(false);
      setProductToUpdateImage(null);
      setNewImageUrl('');
    }
  };

  // Validate image URL format
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) !== null;
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Product Management</h1>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* System Architecture Header */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Product Management</h1>
            <p className="text-gray-600 text-sm">
              Microservice Architecture • Event-Driven • Real-time Processing
            </p>
          </div>
          <div className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            Trace ID: {traceId.substring(0, 8)}...
          </div>
        </div>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-gray-600">
            {products.length} products • Last updated: {lastUpdatedTime.toLocaleTimeString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchProducts}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 flex items-center transition-colors duration-200"
          >
            <span className="mr-2">🔄</span>
            Refresh
          </button>
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '',
                description: '',
                price: '',
                category_id: '',
                stock_quantity: '',
                image_url: '',
                specifications_text: ''
              });
              setShowForm(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center transition-colors duration-200"
          >
            <span className="mr-2">+</span>
            Add New Product
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete product <span className="font-semibold">"{productToDelete.name}"</span>? 
                This action cannot be undone.
              </p>
              
              <div className="bg-red-50 border border-red-100 rounded p-3 mb-6">
                <div className="flex items-start">
                  <span className="text-red-500 mr-2">📦</span>
                  <div className="text-sm">
                    <p className="font-medium text-red-700">Product Details:</p>
                    <p className="text-red-600">ID: {productToDelete.id}</p>
                    <p className="text-red-600">Price: ${productToDelete.price}</p>
                    <p className="text-red-600">Stock: {productToDelete.stock_quantity}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors duration-200 flex items-center justify-center"
                >
                  <span className="mr-2">🗑️</span>
                  Delete Product
                </button>
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Image Modal */}
      {showAddImageModal && productToUpdateImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Add/Update Image</h3>
                  <p className="text-sm text-gray-500">For product: {productToUpdateImage.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddImageModal(false);
                    setProductToUpdateImage(null);
                    setNewImageUrl('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Image URL {!isValidImageUrl(newImageUrl) && newImageUrl && (
                    <span className="text-red-500 text-xs ml-2">⚠️ May not be a valid image URL</span>
                  )}
                </label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2 mb-3"
                  placeholder="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"
                />
                
                {newImageUrl && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Preview:</p>
                    <div className="flex justify-center">
                      <div className="relative">
                        <img
                          src={newImageUrl}
                          alt="Preview"
                          className="w-40 h-40 object-cover rounded-lg border cursor-pointer"
                          onClick={() => setPreviewImage(newImageUrl)}
                          onError={(e) => handleImageError(e, 'Invalid Image')}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                          Click to enlarge
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleUpdateImage}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200"
                  disabled={!newImageUrl.trim()}
                >
                  Update Image
                </button>
                <button 
                  onClick={() => {
                    setShowAddImageModal(false);
                    setProductToUpdateImage(null);
                    setNewImageUrl('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>💡 Tip: You can use image hosting services like:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>Unsplash: https://images.unsplash.com/...</li>
                  <li>Cloudinary: https://res.cloudinary.com/...</li>
                  <li>Imgur: https://i.imgur.com/...</li>
                  <li>Any valid image URL ending with .jpg, .png, .gif, .webp</li>
                </ul>
                <p className="mt-2">✅ Valid URL examples:</p>
                <code className="block text-xs bg-gray-100 p-2 rounded mt-1 truncate">
                  https://images.unsplash.com/photo-1511707171634-5f897ff02aa9
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">
                    {editingProduct ? 'Update Product' : 'Add New Product'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingProduct ? `Editing product #${editingProduct.id}` : 'Creating new product record'}
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl transition-colors duration-200"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    required
                    maxLength="200"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border rounded px-3 py-2 min-h-[100px]"
                    required
                  />
                </div>

                {/* Price and Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Price (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                    {formData.price < 0 && (
                      <p className="text-red-500 text-xs mt-1">⚠️ Price cannot be negative</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                    {formData.stock_quantity < 0 && (
                      <p className="text-red-500 text-xs mt-1">⚠️ Stock cannot be negative</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Image URL me preview */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Image URL (optional) {formData.image_url && !isValidImageUrl(formData.image_url) && (
                      <span className="text-red-500 text-xs ml-2">⚠️ May not be a valid image URL</span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Preview:</p>
                      <div className="relative inline-block">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded border cursor-pointer"
                          onClick={() => setPreviewImage(formData.image_url)}
                          onError={(e) => handleImageError(e, 'Invalid URL')}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                          Click to enlarge
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Specifications */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Specifications (optional)
                  </label>
                  <textarea
                    value={formData.specifications_text}
                    onChange={(e) => setFormData({...formData, specifications_text: e.target.value})}
                    className="w-full border rounded px-3 py-2 min-h-[120px]"
                    placeholder="Write specifications as:
color: black
memory: 256GB
screen: 6.7 inches
battery: 5000mAh"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200"
                  >
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal për preview të fotos */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center z-10 hover:bg-opacity-70 transition-opacity duration-200"
            >
              ×
            </button>
            <div className="p-2">
              <img
                src={previewImage}
                alt="Product Preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                onError={(e) => handleImageError(e, 'Image Not Found')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Products List</h3>
            <div className="text-sm text-gray-500">
              Event-Driven Updates • Real-time Monitoring
            </div>
          </div>
        </div>
        
        {products.length > 0 ? (
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Photo</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-t hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{product.id}</code>
                  </td>
                  
                  {/* Kolona e fotos */}
                  <td className="px-4 py-3">
                    {product.image_url ? (
                      <div className="relative group">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity duration-200"
                          onClick={() => setPreviewImage(product.image_url)}
                          onError={(e) => handleImageError(e, 'No Image')}
                        />
                        {/* Tooltip për preview hover */}
                        <div className="absolute hidden group-hover:block z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                          <div className="bg-white p-1 rounded shadow-lg border">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-32 h-32 object-cover rounded"
                              onError={(e) => handleImageError(e, 'No Image')}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors duration-200 group"
                        onClick={() => handleAddImageClick(product)}
                        title="Click to add image"
                      >
                        <span className="text-gray-400 text-xs">+ Add</span>
                        {/* Tooltip */}
                        <div className="absolute hidden group-hover:block z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48">
                          <div className="bg-white p-3 rounded shadow-lg border">
                            <p className="text-sm font-medium mb-2">Add Product Image</p>
                            <p className="text-xs text-gray-600">Click to add or update image for this product.</p>
                            <p className="text-xs text-gray-500 mt-1">Supports: JPG, PNG, GIF, WebP</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {product.description?.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-black-600">${product.price}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs transition-colors duration-200 ${
                      product.stock_quantity > 10 
                        ? 'bg-green-100 text-green-800' 
                        : product.stock_quantity > 0 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock_quantity}
                      {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                        <span className="ml-1">⚠️</span>
                      )}
                      {product.stock_quantity === 0 && (
                        <span className="ml-1">🚫</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {product.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200 transition-colors duration-200 flex items-center"
                      >
                        <span className="mr-1">✏️</span>
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(product)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors duration-200 flex items-center"
                      >
                        <span className="mr-1">🗑️</span>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-lg mb-4">No products available</p>
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  description: '',
                  price: '',
                  category_id: '',
                  stock_quantity: '',
                  image_url: '',
                  specifications_text: ''
                });
                setShowForm(true);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors duration-200"
            >
              + Add First Product
            </button>
          </div>
        )}
        
        {/* System Architecture Footer */}
        <div className="p-4 border-t bg-gray-50 text-xs text-gray-500">
          <div className="flex justify-between">
            <div>
              <span className="mr-4">🏗️ Microservices Architecture</span>
              <span className="mr-4">📨 Event-Driven (Kafka)</span>
              <span className="mr-4">⚡ Real-time Processing</span>
              <span className="mr-4">🖼️ Image Preview</span>
            </div>
            <div>
              <span>Trace: {traceId.substring(0, 12)}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;