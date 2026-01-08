import React, { useState, useEffect } from 'react';
import {
  FiPackage, FiSearch, FiEdit, FiTrash2, FiEye, FiPlus,
  FiRefreshCw, FiFilter, FiDownload, FiImage, FiGrid,
  FiChevronLeft, FiChevronRight, FiDollarSign, FiTrendingUp,
  FiX, FiUpload, FiList, FiTag, FiFileText
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const ProductManagement = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    stockStatus: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    stock_quantity: '',
    image_url: '',
    specifications_text: ''
  });
  const [productStats, setProductStats] = useState({
    categoryStats: [],
    stockStats: {},
    priceStats: {}
  });

  // Mock data for development
  const generateMockProducts = () => {
    const mockProducts = [];
    const mockCategories = [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Clothing' },
      { id: 3, name: 'Books' },
      { id: 4, name: 'Home & Garden' },
      { id: 5, name: 'Sports' }
    ];

    for (let i = 1; i <= 50; i++) {
      const category = mockCategories[Math.floor(Math.random() * mockCategories.length)];
      const price = (Math.random() * 1000).toFixed(2);
      const stock = Math.floor(Math.random() * 100);
      
      mockProducts.push({
        id: i,
        name: `Product ${i}`,
        description: `This is a detailed description for product ${i}. It includes all the features and benefits that customers should know about.`,
        price: parseFloat(price),
        category_id: category.id,
        category_name: category.name,
        stock_quantity: stock,
        image_url: `https://picsum.photos/seed/${i}/300/200`,
        specifications: {
          color: ['Black', 'White', 'Blue', 'Red'][Math.floor(Math.random() * 4)],
          weight: `${Math.floor(Math.random() * 10)}kg`,
          dimensions: '10 x 5 x 3 inches',
          material: ['Plastic', 'Metal', 'Wood'][Math.floor(Math.random() * 3)]
        },
        status: stock > 0 ? 'active' : 'out_of_stock',
        created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          sold_count: Math.floor(Math.random() * 100),
          rating: (Math.random() * 5).toFixed(1)
        }
      });
    }
    
    return mockProducts;
  };

  // Mock categories
  const generateMockCategories = () => {
    return [
      { id: 1, name: 'Electronics', product_count: 15 },
      { id: 2, name: 'Clothing', product_count: 12 },
      { id: 3, name: 'Books', product_count: 8 },
      { id: 4, name: 'Home & Garden', product_count: 10 },
      { id: 5, name: 'Sports', product_count: 5 },
      { id: 6, name: 'Beauty', product_count: 7 },
      { id: 7, name: 'Toys', product_count: 6 },
      { id: 8, name: 'Automotive', product_count: 4 }
    ];
  };

  // Fetch products data
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For demo, use mock data
      const mockProducts = generateMockProducts();
      const total = mockProducts.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedProducts = mockProducts.slice(startIndex, endIndex);
      
      setProducts(paginatedProducts);
      setPagination({
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        hasNextPage: endIndex < total,
        hasPrevPage: startIndex > 0
      });
      
      // Generate mock stats
      setProductStats({
        categoryStats: generateMockCategories().map(cat => ({
          ...cat,
          total_value: Math.floor(Math.random() * 10000)
        })),
        stockStats: {
          total_products: total,
          in_stock: mockProducts.filter(p => p.stock_quantity > 0).length,
          low_stock: mockProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length,
          out_of_stock: mockProducts.filter(p => p.stock_quantity === 0).length
        },
        priceStats: {
          average_price: (mockProducts.reduce((sum, p) => sum + p.price, 0) / total).toFixed(2),
          min_price: Math.min(...mockProducts.map(p => p.price)).toFixed(2),
          max_price: Math.max(...mockProducts.map(p => p.price)).toFixed(2)
        }
      });
      
      setCategories(generateMockCategories());
      
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products. Using demo data.');
      // Fallback to minimal data
      const fallbackProducts = [
        {
          id: 1,
          name: 'Sample Product',
          description: 'Sample product description',
          price: 99.99,
          category_id: 1,
          category_name: 'Electronics',
          stock_quantity: 50,
          image_url: '',
          specifications: {},
          status: 'active'
        }
      ];
      
      setProducts(fallbackProducts);
      setPagination({
        ...pagination,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchProducts();
  }, [pagination.page, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      stockStatus: '',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page }));
    }
  };

  // Open modal
  const openModal = (type, product = null) => {
    setModalType(type);
    setSelectedProduct(product);
    
    if (type === 'create') {
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        stock_quantity: '',
        image_url: '',
        specifications_text: ''
      });
    } else if (product && (type === 'edit' || type === 'view')) {
      // Convert specifications from object to text
      let specificationsText = '';
      if (product.specifications && typeof product.specifications === 'object') {
        Object.entries(product.specifications).forEach(([key, value]) => {
          specificationsText += `${key}: ${value}\n`;
        });
      }
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category_id: product.category_id || '',
        stock_quantity: product.stock_quantity || '',
        image_url: product.image_url || '',
        specifications_text: specificationsText
      });
    } else if (type === 'image') {
      setFormData({
        image_url: product?.image_url || ''
      });
    }
    
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      stock_quantity: '',
      image_url: '',
      specifications_text: ''
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new product
  const handleCreateProduct = async () => {
    try {
      if (!formData.name || !formData.price || !formData.category_id) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.price < 0) {
        toast.error('Price cannot be negative');
        return;
      }

      if (formData.stock_quantity < 0) {
        toast.error('Stock quantity cannot be negative');
        return;
      }

      // Convert specifications text to object
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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newProduct = {
        id: products.length + 1,
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category_name: categories.find(c => c.id === parseInt(formData.category_id))?.name || '',
        specifications: specifications,
        status: (parseInt(formData.stock_quantity) || 0) > 0 ? 'active' : 'out_of_stock',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          sold_count: 0,
          rating: 0
        }
      };

      toast.success('Product created successfully!');
      setProducts(prev => [newProduct, ...prev]);
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1,
        totalPages: Math.ceil((prev.total + 1) / prev.limit)
      }));
      
      closeModal();
      
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    }
  };

  // Update product
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      // Convert specifications text to object
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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedProduct = {
        ...selectedProduct,
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        category_name: categories.find(c => c.id === parseInt(formData.category_id))?.name || '',
        specifications: specifications,
        status: (parseInt(formData.stock_quantity) || 0) > 0 ? 'active' : 'out_of_stock',
        updated_at: new Date().toISOString()
      };

      toast.success('Product updated successfully!');
      setProducts(prev => prev.map(product => 
        product.id === selectedProduct.id 
          ? updatedProduct
          : product
      ));
      
      closeModal();
      
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    if (!window.confirm(`Are you sure you want to delete product "${selectedProduct.name}"?`)) {
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Product deleted successfully!');
      setProducts(prev => prev.filter(product => product.id !== selectedProduct.id));
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
        totalPages: Math.ceil((prev.total - 1) / prev.limit)
      }));
      
      closeModal();
      
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  // Update product image
  const handleUpdateImage = async () => {
    if (!selectedProduct) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedProduct = {
        ...selectedProduct,
        image_url: formData.image_url,
        updated_at: new Date().toISOString()
      };

      toast.success('Product image updated successfully!');
      setProducts(prev => prev.map(product => 
        product.id === selectedProduct.id 
          ? updatedProduct
          : product
      ));
      
      closeModal();
      
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error('Failed to update image');
    }
  };

  // Export products to CSV
  const exportToCSV = () => {
    if (products.length === 0) {
      toast.error('No products to export');
      return;
    }

    const headers = ['ID', 'Name', 'Description', 'Category', 'Price', 'Stock', 'Status', 'Created'];
    const csvData = products.map(product => [
      product.id,
      product.name,
      product.description?.substring(0, 100) || '',
      product.category_name,
      product.price,
      product.stock_quantity,
      product.status,
      new Date(product.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Products exported to CSV');
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Render stock status badge
  const renderStockBadge = (quantity) => {
    if (quantity === 0) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          Out of Stock
        </span>
      );
    } else if (quantity <= 10) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
          Low Stock ({quantity})
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          In Stock ({quantity})
        </span>
      );
    }
  };

  // Render category badge
  const renderCategoryBadge = (category) => {
    const categoryColors = {
      'Electronics': 'bg-blue-100 text-blue-800',
      'Clothing': 'bg-purple-100 text-purple-800',
      'Books': 'bg-green-100 text-green-800',
      'Home & Garden': 'bg-yellow-100 text-yellow-800',
      'Sports': 'bg-red-100 text-red-800',
      'Beauty': 'bg-pink-100 text-pink-800',
      'Toys': 'bg-indigo-100 text-indigo-800',
      'Automotive': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[category] || 'bg-gray-100 text-gray-800'}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiPackage className="mr-3 text-red-600" />
            Product Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage products, inventory, and pricing
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={products.length === 0}
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => openModal('create')}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            <FiPlus className="mr-2" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {productStats.stockStats?.total_products || products.length}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiPackage className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-blue-600 text-sm">
            {productStats.stockStats?.in_stock || 0} in stock
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Average Price</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {formatPrice(productStats.priceStats?.average_price || 0)}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiDollarSign className="text-2xl text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-green-600 text-sm">
            Range: {formatPrice(productStats.priceStats?.min_price || 0)} - {formatPrice(productStats.priceStats?.max_price || 0)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Low Stock</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {productStats.stockStats?.low_stock || 0}
              </h3>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FiTrendingUp className="text-2xl text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 text-yellow-600 text-sm">
            Needs attention
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Out of Stock</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {productStats.stockStats?.out_of_stock || 0}
              </h3>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FiX className="text-2xl text-red-600" />
            </div>
          </div>
          <div className="mt-4 text-red-600 text-sm">
            Requires restocking
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <FiFilter className="mr-2" />
            Filters & Search
          </h3>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={fetchProducts}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Products
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Name, description, or SKU..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Status
            </label>
            <select
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="created_at">Date Added</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock_quantity">Stock</option>
              <option value="updated_at">Last Updated</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Price
            </label>
            <div className="relative">
              <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                placeholder="Min price"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Price
            </label>
            <div className="relative">
              <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                placeholder="Max price"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Products List
            <span className="text-gray-600 text-sm font-normal ml-2">
              ({pagination.total} total)
            </span>
          </h3>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total}
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FiPlus className="mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-700">
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Stock</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <FiPackage className="text-4xl mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">No products found</p>
                        <p className="text-sm mt-2">Try adjusting your filters or add a new product</p>
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-lg overflow-hidden mr-3 flex-shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setModalType('image');
                                    setShowModal(true);
                                  }}
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/48x48?text=No+Image';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <FiImage className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description?.substring(0, 60)}...
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                ID: {product.id} • Updated: {formatDate(product.updated_at)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {renderCategoryBadge(product.category_name)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-lg text-gray-900">
                            {formatPrice(product.price)}
                          </div>
                          {product.metadata?.rating && (
                            <div className="text-sm text-yellow-600 flex items-center">
                              ⭐ {product.metadata.rating}/5
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {renderStockBadge(product.stock_quantity)}
                          {product.metadata?.sold_count > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Sold: {product.metadata.sold_count}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status === 'active' ? 'Active' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openModal('view', product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FiEye />
                            </button>
                            
                            <button
                              onClick={() => openModal('edit', product)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <FiEdit />
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setModalType('image');
                                setShowModal(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Update Image"
                            >
                              <FiImage />
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setModalType('delete');
                                setShowModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {products.length > 0 && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={!pagination.hasPrevPage || pagination.page === 1}
                    className={`px-3 py-1 rounded-lg ${pagination.hasPrevPage && pagination.page !== 1 ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    First
                  </button>
                  
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className={`p-2 rounded-lg ${pagination.hasPrevPage ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    <FiChevronLeft />
                  </button>
                  
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 rounded-lg ${pagination.page === pageNum ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className={`p-2 rounded-lg ${pagination.hasNextPage ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    <FiChevronRight />
                  </button>
                  
                  <button
                    onClick={() => goToPage(pagination.totalPages)}
                    disabled={!pagination.hasNextPage || pagination.page === pagination.totalPages}
                    className={`px-3 py-1 rounded-lg ${pagination.hasNextPage && pagination.page !== pagination.totalPages ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category Distribution Stats */}
      {productStats.categoryStats?.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Category Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {productStats.categoryStats.slice(0, 4).map((categoryStat) => (
              <div key={categoryStat.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{categoryStat.name}</span>
                  <span className="text-lg font-bold">{categoryStat.product_count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-red-500"
                    style={{ width: `${(categoryStat.product_count / productStats.stockStats.total_products) * 100 || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Total Value: {formatPrice(categoryStat.total_value || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for View/Edit/Create/Delete/Image */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-2xl ${modalType === 'image' ? 'max-w-2xl' : 'max-w-lg'} w-full max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {modalType === 'view' && 'Product Details'}
                  {modalType === 'edit' && 'Edit Product'}
                  {modalType === 'create' && 'Create New Product'}
                  {modalType === 'delete' && 'Delete Product'}
                  {modalType === 'image' && 'Product Image'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {/* Modal Content */}
              {modalType === 'delete' ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiTrash2 className="text-2xl text-red-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    Delete Product
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to delete product{' '}
                    <span className="font-bold">{selectedProduct?.name}</span>?
                    This action cannot be undone.
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteProduct}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Product
                    </button>
                  </div>
                </div>
              ) : modalType === 'image' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="https://example.com/product-image.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter a valid image URL (jpg, png, gif, webp)
                    </p>
                  </div>

                  {formData.image_url && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <div className="flex justify-center">
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="max-w-full max-h-64 object-contain rounded-lg border"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x300?text=Invalid+Image';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateImage}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Update Image
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (modalType === 'create') {
                    handleCreateProduct();
                  } else if (modalType === 'edit') {
                    handleUpdateProduct();
                  }
                }}>
                  <div className="space-y-4">
                    {/* Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows="3"
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Price and Stock */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price ($) *
                        </label>
                        <div className="relative">
                          <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            required
                            min="0"
                            step="0.01"
                            disabled={modalType === 'view'}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stock Quantity *
                        </label>
                        <input
                          type="number"
                          name="stock_quantity"
                          value={formData.stock_quantity}
                          onChange={handleInputChange}
                          required
                          min="0"
                          disabled={modalType === 'view'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        required
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">Select Category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Specifications */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specifications
                      </label>
                      <textarea
                        name="specifications_text"
                        value={formData.specifications_text}
                        onChange={handleInputChange}
                        rows="4"
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm"
                        placeholder="Format:
color: Black
size: Medium
material: Cotton
weight: 500g"
                      />
                    </div>

                    {/* Image URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image URL
                      </label>
                      <input
                        type="url"
                        name="image_url"
                        value={formData.image_url}
                        onChange={handleInputChange}
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Additional info for view mode */}
                    {modalType === 'view' && selectedProduct && (
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product ID:</span>
                          <span className="font-mono">{selectedProduct.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedProduct.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedProduct.status === 'active' ? 'Active' : 'Out of Stock'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>{formatDate(selectedProduct.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Updated:</span>
                          <span>{formatDate(selectedProduct.updated_at)}</span>
                        </div>
                        {selectedProduct.metadata && (
                          <>
                            {selectedProduct.metadata.sold_count > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Units Sold:</span>
                                <span className="font-bold">{selectedProduct.metadata.sold_count}</span>
                              </div>
                            )}
                            {selectedProduct.metadata.rating > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Rating:</span>
                                <span className="flex items-center text-yellow-600">
                                  ⭐ {selectedProduct.metadata.rating}/5
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex space-x-4 mt-8">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {modalType === 'view' ? 'Close' : 'Cancel'}
                    </button>
                    
                    {modalType !== 'view' && (
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        {modalType === 'create' ? 'Create Product' : 'Save Changes'}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;