import { 
  Smartphone, 
  Battery, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  MapPin,
  Clock,
  Search,
  RefreshCw
} from 'lucide-react'
import { useState } from 'react'

function DeviceList({ devices, selectedDevice, onSelectDevice, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStat, setSelectedStat] = useState(null) // 'online' | 'offline' | 'pending' | null
  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <Wifi size={16} className="status-icon online" />
      case 'offline':
        return <WifiOff size={16} className="status-icon offline" />
      case 'warning':
        return <AlertTriangle size={16} className="status-icon warning" />
      default:
        return <WifiOff size={16} className="status-icon offline" />
    }
  }

  const getBatteryColor = (battery) => {
    if (battery > 60) return 'battery-high'
    if (battery > 30) return 'battery-medium'
    return 'battery-low'
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Çevrimiçi'
      case 'offline':
        return 'Çevrimdışı'
      case 'warning':
        return 'Uyarı'
      default:
        return 'Bilinmiyor'
    }
  }

  // Metin aramasına göre ilk filtre
  const searchFilteredDevices = devices.filter(device => {
    const searchLower = searchTerm.toLowerCase()
    return (
      device.name?.toLowerCase().includes(searchLower) ||
      device.model?.toLowerCase().includes(searchLower) ||
      device.user?.name?.toLowerCase().includes(searchLower) ||
      device.user?.email?.toLowerCase().includes(searchLower) ||
      device.location?.toLowerCase().includes(searchLower) ||
      device.brand?.toLowerCase().includes(searchLower)
    )
  })

  // İstatistik seçimine göre ek filtre (toggle)
  const filteredDevices = selectedStat
    ? searchFilteredDevices.filter(d => {
        if (selectedStat === 'online') return d.status === 'online'
        if (selectedStat === 'offline') return d.status === 'offline'
        if (selectedStat === 'pending') return d.isEnrolled === false
        return true
      })
    : searchFilteredDevices

  const handleStatToggle = (statKey) => {
    setSelectedStat(prev => (prev === statKey ? null : statKey))
  }

  return (
    <div className="device-list">
      <div className="device-list-header">
        <h2>Cihaz Listesi</h2>
        <div className="device-list-controls">
          <div className="device-search-container">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Cihaz, model, kullanıcı veya konum ara..." 
              className="device-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="control-buttons">
            {onRefresh && (
              <button className="refresh-button" onClick={onRefresh} title="Yenile">
                <RefreshCw size={18} />
              </button>
            )}
            <div className="device-count">
              {filteredDevices.length} / {devices.length} cihaz
            </div>
          </div>
        </div>
      </div>

      <div className="device-stats">
        <div className={`stat-card ${selectedStat === 'online' ? 'active' : ''}`} onClick={() => handleStatToggle('online')}>
          <div className="stat-number">{searchFilteredDevices.filter(d => d.status === 'online').length}</div>
          <div className="stat-label">Çevrimiçi</div>
          <div className="stat-indicator online"></div>
        </div>
        <div className={`stat-card ${selectedStat === 'offline' ? 'active' : ''}`} onClick={() => handleStatToggle('offline')}>
          <div className="stat-number">{searchFilteredDevices.filter(d => d.status === 'offline').length}</div>
          <div className="stat-label">Çevrimdışı</div>
          <div className="stat-indicator offline"></div>
        </div>
        <div className={`stat-card ${selectedStat === 'pending' ? 'active' : ''}`} onClick={() => handleStatToggle('pending')}>
          <div className="stat-number">{searchFilteredDevices.filter(d => d.isEnrolled === false).length}</div>
          <div className="stat-label">Kayıt Bekliyor</div>
          <div className="stat-indicator pending"></div>
        </div>
      </div>

      <div className="devices-grid">
        {filteredDevices.map((device) => (
          <div 
            key={device.id}
            className={`device-card ${selectedDevice?.id === device.id ? 'selected' : ''} ${device.status}`}
            onClick={() => onSelectDevice(device)}
          >
            <div className="device-header">
              <div className="device-icon">
                <Smartphone size={24} />
              </div>
              <div className="device-status">
                {getStatusIcon(device.status)}
              </div>
            </div>

            <div className="device-info">
              <h3 className="device-name">{device.name}</h3>
              <p className="device-model">{device.model}</p>
            </div>

            <div className="device-details">
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="device-id">{device.id}</span>
              </div>
              
              <div className="detail-row">
               {/* <Battery size={14} /> */}
                <span className="detail-label">Batarya:</span>
                <span className={`battery-level ${getBatteryColor(device.battery)}`}>
                  {device.battery}%
                </span>
              </div>
              
              <div className="detail-row">
                {/* <MapPin size={14} /> */}
                <span className="detail-label">Konum:</span>
                <span className="location">{device.location || 'Bilinmiyor'}</span>
              </div>
              
              <div className="detail-row">
               {/* <Clock size={14} /> */}
                <span className="detail-label">Son Görülme:</span>
                <span className="last-seen">{device.lastSeen || 'Bilinmiyor'}</span>
              </div>
            </div>

            <div className="device-footer">
              <span className={`status-badge ${device.status}`}>
                {getStatusText(device.status)}
              </span>
              <span className="os-version">{device.osVersion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DeviceList
