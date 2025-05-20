const mongoose = require('mongoose');

const accessGrantSchema = new mongoose.Schema({
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
  grantedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry is 30 days from now
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  accessLevel: {
    type: String,
    enum: ['read', 'readWrite'],
    default: 'read'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Add compound index for uniqueness and efficiency
accessGrantSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

const AccessGrant = mongoose.model('AccessGrant', accessGrantSchema);

module.exports = AccessGrant; 