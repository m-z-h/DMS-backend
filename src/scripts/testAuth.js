const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper function to log messages
const log = {
  info: (message) => console.log(`${colors.blue}INFO:${colors.reset} ${message}`),
  success: (message) => console.log(`${colors.green}SUCCESS:${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}ERROR:${colors.reset} ${message}`),
  warn: (message) => console.log(`${colors.yellow}WARNING:${colors.reset} ${message}`),
  section: (message) => console.log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}\n`)
};

// Test data
const testDoctorData = {
  username: 'testdoctor',
  email: 'testdoctor@manipal.com', // Make sure this matches a hospital's email domain
  password: 'Password123!',
  role: 'Doctor',
  fullName: 'Dr. Test Doctor',
  hospitalCode: 'MH1', // Manipal Hospital code
  departmentCode: 'MH1_CARDIO', // Cardiology department code
  contactNo: '+919876543210',
  licenseNo: 'MED12345',
  specialization: 'Cardiology'
};

const testReceptionistData = {
  username: 'testreceptionist',
  email: 'testreceptionist@manipal.com', // Make sure this matches a hospital's email domain
  password: 'Password123!',
  role: 'Receptionist',
  fullName: 'Test Receptionist',
  hospitalCode: 'MH1', // Manipal Hospital code
  contactNo: '+919876543211',
  employeeId: 'MH1-REC-1234'
};

const testPatientData = {
  email: 'testpatient@gmail.com',
  password: 'Password123!' // This won't be used for registration but for login
};

// Test functions
async function testDoctorRegistration() {
  log.section('Testing Doctor Registration');
  
  try {
    log.info('Attempting to register a new doctor...');
    const response = await axios.post(`${API_URL}/auth/register`, testDoctorData);
    
    log.success('Doctor registration successful!');
    log.info(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    log.error('Doctor registration failed!');
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(JSON.stringify(error.response.data, null, 2));
    } else {
      log.error(error.message);
    }
    return null;
  }
}

async function testReceptionistRegistration() {
  log.section('Testing Receptionist Registration');
  
  try {
    log.info('Attempting to register a new receptionist...');
    const response = await axios.post(`${API_URL}/auth/register`, testReceptionistData);
    
    log.success('Receptionist registration successful!');
    log.info(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    log.error('Receptionist registration failed!');
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(JSON.stringify(error.response.data, null, 2));
    } else {
      log.error(error.message);
    }
    return null;
  }
}

async function testPatientRegistration() {
  log.section('Testing Patient Self-Registration (Should Fail)');
  
  try {
    log.info('Attempting to register a new patient directly (should be rejected)...');
    const response = await axios.post(`${API_URL}/auth/register`, {
      username: 'testpatient',
      email: testPatientData.email,
      password: testPatientData.password,
      role: 'Patient',
      fullName: 'Test Patient',
      dateOfBirth: '1990-01-01',
      contactNo: '+919876543212',
      address: '123 Test St'
    });
    
    log.warn('Patient registration unexpectedly succeeded (should have failed)!');
    log.info(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      log.success('Patient registration correctly rejected as expected!');
      log.info(JSON.stringify(error.response.data, null, 2));
    } else {
      log.error('Patient registration failed with unexpected error!');
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(JSON.stringify(error.response.data, null, 2));
      } else {
        log.error(error.message);
      }
    }
    return null;
  }
}

async function testLogin(role, credentials) {
  log.section(`Testing ${role} Login`);
  
  try {
    log.info(`Attempting to login as ${role}...`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: credentials.email,
      password: credentials.password
    });
    
    log.success(`${role} login successful!`);
    log.info(`User: ${response.data.user.email}, Role: ${response.data.user.role}`);
    return response.data;
  } catch (error) {
    log.error(`${role} login failed!`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(JSON.stringify(error.response.data, null, 2));
    } else {
      log.error(error.message);
    }
    return null;
  }
}

// Main test function
async function runTests() {
  log.section('Starting Authentication System Tests');
  
  // Test doctor registration
  await testDoctorRegistration();
  
  // Test receptionist registration
  await testReceptionistRegistration();
  
  // Test patient registration (should fail)
  await testPatientRegistration();
  
  // Test logins - usually these would fail since the accounts are pending approval
  // but we can include them to see the expected behavior
  await testLogin('Doctor', testDoctorData);
  await testLogin('Receptionist', testReceptionistData);
  
  // Test patient login
  // In a real system, this would require a patient already registered by a receptionist
  log.warn('Skipping patient login test as it requires a pre-registered patient');
  
  log.section('Auth System Tests Completed');
}

// Run the tests
runTests()
  .then(() => {
    log.success('All tests completed!');
    process.exit(0);
  })
  .catch(error => {
    log.error('Test execution failed:', error);
    process.exit(1);
  }); 