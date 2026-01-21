import express from 'express';
import { signUp, logIn, logOut, googleLogin, googleSignup, setPassword, changePassword } from '../controller/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const authRoute = express.Router();

// Auth Routes
authRoute.post("/signup", signUp);
authRoute.post("/login", logIn);
authRoute.post("/logout", logOut);
authRoute.post("/google/login", googleLogin);
authRoute.post("/google/signup", googleSignup);

// Protected routes
authRoute.post("/set-password", verifyToken, setPassword);
authRoute.post("/change-password", verifyToken, changePassword);

export default authRoute;
