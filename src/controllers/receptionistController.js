const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Receptionist = require('../models/Receptionist');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { registerPatient: registerPatientUtil } = require('../registerPatient');

// Get all patients for a hospital
exports.getPatients = async (req, res) => {
  try {
    const { hospitalCode } = req.query;
    
    // Get the receptionist's hospital if not specified
    const receptionistHospitalCode = hospitalCode || req.user.hospitalCode;
    
    // First get all patients with userId populated
    const patients = await Patient.find().populate({
      path: 'userId',
      select: 'email active'
    });
    
    // Filter patients based on department hospitalCode
    const patientList = [];
    
    for (const patient of patients) {
      if (patient.userId && patient.userId.active) {
        // Get the patient's medical records to find their department
        const patientId = patient._id;
        
        // If no hospitalCode specified or matches the department's hospital
        patientList.push({
          _id: patient._id,
          fullName: patient.fullName,
          contactNo: patient.contactNo,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodGroup: patient.bloodGroup,
          accessCode: patient.accessCode,
          email: patient.userId ? patient.userId.email : null
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      count: patientList.length,
      data: patientList
    });
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all doctors for a hospital
exports.getDoctors = async (req, res) => {
  try {
    const { hospitalCode } = req.query;
    
    // Get the receptionist's hospital if not specified
    const receptionistHospitalCode = hospitalCode || req.user.hospitalCode;
    
    // Get all doctors from that hospital
    const doctors = await Doctor.find({ hospitalCode: receptionistHospitalCode }).populate({
      path: 'userId',
      select: 'email active'
    });
    
    // Filter active doctors and add department names
    const activeDoctors = [];
    
    for (const doctor of doctors) {
      if (doctor.userId && doctor.userId.active) {
        const department = await Department.findOne({ code: doctor.departmentCode });
        
        activeDoctors.push({
          _id: doctor._id,
          fullName: doctor.fullName,
          contactNo: doctor.contactNo,
          departmentCode: doctor.departmentCode,
          departmentName: department ? department.name : 'Unknown Department',
          specialization: doctor.specialization
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      count: activeDoctors.length,
      data: activeDoctors
    });
  } catch (error) {
    console.error('Error getting doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get appointments for a hospital
exports.getAppointments = async (req, res) => {
  try {
    const { hospitalCode, date } = req.query;
    
    // Get the receptionist's hospital if not specified
    const receptionistHospitalCode = hospitalCode || req.user.hospitalCode;
    
    // Build query
    const query = { hospitalCode: receptionistHospitalCode };
    
    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    // Get appointments
    const appointments = await Appointment.find(query);
    
    // Add patient and doctor names to the appointments
    const appointmentList = [];
    
    for (const appointment of appointments) {
      const patient = await Patient.findById(appointment.patientId);
      const doctor = await Doctor.findById(appointment.doctorId);
      
      appointmentList.push({
        _id: appointment._id,
        patientId: appointment.patientId,
        patientName: patient ? patient.fullName : 'Unknown Patient',
        doctorId: appointment.doctorId,
        doctorName: doctor ? doctor.fullName : 'Unknown Doctor',
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        reason: appointment.reason,
        notes: appointment.notes
      });
    }
    
    return res.status(200).json({
      success: true,
      count: appointmentList.length,
      data: appointmentList
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Register a new patient
exports.registerPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNo,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      departmentCode,
      height,
      weight,
      aadhaarNumber,
      hospitalCode
    } = req.body;
    
    // Get the receptionist's hospital if not specified
    const receptionistHospitalCode = hospitalCode || req.user.hospitalCode;
    
    // Validate inputs
    if (!firstName || !lastName || !contactNo || !dateOfBirth || !gender || !departmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (first name, last name, contact, date of birth, gender, department)'
      });
    }
    
    // Validate department exists
    const department = await Department.findOne({ 
      code: departmentCode, 
      hospitalCode: receptionistHospitalCode,
      isActive: true
    });
    
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department code for this hospital'
      });
    }
    
    // Get receptionist details for tracking
    const receptionist = await Receptionist.findOne({
      userId: req.user._id
    });
    
    if (!receptionist) {
      return res.status(404).json({
        success: false,
        message: 'Receptionist profile not found'
      });
    }
    
    // Format patient data
    const patientData = {
      firstName,
      lastName,
      email,
      contactNo,
      dateOfBirth,
      gender,
      bloodGroup: bloodGroup || '',
      address: address || '',
      emergencyContact: emergencyContact || '',
      height: height || '',
      weight: weight || '',
      aadhaarNumber: aadhaarNumber || '',
      registeredBy: {
        receptionistId: receptionist._id,
        receptionistName: receptionist.fullName
      }
    };
    
    // Register the patient
    const result = await registerPatientUtil(patientData, receptionistHospitalCode, departmentCode);
    
    // Get the department name for the response
    const departmentName = department.name;
    
    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: {
        patientId: result.patientId,
        fullName: result.patient.fullName,
        accessCode: result.patient.accessCode,
        departmentName: departmentName,
        hospitalCode: receptionistHospitalCode,
        contactNo: result.patient.contactNo,
        credentials: {
          username: result.user.username,
          password: result.user._plainPassword
        },
        registeredBy: receptionist.fullName,
        registrationDate: new Date()
      }
    });
  } catch (error) {
    console.error('Error registering patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Schedule a new appointment
exports.scheduleAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      date,
      time,
      reason,
      notes,
      hospitalCode
    } = req.body;
    
    // Get the receptionist's hospital if not specified
    const receptionistHospitalCode = hospitalCode || req.user.hospitalCode;
    
    // Validate inputs
    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (patient ID, doctor ID, date, time)'
      });
    }
    
    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID'
      });
    }
    
    // Validate doctor exists and belongs to the hospital
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.hospitalCode !== receptionistHospitalCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID'
      });
    }
    
    // Create the appointment
    const appointment = new Appointment({
      patientId,
      doctorId,
      hospitalCode: receptionistHospitalCode,
      departmentCode: doctor.departmentCode,
      date: new Date(date),
      time,
      reason: reason || 'Regular checkup',
      notes: notes || '',
      status: 'Scheduled'
    });
    
    await appointment.save();
    
    return res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get patient credentials PDF
exports.getPatientPDF = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Validate patient exists
    const patient = await Patient.findById(patientId).populate({
      path: 'userId',
      select: 'email username'
    });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Check if PDF exists
    const pdfDir = path.join(__dirname, '../../pdfs');
    const pdfPath = path.join(pdfDir, `patient_${patient.userId.username}.pdf`);
    
    if (fs.existsSync(pdfPath)) {
      // Return existing PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="patient_credentials_${patient.fullName.replace(/\s+/g, '_')}.pdf"`);
      
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } else {
      // Generate a new PDF
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 72, right: 72 }
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="patient_credentials_${patient.fullName.replace(/\s+/g, '_')}.pdf"`);
      
      // Pipe directly to response
      doc.pipe(res);
      
      // Header
      doc.fontSize(18)
         .fillColor('#0047AB')
         .text('Medical Data Management System', { align: 'center' })
         .moveDown(0.5);
         
      doc.fontSize(16)
         .fillColor('#0047AB')
         .text('Patient Information and Credentials', { align: 'center' })
         .moveDown();
      
      // Generated date
      doc.fontSize(10)
         .fillColor('#555')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' })
         .moveDown(1);
      
      // Personal information
      doc.fontSize(14)
         .fillColor('#000')
         .text('Personal Information', { underline: true })
         .moveDown();
         
      doc.fontSize(12)
         .fillColor('#333')
         .text('Name: ' + patient.fullName)
         .text('Gender: ' + patient.gender)
         .text('Age: ' + ((new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear())))
         .text('Date of Birth: ' + new Date(patient.dateOfBirth).toLocaleDateString())
         .text('Blood Group: ' + (patient.bloodGroup || 'Not specified'))
         .text('Contact Number: ' + patient.contactNo)
         .text('Emergency Contact: ' + (patient.emergencyContact || 'Not specified'))
         .moveDown(1.5);
      
      // Login information
      doc.fontSize(14)
         .fillColor('#000')
         .text('Login Information', { underline: true })
         .moveDown();
         
      doc.fontSize(12)
         .fillColor('#333')
         .text('Username: ' + patient.userId.username)
         .text('Email: ' + (patient.userId.email || 'Not specified'))
         .text('Access Code: ' + patient.accessCode)
         .moveDown(1.5);
      
      // Additional information
      doc.fontSize(14)
         .fillColor('#000')
         .text('Important Information', { underline: true })
         .moveDown();
         
      doc.fontSize(12)
         .fillColor('#333')
         .text('Your access code is required when doctors need to access your medical records. Please keep it secure and only share with authorized healthcare providers.')
         .moveDown(1.5);
      
      // Footer
      doc.fontSize(10)
         .fillColor('#CC0000')
         .text('IMPORTANT: This document contains confidential information.', { align: 'center' })
         .text('Please keep it secure.', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
    }
  } catch (error) {
    console.error('Error getting patient PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}; 