# 🚀 Quick Deployment Commands

## Method 1: Using Vercel CLI (Recommended)

### Install Vercel CLI
```bash
npm install -g vercel
```

### Login to Vercel
```bash
vercel login
```

### Deploy (from project root)
```bash
vercel
```

### Deploy to Production
```bash
vercel --prod
```

---

## Method 2: Using GitHub (Easiest)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Vercel deployment ready"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Vercel will auto-detect settings
6. Add environment variables (see below)
7. Click **"Deploy"**

---

## 🔐 Environment Variables to Add in Vercel Dashboard

```env
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id (if using)
GOOGLE_CLIENT_SECRET=your_google_client_secret (if using)
```

**Where to add:**
1. Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add each variable
4. Redeploy if already deployed

---

## ✅ After Deployment

### Get your deployment URL:
```
https://your-project-name.vercel.app
```

### Test the API:
```bash
curl https://your-project-name.vercel.app/
```

### View logs:
```bash
vercel logs
```

---

## 🔄 Update Deployment

### After making changes:
```bash
git add .
git commit -m "your changes"
git push origin main
```

Vercel will automatically redeploy!

Or using CLI:
```bash
vercel --prod
```

---

## 📱 Important URLs

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Your API:** https://your-project-name.vercel.app
- **API Health:** https://your-project-name.vercel.app/api

---

## 🎯 Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Project imported to Vercel
- [ ] Environment variables added
- [ ] Deployment successful
- [ ] API health check working
- [ ] Frontend updated with new API URL
- [ ] Test login/signup endpoints
- [ ] MongoDB connection working

---

## 🆘 Troubleshooting

### Deployment failed?
```bash
vercel logs --follow
```

### Environment variables not working?
- Check spelling (case-sensitive)
- Redeploy after adding variables

### Database connection error?
- Verify MONGODB_URL is correct
- Check MongoDB allows connections from 0.0.0.0/0

---

## 📞 Need Help?

Check the detailed guide: `VERCEL_DEPLOYMENT.md`
