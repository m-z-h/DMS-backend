const express = require('express');
const { 
  getPatients,
  getDoctors,
  getAppointments,
  registerPatient,
  scheduleAppointment,
  getPatientPDF
} = require('../controllers/receptionistController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes need authentication and receptionist authorization
router.use(protect);
router.use(authorize('Receptionist'));

// Get all patients for a hospital
router.get('/patients', getPatients);

// Get all doctors for a hospital
router.get('/doctors', getDoctors);

// Get appointments for a hospital
router.get('/appointments', getAppointments);

// Register a new patient
router.post('/register-patient', registerPatient);

// Schedule a new appointment
router.post('/schedule-appointment', scheduleAppointment);

// Get patient credentials PDF
router.get('/patient-pdf/:patientId', getPatientPDF);

module.exports = router; 