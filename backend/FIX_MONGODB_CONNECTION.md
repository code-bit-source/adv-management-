# 🔧 Fix MongoDB Connection Error

## ❌ Problem Identified

Your MongoDB connection string has two issues:

### Current (Wrong):
```
mongodb+srv://crazyhckrs_db_user:@123456789@cluster0.seh8kea.mongodb.net/
```

### Issues:
1. **Password contains `@` symbol** - Needs URL encoding
2. **Missing database name** at the end

---

## ✅ Solution

### Step 1: URL Encode Your Password

Your password: `@123456789`

**Special characters in passwords must be URL-encoded:**
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`

**Your encoded password:** `%40123456789`

### Step 2: Add Database Name

Choose a database name (e.g., `courtcase`, `adv_management`, etc.)

### Step 3: Correct Connection String

**Your corrected MONGODB_URL should be:**

```
mongodb+srv://crazyhckrs_db_user:%40123456789@cluster0.seh8kea.mongodb.net/courtcase?retryWrites=true&w=majority
```

**Breakdown:**
- Username: `crazyhckrs_db_user`
- Password: `%40123456789` (URL-encoded)
- Cluster: `cluster0.seh8kea.mongodb.net`
- Database: `courtcase` (you can change this name)
- Options: `?retryWrites=true&w=majority`

---

## 🚀 How to Update

### For Local Development:

**Update your `.env` file:**
```env
MONGODB_URL=mongodb+srv://crazyhckrs_db_user:%40123456789@cluster0.seh8kea.mongodb.net/courtcase?retryWrites=true&w=majority
```

### For Vercel Deployment:

1. Go to **Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `MONGODB_URL` and click **Edit**
5. Update with the corrected connection string:
   ```
   mongodb+srv://crazyhckrs_db_user:%40123456789@cluster0.seh8kea.mongodb.net/courtcase?retryWrites=true&w=majority
   ```
6. Click **Save**
7. **Redeploy** your application

---

## 🔐 MongoDB Atlas Network Access

Also make sure MongoDB Atlas allows connections from Vercel:

1. Go to **MongoDB Atlas Dashboard**
2. Click on **Network Access** (left sidebar)
3. Click **Add IP Address**
4. Select **Allow Access from Anywhere** (0.0.0.0/0)
5. Click **Confirm**

**Note:** This is required for Vercel serverless functions.

---

## ✅ Test Connection

### Test Locally:

1. Update `.env` file with corrected connection string
2. Restart your server:
   ```bash
   npm run dev
   ```
3. Check console for: `✅ Database connected successfully`

### Test on Vercel:

1. Update environment variable in Vercel Dashboard
2. Redeploy:
   ```bash
   vercel --prod
   ```
3. Check function logs:
   ```bash
   vercel logs --follow
   ```
4. Look for: `✅ Database connected successfully`

---

## 🔍 Common Password Special Characters

If your password has other special characters, encode them:

| Character | URL Encoded |
|-----------|-------------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `/` | `%2F` |
| `:` | `%3A` |
| `=` | `%3D` |
| `?` | `%3F` |

**Example:**
- Password: `P@ss#123`
- Encoded: `P%40ss%23123`

---

## 🎯 Quick Fix Commands

### Update .env locally:
```bash
# Open .env file and update MONGODB_URL
# Then restart server
npm run dev
```

### Update Vercel and redeploy:
```bash
# After updating environment variable in Vercel Dashboard
vercel --prod --force
```

---

## ✨ After Fix

You should see:
```
✅ Database connected successfully
```

And no more errors like:
```
❌ querySrv ECONNREFUSED _mongodb._tcp.123456789
```

---

## 🆘 Still Having Issues?

### Check These:

1. **Connection String Format:**
   - Starts with `mongodb+srv://`
   - Has username and encoded password
   - Has cluster address
   - Has database name
   - Has query parameters

2. **MongoDB Atlas:**
   - Network Access allows 0.0.0.0/0
   - Database user exists
   - Password is correct

3. **Vercel:**
   - Environment variable is set correctly
   - Redeployed after updating variable
   - No typos in variable name (case-sensitive)

---

## 📞 Need More Help?

If still not working:
1. Check MongoDB Atlas connection string in Atlas Dashboard
2. Test connection string locally first
3. Verify network access settings
4. Check Vercel function logs for exact error

---

## ✅ Correct Connection String Template

```
mongodb+srv://USERNAME:URL_ENCODED_PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

**Your specific string:**
```
mongodb+srv://crazyhckrs_db_user:%40123456789@cluster0.seh8kea.mongodb.net/courtcase?retryWrites=true&w=majority
```

Copy this and use it! 🎉
