import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  cancelReminder,
  snoozeReminder,
  dismissReminder,
  getUpcomingReminders,
  getCaseReminders,
  deleteOldReminders
} from '../controller/reminder.controller.js';

const reminderRoute = express.Router();

// ==================== CREATE REMINDER ====================
// Create a new reminder
reminderRoute.post("/", verifyToken, createReminder);

// ==================== GET REMINDERS ====================
// Get all reminders for the authenticated user
// Query params: page, limit, status, type
reminderRoute.get("/", verifyToken, getReminders);

// ==================== GET UPCOMING REMINDERS ====================
// Get upcoming reminders for the authenticated user
// Query params: days (default: 7)
reminderRoute.get("/upcoming", verifyToken, getUpcomingReminders);

// ==================== DELETE OLD REMINDERS (ADMIN) ====================
// Delete old reminders (admin only)
// Query params: days (default: 90)
reminderRoute.delete("/cleanup", verifyToken, authorizeRoles('admin'), deleteOldReminders);

// ==================== GET CASE REMINDERS ====================
// Get reminders for a specific case
// Query params: page, limit, status
reminderRoute.get("/cases/:caseId", verifyToken, getCaseReminders);

// ==================== GET REMINDER BY ID ====================
// Get single reminder by ID
reminderRoute.get("/:id", verifyToken, getReminderById);

// ==================== UPDATE REMINDER ====================
// Update reminder (only creator can update)
reminderRoute.put("/:id", verifyToken, updateReminder);

// ==================== CANCEL REMINDER ====================
// Cancel reminder (only creator can cancel)
reminderRoute.delete("/:id", verifyToken, cancelReminder);

// ==================== SNOOZE REMINDER ====================
// Snooze reminder (only recipients can snooze)
// Body: { duration: 60 } // duration in minutes
reminderRoute.put("/:id/snooze", verifyToken, snoozeReminder);

// ==================== DISMISS REMINDER ====================
// Dismiss reminder (only recipients can dismiss)
reminderRoute.put("/:id/dismiss", verifyToken, dismissReminder);

export default reminderRoute;
