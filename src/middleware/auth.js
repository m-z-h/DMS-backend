const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const AccessGrant = require('../models/AccessGrant');
const AccessRequest = require('../models/AccessRequest');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers or cookies
    if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Set token from Bearer token
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Set token from cookie
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

      // Set user to req.user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive or pending approval'
        });
      }
      
      // Set user and additional decoded info to req
      req.user = user;
      req.user.hospitalCode = decoded.hospitalCode || user.hospitalCode;
      req.user.departmentCode = decoded.departmentCode || user.departmentCode;
      
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication',
      error: error.message
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if a doctor has access to a patient's records
exports.checkPatientAccess = async (req, res, next) => {
  try {
    // This middleware should run after protect middleware, so req.user is available
    if (req.user.role !== 'Doctor') {
      return next();
    }

    const { patientId, accessCode } = req.body;

    // If no patient ID provided, return error
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide patient ID'
      });
    }

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Check for existing access grants
    const grant = await AccessGrant.findOne({
      patientId,
      doctorId: doctor._id,
      isActive: true,
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (grant) {
      // If grant exists, attach it to the request
      req.accessGrant = grant;
      return next();
    }

    // If no grant and no access code, check if they're in the same hospital
    if (!accessCode) {
      
      // Check if doctor has previously created records for this patient in their hospital
      const existingRecord = await MedicalRecord.findOne({
        patientId,
        doctorId: doctor._id,
        hospitalCode: req.user.hospitalCode
      });
      
      if (existingRecord) {
        // Allow access to doctors in the same hospital who have treated the patient
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: 'You need an access code to view this patient\'s records'
      });
    }
    
    // Verify access code against patient
    const patient = await Patient.findOne({ 
      _id: patientId,
      accessCode
    });

    if (!patient) {
      return res.status(403).json({
        success: false,
        message: 'Invalid access code for this patient'
      });
    }

    // If access code is valid, create a temporary access grant
    const tempGrant = {
      patientId,
      doctorId: doctor._id,
      accessLevel: 'read',
      accessType: 'temporary',
      grantedBy: 'accessCode'
    };
    
    // Add temp grant to request
    req.accessGrant = tempGrant;
    
    // Create an access request record if it doesn't exist
    const existingRequest = await AccessRequest.findOne({
      patientId,
      doctorId: doctor._id,
      status: 'pending'
    });
    
    if (!existingRequest) {
      await AccessRequest.create({
        patientId: patient._id,
        doctorId: doctor._id,
        message: `Access requested using access code on ${new Date().toISOString().split('T')[0]}`,
        accessLevel: 'read',
        status: 'approved',
        responseMessage: 'Auto-approved via access code',
        responseDate: new Date()
      });
    }

    next();
  } catch (error) {
    console.error('Error checking patient access:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 