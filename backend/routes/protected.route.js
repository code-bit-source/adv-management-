import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';

const protectedRoute = express.Router();

// ==================== GET CURRENT USER ====================
// Protected route - requires authentication
protectedRoute.get("/me", verifyToken, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving user profile",
      error: error.message
    });
  }
});

// ==================== ADMIN ONLY ROUTE ====================
// Only admins can access this route
protectedRoute.get("/admin-dashboard", verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Welcome to Admin Dashboard",
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error accessing admin dashboard",
      error: error.message
    });
  }
});

// ==================== ADVOCATE ONLY ROUTE ====================
// Only advocates can access this route
protectedRoute.get("/advocate-cases", verifyToken, authorizeRoles('advocate'), async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Welcome to Advocate Cases",
      user: req.user,
      cases: [] // Add your cases logic here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error accessing advocate cases",
      error: error.message
    });
  }
});

// ==================== CLIENT ONLY ROUTE ====================
// Only clients can access this route
protectedRoute.get("/my-cases", verifyToken, authorizeRoles('client'), async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Welcome to My Cases",
      user: req.user,
      cases: [] // Add your cases logic here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error accessing client cases",
      error: error.message
    });
  }
});

// ==================== PARALEGAL ONLY ROUTE ====================
// Only paralegals can access this route
protectedRoute.get("/paralegal-tasks", verifyToken, authorizeRoles('paralegal'), async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Welcome to Paralegal Tasks",
      user: req.user,
      tasks: [] // Add your tasks logic here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error accessing paralegal tasks",
      error: error.message
    });
  }
});

// ==================== MULTIPLE ROLES ROUTE ====================
// Admins and advocates can access this route
protectedRoute.get("/legal-documents", verifyToken, authorizeRoles('admin', 'advocate'), async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Welcome to Legal Documents",
      user: req.user,
      documents: [] // Add your documents logic here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error accessing legal documents",
      error: error.message
    });
  }
});

// ==================== ALL AUTHENTICATED USERS ====================
// Any authenticated user can access this route
protectedRoute.get("/notifications", verifyToken, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      user: req.user,
      notifications: [] // Add your notifications logic here
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving notifications",
      error: error.message
    });
  }
});

export default protectedRoute;
