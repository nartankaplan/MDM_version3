// Cache for API base URL
let cachedApiBaseUrl = null
let lastCacheTime = 0
const CACHE_DURATION = 30000 // 30 seconds

// API base configuration
const getApiBaseUrl = async () => {
  // Return cached URL if still valid
  if (cachedApiBaseUrl && (Date.now() - lastCacheTime) < CACHE_DURATION) {
    return cachedApiBaseUrl
  }

  // Development mode - use current host
  if (import.meta.env.DEV) {
    const host = window.location.hostname
    
    // Probe backend health on current hostname
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const response = await fetch(`http://${host}:3001/health`, { 
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      if (response.ok) {
        cachedApiBaseUrl = `http://${host}:3001/api`
        lastCacheTime = Date.now()
        console.log('🌐 Using current hostname for API:', cachedApiBaseUrl)
        return cachedApiBaseUrl
      }
    } catch (error) {
      console.log('⚠️ Backend health check failed on current hostname...', error.message)
    }
    
    // Fallback: use current host with port 3001
    cachedApiBaseUrl = `http://${host}:3001/api`
    lastCacheTime = Date.now()
    console.log('🌐 Current hostname:', host)
    console.log('🔗 Using fallback localhost URL:', cachedApiBaseUrl)
    return cachedApiBaseUrl
  }
  
  // Production mode - use environment variable or current host
  cachedApiBaseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`
  lastCacheTime = Date.now()
  return cachedApiBaseUrl
}

// Get API URL dynamically each time
const getApiUrl = async (endpoint) => {
  const baseUrl = await getApiBaseUrl()
  const fullUrl = `${baseUrl}${endpoint}`
  console.log('🔗 API URL Generated:', fullUrl)
  return fullUrl
}

// API helper function
const apiCall = async (endpoint, options = {}, authenticatedFetch = null) => {
  const url = await getApiUrl(endpoint)
  
  try {
    console.log('API Call:', url, options)
    console.log('Using authenticatedFetch:', !!authenticatedFetch)
    
    let response;
    if (authenticatedFetch) {
      // Use authenticatedFetch - it handles auth and headers
      console.log('Calling authenticatedFetch with URL:', url)
      response = await authenticatedFetch(url, options)
      console.log('authenticatedFetch response:', response.status, response.statusText)
    } else {
      // Use regular fetch with manual auth
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      }

      // Add auth token if available
      const token = localStorage.getItem('jwtToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      response = await fetch(url, config)
    }
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed')
    }
    
    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Device API functions
export const deviceApi = {
  // Get all devices
  getAll: (authenticatedFetch = null) => apiCall('/devices', {}, authenticatedFetch),
  
  // Get single device
  getById: (id) => apiCall(`/devices/${id}`),
  
  // Send command to device
  sendCommand: (deviceId, action, parameters = null) => 
    apiCall(`/devices/${deviceId}/commands`, {
      method: 'POST',
      body: JSON.stringify(parameters ? { action, parameters } : { action })
    }),
  
  // Create device
  create: (deviceData, authenticatedFetch = null) =>
    apiCall('/devices', {
      method: 'POST',
      body: JSON.stringify(deviceData)
    }, authenticatedFetch),
  
  // Update device
  update: (deviceId, data) =>
    apiCall(`/devices/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  // Get device apps
  getApps: (deviceId) => apiCall(`/devices/${deviceId}/apps`),
  
  // Toggle app status
  toggleApp: (deviceId, appId, isInstalled) =>
    apiCall(`/devices/${deviceId}/apps/${appId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isInstalled })
    }),
  
  // Delete device
  delete: (deviceId) =>
    apiCall(`/devices/${deviceId}`, {
      method: 'DELETE'
    })
}

// Auth API functions
export const authApi = {
  // Login
  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  // Logout
  logout: () =>
    apiCall('/auth/logout', {
      method: 'POST'
    }),
  
  // Get current user
  getCurrentUser: () => apiCall('/auth/me')
}

// Users API functions
export const userApi = {
  // Get all users
  getAll: () => apiCall('/users'),
  
  // Get single user
  getById: (id) => apiCall(`/users/${id}`),
  
  // Create user
  create: (userData) =>
    apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  
  // Update user
  update: (id, userData) =>
    apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }),
  
  // Delete user
  delete: (id) =>
    apiCall(`/users/${id}`, {
      method: 'DELETE'
    })
}

// Commands API functions
export const commandApi = {
  // Get all commands
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiCall(`/commands${query}`)
  },
  
  // Get single command
  getById: (id) => apiCall(`/commands/${id}`),
  
  // Create command
  create: (commandData) =>
    apiCall('/commands', {
      method: 'POST',
      body: JSON.stringify(commandData)
    }),
  
  // Update command
  update: (id, commandData) =>
    apiCall(`/commands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(commandData)
    }),
  
  // Get device commands
  getByDevice: (deviceId) => apiCall(`/commands/device/${deviceId}`)
}

// Enrollment API functions
export const enrollmentApi = {
  // Validate device ID
  validateDeviceId: (deviceId, authenticatedFetch) =>
    apiCall('/enrollment/validate', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    }, authenticatedFetch),
  
  // Connect device with ID
  connectDevice: (deviceId, deviceInfo, authenticatedFetch) =>
    apiCall('/enrollment/connect', {
      method: 'POST',
      body: JSON.stringify({ deviceId, deviceInfo })
    }, authenticatedFetch),
  
  // Get available devices for enrollment
  getAvailableDevices: (authenticatedFetch) => 
    apiCall('/enrollment/devices', {}, authenticatedFetch),
  
  // Disconnect device
  disconnectDevice: (deviceId, authenticatedFetch) =>
    apiCall('/enrollment/disconnect', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    }, authenticatedFetch)
}

// Health check
export const healthCheck = () => apiCall('/health', { 
  headers: { 'Content-Type': 'application/json' } 
})

export default {
  deviceApi,
  authApi,
  userApi,
  commandApi,
  enrollmentApi,
  healthCheck
}

// Clear cache function
const clearApiCache = () => {
  cachedApiBaseUrl = null
  lastCacheTime = 0
  console.log('🧹 API cache cleared')
}

// Export getApiBaseUrl for use in other components
export { getApiBaseUrl, clearApiCache }

// Applications API functions
export const applicationApi = {
  // Create application
  create: ({ name, packageName, version, versionCode, downloadUrl, iconUrl, description, category }) =>
    apiCall('/applications', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        packageName, 
        version: (version ?? '').trim() || null,
        versionCode: versionCode ?? null,
        downloadUrl: downloadUrl ?? null,
        iconUrl: iconUrl ?? null,
        description: description ?? null,
        category: category ?? null
      })
    }),
  // Lookup by package name
  lookupByPackage: (packageName) =>
    apiCall(`/applications/lookup?packageName=${encodeURIComponent(packageName)}`),
  // Update application
  update: (id, { name, packageName, version, versionCode, downloadUrl, iconUrl, description, category }) =>
    apiCall(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, packageName, version, versionCode, downloadUrl, iconUrl, description, category })
    })
}

// Uploads API
export const uploadApi = {
  uploadApk: async (file) => {
    const baseUrl = await getApiBaseUrl()
    const url = `${baseUrl}/uploads/apk`
    const formData = new FormData()
    formData.append('apk', file)
    const token = localStorage.getItem('jwtToken')
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      body: formData
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'APK yüklenemedi')
    return data
  }
}
