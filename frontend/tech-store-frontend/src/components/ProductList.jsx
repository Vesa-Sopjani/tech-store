// frontend/src/components/ProductList.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiStar, FiHeart, FiShoppingCart } from 'react-icons/fi';

const ProductList = ({ products, addToCart, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [wishlist, setWishlist] = useState([]);

  const categories = ['All', 'Electronics', 'Computers', 'Phones', 'Audio', 'Wearables'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleWishlist = (product) => {
    if (!user) {
      toast.error('Please login to add to wishlist');
      return;
    }
    
    if (wishlist.includes(product.id)) {
      setWishlist(wishlist.filter(id => id !== product.id));
      toast.info('Removed from wishlist');
    } else {
      setWishlist([...wishlist, product.id]);
      toast.success('Added to wishlist!');
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-4">Discover Amazing Tech</h1>
        <p className="text-blue-100 mb-6">Premium electronics with the latest technology</p>
        <div className="relative max-w-2xl">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 rounded-full bg-white/20 backdrop-blur-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <div className="absolute right-3 top-3">
            🔍
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card group">
              {/* Product Image */}
              <div className="relative overflow-hidden h-56">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                />
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`absolute top-4 right-4 p-2 rounded-full ${
                    wishlist.includes(product.id)
                      ? 'bg-red-500 text-white'
                      : 'bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white'
                  } transition-all`}
                >
                  <FiHeart className={wishlist.includes(product.id) ? 'fill-current' : ''} />
                </button>
                {product.discount && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-sm font-bold">
                    -{product.discount}%
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
                    {product.category}
                  </span>
                  <div className="flex items-center">
                    <FiStar className="text-yellow-400 fill-current" />
                    <span className="ml-1 font-semibold">{product.rating || '4.5'}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                  <Link to={`/products/${product.id}`} className="hover:text-purple-600">
                    {product.name}
                  </Link>
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      ${product.price}
                    </div>
                    {product.originalPrice && (
                      <div className="text-sm text-gray-400 line-through">
                        ${product.originalPrice}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-xl hover:shadow-purple-500/25 transition-all"
                  >
                    <FiShoppingCart className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;