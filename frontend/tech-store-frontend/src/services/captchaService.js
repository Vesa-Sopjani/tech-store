// services/captchaService.js
import { API_URL, IS_DEV } from "../utils/constants";



/**
 * CAPTCHA Service për gjenerim dhe verifikim të CAPTCHA
 */

// Ruaj CAPTCHA në localStorage për cache
const CAPTCHA_CACHE_KEY = 'captcha_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuta

/**
 * Gjenero CAPTCHA të re nga server
 */
// services/captchaService.js
// services/captchaService.js - korrigjo generateCaptcha
export const generateCaptcha = async () => {
  try {
    console.log('🔄 Generating CAPTCHA from:', `${API_URL}/api/captcha/generate`);
    
    const response = await fetch(`${API_URL}/api/captcha/generate`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('📨 CAPTCHA response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ CAPTCHA failed with:', errorText);
      throw new Error(`CAPTCHA generation failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ CAPTCHA response:', result);
    
    // ✅ KORRIGJIMI KRITIK KËTU:
    // Kontrollo strukturën e përgjigjes
    if (result.data) {
      // Nëse ka { success: true, data: { id, image } }
      return {
        id: result.data.id,
        image: result.data.image
      };
    } else if (result.id) {
      // Nëse ka { id, image } direkt
      return {
        id: result.id,
        image: result.image
      };
    } else {
      // Strukturë e panjohur
      console.warn('Unknown CAPTCHA response structure:', result);
      throw new Error('Invalid CAPTCHA response structure');
    }
    
  } catch (error) {
    console.error('❌ CAPTCHA generation error:', error);
    
    // Në development, kthe fallback CAPTCHA
    if (IS_DEV) {
      console.log('🔧 Using fallback CAPTCHA in development');
      return await generateFallbackCaptcha();
    }
    
    throw error;
  }
};
/**
 * Verifiko CAPTCHA
 */
export const verifyCaptcha = async (captchaId, captchaText) => {
  try {
    console.log('🔍 Verifying CAPTCHA:', { captchaId, captchaTextLength: captchaText?.length });
    
    if (!captchaId || !captchaText) {
      return {
        valid: false,
        message: 'CAPTCHA ID dhe tekst janë të detyrueshëm',
        requiresNewCaptcha: false
      };
    }

    // Kontrollo nëse është fallback CAPTCHA
    if (captchaId.startsWith('fallback_')) {
      return verifyFallbackCaptcha(captchaId, captchaText);
    }

    // Nëse jemi në development dhe serveri nuk është i disponueshëm
    if (IS_DEV && !(await isServerAvailable())) {
      console.log("🔧 Server not available, using fallback verification");
      return verifyFallbackCaptcha(captchaId, captchaText);
    }

    const response = await fetch(`${API_URL}/api/captcha/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ✅ Shto credentials
      body: JSON.stringify({
        id: captchaId,        // ✅ Ndrysho nga 'captchaId' në 'id'
        text: captchaText.trim(), // ✅ Ndrysho nga 'captchaText' në 'text'
      }),
    });

    const result = await response.json();
    console.log('📨 Verification response:', result);

    if (!response.ok) {
      return {
        valid: false,
        message: result.message || 'Verifikimi i CAPTCHA dështoi',
        requiresNewCaptcha: true
      };
    }

    // ✅ Kontrollo strukturën e përgjigjes
    return {
      valid: result.success || result.valid || false,
      message: result.message || 'CAPTCHA e vlefshme',
      requiresNewCaptcha: false
    };
    
  } catch (error) {
    console.error('❌ CAPTCHA verification error:', error);
    
    // Në development, provo fallback
    if (IS_DEV && captchaId.startsWith('fallback_')) {
      return verifyFallbackCaptcha(captchaId, captchaText);
    }
    
    return {
      valid: false,
      message: 'Gabim gjatë verifikimit të CAPTCHA',
      requiresNewCaptcha: true
    };
  }
};

/**
 * Fallback CAPTCHA për lokal/dev
 */
export const generateFallbackCaptcha = async () => {
  console.log('Generating fallback CAPTCHA...');
  
  // Simple math CAPTCHA fallback
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operation = ['+', '-', '*'][Math.floor(Math.random() * 3)];
  
  let answer;
  switch (operation) {
    case '+': answer = num1 + num2; break;
    case '-': answer = num1 - num2; break;
    case '*': answer = num1 * num2; break;
    default: answer = num1 + num2;
  }
  
  // Krijo një SVG të thjeshtë për fallback
  const svg = `
    <svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <g>
        <text x="30" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="#333">${num1}</text>
        <text x="60" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="#333">${operation}</text>
        <text x="90" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="#333">${num2}</text>
        <text x="120" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="#333">=</text>
        <text x="150" y="45" font-family="Arial" font-size="28" font-weight="bold" fill="#666">?</text>
      </g>
    </svg>
  `;
  
  // Ruaj përgjigjen në cache
  const captchaId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  cacheFallbackCaptcha(captchaId, answer.toString());
  
  return {
    id: captchaId,
    image: svg,
    answer: answer.toString(),
    expiresAt: new Date(Date.now() + 10 * 60000).toISOString()
  };
};

/**
 * Verifiko fallback CAPTCHA
 */
export const verifyFallbackCaptcha = (captchaId, userInput) => {
  const cacheKey = `fallback_${captchaId}`;
  
  // Kontrollo nëse është ID i saktë
  if (!captchaId.startsWith('fallback_')) {
    return {
      valid: false,
      message: 'CAPTCHA ID e pavlefshme',
      requiresNewCaptcha: true
    };
  }
  
  const cachedAnswer = localStorage.getItem(cacheKey);
  
  if (!cachedAnswer) {
    return {
      valid: false,
      message: 'CAPTCHA ka skaduar ose nuk ekziston',
      requiresNewCaptcha: true
    };
  }
  
  const isValid = userInput.trim() === cachedAnswer;
  
  // Fshi nga cache pas verifikimit (edhe nëse është e gabuar)
  localStorage.removeItem(cacheKey);
  
  return {
    valid: isValid,
    message: isValid ? 'CAPTCHA e saktë' : 'Përgjigje e gabuar',
    requiresNewCaptcha: !isValid
  };
};

/**
 * Krijo Data URL nga SVG CAPTCHA
 */
export const createCaptchaDataUrl = (svgString) => {
  if (!svgString) {
    console.warn('SVG string është bosh');
    return '';
  }
  
  try {
    // Kontrollo nëse është tashmë Data URL
    if (svgString.startsWith('data:image/svg+xml')) {
      return svgString;
    }
    
    // Encode SVG si Data URL
    const encodedSVG = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    
    return `data:image/svg+xml;charset=utf-8,${encodedSVG}`;
  } catch (error) {
    console.error('Error creating Data URL:', error);
    return '';
  }
};

/**
 * Check if server is available
 */
const isServerAvailable = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // Timeout after 3 seconds
    }).catch(() => null);
    
    return response && response.ok;
  } catch {
    return false;
  }
};

/**
 * Caching funksione
 */
const cacheCaptcha = (id, image) => {
  try {
    const cache = {
      id,
      image,
      timestamp: Date.now()
    };
    
    const existingCache = JSON.parse(localStorage.getItem(CAPTCHA_CACHE_KEY) || '[]');
    existingCache.push(cache);
    
    // Mbaj vetëm 5 të fundit
    if (existingCache.length > 5) {
      existingCache.shift();
    }
    
    localStorage.setItem(CAPTCHA_CACHE_KEY, JSON.stringify(existingCache));
  } catch (error) {
    console.warn('Failed to cache CAPTCHA:', error);
  }
};

const cacheFallbackCaptcha = (id, answer) => {
  try {
    const cacheKey = `fallback_${id}`;
    localStorage.setItem(cacheKey, answer);
    
    // Fshi automatikisht pas 10 minutash
    setTimeout(() => {
      localStorage.removeItem(cacheKey);
    }, 10 * 60 * 1000);
  } catch (error) {
    console.warn('Failed to cache fallback CAPTCHA:', error);
  }
};

/**
 * Merre CAPTCHA nga cache
 */
export const getCachedCaptcha = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(CAPTCHA_CACHE_KEY) || '[]');
    
    // Fshi cache të vjetër
    const freshCache = cache.filter(item => 
      Date.now() - item.timestamp < CACHE_DURATION
    );
    
    if (freshCache.length > 0) {
      localStorage.setItem(CAPTCHA_CACHE_KEY, JSON.stringify(freshCache));
      return freshCache[freshCache.length - 1];
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Helper functions
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Cleanup expired CAPTCHA cache
 */
export const cleanupCaptchaCache = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(CAPTCHA_CACHE_KEY) || '[]');
    const freshCache = cache.filter(item => 
      Date.now() - item.timestamp < CACHE_DURATION
    );
    
    localStorage.setItem(CAPTCHA_CACHE_KEY, JSON.stringify(freshCache));
    
    // Cleanup fallback cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('fallback_')) {
        const storedTime = parseInt(key.split('_')[1]);
        if (storedTime && Date.now() - storedTime > 10 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('CAPTCHA cache cleanup failed:', error);
  }
};

// Export all functions
export default {
  generateCaptcha,
  verifyCaptcha,
  createCaptchaDataUrl,
  generateFallbackCaptcha,
  verifyFallbackCaptcha,
  getCachedCaptcha,
  cleanupCaptchaCache
};