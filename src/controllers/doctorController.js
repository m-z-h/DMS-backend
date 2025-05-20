const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const AccessGrant = require('../models/AccessGrant');
const AccessRequest = require('../models/AccessRequest');
const ABEEncryption = require('../utils/abeEncryption');
const DoctorPatientHistory = require('../models/DoctorPatientHistory');

// Helper function to create AccessGrant model
const createAccessGrantModel = () => {
  return require('../models/AccessGrant');
};

// Get doctor profile information
exports.getProfile = async (req, res) => {
  try {
    // Get doctor details from user ID
    const doctor = await Doctor.findOne({ userId: req.user.id }).populate('userId', 'username email');
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Error getting doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update doctor profile information
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, specialization, contactNo, hospitalCode, departmentCode, profilePhoto } = req.body;

    // Get doctor details from user ID
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Update fields if provided
    if (fullName) doctor.fullName = fullName;
    if (specialization !== undefined) doctor.specialization = specialization;
    if (contactNo) doctor.contactNo = contactNo;
    
    // Update hospital and department codes in both Doctor model and User model
    if (hospitalCode) {
      doctor.hospitalCode = hospitalCode;
      await User.findByIdAndUpdate(req.user.id, { hospitalCode });
    }
    if (departmentCode) {
      doctor.departmentCode = departmentCode;
      await User.findByIdAndUpdate(req.user.id, { departmentCode });
    }
    
    // Handle profile photo update
    if (profilePhoto !== undefined) {
      doctor.profilePhoto = profilePhoto;
    }
    
    await doctor.save();
    
    // Return updated doctor info
    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all patients under the doctor
exports.getMyPatients = async (req, res) => {
  try {
    // Get doctor details from user ID
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Get active access grants for this doctor
    const AccessGrant = createAccessGrantModel();
    const activeGrants = await AccessGrant.find({
      doctorId: doctor._id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    // Extract unique patient IDs from active grants
    const patientIds = [...new Set(activeGrants.map(grant => grant.patientId))];
    
    if (patientIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Get patient details
    const patients = await Patient.find({
      _id: { $in: patientIds }
    }).populate('userId', 'username email');

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all medical records for a specific patient
exports.getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Check if doctor has access to this patient
    const accessInfo = await checkPatientAccess(doctor._id, patientId);
    
    if (!accessInfo.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this patient\'s records'
      });
    }
    
    // Find all records for this patient created by this doctor
    const records = await MedicalRecord.find({ 
      patientId,
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode
    }).sort({ createdAt: -1 });

    // Decrypt any encrypted records
    const decryptedRecords = records.map(record => {
      const recordObj = record.toObject();
      
      if (recordObj.isEncrypted) {
        try {
          // User attributes from the doctor's profile
          const userAttributes = {
            hospital: req.user.hospitalCode,
            department: req.user.departmentCode
          };
          
          // Attempt to decrypt
          const decryptedData = ABEEncryption.decrypt(recordObj, userAttributes);
          if (decryptedData) {
            return { ...recordObj, ...decryptedData, isDecrypted: true };
          }
        } catch (err) {
          console.error('Decryption error:', err);
        }
      }
      
      return recordObj;
    });

    res.status(200).json({
      success: true,
      count: decryptedRecords.length,
      data: decryptedRecords
    });
  } catch (error) {
    console.error('Error getting patient records:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    const { 
      patientId, 
      recordType, 
      diagnosis, 
      prescription,
      notes,
      vitalSigns,
      labResults,
      treatmentPlan,
      medications,
      imaging,
      permissions,
      shouldEncrypt = false
    } = req.body;

    console.log('Creating medical record for patient:', patientId);

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      console.log('Patient not found');
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      console.log('Doctor profile not found');
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }
    console.log('Doctor found:', doctor._id);

    // Check if doctor has access to this patient
    const accessInfo = await checkPatientAccess(doctor._id, patientId);
    
    if (!accessInfo.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to create records for this patient'
      });
    }

    // Check if doctor has write access to create records
    if (accessInfo.accessLevel !== 'readWrite') {
      return res.status(403).json({
        success: false,
        message: 'You only have read access to this patient\'s records. You cannot create new records.'
      });
    }

    // Process vital signs to ensure proper format
    const processedVitalSigns = vitalSigns ? { ...vitalSigns } : {};
    
    // Ensure bloodPressure is properly formatted as an object
    if (processedVitalSigns && processedVitalSigns.bloodPressure) {
      if (typeof processedVitalSigns.bloodPressure !== 'object') {
        // If it's not an object, create the proper structure
        processedVitalSigns.bloodPressure = {
          systolic: null,
          diastolic: null
        };
      }
    }

    // Remove any invalid values that might cause validation errors
    Object.keys(processedVitalSigns).forEach(key => {
      if (processedVitalSigns[key] === '') {
        processedVitalSigns[key] = null;
      }
    });

    // Prepare record data
    let recordData = {
      patientId,
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode,
      recordType,
      diagnosis,
      prescription,
      notes,
      vitalSigns: processedVitalSigns,
      labResults: labResults || [],
      treatmentPlan: treatmentPlan || {},
      medications: medications || [],
      imaging: imaging || [],
      permissions: permissions || {
        patientCanEdit: false,
        restrictedAccess: false,
        visibleToPatient: true
      }
    };

    // Apply encryption if requested
    if (shouldEncrypt) {
      // Attributes for encryption policy
      const attributes = {
        hospital: req.user.hospitalCode,
        department: req.user.departmentCode
      };
      
      // Encrypt sensitive data
      const sensitiveData = {
        diagnosis,
        prescription,
        notes,
        vitalSigns: processedVitalSigns,
        labResults,
        treatmentPlan,
        medications,
        imaging
      };
      
      const encryptedObject = ABEEncryption.encrypt(sensitiveData, attributes);
      
      // Update record data with encrypted info
      recordData = {
        patientId,
        doctorId: doctor._id,
        hospitalCode: req.user.hospitalCode,
        departmentCode: req.user.departmentCode,
        recordType,
        diagnosis: shouldEncrypt ? '[Encrypted]' : diagnosis,
        prescription: shouldEncrypt ? '[Encrypted]' : prescription,
        notes: shouldEncrypt ? '[Encrypted]' : notes,
        vitalSigns: shouldEncrypt ? {} : processedVitalSigns,
        labResults: shouldEncrypt ? [] : labResults,
        treatmentPlan: shouldEncrypt ? {} : treatmentPlan,
        medications: shouldEncrypt ? [] : medications,
        imaging: shouldEncrypt ? [] : imaging,
        isEncrypted: true,
        encryptionDetails: {
          policyId: encryptedObject.policy,
          encryptionAlgorithm: 'ABE'
        }
      };
    }

    // Create the medical record
    const record = await MedicalRecord.create(recordData);

    console.log('Record created successfully');
    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error creating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Helper function to check if doctor has access to patient
const checkPatientAccess = async (doctorId, patientId) => {
  try {
    // Check for direct access grant - this is the primary way to determine if doctor has access
    const AccessGrant = createAccessGrantModel();
    const grant = await AccessGrant.findOne({
      doctorId,
      patientId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (grant) {
      return { 
        hasAccess: true,
        accessLevel: grant.accessLevel 
      };
    }

    // If no active grant is found, doctor should NOT have access
    // This ensures revoked access is properly enforced
    return { hasAccess: false };
  } catch (error) {
    console.error('Error checking patient access:', error);
    return { hasAccess: false };
  }
};

// Update a medical record
exports.updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find record and check ownership
    const record = await MedicalRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if doctor owns this record
    if (record.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }
    
    // Check if doctor has write access to this patient's records
    // This is needed for when a patient has revoked write access but still allows read
    const accessInfo = await checkPatientAccess(doctor._id, record.patientId);
    if (!accessInfo.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You no longer have access to this patient\'s records'
      });
    }

    if (accessInfo.accessLevel !== 'readWrite') {
      return res.status(403).json({
        success: false,
        message: 'Your access has been limited to read-only. You cannot modify records anymore.'
      });
    }
    
    // Process vital signs to ensure proper format if they're being updated
    if (updateData.vitalSigns) {
      const processedVitalSigns = { ...updateData.vitalSigns };
      
      // Ensure bloodPressure is properly formatted
      if (processedVitalSigns.bloodPressure) {
        if (typeof processedVitalSigns.bloodPressure !== 'object') {
          processedVitalSigns.bloodPressure = {
            systolic: null,
            diastolic: null
          };
        }
      }
      
      // Remove any invalid values that might cause validation errors
      Object.keys(processedVitalSigns).forEach(key => {
        if (processedVitalSigns[key] === '') {
          processedVitalSigns[key] = null;
        }
      });
      
      updateData.vitalSigns = processedVitalSigns;
    }

    // Handle encryption if needed
    if (updateData.shouldEncrypt && !record.isEncrypted) {
      // Encrypt the record data
      const attributes = {
        hospital: req.user.hospitalCode,
        department: req.user.departmentCode
      };
      
      const sensitiveData = {
        diagnosis: updateData.diagnosis || record.diagnosis,
        prescription: updateData.prescription || record.prescription,
        notes: updateData.notes || record.notes,
        vitalSigns: updateData.vitalSigns || record.vitalSigns,
        labResults: updateData.labResults || record.labResults,
        treatmentPlan: updateData.treatmentPlan || record.treatmentPlan,
        medications: updateData.medications || record.medications,
        imaging: updateData.imaging || record.imaging
      };
      
      const encryptedObject = ABEEncryption.encrypt(sensitiveData, attributes);
      
      // Update with encrypted data
      updateData.isEncrypted = true;
      updateData.encryptedData = encryptedObject.encryptedData;
      updateData.encryptedKey = encryptedObject.encryptedKey;
      updateData.policy = encryptedObject.policy;
      updateData.diagnosis = '[Encrypted]';
      updateData.prescription = '[Encrypted]';
      updateData.notes = '[Encrypted]';
      updateData.vitalSigns = {};
      updateData.labResults = [];
      updateData.treatmentPlan = {};
      updateData.medications = [];
      updateData.imaging = [];
    } 
    // If removing encryption
    else if (updateData.shouldEncrypt === false && record.isEncrypted) {
      // Decrypt first
      const userAttributes = {
        hospital: req.user.hospitalCode,
        department: req.user.departmentCode
      };
      
      try {
        const decryptedData = ABEEncryption.decrypt(record.toObject(), userAttributes);
        if (decryptedData) {
          // Update with decrypted data plus any new changes
          updateData.isEncrypted = false;
          updateData.diagnosis = updateData.diagnosis || decryptedData.diagnosis;
          updateData.prescription = updateData.prescription || decryptedData.prescription;
          updateData.notes = updateData.notes || decryptedData.notes;
          updateData.vitalSigns = updateData.vitalSigns || decryptedData.vitalSigns;
          updateData.labResults = updateData.labResults || decryptedData.labResults;
          updateData.treatmentPlan = updateData.treatmentPlan || decryptedData.treatmentPlan;
          updateData.medications = updateData.medications || decryptedData.medications;
          updateData.imaging = updateData.imaging || decryptedData.imaging;
          // Remove encryption fields
          updateData.$unset = { 
            encryptedData: 1, 
            encryptedKey: 1, 
            policy: 1 
          };
        }
      } catch (err) {
        return res.status(403).json({
          success: false,
          message: 'Cannot decrypt record - access denied'
        });
      }
    }

    // Remove helper field not in model
    delete updateData.shouldEncrypt;

    // Update the record
    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete a medical record
exports.deleteMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find record and check ownership
    const record = await MedicalRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if doctor owns this record
    if (record.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }

    // Delete the record
    await record.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all appointments for this doctor
exports.getMyAppointments = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find appointments
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode
    })
      .sort({ date: 1, time: 1 })
      .populate({
        path: 'patientId',
        select: 'fullName contactNo',
        populate: {
          path: 'userId',
          select: 'username email'
        }
      });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, date, time, duration, reason, status } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
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

    // Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode,
      date,
      time,
      duration: duration || 30,
      reason,
      status: status || 'Scheduled'
    });

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    console.log(`Updating appointment ${id} status to ${status}`);

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    // Validate status - Accept empty or null status as a no-change
    const validStatuses = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Missed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
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

    // Find appointment and check ownership
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment'
      });
    }

    // Update the appointment - only if values are provided
    if (status) {
      appointment.status = status;
      console.log('Setting status to:', status);
    }
    
    // Allow setting notes to empty string
    if (notes !== undefined) {
      appointment.notes = notes;
    }
    
    console.log('Saving appointment with status:', appointment.status);
    const updatedAppointment = await appointment.save();
    console.log('Appointment saved successfully');

    res.status(200).json({
      success: true,
      data: updatedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
};

// Access patient data from other hospitals
exports.accessCrossHospitalData = async (req, res) => {
  console.log('accessCrossHospitalData called with:', req.body);
  
  try {
    const { patientId, accessCode } = req.body;
    
    // Patient ID is required in all cases
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    console.log('Patient ID:', patientId);
    if (accessCode) console.log('Access Code:', accessCode);

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      console.log('Doctor profile not found');
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }
    console.log('Doctor found:', doctor._id);

    // Try to find patient by ID or access code
    let patient = null;
    let directAccess = false;
    
    // Check if patientId is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await Patient.findById(patientId);
    }
    
    // If not found by ObjectId, try to find by accessCode (using patientId as access code)
    if (!patient) {
      console.log('Searching for patient by access code');
      
      // Try to find by accessCode - supports both old and new format access codes
      patient = await Patient.findOne({ accessCode: patientId });
      
      // If still not found and seems like a patient ID format (e.g., MHMH003), 
      // search in MedicalRecords to find the patient by special ID format
      if (!patient && /^[A-Z]{2}[A-Z]{2}\d{3}$/.test(patientId)) {
        console.log('Searching by special ID format (MHMH003)');
        const medicalRecord = await MedicalRecord.findOne({
          'specialId': patientId
        });
        
        if (medicalRecord) {
          patient = await Patient.findById(medicalRecord.patientId);
        } else {
          // As fallback, try to find any patient with a record containing this ID pattern
          const allRecords = await MedicalRecord.find({});
          const matchingRecord = allRecords.find(record => 
            record.patientId && 
            record.diagnosis && 
            record.diagnosis.includes(patientId)
          );
          
          if (matchingRecord) {
            patient = await Patient.findById(matchingRecord.patientId);
          }
        }
      }
    }
    
    // If patient wasn't found by ID, check history records
    if (!patient) {
      console.log('Patient not found in primary records, checking history');
      const historyRecord = await DoctorPatientHistory.findOne({
        doctorId: doctor._id,
        $or: [
          { patientId: patientId },
          { _id: patientId }
        ]
      });

      if (historyRecord) {
        // Return limited info from history record
        return res.status(200).json({
          success: true,
          message: 'Limited patient data available from history',
          patientDetails: {
            _id: historyRecord.patientId,
            fullName: historyRecord.fullName,
            hospitalCode: historyRecord.hospitalCode,
            departmentCode: historyRecord.departmentCode,
            hasActiveAccess: false,
            accessRevokedAt: historyRecord.accessRevokedAt,
            isHistoricalRecord: true
          },
          data: [] // No medical records available when access has been revoked
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Patient not found. Please check the patient ID.'
      });
    }
    
    console.log('Patient found:', patient._id);
    
    // Check access authorization - four ways to get access:
    // 1. Using access code (direct access)
    // 2. Having an active access grant
    // 3. Being in the same hospital and having treated the patient before
    // 4. Being in the same department across different hospitals
    let accessGranted = false;
    let accessMethod = '';
    
    // First check if access code is provided and valid
    // Support both direct match and old format matching
    if (accessCode && (patient.accessCode === accessCode || 
        // Also check for old format codes if needed
        (patient.oldAccessCode && patient.oldAccessCode === accessCode))) {
      console.log('Access granted via access code');
      accessGranted = true;
      accessMethod = 'access_code';
      directAccess = true;
    }
    
    // If not granted by code, check for existing grants
    if (!accessGranted) {
      const grant = await AccessGrant.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        isActive: true,
        expiresAt: { $gt: new Date() } // Not expired
      });
      
      if (grant) {
        console.log('Access granted via existing grant');
        accessGranted = true;
        accessMethod = 'existing_grant';
      }
    }
    
    // If still not granted, check if they're in the same hospital with existing records
    if (!accessGranted) {
      // Check if doctor has previously created records for this patient in their hospital
      const existingRecord = await MedicalRecord.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        hospitalCode: req.user.hospitalCode
      });
      
      if (existingRecord) {
        console.log('Access granted via same hospital');
        accessGranted = true;
        accessMethod = 'same_hospital';
      }
    }
    
    // If still not granted, check if they're in the same department across different hospitals
    if (!accessGranted) {
      // Check if doctor's department matches any of patient's records
      const departmentMatch = await MedicalRecord.findOne({
        patientId: patient._id,
        departmentCode: req.user.departmentCode
      });
      
      if (departmentMatch) {
        console.log('Access granted via same department across hospitals');
        accessGranted = true;
        accessMethod = 'same_department';
      }
    }
    
    // Save basic patient info to doctor-patient history regardless of access grant
    let historyRecord = await DoctorPatientHistory.findOne({
      patientId: patient._id,
      doctorId: doctor._id
    });

    if (!historyRecord) {
      // Create a new history record
      historyRecord = new DoctorPatientHistory({
        patientId: patient._id,
        doctorId: doctor._id,
        fullName: patient.fullName,
        hospitalCode: patient.hospitalCode || req.user.hospitalCode,
        departmentCode: patient.departmentCode || req.user.departmentCode,
        hasActiveAccess: accessGranted
      });
      await historyRecord.save();
      console.log('Created patient history record');
    } else {
      // Update existing history record
      historyRecord.fullName = patient.fullName;
      historyRecord.hasActiveAccess = accessGranted;
      if (accessGranted && historyRecord.accessRevokedAt) {
        historyRecord.accessRevokedAt = null; // Reset revocation time if access granted again
      }
      await historyRecord.save();
      console.log('Updated patient history record');
    }
    
    // If access was granted through access code, create a persistent access grant
    if (accessGranted && directAccess) {
      // Create an access grant that persists until revoked by the patient
      const existingGrant = await AccessGrant.findOne({
        patientId: patient._id,
        doctorId: doctor._id
      });
      
      if (!existingGrant) {
        // Set expiry to 1 year from now by default
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        await AccessGrant.create({
          patientId: patient._id,
          doctorId: doctor._id,
          accessLevel: 'readWrite', // Allow edit/update access
          expiresAt: expiryDate,
          isActive: true
        });
        console.log('Created persistent access grant');
      } else if (!existingGrant.isActive) {
        // Reactivate existing grant if it was previously deactivated
        existingGrant.isActive = true;
        existingGrant.expiresAt = new Date();
        existingGrant.expiresAt.setFullYear(existingGrant.expiresAt.getFullYear() + 1);
        await existingGrant.save();
        console.log('Reactivated existing access grant');
      }
      
      // Create an access request record for audit purposes
      const existingRequest = await AccessRequest.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        status: 'approved'
      });
      
      if (!existingRequest) {
        await AccessRequest.create({
          patientId: patient._id,
          doctorId: doctor._id,
          message: `Access requested using access code on ${new Date().toISOString().split('T')[0]}`,
          accessLevel: 'readWrite',
          status: 'approved',
          responseMessage: 'Auto-approved via access code',
          responseDate: new Date()
        });
        console.log('Created access request record');
      }
    }
    
    // If no access is granted and no access code was provided, create an access request
    if (!accessGranted && !accessCode) {
      // Check if a pending request already exists
      const pendingRequest = await AccessRequest.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        status: 'pending'
      });
      
      if (!pendingRequest) {
        // Create a new request
        await AccessRequest.create({
          patientId: patient._id,
          doctorId: doctor._id,
          message: `Access requested on ${new Date().toISOString().split('T')[0]}`,
          accessLevel: 'read',
          status: 'pending'
        });
        console.log('Created access request');
      }
      
      // Save basic patient details so they appear in the doctor's dashboard
      // even before access is granted
      const basicPatientDetails = {
        _id: patient._id,
        fullName: patient.fullName,
        accessRequestSent: true
      };
      
      return res.status(202).json({
        success: true,
        message: 'Access request has been sent to the patient',
        patientDetails: basicPatientDetails
      });
    } 
    // If no access was granted even with access code, deny access
    else if (!accessGranted) {
      console.log('Invalid access code or no access method worked');
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this patient\'s data. Please provide a valid access code or request access from the patient.'
      });
    }

    // If we get here, access was granted - proceed to get records
    // Find all records for this patient across all hospitals
    const records = await MedicalRecord.find({
      patientId: patient._id
    }).sort({ createdAt: -1 });

    console.log('Records found:', records.length);

    // Include patient details in the response
    const patientDetails = {
      _id: patient._id,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      contactNo: patient.contactNo,
      address: patient.address,
      accessCode: patient.accessCode,
      hasFullAccess: true // Flag indicating full access is currently granted
    };

    // Return response with both records and patient details
    res.status(200).json({
      success: true,
      count: records.length,
      accessMethod,
      patientDetails,
      data: records
    });
  } catch (error) {
    console.error('Error accessing cross-hospital data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Request access to a patient's data
exports.requestPatientAccess = async (req, res) => {
  try {
    const { patientId, message, accessLevel } = req.body;
    
    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
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
    
    // Check if there's already an active request
    const existingRequest = await AccessRequest.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending access request for this patient',
        data: existingRequest
      });
    }
    
    // Check if doctor already has access
    const existingGrant = await AccessGrant.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      isActive: true
    });
    
    if (existingGrant) {
      return res.status(400).json({
        success: false,
        message: 'You already have access to this patient\'s data',
        data: existingGrant
      });
    }
    
    // Create access request
    const accessRequest = await AccessRequest.create({
      patientId: patient._id,
      doctorId: doctor._id,
      message,
      accessLevel: accessLevel || 'read'
    });
    
    res.status(201).json({
      success: true,
      message: 'Access request sent successfully',
      data: accessRequest
    });
  } catch (error) {
    console.error('Error requesting patient access:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all access requests made by the doctor
exports.getMyAccessRequests = async (req, res) => {
  try {
    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }
    
    // Get all requests by this doctor
    const requests = await AccessRequest.find({
      doctorId: doctor._id
    })
    .sort({ requestedAt: -1 })
    .populate({
      path: 'patientId',
      select: 'fullName',
      populate: {
        path: 'userId',
        select: 'email'
      }
    });
    
    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error getting access requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all patients the doctor has ever interacted with, including those with revoked access
exports.getMyHistoricalPatients = async (req, res) => {
  try {
    // Get doctor details from user ID
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Get all patient history records for this doctor
    const historyRecords = await DoctorPatientHistory.find({ 
      doctorId: doctor._id 
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: historyRecords.length,
      data: historyRecords
    });
  } catch (error) {
    console.error('Error getting historical patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 