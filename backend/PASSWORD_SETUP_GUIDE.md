# Password Setup Guide for Google Users

## Overview
This feature allows users who sign up via Google to set a password later, enabling them to login using either Google authentication OR traditional email/password authentication.

## Security Features Implemented

### 1. **Strong Password Validation**
- Minimum 6 characters
- Must contain at least one uppercase letter (A-Z)
- Must contain at least one lowercase letter (a-z)
- Must contain at least one number (0-9)

### 2. **Password Confirmation**
- Users must provide password twice to prevent typos
- Both passwords must match exactly

### 3. **Protected Endpoint**
- Requires authentication (JWT token)
- Only logged-in users can set their password

### 4. **Duplicate Prevention**
- Users who already have a password cannot use this endpoint
- They must use a separate change-password endpoint instead

### 5. **Database Security**
- Passwords are hashed using bcrypt with salt rounds of 10
- Original passwords are never stored in plain text

## User Flow

### For New Google Users:

1. **Sign Up with Google**
   ```
   POST /api/auth/google/signup
   Body: {
     "credential": "google_id_token",
     "role": "client"
   }
   ```
   - User is created with `hasPassword: false`
   - No password field is set

2. **Login with Google** (anytime)
   ```
   POST /api/auth/google/login
   Body: {
     "credential": "google_access_token"
   }
   ```
   - User receives JWT token

3. **Set Password** (optional, after login)
   ```
   POST /api/auth/set-password
   Headers: {
     "Authorization": "Bearer <jwt_token>"
   }
   Body: {
     "password": "MyPassword123",
     "confirmPassword": "MyPassword123"
   }
   ```
   - Password is validated and hashed
   - `hasPassword` is set to `true`

4. **Login with Email/Password** (after setting password)
   ```
   POST /api/auth/login
   Body: {
     "email": "user@example.com",
     "password": "MyPassword123"
   }
   ```
   - User can now login using traditional method

### Error Handling:

#### If Google user tries to login without setting password:
```json
{
  "success": false,
  "message": "You signed up with Google. Please login with Google or set a password first using the set-password endpoint.",
  "requiresPasswordSetup": true
}
```

#### If user tries to set password when already set:
```json
{
  "success": false,
  "message": "Password already set. Use change-password endpoint to update your password."
}
```

## API Endpoints

### 1. Set Password (Protected)
**Endpoint:** `POST /api/auth/set-password`

**Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "password": "MyPassword123",
  "confirmPassword": "MyPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password set successfully. You can now login with email and password.",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "client",
    "authProvider": "google",
    "hasPassword": true
  }
}
```

**Error Responses:**

- **400 - Missing Fields:**
```json
{
  "success": false,
  "message": "Please provide both password and confirmPassword"
}
```

- **400 - Passwords Don't Match:**
```json
{
  "success": false,
  "message": "Passwords do not match"
}
```

- **400 - Weak Password:**
```json
{
  "success": false,
  "message": "Password must contain at least one uppercase letter, one lowercase letter, and one number"
}
```

- **400 - Password Already Set:**
```json
{
  "success": false,
  "message": "Password already set. Use change-password endpoint to update your password."
}
```

- **401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied. No token provided. Please login first."
}
```

## Database Schema Changes

### User Model - New Field:
```javascript
hasPassword: {
  type: Boolean,
  default: function() {
    // Default to true for local auth, false for Google auth
    return this.authProvider === 'local';
  }
}
```

### Field Values:
- **Local Auth Users:** `hasPassword: true` (automatically set)
- **Google Auth Users (new):** `hasPassword: false` (automatically set)
- **Google Auth Users (after setting password):** `hasPassword: true` (manually updated)

## Testing Guide

### Test Case 1: Google User Sets Password
```bash
# 1. Sign up with Google
curl -X POST http://localhost:5000/api/auth/google/signup \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "google_id_token",
    "role": "client"
  }'

# 2. Set password (use token from signup response)
curl -X POST http://localhost:5000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "password": "MyPassword123",
    "confirmPassword": "MyPassword123"
  }'

# 3. Login with email/password
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MyPassword123"
  }'
```

### Test Case 2: Google User Tries to Login Without Password
```bash
# 1. Sign up with Google (don't set password)
# 2. Try to login with email/password
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "anypassword"
  }'

# Expected: Error with requiresPasswordSetup: true
```

### Test Case 3: Weak Password Validation
```bash
curl -X POST http://localhost:5000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "password": "weak",
    "confirmPassword": "weak"
  }'

# Expected: Error about password requirements
```

## Security Best Practices

1. **Always use HTTPS in production** - Passwords should never be transmitted over unencrypted connections
2. **Token Security** - JWT tokens are stored in httpOnly cookies to prevent XSS attacks
3. **Password Hashing** - bcrypt with 10 salt rounds provides strong protection
4. **Input Validation** - All inputs are validated before processing
5. **Error Messages** - Generic error messages prevent user enumeration attacks

## Frontend Integration Example

```javascript
// After Google login
const setPassword = async (password, confirmPassword) => {
  try {
    const response = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        password,
        confirmPassword
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Password set successfully! You can now login with email/password.');
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error setting password:', error);
  }
};
```

## Migration Notes

### For Existing Google Users:
- Existing Google users will have `hasPassword: false` by default
- They can set a password anytime using the new endpoint
- No data migration required - the field will be added automatically

### For New Users:
- Local signup users: `hasPassword: true` (automatic)
- Google signup users: `hasPassword: false` (automatic)

## Troubleshooting

### Issue: "Password already set" error
**Solution:** User already has a password. They should use a password change endpoint instead.

### Issue: "Invalid token" error
**Solution:** User needs to login first to get a valid JWT token.

### Issue: Password validation fails
**Solution:** Ensure password meets all requirements:
- At least 6 characters
- Contains uppercase letter
- Contains lowercase letter
- Contains number

### Issue: Google user can't login with email/password
**Solution:** Check if user has set a password using the set-password endpoint.

## Future Enhancements

1. **Change Password Endpoint** - Allow users to update existing passwords
2. **Password Reset** - Email-based password reset functionality
3. **Two-Factor Authentication** - Additional security layer
4. **Password History** - Prevent reuse of recent passwords
5. **Account Linking** - Link Google and local accounts for same email
