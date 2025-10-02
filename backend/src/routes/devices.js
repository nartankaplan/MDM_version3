const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireDeviceOwnership, requireManagerOrAdmin } = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

// Mock data - artık database'den alıyoruz
const mockDevicesOld = [
  {
    id: 1,
    name: "Samsung Galaxy S23",
    model: "SM-S911B",
    osVersion: "Android 14",
    status: "online",
    lastSeen: "2 dakika önce",
    battery: 85,
    location: "İstanbul, TR",
    imei: "354123456789012",
    phoneNumber: "+90 555 123 4567",
    employee: "Ahmet Yılmaz"
  },
  {
    id: 2,
    name: "Google Pixel 7",
    model: "GVU6C",
    osVersion: "Android 14",
    status: "offline",
    lastSeen: "1 saat önce",
    battery: 42,
    location: "Ankara, TR",
    imei: "354987654321098",
    phoneNumber: "+90 555 987 6543",
    employee: "Fatma Kaya"
  },
  {
    id: 3,
    name: "Xiaomi 13",
    model: "2210132C",
    osVersion: "Android 13",
    status: "online",
    lastSeen: "Şimdi",
    battery: 67,
    location: "İzmir, TR",
    imei: "354456789012345",
    phoneNumber: "+90 555 456 7890",
    employee: "Mehmet Demir"
  },
  {
    id: 4,
    name: "OnePlus 11",
    model: "CPH2449",
    osVersion: "Android 14",
    status: "warning",
    lastSeen: "30 dakika önce",
    battery: 15,
    location: "Bursa, TR",
    imei: "354789012345678",
    phoneNumber: "+90 555 789 0123",
    employee: "Ayşe Özkan"
  },
  {
    id: 5,
    name: "Huawei P50 Pro",
    model: "JAD-L29",
    osVersion: "Android 12",
    status: "online",
    lastSeen: "5 dakika önce",
    battery: 78,
    location: "Adana, TR",
    imei: "354112233445566",
    phoneNumber: "+90 555 112 2334",
    employee: "Can Yılmaz"
  },
  {
    id: 6,
    name: "OPPO Find X5",
    model: "CPH2305",
    osVersion: "Android 13",
    status: "online",
    lastSeen: "1 dakika önce",
    battery: 92,
    location: "Gaziantep, TR",
    imei: "354998877665544",
    phoneNumber: "+90 555 998 8776",
    employee: "Zeynep Kara"
  },
  {
    id: 7,
    name: "Realme GT 2 Pro",
    model: "RMX3301",
    osVersion: "Android 13",
    status: "offline",
    lastSeen: "2 saat önce",
    battery: 34,
    location: "Konya, TR",
    imei: "354667788990011",
    phoneNumber: "+90 555 667 7889",
    employee: "Burak Öztürk"
  },
  {
    id: 8,
    name: "Vivo X80 Pro",
    model: "V2186A",
    osVersion: "Android 12",
    status: "online",
    lastSeen: "Şimdi",
    battery: 56,
    location: "Mersin, TR",
    imei: "354334455667788",
    phoneNumber: "+90 555 334 4556",
    employee: "Selin Aydın"
  }
];

// GET /api/devices - Tüm cihazları getir (Authentication required)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching devices from database...');
    
    // Role-based device filtering
    let whereClause = {};
    if (req.user.role === 'USER') {
      // Normal users can only see their own devices
      whereClause.userId = req.user.id;
    } else if (req.user.role === 'MANAGER') {
      // Managers can see devices in their department
      whereClause.user = {
        department: req.user.department
      };
    }
    // Admins can see all devices (no where clause)

    const devices = await prisma.device.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        _count: {
          select: {
            commands: true,
            events: true
          }
        }
      },
      orderBy: {
        lastSeen: 'desc'
      }
    });

    console.log('📱 Found', devices.length, 'devices');

    // Frontend format'ına dönüştür
    const formattedDevices = devices.map(device => ({
      id: device.id,
      name: device.name,
      model: device.model,
      brand: device.brand,
      osVersion: device.osVersion,
      status: device.status.toLowerCase(),
      battery: device.battery,
      location: device.location,
      imei: device.imei,
      phoneNumber: device.phoneNumber,
      employee: device.custom1 || (device.user ? device.user.name : null),
      lastSeen: device.lastSeen ? formatLastSeen(device.lastSeen) : 'Hiç görülmedi',
      isEnrolled: device.isEnrolled,
      kioskMode: device.kioskMode,
      commandCount: device._count.commands,
      eventCount: device._count.events
    }));

    console.log('✅ Sending', formattedDevices.length, 'formatted devices');

    res.json({
      success: true,
      data: formattedDevices,
      count: formattedDevices.length
    });
  } catch (error) {
    console.error('Devices fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihazlar alınırken bir hata oluştu'
    });
  }
});

// POST /api/devices - Yeni cihaz oluştur (Manager/Admin only)
router.post('/', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const {
      name,
      model,
      brand,
      osVersion,
      imei,
      phoneNumber,
      macAddress,
      serialNumber,
      userId,
      userName
    } = req.body;

    // Required fields validation
    if (!name || !model || !osVersion || !imei) {
      return res.status(400).json({
        success: false,
        error: 'Ad, model, OS sürümü ve IMEI alanları zorunludur'
      });
    }

    // Check if IMEI already exists
    const existingDevice = await prisma.device.findUnique({
      where: { imei }
    });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        error: 'Bu IMEI numarası zaten kullanılıyor'
      });
    }

    // Determine user assignment
    let assignedUserId = userId;

    // If userName provided, try resolve by name (case-insensitive)
    if (!assignedUserId && userName && typeof userName === 'string') {
      const trimmedName = userName.trim();
      if (trimmedName.length > 0) {
        const resolved = await prisma.user.findFirst({
          where: {
            // SQLite does not support case-insensitive mode flag; use exact match
            name: trimmedName
          },
          select: { id: true }
        });
        if (resolved) {
          assignedUserId = resolved.id;
        }
      }
    }

    if (!assignedUserId) {
      // If no user specified, assign to current user
      assignedUserId = req.user.id;
    } else {
      // Verify the user exists
      const user = await prisma.user.findUnique({
        where: { id: parseInt(assignedUserId) }
      });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Belirtilen kullanıcı bulunamadı'
        });
      }
    }

    // Create device
    const device = await prisma.device.create({
      data: {
        name,
        model,
        brand: brand || null,
        osVersion,
        imei,
        phoneNumber: phoneNumber || null,
        macAddress: macAddress || null,
        serialNumber: serialNumber || null,
        userId: assignedUserId,
        status: 'OFFLINE',
        isEnrolled: false,
        custom1: userName ? userName.trim() : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Assign default applications to the new device
    try {
      const defaultAppConfigs = [
        { packageName: 'com.whatsapp', isInstalled: true },
        { packageName: 'org.telegram.messenger', isInstalled: true },
        { packageName: 'com.google.android.apps.maps', isInstalled: true },
        { packageName: 'com.waze', isInstalled: false },
        { packageName: 'com.netflix.mediaclient', isInstalled: false },
        { packageName: 'com.spotify.music', isInstalled: false },
        { packageName: 'com.twitter.android', isInstalled: false },
        { packageName: 'com.microsoft.teams', isInstalled: true },
        { packageName: 'com.facebook.katana', isInstalled: false },
        { packageName: 'com.linkedin.android', isInstalled: true },
        { packageName: 'org.mozilla.firefox', isInstalled: false },
        { packageName: 'com.google.android.keep', isInstalled: true },
        { packageName: 'com.zhiliaoapp.musically', isInstalled: false },
        { packageName: 'com.google.android.apps.messaging', isInstalled: true },
        { packageName: 'com.discord', isInstalled: false },
        { packageName: 'com.Slack', isInstalled: false },
        { packageName: 'com.android.chrome', isInstalled: true },
        { packageName: 'com.google.android.youtube', isInstalled: false },
        { packageName: 'com.microsoft.office.officehubrow', isInstalled: true },
        { packageName: 'com.snapchat.android', isInstalled: false },
        { packageName: 'com.instagram.android', isInstalled: false },
        { packageName: 'tv.twitch.android.app', isInstalled: false },
        { packageName: 'com.microsoft.emmx', isInstalled: false },
        { packageName: 'us.zoom.videomeetings', isInstalled: true },
        { packageName: 'com.google.android.gm', isInstalled: true }
      ];

      // Fetch applications by package names
      const apps = await prisma.application.findMany({
        where: { packageName: { in: defaultAppConfigs.map(a => a.packageName) } },
        select: { id: true, packageName: true, version: true }
      });

      const packageToApp = new Map(apps.map(a => [a.packageName, a]));

      // Create device applications
      await Promise.all(
        defaultAppConfigs
          .filter(cfg => packageToApp.has(cfg.packageName))
          .map(cfg => {
            const app = packageToApp.get(cfg.packageName);
            return prisma.deviceApplication.create({
              data: {
                deviceId: device.id,
                applicationId: app.id,
                isInstalled: cfg.isInstalled,
                installedAt: cfg.isInstalled ? new Date() : null,
                version: cfg.isInstalled ? app.version : null
              }
            });
          })
      );
    } catch (assignErr) {
      // Do not fail device creation if app assignment fails
      console.error('Default app assignment failed for device', device.id, assignErr);
    }

    // Create device creation event
    await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        eventType: 'STATUS_CHANGE',
        title: 'Cihaz Oluşturuldu',
        description: `Yeni cihaz "${name}" oluşturuldu`,
        severity: 'INFO'
      }
    });

    res.status(201).json({
      success: true,
      data: device,
      message: 'Cihaz başarıyla oluşturuldu'
    });

  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz oluşturulurken hata oluştu'
    });
  }
});

// Helper function to format last seen time
function formatLastSeen(lastSeen) {
  const now = new Date();
  const diffMs = now - new Date(lastSeen);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Şimdi';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  return `${diffDays} gün önce`;
}

// GET /api/devices/:id - Belirli bir cihazı getir
router.get('/:id', (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const device = mockDevices.find(d => d.id === deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cihaz alınırken bir hata oluştu'
    });
  }
});

// POST /api/devices/:id/commands - Cihaza komut gönder (Device ownership required)
router.post('/:id/commands', authenticateToken, requireDeviceOwnership, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const { action, parameters } = req.body;
    
    // Cihazın var olup olmadığını kontrol et
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }
    
  // Komut tipini validate et
    const validActions = ['lock', 'unlock', 'wipe', 'locate', 'restart', 'alert', 'install_app', 'uninstall_app', 'kiosk_on', 'kiosk_off'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz komut tipi'
      });
    }

    // Command enum'a dönüştür
    const commandTypeMap = {
      'lock': 'LOCK',
      'unlock': 'UNLOCK', 
      'wipe': 'WIPE',
      'locate': 'LOCATE',
      'restart': 'RESTART',
      'alert': 'ALARM',
      'install_app': 'INSTALL_APP',
      'uninstall_app': 'UNINSTALL_APP',
      'kiosk_on': 'SET_POLICY',
      'kiosk_off': 'SET_POLICY'
    };

    // Database'e komut ekle
    const command = await prisma.command.create({
      data: {
        action: commandTypeMap[action],
        status: 'PENDING',
        description: `${action} komutu gönderildi`,
        // Store parameters for ALARM and other commands
        parameters: parameters ? JSON.stringify(parameters) : (action.startsWith('kiosk_') ? JSON.stringify({ kioskEnabled: action === 'kiosk_on' }) : null),
        deviceId: deviceId,
        createdById: req.user.id // Gerçek kullanıcı ID'si
      }
    });
    
    // Burada MDM komutları işlenecek
    console.log(`Cihaz ${deviceId} için ${action} komutu gönderiliyor...`);

    // Kiosk modunu backend state'inde de güncelle (hemen yansıtmak için)
    if (action === 'kiosk_on' || action === 'kiosk_off') {
      const enable = action === 'kiosk_on';
      try {
        await prisma.device.update({
          where: { id: deviceId },
          data: { kioskMode: enable }
        });
        await prisma.deviceEvent.create({
          data: {
            deviceId: deviceId,
            eventType: 'STATUS_CHANGE',
            title: 'Kiosk Modu',
            description: `Kiosk modu ${enable ? 'açıldı' : 'kapandı'}`,
            severity: enable ? 'INFO' : 'INFO'
          }
        });
      } catch (e) {
        console.error('Kiosk mode update error:', e);
      }
    }
    
    res.json({
      success: true,
      message: `${action} komutu başarıyla gönderildi`,
      data: {
        commandId: command.id,
        deviceId,
        action,
        status: command.status,
        parameters: command.parameters ? JSON.parse(command.parameters) : null,
        timestamp: command.createdAt
      }
    });
  } catch (error) {
    console.error('Command creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Komut gönderilirken bir hata oluştu'
    });
  }
});

// PUT /api/devices/:id - Cihaz bilgilerini güncelle
router.put('/:id', (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    
    if (deviceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }
    
    // Cihaz bilgilerini güncelle
    mockDevices[deviceIndex] = {
      ...mockDevices[deviceIndex],
      ...req.body,
      id: deviceId // ID'nin değişmemesini sağla
    };
    
    res.json({
      success: true,
      message: 'Cihaz başarıyla güncellendi',
      data: mockDevices[deviceIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Cihaz güncellenirken bir hata oluştu'
    });
  }
});

// GET /api/devices/:id/apps - Cihazdaki uygulamaları listele
router.get('/:id/apps', authenticateToken, requireDeviceOwnership, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    // Cihazın var olup olmadığını kontrol et
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }

    // Cihazdaki uygulamaları al
    const deviceApps = await prisma.deviceApplication.findMany({
      where: { deviceId: deviceId },
      include: {
        application: {
          select: {
            id: true,
            name: true,
            packageName: true,
            version: true,
            category: true,
            description: true,
            iconUrl: true,
            isSystemApp: true,
            isRequired: true
          }
        }
      }
    });

    // Frontend format'ına dönüştür
    const formattedApps = deviceApps.map(deviceApp => ({
      id: deviceApp.application.id,
      name: deviceApp.application.name,
      packageName: deviceApp.application.packageName,
      version: deviceApp.version || deviceApp.application.version,
      category: deviceApp.application.category,
      description: deviceApp.application.description,
      iconUrl: deviceApp.application.iconUrl,
      isSystemApp: deviceApp.application.isSystemApp,
      isRequired: deviceApp.application.isRequired,
      isInstalled: deviceApp.isInstalled,
      installedAt: deviceApp.installedAt
    }));

    res.json({
      success: true,
      data: formattedApps,
      count: formattedApps.length
    });

  } catch (error) {
    console.error('Device apps fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz uygulamaları alınırken bir hata oluştu'
    });
  }
});

// POST /api/devices/:id/apps/:appId/toggle - Uygulama durumunu değiştir
router.post('/:id/apps/:appId/toggle', authenticateToken, requireDeviceOwnership, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const appId = parseInt(req.params.appId);
    const { isInstalled } = req.body;

    // Cihazın var olup olmadığını kontrol et
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }

    // Uygulamanın var olup olmadığını kontrol et
    const application = await prisma.application.findUnique({
      where: { id: appId }
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Uygulama bulunamadı'
      });
    }

    // DeviceApplication kaydını bul veya oluştur
    let deviceApp = await prisma.deviceApplication.findUnique({
      where: {
        deviceId_applicationId: {
          deviceId: deviceId,
          applicationId: appId
        }
      }
    });

    if (deviceApp) {
      // Mevcut kaydı güncelle
      deviceApp = await prisma.deviceApplication.update({
        where: {
          deviceId_applicationId: {
            deviceId: deviceId,
            applicationId: appId
          }
        },
        data: {
          isInstalled: isInstalled,
          installedAt: isInstalled ? new Date() : null
        },
        include: {
          application: true
        }
      });
    } else {
      // Yeni kayıt oluştur
      deviceApp = await prisma.deviceApplication.create({
        data: {
          deviceId: deviceId,
          applicationId: appId,
          isInstalled: isInstalled,
          installedAt: isInstalled ? new Date() : null
        },
        include: {
          application: true
        }
      });
    }

    // Komut oluştur
    const commandAction = isInstalled ? 'INSTALL_APP' : 'UNINSTALL_APP';
    const command = await prisma.command.create({
      data: {
        action: commandAction,
        status: 'PENDING',
        description: `${application.name} uygulaması ${isInstalled ? 'kuruldu' : 'kaldırıldı'}`,
        parameters: JSON.stringify({
          appId: appId,
          packageName: application.packageName,
          appName: application.name
        }),
        deviceId: deviceId,
        createdById: req.user.id
      }
    });

    // Event log oluştur
    await prisma.deviceEvent.create({
      data: {
        deviceId: deviceId,
        eventType: isInstalled ? 'APP_INSTALLED' : 'APP_UNINSTALLED',
        title: `Uygulama ${isInstalled ? 'Kuruldu' : 'Kaldırıldı'}`,
        description: `${application.name} uygulaması ${isInstalled ? 'cihaza kuruldu' : 'cihazdan kaldırıldı'}`,
        severity: 'INFO',
        metadata: JSON.stringify({
          appId: appId,
          packageName: application.packageName,
          appName: application.name,
          commandId: command.id
        })
      }
    });

    res.json({
      success: true,
      message: `Uygulama ${isInstalled ? 'kuruldu' : 'kaldırıldı'}`,
      data: {
        appId: appId,
        appName: application.name,
        packageName: application.packageName,
        isInstalled: isInstalled,
        commandId: command.id
      }
    });

  } catch (error) {
    console.error('App toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Uygulama durumu değiştirilirken bir hata oluştu'
    });
  }
});

// Cihaz silme endpoint'i
router.delete('/:id', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    if (isNaN(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz cihaz ID'
      });
    }

    // Cihazın var olup olmadığını kontrol et
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }

    // Cihazı silmeden önce ilişkili verileri temizle
    await prisma.$transaction(async (tx) => {
      // İlişkili komutları sil
      await tx.command.deleteMany({
        where: { deviceId: deviceId }
      });

      // İlişkili uygulamaları sil
      await tx.deviceApplication.deleteMany({
        where: { deviceId: deviceId }
      });

      // İlişkili politikaları sil
      await tx.devicePolicy.deleteMany({
        where: { deviceId: deviceId }
      });

      // İlişkili eventleri sil
      await tx.deviceEvent.deleteMany({
        where: { deviceId: deviceId }
      });

      // Cihazı sil
      await tx.device.delete({
        where: { id: deviceId }
      });
    });

    console.log(`✅ Device deleted: ${device.name} (ID: ${deviceId})`);

    res.json({
      success: true,
      message: `Cihaz "${device.name}" başarıyla silindi`,
      data: {
        deviceId: deviceId,
        deviceName: device.name
      }
    });

  } catch (error) {
    console.error('Device deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz silinirken bir hata oluştu'
    });
  }
});

module.exports = router;
