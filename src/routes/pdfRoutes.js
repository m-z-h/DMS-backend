const express = require('express');
const { generateCredentialsPDF } = require('../controllers/pdfController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protected routes - require authentication
router.use(protect);

// Generate and download credentials PDF
router.get('/credentials', generateCredentialsPDF);

module.exports = router; 