const mongoose = require('mongoose');

const receptionistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  hospitalCode: {
    type: String,
    required: true
  },
  contactNo: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true // This allows null/undefined values and only enforces uniqueness on non-null values
  },
  address: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
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

// Update the updatedAt field on save
receptionistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Receptionist = mongoose.model('Receptionist', receptionistSchema);

module.exports = Receptionist; 