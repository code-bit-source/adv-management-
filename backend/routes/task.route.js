import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  updateTaskProgress,
  deleteTask,
  addComment,
  addAttachment,
  getCaseTasks,
  getTaskStats,
  getOverdueTasks
} from '../controller/task.controller.js';

const taskRoute = express.Router();

// ==================== CREATE TASK ====================
// Create a new task (Advocate only)
taskRoute.post("/", verifyToken, authorizeRoles('advocate', 'admin'), createTask);

// ==================== GET TASKS ====================
// Get all tasks for the authenticated user (role-based)
// Query params: page, limit, status, priority
taskRoute.get("/", verifyToken, getTasks);

// ==================== GET TASK STATISTICS ====================
// Get task statistics for the authenticated user
taskRoute.get("/stats", verifyToken, getTaskStats);

// ==================== GET OVERDUE TASKS ====================
// Get overdue tasks for the authenticated user
taskRoute.get("/overdue", verifyToken, getOverdueTasks);

// ==================== GET CASE TASKS ====================
// Get all tasks for a specific case
// Query params: page, limit, status
taskRoute.get("/cases/:caseId", verifyToken, getCaseTasks);

// ==================== GET TASK BY ID ====================
// Get single task by ID
taskRoute.get("/:id", verifyToken, getTaskById);

// ==================== UPDATE TASK ====================
// Update task details (only creator can update)
taskRoute.put("/:id", verifyToken, updateTask);

// ==================== DELETE TASK ====================
// Delete task (only creator can delete)
taskRoute.delete("/:id", verifyToken, deleteTask);

// ==================== UPDATE TASK STATUS ====================
// Update task status (paralegal or creator can update)
taskRoute.put("/:id/status", verifyToken, updateTaskStatus);

// ==================== UPDATE TASK PROGRESS ====================
// Update task progress (paralegal or creator can update)
taskRoute.put("/:id/progress", verifyToken, updateTaskProgress);

// ==================== ADD COMMENT ====================
// Add comment to task
taskRoute.post("/:id/comments", verifyToken, addComment);

// ==================== ADD ATTACHMENT ====================
// Add attachment to task
taskRoute.post("/:id/attachments", verifyToken, uploadSingle('attachment'), addAttachment);

export default taskRoute;
