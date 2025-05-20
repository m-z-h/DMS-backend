const mongoose = require('mongoose');

const medicalDocumentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  fileData: {
    type: Buffer,  // Store the actual file content as binary data
    required: true
  },
  documentType: {
    type: String,
    enum: ['Lab Report', 'Prescription', 'Scan Report', 'Insurance', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    default: ''
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

// Create index on patientId for efficient queries
medicalDocumentSchema.index({ patientId: 1 });

// Update lastModifiedAt on save
medicalDocumentSchema.pre('save', function(next) {
  this.lastModifiedAt = Date.now();
  next();
});

module.exports = mongoose.model('MedicalDocument', medicalDocumentSchema); 