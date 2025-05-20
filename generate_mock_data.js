const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Check if required packages are installed
try {
    require.resolve('pdfkit');
    require.resolve('uuid');
} catch (e) {
    console.error('Error: Required packages not installed. Please run: npm install pdfkit uuid --save');
    process.exit(1);
}

// MongoDB connection
mongoose.connect('mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});

// Load models
const Hospital = require('./src/models/Hospital');
const Department = require('./src/models/Department');
const User = require('./src/models/User');
const Doctor = require('./src/models/Doctor');
const Patient = require('./src/models/Patient');
const Receptionist = require('./src/models/Receptionist');
const MedicalDocument = require('./src/models/MedicalDocument');

// Create PDFs directory if it doesn't exist
const pdfDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
}

// Indian names, cities and streets for random data generation
const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Ayaan', 'Atharva', 
    'Krishna', 'Ishaan', 'Shaurya', 'Advik', 'Rudra', 'Kabir', 'Anik', 'Tejas',
    'Avni', 'Aanya', 'Aadhya', 'Saanvi', 'Pari', 'Myra', 'Ananya', 'Diya', 
    'Pihu', 'Aarohi', 'Sara', 'Kiara', 'Prisha', 'Ahana', 'Shanaya', 'Anaya'
];

const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Mishra', 'Joshi', 
    'Banerjee', 'Mukherjee', 'Agarwal', 'Reddy', 'Shah', 'Kapoor', 'Chatterjee', 'Yadav',
    'Nair', 'Iyer', 'Desai', 'Mehta', 'Choudhury', 'Bose', 'Malhotra', 'Sengupta',
    'Patil', 'Chauhan', 'Rathore', 'Pandey', 'Trivedi', 'Mahajan', 'Prakash', 'Sinha'
];

const cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Jaipur',
    'Ahmedabad', 'Lucknow', 'Chandigarh', 'Indore', 'Kochi', 'Bhopal', 'Coimbatore', 'Vadodara'
];

const states = [
    'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Uttar Pradesh', 'Gujarat', 'Rajasthan',
    'West Bengal', 'Bihar', 'Telangana', 'Haryana', 'Kerala', 'Madhya Pradesh', 'Punjab'
];

const streets = [
    'MG Road', 'Nehru Street', 'Gandhi Road', 'Patel Nagar', 'Civil Lines', 'Sector 15',
    'Rajiv Chowk', 'Lake View', 'Hill View', 'Park Avenue', 'Station Road', 'Mall Road'
];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['male', 'female'];
const medicalConditions = [
    'Diabetes Type 2', 'Hypertension', 'Asthma', 'Heart condition', 
    'No pre-existing conditions', 'Thyroid disorder', 'Arthritis'
];
const allergies = [
    'Peanuts', 'Shellfish', 'Penicillin', 'Pollen', 'Latex', 
    'No known allergies', 'Dust mites', 'Dairy products'
];
const surgeries = [
    'Appendectomy', 'Tonsillectomy', 'Knee replacement', 
    'No previous surgeries', 'Hip replacement', 'Gallbladder removal'
];

// Helper functions
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomPhone = () => `+91${getRandomNumber(7000000000, 9999999999)}`;
const getRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length: 10}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

const getRandomName = () => {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
};

const getRandomAddress = () => {
    const streetNumber = getRandomNumber(1, 100);
    const street = getRandomElement(streets);
    const locality = getRandomElement(['Andheri', 'Bandra', 'Salt Lake', 'Indiranagar', 'Malad', 'Rohini']);
    const city = getRandomElement(cities);
    const state = getRandomElement(states);
    const pincode = getRandomNumber(100000, 999999);
    return `${streetNumber}, ${street}, ${locality}, ${city}, ${state} - ${pincode}`;
};

// Function to generate a random date between two dates
const getRandomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Function to generate a random email for patients
const generatePatientEmail = (firstName, lastName) => {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const randomNum = getRandomNumber(1000, 9999);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${getRandomElement(domains)}`.toLowerCase();
};

// Function to generate a professional email for doctors/receptionists
const generateProfessionalEmail = (firstName, lastName, hospitalDomain) => {
    return `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospitalDomain}`.toLowerCase();
};

// Function to generate a receptionist email
const generateReceptionistEmail = (firstName, lastName, hospitalDomain) => {
    return `reception.${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospitalDomain}`.toLowerCase();
};

// Function to generate PDF for a patient
const generatePatientPDF = async (patientData, hospital, department) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const fileName = `patient_${patientData.accessCode}.pdf`;
            const filePath = path.join(pdfDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            // Pipe its output to the file
            doc.pipe(writeStream);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text('MDMS Patient Credentials', { align: 'center' });
            doc.moveDown();
            
            // Generation Date
            doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
                month: 'numeric', day: 'numeric', year: 'numeric', 
                hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true 
            })}`);
            doc.moveDown();
            
            // Hospital and Department
            doc.text(`Hospital: ${hospital.name}`);
            doc.text(`Department: ${department.name} - ${hospital.name}`);
            doc.moveDown();
            
            // Login Information
            doc.fontSize(14).font('Helvetica-Bold').text('Login Information');
            doc.fontSize(12).font('Helvetica').text(`Email: ${patientData.email}`);
            doc.text(`Password: ${patientData.password}`);
            doc.text(`Patient ID: ${patientData.patientId}`);
            doc.text(`Access Code: ${patientData.accessCode}`);
            doc.moveDown();
            
            // Patient Details
            doc.fontSize(14).font('Helvetica-Bold').text('Patient Details');
            doc.fontSize(12).font('Helvetica').text(`Name: ${patientData.fullName}`);
            doc.text(`Gender: ${patientData.gender}`);
            doc.text(`Age: ${patientData.age}`);
            doc.text(`Date of Birth: ${patientData.dateOfBirth.toLocaleDateString()}`);
            doc.text(`Blood Group: ${patientData.bloodGroup}`);
            doc.text(`Contact Number: ${patientData.contactNo}`);
            doc.text(`Emergency Contact: ${patientData.emergencyContact}`);
            doc.text(`Address: ${patientData.address}`);
            doc.text(`Height: ${patientData.height} cm`);
            doc.text(`Weight: ${patientData.weight} kg`);
            doc.text(`Aadhaar Number: ${patientData.aadhaarNumber}`);
            doc.moveDown();
            
            // Medical History
            doc.fontSize(14).font('Helvetica-Bold').text('Medical History');
            doc.fontSize(12).font('Helvetica').text(`1. Type: condition`);
            doc.text(`   Details: ${patientData.medicalCondition}`);
            doc.text(`   Date: ${patientData.conditionDate.toLocaleDateString()}`);
            doc.moveDown(0.5);
            doc.text(`2. Type: surgery`);
            doc.text(`   Details: ${patientData.surgery}`);
            doc.moveDown(0.5);
            doc.text(`3. Type: allergy`);
            doc.text(`   Details: ${patientData.allergy}`);
            doc.moveDown();
            
            // Footer
            doc.fontSize(10).text('IMPORTANT: This document contains confidential information. Please keep it secure.');
            doc.text('For assistance, contact the hospital administration');
            
            // Finalize the PDF
            doc.end();
            
            // Handle write stream events
            writeStream.on('finish', () => {
                // Read the file data to save to the database
                const fileData = fs.readFileSync(filePath);
                resolve({
                    fileName,
                    filePath,
                    fileData
                });
            });
            
            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Function to generate PDF for a doctor
const generateDoctorPDF = async (doctorData, hospital, department) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const fileName = `doctor_${doctorData.licenseNo}.pdf`;
            const filePath = path.join(pdfDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            // Pipe its output to the file
            doc.pipe(writeStream);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text('Medical Data Management System', { align: 'center' });
            doc.fontSize(16).font('Helvetica-Bold').text('Doctor Credentials', { align: 'center' });
            doc.moveDown();
            
            // Generation Date
            doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
                month: 'numeric', day: 'numeric', year: 'numeric', 
                hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true 
            })}`);
            doc.moveDown();
            
            // Hospital and Department
            doc.text(`Hospital: ${hospital.name}`);
            doc.text(`Department: ${department.name} - ${hospital.name}`);
            doc.moveDown();
            
            // Personal Information
            doc.fontSize(14).font('Helvetica-Bold').text('Personal Information');
            doc.fontSize(12).font('Helvetica').text(`Name: ${doctorData.fullName}`);
            doc.text(`Email: ${doctorData.email}`);
            doc.text(`Contact: ${doctorData.contactNo}`);
            doc.text(`Address: ${doctorData.address}`);
            doc.text(`License Number: ${doctorData.licenseNo}`);
            doc.text(`Specialization: ${department.name} - ${hospital.name}`);
            doc.moveDown();
            
            // Login Credentials
            doc.fontSize(14).font('Helvetica-Bold').text('Login Credentials');
            doc.fontSize(12).font('Helvetica').text(`Email: ${doctorData.email}`);
            doc.text(`Password: ${doctorData.password}`);
            doc.text(`Role: Doctor`);
            doc.moveDown();
            
            // System Access Info
            doc.fontSize(14).font('Helvetica-Bold').text('System Access Information');
            doc.fontSize(12).font('Helvetica').text('As a doctor, you have access to:');
            doc.text('1. Patient medical records in your department');
            doc.text('2. Prescription management');
            doc.text('3. Treatment planning and documentation');
            doc.text('4. Patient history and test results');
            doc.moveDown();
            
            // Footer
            doc.fontSize(10).text('IMPORTANT: This document contains confidential information.');
            doc.text('Please keep it secure and change your password after first login');
            
            // Finalize the PDF
            doc.end();
            
            // Handle write stream events
            writeStream.on('finish', () => {
                // Read the file data to save to the database
                const fileData = fs.readFileSync(filePath);
                resolve({
                    fileName,
                    filePath,
                    fileData
                });
            });
            
            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Function to generate PDF for a receptionist
const generateReceptionistPDF = async (receptionistData, hospital) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const fileName = `receptionist_${receptionistData.employeeId}.pdf`;
            const filePath = path.join(pdfDir, fileName);
            const writeStream = fs.createWriteStream(filePath);

            // Pipe its output to the file
            doc.pipe(writeStream);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text('Medical Data Management System', { align: 'center' });
            doc.fontSize(16).font('Helvetica-Bold').text('Receptionist Credentials', { align: 'center' });
            doc.moveDown();
            
            // Generation Date
            doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
                month: 'numeric', day: 'numeric', year: 'numeric', 
                hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true 
            })}`);
            doc.moveDown();
            
            // Hospital
            doc.text(`Hospital: ${hospital.name}`);
            doc.moveDown();
            
            // Personal Information
            doc.fontSize(14).font('Helvetica-Bold').text('Personal Information');
            doc.fontSize(12).font('Helvetica').text(`Name: ${receptionistData.fullName}`);
            doc.text(`Email: ${receptionistData.email}`);
            doc.text(`Contact: ${receptionistData.contactNo}`);
            doc.text(`Address: ${receptionistData.address}`);
            doc.text(`Employee ID: ${receptionistData.employeeId}`);
            doc.moveDown();
            
            // Login Credentials
            doc.fontSize(14).font('Helvetica-Bold').text('Login Credentials');
            doc.fontSize(12).font('Helvetica').text(`Email: ${receptionistData.email}`);
            doc.text(`Password: ${receptionistData.password}`);
            doc.text(`Role: Receptionist`);
            doc.moveDown();
            
            // System Access Info
            doc.fontSize(14).font('Helvetica-Bold').text('System Access Information');
            doc.fontSize(12).font('Helvetica').text('As a receptionist, you have access to:');
            doc.text('1. Patient registration and scheduling');
            doc.text('2. Appointment management');
            doc.text('3. Patient lookup and basic information');
            doc.text('4. Hospital department information');
            doc.moveDown();
            
            // Footer
            doc.fontSize(10).text('IMPORTANT: This document contains confidential information.');
            doc.text('Please keep it secure and change your password after first login');
            
            // Finalize the PDF
            doc.end();
            
            // Handle write stream events
            writeStream.on('finish', () => {
                // Read the file data to save to the database
                const fileData = fs.readFileSync(filePath);
                resolve({
                    fileName,
                    filePath,
                    fileData
                });
            });
            
            writeStream.on('error', (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Main function to generate all data
async function generateMockData() {
    try {
        console.log("Starting data generation...");

        // Get all hospitals
        const hospitals = await Hospital.find({});
        if (hospitals.length === 0) {
            console.error("No hospitals found in the database. Please add hospitals first.");
            return;
        }

        // Process each hospital
        for (const hospital of hospitals) {
            console.log(`Processing hospital: ${hospital.name}`);
            
            // Get all departments for this hospital
            const departments = await Department.find({ hospitalCode: hospital.code });
            if (departments.length === 0) {
                console.log(`No departments found for hospital ${hospital.name}. Skipping...`);
                continue;
            }

            // Create 1 receptionist per hospital
            const receptionistName = getRandomName();
            const receptionistEmail = generateReceptionistEmail(receptionistName.firstName, receptionistName.lastName, hospital.emailDomain);
            const receptionistPassword = getRandomPassword();
            
            // Create user for receptionist
            const receptionistUser = new User({
                username: receptionistEmail.split('@')[0],
                email: receptionistEmail,
                password: receptionistPassword,
                role: 'Receptionist',
                hospitalCode: hospital.code
            });
            
            await receptionistUser.save();
            
            // Create receptionist
            const employeeId = `REC-${hospital.code}-${getRandomNumber(1000, 9999)}`;
            const receptionistData = {
                fullName: receptionistName.fullName,
                email: receptionistEmail,
                password: receptionistPassword,
                contactNo: getRandomPhone(),
                address: getRandomAddress(),
                employeeId: employeeId
            };
            
            const receptionist = new Receptionist({
                userId: receptionistUser._id,
                fullName: receptionistName.fullName,
                hospitalCode: hospital.code,
                contactNo: receptionistData.contactNo,
                employeeId: employeeId,
                address: receptionistData.address
            });
            
            await receptionist.save();
            console.log(`Created receptionist: ${receptionistName.fullName}`);
            
            // Generate and save receptionist PDF
            const receptionistPdf = await generateReceptionistPDF(receptionistData, hospital);
            
            // For each department, create 1 doctor and 5 patients
            for (const department of departments) {
                console.log(`Processing department: ${department.name}`);
                
                // Create 1 doctor per department
                const doctorName = getRandomName();
                const doctorEmail = generateProfessionalEmail(doctorName.firstName, doctorName.lastName, hospital.emailDomain);
                const doctorPassword = getRandomPassword();
                
                // Create user for doctor
                const doctorUser = new User({
                    username: doctorEmail.split('@')[0],
                    email: doctorEmail,
                    password: doctorPassword,
                    role: 'Doctor',
                    hospitalCode: hospital.code,
                    departmentCode: department.code
                });
                
                await doctorUser.save();
                
                // Create doctor
                const licenseNo = `DOC-${hospital.code.substring(0, 2)}-${department.code.substring(0, 3)}-${getRandomNumber(1000, 9999)}`;
                const doctorData = {
                    fullName: doctorName.fullName,
                    email: doctorEmail,
                    password: doctorPassword,
                    contactNo: getRandomPhone(),
                    address: getRandomAddress(),
                    licenseNo: licenseNo
                };
                
                const doctor = new Doctor({
                    userId: doctorUser._id,
                    fullName: doctorName.fullName,
                    hospitalCode: hospital.code,
                    departmentCode: department.code,
                    contactNo: doctorData.contactNo,
                    licenseNo: licenseNo,
                    specialization: department.name
                });
                
                await doctor.save();
                console.log(`Created doctor: ${doctorName.fullName}`);
                
                // Generate and save doctor PDF
                const doctorPdf = await generateDoctorPDF(doctorData, hospital, department);
                
                // Create 5 patients per department
                for (let i = 1; i <= 5; i++) {
                    const patientName = getRandomName();
                    const patientEmail = generatePatientEmail(patientName.firstName, patientName.lastName);
                    const patientPassword = getRandomPassword();
                    
                    // Create unique access code
                    let accessCode;
                    let isUnique = false;
                    
                    // Keep generating until we get a unique access code
                    while (!isUnique) {
                        accessCode = `${department.code.substring(0, 2)}${getRandomNumber(10, 99)}${hospital.code.substring(0, 2)}${getRandomNumber(10, 99)}`;
                        
                        // Check if this access code already exists
                        const existingPatient = await Patient.findOne({ accessCode });
                        if (!existingPatient) {
                            isUnique = true;
                        }
                    }
                    
                    // Create user for patient
                    const patientUser = new User({
                        username: patientEmail.split('@')[0],
                        email: patientEmail,
                        password: patientPassword,
                        role: 'Patient'
                    });
                    
                    await patientUser.save();
                    
                    // Create patient data
                    const dateOfBirth = getRandomDate(new Date(1975, 0, 1), new Date(2005, 0, 1));
                    const age = new Date().getFullYear() - dateOfBirth.getFullYear();
                    
                    const patientData = {
                        fullName: patientName.fullName,
                        email: patientEmail,
                        password: patientPassword, // Storing plain password only for PDF generation
                        gender: getRandomElement(genders),
                        age: age,
                        dateOfBirth: dateOfBirth,
                        bloodGroup: getRandomElement(bloodGroups),
                        contactNo: getRandomPhone(),
                        emergencyContact: getRandomPhone(),
                        address: getRandomAddress(),
                        height: getRandomNumber(150, 190),
                        weight: getRandomNumber(45, 95),
                        aadhaarNumber: `${getRandomNumber(100000000000, 999999999999)}`,
                        medicalCondition: getRandomElement(medicalConditions),
                        conditionDate: getRandomDate(new Date(2020, 0, 1), new Date()),
                        surgery: getRandomElement(surgeries),
                        allergy: getRandomElement(allergies),
                        accessCode: accessCode,
                        patientId: `${department.code.substring(0, 2)}${hospital.code.substring(0, 2)}${String(i).padStart(3, '0')}`
                    };
                    
                    // Create patient
                    const patient = new Patient({
                        userId: patientUser._id,
                        fullName: patientName.fullName,
                        dateOfBirth: dateOfBirth,
                        contactNo: patientData.contactNo,
                        address: patientData.address,
                        accessCode: accessCode
                    });
                    
                    await patient.save();
                    console.log(`Created patient: ${patientName.fullName}`);
                    
                    // Generate and save patient PDF
                    const patientPdf = await generatePatientPDF(patientData, hospital, department);
                    
                    // Save PDF document to database
                    const medicalDocument = new MedicalDocument({
                        patientId: patient._id,
                        filename: patientPdf.fileName,
                        originalname: patientPdf.fileName,
                        mimetype: 'application/pdf',
                        size: fs.statSync(patientPdf.filePath).size,
                        fileData: patientPdf.fileData,
                        documentType: 'Other',
                        description: 'Patient Credentials PDF'
                    });
                    
                    await medicalDocument.save();
                }
            }
        }
        
        console.log("Data generation completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error generating mock data:", error);
        process.exit(1);
    }
}

// Execute the data generation
console.log("Starting mock data generation script...");
console.log("This will generate 5 patients, 1 doctor per department, and 1 receptionist per hospital.");
generateMockData(); 