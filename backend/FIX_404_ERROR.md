# 🔧 Fix 404 Error on Vercel

## Problem
Getting `404: NOT_FOUND` error after deploying to Vercel.

## ✅ Solution Applied

I've updated the `vercel.json` configuration to fix the routing issue.

### Changes Made:
1. Added `/` prefix to destination path
2. Added `rewrites` configuration for better routing
3. Removed region-specific settings that might cause issues

---

## 🚀 Steps to Fix Your Deployment

### Step 1: Redeploy to Vercel

**Option A: Using Vercel CLI**
```bash
vercel --prod
```

**Option B: Using Git (if connected to GitHub)**
```bash
git add .
git commit -m "Fix 404 error - updated vercel.json"
git push origin main
```
Vercel will automatically redeploy.

**Option C: Manual Redeploy from Dashboard**
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment

---

### Step 2: Verify Environment Variables

Make sure these are set in Vercel Dashboard:

1. Go to: **Settings** → **Environment Variables**
2. Add these variables:

```
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

**Important:** After adding environment variables, you MUST redeploy!

---

### Step 3: Test Your Deployment

After redeploying, test these URLs:

**1. Health Check:**
```bash
curl https://your-project-name.vercel.app/
```

Expected response:
```json
{
  "success": true,
  "message": "Court Case Backend API is running on Vercel",
  "version": "1.0.0"
}
```

**2. API Status:**
```bash
curl https://your-project-name.vercel.app/api
```

Expected response:
```json
{
  "success": true,
  "message": "API is working",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

**3. Test Login Endpoint:**
```bash
curl -X POST https://your-project-name.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## 🔍 Common Issues & Solutions

### Issue 1: Still Getting 404
**Solution:**
- Clear Vercel cache: `vercel --prod --force`
- Check that `api/index.js` file exists in your repository
- Verify `vercel.json` is in the root directory

### Issue 2: "Cannot find module" Error
**Solution:**
- Make sure all imports use `.js` extension
- Check that all route files exist
- Verify `package.json` has `"type": "module"`

### Issue 3: Database Connection Error
**Solution:**
- Verify `MONGODB_URL` is set in Vercel environment variables
- Check MongoDB Atlas allows connections from `0.0.0.0/0`
- Test connection string locally first

### Issue 4: CORS Error from Frontend
**Solution:**
- Update CORS origin in `api/index.js`:
```javascript
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://the-court-case.vercel.app",
    "https://your-frontend-domain.vercel.app"  // Add your actual frontend URL
  ],
  credentials: true
}));
```
- Redeploy after updating

---

## 📊 Debugging Steps

### 1. Check Vercel Logs
```bash
vercel logs --follow
```

Or in Dashboard:
- Go to your project
- Click "Deployments"
- Click on latest deployment
- View "Function Logs"

### 2. Check Build Logs
- Go to Vercel Dashboard
- Click on your deployment
- Check "Build Logs" tab
- Look for any errors during build

### 3. Verify File Structure
Your project should look like this:
```
backend/
├── api/
│   └── index.js          ← Main serverless function
├── config/
│   ├── db.js
│   ├── multer.config.js
│   └── token.js
├── routes/
│   ├── auth.route.js
│   └── ... (other routes)
├── model/
├── controller/
├── middleware/
├── vercel.json           ← Vercel configuration
├── package.json
└── .env.example
```

---

## ✅ Verification Checklist

After redeploying, verify:

- [ ] `https://your-app.vercel.app/` returns success message
- [ ] `https://your-app.vercel.app/api` returns API status
- [ ] Environment variables are set in Vercel dashboard
- [ ] MongoDB connection is working (check logs)
- [ ] No errors in Vercel function logs
- [ ] CORS is working with your frontend
- [ ] Authentication endpoints work

---

## 🆘 Still Having Issues?

### Check These:

1. **Vercel.json Location**
   - Must be in root directory (not in `api/` folder)

2. **Package.json**
   - Must have `"type": "module"`
   - All dependencies in `dependencies` (not `devDependencies`)

3. **Import Statements**
   - All imports must include `.js` extension
   - Example: `import db from './config/db.js'` ✅
   - Not: `import db from './config/db'` ❌

4. **Environment Variables**
   - Set in Vercel Dashboard (not in `.env` file)
   - Redeploy after adding variables

---

## 📞 Need More Help?

1. Share the exact error message from Vercel logs
2. Share your deployment URL
3. Check if the issue is with specific endpoints or all routes

---

## 🎯 Quick Fix Command

Run this to redeploy with force:
```bash
vercel --prod --force
```

This will:
- Clear cache
- Rebuild everything
- Deploy fresh version

---

## ✨ After Successful Deployment

Your API will be available at:
```
https://your-project-name.vercel.app
```

All endpoints will work with `/api/` prefix:
- `https://your-app.vercel.app/api/auth/login`
- `https://your-app.vercel.app/api/cases`
- `https://your-app.vercel.app/api/notes`
- etc.

🎉 Happy deploying!
