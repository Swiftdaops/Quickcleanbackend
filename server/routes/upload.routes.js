const express = require('express');
const multer = require('multer');
const { uploadBufferUnsigned } = require('../config/cloudinary');

const router = express.Router();

// Multer in-memory storage; we will stream to Cloudinary manually
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpe?g|png|webp)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// POST /api/upload  — form-data key="file"
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await uploadBufferUnsigned(req.file.buffer, req.file.originalname);
    return res.status(201).json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

module.exports = router;
