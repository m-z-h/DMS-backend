const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadFile, getPatientFiles, deleteFile, updateDocument, getFileById } = require('../controllers/fileController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File filter to only accept certain file types
const fileFilter = (req, file, cb) => {
  // Accept pdf, jpg, jpeg, and png files
  if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

// Use memory storage instead of disk storage for database storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: fileFilter
});

// Medical document routes for patients
router.post('/upload', protect, authorize('Patient'), upload.single('file'), uploadFile);
router.get('/my-documents', protect, authorize('Patient'), getPatientFiles);
router.get('/document/:documentId', protect, getFileById);
router.put('/document/:documentId', protect, authorize('Patient'), updateDocument);
router.delete('/document/:documentId', protect, authorize('Patient'), deleteFile);

module.exports = router; 