const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
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
  hospitalCode: {
    type: String,
    required: true
  },
  departmentCode: {
    type: String,
    required: true
  },
  specialId: {
    type: String,
    index: true,
    sparse: true
  },
  recordType: {
    type: String,
    enum: ['general', 'lab', 'prescription', 'vitals', 'treatment', 'medication'],
    default: 'general'
  },
  diagnosis: {
    type: String,
    required: true
  },
  prescription: {
    type: String
  },
  notes: {
    type: String
  },
  // Enhanced vital signs section
  vitalSigns: {
    temperature: { 
      type: Number,
      min: 30,
      max: 45
    },
    bloodPressure: { 
      systolic: { type: Number },
      diastolic: { type: Number }
    },
    heartRate: { 
      type: Number,
      min: 20,
      max: 250
    },
    respiratoryRate: { 
      type: Number,
      min: 5,
      max: 60
    },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number },
    oxygenSaturation: { type: Number },
    recordedAt: { type: Date, default: Date.now }
  },
  // Enhanced treatment plans section
  treatmentPlan: {
    icdCodes: [{ 
      code: { type: String },
      description: { type: String }
    }],
    carePlan: { type: String },
    procedures: [{ 
      name: { type: String },
      date: { type: Date },
      notes: { type: String }
    }],
    referrals: [{ 
      specialist: { type: String },
      reason: { type: String },
      date: { type: Date }
    }],
    therapyPlans: { type: String }
  },
  // Enhanced lab results section
  labResults: [{
    testName: { type: String },
    testValue: { type: String },
    normalRange: { type: String },
    date: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'reviewed'],
      default: 'completed'
    },
    reportUrl: { type: String },
    comments: { type: String }
  }],
  // Enhanced medication records section
  medications: [{
    name: { type: String },
    dosage: { type: String },
    frequency: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    administrationMethod: { type: String },
    prescribedBy: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    adverseReactions: [{ 
      reaction: { type: String }, 
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      reportedOn: { type: Date }
    }],
    notes: { type: String }
  }],
  // Imaging results
  imaging: [{
    type: { 
      type: String,
      enum: ['xray', 'mri', 'ct', 'ultrasound', 'other']
    },
    bodyPart: { type: String },
    date: { type: Date, default: Date.now },
    findings: { type: String },
    imageUrl: { type: String },
    performedBy: { type: String }
  }],
  // Access permissions
  permissions: {
    patientCanEdit: {
      type: Boolean,
      default: false
    },
    restrictedAccess: {
      type: Boolean,
      default: false
    },
    visibleToPatient: {
      type: Boolean,
      default: true
    },
    specialAccessDoctorIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionDetails: {
    policyId: { type: String },
    encryptionAlgorithm: { type: String }
  }
});

// Update the updatedAt field on save
medicalRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord; 