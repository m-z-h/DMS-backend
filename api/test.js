// Simple standalone test endpoint
export default function handler(req, res) {
  res.status(200).json({
    message: 'This test endpoint is working',
    timestamp: new Date().toISOString()
  });
} 