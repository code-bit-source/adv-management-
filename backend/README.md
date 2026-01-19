# Court Case Backend - Authentication System

A complete authentication system with role-based access control for a court case management application.

## 🚀 Features

- ✅ User Signup with multiple roles (Admin, Advocate, Client, Paralegal)
- ✅ User Login with JWT authentication
- ✅ **Google OAuth Authentication** (Sign in with Google for all roles)
- ✅ User Logout
- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ HTTP-only cookies for secure token storage
- ✅ Role-based access control middleware
- ✅ Input validation
- ✅ MongoDB integration
- ✅ Support for multiple authentication providers (local & Google)

## 📋 User Roles

- **Admin** - Full system access
- **Advocate** - Lawyer/Attorney access
- **Client** - Client access
- **Paralegal** - Legal assistant access

## 🛠️ Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory (see `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/courtcase
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:3000

# Google OAuth (Get from https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

4. Start the server:
```bash
npm run dev
```

## 📡 API Endpoints

### Base URL
```
http://localhost:5000
```

### 1. Health Check
**GET** `/`

**Response:**
```json
{
  "success": true,
  "message": "Court Case Backend API is running",
  "endpoints": {
    "signup": "POST /api/auth/signup",
    "login": "POST /api/auth/login",
    "logout": "POST /api/auth/logout",
    "googleLogin": "POST /api/auth/google/login",
    "googleSignup": "POST /api/auth/google/signup"
  }
}
```

---

### 2. User Signup
**POST** `/api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "client"
}
```

**Available Roles:** `admin`, `advocate`, `client`, `paralegal`

**Note:** If `role` is not provided, it defaults to `client`.

**Success Response (201):**
```json
{
  "success": true,
  "message": "Signup successful",
  "user": {
    "id": "65f1234567890abcdef12345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing fields:
```json
{
  "success": false,
  "message": "Please provide all required fields (name, email, password)"
}
```

- **400 Bad Request** - User already exists:
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

- **400 Bad Request** - Invalid role:
```json
{
  "success": false,
  "message": "Invalid role. Must be one of: admin, advocate, client, paralegal"
}
```

---

### 3. User Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "65f1234567890abcdef12345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing credentials:
```json
{
  "success": false,
  "message": "Please provide email and password"
}
```

- **401 Unauthorized** - Invalid credentials:
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 4. User Logout
**POST** `/api/auth/logout`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 5. Google OAuth Login
**POST** `/api/auth/google/login`

**Request Body:**
```json
{
  "credential": "GOOGLE_ID_TOKEN_HERE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Google login successful",
  "user": {
    "id": "65f1234567890abcdef12345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client",
    "authProvider": "google",
    "profilePicture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing credential:
```json
{
  "success": false,
  "message": "Google credential is required"
}
```

- **401 Unauthorized** - Invalid token:
```json
{
  "success": false,
  "message": "Invalid Google token"
}
```

- **404 Not Found** - User not found:
```json
{
  "success": false,
  "message": "User not found. Please sign up first."
}
```

---

### 6. Google OAuth Signup
**POST** `/api/auth/google/signup`

**Request Body:**
```json
{
  "credential": "GOOGLE_ID_TOKEN_HERE",
  "role": "client"
}
```

**Available Roles:** `admin`, `advocate`, `client`, `paralegal`

**Note:** Role is required for signup.

**Success Response (201):**
```json
{
  "success": true,
  "message": "Google signup successful",
  "user": {
    "id": "65f1234567890abcdef12345",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "client",
    "authProvider": "google",
    "profilePicture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing credential:
```json
{
  "success": false,
  "message": "Google credential is required"
}
```

- **400 Bad Request** - Missing role:
```json
{
  "success": false,
  "message": "Role is required for signup"
}
```

- **400 Bad Request** - Invalid role:
```json
{
  "success": false,
  "message": "Invalid role. Must be one of: admin, advocate, client, paralegal"
}
```

- **400 Bad Request** - User already exists:
```json
{
  "success": false,
  "message": "User already exists. Please login instead."
}
```

- **401 Unauthorized** - Invalid token:
```json
{
  "success": false,
  "message": "Invalid Google token"
}
```

**📖 For detailed Google OAuth integration guide, see [GOOGLE_AUTH_GUIDE.md](./GOOGLE_AUTH_GUIDE.md)**

---

## 🔐 Authentication Middleware

### Protect Routes
Use `verifyToken` middleware to protect routes:

```javascript
import { verifyToken } from './middleware/auth.middleware.js';

router.get('/protected', verifyToken, (req, res) => {
  res.json({ user: req.user });
});
```

### Role-Based Access Control
Use `authorizeRoles` middleware to restrict access by role:

```javascript
import { verifyToken, authorizeRoles } from './middleware/auth.middleware.js';

// Only admins can access
router.get('/admin-only', verifyToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Admins and advocates can access
router.get('/legal', verifyToken, authorizeRoles('admin', 'advocate'), (req, res) => {
  res.json({ message: 'Legal access granted' });
});
```

---

## 📝 Example Usage with cURL

### Signup as Admin
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### Signup as Advocate
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advocate Name",
    "email": "advocate@example.com",
    "password": "advocate123",
    "role": "advocate"
  }'
```

### Signup as Client
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Client Name",
    "email": "client@example.com",
    "password": "client123",
    "role": "client"
  }'
```

### Signup as Paralegal
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paralegal Name",
    "email": "paralegal@example.com",
    "password": "paralegal123",
    "role": "paralegal"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

---

## 🗂️ Project Structure

```
backend/
├── config/
│   ├── db.js              # MongoDB connection
│   └── token.js           # JWT token generation
├── controller/
│   └── auth.controller.js # Authentication logic
├── middleware/
│   └── auth.middleware.js # Auth & role verification
├── model/
│   └── user.model.js      # User schema
├── routes/
│   └── auth.route.js      # Auth routes
├── .env                   # Environment variables (create this)
├── .env.example           # Environment variables example
├── index.js               # Server entry point
├── package.json           # Dependencies
└── README.md              # Documentation
```

---

## 🔒 Security Features

- Passwords are hashed using bcrypt (10 salt rounds)
- JWT tokens stored in HTTP-only cookies
- Secure cookies in production (HTTPS)
- SameSite cookie policy for CSRF protection
- Token expiration (7 days)
- Input validation for all endpoints
- Role-based access control

---

## 🧪 Testing

You can test the API using:
- **Postman** - Import the endpoints and test
- **Thunder Client** (VS Code extension)
- **cURL** - Use the examples above
- **Frontend application** - Connect your React/Vue/Angular app

---

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cookie-parser** - Cookie parsing
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables
- **nodemon** - Development auto-reload
- **google-auth-library** - Google OAuth verification

---

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

## 📄 License

ISC

---

## 👨‍💻 Author

Your Name

---

## 📞 Support

For support, email your-email@example.com
