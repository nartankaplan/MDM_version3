const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();


// POST /api/enrollment/validate - Cihaz ID doğrulama
router.post('/validate', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Cihaz ID gerekli'
      });
    }

    // Cihazın var olup olmadığını kontrol et
    const device = await prisma.device.findUnique({
      where: { id: parseInt(deviceId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Geçersiz cihaz ID'
      });
    }

    // Cihaz zaten kayıtlı mı kontrol et
    if (device.isEnrolled) {
      return res.status(400).json({
        success: false,
        error: 'Bu cihaz zaten kayıtlı'
      });
    }

    res.json({
      success: true,
      data: {
        deviceId: device.id,
        deviceName: device.name,
        owner: device.user ? device.user.name : 'Atanmamış'
      },
      message: 'Cihaz ID geçerli ve kayıt için hazır'
    });

  } catch (error) {
    console.error('Error validating device ID:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz ID doğrulanırken hata oluştu'
    });
  }
});

// POST /api/enrollment/connect - Cihaz ID ile bağlantı kurma
router.post('/connect', async (req, res) => {
  try {
    const { deviceId, deviceInfo, userId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Cihaz ID gerekli'
      });
    }

    // Cihazın var olup olmadığını kontrol et
    const device = await prisma.device.findUnique({
      where: { id: parseInt(deviceId) }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Geçersiz cihaz ID. Web panelinden cihaz oluşturun.'
      });
    }

    // Cihaz zaten kayıtlı mı kontrol et
    if (device.isEnrolled) {
      return res.status(400).json({
        success: false,
        error: 'Bu cihaz zaten kayıtlı'
      });
    }

    // Eğer userId varsa, kullanıcının var olup olmadığını kontrol et
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) }
      });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Geçersiz kullanıcı ID'
        });
      }
    }

    // Cihaz bilgilerini güncelle ve kayıt durumunu aktif et
    const updatedDevice = await prisma.device.update({
      where: { id: parseInt(deviceId) },
      data: {
        isEnrolled: true,
        enrollmentDate: new Date(),
        status: 'ONLINE',
        lastSeen: new Date(),
        // Headwind MDM için deviceId'yi ayarla
        deviceId: deviceId.toString(),
        project: 'default-project',
        // Eğer userId varsa cihazı o kullanıcıya ata
        ...(userId && { userId: parseInt(userId) }),
        // Eğer deviceInfo gelirse güncelle
        ...(deviceInfo && {
          name: deviceInfo.name || device.name,
          model: deviceInfo.model || device.model,
          brand: deviceInfo.brand || device.brand,
          osVersion: deviceInfo.osVersion || device.osVersion,
          imei: deviceInfo.imei || device.imei,
          phoneNumber: deviceInfo.phoneNumber || device.phoneNumber,
          macAddress: deviceInfo.macAddress || device.macAddress,
          serialNumber: deviceInfo.serialNumber || device.serialNumber,
          // Headwind MDM specific fields
          cpu: deviceInfo.cpu || null,
          iccid: deviceInfo.iccid || null,
          imsi: deviceInfo.imsi || null,
          mdmMode: deviceInfo.mdmMode || false,
          kioskMode: deviceInfo.kioskMode || false,
          launcherType: deviceInfo.launcherType || null,
          launcherPackage: deviceInfo.launcherPackage || null,
          defaultLauncher: deviceInfo.defaultLauncher || false
        })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Enrollment event oluştur
    await prisma.deviceEvent.create({
      data: {
        deviceId: updatedDevice.id,
        eventType: 'DEVICE_ENROLLED',
        title: 'Cihaz Kaydı',
        description: `Cihaz ID ${deviceId} ile başarıyla kaydedildi`,
        severity: 'INFO'
      }
    });

    res.json({
      success: true,
      data: {
        device: updatedDevice,
        message: 'Cihaz başarıyla kaydedildi'
      }
    });

  } catch (error) {
    console.error('Device enrollment error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz kaydı sırasında hata oluştu'
    });
  }
});

// POST /api/enrollment/validate - Cihaz ID doğrulama
router.post('/validate', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Cihaz ID gerekli'
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: parseInt(deviceId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Geçersiz cihaz ID'
      });
    }

    if (device.isEnrolled) {
      return res.status(400).json({
        success: false,
        error: 'Bu cihaz zaten kayıtlı'
      });
    }

    res.json({
      success: true,
      data: {
        deviceId: device.id,
        deviceName: device.name,
        owner: device.user.name,
        message: 'Cihaz ID geçerli ve kayıt için hazır'
      }
    });

  } catch (error) {
    console.error('Device validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz doğrulanırken hata oluştu'
    });
  }
});

// GET /api/enrollment/devices - Kayıt için hazır cihazları listele
router.get('/devices', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: {
        isEnrolled: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: devices
    });

  } catch (error) {
    console.error('Available devices fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihazlar yüklenirken hata oluştu'
    });
  }
});

// POST /api/enrollment/disconnect - Cihaz bağlantısını kesme
router.post('/disconnect', async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Cihaz ID gerekli'
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: parseInt(deviceId) }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Cihaz bulunamadı'
      });
    }

    if (!device.isEnrolled) {
      return res.status(400).json({
        success: false,
        error: 'Bu cihaz zaten kayıtlı değil'
      });
    }

    // Cihazı kayıtsız duruma getir
    await prisma.device.update({
      where: { id: parseInt(deviceId) },
      data: {
        isEnrolled: false,
        enrollmentDate: null,
        status: 'OFFLINE',
        lastSeen: null
      }
    });

    // Disconnect event oluştur
    await prisma.deviceEvent.create({
      data: {
        deviceId: device.id,
        eventType: 'DEVICE_UNENROLLED',
        title: 'Cihaz Kaydı Kaldırıldı',
        description: `Cihaz ID ${deviceId} kaydı kaldırıldı`,
        severity: 'INFO'
      }
    });

    res.json({
      success: true,
      message: 'Cihaz bağlantısı başarıyla kesildi'
    });

  } catch (error) {
    console.error('Device disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz bağlantısı kesilirken hata oluştu'
    });
  }
});

// GET /api/enrollment/devices - Kayıt için hazır cihazları listele
router.get('/devices', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: {
        isEnrolled: false
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: devices,
      count: devices.length
    });

  } catch (error) {
    console.error('Error fetching available devices:', error);
    res.status(500).json({
      success: false,
      error: 'Cihazlar yüklenirken hata oluştu'
    });
  }
});

module.exports = router;