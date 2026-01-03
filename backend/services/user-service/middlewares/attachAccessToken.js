const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware për të vendosur Access Token në cookie
 * Përdoret pas login, register, refresh
 */
const attachAccessToken = (req, res, next) => {
  console.log('🔄 [Middleware] attachAccessToken - Generating access token...');
  
  // Funksioni për të gjeneruar access token
  const generateAccessToken = (userData) => {
    return jwt.sign(
      {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        jti: uuidv4() // Unique token ID
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' } // 15 minuta
    );
  };
  
  // 1. Nëse ka user data në request (pas login/register)
  if (req.userData) {
    console.log(`📝 Generating access token for user: ${req.userData.email}`);
    
    const accessToken = generateAccessToken(req.userData);
    
    // Vendos access token si httpOnly cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,        // JS nuk mund ta lexojë
      secure: process.env.NODE_ENV === 'production', // HTTPS në production
      sameSite: 'lax',       // Më fleksibël se 'strict'
      maxAge: 15 * 60 * 1000, // 15 minuta
      path: '/'              // Available në të gjitha routes
    });
    
    console.log('✅ Access token set in httpOnly cookie');
    
    // Shto në response për frontend (OPTIONAL - për debugging)
    req.accessToken = accessToken;
  }
  
  // 2. Nëse vjen nga refresh endpoint
  if (req.refreshTokenData) {
    console.log('🔄 Generating access token from refresh data');
    
    const accessToken = generateAccessToken({
      id: req.refreshTokenData.id,
      username: req.refreshTokenData.username,
      email: req.refreshTokenData.email,
      role: req.refreshTokenData.role
    });
    
    // Vendos cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });
    
    req.accessToken = accessToken;
  }
  
  next();
};

module.exports = attachAccessToken;