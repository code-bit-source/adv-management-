# 🚀 Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

Your backend is now **Vercel-ready**! Here's what was done:

### Changes Made:
1. ✅ Created `vercel.json` - Vercel configuration
2. ✅ Created `api/index.js` - Serverless function entry point
3. ✅ Updated `config/db.js` - Optimized for serverless with connection caching
4. ✅ Created `.vercelignore` - Excludes unnecessary files
5. ✅ Created `.env.example` - Environment variables template
6. ✅ Updated `package.json` - Added build scripts

### Temporarily Disabled (for quick deployment):
- ⚠️ File uploads (Multer) - Will need cloud storage later
- ⚠️ Reminder scheduler (Cron) - Will need Vercel Cron or external service later

---

## 📋 Deployment Steps

### Step 1: Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
vercel
```

Or simply push to GitHub and connect your repository to Vercel dashboard.

---

## 🔐 Environment Variables Setup

**IMPORTANT:** Add these environment variables in Vercel Dashboard:

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-super-secret-key-here` |
| `NODE_ENV` | Environment | `production` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (if using) | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret (if using) | `your-client-secret` |

---

## 🌐 After Deployment

### Your API will be available at:
```
https://your-project-name.vercel.app
```

### Test your deployment:
```bash
curl https://your-project-name.vercel.app/
```

### Update Frontend CORS:
Make sure your frontend URL is in the CORS configuration (already added):
- `https://the-court-case.vercel.app`

---

## 🔧 Common Issues & Solutions

### Issue 1: Database Connection Timeout
**Solution:** Make sure your MongoDB allows connections from anywhere (0.0.0.0/0) or add Vercel's IP ranges.

### Issue 2: Environment Variables Not Working
**Solution:** 
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### Issue 3: 404 on API Routes
**Solution:** Make sure you're accessing routes with `/api/` prefix:
- ✅ `https://your-app.vercel.app/api/auth/login`
- ❌ `https://your-app.vercel.app/auth/login`

### Issue 4: Cold Start Delays
**Solution:** This is normal for serverless. First request may take 2-3 seconds.

---

## 📱 Testing Your Deployed API

### Health Check:
```bash
curl https://your-project-name.vercel.app/
```

### Test Login:
```bash
curl -X POST https://your-project-name.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🔄 Re-enabling Disabled Features (Future)

### 1. File Uploads (Cloudinary Integration)
```bash
npm install cloudinary
```
Then update `config/multer.config.js` to use Cloudinary storage.

### 2. Reminder Scheduler
**Option A:** Use Vercel Cron (Pro plan required)
- Add `vercel.json` cron configuration
- Create API endpoint for cron to hit

**Option B:** Use external cron service (Free)
- Create API endpoint: `/api/cron/process-reminders`
- Use cron-job.org to hit this endpoint every minute

---

## 📊 Monitoring

### View Logs:
```bash
vercel logs
```

### Or check in Vercel Dashboard:
- Go to your project
- Click on **Deployments**
- Click on a deployment
- View **Function Logs**

---

## 🎯 Next Steps

1. ✅ Deploy to Vercel
2. ✅ Add environment variables
3. ✅ Test all endpoints
4. ⏳ Add Cloudinary for file uploads (optional)
5. ⏳ Setup cron for reminders (optional)
6. ✅ Update frontend to use new API URL

---

## 📞 Support

If you encounter any issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test MongoDB connection
4. Check CORS settings

---

## 🎉 Deployment Complete!

Your backend is now running on Vercel's global edge network with:
- ⚡ Fast response times
- 🌍 Global CDN
- 🔄 Auto-scaling
- 🔒 HTTPS by default
- 🚀 Zero-downtime deployments

Happy coding! 🎊
