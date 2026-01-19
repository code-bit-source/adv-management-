import express from "express";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  assignParalegal,
  removeParalegal,
  closeCase,
  archiveCase,
  deleteCase,
  getCaseStats,
} from "../controller/case.controller.js";

const caseRoute = express.Router();

// All routes require authentication
caseRoute.use(verifyToken);

// ==================== CASE CRUD ====================
// Create case - Client, Advocate, Admin
caseRoute.post(
  "/",
  authorizeRoles("client", "advocate", "admin"),
  createCase
);

// Get all cases - All authenticated users (filtered by role)
caseRoute.get("/", getCases);

// Get case statistics
caseRoute.get("/stats", getCaseStats);

// Get single case by ID
caseRoute.get("/:id", getCaseById);

// Update case - Advocate, Admin
caseRoute.put("/:id", updateCase);

// Delete case - Admin only
caseRoute.delete("/:id", authorizeRoles("admin"), deleteCase);

// ==================== CASE MANAGEMENT ====================
// Assign paralegal to case - Advocate, Admin
caseRoute.post("/:id/assign-paralegal", assignParalegal);

// Remove paralegal from case - Advocate, Admin
caseRoute.delete("/:id/paralegals/:paralegalId", removeParalegal);

// Close case - Advocate, Admin
caseRoute.put("/:id/close", closeCase);

// Archive case - Advocate, Admin
caseRoute.put("/:id/archive", archiveCase);

export default caseRoute;
