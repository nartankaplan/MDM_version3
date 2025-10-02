import { useState, useEffect } from 'react'
import { Smartphone, CheckCircle, XCircle, RefreshCw, Copy, AlertCircle, Plus } from 'lucide-react'
import { enrollmentApi, deviceApi, userApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

function Enrollment() {
  const { authenticatedFetch } = useAuth()
  const [availableDevices, setAvailableDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [showDeviceInfo, setShowDeviceInfo] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
         const [createFormData, setCreateFormData] = useState({
           deviceName: '',
           userName: ''
         })
  useEffect(() => {
    fetchAvailableDevices()
  }, [])

  const fetchAvailableDevices = async () => {
    try {
      setLoading(true)
      const result = await enrollmentApi.getAvailableDevices(authenticatedFetch)
      if (result.success) {
        setAvailableDevices(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Cihazlar yüklenirken hata oluştu')
      console.error('Fetch devices error:', err)
    } finally {
      setLoading(false)
    }
  }


  const handleDeviceSelect = (device) => {
    setSelectedDevice(device)
    setShowDeviceInfo(true)
  }

  const handleCopyDeviceId = (deviceId) => {
    navigator.clipboard.writeText(deviceId.toString())
    alert('Cihaz ID kopyalandı!')
  }

  const handleDisconnectDevice = async (deviceId) => {
    if (!confirm('Bu cihazın bağlantısını kesmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const result = await enrollmentApi.disconnectDevice(deviceId, authenticatedFetch)
      if (result.success) {
        await fetchAvailableDevices()
        alert('Cihaz bağlantısı başarıyla kesildi!')
      } else {
        alert('Hata: ' + result.error)
      }
    } catch (err) {
      alert('Cihaz bağlantısı kesilirken hata oluştu!')
      console.error('Disconnect error:', err)
    }
  }

         const handleCreateDevice = async (e) => {
           e.preventDefault()

           // Form validation
           if (!createFormData.deviceName) {
             alert('Cihaz adı zorunludur!')
             return
           }

           try {
             // Yeni cihaz oluştur
            const deviceData = {
              name: createFormData.deviceName,
              model: 'Android Device',
              brand: 'Unknown',
              osVersion: 'Android',
              imei: 'TEMP-' + Date.now(), // Geçici IMEI
              userName: createFormData.userName?.trim() || undefined
            }

             const result = await deviceApi.create(deviceData, authenticatedFetch)
             if (result.success) {
               setShowCreateModal(false)
               setCreateFormData({
                 deviceName: '',
                 userName: ''
               })
               await fetchAvailableDevices()
               alert(`Yeni cihaz oluşturuldu! Device ID: ${result.data.id}\nAndroid cihazda bu ID ile kayıt olabilir.`)
             } else {
               alert('Hata: ' + result.error)
             }
           } catch (err) {
             alert('Cihaz oluşturulurken hata oluştu!')
             console.error('Create device error:', err)
           }
         }

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Kayıt için hazır cihazlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">
          <h1>Cihaz Kayıt Yönetimi</h1>
          <p>Cihaz ID'leri ile cihaz kayıtlarını yönetin</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={fetchAvailableDevices}
          >
            <RefreshCw size={20} />
            Yenile
          </button>
                 <button
                   className="btn-primary"
                   onClick={() => setShowCreateModal(true)}
                 >
                   <Plus size={20} />
                   Yeni Cihaz Oluştur
                 </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="enrollment-info">
        <div className="info-card">
          <h3>Cihaz Kayıt Süreci</h3>
          <ol>
            <li>"Yeni Cihaz Oluştur" butonuna tıklayın</li>
            <li>Cihaz adını girin</li>
            <li>Sistem otomatik olarak yeni Device ID oluşturacak</li>
            <li>Android cihazda MDM uygulamasını açın</li>
            <li>Oluşturulan Device ID'yi girin ve bağlanın</li>
          </ol>
        </div>
      </div>

      <div className="devices-section">
        <h2>Kayıt İçin Hazır Cihazlar</h2>
        
        {availableDevices.length === 0 ? (
          <div className="empty-state">
            <Smartphone size={48} />
            <h3>Kayıt için hazır cihaz yok</h3>
            <p>Tüm cihazlar zaten kayıtlı veya henüz cihaz eklenmemiş</p>
          </div>
        ) : (
          <div className="devices-grid">
            {availableDevices.map((device) => (
              <div key={device.id} className="device-card">
                <div className="device-header">
                  <div className="device-info">
                    <h3>{device.name}</h3>
                    <span className="device-id">ID: {device.id}</span>
                  </div>
                  <div className="device-status">
                    <span className="status-badge pending">Kayıt Bekliyor</span>
                  </div>
                </div>

                <div className="device-details">
                  <div className="detail-row">
                    <span className="label">ID:</span>
                    <span className="value device-id">{device.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Model:</span>
                    <span className="value">{device.model}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Marka:</span>
                    <span className="value">{device.brand || 'Belirtilmemiş'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">OS:</span>
                    <span className="value">{device.osVersion}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">IMEI:</span>
                    <span className="value">{device.imei}</span>
                  </div>
                </div>

                <div className="device-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => handleCopyDeviceId(device.id)}
                  >
                    <Copy size={16} />
                    ID Kopyala
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <CheckCircle size={16} />
                    Detaylar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device Detail Modal */}
      {showDeviceInfo && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Cihaz Detayları - {selectedDevice.name}</h2>
              <button 
                className="btn-icon"
                onClick={() => setShowDeviceInfo(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="device-detail-info">
                <div className="info-section">
                  <h4>Cihaz Bilgileri</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Cihaz ID:</span>
                      <span className="value">{selectedDevice.id}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Ad:</span>
                      <span className="value">{selectedDevice.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Model:</span>
                      <span className="value">{selectedDevice.model}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Marka:</span>
                      <span className="value">{selectedDevice.brand || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">OS Sürümü:</span>
                      <span className="value">{selectedDevice.osVersion}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">IMEI:</span>
                      <span className="value">{selectedDevice.imei}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Telefon:</span>
                      <span className="value">{selectedDevice.phoneNumber || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">MAC Adresi:</span>
                      <span className="value">{selectedDevice.macAddress || 'Belirtilmemiş'}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Sahip Bilgileri</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Ad:</span>
                      <span className="value">{selectedDevice.user.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">E-posta:</span>
                      <span className="value">{selectedDevice.user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Kayıt Talimatları</h4>
                  <div className="instructions">
                    <p><strong>Cihaz ID:</strong> <code>{selectedDevice.id}</code></p>
                    <ol>
                      <li>Android cihazda MDM uygulamasını açın</li>
                      <li>"Cihaz Kaydet" seçeneğini seçin</li>
                      <li>Cihaz ID olarak <strong>{selectedDevice.id}</strong> girin</li>
                      <li>"Bağlan" butonuna basın</li>
                      <li>Cihaz otomatik olarak kaydedilecektir</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => handleCopyDeviceId(selectedDevice.id)}
                >
                  <Copy size={16} />
                  ID Kopyala
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowDeviceInfo(false)}
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Device Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
             <div className="modal-header">
               <h2>Yeni Cihaz Oluştur</h2>
              <button 
                className="btn-icon"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateDevice} className="modal-content">
                     <div className="form-group">
                       <label>Cihaz Adı *</label>
                       <input
                         type="text"
                         value={createFormData.deviceName || ''}
                         onChange={(e) => setCreateFormData({...createFormData, deviceName: e.target.value})}
                         placeholder="Örn: Samsung Galaxy S24"
                         required
                       />
                       <small className="form-help">Cihaz için bir isim belirleyin</small>
                     </div>
                     <div className="form-group">
                       <label>Kullanıcı</label>
                       <input
                         type="text"
                         value={createFormData.userName || ''}
                         onChange={(e) => setCreateFormData({...createFormData, userName: e.target.value})}
                         placeholder="Örn: Ahmet Yılmaz"
                       />
                       <small className="form-help">Opsiyonel: Cihazı bir kullanıcıya ata</small>
                     </div>
              
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  İptal
                </button>
                       <button type="submit" className="btn-primary">
                         Cihaz Oluştur
                       </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Enrollment