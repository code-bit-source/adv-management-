import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationsByType,
  getNotificationsByPriority,
  deleteOldNotifications,
  deleteExpiredNotifications
} from '../controller/notification.controller.js';

const notificationRoute = express.Router();

// ==================== GET NOTIFICATIONS ====================
// Get all notifications for the authenticated user
// Query params: page, limit, unread, type, priority
notificationRoute.get("/", verifyToken, getNotifications);

// ==================== GET UNREAD COUNT ====================
// Get count of unread notifications
// Query params: type (optional)
notificationRoute.get("/unread-count", verifyToken, getUnreadCount);

// ==================== GET BY TYPE ====================
// Get notifications filtered by type
// Query params: page, limit
notificationRoute.get("/type/:type", verifyToken, getNotificationsByType);

// ==================== GET BY PRIORITY ====================
// Get notifications filtered by priority
// Query params: page, limit, unread
notificationRoute.get("/priority/:priority", verifyToken, getNotificationsByPriority);

// ==================== MARK ALL AS READ ====================
// Mark all notifications as read
// Query params: type (optional - to mark only specific type)
notificationRoute.put("/read-all", verifyToken, markAllAsRead);

// ==================== DELETE ALL READ ====================
// Delete all read notifications
notificationRoute.delete("/read", verifyToken, deleteAllRead);

// ==================== CLEANUP ROUTES (ADMIN ONLY) ====================
// Delete old notifications (admin only)
// Query params: days (default: 30)
notificationRoute.delete("/cleanup/old", verifyToken, authorizeRoles('admin'), deleteOldNotifications);

// Delete expired notifications (admin only)
notificationRoute.delete("/cleanup/expired", verifyToken, authorizeRoles('admin'), deleteExpiredNotifications);

// ==================== GET SINGLE NOTIFICATION ====================
// Get notification by ID
notificationRoute.get("/:id", verifyToken, getNotificationById);

// ==================== MARK AS READ ====================
// Mark single notification as read
notificationRoute.put("/:id/read", verifyToken, markAsRead);

// ==================== DELETE NOTIFICATION ====================
// Delete single notification
notificationRoute.delete("/:id", verifyToken, deleteNotification);

export default notificationRoute;
