import os from 'os';

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) addresses and IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const networkIP = getNetworkIP();
console.log(`🌐 Network IP: ${networkIP}`);
console.log(`🔗 Frontend URL: http://${networkIP}:5173`);
console.log(`🔗 Backend URL: http://${networkIP}:3001`);
console.log(`📱 Share this URL with other devices on the same network!`);

export { getNetworkIP };
