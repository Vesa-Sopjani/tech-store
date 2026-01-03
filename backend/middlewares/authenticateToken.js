const jwt = require('jsonwebtoken');

/**
 * Middleware për të verifikuar Access Token nga cookies OSE header
 */
const authenticateToken = (req, res, next) => {
  console.log('🔐 [Middleware] authenticateToken - Checking authentication...');
  
  // 1. Merr token nga cookies (PRIMARY) ose header (FALLBACK)
  let token = req.cookies?.accessToken;
  
  if (!token && req.headers.authorization) {
    // Fallback: Nga header
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('📦 Token taken from Authorization header');
    }
  }
  
  // 2. Nëse nuk ka token fare
  if (!token) {
    console.log('❌ No access token found');
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login.',
      code: 'TOKEN_MISSING'
    });
  }
  
  try {
    // 3. Verifiko token-in
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );
    
    console.log(`✅ Token valid for user: ${decoded.username || decoded.email} (ID: ${decoded.id})`);
    
    // 4. Shto të dhënat e userit në request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'customer'
    };
    
    next(); // Vazhdo te route
    
  } catch (error) {
    console.log('❌ Token verification failed:', error.name);
    
    // 5. Handle errors specifike
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh.',
        code: 'TOKEN_EXPIRED',
        expired: true
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid or corrupted access token',
        code: 'TOKEN_INVALID'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication system error',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

module.exports = authenticateToken;