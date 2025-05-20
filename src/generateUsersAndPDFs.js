const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Hospital = require('./models/Hospital');
const Department = require('./models/Department');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Random Indian names data
const indianFirstNames = [
  'Aarav', 'Vihaan', 'Advik', 'Vivaan', 'Aditya', 'Arjun', 'Reyansh', 'Ayaan', 'Ishaan',
  'Aadhya', 'Ananya', 'Diya', 'Pari', 'Kiara', 'Myra', 'Sara', 'Saanvi', 'Aanya', 'Aisha',
  'Rohit', 'Rahul', 'Vikram', 'Amit', 'Vijay', 'Ravi', 'Sunil', 'Nikhil', 'Deepak', 'Rajesh',
  'Sneha', 'Pooja', 'Neha', 'Priya', 'Divya', 'Anjali', 'Kavita', 'Meera', 'Sunita', 'Deepa'
];

const indianLastNames = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Rao', 'Malhotra', 'Chopra',
  'Jain', 'Shah', 'Mehta', 'Agarwal', 'Iyer', 'Nair', 'Reddy', 'Kapoor', 'Chawla', 'Bhat',
  'Das', 'Mukherjee', 'Chatterjee', 'Bansal', 'Pillai', 'Mahajan', 'Sengupta', 'Chakraborty'
];

// Generate random Indian details
const generateRandomDetails = () => {
  // Random gender
  const gender = Math.random() > 0.5 ? 'Male' : 'Female';
  
  // Random age between 18-85
  const age = Math.floor(18 + Math.random() * 67);
  
  // Random date of birth based on age
  const now = new Date();
  const birthYear = now.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  const dob = new Date(birthYear, birthMonth, birthDay);
  
  // Random blood group
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
  
  // Random height (150-190 cm)
  const height = Math.floor(150 + Math.random() * 40);
  
  // Random weight (50-90 kg)
  const weight = Math.floor(50 + Math.random() * 40);
  
  // Random Aadhaar number (12 digits)
  let aadhaarNumber = '';
  for (let i = 0; i < 12; i++) {
    aadhaarNumber += Math.floor(Math.random() * 10);
  }
  
  // Random phone numbers
  const contactNumber = `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`;
  const emergencyContact = `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`;
  
  // Random address
  const streets = ['Park Street', 'MG Road', 'Gandhi Nagar', 'Civil Lines', 'Sector 18', 'Andheri', 'Vastrapur', 'Banjara Hills'];
  const localities = ['Andheri', 'Bandra', 'Vastrapur', 'Koramangala', 'Indiranagar', 'Connaught Place', 'Salt Lake'];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Gujarat', 'Uttar Pradesh'];
  const pincodes = ['400001', '110001', '560001', '600001', '500001', '700001', '411001', '380001', '640217', '851251'];
  
  const streetNumber = Math.floor(Math.random() * 200) + 1;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const locality = localities[Math.floor(Math.random() * localities.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const pincode = pincodes[Math.floor(Math.random() * pincodes.length)];
  
  const address = `${streetNumber}, ${street}, ${locality}, ${city}, ${state} - ${pincode}`;
  
  return {
    gender,
    age,
    dob,
    bloodGroup,
    contactNumber,
    emergencyContact,
    address,
    height,
    weight,
    aadhaarNumber
  };
};

// Generate doctor license number
const generateLicenseNo = (hospitalCode, departmentCode, index) => {
  return `DOC-${hospitalCode}-${departmentCode}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Generate patient ID
const generatePatientId = (hospitalCode, departmentCode, index) => {
  return `${hospitalCode}${departmentCode}${String(index).padStart(3, '0')}`;
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

// Generate PDF for a doctor
const generateDoctorPDF = async (doctor, user, hospital, department) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    const pdfDir = ensurePDFsDir();
    const pdfPath = path.join(pdfDir, `doctor_${user.username}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);
    
    doc.pipe(writeStream);
    
    // Header
    doc.fontSize(18)
       .fillColor('#0047AB')
       .text('Medical Data Management System', { align: 'center' })
       .moveDown(0.5);
       
    doc.fontSize(16)
       .fillColor('#0047AB')
       .text('Doctor Credentials', { align: 'center' })
       .moveDown();
    
    // Generated date
    doc.fontSize(10)
       .fillColor('#555')
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' })
       .moveDown(1.5);
    
    // Hospital and department info
    doc.fontSize(14)
       .fillColor('#000')
       .text('Hospital: ' + hospital.name)
       .text('Department: ' + department.name)
       .moveDown(1.5);
    
    // Personal information
    doc.fontSize(14)
       .fillColor('#000')
       .text('Personal Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('Name: ' + doctor.fullName)
       .text('Email: ' + user.email)
       .text('Contact: ' + doctor.contactNo)
       .text('Address: ' + doctor.address)
       .text('License Number: ' + doctor.licenseNo)
       .text('Specialization: ' + doctor.specialization)
       .moveDown(1.5);
    
    // Login credentials
    doc.fontSize(14)
       .fillColor('#000')
       .text('Login Credentials', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('Email: ' + user.email)
       .text('Password: ' + user._plainPassword)
       .text('Role: Doctor')
       .moveDown(1.5);
    
    // System access information
    doc.fontSize(14)
       .fillColor('#000')
       .text('System Access Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('As a doctor, you have access to:')
       .text('1. Patient medical records in your department')
       .text('2. Prescription management')
       .text('3. Treatment planning and documentation')
       .text('4. Patient history and test results')
       .moveDown(1.5);
    
    // Footer
    doc.fontSize(10)
       .fillColor('#CC0000')
       .text('IMPORTANT: This document contains confidential information.', { align: 'center' })
       .text('Please keep it secure and change your password after first login', { align: 'center' });
    
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
    console.error('Error generating doctor PDF:', error);
    return null;
  }
};

// Generate PDF for a patient
const generatePatientPDF = async (patient, user, patientId, accessCode) => {
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

// Generate a summary PDF with all credentials
const generateSummaryPDF = async (allUsers) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    const pdfDir = ensurePDFsDir();
    const pdfPath = path.join(pdfDir, 'all_users_credentials.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    
    doc.pipe(writeStream);
    
    // Document header
    doc.fontSize(20)
       .fillColor('#0047AB')
       .text('Medical Data Management System', { align: 'center' })
       .moveDown();
       
    doc.fontSize(16)
       .fillColor('#0047AB')
       .text('All Users Credentials Summary', { align: 'center' })
       .moveDown();
    
    // Current date
    doc.fontSize(10)
       .fillColor('#555')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
       .moveDown(2);
    
    // Doctors section
    doc.fontSize(14)
       .fillColor('#000')
       .text('Doctors', { underline: true })
       .moveDown();
       
    const doctors = allUsers.filter(u => u.role === 'Doctor');
    
    for (const doctor of doctors) {
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Name: ${doctor.fullName}`)
         .text(`Email: ${doctor.email}`)
         .text(`Password: ${doctor._plainPassword}`)
         .text(`Hospital: ${doctor.hospitalName}`)
         .text(`Department: ${doctor.departmentName}`)
         .moveDown(1);
    }
    
    // Patients section
    doc.addPage();
    
    doc.fontSize(14)
       .fillColor('#000')
       .text('Patients', { underline: true })
       .moveDown();
       
    const patients = allUsers.filter(u => u.role === 'Patient');
    
    for (const patient of patients) {
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Name: ${patient.fullName}`)
         .text(`Email: ${patient.email}`)
         .text(`Password: ${patient._plainPassword}`)
         .text(`Patient ID: ${patient.patientId}`)
         .text(`Access Code: ${patient.accessCode}`)
         .moveDown(1);
    }
    
    // Footer
    doc.fontSize(10)
       .fillColor('#555')
       .text('IMPORTANT: This document contains confidential information. Keep it secure.', { align: 'center' });
    
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
    console.error('Error generating summary PDF:', error);
    return null;
  }
};

// Main function to seed database with users and generate PDFs
const generateUsersAndPDFs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Get all hospitals
    const hospitals = await Hospital.find({ isActive: true });
    console.log(`Found ${hospitals.length} hospitals`);

    // Track all created users for the summary PDF
    const allCreatedUsers = [];

    // Process each hospital
    for (const hospital of hospitals) {
      console.log(`Processing hospital: ${hospital.name}`);
      
      // Get all departments for this hospital
      const departments = await Department.find({ hospitalCode: hospital.code, isActive: true });
      console.log(`Found ${departments.length} departments for ${hospital.name}`);
      
      // Process each department
      for (const department of departments) {
        console.log(`Processing department: ${department.name}`);
        
        // Create 2 doctors for each department
        for (let i = 0; i < 2; i++) {
          // Generate random doctor details
          const firstName = indianFirstNames[Math.floor(Math.random() * indianFirstNames.length)];
          const lastName = indianLastNames[Math.floor(Math.random() * indianLastNames.length)];
          const fullName = `Dr. ${firstName} ${lastName}`;
          const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
          const email = `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospital.emailDomain}`;
          const password = generatePassword();
          
          const details = generateRandomDetails();
          const licenseNo = generateLicenseNo(hospital.code, department.code.split('_')[1], i + 1);
          
          // Create user for doctor
          const doctorUser = new User({
            username,
            email,
            password,
            role: 'Doctor',
            hospitalCode: hospital.code,
            departmentCode: department.code,
            active: true
          });
          
          // Store plain password for PDF before it gets hashed
          doctorUser._plainPassword = password;
          
          await doctorUser.save();
          
          // Create doctor profile
          const doctor = new Doctor({
            userId: doctorUser._id,
            fullName,
            hospitalCode: hospital.code,
            departmentCode: department.code,
            contactNo: details.contactNumber,
            licenseNo: licenseNo,
            specialization: department.name,
            address: details.address
          });
          
          await doctor.save();
          
          // Store information for summary PDF
          allCreatedUsers.push({
            role: 'Doctor',
            fullName,
            email,
            _plainPassword: password,
            hospitalName: hospital.name,
            departmentName: department.name
          });
          
          // Generate PDF for doctor
          const pdfPath = await generateDoctorPDF(doctor, doctorUser, hospital, department);
          
          console.log(`Created doctor: ${fullName}, PDF saved at: ${pdfPath}`);
        }
        
        // Create 4 patients for each department
        for (let i = 0; i < 4; i++) {
          // Generate random patient details
          const firstName = indianFirstNames[Math.floor(Math.random() * indianFirstNames.length)];
          const lastName = indianLastNames[Math.floor(Math.random() * indianLastNames.length)];
          const fullName = `${firstName} ${lastName}`;
          const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
          const password = generatePassword();
          
          const details = generateRandomDetails();
          const accessCode = generateAccessCode();
          const patientId = generatePatientId(hospital.code, department.code.split('_')[1], i + 1);
          
          // Create user for patient
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
          
          // Create patient profile with additional fields
          const patient = new Patient({
            userId: patientUser._id,
            fullName,
            dateOfBirth: details.dob,
            contactNo: details.contactNumber,
            address: details.address,
            accessCode,
            gender: details.gender,
            age: details.age,
            bloodGroup: details.bloodGroup,
            emergencyContact: details.emergencyContact,
            height: details.height,
            weight: details.weight,
            aadhaarNumber: details.aadhaarNumber
          });
          
          await patient.save();
          
          // Store information for summary PDF
          allCreatedUsers.push({
            role: 'Patient',
            fullName,
            email,
            _plainPassword: password,
            patientId,
            accessCode
          });
          
          // Generate PDF for patient
          const pdfPath = await generatePatientPDF(patient, patientUser, patientId, accessCode);
          
          console.log(`Created patient: ${fullName}, PDF saved at: ${pdfPath}`);
        }
      }
    }

    // Generate summary PDF with all user credentials
    const summaryPdfPath = await generateSummaryPDF(allCreatedUsers);
    console.log(`Generated summary PDF with all user credentials at: ${summaryPdfPath}`);

    console.log('Database seeding and PDF generation complete!');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the function
generateUsersAndPDFs(); 