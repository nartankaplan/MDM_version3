const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/applications/lookup?packageName=... - packageName ile uygulama bul
router.get('/lookup', authenticateToken, async (req, res) => {
  try {
    const { packageName } = req.query;
    if (!packageName || String(packageName).trim().length === 0) {
      return res.status(400).json({ success: false, error: 'packageName gereklidir' });
    }
    const app = await prisma.application.findUnique({ where: { packageName: String(packageName).trim() } });
    if (!app) {
      return res.status(404).json({ success: false, error: 'Uygulama bulunamadı' });
    }
    return res.json({ success: true, data: app });
  } catch (error) {
    console.error('Application lookup error:', error);
    return res.status(500).json({ success: false, error: 'Uygulama arama başarısız' });
  }
});

// POST /api/applications - Yeni uygulama oluştur
router.post('/', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { name, packageName, version, versionCode, downloadUrl, iconUrl, description, category } = req.body;

    if (!name || !packageName) {
      return res.status(400).json({
        success: false,
        error: 'İsim ve package alanları zorunludur'
      });
    }

    // Unique packageName kontrolü - idempotent davran
    const existing = await prisma.application.findUnique({ where: { packageName } });
    if (existing) {
      // Eğer metadata gönderildiyse mevcut kaydı güncelle
      const shouldUpdate = (version && String(version).trim().length > 0) || req.body.versionCode !== undefined || req.body.downloadUrl !== undefined || req.body.iconUrl !== undefined || req.body.description !== undefined || req.body.category !== undefined;
      const updated = shouldUpdate
        ? await prisma.application.update({
            where: { id: existing.id },
            data: {
              ...(version && String(version).trim().length > 0 ? { version: String(version).trim() } : {}),
              ...(req.body.versionCode !== undefined ? { versionCode: Number(req.body.versionCode) } : {}),
              ...(req.body.downloadUrl !== undefined ? { downloadUrl: String(req.body.downloadUrl).trim() } : {}),
              ...(req.body.iconUrl !== undefined ? { iconUrl: String(req.body.iconUrl).trim() } : {}),
              ...(req.body.description !== undefined ? { description: String(req.body.description).trim() } : {}),
              ...(req.body.category !== undefined ? { category: String(req.body.category).trim() } : {})
            }
          })
        : existing;

      return res.status(200).json({
        success: true,
        message: 'Uygulama zaten mevcut, mevcut kayıt döndürüldü',
        data: updated
      });
    }

    const app = await prisma.application.create({
      data: {
        name,
        packageName,
        version: version && String(version).trim().length > 0 ? String(version).trim() : null,
        versionCode: versionCode ? Number(versionCode) : null,
        downloadUrl: downloadUrl || null,
        iconUrl: iconUrl || null,
        description: description || null,
        category: category || null,
        isSystemApp: false,
        isRequired: false
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Uygulama başarıyla oluşturuldu',
      data: app
    });
  } catch (error) {
    console.error('Application create error:', error);
    return res.status(500).json({
      success: false,
      error: 'Uygulama oluşturulurken bir hata oluştu'
    });
  }
});

module.exports = router;
 
// PUT /api/applications/:id - Uygulama güncelle (isim / packageName)
router.put('/:id', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { name, packageName } = req.body;

    if (!appId || isNaN(appId)) {
      return res.status(400).json({ success: false, error: 'Geçersiz uygulama ID' });
    }
    if (!name && !packageName) {
      return res.status(400).json({ success: false, error: 'Güncellenecek alan belirtilmedi' });
    }

    // Eğer packageName güncelleniyorsa uniq kontrolü
    if (packageName && String(packageName).trim().length > 0) {
      const existing = await prisma.application.findUnique({ where: { packageName: String(packageName).trim() } });
      if (existing && existing.id !== appId) {
        return res.status(400).json({ success: false, error: 'Bu package adına sahip başka bir uygulama mevcut' });
      }
    }

    const updated = await prisma.application.update({
      where: { id: appId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(packageName !== undefined ? { packageName: String(packageName).trim() } : {})
      }
    });

    return res.json({ success: true, message: 'Uygulama güncellendi', data: updated });
  } catch (error) {
    console.error('Application update error:', error);
    return res.status(500).json({ success: false, error: 'Uygulama güncellenemedi' });
  }
});


