const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// URL düzeltme middleware'i - eksik / karakterini ekle
router.use((req, res, next) => {
  // Eğer URL'de / eksikse ve default-project içeriyorsa düzelt
  if (req.originalUrl.includes('default-project') && !req.originalUrl.startsWith('/default-project')) {
    const correctedUrl = '/' + req.originalUrl;
    console.log(`🔄 Headwind URL Redirect: ${req.originalUrl} -> ${correctedUrl}`);
    return res.redirect(correctedUrl);
  }
  next();
});

// Headwind MDM API Endpoints
// Bu endpoint'ler Headwind MDM Android uygulamasının beklediği format

// Device enrollment ve configuration alma
router.post('/:project/rest/public/sync/configuration/:number', async (req, res) => {
  try {
    const { project, number } = req.params;
    const deviceInfo = req.body;
    
    // Headwind MDM header'larını logla
    console.log('📱 Headwind MDM Headers:', {
      'X-Request-Signature': req.headers['x-request-signature'],
      'X-CPU-Arch': req.headers['x-cpu-arch'],
      'Content-Type': req.headers['content-type']
    });

    console.log(`📱 Device enrollment request: ${number} in project: ${project}`);
    console.log('Device info:', JSON.stringify(deviceInfo, null, 2));

    // Device'i database'de bul veya oluştur
    // Önce IMEI ile ara, sonra deviceId ile ara, son olarak ID ile ara
    let device = await prisma.device.findFirst({
      where: { 
        OR: [
          { imei: number },
          { deviceId: number },
          { id: parseInt(number) } // Manuel oluşturulan cihazları ID ile bul
        ]
      }
    });

    if (!device) {
      // Yeni device oluştur
      device = await prisma.device.create({
        data: {
          name: deviceInfo.model || `Device-${number}`,
          model: deviceInfo.model || 'Unknown',
          brand: deviceInfo.brand || 'Unknown',
          osVersion: deviceInfo.androidVersion || 'Unknown',
          imei: number,
          phoneNumber: deviceInfo.phone || null,
          serialNumber: deviceInfo.serial || null,
          isEnrolled: true,
          enrollmentDate: new Date(),
          status: 'ONLINE',
          battery: deviceInfo.batteryLevel || null,
          userId: 1, // Default admin user
          
          // Headwind MDM specific fields
          deviceId: number,
          project: project,
          cpu: deviceInfo.cpu || null,
          iccid: deviceInfo.iccid || null,
          imsi: deviceInfo.imsi || null,
          phone2: deviceInfo.phone2 || null,
          imei2: deviceInfo.imei2 || null,
          iccid2: deviceInfo.iccid2 || null,
          imsi2: deviceInfo.imsi2 || null,
          mdmMode: deviceInfo.mdmMode || false,
          kioskMode: deviceInfo.kioskMode || false,
          launcherType: deviceInfo.launcherType || null,
          launcherPackage: deviceInfo.launcherPackage || null,
          defaultLauncher: deviceInfo.defaultLauncher || false,
          custom1: deviceInfo.custom1 || null,
          custom2: deviceInfo.custom2 || null,
          custom3: deviceInfo.custom3 || null
        }
      });
      console.log(`✅ New device created: ${device.id}`);
      
      // Yeni cihaza otomatik uygulama ata
      try {
        const apps = await prisma.application.findMany({
          where: {
            OR: [
              { name: 'Gmail' },
              { name: 'Google Maps' },
              { name: 'Chrome' },
              { name: 'WhatsApp' },
              { name: 'Facebook' },
              { name: 'Not Defteri' },
              { name: 'Instagram' },
              { name: 'TikTok' }
            ]
          },
          select: { id: true, name: true }
        });
        
        const selectedApps = apps; // Belirli uygulamaları al
        
        for (const app of selectedApps) {
          try {
            await prisma.deviceApplication.create({
              data: {
                deviceId: device.id,
                applicationId: app.id,
                isInstalled: true,
                installedAt: new Date(),
                version: '1.0.0'
              }
            });
          } catch (error) {
            // Uygulama zaten atanmışsa sessizce geç
          }
        }
        
        console.log(`📱 ${selectedApps.length} uygulama otomatik atandı`);
      } catch (error) {
        console.log('⚠️ Uygulama atama hatası:', error.message);
      }
    } else {
      // Mevcut device'i güncelle
      
      // Eğer cihazda hiç uygulama yoksa otomatik ata
      const existingApps = await prisma.deviceApplication.count({
        where: { deviceId: device.id }
      });
      
      if (existingApps === 0) {
        try {
          const apps = await prisma.application.findMany({
            where: {
              OR: [
                { name: 'Gmail' },
                { name: 'Google Maps' },
                { name: 'Chrome' },
                { name: 'WhatsApp' },
                { name: 'Facebook' },
                { name: 'Not Defteri' },
                { name: 'Instagram' },
                { name: 'TikTok' }
              ]
            },
            select: { id: true, name: true }
          });
          
          const selectedApps = apps; // Belirli uygulamaları al
          
          for (const app of selectedApps) {
            try {
              await prisma.deviceApplication.create({
                data: {
                  deviceId: device.id,
                  applicationId: app.id,
                  isInstalled: true,
                  installedAt: new Date(),
                  version: '1.0.0'
                }
              });
            } catch (error) {
              // Uygulama zaten atanmışsa sessizce geç
            }
          }
          
          console.log(`📱 Mevcut cihaza ${selectedApps.length} uygulama otomatik atandı`);
        } catch (error) {
          console.log('⚠️ Mevcut cihaza uygulama atama hatası:', error.message);
        }
      }
      device = await prisma.device.update({
        where: { id: device.id },
        data: {
          name: device.name, // Manuel oluşturulan cihazın ismini koru
          model: deviceInfo.model || device.model,
          osVersion: deviceInfo.androidVersion || device.osVersion,
          phoneNumber: deviceInfo.phone || device.phoneNumber,
          serialNumber: deviceInfo.serial || device.serialNumber,
          status: 'ONLINE',
          lastSeen: new Date(),
          isEnrolled: true,
          enrollmentDate: new Date(),
          battery: deviceInfo.batteryLevel || device.battery,
          
          // Headwind MDM specific fields
          deviceId: number, // Mobil cihazdan gelen ID'yi kaydet
          cpu: deviceInfo.cpu || device.cpu,
          iccid: deviceInfo.iccid || device.iccid,
          imsi: deviceInfo.imsi || device.imsi,
          phone2: deviceInfo.phone2 || device.phone2,
          imei2: deviceInfo.imei2 || device.imei2,
          iccid2: deviceInfo.iccid2 || device.iccid2,
          imsi2: deviceInfo.imsi2 || device.imsi2,
          mdmMode: deviceInfo.mdmMode !== undefined ? deviceInfo.mdmMode : device.mdmMode,
          kioskMode: deviceInfo.kioskMode !== undefined ? deviceInfo.kioskMode : device.kioskMode,
          launcherType: deviceInfo.launcherType || device.launcherType,
          launcherPackage: deviceInfo.launcherPackage || device.launcherPackage,
          defaultLauncher: deviceInfo.defaultLauncher !== undefined ? deviceInfo.defaultLauncher : device.defaultLauncher,
          custom1: deviceInfo.custom1 || device.custom1,
          custom2: deviceInfo.custom2 || device.custom2,
          custom3: deviceInfo.custom3 || device.custom3
        }
      });
      console.log(`✅ Device updated: ${device.id}`);
    }

    // Headwind MDM'nin beklediği configuration format
    // Read theme settings
    const theme = await getThemeSettings(req);

    const hasBgImage = !!(theme.backgroundImageUrl);
    const bgFields = await buildBackgroundFields(theme, req);
    const hostHeader = req.headers.host;
    const baseUrl = hostHeader ? `http://${hostHeader}` : '';
    const config = {
      newNumber: number,
      backgroundColor: hasBgImage ? theme.backgroundColor : theme.backgroundColor,
      textColor: theme.textColor,
      // legacy/alternate keys for launcher compatibility (if image exists, prefer image in 'background')
      background: hasBgImage ? (bgFields.background || theme.backgroundImageUrl) : theme.backgroundColor,
      text: theme.textColor,
      backgroundImageUrl: bgFields.backgroundImageUrl || theme.backgroundImageUrl || '',
      // additional wallpaper keys for launcher compatibility
      wallpaperUrl: bgFields.wallpaperUrl || theme.backgroundImageUrl || '',
      wallpaper: bgFields.wallpaper || theme.backgroundImageUrl || '',
      backgroundImage: bgFields.backgroundImage || '',
      backgroundDataUrl: bgFields.backgroundDataUrl || '',
      useBackgroundImage: hasBgImage,
      password: "",
      phone: deviceInfo.phone || "",
      imei: deviceInfo.imei || number,
      iconSize: 100,
      title: "MDM Launcher",
      displayStatus: true,
      gps: true,
      bluetooth: true,
      wifi: true,
      mobileData: true,
      kioskMode: device.kioskMode === true,
      mainApp: "",
      lockStatusBar: false,
      lockVolume: false,
      lockPower: false,
      lockHome: false,
      lockBack: false,
      lockMenu: false,
      lockRecents: false,
      lockNotifications: false,
      lockScreenshots: false,
      lockUsb: false,
      lockSafeSettings: false,
      lockDeveloperOptions: false,
      lockInstallApps: false,
      lockUninstallApps: false,
      lockLocationServices: false,
      lockMobileData: false,
      lockWifi: false,
      lockBluetooth: false,
      lockUsbStorage: false,
      lockSystemUpdate: false,
      lockFactoryReset: false,
      lockSystemSettings: false,
      lockAppSettings: false,
      lockSecuritySettings: false,
      lockAccessibilitySettings: false,
      lockUnknownSources: false,
      applications: await getDeviceApplications(device.id, req),
      files: [],
      restrictions: "",
      systemUpdateType: 0,
      systemUpdateFrom: "",
      systemUpdateTo: "",
      allowedClasses: "",
      allowedPackages: (device.kioskMode === true) ? (device.launcherPackage || 'com.hmdm.launcher') : "",
      disallowedPackages: "",
      pushOptions: "polling",
      keepaliveTime: 30,
      requestUpdates: "auto",
      disableLocation: false,
      appPermissions: "askall",
      usbStorage: false,
      autoBrightness: false,
      brightness: 50,
      manageTimeout: false,
      timeout: 0,
      manageVolume: false,
      volume: 50,
      passwordMode: "none",
      timeZone: "",
      orientation: 0,
      kioskHome: !!device.kioskMode,
      kioskRecents: !!device.kioskMode,
      kioskNotifications: !!device.kioskMode,
      kioskSystemInfo: !!device.kioskMode,
      kioskKeyguard: !!device.kioskMode,
      kioskLockButtons: !!device.kioskMode,
      description: "",
      custom1: "",
      custom2: "",
      custom3: "",
      runDefaultLauncher: false,
      newServerUrl: baseUrl,
      lockSafeSettings: false,
      permissive: false,
      kioskExit: !device.kioskMode,
      disableScreenshots: false,
      autostartForeground: false,
      showWifi: false,
      appName: "MDM Launcher",
      vendor: "MDM System"
    };

    // Response signature oluştur (Headwind MDM'nin beklediği format)
    const crypto = require('crypto');
    const responseData = JSON.stringify(config).replace(/\s/g, '');
    const signature = crypto.createHash('sha1').update('changeme-C3z9vi54' + responseData).digest('hex').toUpperCase();
    
    res.set('X-Response-Signature', signature);
    res.json({
      status: "OK",
      message: "Configuration loaded successfully",
      data: config
    });

  } catch (error) {
    console.error('❌ Device enrollment error:', error);
    res.status(500).json({
      status: "ERROR",
      message: 'Device enrollment failed: ' + error.message
    });
  }
});

// Configuration alma (enrollment olmadan)
router.get('/:project/rest/public/sync/configuration/:number', async (req, res) => {
  try {
    const { project, number } = req.params;
    
    // Headwind MDM header'larını logla
    console.log('📱 Headwind MDM GET Headers:', {
      'X-Request-Signature': req.headers['x-request-signature'],
      'X-CPU-Arch': req.headers['x-cpu-arch']
    });

    const device = await prisma.device.findFirst({
      where: { 
        OR: [
          { imei: number },
          { deviceId: number },
          { id: parseInt(number) }
        ]
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const theme = await getThemeSettings(req);
    const hasBgImage2 = !!(theme.backgroundImageUrl);
    const bgFields2 = await buildBackgroundFields(theme, req);
    const hostHeader2 = req.headers.host;
    const baseUrl2 = hostHeader2 ? `http://${hostHeader2}` : '';
    const config = {
      newNumber: number,
      backgroundColor: hasBgImage2 ? theme.backgroundColor : theme.backgroundColor,
      textColor: theme.textColor,
      background: hasBgImage2 ? (bgFields2.background || theme.backgroundImageUrl) : theme.backgroundColor,
      text: theme.textColor,
      backgroundImageUrl: bgFields2.backgroundImageUrl || theme.backgroundImageUrl || '',
      wallpaperUrl: bgFields2.wallpaperUrl || theme.backgroundImageUrl || '',
      wallpaper: bgFields2.wallpaper || theme.backgroundImageUrl || '',
      backgroundImage: bgFields2.backgroundImage || '',
      backgroundDataUrl: bgFields2.backgroundDataUrl || '',
      useBackgroundImage: hasBgImage2,
      password: "",
      phone: device.phoneNumber || "",
      imei: device.imei || number,
      iconSize: 100,
      title: "MDM Launcher",
      displayStatus: true,
      gps: true,
      bluetooth: true,
      wifi: true,
      mobileData: true,
      kioskMode: device.kioskMode === true,
      mainApp: "",
      lockStatusBar: false,
      lockVolume: false,
      lockPower: false,
      lockHome: false,
      lockBack: false,
      lockMenu: false,
      lockRecents: false,
      lockNotifications: false,
      lockScreenshots: false,
      lockUsb: false,
      lockSafeSettings: false,
      lockDeveloperOptions: false,
      lockInstallApps: false,
      lockUninstallApps: false,
      lockLocationServices: false,
      lockMobileData: false,
      lockWifi: false,
      lockBluetooth: false,
      lockUsbStorage: false,
      lockSystemUpdate: false,
      lockFactoryReset: false,
      lockSystemSettings: false,
      lockAppSettings: false,
      lockSecuritySettings: false,
      lockAccessibilitySettings: false,
      lockUnknownSources: false,
      applications: await getDeviceApplications(device.id, req),
      files: [],
      restrictions: "",
      systemUpdateType: 0,
      systemUpdateFrom: "",
      systemUpdateTo: "",
      allowedClasses: "",
      allowedPackages: (device.kioskMode === true) ? (device.launcherPackage || 'com.hmdm.launcher') : "",
      disallowedPackages: "",
      pushOptions: "polling",
      keepaliveTime: 30,
      requestUpdates: "auto",
      disableLocation: false,
      appPermissions: "askall",
      usbStorage: false,
      autoBrightness: false,
      brightness: 50,
      manageTimeout: false,
      timeout: 0,
      manageVolume: false,
      volume: 50,
      passwordMode: "none",
      timeZone: "",
      orientation: 0,
      kioskHome: !!device.kioskMode,
      kioskRecents: !!device.kioskMode,
      kioskNotifications: !!device.kioskMode,
      kioskSystemInfo: !!device.kioskMode,
      kioskKeyguard: !!device.kioskMode,
      kioskLockButtons: !!device.kioskMode,
      description: "",
      custom1: "",
      custom2: "",
      custom3: "",
      runDefaultLauncher: false,
      newServerUrl: baseUrl2,
      lockSafeSettings: false,
      permissive: false,
      kioskExit: !device.kioskMode,
      disableScreenshots: false,
      autostartForeground: false,
      showWifi: false,
      appName: "MDM Launcher",
      vendor: "MDM System"
    };

    // Response signature oluştur (Headwind MDM'nin beklediği format)
    const crypto = require('crypto');
    const responseData = JSON.stringify(config).replace(/\s/g, '');
    const signature = crypto.createHash('sha1').update('changeme-C3z9vi54' + responseData).digest('hex').toUpperCase();
    
    res.set('X-Response-Signature', signature);
    res.json({
      status: "OK",
      message: "Configuration loaded successfully",
      data: config
    });

  } catch (error) {
    console.error('❌ Get configuration error:', error);
    res.status(500).json({
      status: "ERROR",
      message: 'Failed to get configuration: ' + error.message
    });
  }
});

// Device info gönderme
router.post('/:project/rest/public/sync/info', async (req, res) => {
  try {
    const { project } = req.params;
    const deviceInfo = req.body;

    console.log(`📱 Device info received from: ${deviceInfo.deviceId}`);
    console.log('Device info:', JSON.stringify(deviceInfo, null, 2));

    // Device'i bul ve güncelle
    const device = await prisma.device.findFirst({
      where: { 
        OR: [
          { imei: deviceInfo.deviceId },
          { deviceId: deviceInfo.deviceId },
          { id: parseInt(deviceInfo.deviceId) }
        ]
      }
    });

    if (device) {
      await prisma.device.update({
        where: { id: device.id },
        data: {
          battery: deviceInfo.batteryLevel || device.battery,
          location: deviceInfo.location ? 
            `${deviceInfo.location.lat},${deviceInfo.location.lon}` : device.location,
          status: 'ONLINE',
          lastSeen: new Date()
        }
      });

      // Device applications'ı güncelle
      if (deviceInfo.applications && deviceInfo.applications.length > 0) {
        await updateDeviceApplications(device.id, deviceInfo.applications);
      }

      // Event log oluştur
      await prisma.deviceEvent.create({
        data: {
          deviceId: device.id,
          eventType: 'STATUS_CHANGE',
          title: 'Device Status Update',
          description: `Battery: ${deviceInfo.batteryLevel}%, Location: ${deviceInfo.location ? 'Available' : 'Not available'}`,
          severity: 'INFO'
        }
      });
    }

    res.json({
      status: "OK",
      message: 'Device info received successfully'
    });

  } catch (error) {
    console.error('❌ Device info error:', error);
    res.status(500).json({
      status: "ERROR",
      message: 'Failed to process device info: ' + error.message
    });
  }
});

// Push notifications alma
router.get('/:project/rest/notifications/device/:number', async (req, res) => {
  try {
    const { project, number } = req.params;

    const device = await prisma.device.findFirst({
      where: { 
        OR: [
          { imei: number },
          { deviceId: number },
          { id: parseInt(number) }
        ]
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Bekleyen komutları al
    const pendingCommands = await prisma.command.findMany({
      where: {
        deviceId: device.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    });

    // Headwind launcher expects a list of PushMessage objects
    // Build messages for alarm commands and ignore future-scheduled ones
    const now = new Date();
    const messages = [];

    for (const cmd of pendingCommands) {
      const params = cmd.parameters ? JSON.parse(cmd.parameters) : {};
      const scheduleAt = params && params.scheduleAt ? new Date(params.scheduleAt) : null;

      if (cmd.action === 'ALARM') {
        // Skip if scheduled for the future
        if (scheduleAt && scheduleAt > now) {
          continue;
        }
        const payload = {
          title: 'MDM Alarm',
          message: params && params.message ? params.message : (cmd.description || 'Yönetici tarafından alarm'),
          commandId: cmd.id
        };
        messages.push({
          messageType: 'showNotification',
          payload: JSON.stringify(payload)
        });
        // Mark command as completed upon dispatching notification payload
        try {
          await prisma.command.update({
            where: { id: cmd.id },
            data: {
              status: 'COMPLETED',
              executedAt: new Date(),
              completedAt: new Date(),
              result: JSON.stringify({ delivered: true })
            }
          });
        } catch (e) {}
      } else {
        // Non-alarm commands can be mapped to config update to force sync
        messages.push({
          messageType: 'configUpdated',
          payload: ''
        });
      }
    }

    res.json({
      status: "OK",
      message: "Notifications retrieved successfully",
      data: messages
    });

  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      status: "ERROR",
      message: 'Failed to get notifications: ' + error.message
    });
  }
});

// Komut tamamlama endpoint'i
router.post('/:project/rest/public/sync/command/:commandId', async (req, res) => {
  try {
    const { project, commandId } = req.params;
    const { status, result, error } = req.body;

    console.log(`📱 Command completion: ${commandId} - Status: ${status}`);

    // Komutu bul ve güncelle
    const command = await prisma.command.findUnique({
      where: { id: parseInt(commandId) },
      include: { device: true }
    });

    if (!command) {
      return res.status(404).json({
        success: false,
        error: 'Command not found'
      });
    }

    // Komut durumunu güncelle
    await prisma.command.update({
      where: { id: parseInt(commandId) },
      data: {
        status: status === 'success' ? 'COMPLETED' : 'FAILED',
        result: result || null,
        errorMessage: error || null,
        completedAt: new Date()
      }
    });

    // Cihazın son görülme zamanını güncelle
    await prisma.device.update({
      where: { id: command.deviceId },
      data: {
        lastSeen: new Date(),
        status: 'ONLINE'
      }
    });

    console.log(`✅ Command ${commandId} completed with status: ${status}`);

    res.json({
      status: "OK",
      message: "Command status updated successfully"
    });

  } catch (error) {
    console.error('❌ Command completion error:', error);
    res.status(500).json({
      status: "ERROR",
      message: 'Failed to update command status: ' + error.message
    });
  }
});

// Helper functions
async function getDeviceApplications(deviceId, req) {
  const deviceApps = await prisma.deviceApplication.findMany({
    where: { deviceId },
    include: { application: true }
  });

  console.log(`📱 Device ${deviceId} applications:`, deviceApps.map(da => ({
    name: da.application.name,
    packageName: da.application.packageName,
    isInstalled: da.isInstalled
  })));

  // Add common system apps that should always be available
  const commonSystemApps = [
    { name: 'Telefon', packageName: 'com.android.dialer', version: '1.0' },
    { name: 'Mesajlar', packageName: 'com.android.mms', version: '1.0' },
    { name: 'Kamera', packageName: 'com.android.camera2', version: '1.0' },
    { name: 'Galeri', packageName: 'com.android.gallery3d', version: '1.0' }
  ];

  const allApps = [...deviceApps];
  
  // Add system apps that aren't already in the list
  for (const sysApp of commonSystemApps) {
    const exists = deviceApps.some(da => da.application.packageName === sysApp.packageName);
    if (!exists) {
      // Create application record if it doesn't exist
      let application = await prisma.application.findFirst({
        where: { packageName: sysApp.packageName }
      });
      
      if (!application) {
        application = await prisma.application.create({
          data: {
            name: sysApp.name,
            packageName: sysApp.packageName,
            version: sysApp.version,
            isSystemApp: true
          }
        });
      }
      
      // Create device application record
      const deviceApp = await prisma.deviceApplication.upsert({
        where: {
          deviceId_applicationId: {
            deviceId: deviceId,
            applicationId: application.id
          }
        },
        update: {
          isInstalled: true,
          version: sysApp.version,
          installedAt: new Date()
        },
        create: {
          deviceId: deviceId,
          applicationId: application.id,
          isInstalled: true,
          version: sysApp.version,
          installedAt: new Date()
        }
      });
      
      allApps.push({
        ...deviceApp,
        application: application
      });
    }
  }

  return allApps.map(da => ({
    type: 'app',
    name: da.application.name,
    pkg: da.application.packageName,
    version: da.version || da.application.version,
    code: da.application.versionCode || 1,
    url: da.application.downloadUrl || '',
    useKiosk: false,
    showIcon: true,
    remove: !da.isInstalled,
    runAfterInstall: da.isInstalled,
    runAtBoot: false,
    skipVersion: false,
      // Send full name as iconText to avoid 2-letter initials in some clients
      iconText: da.application.name,
      icon: resolveIconUrl(getAppIcon(da.application.packageName) || da.application.iconUrl || '', req) || 'android',
    screenOrder: 0,
    keyCode: 0,
    bottom: false,
    longTap: false,
    intent: ''
  }));
}

function resolveIconUrl(iconUrl, req) {
  if (!iconUrl) return '';
  if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://')) return iconUrl;
  const host = req.headers.host; // e.g. 192.168.x.x:3001
  const cleaned = iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`;
  return `http://${host}${cleaned}`;
}

async function getDevicePolicies(deviceId) {
  const devicePolicies = await prisma.devicePolicy.findMany({
    where: { 
      deviceId,
      isActive: true 
    },
    include: { policy: true }
  });

  return devicePolicies.map(dp => ({
    id: dp.policy.id,
    name: dp.policy.name,
    description: dp.policy.description,
    rules: dp.policy.rules ? JSON.parse(dp.policy.rules) : {},
    appliedAt: dp.appliedAt
  }));
}

async function updateDeviceApplications(deviceId, applications) {
  for (const app of applications) {
    // Application'ı bul veya oluştur
    let application = await prisma.application.findFirst({
      where: { packageName: app.pkg }
    });

    if (!application) {
      application = await prisma.application.create({
        data: {
          name: app.name || app.pkg,
          packageName: app.pkg,
          version: app.version,
          isSystemApp: false
        }
      });
    }

    // DeviceApplication'ı güncelle veya oluştur
    await prisma.deviceApplication.upsert({
      where: {
        deviceId_applicationId: {
          deviceId: deviceId,
          applicationId: application.id
        }
      },
      update: {
        isInstalled: !app.remove,
        version: app.version,
        installedAt: !app.remove ? new Date() : null
      },
      create: {
        deviceId: deviceId,
        applicationId: application.id,
        isInstalled: !app.remove,
        version: app.version,
        installedAt: !app.remove ? new Date() : null
      }
    });
  }
}

async function getThemeSettings(req) {
  try {
    const bg = await prisma.systemSetting.findUnique({ where: { key: 'theme_background_color' } });
    const text = await prisma.systemSetting.findUnique({ where: { key: 'theme_text_color' } });
    const img = await prisma.systemSetting.findUnique({ where: { key: 'theme_background_image' } });
    const mode = await prisma.systemSetting.findUnique({ where: { key: 'theme_background_mode' } });
    const settings = {
      backgroundColor: bg?.value || '#000000',
      textColor: text?.value || '#ffffff',
      backgroundImageUrl: img?.value || '',
      mode: mode?.value || 'color'
    };
    // Ensure absolute URL for background image
    if (settings.backgroundImageUrl && settings.backgroundImageUrl.startsWith('/')) {
      const host = req.headers.host;
      settings.backgroundImageUrl = `http://${host}${settings.backgroundImageUrl}`;
    }
    return settings;
  } catch (e) {
    return { backgroundColor: '#000000', textColor: '#ffffff', backgroundImageUrl: '', mode: 'color' };
  }
}

async function buildBackgroundFields(theme, req) {
  const result = { background: '', backgroundImageUrl: '', wallpaperUrl: '', wallpaper: '', backgroundImage: '', backgroundDataUrl: '' };
  if (!theme.backgroundImageUrl || theme.mode !== 'image') return result;
  // Ensure absolute
  let url = theme.backgroundImageUrl;
  if (url.startsWith('/')) {
    url = `http://${req.headers.host}${url}`;
  }
  result.background = url;
  result.backgroundImageUrl = url;
  result.wallpaperUrl = url;
  result.wallpaper = url;
  result.backgroundImage = url;
  return result;
}

// Uygulama iconlarını döndür
function getAppIcon(packageName) {
  const iconMap = {
    'com.whatsapp': '/icons/whatsapp.png',
    'com.facebook.katana': '/icons/facebook.png',
    'com.google.android.keep': '/icons/keep.png',
    'com.google.android.gm': '/icons/gmail.png',
    'com.android.chrome': '/icons/chrome.png',
    'com.instagram.android': '/icons/instagram.png',
    'com.zhiliaoapp.musically': '/icons/tiktok.png',
    'com.google.android.apps.maps': '/icons/maps.png',
    'org.telegram.messenger': '/icons/telegram.png',
    'com.microsoft.teams': '/icons/teams.png',
    'com.spotify.music': '/icons/spotify.png',
    'com.google.android.youtube': '/icons/youtube.png',
    'com.google.android.dialer': '/icons/phone.png',
    'com.android.mms': '/icons/messages.png',
    'com.android.camera2': '/icons/camera.png',
    'com.android.gallery3d': '/icons/gallery.png',
    'com.google.android.apps.messaging': '/icons/messages.png',
    'com.linkedin.android': '/icons/linkedin.png',
    'com.microsoft.office.officehubrow': '/icons/office.png',
    'com.google.android.apps.photos': '/icons/photos.png',
    'com.google.android.contacts': '/icons/contacts.png'
  };
  
  return iconMap[packageName] || 'android';
}

module.exports = router;
