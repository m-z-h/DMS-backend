const mongoose = require('mongoose');

// Helper function to check if doctor has access to patient
exports.checkPatientAccess = async (doctorId, patientId) => {
  try {
    const AccessGrant = mongoose.model('AccessGrant');

    // Check for direct access grant - this is the primary way to determine if doctor has access
    const grant = await AccessGrant.findOne({
      doctorId,
      patientId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (grant) {
      return { 
        hasAccess: true,
        accessLevel: grant.accessLevel 
      };
    }

    // If no active grant is found, doctor should NOT have access
    return { hasAccess: false };
  } catch (error) {
    console.error('Error checking patient access:', error);
    return { hasAccess: false };
  }
}; 