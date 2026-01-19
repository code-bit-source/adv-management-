import express from "express";
import {
  searchAdvocates,
  searchParalegals,
  sendConnectionRequest,
  getReceivedRequests,
  getSentRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getMyConnections,
  getConnectionDetails,
  removeConnection,
  getConnectionStats,
} from "../controller/connection.controller.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.middleware.js";

const connectionRoute = express.Router();

// ==================== SEARCH ROUTES ====================

// Search advocates - Client only
connectionRoute.get(
  "/search/advocates",
  verifyToken,
  authorizeRoles("client"),
  searchAdvocates
);

// Search paralegals - Client only
connectionRoute.get(
  "/search/paralegals",
  verifyToken,
  authorizeRoles("client"),
  searchParalegals
);

// ==================== CONNECTION REQUEST ROUTES ====================

// Send connection request - Client only
connectionRoute.post(
  "/request",
  verifyToken,
  authorizeRoles("client"),
  sendConnectionRequest
);

// Get received connection requests - Advocate/Paralegal only
connectionRoute.get(
  "/requests/received",
  verifyToken,
  authorizeRoles("advocate", "paralegal"),
  getReceivedRequests
);

// Get sent connection requests - Client only
connectionRoute.get(
  "/requests/sent",
  verifyToken,
  authorizeRoles("client"),
  getSentRequests
);

// Accept connection request - Advocate/Paralegal only
connectionRoute.put(
  "/requests/:id/accept",
  verifyToken,
  authorizeRoles("advocate", "paralegal"),
  acceptConnectionRequest
);

// Reject connection request - Advocate/Paralegal only
connectionRoute.put(
  "/requests/:id/reject",
  verifyToken,
  authorizeRoles("advocate", "paralegal"),
  rejectConnectionRequest
);

// ==================== CONNECTION MANAGEMENT ROUTES ====================

// Get connection statistics - All authenticated users
connectionRoute.get("/stats", verifyToken, getConnectionStats);

// Get my connections - All authenticated users
connectionRoute.get("/", verifyToken, getMyConnections);

// Get connection details - All authenticated users
connectionRoute.get("/:id", verifyToken, getConnectionDetails);

// Remove connection - All authenticated users
connectionRoute.delete("/:id", verifyToken, removeConnection);

export default connectionRoute;
