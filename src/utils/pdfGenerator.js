const PDFDocument = require('pdfkit');

/**
 * Generate a PDF document based on the report type
 * @param {Object} data - Data for the PDF
 * @param {string} data.reportType - Type of report ('credentials' or 'patientSummary')
 * @returns {Promise<Buffer>} PDF document as a buffer
 */
exports.generatePDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { reportType } = data;
      
      if (reportType === 'credentials') {
        return generateCredentialsPDF(data, resolve, reject);
      } else if (reportType === 'patientSummary') {
        return generateMedicalReportPDF(data, resolve, reject);
      } else {
        reject(new Error('Invalid report type'));
      }
    } catch (error) {
      reject(error);
    }
  });
}; 

/**
 * Generate a PDF with patient credentials
 * @private
 */
const generateCredentialsPDF = (data, resolve, reject) => {
  try {
    const { patientName, patientId, username, password, accessCode } = data;
    
    // Create a PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 72,
        right: 72
      }
    });
    
    // Collect the data in a buffer
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    
    // Add the document content
    
    // Header
    doc.fontSize(20)
       .fillColor('#0047AB')
       .text('Medical Data Management System', { align: 'center' })
       .moveDown();
       
    doc.fontSize(16)
       .fillColor('#0047AB')
       .text('Patient Credentials', { align: 'center' })
       .moveDown();
    
    // Current date
    doc.fontSize(10)
       .fillColor('#555')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
       .moveDown(2);
    
    // Patient info section
    doc.fontSize(14)
       .fillColor('#000')
       .text('Patient Information', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text(`Full Name: ${patientName}`)
       .text(`Patient ID: ${patientId}`)
       .moveDown(1.5);
    
    // Login credentials section
    doc.fontSize(14)
       .fillColor('#000')
       .text('Login Credentials', { underline: true })
       .moveDown();
       
    doc.fontSize(12)
       .fillColor('#333')
       .text(`Username: ${username}`)
       .text(`Temporary Password: ${password}`)
       .moveDown(1.5);
    
    // Access code section
    doc.fontSize(14)
       .fillColor('#000')
       .text('Access Code', { underline: true })
       .moveDown();
    
    doc.fontSize(12)
       .fillColor('#333')
       .text('Your access code is required for doctors to view your medical records. Please keep it secure and share only with authorized medical professionals.')
       .moveDown();
       
    doc.fontSize(16)
       .fillColor('#CC0000')
       .text(`${accessCode}`, { align: 'center' })
       .moveDown(2);
    
    // Footer
    doc.fontSize(10)
       .fillColor('#555')
       .text('IMPORTANT: Please change your temporary password after your first login.', { align: 'center' })
       .moveDown(0.5)
       .text('This document contains confidential information. Keep it secure.', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    reject(error);
  }
};

/**
 * Generate a comprehensive medical report PDF
 * @private
 */
const generateMedicalReportPDF = (data, resolve, reject) => {
  try {
    const { 
      patientName, 
      patientId, 
      dateOfBirth, 
      contactNo, 
      address,
      records,
      appointments,
      accessCode,
      generatedDate
    } = data;
    
    // Create a PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 72,
        right: 72
      },
      autoFirstPage: true
    });
    
    // Collect the data in a buffer
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    
    // Header
    doc.fontSize(20)
      .fillColor('#0047AB')
      .text('Medical Data Management System', { align: 'center' })
      .moveDown(0.5);
      
    doc.fontSize(16)
      .fillColor('#0047AB')
      .text('Patient Medical Summary', { align: 'center' })
      .moveDown();
    
    // Current date
    doc.fontSize(10)
      .fillColor('#555')
      .text(`Generated on: ${new Date(generatedDate).toLocaleDateString()}`, { align: 'right' })
      .moveDown(2);
    
    // Patient info section
    doc.rect(doc.x, doc.y, 450, 120).fillAndStroke('#f6f6f6', '#dddddd');
    
    doc.moveUp()
      .fontSize(14)
      .fillColor('#000')
      .text('Patient Information', { underline: true, indent: 10, continued: false, moveDown: 0.5 });
      
    doc.fontSize(12)
      .fillColor('#333')
      .text(`Full Name: ${patientName}`, { indent: 20 })
      .text(`Patient ID: ${patientId}`, { indent: 20 })
      .text(`Date of Birth: ${new Date(dateOfBirth).toLocaleDateString()}`, { indent: 20 })
      .text(`Contact: ${contactNo}`, { indent: 20 })
      .text(`Address: ${address}`, { indent: 20 })
      .moveDown(2);
    
    // Medical Records Section
    doc.fontSize(16)
      .fillColor('#0047AB')
      .text('Medical Records', { underline: true })
      .moveDown();
      
    if (records && records.length > 0) {
      records.forEach((record, index) => {
        doc.fontSize(12)
          .fillColor('#000')
          .text(`Record #${index + 1} - ${new Date(record.createdAt).toLocaleDateString()}`, { underline: true })
          .moveDown(0.3);
          
        doc.fontSize(11)
          .fillColor('#333')
          .text(`Hospital: ${record.hospitalCode || 'N/A'}`, { indent: 10 })
          .text(`Department: ${record.departmentCode || 'N/A'}`, { indent: 10 })
          .text(`Doctor: ${record.doctorId?.fullName || 'Unknown'}`, { indent: 10 })
          .text(`Diagnosis: ${record.diagnosis || 'N/A'}`, { indent: 10 })
          .moveDown(0.3);
          
        if (record.prescription) {
          doc.text(`Prescription: ${record.prescription}`, { indent: 10 });
        }
        
        if (record.notes) {
          doc.text(`Notes: ${record.notes}`, { indent: 10 });
        }
        
        // Render vitals if available
        if ((record.vitalSigns && (record.vitalSigns.temperature || record.vitalSigns.bloodPressure || 
                             record.vitalSigns.heartRate || record.vitalSigns.oxygenSaturation)) || 
            (record.vital && (record.vital.temperature || record.vital.bloodPressure || 
                            record.vital.heartRate || record.vital.sugarLevel))) {
          doc.moveDown(0.3)
            .fontSize(11)
            .text('Vital Signs:', { indent: 10, underline: true });
            
          // Handle either vitalSigns (new format) or vital (old format)
          if (record.vitalSigns?.temperature) 
            doc.text(`Temperature: ${record.vitalSigns.temperature}°C`, { indent: 20 });
          else if (record.vital?.temperature) 
            doc.text(`Temperature: ${record.vital.temperature}°C`, { indent: 20 });
            
          if (record.vitalSigns?.bloodPressure && typeof record.vitalSigns.bloodPressure === 'object') 
            doc.text(`Blood Pressure: ${record.vitalSigns.bloodPressure.systolic || '-'}/${record.vitalSigns.bloodPressure.diastolic || '-'} mmHg`, { indent: 20 });
          else if (record.vital?.bloodPressure) 
            doc.text(`Blood Pressure: ${record.vital.bloodPressure}`, { indent: 20 });
            
          if (record.vitalSigns?.heartRate) 
            doc.text(`Heart Rate: ${record.vitalSigns.heartRate} bpm`, { indent: 20 });
          else if (record.vital?.heartRate) 
            doc.text(`Heart Rate: ${record.vital.heartRate} bpm`, { indent: 20 });
            
          if (record.vital?.sugarLevel) 
            doc.text(`Blood Sugar: ${record.vital.sugarLevel} mg/dL`, { indent: 20 });
            
          if (record.vitalSigns?.respiratoryRate) 
            doc.text(`Respiratory Rate: ${record.vitalSigns.respiratoryRate} breaths/min`, { indent: 20 });
            
          if (record.vitalSigns?.oxygenSaturation) 
            doc.text(`Oxygen Saturation: ${record.vitalSigns.oxygenSaturation}%`, { indent: 20 });
            
          if (record.vitalSigns?.weight) 
            doc.text(`Weight: ${record.vitalSigns.weight} kg`, { indent: 20 });
            
          if (record.vitalSigns?.height) 
            doc.text(`Height: ${record.vitalSigns.height} cm`, { indent: 20 });
        }
        
        // Render lab results if available
        if (record.labResults && record.labResults.length > 0) {
          doc.moveDown(0.3)
            .fontSize(11)
            .text('Laboratory Results:', { indent: 10, underline: true });
            
          record.labResults.forEach(lab => {
            doc.text(`${lab.testName}: ${lab.testValue} (Normal Range: ${lab.normalRange || 'N/A'})`, { indent: 20 });
          });
        }
        
        doc.moveDown();
      });
    } else {
      doc.fontSize(11)
        .text('No medical records found.');
    }
    
    // Upcoming Appointments Section
    if (appointments && appointments.length > 0) {
      doc.addPage();
      
      doc.fontSize(16)
        .fillColor('#0047AB')
        .text('Upcoming Appointments', { underline: true })
        .moveDown();
        
      appointments.forEach((apt, index) => {
        doc.fontSize(11)
          .fillColor('#333')
          .text(`${new Date(apt.date).toLocaleDateString()} at ${apt.time}`, { indent: 10, continued: true })
          .fillColor('#0047AB')
          .text(` - ${apt.status}`, { indent: 0, continued: false })
          .fillColor('#333')
          .text(`Doctor: ${apt.doctorId?.fullName || 'Unknown'}`, { indent: 10 })
          .text(`Department: ${apt.departmentCode || 'N/A'}`, { indent: 10 })
          .text(`Reason: ${apt.reason || 'No reason provided'}`, { indent: 10 })
          .moveDown();
      });
    }
    
    // Footer with legal disclaimer
    const pageHeight = doc.page.height;
    doc.fontSize(10)
      .fillColor('#555')
      .text(
        'CONFIDENTIAL: This medical report contains private health information protected by law. Unauthorized disclosure is prohibited.',
        doc.x,
        pageHeight - 100,
        { align: 'center', width: 450 }
      );
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    reject(error);
  }
}; 