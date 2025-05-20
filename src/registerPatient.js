const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Hospital = require('./models/Hospital');
const Department = require('./models/Department');
const User = require('./models/User');
const Patient = require('./models/Patient');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Function to register a new patient through the receptionist
 * @param {Object} patientData - Patient registration data
 * @param {string} hospitalCode - Hospital code where the patient is being registered
 * @param {string} departmentCode - Department code where the patient is being registered
 * @returns {Object} - Object containing patient details, user details, and PDF path
 */
const registerPatient = async (patientData, hospitalCode, departmentCode) => {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0');
      console.log('Connected to MongoDB');
    }

    // Verify hospital and department
    const hospital = await Hospital.findOne({ code: hospitalCode, isActive: true });
    if (!hospital) {
      throw new Error(`Hospital with code ${hospitalCode} not found or inactive`);
    }

    const department = await Department.findOne({ code: departmentCode, hospitalCode, isActive: true });
    if (!department) {
      throw new Error(`Department with code ${departmentCode} not found or inactive in hospital ${hospitalCode}`);
    }

    // Generate a unique username and access code
    const username = `${patientData.firstName.toLowerCase()}.${patientData.lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    const email = patientData.email || `${username}@gmail.com`;
    
    // Generate random password if not provided
    const password = patientData.password || generatePassword();
    
    // Generate access code
    const accessCode = generateAccessCode();
    
    // Generate patient ID
    const patientCount = await Patient.countDocuments();
    const patientId = `${hospitalCode}${departmentCode.split('_')[1]}${String(patientCount + 1).padStart(3, '0')}`;

    // Create user account for the patient
    const patientUser = new User({
      username,
      email,
      password,
      role: 'Patient',
      active: true
    });

    // Store plain password for PDF before it gets hashed
    patientUser._plainPassword = password;
    
    await patientUser.save();
    
    // Create patient profile
    const fullName = `${patientData.firstName} ${patientData.lastName}`;
    const patient = new Patient({
      userId: patientUser._id,
      fullName,
      dateOfBirth: new Date(patientData.dateOfBirth),
      contactNo: patientData.contactNo,
      address: patientData.address,
      accessCode,
      gender: patientData.gender,
      age: calculateAge(new Date(patientData.dateOfBirth)),
      bloodGroup: patientData.bloodGroup,
      emergencyContact: patientData.emergencyContact,
      height: patientData.height,
      weight: patientData.weight,
      aadhaarNumber: patientData.aadhaarNumber
    });
    
    await patient.save();
    
    // Generate PDF for the patient
    const pdfPath = await generatePatientPDF(patient, patientUser, patientId, accessCode, hospital, department);
    
    console.log(`Registered patient: ${fullName}, Patient ID: ${patientId}`);
    
    return {
      patient,
      user: patientUser,
      patientId,
      pdfPath
    };
  } catch (error) {
    console.error('Error registering patient:', error);
    throw error;
  }
};

// Helper functions

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
};

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Generate random access code
const generateAccessCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create the PDFs directory if it doesn't exist
const ensurePDFsDir = () => {
  const pdfDir = path.join(__dirname, '../pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
  }
  return pdfDir;
};

// Generate PDF for a patient
const generatePatientPDF = async (patient, user, patientId, accessCode, hospital, department) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    const pdfDir = ensurePDFsDir();
    const pdfPath = path.join(pdfDir, `patient_${user.username}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);
    
    doc.pipe(writeStream);
    
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
       
    // Hospital and department info
    doc.fontSize(12)
       .fillColor('#333')
       .text(`Hospital: ${hospital.name}`)
       .text(`Department: ${department.name}`)
       .moveDown(1.5);
    
    // Personal information
    doc.fontSize(14)
       .fillColor('#000')
       .text('Personal Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('Name: ' + patient.fullName)
       .text('Gender: ' + patient.gender)
       .text('Age: ' + patient.age)
       .text('Date of Birth: ' + patient.dateOfBirth.toLocaleDateString())
       .text('Blood Group: ' + patient.bloodGroup)
       .text('Contact Number: ' + patient.contactNo)
       .text('Emergency Contact: ' + patient.emergencyContact)
       .text('Address: ' + patient.address)
       .text('Height: ' + patient.height + ' cm')
       .text('Weight: ' + patient.weight + ' kg')
       .text('Aadhaar Number: ' + patient.aadhaarNumber)
       .moveDown(1.5);
    
    // Login information
    doc.fontSize(14)
       .fillColor('#000')
       .text('Login Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('Email: ' + user.email)
       .text('Password: ' + user._plainPassword)
       .text('Patient ID: ' + patientId)
       .text('Access Code: ' + accessCode)
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
       .text('Please keep it secure and change your password after first login.', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve(pdfPath);
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error generating patient PDF:', error);
    return null;
  }
};

// Sample usage
/*
const samplePatientData = {
  firstName: 'Ankit',
  lastName: 'Kumar',
  dateOfBirth: '1990-05-15',
  gender: 'Male',
  contactNo: '+917895123456',
  emergencyContact: '+917896543210',
  address: '123, MG Road, Bangalore, Karnataka - 560001',
  bloodGroup: 'O+',
  height: 175,
  weight: 70,
  aadhaarNumber: '123456789012',
  email: 'ankit.kumar@gmail.com'
};

registerPatient(samplePatientData, 'MH1', 'MH1_CARDIO')
  .then(result => {
    console.log('Patient registered successfully:', result.patient.fullName);
    console.log('PDF generated at:', result.pdfPath);
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to register patient:', error);
    process.exit(1);
  });
*/

module.exports = { registerPatient }; 