const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'OTHER']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['USER', 'PATIENT', 'DOCTOR', 'HOSPITAL', 'DEPARTMENT', 'MEDICAL_RECORD', 'APPOINTMENT', 'FILE', 'SYSTEM']
  },
  entityId: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  }
});

// Create index for efficient queries
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ entityType: 1, timestamp: -1 });
auditSchema.index({ action: 1, timestamp: -1 });

const Audit = mongoose.model('Audit', auditSchema);

module.exports = Audit; 