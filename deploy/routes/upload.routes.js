const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dir = path.join(__dirname, '..', 'uploads', String(year), month);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// POST /api/uploads — upload up to 5 files
router.post('/', upload.array('files', MAX_FILES), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const results = req.files.map(file => ({
      file_path: path.relative(uploadsDir, file.path).replace(/\\/g, '/'),
      original_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size
    }));

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// DELETE /api/uploads — delete a file by file_path
router.delete('/', (req, res) => {
  try {
    const { file_path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ success: false, message: 'file_path is required' });
    }

    // Path traversal protection
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullPath = path.resolve(uploadsDir, filePath);
    if (!fullPath.startsWith(path.resolve(uploadsDir))) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Maximum is 5.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

module.exports = router;
