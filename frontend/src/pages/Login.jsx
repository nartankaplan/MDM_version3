import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Shield, Smartphone, Lock, Users, BarChart3, Globe } from 'lucide-react';

function Login() {
  const { login, loading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Eğer zaten giriş yapılmışsa dashboard'a yönlendir
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Error'ı temizle
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Form validation
    if (!formData.email || !formData.password) {
      setError('Lütfen email ve şifre alanlarını doldurun');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password, formData.rememberMe);
      
      if (result.success) {
        // Login başarılı, sayfa otomatik yönlendirilecek
        console.log('Login successful:', result.user);
      } else {
        // Hata mesajını göster
        const errorMessages = {
          'MISSING_CREDENTIALS': 'Email ve şifre gereklidir',
          'INVALID_EMAIL': 'Geçersiz email formatı',
          'INVALID_CREDENTIALS': 'Geçersiz email veya şifre',
          'ACCOUNT_DISABLED': 'Hesabınız devre dışı bırakılmış. Yöneticiye başvurun.',
          'NETWORK_ERROR': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
          'LOGIN_ERROR': 'Giriş sırasında bir hata oluştu. Tekrar deneyin.'
        };

        setError(errorMessages[result.code] || result.error || 'Bilinmeyen bir hata oluştu');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Beklenmeyen bir hata oluştu. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = (role) => {
    const credentials = {
      admin: { email: 'admin@mdm.com', password: 'admin123' },
      user: { email: 'ahmet.yilmaz@company.com', password: 'user123' }
    };

    setFormData(prev => ({
      ...prev,
      email: credentials[role].email,
      password: credentials[role].password
    }));
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-decoration">
          <div className="floating-icon">
            <Shield size={40} />
          </div>
          <div className="floating-icon">
            <Smartphone size={35} />
          </div>
          <div className="floating-icon">
            <Lock size={30} />
          </div>
        </div>
      </div>

      {/* Merkezi Login formu */}
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Shield size={40} className="logo-icon" />
              <h2>MDM System</h2>
            </div>
            <p className="login-subtitle">Mobile Device Management Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-alert">
                <div className="error-content">
                  <span className="error-icon">⚠️</span>
                  <span className="error-message">{error}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="kullanici@sirket.com"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Şifre</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input password-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="checkbox-input"
                  disabled={isLoading}
                />
                <span className="checkbox-text">Beni hatırla</span>
              </label>
            </div>

            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="button-spinner"></div>
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <Lock size={20} />
                  <span>Giriş Yap</span>
                </>
              )}
            </button>
          </form>

          <div className="demo-credentials">
            <p className="demo-title">Demo Hesap:</p>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-button admin"
                onClick={() => fillDemoCredentials('admin')}
                disabled={isLoading}
              >
                👑 Admin Hesabı
              </button>
            </div>
          </div>

          <div className="login-footer">
            <p>© 2025 MDM System. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
