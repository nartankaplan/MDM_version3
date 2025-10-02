const os = require('os');

function getNetworkIP() {
  // Prefer dynamic detection; allow env override only if explicitly set
  const envHost = process.env.SERVER_PUBLIC_HOST || process.env.HOST_IP || process.env.HOST;
  if (envHost && envHost.trim().length > 0) return envHost.trim();

  const interfaces = os.networkInterfaces();
  const isVirtualName = (name) => {
    const n = (name || '').toLowerCase();
    return n.includes('vmware') || n.includes('vmnet') || n.includes('virtual') || n.includes('vbox') ||
           n.includes('vethernet') || n.includes('hyper-v') || n.includes('loopback') ||
           n.includes('hamachi') || n.includes('tailscale') || n.includes('zerotier') || n.includes('bridge');
  };

  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const addr = iface.address;
      // Score by private range preference
      let score = 0;
      if (/^192\.168\.1\./.test(addr)) score += 6; // very common home LAN
      if (/^192\.168\./.test(addr)) score += 5;
      else if (/^10\./.test(addr)) score += 4;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) score += 3;
      // Penalize virtual adapters
      if (isVirtualName(name)) score -= 10;
      // Prefer Wi-Fi/Ethernet
      const lname = (name || '').toLowerCase();
      if (lname.includes('wi-fi') || lname.includes('wifi') || lname.includes('wlan')) score += 2;
      if (lname.includes('ethernet') || lname === 'ethernet') score += 1;
      candidates.push({ name, address: addr, score });
    }
  }

  if (candidates.length === 0) return 'localhost';
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].address;
}

module.exports = { getNetworkIP };
