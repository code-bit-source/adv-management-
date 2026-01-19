import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { uploadMultiple } from "../middleware/upload.middleware.js";
import {
  sendMessage,
  getMessages,
  getCaseMessages,
  getConnectionMessages,
  getConversation,
  getMessageById,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  uploadAttachment,
  getUnreadCount,
  searchMessages
} from "../controller/message.controller.js";

const messageRoute = express.Router();

// ==================== MESSAGE ROUTES ====================

// Send message (all authenticated users)
messageRoute.post(
  "/",
  verifyToken,
  sendMessage
);

// Get all messages for current user
messageRoute.get(
  "/",
  verifyToken,
  getMessages
);

// Get unread count
messageRoute.get(
  "/unread-count",
  verifyToken,
  getUnreadCount
);

// Search messages
messageRoute.get(
  "/search",
  verifyToken,
  searchMessages
);

// Get conversation with specific user
messageRoute.get(
  "/conversation/:userId",
  verifyToken,
  getConversation
);

// Mark all messages as read
messageRoute.put(
  "/read-all",
  verifyToken,
  markAllAsRead
);

// Get single message by ID
messageRoute.get(
  "/:id",
  verifyToken,
  getMessageById
);

// Mark message as read
messageRoute.put(
  "/:id/read",
  verifyToken,
  markAsRead
);

// Delete message
messageRoute.delete(
  "/:id",
  verifyToken,
  deleteMessage
);

// Upload attachment to message
messageRoute.post(
  "/:id/attachments",
  verifyToken,
  uploadMultiple('attachments', 5),
  uploadAttachment
);

// ==================== CASE MESSAGES ====================

// Get case messages (moved to case routes for better organization)
// This is registered here for consistency but could be in case routes
messageRoute.get(
  "/cases/:caseId/messages",
  verifyToken,
  getCaseMessages
);

// ==================== CONNECTION MESSAGES ====================

// Get connection messages
messageRoute.get(
  "/connections/:connectionId/messages",
  verifyToken,
  getConnectionMessages
);

export default messageRoute;
