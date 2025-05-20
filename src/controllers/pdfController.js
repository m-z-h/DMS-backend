const Patient = require('../models/Patient');
const User = require('../models/User');
const { generatePDF } = require('../utils/pdfGenerator');

// Generate credentials PDF for patients
exports.generateCredentialsPDF = async (req, res) => {
  try {
    // Only patients can generate credentials
    if (req.user.role !== 'Patient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only patients can access their credentials.'
      });
    }

    // Get patient details
    const patient = await Patient.findOne({ userId: req.user.id }).populate('userId', 'username email');
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Get user details for username and password
    const user = await User.findById(req.user.id).select('username');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate PDF with patient credentials
    const pdfBuffer = await generatePDF({
      reportType: 'credentials',
      patientName: patient.fullName,
      patientId: patient._id,
      username: user.username,
      password: '******',
      accessCode: patient.accessCode
    });
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=credentials_${patient._id}.pdf`);
    
    // Send PDF data
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating credentials PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 