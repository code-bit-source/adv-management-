# Google Users के लिए Password Setup Guide

## समस्या क्या थी?

जब कोई user Google से sign up करता था, तो उसके account में password नहीं होता था। अगर वो बाद में regular login page से email और password के साथ login करने की कोशिश करता था, तो error आ जाता था।

## समाधान (Solution)

अब Google users अपने account में login करने के बाद password set कर सकते हैं। इसके बाद वो दोनों तरीकों से login कर सकते हैं:
1. Google से login
2. Email और Password से login

## कैसे काम करता है?

### Step 1: Google से Sign Up
```
POST /api/auth/google/signup
```
- User बिना password के create होता है
- `hasPassword: false` set होता है

### Step 2: Google से Login
```
POST /api/auth/google/login
```
- User को JWT token मिलता है

### Step 3: Password Set करें (Optional)
```
POST /api/auth/set-password
Headers: Authorization: Bearer <token>
Body: {
  "password": "MyPassword123",
  "confirmPassword": "MyPassword123"
}
```
- Password validate और hash होता है
- `hasPassword: true` हो जाता है

### Step 4: Email/Password से Login
```
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "MyPassword123"
}
```
- अब user regular login से भी login कर सकता है

## Security Features

### 1. मजबूत Password की जरूरत
- कम से कम 6 characters
- कम से कम 1 uppercase letter (A-Z)
- कम से कम 1 lowercase letter (a-z)
- कम से कम 1 number (0-9)

**उदाहरण:**
- ✅ सही: `MyPassword123`, `SecurePass1`, `Test@123`
- ❌ गलत: `password` (no uppercase, no number)
- ❌ गलत: `PASSWORD` (no lowercase, no number)
- ❌ गलत: `Pass1` (बहुत छोटा)

### 2. Password Confirmation
- Password दो बार डालना होगा
- दोनों passwords एक जैसे होने चाहिए

### 3. Protected Endpoint
- Password set करने के लिए login होना जरूरी है
- JWT token चाहिए

### 4. Password Hashing
- Password को bcrypt से hash किया जाता है
- Original password कभी database में store नहीं होता

### 5. Duplicate Prevention
- अगर user के पास पहले से password है, तो error आएगा
- उन्हें change-password endpoint use करना होगा

## Error Messages (हिंदी में समझें)

### 1. Google user बिना password set किए login करने की कोशिश करे:
```json
{
  "success": false,
  "message": "You signed up with Google. Please login with Google or set a password first using the set-password endpoint.",
  "requiresPasswordSetup": true
}
```
**मतलब:** आपने Google से sign up किया था। कृपया Google से login करें या पहले password set करें।

### 2. Password requirements पूरी नहीं हुई:
```json
{
  "success": false,
  "message": "Password must contain at least one uppercase letter, one lowercase letter, and one number"
}
```
**मतलब:** Password में कम से कम एक बड़ा अक्षर, एक छोटा अक्षर, और एक नंबर होना चाहिए।

### 3. Passwords match नहीं हुए:
```json
{
  "success": false,
  "message": "Passwords do not match"
}
```
**मतलब:** दोनों passwords एक जैसे नहीं हैं।

### 4. Password पहले से set है:
```json
{
  "success": false,
  "message": "Password already set. Use change-password endpoint to update your password."
}
```
**मतलब:** आपका password पहले से set है। Password बदलने के लिए change-password endpoint use करें।

## Database में क्या बदला?

### User Model में नया field:
```javascript
hasPassword: {
  type: Boolean,
  default: function() {
    return this.authProvider === 'local';
  }
}
```

### Field की values:
- **Local signup users:** `hasPassword: true` (automatic)
- **Google signup users (नए):** `hasPassword: false` (automatic)
- **Google users (password set करने के बाद):** `hasPassword: true` (updated)

## Frontend में कैसे use करें?

```javascript
// Password set करने का function
const setPassword = async (password, confirmPassword) => {
  try {
    const response = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Login token
      },
      body: JSON.stringify({
        password: password,
        confirmPassword: confirmPassword
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Password successfully set! अब आप email/password से भी login कर सकते हैं।');
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('कुछ गलत हो गया। कृपया फिर से कोशिश करें।');
  }
};

// Use करें
setPassword('MyPassword123', 'MyPassword123');
```

## Testing कैसे करें?

### Test 1: Google user password set करे

```bash
# 1. Google से signup करें
curl -X POST http://localhost:5000/api/auth/google/signup \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "google_id_token",
    "role": "client"
  }'

# Response से token copy करें

# 2. Password set करें
curl -X POST http://localhost:5000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_yahan_paste_karein>" \
  -d '{
    "password": "MyPassword123",
    "confirmPassword": "MyPassword123"
  }'

# 3. अब email/password से login करें
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "MyPassword123"
  }'
```

### Test 2: Weak password test करें

```bash
curl -X POST http://localhost:5000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "password": "weak",
    "confirmPassword": "weak"
  }'

# Expected: Error message आएगा
```

## Common Problems और Solutions

### Problem 1: "Invalid token" error
**Solution:** पहले login करें और valid token use करें।

### Problem 2: Password validation fail हो रहा है
**Solution:** Check करें कि password में:
- कम से कम 6 characters हैं
- 1 uppercase letter है (A-Z)
- 1 lowercase letter है (a-z)
- 1 number है (0-9)

### Problem 3: "Password already set" error
**Solution:** आपका password पहले से set है। Password change करने के लिए अलग endpoint बनाना होगा।

### Problem 4: Google user email/password से login नहीं कर पा रहा
**Solution:** पहले `/api/auth/set-password` endpoint से password set करें।

## Important Points (ध्यान दें)

1. ✅ Password हमेशा secure (HTTPS) connection से भेजें
2. ✅ Password database में hash होकर store होता है
3. ✅ Original password कभी store नहीं होता
4. ✅ JWT token httpOnly cookie में store होता है (XSS protection)
5. ✅ सभी inputs validate होते हैं
6. ✅ Error messages generic हैं (security के लिए)

## User Flow Diagram

```
Google User Journey:
┌─────────────────────┐
│  Google से Sign Up  │
│  (No Password)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Google से Login    │
│  (Token मिलता है)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Password Set करें  │ ◄── Optional
│  (Protected Route)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  अब दोनों तरीकों से Login करें:  │
│  1. Google Login                │
│  2. Email/Password Login        │
└─────────────────────────────────┘
```

## Files जो बदली गईं

1. **model/user.model.js**
   - `hasPassword` field add किया

2. **controller/auth.controller.js**
   - `setPassword` function add किया
   - `logIn` function में Google user check add किया
   - `googleSignup` में `hasPassword: false` set किया

3. **routes/auth.route.js**
   - `/set-password` route add किया (protected)

## Summary

अब आपका authentication system पूरी तरह से secure और flexible है:

✅ Google users बिना password के sign up कर सकते हैं
✅ बाद में password set कर सकते हैं
✅ दोनों तरीकों से login कर सकते हैं
✅ Strong password validation है
✅ सभी passwords encrypted हैं
✅ Protected endpoints हैं
✅ Clear error messages हैं

अगर कोई doubt हो तो PASSWORD_SETUP_GUIDE.md file में detailed English documentation है।
