const express = require('express');
const router = express.Router();

// Mock kullanıcı verisi
const mockUsers = [
  {
    id: 1,
    name: 'Ahmet Yılmaz',
    email: 'ahmet.yilmaz@company.com',
    role: 'employee',
    department: 'IT',
    deviceCount: 1,
    lastLogin: '2024-09-18T10:30:00Z'
  },
  {
    id: 2,
    name: 'Fatma Kaya',
    email: 'fatma.kaya@company.com',
    role: 'employee',
    department: 'HR',
    deviceCount: 1,
    lastLogin: '2024-09-18T09:15:00Z'
  },
  {
    id: 3,
    name: 'Mehmet Demir',
    email: 'mehmet.demir@company.com',
    role: 'manager',
    department: 'Sales',
    deviceCount: 2,
    lastLogin: '2024-09-18T11:45:00Z'
  }
];

// GET /api/users - Tüm kullanıcıları getir
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: mockUsers,
      count: mockUsers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Kullanıcılar alınırken bir hata oluştu'
    });
  }
});

// GET /api/users/:id - Belirli bir kullanıcıyı getir
router.get('/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Kullanıcı alınırken bir hata oluştu'
    });
  }
});

// POST /api/users - Yeni kullanıcı oluştur
router.post('/', (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Ad, email ve rol gereklidir'
      });
    }
    
    const newUser = {
      id: mockUsers.length + 1,
      name,
      email,
      role,
      department: department || 'General',
      deviceCount: 0,
      lastLogin: null
    };
    
    mockUsers.push(newUser);
    
    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Kullanıcı oluşturulurken bir hata oluştu'
    });
  }
});

// PUT /api/users/:id - Kullanıcı bilgilerini güncelle
router.put('/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...req.body,
      id: userId
    };
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: mockUsers[userIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Kullanıcı güncellenirken bir hata oluştu'
    });
  }
});

// DELETE /api/users/:id - Kullanıcıyı sil
router.delete('/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı'
      });
    }
    
    const deletedUser = mockUsers.splice(userIndex, 1)[0];
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
      data: deletedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Kullanıcı silinirken bir hata oluştu'
    });
  }
});

module.exports = router;
