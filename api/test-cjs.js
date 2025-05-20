// Simple standalone test endpoint (CommonJS)
module.exports = (req, res) => {
  res.status(200).json({
    message: 'CommonJS test endpoint is working',
    timestamp: new Date().toISOString()
  });
}; 