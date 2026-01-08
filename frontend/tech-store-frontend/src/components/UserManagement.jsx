import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiSearch, FiEdit, FiTrash2, FiEye, FiLock, FiUnlock,
  FiRefreshCw, FiFilter, FiDownload, FiMail, FiPhone, FiUser,
  FiChevronLeft, FiChevronRight, FiPlus, FiX
} from 'react-icons/fi';
import { toast } from 'react-toastify';

const UsersManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
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
    role: '',
    sortBy: 'created_at',
    sortOrder: 'DESC',
    showDeleted: false
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    address: '',
    phone: '',
    role: 'customer',
    sendWelcomeEmail: false
  });
  const [userStats, setUserStats] = useState({
    roleStats: [],
    totalStats: {},
    trends: []
  });

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        role: filters.role,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        showDeleted: filters.showDeleted
      }).toString();
      
      const response = await fetch(`/api/admin/users${params ? `?${params}` : ''}`, {
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users || []);
        setPagination(data.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        });
      } else {
        toast.error(data.message || 'Failed to load users');
        // Mock data fallback
        setMockData();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users. Using demo data.');
      // Mock data fallback
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Mock data fallback
  const setMockData = () => {
    const mockUsers = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        full_name: 'Admin User',
        role: 'admin',
        email_verified: true,
        is_deleted: false,
        locked_until: null,
        last_login: new Date().toISOString(),
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        address: '789 Admin St, Admin City',
        phone: '+1234567890'
      },
      {
        id: 2,
        username: 'customer1',
        email: 'customer1@example.com',
        full_name: 'John Customer',
        role: 'customer',
        email_verified: true,
        is_deleted: false,
        locked_until: null,
        last_login: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        address: '456 Customer Ave, Customer City',
        phone: '+0987654321'
      },
      {
        id: 3,
        username: 'moderator',
        email: 'moderator@example.com',
        full_name: 'Moderator User',
        role: 'moderator',
        email_verified: true,
        is_deleted: false,
        locked_until: null,
        last_login: new Date(Date.now() - 2 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        address: '321 Moderator Rd, Moderator Town',
        phone: '+1122334455'
      }
    ];
    
    setUsers(mockUsers);
    setPagination({
      page: 1,
      limit: 20,
      total: mockUsers.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    });
    
    // Mock stats
    setUserStats({
      roleStats: [
        { role: 'admin', count: 1, verified_count: 1, locked_count: 0 },
        { role: 'moderator', count: 1, verified_count: 1, locked_count: 0 },
        { role: 'customer', count: 1, verified_count: 1, locked_count: 0 }
      ],
      totalStats: {
        total_users: 3,
        active_last_7_days: 3,
        today_registrations: 0
      },
      trends: []
    });
  };

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/admin/users/statistics/overview', {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setUserStats(data.data);
      } else {
        // Mock stats fallback
        setUserStats({
          roleStats: [
            { role: 'admin', count: 1, verified_count: 1, locked_count: 0 },
            { role: 'moderator', count: 1, verified_count: 1, locked_count: 0 },
            { role: 'customer', count: 1, verified_count: 1, locked_count: 0 }
          ],
          totalStats: {
            total_users: users.length,
            active_last_7_days: users.length,
            today_registrations: 0
          },
          trends: []
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
    fetchUserStats();
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
      role: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
      showDeleted: false
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
  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    
    if (type === 'create') {
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        address: '',
        phone: '',
        role: 'customer',
        sendWelcomeEmail: false
      });
    } else if (user && (type === 'edit' || type === 'view')) {
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        full_name: user.full_name || '',
        address: user.address || '',
        phone: user.phone || '',
        role: user.role || 'customer',
        sendWelcomeEmail: false
      });
    }
    
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      address: '',
      phone: '',
      role: 'customer',
      sendWelcomeEmail: false
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Create new user
  const handleCreateUser = async () => {
    try {
      if (!formData.username || !formData.email || !formData.password) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('User created successfully');
        fetchUsers();
        fetchUserStats();
        closeModal();
      } else {
        toast.error(data.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      // Simulate success for demo
      toast.success('User created successfully (demo)');
      
      const newUser = {
        id: users.length + 1,
        ...formData,
        email_verified: false,
        is_deleted: false,
        locked_until: null,
        last_login: null,
        created_at: new Date().toISOString()
      };
      
      setUsers(prev => [...prev, newUser]);
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1,
        totalPages: Math.ceil((prev.total + 1) / prev.limit)
      }));
      
      closeModal();
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // Remove password if empty
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User updated successfully');
        fetchUsers();
        closeModal();
      } else {
        toast.error(data.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      // Simulate success for demo
      toast.success('User updated successfully (demo)');
      
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...formData }
          : user
      ));
      
      closeModal();
    }
  };

  // Delete user
  const handleDeleteUser = async (permanent = false) => {
    if (!selectedUser) return;

    if (!window.confirm(`Are you sure you want to ${permanent ? 'permanently delete' : 'delete'} this user?`)) {
      return;
    }

    try {
      const url = `/api/admin/users/${selectedUser.id}`;
      
      const config = {
        method: 'DELETE',
        credentials: 'include'
      };

      if (permanent) {
        config.headers = { 'Content-Type': 'application/json' };
        config.body = JSON.stringify({ permanent: true });
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (data.success) {
        toast.success(`User ${permanent ? 'permanently deleted' : 'deleted'} successfully`);
        fetchUsers();
        fetchUserStats();
        closeModal();
      } else {
        toast.error(data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      // Simulate success for demo
      toast.success(`User ${permanent ? 'permanently deleted' : 'deleted'} successfully (demo)`);
      
      if (permanent) {
        setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      } else {
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id 
            ? { ...user, is_deleted: true }
            : user
        ));
      }
      
      closeModal();
    }
  };

  // Restore user
  const handleRestoreUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User restored successfully');
        fetchUsers();
        fetchUserStats();
      } else {
        toast.error(data.message || 'Failed to restore user');
      }
    } catch (error) {
      console.error('Error restoring user:', error);
      // Simulate success for demo
      toast.success('User restored successfully (demo)');
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_deleted: false }
          : user
      ));
    }
  };

  // Lock/Unlock user
  const handleToggleLock = async (userId, lock = true) => {
    try {
      const endpoint = lock ? 'lock' : 'unlock';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`User account ${lock ? 'locked' : 'unlocked'} successfully`);
        fetchUsers();
      } else {
        toast.error(data.message || `Failed to ${lock ? 'lock' : 'unlock'} user`);
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      // Simulate success for demo
      toast.success(`User account ${lock ? 'locked' : 'unlocked'} successfully (demo)`);
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              locked_until: lock 
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
                : null 
            }
          : user
      ));
    }
  };

  // Change user role
  const handleChangeRole = async (userId, newRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User role updated successfully');
        fetchUsers();
      } else {
        toast.error(data.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error changing role:', error);
      // Simulate success for demo
      toast.success('User role updated successfully (demo)');
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole }
          : user
      ));
    }
  };

  // Reset password
  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword, sendEmail: true })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password reset successfully');
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.success('Password reset successfully (demo)');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Render user role badge
  const renderRoleBadge = (role) => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      moderator: 'bg-purple-100 text-purple-800',
      staff: 'bg-blue-100 text-blue-800',
      customer: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  // Render user status
  const renderUserStatus = (user) => {
    if (user.is_deleted) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
          Deleted
        </span>
      );
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          Locked
        </span>
      );
    }

    if (user.email_verified) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          Active
        </span>
      );
    }

    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
        Unverified
      </span>
    );
  };

  // Export users to CSV
  const exportToCSV = () => {
    if (users.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['ID', 'Username', 'Email', 'Full Name', 'Role', 'Status', 'Last Login', 'Registered'];
    const csvData = users.map(user => [
      user.id,
      user.username,
      user.email,
      user.full_name || '',
      user.role,
      user.is_deleted ? 'Deleted' : (user.email_verified ? 'Active' : 'Unverified'),
      user.last_login ? formatDate(user.last_login) : 'Never',
      formatDate(user.created_at)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Users exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiUsers className="mr-3 text-red-600" />
            Users Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={users.length === 0}
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => openModal('create')}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            <FiPlus className="mr-2" />
            Add New User
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {userStats.totalStats?.total_users || users.length}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiUsers className="text-2xl text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-blue-600 text-sm">
            {userStats.totalStats?.today_registrations || 0} new today
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Users</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {userStats.totalStats?.active_last_7_days || users.filter(u => !u.is_deleted).length}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiUser className="text-2xl text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-green-600 text-sm">
            Last 7 days
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Admins</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {userStats.roleStats?.find(r => r.role === 'admin')?.count || users.filter(u => u.role === 'admin').length}
              </h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FiLock className="text-2xl text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-purple-600 text-sm">
            System administrators
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Locked Accounts</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {userStats.roleStats?.reduce((sum, role) => sum + (role.locked_count || 0), 0) || 
                 users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length}
              </h3>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FiX className="text-2xl text-red-600" />
            </div>
          </div>
          <div className="mt-4 text-red-600 text-sm">
            Require attention
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
              onClick={() => handleFilterChange('showDeleted', !filters.showDeleted)}
              className={`px-4 py-2 rounded-lg transition-colors ${filters.showDeleted ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              {filters.showDeleted ? 'Show Active Users' : 'Show Deleted Users'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Username, email, or name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
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
              <option value="created_at">Registration Date</option>
              <option value="last_login">Last Login</option>
              <option value="username">Username</option>
              <option value="email">Email</option>
              <option value="full_name">Full Name</option>
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
              <option value="DESC">Descending (Newest First)</option>
              <option value="ASC">Ascending (Oldest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {filters.showDeleted ? 'Deleted Users' : 'Active Users'}
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
              onClick={fetchUsers}
              className="flex items-center px-3 py-1 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-700">
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Last Login</th>
                    <th className="px-6 py-4 font-semibold">Registered</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <FiUsers className="text-4xl mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">No users found</p>
                        <p className="text-sm mt-2">Try adjusting your filters or add a new user</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.username}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              {user.full_name && (
                                <p className="text-sm text-gray-500">{user.full_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {renderRoleBadge(user.role)}
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.id, e.target.value)}
                              className="text-xs border rounded px-1 py-0.5"
                              disabled={user.is_deleted}
                            >
                              <option value="customer">Customer</option>
                              <option value="staff">Staff</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {renderUserStatus(user)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {user.last_login ? formatDate(user.last_login) : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openModal('view', user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <FiEye />
                            </button>
                            
                            {!user.is_deleted ? (
                              <>
                                <button
                                  onClick={() => openModal('edit', user)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Edit User"
                                >
                                  <FiEdit />
                                </button>
                                
                                <button
                                  onClick={() => handleResetPassword(user.id)}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Reset Password"
                                >
                                  <FiLock />
                                </button>
                                
                                {user.locked_until && new Date(user.locked_until) > new Date() ? (
                                  <button
                                    onClick={() => handleToggleLock(user.id, false)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Unlock Account"
                                  >
                                    <FiUnlock />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleLock(user.id, true)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Lock Account"
                                  >
                                    <FiLock />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => handleRestoreUser(user.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Restore User"
                              >
                                <FiRefreshCw />
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setModalType('delete');
                                setShowModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={user.is_deleted ? 'Permanently Delete' : 'Delete User'}
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
            {users.length > 0 && pagination.totalPages > 1 && (
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

      {/* Role Distribution Stats */}
      {userStats.roleStats?.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Role Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {userStats.roleStats.map((roleStat) => (
              <div key={roleStat.role} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{roleStat.role}</span>
                  <span className="text-lg font-bold">{roleStat.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${roleStat.role === 'admin' ? 'bg-red-500' : roleStat.role === 'moderator' ? 'bg-purple-500' : roleStat.role === 'staff' ? 'bg-blue-500' : 'bg-green-500'}`}
                    style={{ width: `${(roleStat.count / (userStats.totalStats?.total_users || 1)) * 100 || 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Verified: {roleStat.verified_count || 0}</span>
                  <span>Locked: {roleStat.locked_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for View/Edit/Create/Delete */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {modalType === 'view' && 'User Details'}
                  {modalType === 'edit' && 'Edit User'}
                  {modalType === 'create' && 'Create New User'}
                  {modalType === 'delete' && 'Delete User'}
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
                    Delete User
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to {selectedUser?.is_deleted ? 'permanently delete' : 'delete'} user{' '}
                    <span className="font-bold">{selectedUser?.username}</span>?
                    {!selectedUser?.is_deleted && ' This action can be undone.'}
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteUser(false)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    {selectedUser?.is_deleted && (
                      <button
                        onClick={() => handleDeleteUser(true)}
                        className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        Permanent Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (modalType === 'create') {
                    handleCreateUser();
                  } else if (modalType === 'edit') {
                    handleUpdateUser();
                  }
                }}>
                  <div className="space-y-4">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Password (only for create/edit) */}
                    {(modalType === 'create' || modalType === 'edit') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {modalType === 'edit' ? 'New Password (leave blank to keep current)' : 'Password *'}
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required={modalType === 'create'}
                          minLength="6"
                          placeholder={modalType === 'edit' ? 'Leave blank to keep current' : ''}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        {modalType === 'edit' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Only enter if you want to change the password
                          </p>
                        )}
                      </div>
                    )}

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                        disabled={modalType === 'view'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* For create only: Welcome email */}
                    {modalType === 'create' && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="sendWelcomeEmail"
                          checked={formData.sendWelcomeEmail}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                          Send welcome email
                        </label>
                      </div>
                    )}

                    {/* Additional info for view mode */}
                    {modalType === 'view' && selectedUser && (
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">User ID:</span>
                          <span className="font-mono">{selectedUser.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span>{renderUserStatus(selectedUser)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email Verified:</span>
                          <span>{selectedUser.email_verified ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Login:</span>
                          <span>{formatDate(selectedUser.last_login)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Registered:</span>
                          <span>{formatDate(selectedUser.created_at)}</span>
                        </div>
                        {selectedUser.locked_until && new Date(selectedUser.locked_until) > new Date() && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Locked Until:</span>
                            <span className="text-red-600">{formatDate(selectedUser.locked_until)}</span>
                          </div>
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
                        {modalType === 'create' ? 'Create User' : 'Save Changes'}
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

export default UsersManagement;