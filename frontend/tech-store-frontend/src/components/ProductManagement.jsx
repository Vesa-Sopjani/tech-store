import React, { useState, useEffect } from 'react';
import { productService, categoryService } from '../services/api';
import { toast } from 'react-toastify';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
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
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll();
      
      if (response && response.success) {
        setProducts(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

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
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id) || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        specifications: JSON.parse(formData.specifications || '{}')
      };

      if (editingProduct) {
        // Update existing product
        await productService.update(editingProduct.id, productData);
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        await productService.create(productData);
        toast.success('Product created successfully!');
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
      
      fetchProducts();
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error: ' + error.message);
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
    if (window.confirm(`Are you sure you want to delete product "${productName}"?`)) {
      try {
        await productService.delete(productId);
        toast.success(`Product "${productName}" deleted!`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Error deleting product');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Product Management</h1>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Product Management</h1>
      
      {/* Header with buttons */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-gray-600">
            {products.length} products
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchProducts}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
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
                specifications: '{}'
              });
              setShowForm(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            + Add New Product
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Update Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
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
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
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

                {/* Photo URL */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Photo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty if no photo
                  </p>
                </div>

                {/* SPECIFICATIONS - SIMPLE VERSION */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Specifications (optional)
                  </label>
                  <textarea
                    value={formData.specifications_text || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setFormData({...formData, specifications_text: text});
                      
                      // Convert text to JSON automatically
                      const lines = text.split('\n').filter(line => line.trim() !== '');
                      const specs = {};
                      
                      lines.forEach(line => {
                        const parts = line.split(':').map(part => part.trim());
                        if (parts.length >= 2) {
                          const key = parts[0];
                          const value = parts.slice(1).join(':');
                          specs[key] = value;
                        }
                      });
                      
                      setFormData(prev => ({
                        ...prev,
                        specifications: JSON.stringify(specs)
                      }));
                    }}
                    className="w-full border rounded px-3 py-2 min-h-[120px]"
                    placeholder="Write specifications as:
color: black
memory: 256GB
screen: 6.7 inches
battery: 5000mAh"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Write one specification per line in the format: <strong>name: value</strong>
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Stock</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{product.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {product.description?.substring(0, 50)}...
                  </div>
                </td>
                <td className="px-4 py-3">${product.price}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    product.stock_quantity > 10 
                      ? 'bg-green-100 text-green-800' 
                      : product.stock_quantity > 0 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {product.category_name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {products.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No products available
            <button 
              onClick={() => setShowForm(true)}
              className="mt-4 block mx-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              + Add First Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;