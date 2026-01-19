import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

// ==================== VERIFY TOKEN ====================
export const verifyToken = async (req, res, next) => {
  try {
    // 1. Get token from cookie or Authorization header
    let token = req.cookies.token;
    
    // If no token in cookie, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided. Please login first."
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found."
      });
    }

    // 4. Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error("Token verification error:", error);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Token verification failed",
      error: error.message
    });
  }
};

// ==================== ROLE-BASED ACCESS CONTROL ====================
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route is restricted to: ${roles.join(', ')}`
      });
    }

    next();
  };
};
