const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Hospital = require('./models/Hospital');
const User = require('./models/User');
const Receptionist = require('./models/Receptionist');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Random Indian names data
const indianFirstNames = [
  'Anita', 'Deepa', 'Priya', 'Sunita', 'Kavita', 
  'Meera', 'Divya', 'Anjali', 'Nisha', 'Pooja',
  'Rajesh', 'Sunil', 'Ramesh', 'Vikram', 'Anil',
  'Amit', 'Rahul', 'Sanjay', 'Dinesh', 'Vijay'
];

const indianLastNames = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 
  'Kumar', 'Joshi', 'Rao', 'Malhotra', 'Chopra',
  'Jain', 'Shah', 'Mehta', 'Agarwal', 'Iyer'
];

// Generate random contact number
const generatePhoneNumber = () => {
  return `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`;
};

// Generate random address
const generateAddress = () => {
  const streets = ['Park Street', 'MG Road', 'Gandhi Nagar', 'Civil Lines'];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana'];
  const pincodes = ['400001', '110001', '560001', '600001', '500001'];
  
  const streetNumber = Math.floor(Math.random() * 200) + 1;
  const street = streets[Math.floor(Math.random() * streets.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  const pincode = pincodes[Math.floor(Math.random() * pincodes.length)];
  
  return `${streetNumber}, ${street}, ${city}, ${state} - ${pincode}`;
};

// Generate random employee ID
const generateEmployeeId = (hospitalCode) => {
  return `${hospitalCode}-REC-${Math.floor(1000 + Math.random() * 9000)}`;
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

// Create the PDFs directory if it doesn't exist
const ensurePDFsDir = () => {
  const pdfDir = path.join(__dirname, '../pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
  }
  return pdfDir;
};

// Generate PDF for a receptionist
const generateReceptionistPDF = async (receptionist, user, hospital) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    const pdfDir = ensurePDFsDir();
    const pdfPath = path.join(pdfDir, `receptionist_${user.username}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);
    
    doc.pipe(writeStream);
    
    // Header
    doc.fontSize(18)
       .fillColor('#0047AB')
       .text('Medical Data Management System', { align: 'center' })
       .moveDown(0.5);
       
    doc.fontSize(16)
       .fillColor('#0047AB')
       .text('Receptionist Credentials', { align: 'center' })
       .moveDown();
    
    // Generated date
    doc.fontSize(10)
       .fillColor('#555')
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' })
       .moveDown(1.5);
    
    // Hospital info
    doc.fontSize(14)
       .fillColor('#000')
       .text('Hospital: ' + hospital.name)
       .moveDown(1.5);
    
    // Personal information
    doc.fontSize(14)
       .fillColor('#000')
       .text('Personal Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('Name: ' + receptionist.fullName)
       .text('Email: ' + user.email)
       .text('Contact: ' + receptionist.contactNo)
       .text('Address: ' + receptionist.address)
       .text('Employee ID: ' + (receptionist.employeeId || 'Not Assigned'))
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
       .text('Role: Receptionist')
       .moveDown(1.5);
    
    // System access information
    doc.fontSize(14)
       .fillColor('#000')
       .text('System Access Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text('As a receptionist, you have access to:')
       .text('1. Patient registration system')
       .text('2. PDF generation for patients')
       .text('3. Appointment scheduling')
       .text('4. Basic patient information management')
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
    console.error('Error generating receptionist PDF:', error);
    return null;
  }
};

// Generate a summary PDF of all receptionists
const generateSummaryPDF = async (allReceptionists) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    const pdfDir = ensurePDFsDir();
    const pdfPath = path.join(pdfDir, 'all_receptionists_credentials.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    
    doc.pipe(writeStream);
    
    // Document header
    doc.fontSize(20)
       .fillColor('#0047AB')
       .text('Medical Data Management System', { align: 'center' })
       .moveDown();
       
    doc.fontSize(16)
       .fillColor('#0047AB')
       .text('Receptionists Credentials Summary', { align: 'center' })
       .moveDown();
    
    // Current date
    doc.fontSize(10)
       .fillColor('#555')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
       .moveDown(2);
    
    // Receptionists section
    doc.fontSize(14)
       .fillColor('#000')
       .text('Receptionists', { underline: true })
       .moveDown();
       
    for (const receptionist of allReceptionists) {
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Name: ${receptionist.fullName}`)
         .text(`Email: ${receptionist.email}`)
         .text(`Password: ${receptionist._plainPassword}`)
         .text(`Hospital: ${receptionist.hospitalName}`)
         .text(`Employee ID: ${receptionist.employeeId || 'Not Assigned'}`)
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

// Main function to create receptionists
const generateReceptionists = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Get all hospitals
    const hospitals = await Hospital.find({ isActive: true });
    console.log(`Found ${hospitals.length} hospitals`);

    // Track all created receptionists for the summary PDF
    const allCreatedReceptionists = [];

    // Create 2 receptionists per hospital
    for (const hospital of hospitals) {
      console.log(`Processing hospital: ${hospital.name}`);
      
      // Create 2 receptionists for each hospital
      for (let i = 0; i < 2; i++) {
        // Generate random receptionist details
        const firstName = indianFirstNames[Math.floor(Math.random() * indianFirstNames.length)];
        const lastName = indianLastNames[Math.floor(Math.random() * indianLastNames.length)];
        const fullName = `${firstName} ${lastName}`;
        const username = `receptionist.${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
        const email = `receptionist.${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospital.emailDomain}`;
        const password = generatePassword();
        const contactNo = generatePhoneNumber();
        const address = generateAddress();
        const employeeId = generateEmployeeId(hospital.code);
        
        // Create user for receptionist
        const receptionistUser = new User({
          username,
          email,
          password,
          role: 'Receptionist',
          hospitalCode: hospital.code,
          active: true
        });
        
        // Store plain password for PDF before it gets hashed
        receptionistUser._plainPassword = password;
        
        await receptionistUser.save();
        
        // Create receptionist profile
        const receptionist = new Receptionist({
          userId: receptionistUser._id,
          fullName,
          hospitalCode: hospital.code,
          contactNo,
          employeeId: Math.random() > 0.3 ? employeeId : undefined, // 30% chance of not having an employee ID
          address
        });
        
        await receptionist.save();
        
        // Store information for summary PDF
        allCreatedReceptionists.push({
          fullName,
          email,
          _plainPassword: password,
          hospitalName: hospital.name,
          employeeId
        });
        
        // Generate PDF for receptionist
        const pdfPath = await generateReceptionistPDF(receptionist, receptionistUser, hospital);
        
        console.log(`Created receptionist: ${fullName}, PDF saved at: ${pdfPath}`);
      }
    }

    // Generate summary PDF with all receptionists credentials
    const summaryPdfPath = await generateSummaryPDF(allCreatedReceptionists);
    console.log(`Generated summary PDF with all receptionists credentials at: ${summaryPdfPath}`);

    console.log('Receptionist generation complete!');

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
generateReceptionists(); 