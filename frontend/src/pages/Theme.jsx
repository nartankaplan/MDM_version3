import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiBaseUrl } from '../services/api'

function Theme() {
  const { authenticatedFetch } = useAuth()
  const [form, setForm] = useState({ backgroundColor: '#000000', textColor: '#ffffff', backgroundImageUrl: '', mode: 'color' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const base = await getApiBaseUrl()
        const res = await authenticatedFetch(`${base.replace('/api','')}/api/settings/theme`)
        const data = await res.json()
        if (data.success) setForm(data.data)
      } catch (e) {
        setError('Tema ayarları yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setSuccess('')
    setError('')
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({ ...prev, backgroundImageDataUrl: reader.result }))
      setSuccess('')
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleClearImage = () => {
    setForm(prev => ({ ...prev, backgroundImageUrl: '', backgroundImageDataUrl: '', clearBackgroundImage: true }))
    setSuccess('')
    setError('')
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const base = await getApiBaseUrl()
      const res = await authenticatedFetch(`${base.replace('/api','')}/api/settings/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) setSuccess('Tema ayarları kaydedildi')
      else setError(data.error || 'Kayıt başarısız')
    } catch (e) {
      setError('Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Tema ayarları yükleniyor...</p>
    </div>
  )

  return (
    <div className="main-content">
      <div className="page-header">
        <div className="page-title">
          <h1>Tema</h1>
          <p>Mobil cihaz arkaplan ve yazı rengi</p>
        </div>
      </div>

      {error && <div className="error-message"><p>{error}</p></div>}
      {success && <div className="success-message"><p>{success}</p></div>}

      <div className="card" style={{ padding: 20 }}>
        <div className="form-group">
          <label>Arkaplan Modu</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label>
              <input type="radio" name="mode" value="color" checked={form.mode === 'color'} onChange={handleChange} />
              <span style={{ marginLeft: 6 }}>Renk</span>
            </label>
            <label>
              <input type="radio" name="mode" value="image" checked={form.mode === 'image'} onChange={handleChange} />
              <span style={{ marginLeft: 6 }}>Resim</span>
            </label>
          </div>
        </div>
        {form.mode === 'color' && (
        <div className="form-group">
          <label>Arkaplan Rengi</label>
          <input type="color" name="backgroundColor" value={form.backgroundColor} onChange={handleChange} />
          <input type="text" name="backgroundColor" value={form.backgroundColor} onChange={handleChange} />
        </div>
        )}
        <div className="form-group">
          <label>Yazı Rengi</label>
          <input type="color" name="textColor" value={form.textColor} onChange={handleChange} />
          <input type="text" name="textColor" value={form.textColor} onChange={handleChange} />
        </div>

        {form.mode === 'image' && (
        <div className="form-group">
          <label>Arkaplan Resmi</label>
          <input type="file" accept="image/*" onChange={handleImageSelect} />
          {form.backgroundImageUrl && (
            <div style={{ marginTop: 10 }}>
              <img src={form.backgroundImageUrl} alt="current background" style={{ maxWidth: 240, borderRadius: 8 }} />
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={handleClearImage}>Resmi Kaldır</button>
          </div>
        </div>
        )}

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}

export default Theme


