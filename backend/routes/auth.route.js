import express from 'express';
import { signUp, logIn, logOut, googleLogin, googleSignup, setPassword } from '../controller/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const authRoute = express.Router();

// Auth Routes
authRoute.post("/signup", signUp);
authRoute.post("/login", logIn);
authRoute.post("/logout", logOut);
authRoute.post("/google/login", googleLogin);
authRoute.post("/google/signup", googleSignup);

// Protected route - Set password for Google users
authRoute.post("/set-password", verifyToken, setPassword);

export default authRoute;
