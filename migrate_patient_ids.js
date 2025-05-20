const mongoose = require('mongoose');
const path = require('path');

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
const Patient = require('./src/models/Patient');
const Hospital = require('./src/models/Hospital');
const Department = require('./src/models/Department');
const MedicalRecord = require('./src/models/MedicalRecord');

// Main migration function
async function migratePatientIds() {
  try {
    console.log("Starting patient ID migration...");
    
    // Find all existing patients
    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients to process`);
    
    for (const patient of patients) {
      console.log(`Processing patient: ${patient._id} (${patient.fullName})`);
      
      // Find all medical records for this patient
      const medicalRecords = await MedicalRecord.find({ patientId: patient._id });
      
      if (medicalRecords.length > 0) {
        // Get the first record to extract department and hospital codes
        const firstRecord = medicalRecords[0];
        const hospitalCode = firstRecord.hospitalCode;
        const departmentCode = firstRecord.departmentCode;
        
        // Get department info
        const department = await Department.findOne({ code: departmentCode });
        const departmentShortCode = departmentCode.split('_')[1] || departmentCode.substring(0, 2);
        
        // Create special ID in format MHMH003 (dept+hospital+sequential number)
        const oldFormatId = `${departmentShortCode.substring(0, 2)}${hospitalCode.substring(0, 2)}${String(patients.indexOf(patient) + 1).padStart(3, '0')}`;
        
        console.log(`Generated legacy ID for patient: ${oldFormatId}`);
        
        // Update patient with old access code
        patient.oldAccessCode = oldFormatId;
        await patient.save();
        
        // Add specialId to medical records
        for (const record of medicalRecords) {
          record.specialId = oldFormatId;
          await record.save();
          console.log(`Updated medical record ${record._id} with specialId ${oldFormatId}`);
        }
      } else {
        console.log(`No medical records found for patient ${patient._id}, skipping`);
      }
    }
    
    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migratePatientIds(); 