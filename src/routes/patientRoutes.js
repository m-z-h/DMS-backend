const express = require('express');
const { 
  getMyRecords,
  getMyAppointments,
  requestAppointment,
  updatePersonalInfo,
  downloadMedicalReport,
  grantDoctorAccess,
  revokeDoctorAccess,
  getMyAccessGrants,
  getAccessRequests,
  respondToAccessRequest,
  generateNewAccessCode,
  getProfile,
  getDoctors
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection middleware to all routes
// Only allow patients to access these routes
router.use(protect);
router.use(authorize('Patient'));

// Profile management
router.get('/profile', getProfile);
router.put('/profile', updatePersonalInfo);

// Medical record routes
router.get('/records', getMyRecords);
router.get('/records/download', downloadMedicalReport);

// Appointment routes
router.get('/appointments', getMyAppointments);
router.post('/appointments/request', requestAppointment);
router.get('/doctors', getDoctors); // Get available doctors for appointments

// Access management
router.post('/access/grant', grantDoctorAccess);
router.delete('/access/revoke/:doctorId', revokeDoctorAccess);
router.get('/access/grants', getMyAccessGrants);

// Access request management
router.get('/access/requests', getAccessRequests);
router.put('/access/requests/:requestId', respondToAccessRequest);
router.post('/access/regenerate-code', generateNewAccessCode);

module.exports = router; 