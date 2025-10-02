import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getApiBaseUrl } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Token'ı localStorage'dan al
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('jwtToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          // Token geçerliliğini kontrol et
          const isValid = await validateToken(storedToken);
          
          if (isValid) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // Token geçersiz, temizle
            clearAuth();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Token geçerliliğini kontrol et
  const validateToken = async (tokenToValidate) => {
    try {
      // API servisini kullanarak dinamik URL ile
      const response = await fetch(`${await getApiBaseUrl()}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        return result.data.isValid;
      }

      return false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Login fonksiyonu
  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch(`${await getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { user: userData, tokens } = result.data;
        
        // State'i güncelle
        setUser(userData);
        setToken(tokens.accessToken);
        setIsAuthenticated(true);

        // localStorage'a kaydet (api.js ile tutarlı olması için jwtToken key'i)
        localStorage.setItem('jwtToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));

        return { success: true, user: userData };
      } else {
        return { 
          success: false, 
          error: result.error || 'Login failed',
          code: result.code
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      };
    }
  };

  // Logout fonksiyonu
  const logout = async () => {
    try {
      // Backend'e logout isteği gönder
      if (token) {
        await fetch(`${await getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Local state'i temizle
      clearAuth();
    }
  };

  // Auth state'ini temizle
  const clearAuth = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  // Token refresh fonksiyonu
  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${await getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const newAccessToken = result.data.accessToken;
        setToken(newAccessToken);
        localStorage.setItem('jwtToken', newAccessToken);
        return newAccessToken;
      } else {
        throw new Error(result.error || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuth();
      return null;
    }
  };

  // API call helper (otomatik token refresh ile)
  const authenticatedFetch = async (url, options = {}) => {
    let accessToken = token;

    // İlk API çağrısını yap
    const makeRequest = async (authToken) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
    };

    try {
      let response = await makeRequest(accessToken);

      // Token expired ise refresh dene
      if (response.status === 401) {
        const newToken = await refreshToken();
        
        if (newToken) {
          // Yeni token ile tekrar dene
          response = await makeRequest(newToken);
          accessToken = newToken;
        } else {
          // Refresh başarısız, logout
          logout();
          return response;
        }
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch error:', error);
      throw error;
    }
  };

  // User bilgilerini güncelle
  const updateUser = async () => {
    try {
      const response = await authenticatedFetch(`${await getApiBaseUrl()}/auth/me`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const updatedUser = result.data.user;
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        }
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  // Password değiştirme
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authenticatedFetch(`${await getApiBaseUrl()}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return { success: true, message: result.message };
      } else {
        return { 
          success: false, 
          error: result.error || 'Password change failed',
          details: result.details
        };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    }
  };

  // Permission checker functions
  const hasPermission = (permission) => {
    if (!user) return false;

    const permissions = {
      canManageDevices: ['ADMIN', 'MANAGER'].includes(user.role),
      canManageUsers: user.role === 'ADMIN',
      canViewReports: ['ADMIN', 'MANAGER'].includes(user.role),
      canManagePolicies: ['ADMIN', 'MANAGER'].includes(user.role),
      canViewAllDevices: ['ADMIN', 'MANAGER'].includes(user.role),
      canDeleteDevices: user.role === 'ADMIN',
      canCreateUsers: user.role === 'ADMIN',
      canEditUsers: user.role === 'ADMIN',
    };

    return permissions[permission] || false;
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isManager = () => user?.role === 'MANAGER';
  const isUser = () => user?.role === 'USER';

  const value = {
    // State
    user,
    token,
    loading,
    isAuthenticated,

    // Actions
    login,
    logout,
    refreshToken,
    updateUser,
    changePassword,
    authenticatedFetch,

    // Helpers
    hasPermission,
    isAdmin,
    isManager,
    isUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
