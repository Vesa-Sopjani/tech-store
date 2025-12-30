// services/validationService.js

/**
 * Data Quality Validation Service
 */
export const validateDataQuality = (formData) => {
  const errors = [];
  
  // Email validation
  if (formData.email && !isValidEmail(formData.email)) {
    errors.push('Email i pavlefshëm');
  }
  
  // Phone validation
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push('Numër telefoni i pavlefshëm');
  }
  
  // Password strength
  if (formData.password && formData.password.length < 8) {
    errors.push('Fjalëkalimi duhet të ketë të paktën 8 karaktere');
  }
  
  // Username validation
  if (formData.username && !isValidUsername(formData.username)) {
    errors.push('Username mund të përmbajë vetëm shkronja, numra dhe underscore');
  }
  
  // Full name validation
  if (formData.full_name && formData.full_name.trim().length < 2) {
    errors.push('Emri i plotë duhet të ketë të paktën 2 karaktere');
  }
  
  // Check for potentially malicious input
  if (containsMaliciousContent(formData)) {
    errors.push('Përmbajtje e dyshimtë e zbuluar');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Email validation
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone validation
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-]{8,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Username validation
 */
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
};

/**
 * Check for malicious content
 */
const containsMaliciousContent = (formData) => {
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\(/gi,
    /union\s+select/gi,
    /drop\s+table/gi,
    /--/g,
    /\/\*/g,
    /\*\//g
  ];
  
  // Check all string fields
  const stringFields = ['username', 'email', 'full_name', 'address'];
  
  for (const field of stringFields) {
    const value = formData[field] || '';
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(value.toLowerCase())) {
        console.warn(`Malicious pattern detected in ${field}: ${value}`);
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password) => {
  const checks = [
    { regex: /.{8,}/, message: 'Minimal 8 karaktere', points: 1 },
    { regex: /[a-z]/, message: 'Shkronjë të vogël (a-z)', points: 1 },
    { regex: /[A-Z]/, message: 'Shkronjë të madhe (A-Z)', points: 1 },
    { regex: /\d/, message: 'Numër (0-9)', points: 1 },
    { regex: /[!@#$%^&*(),.?":{}|<>]/, message: 'Simbol special', points: 1 },
    { regex: /.{12,}/, message: '12+ karaktere', points: 2 },
    { regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, message: 'Kombinim i fortë', points: 3 }
  ];

  const feedback = [];
  let score = 0;

  checks.forEach(check => {
    if (check.regex.test(password)) {
      feedback.push({ message: check.message, passed: true });
      score += check.points;
    } else {
      feedback.push({ message: check.message, passed: false });
    }
  });

  return { score, feedback };
};