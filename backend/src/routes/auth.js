const express = require('express');
const { PrismaClient } = require('@prisma/client');
const JWTUtils = require('../utils/jwt');
const PasswordUtils = require('../utils/bcrypt');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Kullanıcı girişi
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Kullanıcıyı database'den bul
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Kullanıcı aktif mi?
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled. Please contact administrator.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Password kontrolü
    const isPasswordValid = await PasswordUtils.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Token payload oluştur
    const tokenPayload = JWTUtils.createTokenPayload(user);

    // Tokens oluştur
    const accessToken = JWTUtils.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtils.generateRefreshToken(tokenPayload);

    // Last login zamanını güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Login event log - sadece mevcut device varsa
    try {
      // İlk mevcut device'ı bul
      const firstDevice = await prisma.device.findFirst({
        select: { id: true }
      });
      
      if (firstDevice) {
        await prisma.deviceEvent.create({
          data: {
            eventType: 'LOGIN_ATTEMPT',
            title: 'Successful Login',
            description: `User ${user.name} logged in successfully`,
            severity: 'INFO',
            deviceId: firstDevice.id,
            metadata: JSON.stringify({
              userId: user.id,
              email: user.email,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent']
            })
          }
        });
      }
    } catch (err) {
      console.warn('Event logging failed:', err);
    }

    // Response
    const response = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          lastLogin: user.lastLogin,
          memberSince: user.createdAt
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    };

    // Remember me için cookie set edilebilir (opsiyonel)
    if (rememberMe) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
      });
    }

    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Kullanıcı çıkışı
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Logout event log
    try {
      await prisma.deviceEvent.create({
        data: {
          eventType: 'LOGIN_ATTEMPT',
          title: 'User Logout',
          description: `User ${req.user.name} logged out`,
          severity: 'INFO',
          deviceId: 1, // TODO: System events
          metadata: JSON.stringify({
            userId: req.user.id,
            email: req.user.email
          })
        }
      });
    } catch (err) {
      console.warn('Event logging failed:', err);
    }

    // Refresh token cookie'sini temizle
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Access token yenileme
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Refresh token'ı doğrula
    let decodedToken;
    try {
      decodedToken = JWTUtils.verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Token tipini kontrol et
    if (decodedToken.type !== 'refresh_token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Kullanıcıyı database'den al
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

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    // Yeni access token oluştur
    const tokenPayload = JWTUtils.createTokenPayload(user);
    const newAccessToken = JWTUtils.generateAccessToken(tokenPayload);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Mevcut kullanıcı bilgilerini al
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Kullanıcı bilgilerini database'den fresh al
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            devices: true,
            commands: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          memberSince: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            deviceCount: user._count.devices,
            commandCount: user._count.commands
          }
        },
        permissions: {
          canManageDevices: ['ADMIN', 'MANAGER'].includes(user.role),
          canManageUsers: user.role === 'ADMIN',
          canViewReports: ['ADMIN', 'MANAGER'].includes(user.role),
          canManagePolicies: ['ADMIN', 'MANAGER'].includes(user.role)
        }
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Password değiştir
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Mevcut kullanıcıyı al
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true, email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Mevcut password'ı doğrula
    const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Yeni password'ı validate et
    const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'New password does not meet requirements',
        code: 'WEAK_PASSWORD',
        details: {
          issues: passwordValidation.issues,
          suggestions: passwordValidation.suggestions
        }
      });
    }

    // Yeni password'ı hash'le
    const hashedNewPassword = await PasswordUtils.hashPassword(newPassword);

    // Database'i güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    // Event log
    try {
      await prisma.deviceEvent.create({
        data: {
          eventType: 'LOGIN_ATTEMPT',
          title: 'Password Changed',
          description: `User ${user.name} changed their password`,
          severity: 'INFO',
          deviceId: 1,
          metadata: JSON.stringify({
            userId: user.id,
            email: user.email
          })
        }
      });
    } catch (err) {
      console.warn('Event logging failed:', err);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

/**
 * GET /api/auth/validate
 * Token geçerliliğini kontrol et (optional auth)
 */
router.get('/validate', optionalAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      isValid: !!req.user,
      user: req.user || null
    }
  });
});

module.exports = router;
