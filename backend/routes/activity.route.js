import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getCaseActivities,
  getCaseTimeline,
  getActivityStats,
  getUserActivity,
  getActivityById,
  getRecentActivities,
  getActivitiesByType,
  deleteActivity
} from '../controller/activity.controller.js';

const activityRoute = express.Router();

// ==================== GET CASE ACTIVITIES ====================
// Get all activities for a specific case (with filters and pagination)
activityRoute.get(
  '/cases/:caseId/activities',
  verifyToken,
  getCaseActivities
);

// ==================== GET CASE TIMELINE ====================
// Get complete timeline for a case (grouped by date)
activityRoute.get(
  '/cases/:caseId/timeline',
  verifyToken,
  getCaseTimeline
);

// ==================== GET ACTIVITY STATISTICS ====================
// Get activity statistics for a case
activityRoute.get(
  '/cases/:caseId/stats',
  verifyToken,
  getActivityStats
);

// ==================== GET USER ACTIVITY ====================
// Get current user's activity history
activityRoute.get(
  '/my-activity',
  verifyToken,
  getUserActivity
);

// ==================== GET RECENT ACTIVITIES ====================
// Get recent activities across all accessible cases
activityRoute.get(
  '/recent',
  verifyToken,
  getRecentActivities
);

// ==================== GET ACTIVITIES BY TYPE ====================
// Get activities filtered by type
activityRoute.get(
  '/type/:type',
  verifyToken,
  getActivitiesByType
);

// ==================== GET ACTIVITY BY ID ====================
// Get single activity details
activityRoute.get(
  '/:id',
  verifyToken,
  getActivityById
);

// ==================== DELETE ACTIVITY ====================
// Delete activity (admin only)
activityRoute.delete(
  '/:id',
  verifyToken,
  authorizeRoles('admin'),
  deleteActivity
);

export default activityRoute;
