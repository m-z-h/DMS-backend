const Audit = require('../models/Audit');

/**
 * Middleware to log audit activities
 */
exports.logActivity = async (req, res, next) => {
  // Keep original end function 
  const originalEnd = res.end;
  
  // Override end function to capture response
  res.end = function(chunk, encoding) {
    // Restore original end
    res.end = originalEnd;
    
    // Call original end
    res.end(chunk, encoding);
    
    // Skip logging for unauthenticated requests or auth-related endpoints
    if (!req.user || req.originalUrl.includes('/api/auth')) return;
    
    // Create audit entry asynchronously (don't block response)
    setTimeout(async () => {
      try {
        // Determine action type based on HTTP method
        let action;
        switch (req.method) {
          case 'GET': action = 'READ'; break;
          case 'POST': action = 'CREATE'; break;
          case 'PUT': 
          case 'PATCH': action = 'UPDATE'; break;
          case 'DELETE': action = 'DELETE'; break;
          default: action = 'OTHER';
        }
        
        // Determine entity type based on URL path
        const path = req.originalUrl;
        let entityType = 'SYSTEM';
        let entityId = null;
        
        // Extract entity type and ID from route
        if (path.includes('/api/auth')) {
          entityType = 'USER';
          action = path.includes('/login') ? 'LOGIN' : path.includes('/logout') ? 'LOGOUT' : action;
        } else if (path.includes('/api/users')) {
          entityType = 'USER';
          entityId = req.params.id || null;
        } else if (path.includes('/api/patients')) {
          entityType = 'PATIENT';
          entityId = req.params.id || null;
        } else if (path.includes('/api/doctors')) {
          entityType = 'DOCTOR';
          entityId = req.params.id || null;
        } else if (path.includes('/api/hospitals')) {
          entityType = 'HOSPITAL';
          entityId = req.params.code || null;
        } else if (path.includes('/api/departments')) {
          entityType = 'DEPARTMENT';
          entityId = req.params.code || null;
        } else if (path.includes('/api/files')) {
          entityType = 'FILE';
          entityId = req.params.id || null;
        } else if (path.includes('/api/appointments')) {
          entityType = 'APPOINTMENT';
          entityId = req.params.id || null;
        } else if (path.includes('/api/records')) {
          entityType = 'MEDICAL_RECORD';
          entityId = req.params.id || null;
        }
        
        // Create description based on action and entity type
        const description = `${action} operation on ${entityType.toLowerCase()}${entityId ? ` (ID: ${entityId})` : ''}`;
        
        // Create audit entry
        await Audit.create({
          userId: req.user._id,
          username: req.user.username,
          action,
          entityType,
          entityId,
          description,
          ipAddress: req.ip || req.connection.remoteAddress,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent']
          }
        });
      } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't throw error to avoid affecting response
      }
    }, 0);
  };
  
  next();
};

/**
 * Manual audit logger for custom events
 */
exports.createAuditLog = async (user, action, entityType, entityId, description, metadata = {}) => {
  try {
    // Skip creating log if no user is provided
    if (!user) {
      console.warn('Attempted to create audit log without user');
      return null;
    }
    
    return await Audit.create({
      userId: user._id,
      username: user.username,
      action,
      entityType,
      entityId,
      description,
      ipAddress: null, // Manual entries won't have IP address
      metadata
    });
  } catch (error) {
    console.error('Error creating manual audit log:', error);
    return null;
  }
}; 