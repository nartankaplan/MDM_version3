const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { getNetworkIP } = require('./get-network-ip');

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow localhost and local network IPs
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/
      ];
      
      if (!origin || allowedOrigins.some(pattern => pattern.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost and local network IPs
    const allowedOrigins = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/
    ];
    
    if (!origin || allowedOrigins.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static files serving
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${require('path').sep}uploads${require('path').sep}`)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/devices', require('./src/routes/devices'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/commands', require('./src/routes/commands'));
app.use('/api/enrollment', require('./src/routes/enrollment'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/applications', require('./src/routes/applications'));
app.use('/api/uploads', require('./src/routes/uploads'));

// Root path welcome message
app.get('/', (req, res) => {
  const networkIP = getNetworkIP();
  res.json({
    message: 'MDM Backend Server is running!',
    version: '1.0.0',
    endpoints: {
      webPanel: `http://${networkIP}:5173`,
      api: `http://${networkIP}:3001/api`,
      headwindMDM: `http://${networkIP}:3001/{project}/rest/public/sync/configuration/{deviceId}`
    },
    status: 'online'
  });
});

// URL düzeltme middleware'i - Headwind route'undan önce
app.use((req, res, next) => {
  // Eski IP'den gelen istekleri güncel IP'ye yönlendir
  try {
    const host = req.headers.host || '';
    if (host.startsWith('192.168.150.1')) {
      const currentIP = getNetworkIP();
      const targetHost = `${currentIP}:${process.env.PORT || 3001}`;
      const redirectUrl = `http://${targetHost}${req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl}`;
      console.log(`🔁 Redirecting legacy host ${host} -> ${targetHost}`);
      return res.redirect(301, redirectUrl);
    }
  } catch (_) {}

  // Eğer URL'de / eksikse ve default-project içeriyorsa düzelt
  if (req.originalUrl.includes('default-project') && !req.originalUrl.startsWith('/default-project')) {
    const correctedUrl = '/' + req.originalUrl;
    console.log(`🔄 Server URL Redirect: ${req.originalUrl} -> ${correctedUrl}`);
    return res.redirect(correctedUrl);
  }
  next();
});

// Headwind MDM API Routes
app.use('/', require('./src/routes/headwind'));

// Socket.IO for real-time communication
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Device status updates
  socket.on('deviceStatusUpdate', (data) => {
    // Broadcast to all connected admin panels
    socket.broadcast.emit('deviceStatusChanged', data);
  });
  
  // MDM commands
  socket.on('mdmCommand', (data) => {
    // Send command to specific device
    socket.to(data.deviceId).emit('executeCommand', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MDM Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  const networkIP = getNetworkIP();
  console.log(`🚀 MDM Backend Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time communication`);
  console.log(`🌐 Server accessible from network: http://${networkIP}:${PORT}`);
  console.log(`🔗 Local access: http://localhost:${PORT}`);
  console.log(`📱 Frontend URL: http://${networkIP}:5173`);
  console.log(`🔗 Share this URL with other devices on the same network!`);
});

module.exports = app;
