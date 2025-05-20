const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
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
  departmentCode: {
    type: String,
    required: true
  },
  contactNo: {
    type: String,
    required: true
  },
  licenseNo: {
    type: String,
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: null
  }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor; 