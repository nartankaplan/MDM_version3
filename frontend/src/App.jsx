import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Enrollment from './pages/Enrollment'
import Help from './pages/Help'
import Theme from './pages/Theme'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { deviceApi, enrollmentApi } from './services/api'

function AppContent() {
  const { isAuthenticated, loading, authenticatedFetch } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open for desktop
  const location = useLocation();
  const navigate = useNavigate();
  const [deviceCount, setDeviceCount] = useState(0);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [activeDeviceCount, setActiveDeviceCount] = useState(0);

  // Dinamik verileri yükle
  useEffect(() => {
    if (isAuthenticated) {
      fetchCounts();
    }
  }, [isAuthenticated]);

  const fetchCounts = async () => {
    try {
      // Toplam cihaz sayısı
      const devicesResult = await deviceApi.getAll();
      if (devicesResult.success) {
        const devices = devicesResult.data || [];
        setDeviceCount(devices.length);
        setActiveDeviceCount(devices.filter(d => d.status === 'online').length);
      }

      // Kayıt için hazır cihaz sayısı
      const enrollmentResult = await enrollmentApi.getAvailableDevices(authenticatedFetch);
      if (enrollmentResult.success) {
        setEnrollmentCount(enrollmentResult.data.length);
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const currentPath = location.pathname;

  return (
    <div className="app">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="app-content">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          currentPage={currentPath}
          onPageChange={(path) => navigate(path)}
          deviceCount={deviceCount}
          enrollmentCount={enrollmentCount}
          activeDeviceCount={activeDeviceCount}
        />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/devices" replace />} />
            <Route path="/devices" element={<Dashboard />} />
            <Route path="/enrollment" element={<Enrollment />} />
            <Route path="/help" element={<Help />} />
            <Route path="/theme" element={<Theme />} />
            <Route path="*" element={<Navigate to="/devices" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App
