const Session = require('../models/Session');
const mongoose = require('mongoose');

// Get session analytics only - remove cleanup functions
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

// Export only what's needed
module.exports = { getSessionAnalytics };
