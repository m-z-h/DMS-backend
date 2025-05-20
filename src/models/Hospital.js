const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
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
  emailDomain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String
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
hospitalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital; 