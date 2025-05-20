const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
const Department = require('./models/Department');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Sample data
const hospitals = [
  {
    name: 'Manipal Hospital',
    code: 'MH1',
    emailDomain: 'manipal.com',
    address: {
      street: '123 Health Way',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560017',
      country: 'India'
    },
    contactInfo: {
      phone: '+91-9876543210',
      email: 'info@manipal.com',
      website: 'https://www.manipalhospitals.com'
    },
    isActive: true
  },
  {
    name: 'Apollo Hospital',
    code: 'AH2',
    emailDomain: 'apollo.com',
    address: {
      street: '456 Care Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600006',
      country: 'India'
    },
    contactInfo: {
      phone: '+91-9988776655',
      email: 'info@apollo.com',
      website: 'https://www.apollohospitals.com'
    },
    isActive: true
  },
  {
    name: 'Fortis Hospital',
    code: 'FH3',
    emailDomain: 'fortis.com',
    address: {
      street: '789 Medical Avenue',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India'
    },
    contactInfo: {
      phone: '+91-9876123450',
      email: 'info@fortis.com',
      website: 'https://www.fortishealthcare.com'
    },
    isActive: true
  },
  {
    name: 'Max Healthcare',
    code: 'MH4',
    emailDomain: 'maxhealthcare.com',
    address: {
      street: '245 Hospital Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India'
    },
    contactInfo: {
      phone: '+91-9745123890',
      email: 'info@maxhealthcare.com',
      website: 'https://www.maxhealthcare.com'
    },
    isActive: true
  },
  {
    name: 'AIIMS',
    code: 'AIIMS5',
    emailDomain: 'aiims.edu',
    address: {
      street: '101 Institute Avenue',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110029',
      country: 'India'
    },
    contactInfo: {
      phone: '+91-9876500001',
      email: 'info@aiims.edu',
      website: 'https://www.aiims.edu'
    },
    isActive: true
  }
];

// Department templates
// First 4 will be common across all hospitals
const commonDepartments = [
  {
    baseName: 'Cardiology',
    baseCode: 'CARDIO',
    description: 'Deals with disorders of the heart and cardiovascular system'
  },
  {
    baseName: 'Neurology',
    baseCode: 'NEURO',
    description: 'Deals with disorders of the nervous system'
  },
  {
    baseName: 'Orthopedics',
    baseCode: 'ORTHO',
    description: 'Deals with conditions involving the musculoskeletal system'
  },
  {
    baseName: 'General Medicine',
    baseCode: 'GEN',
    description: 'Deals with the diagnosis and treatment of various diseases'
  }
];

// Unique departments - one per hospital
const uniqueDepartments = [
  {
    baseName: 'Oncology',
    baseCode: 'ONCO',
    description: 'Deals with the prevention, diagnosis, and treatment of cancer'
  },
  {
    baseName: 'Pediatrics',
    baseCode: 'PED',
    description: 'Deals with the medical care of infants, children, and adolescents'
  },
  {
    baseName: 'Gynecology',
    baseCode: 'GYN',
    description: 'Deals with the health of the female reproductive system'
  },
  {
    baseName: 'Dermatology',
    baseCode: 'DERM',
    description: 'Deals with the diagnosis and treatment of skin disorders'
  },
  {
    baseName: 'ENT',
    baseCode: 'ENT',
    description: 'Deals with Ear, Nose, and Throat disorders'
  }
];

// Connect to MongoDB
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    // Don't delete users to preserve existing accounts
    // await User.deleteMany({});
    // await Doctor.deleteMany({});
    // await Patient.deleteMany({});
    await Hospital.deleteMany({});
    await Department.deleteMany({});

    // Seed hospitals
    console.log('Seeding hospitals...');
    const createdHospitals = await Hospital.insertMany(hospitals);
    
    console.log('Seeding departments for each hospital...');
    const allDepartments = [];
    
    // Create departments for each hospital
    for (let i = 0; i < createdHospitals.length; i++) {
      const hospital = createdHospitals[i];
      
      // Add the common departments to every hospital
      for (const deptTemplate of commonDepartments) {
        allDepartments.push({
          name: `${hospital.name} ${deptTemplate.baseName}`,
          code: `${hospital.code}_${deptTemplate.baseCode}`,
          description: deptTemplate.description,
          hospitalCode: hospital.code,
          isActive: true
        });
      }
      
      // Add one unique department to each hospital
      const uniqueDept = uniqueDepartments[i];
      allDepartments.push({
        name: `${hospital.name} ${uniqueDept.baseName}`,
        code: `${hospital.code}_${uniqueDept.baseCode}`,
        description: uniqueDept.description,
        hospitalCode: hospital.code,
        isActive: true
      });
    }

    // Insert all departments
    await Department.insertMany(allDepartments);
    console.log(`Created ${allDepartments.length} departments across ${createdHospitals.length} hospitals`);

    console.log('Database seeding complete!');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase(); 