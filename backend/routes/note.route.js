import express from "express";
import {
  createNote,
  getMyNotes,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  archiveNote,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
  addChecklistItem,
  updateChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  getChecklistItems,
} from "../controller/note.controller.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const noteRoute = express.Router();

// ==================== NOTE CRUD ROUTES ====================

// Create note - All authenticated users can create notes
noteRoute.post("/", verifyToken, createNote);

// Get my notes - Get current user's notes
noteRoute.get("/", verifyToken, getMyNotes);

// Get all notes - Admin only
noteRoute.get("/all", verifyToken, authorizeRoles("admin"), getAllNotes);

// ==================== CHECKLIST ROUTES (Must come before /:id routes) ====================

// Get checklist items - Owner or Admin
noteRoute.get("/:id/checklists", verifyToken, getChecklistItems);

// Add checklist item - Owner only
noteRoute.post("/:id/checklists", verifyToken, addChecklistItem);

// Update checklist item - Owner only
noteRoute.put("/:id/checklists/:checklistId", verifyToken, updateChecklistItem);

// Toggle checklist item completion - Owner only
noteRoute.put("/:id/checklists/:checklistId/toggle", verifyToken, toggleChecklistItem);

// Delete checklist item - Owner only
noteRoute.delete("/:id/checklists/:checklistId", verifyToken, deleteChecklistItem);

// ==================== ATTACHMENT ROUTES (Must come before /:id routes) ====================

// Upload attachment to note - Owner only
noteRoute.post(
  "/:id/attachments",
  verifyToken,
  uploadSingle("file"),
  uploadAttachment
);

// Delete attachment from note - Owner only
noteRoute.delete("/:id/attachments/:attachmentId", verifyToken, deleteAttachment);

// Download attachment - Owner or Admin
noteRoute.get("/:id/attachments/:attachmentId/download", verifyToken, downloadAttachment);

// ==================== NOTE ROUTES WITH :id PARAMETER (Must come last) ====================

// Archive/Unarchive note - Owner only (specific route before generic /:id)
noteRoute.put("/:id/archive", verifyToken, archiveNote);

// Get single note by ID - Owner or Admin
noteRoute.get("/:id", verifyToken, getNoteById);

// Update note - Owner only
noteRoute.put("/:id", verifyToken, updateNote);

// Delete note - Owner only
noteRoute.delete("/:id", verifyToken, deleteNote);

export default noteRoute;
