import { 
  X, 
  Lock, 
  Unlock, 
  Trash2, 
  MapPin, 
  RotateCcw, 
  Smartphone,
  Battery,
  Wifi,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  Settings,
  Package,
  Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { deviceApi, commandApi, applicationApi, uploadApi } from '../services/api'

function DeviceManagement({ device, onClose, onDeviceUpdate }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAppManagement, setShowAppManagement] = useState(false)
  const [deviceApps, setDeviceApps] = useState([])
  const [appLoading, setAppLoading] = useState(false)
  const [activeAppTab, setActiveAppTab] = useState('list') // 'list' | 'create'
  const [newAppName, setNewAppName] = useState('')
  const [newAppPackage, setNewAppPackage] = useState('')
  const [newAppVersion, setNewAppVersion] = useState('')
  const [apkUploading, setApkUploading] = useState(false)
  const [apkMeta, setApkMeta] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [creatingApp, setCreatingApp] = useState(false)
  const [editingAppId, setEditingAppId] = useState(null)
  const [appFilter, setAppFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showAlarmModal, setShowAlarmModal] = useState(false)
  const [alarmMessage, setAlarmMessage] = useState('Uyarı: Lütfen yöneticinizle iletişime geçin')
  const [alarmWhen, setAlarmWhen] = useState('now') // 'now' | 'schedule'
  const [alarmTime, setAlarmTime] = useState('') // ISO local string or HH:mm
  const [alarmSending, setAlarmSending] = useState(false)
  const [kioskToggling, setKioskToggling] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locating, setLocating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(device?.location || '')
  const [appSearch, setAppSearch] = useState('')

  // Cihaza ait aktiviteleri çek
  useEffect(() => {
    if (device?.id) {
      fetchDeviceActivities()
    }
  }, [device?.id])

  const fetchDeviceActivities = async () => {
    try {
      const result = await commandApi.getByDevice(device.id)
      if (result.success) {
        setActivities(result.data)
      }
    } catch (error) {
      console.error('Aktiviteler yüklenirken hata:', error)
      setActivities([])
    }
  }

  const fetchDeviceApps = async () => {
    try {
      setAppLoading(true)
      const result = await deviceApi.getApps(device.id)
      if (result.success) {
        setDeviceApps(result.data)
      } else {
        console.error('Uygulamalar alınırken hata:', result.error)
        setDeviceApps([])
      }
    } catch (error) {
      console.error('Uygulamalar yüklenirken hata:', error)
      setDeviceApps([])
    } finally {
      setAppLoading(false)
    }
  }

  const toggleAppStatus = async (appId, newStatus) => {
    try {
      const result = await deviceApi.toggleApp(device.id, appId, newStatus)
      
      if (result.success) {
        // Local state'i güncelle
        setDeviceApps(prevApps => 
          prevApps.map(app => 
            app.id === appId 
              ? { ...app, isInstalled: newStatus }
              : app
          )
        )
        
        // Aktiviteleri yenile
        await fetchDeviceActivities()
        
        alert(`Uygulama ${newStatus ? 'aktif' : 'pasif'} edildi!`)
      } else {
        alert('Uygulama durumu değiştirilirken hata oluştu: ' + result.error)
      }
    } catch (error) {
      console.error('Uygulama durumu değiştirilirken hata:', error)
      alert('Uygulama durumu değiştirilirken bir hata oluştu!')
    }
  }

  const handleAction = async (action) => {
    try {
      setLoading(true)
      console.log(`${action} action for device:`, device.name)
      
      // Backend'e komut gönder
      const result = await deviceApi.sendCommand(device.id, action)
      
      if (result.success) {
        // Aktiviteleri ve cihaz listesini güncelle
        await fetchDeviceActivities()
        if (onDeviceUpdate) {
          onDeviceUpdate()
        }
        
        alert(`${action} komutu başarıyla gönderildi!`)
      } else {
        alert('Komut gönderilirken hata oluştu: ' + result.error)
      }
    } catch (error) {
      console.error('Komut gönderme hatası:', error)
      alert('Komut gönderilirken bir hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDevice = async () => {
    try {
      setDeleteLoading(true)
      console.log('Deleting device:', device.name)
      
      // Backend'e silme isteği gönder
      const result = await deviceApi.delete(device.id)
      
      if (result.success) {
        alert(`Cihaz "${device.name}" başarıyla silindi!`)
        // Cihaz listesini güncelle ve modal'ı kapat
        if (onDeviceUpdate) {
          onDeviceUpdate()
        }
        onClose()
      } else {
        alert('Cihaz silinirken hata oluştu: ' + result.error)
      }
    } catch (error) {
      console.error('Cihaz silme hatası:', error)
      alert('Cihaz silinirken bir hata oluştu!')
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const getBatteryColor = (battery) => {
    if (battery > 60) return 'battery-high'
    if (battery > 30) return 'battery-medium'
    return 'battery-low'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'status-online'
      case 'offline':
        return 'status-offline'
      case 'warning':
        return 'status-warning'
      default:
        return 'status-offline'
    }
  }

  return (
    <div className="device-management">
      <div className="management-header">
        <h2>Cihaz Yönetimi</h2>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="device-overview">
        <div className="device-info-card">
          <div className="device-icon-large">
            <Smartphone size={48} />
          </div>
          <div className="device-details-main">
            <h3>{device.name}</h3>
            <p className="device-model">{device.model}</p>
            <span className={`status-indicator ${getStatusColor(device.status)}`}>
              {device.status === 'online' ? 'Çevrimiçi' : 
               device.status === 'offline' ? 'Çevrimdışı' : 'Uyarı'}
            </span>
          </div>
        </div>

        <div className="device-stats-grid">
          <div className="stat-item">
            <Battery size={20} />
            <div>
              <div className={`stat-value ${getBatteryColor(device.battery)}`}>
                {device.battery}%
              </div>
              <div className="stat-label">Batarya</div>
            </div>
          </div>
          
          <div className="stat-item">
            <Wifi size={20} />
            <div>
              <div className="stat-value">
                {device.status === 'online' ? 'Bağlı' : 'Bağlı Değil'}
              </div>
              <div className="stat-label">Bağlantı</div>
            </div>
          </div>
          
          <div className="stat-item">
            <Calendar size={20} />
            <div>
              <div className="stat-value">{device.lastSeen}</div>
              <div className="stat-label">Son Görülme</div>
            </div>
          </div>
        </div>
      </div>

      <div className="management-actions">
        <h3>Cihaz İşlemleri</h3>
        <div className="actions-grid">
          <button 
            className={`action-button ${device.kioskMode ? 'unlock' : 'lock'} disabled`}
            disabled={true}
            title="Yakında etkinleştirilecek"
          >
            <Shield size={20} />
            <span>Kiosk Modu (Yakında)</span>
          </button>
          
          <button 
            className="action-button locate"
            disabled={loading || locating}
            title="Cihaz konumunu göster"
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              try {
                setShowLocationModal(true)
                setLocating(true)
                setCurrentLocation(device?.location || '')
                // Arka planda locate komutunu gönder
                await deviceApi.sendCommand(device.id, 'locate')
                await fetchDeviceActivities()
              } catch (e) {
                console.error('Konum komutu hatası:', e)
              } finally {
                setLocating(false)
              }
            }}
          >
            <MapPin size={20} />
            <span>{locating ? 'Konum İsteniyor...' : 'Konum Bul'}</span>
          </button>
          
          <button 
            className="action-button apps"
            onClick={() => {
              setShowAppManagement(true)
              fetchDeviceApps()
            }}
            disabled={loading}
            title="Uygulama yönetimi aktif"
          >
            <Package size={20} />
            <span>Uygulama Yönet</span>
          </button>
          
          <button 
            className="action-button delete danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading || deleteLoading}
            title="Cihazı sil"
          >
            <Trash2 size={20} />
            <span>Cihazı Sil</span>
          </button>
        </div>
      </div>

      <div className="device-information">
        <h3>Cihaz Bilgileri</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>IMEI</label>
            <span>{device.imei}</span>
          </div>
          
          <div className="info-item">
            <label>Telefon Numarası</label>
            <span>{device.phoneNumber}</span>
          </div>
          
          <div className="info-item">
            <label>İşletim Sistemi</label>
            <span>{device.osVersion}</span>
          </div>
          
          <div className="info-item">
            <label>Konum</label>
            <span>{device.location}</span>
          </div>
          
          <div className="info-item">
            <label>Kullanıcı</label>
            <span>{device.employee}</span>
          </div>
          
          <div className="info-item">
            <label>Son Aktivite</label>
            <span>{device.lastSeen}</span>
          </div>
        </div>
      </div>

      <div className="recent-activities">
        <h3>Son Aktiviteler</h3>
        <div className="activity-list">
          {activities.length > 0 ? (
            activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {activity.action === 'locate' && <MapPin size={16} />}
                  {activity.action === 'lock' && <Lock size={16} />}
                  {activity.action === 'unlock' && <Unlock size={16} />}
                  {activity.action === 'restart' && <RotateCcw size={16} />}
                  {activity.action === 'wipe' && <Trash2 size={16} />}
                  {activity.action === 'alert' && <AlertTriangle size={16} />}
                  {activity.action === 'install_app' && <Package size={16} />}
                  {activity.action === 'uninstall_app' && <Package size={16} />}
                  {!['locate', 'lock', 'unlock', 'restart', 'wipe', 'alert', 'install_app', 'uninstall_app'].includes(activity.action) && <Smartphone size={16} />}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.description || activity.action}</div>
                  <div className="activity-time">
                    {activity.status === 'completed' ? 'Tamamlandı' : 
                     activity.status === 'pending' ? 'Bekliyor' : 
                     activity.status === 'failed' ? 'Başarısız' : activity.status}
                    {' - '}
                    {new Date(activity.createdAt).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activities">
              <p>Bu cihaz için henüz aktivite bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>

      {/* Uygulama Yönetimi Modal */}
      {showAppManagement && (
        <div className="app-management-modal" style={{zIndex: 9999}}>
          <div className="modal-overlay" onClick={() => setShowAppManagement(false)}></div>
          <div className="modal-content" style={{zIndex: 10000, position: 'relative', maxWidth: '960px', width: '90%'}}>
            <div className="modal-header">
              <h3>Uygulama Yönetimi</h3>
              <button className="close-button" onClick={() => setShowAppManagement(false)}>
                <X size={20} />
              </button>
            </div>
            {/* Tabs */}
            <div style={{display: 'flex', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 10001, alignItems: 'center', flexWrap: 'wrap'}}>
              <button
                onClick={() => setActiveAppTab('list')}
                className="action-button"
                style={{
                  padding: '6px 10px',
                  background: activeAppTab === 'list' ? 'var(--bg-secondary)' : 'transparent',
                  border: '1px solid var(--border-primary)'
                }}
              >
                Uygulamalar
              </button>
              <button
                onClick={() => setActiveAppTab('create')}
                className="action-button"
                style={{
                  padding: '6px 10px',
                  background: activeAppTab === 'create' ? 'var(--bg-secondary)' : 'transparent',
                  border: '1px solid var(--border-primary)'
                }}
              >
                Yeni Uygulama
              </button>
              <button
                onClick={() => setActiveAppTab('apk')}
                className="action-button"
                style={{
                  padding: '6px 10px',
                  background: activeAppTab === 'apk' ? 'var(--bg-secondary)' : 'transparent',
                  border: '1px solid var(--border-primary)'
                }}
              >
                APK ekle
              </button>
              {activeAppTab === 'list' && (
                <div style={{flex: 1, minWidth: 240}}>
                  <input 
                    type="text" 
                    placeholder="Uygulama adı veya paket ara..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              )}
              {activeAppTab === 'list' && (
                <div style={{display: 'flex', gap: 6}}>
                  <button
                    className="action-button"
                    onClick={() => setAppFilter('all')}
                    style={{
                      padding: '6px 10px',
                      background: appFilter === 'all' ? 'var(--bg-secondary)' : 'transparent',
                      border: '1px solid var(--border-primary)'
                    }}
                  >
                    Tümü
                  </button>
                  <button
                    className="action-button"
                    onClick={() => setAppFilter('active')}
                    style={{
                      padding: '6px 10px',
                      background: appFilter === 'active' ? 'var(--bg-secondary)' : 'transparent',
                      border: '1px solid var(--border-primary)'
                    }}
                  >
                    Aktif
                  </button>
                  <button
                    className="action-button"
                    onClick={() => setAppFilter('inactive')}
                    style={{
                      padding: '6px 10px',
                      background: appFilter === 'inactive' ? 'var(--bg-secondary)' : 'transparent',
                      border: '1px solid var(--border-primary)'
                    }}
                  >
                    Pasif
                  </button>
                </div>
              )}
            </div>

            <div className="modal-body" style={{background: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
              {appLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Uygulamalar yükleniyor...</p>
                </div>
              ) : (
                <div className="app-list">
                  {activeAppTab === 'list' ? (
                    <>
                      {(
                        (appSearch ? deviceApps.filter(a => (a.name||'').toLowerCase().includes(appSearch.toLowerCase()) || (a.packageName||'').toLowerCase().includes(appSearch.toLowerCase())) : deviceApps)
                        .filter(a => appFilter === 'all' ? true : appFilter === 'active' ? !!a.isInstalled : !a.isInstalled)
                      ).map((app) => (
                        <div key={app.id} className="app-item" style={{background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 8}}>
                          <div className="app-info" style={{display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0}}>
                            <div className="app-icon" style={{width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                              {app.iconUrl ? (
                                <img src={app.iconUrl} alt={app.name} style={{width: 28, height: 28, borderRadius: 6, objectFit: 'cover'}} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <Package size={24} />
                              )}
                            </div>
                            <div className="app-details" style={{minWidth: 0, flex: 1}}>
                              <h4 style={{color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{app.name}</h4>
                              <p className="app-package" style={{margin: 0, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{app.packageName}</p>
                              {app.version && <p className="app-version">v{app.version}</p>}
                            </div>
                          </div>
                          <div className="app-controls" style={{display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0}}>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={app.isInstalled}
                                onChange={(e) => toggleAppStatus(app.id, e.target.checked)}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                            <span className="app-status">
                              {app.isInstalled ? 'Aktif' : 'Pasif'}
                            </span>
                            <button
                              className="action-button"
                              style={{marginLeft: 8}}
                              title="Uygulamayı düzenle"
                              onClick={() => {
                                setActiveAppTab('create')
                                setNewAppName(app.name || '')
                                setNewAppPackage(app.packageName || '')
                                setNewAppVersion(app.version || '')
                                // Düzenleme moduna geçtiğimizi anlamak için id'yi state'te tutalım
                                setEditingAppId(app.id)
                              }}
                            >
                              Düzenle
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : activeAppTab === 'create' ? (
                    <div style={{maxWidth: 520, marginTop: 12}}>
                      <div className="form-group" style={{marginBottom: 12}}>
                        <label>İsim<span style={{color: '#ef4444'}}> *</span></label>
                        <input
                          type="text"
                          value={newAppName}
                          onChange={(e) => setNewAppName(e.target.value)}
                          placeholder="Uygulama adı"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                      <div className="form-group" style={{marginBottom: 12}}>
                        <label>Package<span style={{color: '#ef4444'}}> *</span></label>
                        <input
                          type="text"
                          value={newAppPackage}
                          onChange={(e) => setNewAppPackage(e.target.value)}
                          placeholder="com.ornek.uygulama"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                      <div className="form-group" style={{marginBottom: 16}}>
                        <label>Versiyon (opsiyonel)</label>
                        <input
                          type="text"
                          value={newAppVersion}
                          onChange={(e) => setNewAppVersion(e.target.value)}
                          placeholder="ör: 1.0.0"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                      <div style={{display: 'flex', gap: 8}}>
                        <button
                          className="action-button"
                          onClick={async () => {
                            try {
                              if (!newAppName.trim() || !newAppPackage.trim()) {
                                alert('İsim ve package alanları zorunludur');
                                return;
                              }
                              setCreatingApp(true)
                              if (editingAppId) {
                                // Güncelleme
                                await applicationApi.update(editingAppId, { name: newAppName.trim(), packageName: newAppPackage.trim() })
                                alert('Uygulama güncellendi')
                              } else {
                                // Oluşturma
                                let createdAppId = null
                                try {
                                  const createRes = await applicationApi.create({
                                    name: newAppName.trim(),
                                    packageName: newAppPackage.trim(),
                                    version: (newAppVersion || '').trim() || null
                                  })
                                  createdAppId = createRes?.data?.id
                                } catch (createErr) {
                                  // Eğer duplicate package ise, var olan uygulamayı bul ve ilişkilendir
                                  try {
                                    const lookup = await applicationApi.lookupByPackage(newAppPackage.trim())
                                    createdAppId = lookup?.data?.id
                                  } catch (_) {}
                                  if (!createdAppId) {
                                    throw createErr
                                  }
                                }
                                if (createdAppId) {
                                  try {
                                    // Cihaza ilişkilendir (kurulu değil olarak)
                                    await deviceApi.toggleApp(device.id, createdAppId, false)
                                  } catch (linkErr) {
                                    console.warn('Uygulama cihazla ilişkilendirilemedi:', linkErr)
                                  }
                                }
                                alert('Uygulama oluşturuldu')
                              }
                              setNewAppName('')
                              setNewAppPackage('')
                              setNewAppVersion('')
                              setEditingAppId(null)
                              setActiveAppTab('list')
                              await fetchDeviceApps()
                            } catch (e) {
                              console.error('Yeni uygulama oluşturma hatası:', e)
                              alert(e?.message || 'Uygulama oluşturulamadı')
                            } finally {
                              setCreatingApp(false)
                            }
                          }}
                          disabled={creatingApp}
                        >
                          {creatingApp ? (editingAppId ? 'Güncelleniyor...' : 'Oluşturuluyor...') : (editingAppId ? 'Uygulamayı Güncelle' : 'Uygulama Ekle')}
                        </button>
                        <button
                          className="cancel-button"
                          onClick={() => {
                            setActiveAppTab('list')
                            setEditingAppId(null)
                          }}
                          disabled={creatingApp}
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{maxWidth: 640, marginTop: 12}}>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOver(false);
                          const file = e.dataTransfer.files?.[0]
                          if (!file) return
                          if (!file.name.toLowerCase().endsWith('.apk')) {
                            alert('Lütfen .apk dosyası yükleyin');
                            return
                          }
                          try {
                            setApkUploading(true)
                            const res = await uploadApi.uploadApk(file)
                            setApkMeta(res.data)
                            // Prefill fields
                            const m = res.data.metadata || {}
                            setNewAppName((m.name || file.name.replace(/\.apk$/i, '')).trim())
                            setNewAppPackage(m.packageName || '')
                            setNewAppVersion(m.versionName || '')
                          } catch (err) {
                            console.error('APK upload failed', err)
                            alert(err?.message || 'APK yüklenemedi')
                          } finally {
                            setApkUploading(false)
                          }
                        }}
                        style={{
                          border: '2px dashed var(--border-primary)',
                          background: dragOver ? 'var(--bg-secondary)' : 'transparent',
                          padding: 20,
                          borderRadius: 8,
                          textAlign: 'center',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <div style={{fontSize: 16, marginBottom: 8}}>Bilgisayarınızdan .apk dosyasını buraya sürükleyip bırakın</div>
                        <div style={{fontSize: 12}}>Yüklendikten sonra metadata otomatik doldurulur</div>
                        <div style={{marginTop: 10}}>
                          <input type="file" accept=".apk" onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            try {
                              setApkUploading(true)
                              const res = await uploadApi.uploadApk(file)
                              setApkMeta(res.data)
                              const m = res.data.metadata || {}
                              setNewAppName((m.name || file.name.replace(/\.apk$/i, '')).trim())
                              setNewAppPackage(m.packageName || '')
                              setNewAppVersion(m.versionName || '')
                            } catch (err) {
                              console.error('APK upload failed', err)
                              alert(err?.message || 'APK yüklenemedi')
                            } finally {
                              setApkUploading(false)
                              e.target.value = ''
                            }
                          }} />
                        </div>
                        {apkUploading && (
                          <div className="loading-container"><div className="loading-spinner"></div><p>Yükleniyor...</p></div>
                        )}
                      </div>

                      {apkMeta && (
                        <div style={{marginTop: 16, padding: 12, border: '1px solid var(--border-primary)', borderRadius: 8, background: 'var(--bg-secondary)'}}>
                          <div style={{fontWeight: 600, marginBottom: 8}}>APK Bilgileri</div>
                          <div style={{display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 6}}>
                            <div>Dosya:</div><div>{apkMeta.fileName}</div>
                            <div>Paket:</div><div>{apkMeta.metadata?.packageName || '-'}</div>
                            <div>Ad:</div><div>{apkMeta.metadata?.name || '-'}</div>
                            <div>Versiyon:</div><div>{apkMeta.metadata?.versionName || '-'}</div>
                            <div>Version Code:</div><div>{apkMeta.metadata?.versionCode ?? '-'}</div>
                            <div>URL:</div><div style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{apkMeta.downloadUrl}</div>
                          </div>
                        </div>
                      )}

                      <div style={{marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                        <div>
                          <label>Uygulama Adı</label>
                          <input 
                            type="text" 
                            value={newAppName}
                            onChange={(e)=>setNewAppName(e.target.value)}
                            placeholder="APK adı"
                            style={{width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid var(--border-primary)', background:'var(--bg-secondary)', color:'var(--text-primary)'}}
                          />
                        </div>
                        <div>
                          <label>Package</label>
                          <input 
                            type="text" 
                            value={newAppPackage}
                            onChange={(e)=>setNewAppPackage(e.target.value)}
                            placeholder="com.ornek.app"
                            style={{width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid var(--border-primary)', background:'var(--bg-secondary)', color:'var(--text-primary)'}}
                          />
                        </div>
                        <div>
                          <label>Versiyon</label>
                          <input 
                            type="text" 
                            value={newAppVersion}
                            onChange={(e)=>setNewAppVersion(e.target.value)}
                            placeholder="1.0.0"
                            style={{width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid var(--border-primary)', background:'var(--bg-secondary)', color:'var(--text-primary)'}}
                          />
                        </div>
                        <div>
                          <label>İndirme URL</label>
                          <input 
                            type="text" 
                            value={apkMeta?.downloadUrl || ''}
                            readOnly
                            style={{width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid var(--border-primary)', background:'var(--bg-secondary)', color:'var(--text-primary)'}}
                          />
                        </div>
                      </div>

                      <div style={{display: 'flex', gap: 8, marginTop: 12}}>
                        <button
                          className="action-button"
                          disabled={apkUploading || !apkMeta || !newAppPackage.trim() || !newAppName.trim()}
                          onClick={async () => {
                            try {
                              if (!apkMeta) return
                              // Create or update application with downloadUrl
                              let appId = null
                              try {
                                const createRes = await applicationApi.create({
                                  name: newAppName.trim(),
                                  packageName: newAppPackage.trim(),
                                  version: (newAppVersion || '').trim() || null,
                                  versionCode: apkMeta.metadata?.versionCode ?? null,
                                  downloadUrl: apkMeta.downloadUrl
                                })
                                appId = createRes?.data?.id
                              } catch (createErr) {
                                try {
                                  const lookup = await applicationApi.lookupByPackage(newAppPackage.trim())
                                  if (lookup?.data?.id) {
                                    appId = lookup.data.id
                                    // ensure downloadUrl is set
                                    await applicationApi.update(appId, { downloadUrl: apkMeta.downloadUrl, version: (newAppVersion || '').trim() || null })
                                  }
                                } catch (_) {}
                                if (!appId) throw createErr
                              }
                              // Link to device and trigger install
                              await deviceApi.toggleApp(device.id, appId, true)
                              alert('APK eklendi')
                              setActiveAppTab('list')
                              setApkMeta(null)
                              setNewAppName('')
                              setNewAppPackage('')
                              setNewAppVersion('')
                              await fetchDeviceApps()
                              await fetchDeviceActivities()
                            } catch (err) {
                              console.error('APK ekle hata', err)
                              alert(err?.message || 'İşlem başarısız')
                            }
                          }}
                        >
                          Ekle
                        </button>
                        <button
                          className="cancel-button"
                          onClick={() => { setApkMeta(null); setNewAppName(''); setNewAppPackage(''); setNewAppVersion('') }}
                          disabled={apkUploading}
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alarm Gönder Modal */}
      {showAlarmModal && (
        <div className="app-management-modal" style={{zIndex: 9999}}>
          <div className="modal-overlay" onClick={() => setShowAlarmModal(false)}></div>
          <div className="modal-content" style={{zIndex: 10000, position: 'relative'}}>
            <div className="modal-header">
              <h3>Alarm Gönder</h3>
              <button className="close-button" onClick={() => setShowAlarmModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{background: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
              <div className="form-group" style={{marginBottom: 16}}>
                <label>Mesaj</label>
                <input
                  type="text"
                  value={alarmMessage}
                  onChange={(e) => setAlarmMessage(e.target.value)}
                  placeholder="Cihazda görünecek mesaj"
                  style={{width: '100%'}}
                />
              </div>
              <div className="form-group" style={{marginBottom: 16}}>
                <label>Zaman</label>
                <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <input type="radio" name="alarmWhen" value="now" checked={alarmWhen === 'now'} onChange={() => setAlarmWhen('now')} />
                    Şimdi gönder
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <input type="radio" name="alarmWhen" value="schedule" checked={alarmWhen === 'schedule'} onChange={() => setAlarmWhen('schedule')} />
                    Belirli saatte
                  </label>
                  {alarmWhen === 'schedule' && (
                    <input
                      type="datetime-local"
                      value={alarmTime}
                      onChange={(e) => setAlarmTime(e.target.value)}
                    />
                  )}
                </div>
              </div>
              <div className="confirmation-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowAlarmModal(false)}
                  disabled={alarmSending}
                >
                  İptal
                </button>
                <button 
                  className="delete-button danger"
                  onClick={async () => {
                    try {
                      setAlarmSending(true)
                      const params = {
                        message: alarmMessage,
                        scheduleAt: alarmWhen === 'schedule' && alarmTime ? new Date(alarmTime).toISOString() : null
                      }
                      const result = await deviceApi.sendCommand(device.id, 'alert', params)
                      if (result.success) {
                        await fetchDeviceActivities()
                        if (onDeviceUpdate) onDeviceUpdate()
                        alert(params.scheduleAt ? 'Alarm planlandı' : 'Alarm gönderildi')
                        setShowAlarmModal(false)
                      } else {
                        alert('Alarm gönderilirken hata: ' + result.error)
                      }
                    } catch (e) {
                      console.error('Alarm gönderme hatası:', e)
                      alert('Alarm gönderilirken bir hata oluştu')
                    } finally {
                      setAlarmSending(false)
                    }
                  }}
                  disabled={alarmSending || (alarmWhen === 'schedule' && !alarmTime)}
                >
                  {alarmSending ? 'Gönderiliyor...' : (alarmWhen === 'schedule' ? 'Planla' : 'Şimdi Gönder')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konum Modal */}
      {showLocationModal && (
        <div className="app-management-modal" style={{zIndex: 9999}}>
          <div className="modal-overlay" onClick={() => setShowLocationModal(false)}></div>
          <div className="modal-content" style={{zIndex: 10000, position: 'relative'}}>
            <div className="modal-header">
              <h3>Cihaz Konumu</h3>
              <button className="close-button" onClick={() => setShowLocationModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{background: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
              {currentLocation ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                  <div>
                    <label>Koordinatlar</label>
                    <div style={{marginTop: 6}}>{currentLocation}</div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentLocation)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="action-button"
                    style={{display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content'}}
                  >
                    <MapPin size={16} /> Google Haritalar'da Aç
                  </a>
                  <div style={{fontSize: 12, color: 'var(--text-secondary)'}}>
                    Konum cihazdan periyodik olarak güncellenir. En güncel konum için birkaç saniye sonra tekrar deneyin.
                  </div>
                </div>
              ) : (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Konum alınıyor...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cihaz Silme Onay Modal'ı */}
      {showDeleteConfirm && (
        <div className="app-management-modal" style={{zIndex: 9999}}>
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}></div>
          <div className="modal-content" style={{zIndex: 10000, position: 'relative'}}>
            <div className="modal-header">
              <h3>Cihazı Sil</h3>
              <button className="close-button" onClick={() => setShowDeleteConfirm(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{background: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
              <div className="delete-confirmation">
                <div className="warning-icon">
                  <AlertTriangle size={48} style={{color: '#ef4444'}} />
                </div>
                <h4 style={{color: 'var(--text-primary)', marginBottom: '16px'}}>
                  Cihazı Silmek İstediğinizden Emin misiniz?
                </h4>
                <p style={{color: 'var(--text-secondary)', marginBottom: '24px'}}>
                  <strong>"{device.name}"</strong> cihazı kalıcı olarak silinecek. 
                  Bu işlem geri alınamaz ve cihaza ait tüm veriler (komutlar, uygulamalar, aktiviteler) silinecektir.
                </p>
                
                <div className="confirmation-actions">
                  <button 
                    className="cancel-button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    İptal
                  </button>
                  <button 
                    className="delete-button danger"
                    onClick={handleDeleteDevice}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeviceManagement
