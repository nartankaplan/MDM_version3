const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateToken, requireManagerOrAdmin } = require('../middleware/auth');

// Lazy import to avoid crash if dep missing before install
let ApkReader;
try {
  ApkReader = require('node-apk-parser');
} catch (_) {
  ApkReader = null;
}

const router = express.Router();

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'apks');
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.apk';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = Date.now();
    cb(null, `${base}_${stamp}${ext}`);
  }
});

function apkFileFilter(req, file, cb) {
  if (!file.originalname.toLowerCase().endsWith('.apk')) {
    return cb(new Error('Sadece .apk dosyaları yüklenebilir'));
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter: apkFileFilter, limits: { fileSize: 1024 * 1024 * 200 } }); // 200MB

// POST /api/uploads/apk - APK yükle ve metadata çıkar
router.post('/apk', authenticateToken, requireManagerOrAdmin, upload.single('apk'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'APK dosyası gerekli (field name: apk)' });
    }

    const host = req.headers.host;
    const relativePath = `/uploads/apks/${req.file.filename}`;
    const downloadUrl = `http://${host}${relativePath}`;

    let metadata = {
      name: null,
      packageName: null,
      versionName: null,
      versionCode: null
    };

    if (ApkReader) {
      try {
        // node-apk-parser API: readFile(path) -> ApkReader; then readManifestSync()
        const reader = ApkReader.readFile(req.file.path);
        const manifest = reader.readManifestSync();
        metadata = {
          name: (manifest?.application?.label && String(manifest.application.label)) || null,
          packageName: manifest?.package || null,
          versionName: manifest?.versionName || null,
          versionCode: typeof manifest?.versionCode === 'number' ? manifest.versionCode : (manifest?.versionCode && parseInt(manifest.versionCode, 10)) || null
        };
      } catch (e) {
        // Parsing failed, continue with minimal info
        console.log('APK parsing failed:', e.message);
      }
    }

    return res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        storedName: req.file.filename,
        size: req.file.size,
        downloadUrl,
        relativePath,
        metadata
      }
    });
  } catch (error) {
    console.error('APK upload error:', error);
    return res.status(500).json({ success: false, error: 'APK yüklenemedi: ' + error.message });
  }
});

module.exports = router;


