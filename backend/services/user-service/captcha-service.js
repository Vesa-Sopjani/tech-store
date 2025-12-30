// backend/services/user-service/captcha-service.js
const svgCaptcha = require('svg-captcha');

const captchaStore = new Map();

const generateCaptcha = () => {
  try {
    const captcha = svgCaptcha.create({
      size: 6,
      noise: 2,
      color: true,
      width: 200,
      height: 60,
      fontSize: 48,
      ignoreChars: '0o1ilLI'
    });
    
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    console.log('Generated CAPTCHA:', { id, text: captcha.text });
    
    // Store both text and case-insensitive version for verification
    captchaStore.set(id, {
      text: captcha.text,
      textLowerCase: captcha.text.toLowerCase(),
      createdAt: Date.now()
    });

    // Fshij pas 5 min
    setTimeout(() => {
      captchaStore.delete(id);
      console.log('Deleted expired CAPTCHA:', id);
    }, 5 * 60 * 1000);

    return { 
      id, 
      image: captcha.data,
      text: captcha.text // vetëm për debugging
    };
  } catch (error) {
    console.error('Error generating CAPTCHA:', error);
    throw error;
  }
};

const verifyCaptcha = (id, text) => {
  try {
    console.log('Verifying CAPTCHA:', { id, text, storeSize: captchaStore.size });
    
    const stored = captchaStore.get(id);
    
    if (!stored) {
      return { 
        valid: false, 
        message: "CAPTCHA ka skaduar ose nuk ekziston",
        code: 'EXPIRED_OR_INVALID'
      };
    }
    
    // Check expiration (5 minutes)
    const now = Date.now();
    if (now - stored.createdAt > 5 * 60 * 1000) {
      captchaStore.delete(id);
      return { 
        valid: false, 
        message: "CAPTCHA ka skaduar",
        code: 'EXPIRED'
      };
    }
    
    // Case-insensitive comparison
    const isValid = stored.textLowerCase === text.toLowerCase().trim();
    
    console.log('Verification result:', { 
      isValid, 
      stored: stored.text, 
      provided: text,
      storedLower: stored.textLowerCase,
      providedLower: text.toLowerCase().trim()
    });
    
    // Remove used CAPTCHA
    if (isValid) {
      captchaStore.delete(id);
    }
    
    return { 
      valid: isValid, 
      message: isValid ? "CAPTCHA e vlefshme" : "Kodi i CAPTCHA-së është i gabuar",
      code: isValid ? 'VALID' : 'INVALID'
    };
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    return { 
      valid: false, 
      message: "Gabim gjatë verifikimit",
      code: 'VERIFICATION_ERROR'
    };
  }
};

module.exports = { generateCaptcha, verifyCaptcha };