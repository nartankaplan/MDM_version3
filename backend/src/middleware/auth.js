const { PrismaClient } = require('@prisma/client');
const JWTUtils = require('../utils/jwt');

const prisma = new PrismaClient();

/**
 * Authentication Middleware
 * JWT token doğrulama ve kullanıcı yetkilendirmesi
 */

/**
 * JWT token'ı doğrula ve kullanıcı bilgilerini req.user'a ekle
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Authorization header'ı kontrol et
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required',
        code: 'TOKEN_MISSING'
      });
    }

    // Token'ı doğrula
    let decodedToken;
    try {
      decodedToken = JWTUtils.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        code: 'TOKEN_INVALID'
      });
    }

    // Token tipini kontrol et
    if (decodedToken.type !== 'access_token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'TOKEN_TYPE_INVALID'
      });
    }

    // Kullanıcıyı database'den al
    const user = await prisma.user.findUnique({
      where: { 
        id: decodedToken.userId 
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Kullanıcı aktif mi kontrol et
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is disabled',
        code: 'USER_DISABLED'
      });
    }

    // Token'daki kullanıcı bilgileri güncel mi kontrol et
    if (user.email !== decodedToken.email || user.role !== decodedToken.role) {
      return res.status(401).json({
        success: false,
        error: 'Token is outdated, please login again',
        code: 'TOKEN_OUTDATED'
      });
    }

    // Kullanıcı bilgilerini request'e ekle
    req.user = user;
    req.token = decodedToken;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role bazlı yetkilendirme middleware'i
 * @param {Array<string>} allowedRoles - İzinli roller ['ADMIN', 'MANAGER']
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Admin yetkisi kontrolü
 */
const requireAdmin = requireRole(['ADMIN']);

/**
 * Manager veya Admin yetkisi kontrolü
 */
const requireManagerOrAdmin = requireRole(['ADMIN', 'MANAGER']);

/**
 * Kullanıcının kendi verilerine erişim kontrolü
 * @param {string} userIdParam - Request parameter'daki user ID field adı
 */
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const targetUserId = parseInt(req.params[userIdParam]);
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;

      // Admin her zaman erişebilir
      if (currentUserRole === 'ADMIN') {
        return next();
      }

      // Manager kendi departmanındaki kullanıcılara erişebilir (gelecekte implement edilecek)
      if (currentUserRole === 'MANAGER') {
        // TODO: Departman kontrolü eklenecek
        return next();
      }

      // Normal kullanıcı sadece kendi verilerine erişebilir
      if (currentUserId !== targetUserId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You can only access your own data',
          code: 'ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

/**
 * Device ownership kontrolü - kullanıcı sadece kendi cihazlarına erişebilir
 */
const requireDeviceOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const deviceId = parseInt(req.params.id || req.params.deviceId);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    // Admin ve Manager her cihaza erişebilir
    if (['ADMIN', 'MANAGER'].includes(currentUserRole)) {
      return next();
    }

    // Cihazın sahibini kontrol et
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { userId: true }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found',
        code: 'DEVICE_NOT_FOUND'
      });
    }

    if (device.userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only access your own devices',
        code: 'DEVICE_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    console.error('Device ownership authorization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

/**
 * Optional authentication - token varsa doğrula, yoksa devam et
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      // Token yok, devam et
      return next();
    }

    // Token varsa doğrula
    try {
      const decodedToken = JWTUtils.verifyToken(token);
      
      if (decodedToken.type === 'access_token') {
        const user = await prisma.user.findUnique({
          where: { id: decodedToken.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            department: true,
            isActive: true
          }
        });

        if (user && user.isActive) {
          req.user = user;
          req.token = decodedToken;
        }
      }
    } catch (error) {
      // Token geçersiz, ama optional olduğu için devam et
      console.warn('Optional auth token invalid:', error.message);
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Hata olsa bile devam et
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireManagerOrAdmin,
  requireOwnershipOrAdmin,
  requireDeviceOwnership,
  optionalAuth
};
