const express = require('express');
const { 
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getHospitals,
  addHospital,
  updateHospital,
  getDepartments,
  addDepartment,
  updateDepartment,
  getSystemStats,
  generateReport,
  toggleUserStatus,
  getAuditLogs,
  getDashboardAnalytics
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection middleware to all routes
// Only allow admin to access these routes
router.use(protect);
router.use(authorize('Admin'));

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/status', toggleUserStatus);

// Hospital management routes
router.get('/hospitals', getHospitals);
router.post('/hospitals', addHospital);
router.put('/hospitals/:code', updateHospital);

// Department management routes
router.get('/departments', getDepartments);
router.post('/departments', addDepartment);
router.put('/departments/:code', updateDepartment);

// Analytics routes
router.get('/analytics', getDashboardAnalytics);

// Audit logs routes
router.get('/audit-logs', getAuditLogs);

// Reporting and statistics routes
router.get('/stats', getSystemStats);
router.get('/reports/:type', generateReport);

module.exports = router; 