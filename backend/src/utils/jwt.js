const jwt = require('jsonwebtoken');

/**
 * JWT Token Utility Functions
 * MDM sistemi için JWT token oluşturma ve doğrulama
 */

class JWTUtils {
  /**
   * Access token oluştur
   * @param {Object} payload - Token payload (user data)
   * @returns {string} JWT token
   */
  static generateAccessToken(payload) {
    try {
      const secret = process.env.JWT_SECRET;
      const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
      
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      return jwt.sign(
        {
          ...payload,
          type: 'access_token',
          iat: Math.floor(Date.now() / 1000)
        },
        secret,
        { 
          expiresIn,
          issuer: 'mdm-system',
          audience: 'mdm-client'
        }
      );
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Refresh token oluştur (daha uzun süre geçerli)
   * @param {Object} payload - Token payload
   * @returns {string} Refresh token
   */
  static generateRefreshToken(payload) {
    try {
      const secret = process.env.JWT_SECRET;
      
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      return jwt.sign(
        {
          userId: payload.userId,
          email: payload.email,
          type: 'refresh_token',
          iat: Math.floor(Date.now() / 1000)
        },
        secret,
        { 
          expiresIn: '7d', // 7 gün
          issuer: 'mdm-system',
          audience: 'mdm-client'
        }
      );
    } catch (error) {
      throw new Error(`Refresh token generation failed: ${error.message}`);
    }
  }

  /**
   * Token doğrula ve decode et
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      const decoded = jwt.verify(token, secret, {
        issuer: 'mdm-system',
        audience: 'mdm-client'
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkar (doğrulama yapmadan)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload veya null
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Token'ın süresini kontrol et
   * @param {string} token - JWT token
   * @returns {boolean} Token geçerli mi?
   */
  static isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      return decoded.exp < Math.floor(Date.now() / 1000);
    } catch (error) {
      return true;
    }
  }

  /**
   * Authorization header'dan token çıkar
   * @param {string} authHeader - "Bearer <token>" format
   * @returns {string|null} Token veya null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Token payload'ından kullanıcı bilgilerini formatla
   * @param {Object} user - User object from database
   * @returns {Object} Token payload
   */
  static createTokenPayload(user) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      isActive: user.isActive
    };
  }
}

module.exports = JWTUtils;
