const mongoose = require('mongoose');

const doctorPatientHistorySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  // Additional basic details that should be retained even after access is revoked
  hospitalCode: {
    type: String,
    required: true
  },
  departmentCode: {
    type: String,
    required: true
  },
  // Status flags
  hasActiveAccess: {
    type: Boolean,
    default: false
  },
  accessRevokedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound index for uniqueness and efficiency
doctorPatientHistorySchema.index({ doctorId: 1, patientId: 1 }, { unique: true });

// Update the updatedAt timestamp on save
doctorPatientHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const DoctorPatientHistory = mongoose.model('DoctorPatientHistory', doctorPatientHistorySchema);

module.exports = DoctorPatientHistory; 