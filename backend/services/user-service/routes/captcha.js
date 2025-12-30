// backend/routes/captcha.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Store CAPTCHA në memory (në prodhim përdorni Redis ose DB)
const captchaStore = new Map();

// Gjenero CAPTCHA
router.post('/generate', (req, res) => {
  try {
    // Gjenero tekst të rastësishëm
    const text = generateRandomText(6);
    const captchaId = generateCaptchaId();
    
    // Krijo SVG
    const svg = generateSVG(text);
    
    // Hash dhe ruaj tekstin
    const hashedText = hashText(text);
    
    captchaStore.set(captchaId, {
      hashedText,
      createdAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minuta
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Cleanup old CAPTCHAs
    cleanupCaptchaStore();
    
    res.json({
      success: true,
      id: captchaId,
      image: svg,
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString()
    });
  } catch (error) {
    console.error('CAPTCHA generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Gabim gjatë gjenerimit të CAPTCHA'
    });
  }
});

// Verifiko CAPTCHA
router.post('/verify', (req, res) => {
  try {
    const { captchaId, captchaText } = req.body;
    
    if (!captchaId || !captchaText) {
      return res.status(400).json({
        valid: false,
        message: 'CAPTCHA ID dhe tekst janë të detyrueshëm'
      });
    }
    
    const captchaData = captchaStore.get(captchaId);
    
    if (!captchaData) {
      return res.json({
        valid: false,
        message: 'CAPTCHA nuk ekziston ose ka skaduar',
        requiresNew: true
      });
    }
    
    // Kontrollo expiration
    if (Date.now() > captchaData.expiresAt) {
      captchaStore.delete(captchaId);
      return res.json({
        valid: false,
        message: 'CAPTCHA ka skaduar',
        requiresNew: true
      });
    }
    
    // Verifiko tekstin
    const hashedInput = hashText(captchaText.trim());
    const isValid = hashedInput === captchaData.hashedText;
    
    // Fshi CAPTCHA pas verifikimit (edhe nëse është e gabuar për parandalim të reuse)
    captchaStore.delete(captchaId);
    
    if (isValid) {
      res.json({
        valid: true,
        message: 'CAPTCHA e vlefshme'
      });
    } else {
      res.json({
        valid: false,
        message: 'CAPTCHA e pavlefshme',
        requiresNew: true
      });
    }
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    res.status(500).json({
      valid: false,
      message: 'Gabim gjatë verifikimit'
    });
  }
});

// Helper functions
function generateRandomText(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function generateCaptchaId() {
  return `captcha_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function generateSVG(text) {
  // Implementoni SVG generation të ngjashëm me frontend
  return `<svg>...</svg>`;
}

function cleanupCaptchaStore() {
  const now = Date.now();
  for (const [id, data] of captchaStore.entries()) {
    if (now > data.expiresAt) {
      captchaStore.delete(id);
    }
  }
}

module.exports = router;