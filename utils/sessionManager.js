const Session = require('../models/Session');
const mongoose = require('mongoose');

// Clean up expired sessions
const cleanupSessions = async () => {
  try {
    // Use more efficient bulk operations
    await Promise.all([
      Session.deleteMany({
        expiresAt: { $lt: new Date() }
      }),
      Session.deleteMany({
        lastActive: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      })
    ]);
  } catch (error) {
    console.error('[Session] Cleanup error:', error);
  }
};

// Get session analytics
const getSessionAnalytics = async () => {
  try {
    const analytics = await Session.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          averageSessionDuration: {
            $avg: { $subtract: ['$lastActive', '$loginTime'] }
          }
        }
      }
    ]);
    return analytics;
  } catch (error) {
    console.error('[Session] Analytics error:', error);
    return [];
  }
};

// Start periodic cleanup (every 15 minutes)
const startCleanupTask = () => {
  if (process.env.NODE_ENV !== 'production') {
    setInterval(cleanupSessions, 15 * 60 * 1000);
    console.log('[Session] Scheduled cleanup task started');
  }
};

module.exports = { cleanupSessions, getSessionAnalytics, startCleanupTask };
