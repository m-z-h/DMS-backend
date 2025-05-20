const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  hospitalCode: {
    type: String,
    required: true,
    trim: true,
    ref: 'Hospital'
  },
  isActive: {
    type: Boolean,
    default: true
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
departmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department; 