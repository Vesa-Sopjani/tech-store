const adminAuth = (req, res, next) => {
  console.log('👑 [Middleware] adminAuth - Checking admin privileges...');
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (req.user.role !== 'admin') {
    console.log(`❌ User ${req.user.id} is not admin (role: ${req.user.role})`);
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  console.log(`✅ Admin access granted for user: ${req.user.username} (ID: ${req.user.id})`);
  next();
};

module.exports = adminAuth;
