import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiSearch,
  FiStar,
  FiChevronRight,
  FiFilter,
  FiPackage,
  FiHelpCircle
} from 'react-icons/fi';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/$/, '');

  

const CategoriesPage = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ================= FETCH ALL =================
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/categories`);
      setCategories(res.data.data || []);
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  // ================= FETCH POPULAR =================
const fetchPopularCategories = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/categories/popular`);
    setPopularCategories(res.data.data || []);
  } catch (err) {
    console.error('Popular categories error', err);
  }
};


  useEffect(() => {
    Promise.all([fetchCategories(), fetchPopularCategories()])
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goToProducts = (category) => {
    navigate(`/products?category=${category}`);
  };

  // ================= UI STATES =================
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl font-semibold">
        Loading categories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-50">

    {/* HERO */}
    <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-5xl font-bold mb-4">
          Browse Categories
        </h1>
        <p className="text-lg text-blue-100 mb-8">
          Choose a category to explore products
        </p>

        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </div>
    </div>

    <div className="container mx-auto px-4 py-16">

      {/* POPULAR CATEGORIES */}
      {popularCategories.length > 0 && (
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Popular Categories</h2>
            <div className="flex items-center text-yellow-500">
              <FiStar className="mr-1" /> Trending
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {popularCategories.map(cat => (
              <div
                key={cat.id}
                onClick={() => goToProducts(cat.name)}
                className="cursor-pointer rounded-2xl p-6 text-white bg-gradient-to-br from-blue-500 to-purple-500 hover:scale-105 transition"
              >
                <div className="text-4xl mb-4">{cat.icon}</div>
                <h3 className="text-2xl font-bold mb-2">{cat.name}</h3>
                <p className="text-white/80 mb-4">{cat.description}</p>
                <span className="font-semibold">
                  {cat.product_count} sold →
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ALL CATEGORIES */}
      <section>
        <h2 className="text-3xl font-bold mb-6">All Categories</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map(cat => (
            <div
              key={cat.id}
              onClick={() => goToProducts(cat.name)}
              className="bg-white p-6 rounded-2xl shadow hover:shadow-xl cursor-pointer transition"
            >
              <div className="flex justify-between mb-4">
                <span className="text-3xl">{cat.icon}</span>
              </div>

              <h3 className="text-xl font-bold mb-2">{cat.name}</h3>
              <p className="text-gray-600 text-sm mb-6">
                {cat.description}
              </p>

              <div className="flex justify-between items-center text-blue-600 font-medium">
                View Products
                <FiChevronRight />
              </div>
            </div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <p className="text-center mt-16 text-gray-500">
            No categories found
          </p>
        )}
      </section>

      {/* WHY */}
      <section className="mt-24 grid md:grid-cols-3 gap-8 text-center">
        <div>
          <FiSearch className="mx-auto text-3xl text-blue-600 mb-4" />
          <h3 className="font-bold mb-2">Fast Search</h3>
          <p className="text-gray-600">Instant category lookup</p>
        </div>
        <div>
          <FiFilter className="mx-auto text-3xl text-purple-600 mb-4" />
          <h3 className="font-bold mb-2">Clean Structure</h3>
          <p className="text-gray-600">Products well organized</p>
        </div>
        <div>
          <FiPackage className="mx-auto text-3xl text-green-600 mb-4" />
          <h3 className="font-bold mb-2">Scalable</h3>
          <p className="text-gray-600">Ready for thousands of products</p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-12 text-center">
        <FiHelpCircle className="mx-auto text-4xl mb-4" />
        <h2 className="text-3xl font-bold mb-4">
          Need help choosing?
        </h2>
        <p className="text-blue-100 mb-6">
          Browse all products or contact support
        </p>

        <button
          onClick={() => navigate('/products')}
          className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:shadow-xl"
        >
          Browse All Products
        </button>
      </section>

    </div>
  </div>
);
};

export default CategoriesPage;
