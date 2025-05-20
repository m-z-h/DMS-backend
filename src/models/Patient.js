const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  contactNo: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  accessCode: {
    type: String,
    required: true,
    unique: true
  },
  oldAccessCode: {
    type: String,
    sparse: true
  },
  profilePhoto: {
    type: String,
    default: null
  }
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient; 