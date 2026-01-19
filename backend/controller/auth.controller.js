import bcrypt from "bcryptjs";
import genToken from "../config/token.js";
import User from "../model/user.model.js";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==================== SIGNUP ====================
export const signUp = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide all required fields (name, email, password)" 
      });
    }

    // 2. Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long" 
      });
    }

    // 3. Validate role if provided
    const validRoles = ['admin', 'advocate', 'client', 'paralegal'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      });
    }

    // 4. Check if user already exists
    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(400).json({ 
        success: false,
        message: "User with this email already exists" 
      });
    }

    // 5. Hash password
    const hashPassword = await bcrypt.hash(password, 10);

    // 6. Create user
    const user = await User.create({
      name,
      email,
      password: hashPassword,
      role: role || 'client' // Default to 'client' if no role provided
    });

    // 7. Generate token
    const token = await genToken(user._id);

    // 8. Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 9. Success response
    return res.status(201).json({
      success: true,
      message: "Signup successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Signup error",
      error: error.message,
    });
  }
};

// ==================== LOGIN ====================
export const logIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide email and password" 
      });
    }

    // 2. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // 3. Check if user signed up with Google but hasn't set a password yet
    if (user.authProvider === 'google' && !user.hasPassword) {
      return res.status(403).json({ 
        success: false,
        message: "You signed up with Google. Please login with Google or set a password first using the set-password endpoint.",
        requiresPasswordSetup: true
      });
    }

    // 4. Check if user has a password (additional safety check)
    if (!user.password) {
      return res.status(403).json({ 
        success: false,
        message: "No password set for this account. Please use Google login or set a password first.",
        requiresPasswordSetup: true
      });
    }

    // 5. Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // 6. Generate token
    const token = await genToken(user._id);

    // 7. Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 8. Success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        hasPassword: user.hasPassword
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login error",
      error: error.message,
    });
  }
};

// ==================== LOGOUT ====================
export const logOut = async (req, res) => {
  try {
    // Clear the token cookie
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });

  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout error",
      error: error.message,
    });
  }
};

// ==================== GOOGLE LOGIN ====================
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    // 1. Validate input
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google access token is required"
      });
    }

    // 2. Get user info from Google using access token
    let userInfo;
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${credential}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to get user info from Google');
      }
      userInfo = await response.json();
    } catch (error) {
      console.error("Google user info fetch failed:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid Google access token"
      });
    }

    const { id: googleId, email, name, picture, verified_email } = userInfo;

    // 3. Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [{ email }, { googleId }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please sign up first."
      });
    }

    // 4. Update user with Google info if not set
    if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      user.isEmailVerified = verified_email || true;
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
      }
      await user.save();
    }

    // 5. Generate token
    const token = await genToken(user._id);

    // 6. Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 7. Success response
    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        profilePicture: user.profilePicture
      },
    });

  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({
      success: false,
      message: "Google login error",
      error: error.message,
    });
  }
};

// ==================== GOOGLE SIGNUP ====================
export const googleSignup = async (req, res) => {
  try {
    const { credential, role } = req.body;

    // 1. Validate input
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required"
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required for signup"
      });
    }

    // 2. Validate role
    const validRoles = ['admin', 'advocate', 'client', 'paralegal'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // 3. Verify Google ID token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error("Google token verification failed:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid Google token"
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    // 4. Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { googleId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please login instead."
      });
    }

    // 5. Create new user (without password, hasPassword will default to false)
    const newUser = await User.create({
      name,
      email,
      googleId,
      role,
      authProvider: 'google',
      hasPassword: false, // Explicitly set to false for Google users
      isEmailVerified: email_verified || true,
      profilePicture: picture || null
    });

    // 6. Generate token
    const token = await genToken(newUser._id);

    // 7. Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 8. Success response
    return res.status(201).json({
      success: true,
      message: "Google signup successful. You can set a password later to enable email/password login.",
      token: token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        authProvider: newUser.authProvider,
        hasPassword: newUser.hasPassword,
        profilePicture: newUser.profilePicture
      },
    });

  } catch (error) {
    console.error("Google signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Google signup error",
      error: error.message,
    });
  }
};

// ==================== SET PASSWORD (For Google Users) ====================
export const setPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const userId = req.user._id; // From auth middleware

    // 1. Validate input
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide both password and confirmPassword"
      });
    }

    // 2. Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    // 3. Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Additional password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      });
    }

    // 4. Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 5. Check if user already has a password
    if (user.hasPassword && user.password) {
      return res.status(400).json({
        success: false,
        message: "Password already set. Use change-password endpoint to update your password."
      });
    }

    // 6. Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Update user with new password
    user.password = hashedPassword;
    user.hasPassword = true;
    await user.save();

    // 8. Success response
    return res.status(200).json({
      success: true,
      message: "Password set successfully. You can now login with email and password.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        hasPassword: user.hasPassword
      }
    });

  } catch (error) {
    console.error("Set password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to set password",
      error: error.message
    });
  }
};



 