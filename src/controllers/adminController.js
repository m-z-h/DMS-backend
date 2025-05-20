const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const { generatePDF } = require('../utils/pdfGenerator');
const Audit = require('../models/Audit');

// USER MANAGEMENT
// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const { role, limit = 10, page = 1 } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    
    // Get paginated results
    const options = {
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      sort: { createdAt: -1 },
      populate: [
        { path: 'doctors', select: 'fullName hospitalCode departmentCode' },
        { path: 'patients', select: 'fullName dateOfBirth contactNo' }
      ]
    };
    
    // Execute query with pagination
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // For each user, get their profile if exists
    const enhancedUsers = await Promise.all(users.map(async user => {
      const userData = user.toObject();
      
      if (user.role === 'Doctor') {
        userData.profile = await Doctor.findOne({ userId: user._id });
      } else if (user.role === 'Patient') {
        userData.profile = await Patient.findOne({ userId: user._id });
      }
      
      return userData;
    }));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: enhancedUsers
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get a specific user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get profile data if exists
    let profile = null;
    if (user.role === 'Doctor') {
      profile = await Doctor.findOne({ userId: user._id });
    } else if (user.role === 'Patient') {
      profile = await Patient.findOne({ userId: user._id });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      role, 
      fullName, 
      hospitalCode, 
      departmentCode,
      dateOfBirth,
      contactNo,
      address,
      licenseNo 
    } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or Email already in use'
      });
    }
    
    // Validate hospital code if doctor
    if (role === 'Doctor') {
      if (!hospitalCode || !departmentCode) {
        return res.status(400).json({
          success: false,
          message: 'Hospital and department codes are required for doctors'
        });
      }
      
      // Check if hospital and department exist
      const hospital = await Hospital.findOne({ code: hospitalCode });
      if (!hospital) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hospital code'
        });
      }
      
      const department = await Department.findOne({ code: departmentCode });
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department code'
        });
      }
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role,
      hospitalCode: role === 'Doctor' ? hospitalCode : undefined,
      departmentCode: role === 'Doctor' ? departmentCode : undefined
    });
    
    // Create role-specific profile
    let profile = null;
    if (role === 'Doctor') {
      profile = await Doctor.create({
        userId: user._id,
        fullName,
        hospitalCode,
        departmentCode,
        contactNo,
        licenseNo
      });
    } else if (role === 'Patient') {
      // Generate access code for patient
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      profile = await Patient.create({
        userId: user._id,
        fullName,
        dateOfBirth,
        contactNo,
        address,
        accessCode
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if email or username is being updated and is already in use
    if (updateData.email || updateData.username) {
      const query = { _id: { $ne: id } };
      if (updateData.email) query.email = updateData.email;
      if (updateData.username) query.username = updateData.username;
      
      const existingUser = await User.findOne(query);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or Email already in use'
        });
      }
    }
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    // Update profile if needed
    let profile = null;
    const {
      fullName,
      dateOfBirth,
      contactNo,
      address,
      licenseNo,
      hospitalCode,
      departmentCode
    } = req.body;
    
    const profileUpdates = {};
    if (fullName) profileUpdates.fullName = fullName;
    if (contactNo) profileUpdates.contactNo = contactNo;
    
    if (user.role === 'Doctor') {
      if (hospitalCode) profileUpdates.hospitalCode = hospitalCode;
      if (departmentCode) profileUpdates.departmentCode = departmentCode;
      if (licenseNo) profileUpdates.licenseNo = licenseNo;
      
      if (Object.keys(profileUpdates).length > 0) {
        profile = await Doctor.findOneAndUpdate(
          { userId: user._id },
          { $set: profileUpdates },
          { new: true, runValidators: true }
        );
      }
    } else if (user.role === 'Patient') {
      if (dateOfBirth) profileUpdates.dateOfBirth = dateOfBirth;
      if (address) profileUpdates.address = address;
      
      if (Object.keys(profileUpdates).length > 0) {
        profile = await Patient.findOneAndUpdate(
          { userId: user._id },
          { $set: profileUpdates },
          { new: true, runValidators: true }
        );
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
        profile
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't allow deleting the last admin
    if (user.role === 'Admin') {
      const adminCount = await User.countDocuments({ role: 'Admin' });
      if (adminCount === 1) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete the only admin account'
        });
      }
    }
    
    // Delete profile based on role
    if (user.role === 'Doctor') {
      await Doctor.findOneAndDelete({ userId: id });
      // TODO: Handle dependent records like appointments
    } else if (user.role === 'Patient') {
      await Patient.findOneAndDelete({ userId: id });
      // TODO: Handle dependent records like medical records
    }
    
    // Delete the user
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// HOSPITAL MANAGEMENT
// Get all hospitals
exports.getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find().sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Error getting hospitals:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Add a hospital
exports.addHospital = async (req, res) => {
  try {
    const { name, code, emailDomain, address, contactInfo } = req.body;
    
    // Check if hospital code already exists
    const existingHospital = await Hospital.findOne({ code });
    if (existingHospital) {
      return res.status(400).json({
        success: false,
        message: 'Hospital code already in use'
      });
    }
    
    // Create hospital
    const hospital = await Hospital.create({
      name,
      code,
      emailDomain,
      address,
      contactInfo
    });
    
    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Error adding hospital:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update hospital
exports.updateHospital = async (req, res) => {
  try {
    const { code } = req.params;
    const updateData = req.body;
    
    // Find hospital
    const hospital = await Hospital.findOne({ code });
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    // Don't allow changing the hospital code
    delete updateData.code;
    
    // Update the hospital
    const updatedHospital = await Hospital.findByIdAndUpdate(
      hospital._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedHospital
    });
  } catch (error) {
    console.error('Error updating hospital:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// DEPARTMENT MANAGEMENT
// Get all departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Add a department
exports.addDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    // Check if department code already exists
    const existingDepartment = await Department.findOne({ code });
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department code already in use'
      });
    }
    
    // Create department
    const department = await Department.create({
      name,
      code,
      description
    });
    
    res.status(201).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const { code } = req.params;
    const updateData = req.body;
    
    // Find department
    const department = await Department.findOne({ code });
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    // Don't allow changing the department code
    delete updateData.code;
    
    // Update the department
    const updatedDepartment = await Department.findByIdAndUpdate(
      department._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedDepartment
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// STATISTICS AND REPORTING
// Get system statistics
exports.getSystemStats = async (req, res) => {
  try {
    const stats = {
      users: {
        total: await User.countDocuments(),
        doctors: await User.countDocuments({ role: 'Doctor' }),
        patients: await User.countDocuments({ role: 'Patient' }),
        admins: await User.countDocuments({ role: 'Admin' })
      },
      hospitals: await Hospital.countDocuments(),
      departments: await Department.countDocuments(),
      records: await MedicalRecord.countDocuments(),
      appointments: {
        total: await Appointment.countDocuments(),
        scheduled: await Appointment.countDocuments({ status: 'Scheduled' }),
        confirmed: await Appointment.countDocuments({ status: 'Confirmed' }),
        completed: await Appointment.countDocuments({ status: 'Completed' }),
        cancelled: await Appointment.countDocuments({ status: 'Cancelled' })
      }
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Generate report
exports.generateReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    let reportData = {};
    let reportTitle = '';
    
    // Parse dates if provided
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    switch (type) {
      case 'user-distribution':
        reportTitle = 'User Distribution Report';
        
        // Get user counts by role
        const userCounts = await User.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        
        reportData.userDistribution = userCounts.map(item => ({
          role: item._id,
          count: item.count
        }));
        
        // Get doctors by hospital
        const doctorsByHospital = await Doctor.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$hospitalCode', count: { $sum: 1 } } }
        ]);
        
        reportData.doctorsByHospital = doctorsByHospital;
        
        break;
        
      case 'appointment-trends':
        reportTitle = 'Appointment Trends Report';
        
        // Get appointment counts by status
        const appointmentCounts = await Appointment.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        reportData.appointmentsByStatus = appointmentCounts.map(item => ({
          status: item._id,
          count: item.count
        }));
        
        // Get appointments by date
        const appointmentsByDate = await Appointment.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        reportData.appointmentsByDate = appointmentsByDate.map(item => ({
          date: item._id,
          count: item.count
        }));
        
        break;
        
      case 'medical-records-analysis':
        reportTitle = 'Medical Records Analysis Report';
        
        // Get record counts by type
        const recordCounts = await MedicalRecord.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$recordType', count: { $sum: 1 } } }
        ]);
        
        reportData.recordsByType = recordCounts.map(item => ({
          type: item._id,
          count: item.count
        }));
        
        // Get records by hospital
        const recordsByHospital = await MedicalRecord.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$hospitalCode', count: { $sum: 1 } } }
        ]);
        
        reportData.recordsByHospital = recordsByHospital;
        
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }
    
    // Generate PDF report
    const pdfBuffer = await generatePDF({
      reportType: 'adminReport',
      title: reportTitle,
      data: reportData,
      dateRange: { startDate, endDate },
      generatedDate: new Date()
    });
    
    // Return PDF data
    res.status(200).json({
      success: true,
      data: {
        pdfData: pdfBuffer.toString('base64'),
        filename: `${type}_report.pdf`,
        reportData // Also return JSON data for UI rendering
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Toggle user status (active/inactive)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Toggle the active status
    user.active = !user.active;
    await user.save();
    
    // Create audit log for this action
    const { createAuditLog } = require('../middleware/audit');
    await createAuditLog(
      req.user,
      'UPDATE',
      'USER',
      user._id.toString(),
      `User status changed to ${user.active ? 'active' : 'inactive'}`,
      { userId: user._id, newStatus: user.active }
    );
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get audit logs with filtering and pagination
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      startDate,
      endDate,
      limit = 20,
      page = 1
    } = req.query;
    
    const query = {};
    
    // Add filters to query if provided
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    
    // Add date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        // Set to end of day for the endDate
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDateTime;
      }
    }
    
    // Execute query with pagination
    const logs = await Audit.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'username email role');
    
    // Get total count for pagination
    const total = await Audit.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: logs
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get dashboard analytics - counts and stats for all entity types
exports.getDashboardAnalytics = async (req, res) => {
  try {
    // Run all queries in parallel using Promise.all for better performance
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      totalPatients,
      totalDoctors,
      totalHospitals,
      totalDepartments,
      totalAppointments,
      totalMedicalRecords,
      patientsByAgeGroup,
      appointmentsLastMonth,
      recentUsers
    ] = await Promise.all([
      // User related counts
      User.countDocuments(),
      User.countDocuments({ active: true }),
      User.countDocuments({ active: false }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      
      // Other entity counts
      Patient.countDocuments(),
      Doctor.countDocuments(),
      Hospital.countDocuments(),
      Department.countDocuments(),
      Appointment.countDocuments(),
      MedicalRecord.countDocuments(),
      
      // Age distribution for patients
      Patient.aggregate([
        {
          $project: {
            ageGroup: {
              $switch: {
                branches: [
                  { case: { $lt: [{ $subtract: [new Date(), '$dateOfBirth'] }, 568036800000] }, then: '0-18' }, // < 18 years
                  { case: { $lt: [{ $subtract: [new Date(), '$dateOfBirth'] }, 1136073600000] }, then: '18-36' }, // 18-36 years
                  { case: { $lt: [{ $subtract: [new Date(), '$dateOfBirth'] }, 1892160000000] }, then: '36-60' }, // 36-60 years
                ],
                default: '60+'
              }
            }
          }
        },
        { $group: { _id: '$ageGroup', count: { $sum: 1 } } }
      ]),
      
      // Appointments last month
      Appointment.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Recently registered users (limit to 5)
      User.find().sort({ createdAt: -1 }).limit(5)
    ]);
    
    // Format the role counts into a more usable object
    const roleDistribution = {};
    usersByRole.forEach(role => {
      roleDistribution[role._id] = role.count;
    });
    
    // Format the analytics response
    const analytics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        roleDistribution
      },
      entities: {
        patients: totalPatients,
        doctors: totalDoctors,
        hospitals: totalHospitals,
        departments: totalDepartments,
        appointments: totalAppointments,
        medicalRecords: totalMedicalRecords
      },
      demographics: {
        patientsByAgeGroup: patientsByAgeGroup.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {})
      },
      trends: {
        appointmentsLastMonth: appointmentsLastMonth.reduce((obj, item) => {
          obj[item._id] = item.count;
          return obj;
        }, {})
      },
      recent: {
        users: recentUsers
      }
    };
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 