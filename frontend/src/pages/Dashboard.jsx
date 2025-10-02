import { useState, useEffect } from 'react'
import DeviceList from '../components/DeviceList'
import DeviceManagement from '../components/DeviceManagement'
import { useAuth } from '../contexts/AuthContext'
import { deviceApi } from '../services/api'

function Dashboard() {
  const { authenticatedFetch } = useAuth()
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // API'den cihaz verilerini çek
  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const result = await deviceApi.getAll(authenticatedFetch)
      
      if (result.success) {
        setDevices(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Cihazlar yüklenirken bir hata oluştu')
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cihazlar yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>Bir hata oluştu</h3>
          <p>{error}</p>
          <button onClick={fetchDevices} className="retry-button">
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard ${selectedDevice ? 'with-management' : ''}`}>
      <div className="device-section">
        <DeviceList 
          devices={devices} 
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          onRefresh={fetchDevices}
        />
      </div>
      
      {selectedDevice && (
        <div className="management-section">
          <DeviceManagement 
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
            onDeviceUpdate={fetchDevices}
          />
        </div>
      )}
    </div>
  )
}

export default Dashboard
