const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET theme settings
router.get('/theme', authenticateToken, async (req, res) => {
  try {
    const bg = await prisma.systemSetting.findUnique({ where: { key: 'theme_background_color' } });
    const text = await prisma.systemSetting.findUnique({ where: { key: 'theme_text_color' } });
    const img = await prisma.systemSetting.findUnique({ where: { key: 'theme_background_image' } });
    const mode = await prisma.systemSetting.findUnique({ where: { key: 'theme_background_mode' } });
    res.json({
      success: true,
      data: {
        backgroundColor: bg?.value || '#000000',
        textColor: text?.value || '#ffffff',
        backgroundImageUrl: img?.value || '',
        mode: mode?.value || 'color'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load theme settings' });
  }
});

// PUT theme settings
router.put('/theme', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { backgroundColor, textColor, backgroundImageDataUrl, clearBackgroundImage, mode } = req.body;
    if (!backgroundColor || !textColor) {
      return res.status(400).json({ success: false, error: 'backgroundColor and textColor are required' });
    }
    const normalizedMode = (mode === 'image' || mode === 'color') ? mode : 'color';

    await prisma.systemSetting.upsert({
      where: { key: 'theme_background_color' },
      update: { value: backgroundColor },
      create: { key: 'theme_background_color', value: backgroundColor, category: 'theme', isPublic: true }
    });
    await prisma.systemSetting.upsert({
      where: { key: 'theme_text_color' },
      update: { value: textColor },
      create: { key: 'theme_text_color', value: textColor, category: 'theme', isPublic: true }
    });
    await prisma.systemSetting.upsert({
      where: { key: 'theme_background_mode' },
      update: { value: normalizedMode },
      create: { key: 'theme_background_mode', value: normalizedMode, category: 'theme', isPublic: true }
    });

    // Handle background image upload/clear based on mode
    if (clearBackgroundImage || normalizedMode === 'color') {
      await prisma.systemSetting.deleteMany({ where: { key: 'theme_background_image' } });
    } else if (backgroundImageDataUrl) {
      const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(backgroundImageDataUrl);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Invalid image data URL' });
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `theme-background.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/${filename}`;
      await prisma.systemSetting.upsert({
        where: { key: 'theme_background_image' },
        update: { value: publicUrl },
        create: { key: 'theme_background_image', value: publicUrl, category: 'theme', isPublic: true }
      });
    }
    res.json({ success: true, message: 'Theme settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update theme settings' });
  }
});

module.exports = router;


