import { 
  Smartphone, 
  HelpCircle,
  QrCode,
  Palette,
  X 
} from 'lucide-react'

function Sidebar({ isOpen, onClose, currentPage, onPageChange, deviceCount = 0, enrollmentCount = 0, activeDeviceCount = 0 }) {
  const menuItems = [
    { icon: Smartphone, label: 'Cihazlar', page: '/devices', count: deviceCount },
    { icon: QrCode, label: 'Cihaz Kayıt', page: '/enrollment', count: enrollmentCount },
    { icon: Palette, label: 'Tema', page: '/theme' },
    { icon: HelpCircle, label: 'Yardım', page: '/help' }
  ]

  const handleItemClick = (page) => {
    onPageChange(page);
    // Mobile'da sidebar'ı kapat
    if (window.innerWidth <= 768) {
      onClose();
    }
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>MDM Panel</h2>
          <button className="sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon
            const isActive = currentPage === item.page
            return (
              <button 
                key={index}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item.page)}
              >
                <IconComponent size={20} />
                <span className="sidebar-label">{item.label}</span>
                {item.count && (
                  <span className="sidebar-count">{item.count}</span>
                )}
              </button>
            )
          })}
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-stats">
            <div className="stat-item">
              <div className="stat-value">{deviceCount}</div>
              <div className="stat-label">Toplam Cihaz</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{activeDeviceCount}</div>
              <div className="stat-label">Aktif</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
