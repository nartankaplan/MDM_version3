const bcrypt = require('bcryptjs');

/**
 * Password Hashing Utility Functions
 * MDM sistemi için güvenli password yönetimi
 */

class PasswordUtils {
  /**
   * Password'ı hash'le
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Password'ı doğrula
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} Password matches?
   */
  static async verifyPassword(password, hashedPassword) {
    try {
      if (!password || !hashedPassword) {
        return false;
      }

      if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
        return false;
      }

      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Password güçlülüğünü kontrol et
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  static validatePasswordStrength(password) {
    const result = {
      isValid: false,
      score: 0,
      issues: [],
      suggestions: []
    };

    if (!password || typeof password !== 'string') {
      result.issues.push('Password is required');
      return result;
    }

    // Minimum length check
    if (password.length < 8) {
      result.issues.push('Password must be at least 8 characters long');
      result.suggestions.push('Use at least 8 characters');
    } else {
      result.score += 1;
    }

    // Maximum length check
    if (password.length > 128) {
      result.issues.push('Password is too long (max 128 characters)');
      return result;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      result.issues.push('Password must contain at least one uppercase letter');
      result.suggestions.push('Add uppercase letters (A-Z)');
    } else {
      result.score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      result.issues.push('Password must contain at least one lowercase letter');
      result.suggestions.push('Add lowercase letters (a-z)');
    } else {
      result.score += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
      result.issues.push('Password must contain at least one number');
      result.suggestions.push('Add numbers (0-9)');
    } else {
      result.score += 1;
    }

    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      result.issues.push('Password must contain at least one special character');
      result.suggestions.push('Add special characters (!@#$%^&*)');
    } else {
      result.score += 1;
    }

    // Common password patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /admin/i,
      /qwerty/i,
      /abc123/i,
      /111111/,
      /000000/
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        result.issues.push('Password contains common patterns');
        result.suggestions.push('Avoid common patterns like "123456", "password", etc.');
        result.score = Math.max(0, result.score - 2);
        break;
      }
    }

    // Sequential characters check
    if (/(.)\1{2,}/.test(password)) {
      result.issues.push('Password contains repeated characters');
      result.suggestions.push('Avoid repeating the same character multiple times');
      result.score = Math.max(0, result.score - 1);
    }

    // Set validity based on score and issues
    result.isValid = result.score >= 4 && result.issues.length === 0;

    return result;
  }

  /**
   * Random password oluştur
   * @param {number} length - Password length (default: 12)
   * @param {Object} options - Generation options
   * @returns {string} Generated password
   */
  static generateRandomPassword(length = 12, options = {}) {
    const defaults = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSpecialChars: true,
      excludeSimilar: true // Exclude similar looking characters (0, O, l, 1, etc.)
    };

    const config = { ...defaults, ...options };

    let charset = '';
    
    if (config.includeLowercase) {
      charset += config.excludeSimilar ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }
    
    if (config.includeUppercase) {
      charset += config.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    if (config.includeNumbers) {
      charset += config.excludeSimilar ? '23456789' : '0123456789';
    }
    
    if (config.includeSpecialChars) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }

    if (charset === '') {
      throw new Error('At least one character type must be included');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Password'ın hash olup olmadığını kontrol et
   * @param {string} password - Password to check
   * @returns {boolean} Is hashed?
   */
  static isPasswordHashed(password) {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // bcrypt hash format: $2a$10$... or $2b$10$... (60 characters)
    return /^\$2[ab]\$\d{2}\$.{53}$/.test(password);
  }
}

module.exports = PasswordUtils;
