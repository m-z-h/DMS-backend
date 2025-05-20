const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true
  },
  accessLevel: {
    type: String,
    enum: ['read', 'readWrite'],
    default: 'read'
  },
  responseDate: {
    type: Date
  },
  responseMessage: {
    type: String,
    trim: true
  }
});

// Add compound index for uniqueness and efficiency
accessRequestSchema.index({ patientId: 1, doctorId: 1, status: 1 }, { unique: false });

const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema);

module.exports = AccessRequest; 