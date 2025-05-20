const express = require('express');
const { 
  getMyPatients,
  getPatientRecords,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getMyAppointments,
  createAppointment,
  updateAppointmentStatus,
  accessCrossHospitalData,
  requestPatientAccess,
  getMyAccessRequests,
  getProfile,
  updateProfile,
  getMyHistoricalPatients
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection middleware to all routes
// Only allow doctors to access these routes
router.use(protect);
router.use(authorize('Doctor'));

// Debug logging
console.log('Doctor routes registered:');

// Profile management
console.log('GET /profile');
router.get('/profile', getProfile);
console.log('PUT /profile');
router.put('/profile', updateProfile);

// Patient routes
console.log('GET /patients');
router.get('/patients', getMyPatients);
console.log('GET /patients/historical');
router.get('/patients/historical', getMyHistoricalPatients);
console.log('GET /patients/:patientId/records');
router.get('/patients/:patientId/records', getPatientRecords);

// Medical record routes
console.log('POST /records');
router.post('/records', createMedicalRecord);
console.log('PUT /records/:id');
router.put('/records/:id', updateMedicalRecord);
console.log('DELETE /records/:id');
router.delete('/records/:id', deleteMedicalRecord);

// Appointment routes
console.log('GET /appointments');
router.get('/appointments', getMyAppointments);
console.log('POST /appointments');
router.post('/appointments', createAppointment);
console.log('PUT /appointments/:id/status');
router.put('/appointments/:id/status', updateAppointmentStatus);

// Cross-hospital data access
console.log('POST /access-cross-hospital');
router.post('/access-cross-hospital', accessCrossHospitalData);

// Patient access request routes
console.log('POST /patients/request-access');
router.post('/patients/request-access', requestPatientAccess);
console.log('GET /access-requests');
router.get('/access-requests', getMyAccessRequests);

module.exports = router; 