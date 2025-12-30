// backend/services/user-service/middlewares/captchaMiddleware.js
const captchaService = require('../services/user-service/captcha-service');

const captchaValidator = (idField = 'captchaId', codeField = 'captchaText') => {
  return async (req, res, next) => {
    try {
      const captchaId = req.body[idField];
      const captchaCode = req.body[codeField];
      
      console.log('CAPTCHA Validation:', {
        id: captchaId,
        code: captchaCode,
        body: req.body
      });
      
      if (!captchaId || !captchaCode) {
        return res.status(400).json({
          success: false,
          message: 'CAPTCHA is required',
          code: 'CAPTCHA_REQUIRED'
        });
      }
      
      const result = await captchaService.verifyCaptcha(captchaId, captchaCode);
      
      console.log('CAPTCHA Result:', result);
      
      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Invalid CAPTCHA',
          code: 'INVALID_CAPTCHA',
          requiresNewCaptcha: result.message?.includes('ka skaduar') || result.message?.includes('expired')
        });
      }
      
      // CAPTCHA verified, proceed
      next();
    } catch (error) {
      console.error('CAPTCHA Middleware Error:', error);
      return res.status(500).json({
        success: false,
        message: 'CAPTCHA verification failed',
        code: 'CAPTCHA_SERVER_ERROR'
      });
    }
  };
};

module.exports = { captchaValidator };