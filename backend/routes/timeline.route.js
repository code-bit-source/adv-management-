import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  addEvent,
  getTimeline,
  getEventById,
  updateEvent,
  deleteEvent,
  addHearing,
  getHearings,
  completeHearing,
  postponeHearing,
  getMilestones,
  markAsMilestone,
  getUpcomingEvents
} from "../controller/timeline.controller.js";

const timelineRoute = express.Router();

// ==================== TIMELINE EVENTS ====================

// Add timeline event (Advocate/Admin only)
timelineRoute.post(
  "/cases/:caseId/timeline",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  addEvent
);

// Get timeline for a case (All authenticated users with access)
timelineRoute.get(
  "/cases/:caseId/timeline",
  verifyToken,
  getTimeline
);

// Get upcoming events for a case
timelineRoute.get(
  "/cases/:caseId/timeline/upcoming",
  verifyToken,
  getUpcomingEvents
);

// Get milestones for a case
timelineRoute.get(
  "/cases/:caseId/milestones",
  verifyToken,
  getMilestones
);

// Get single event by ID
timelineRoute.get(
  "/timeline/:eventId",
  verifyToken,
  getEventById
);

// Update timeline event (Advocate/Admin only)
timelineRoute.put(
  "/timeline/:eventId",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  updateEvent
);

// Delete timeline event (Advocate/Admin only)
timelineRoute.delete(
  "/timeline/:eventId",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  deleteEvent
);

// Mark event as milestone (Advocate/Admin only)
timelineRoute.put(
  "/timeline/:eventId/milestone",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  markAsMilestone
);

// ==================== HEARINGS ====================

// Add hearing (Advocate/Admin only)
timelineRoute.post(
  "/cases/:caseId/hearings",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  addHearing
);

// Get hearings for a case
timelineRoute.get(
  "/cases/:caseId/hearings",
  verifyToken,
  getHearings
);

// Mark hearing as completed (Advocate/Admin only)
timelineRoute.put(
  "/hearings/:eventId/complete",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  completeHearing
);

// Postpone hearing (Advocate/Admin only)
timelineRoute.put(
  "/hearings/:eventId/postpone",
  verifyToken,
  authorizeRoles('advocate', 'admin'),
  postponeHearing
);

export default timelineRoute;
