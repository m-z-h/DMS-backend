const { registerPatient } = require('./registerPatient');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Sample patient data
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

// Replace with actual hospital and department codes
const hospitalCode = 'MH1';  // Manipal Hospital
const departmentCode = 'MH1_CARDIO';  // Cardiology department

// Test patient registration
async function testRegistration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    console.log('Registering patient...');
    const result = await registerPatient(samplePatientData, hospitalCode, departmentCode);

    console.log('Patient registered successfully:');
    console.log('Name:', result.patient.fullName);
    console.log('Patient ID:', result.patientId);
    console.log('Username:', result.user.username);
    console.log('Password:', result.user._plainPassword);
    console.log('Access Code:', result.patient.accessCode);
    console.log('PDF generated at:', result.pdfPath);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Failed to register patient:', error);
    process.exit(1);
  }
}

// Run the test
testRegistration(); 