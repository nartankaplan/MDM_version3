import { Menu, Bell, Settings, LogOut, User, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
  }

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <h1 className="header-title">Mobile Device Management</h1>
      </div>
      
      <div className="header-right">
        <button className="header-button">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>
        
        <button 
          className="header-button theme-toggle" 
          onClick={toggleTheme}
          title={theme === 'light' ? 'Dark Mode\'a geç' : 'Light Mode\'a geç'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        <button className="header-button">
          <Settings size={20} />
        </button>
        
        <div className="user-profile-container">
          <div 
            className="user-profile"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="profile-avatar">
              <User size={20} />
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.name || 'Kullanıcı'}</span>
              <span className="profile-role">{user?.role || 'USER'}</span>
            </div>
          </div>
          
          {showUserMenu && (
            <div className="user-menu">
              <div className="user-menu-header">
                <div className="user-menu-info">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                  <span className="user-role-badge">{user?.role}</span>
                </div>
              </div>
              <div className="user-menu-divider"></div>
              <button className="user-menu-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showUserMenu && (
        <div 
          className="user-menu-overlay"
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </header>
  )
}

export default Header
