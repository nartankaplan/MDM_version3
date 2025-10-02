const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireDeviceOwnership, requireManagerOrAdmin } = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

// Mock komut geçmişi
let mockCommands = [
  {
    id: 1,
    deviceId: 1,
    action: 'lock',
    status: 'completed',
    createdAt: '2024-09-18T10:30:00Z',
    completedAt: '2024-09-18T10:30:15Z',
    description: 'Cihaz başarıyla kilitlendi'
  },
  {
    id: 2,
    deviceId: 2,
    action: 'locate',
    status: 'completed',
    createdAt: '2024-09-18T09:15:00Z',
    completedAt: '2024-09-18T09:15:30Z',
    description: 'Konum bilgisi alındı'
  },
  {
    id: 3,
    deviceId: 1,
    action: 'security',
    status: 'pending',
    createdAt: '2024-09-18T11:45:00Z',
    completedAt: null,
    description: 'Güvenlik taraması başlatıldı'
  }
];

// GET /api/commands - Tüm komutları getir
router.get('/', (req, res) => {
  try {
    const { deviceId, status } = req.query;
    let filteredCommands = [...mockCommands];
    
    if (deviceId) {
      filteredCommands = filteredCommands.filter(c => c.deviceId === parseInt(deviceId));
    }
    
    if (status) {
      filteredCommands = filteredCommands.filter(c => c.status === status);
    }
    
    res.json({
      success: true,
      data: filteredCommands,
      count: filteredCommands.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Komutlar alınırken bir hata oluştu'
    });
  }
});

// GET /api/commands/:id - Belirli bir komutu getir
router.get('/:id', (req, res) => {
  try {
    const commandId = parseInt(req.params.id);
    const command = mockCommands.find(c => c.id === commandId);
    
    if (!command) {
      return res.status(404).json({
        success: false,
        error: 'Komut bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: command
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Komut alınırken bir hata oluştu'
    });
  }
});

// POST /api/commands - Yeni komut oluştur
router.post('/', (req, res) => {
  try {
    const { deviceId, action, description } = req.body;
    
    if (!deviceId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Cihaz ID ve aksiyon gereklidir'
      });
    }
    
    const newCommand = {
      id: mockCommands.length + 1,
      deviceId: parseInt(deviceId),
      action,
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
      description: description || `${action} komutu gönderildi`
    };
    
    mockCommands.push(newCommand);
    
    // Burada Socket.IO ile cihaza komut gönderilecek
    // io.to(deviceId).emit('executeCommand', newCommand);
    
    res.status(201).json({
      success: true,
      message: 'Komut başarıyla oluşturuldu',
      data: newCommand
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Komut oluşturulurken bir hata oluştu'
    });
  }
});

// PUT /api/commands/:id - Komut durumunu güncelle
router.put('/:id', (req, res) => {
  try {
    const commandId = parseInt(req.params.id);
    const commandIndex = mockCommands.findIndex(c => c.id === commandId);
    
    if (commandIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Komut bulunamadı'
      });
    }
    
    const { status, description } = req.body;
    
    mockCommands[commandIndex] = {
      ...mockCommands[commandIndex],
      status: status || mockCommands[commandIndex].status,
      description: description || mockCommands[commandIndex].description,
      completedAt: status === 'completed' ? new Date().toISOString() : mockCommands[commandIndex].completedAt
    };
    
    res.json({
      success: true,
      message: 'Komut başarıyla güncellendi',
      data: mockCommands[commandIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Komut güncellenirken bir hata oluştu'
    });
  }
});

// GET /api/commands/device/:deviceId - Belirli cihazın komutlarını getir (Device ownership required)
router.get('/device/:deviceId', authenticateToken, requireDeviceOwnership, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    
    const commands = await prisma.command.findMany({
      where: {
        deviceId: deviceId
      },
      include: {
        createdBy: {
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

    // Frontend format'ına dönüştür
    const formattedCommands = commands.map(command => ({
      id: command.id,
      deviceId: command.deviceId,
      action: command.action.toLowerCase(),
      status: command.status.toLowerCase(),
      description: command.description,
      result: command.result,
      errorMessage: command.errorMessage,
      createdAt: command.createdAt,
      executedAt: command.executedAt,
      completedAt: command.completedAt,
      createdBy: command.createdBy.name
    }));
    
    res.json({
      success: true,
      data: formattedCommands,
      count: formattedCommands.length
    });
  } catch (error) {
    console.error('Commands fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Cihaz komutları alınırken bir hata oluştu'
    });
  }
});

module.exports = router;
