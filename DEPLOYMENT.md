# Deployment Guide: Railway vs Render

## Quick Comparison

| Feature            | Railway          | Render                  |
| ------------------ | ---------------- | ----------------------- |
| **Setup Time**     | 5 minutes        | 10 minutes              |
| **Free Tier**      | $5/month free    | Free (with limitations) |
| **FFmpeg Support** | ✅ Built-in      | ✅ Built-in             |
| **Ease of Use**    | ⭐⭐⭐⭐⭐       | ⭐⭐⭐⭐                |
| **Best For**       | Quick deployment | More control            |

---

## 🚀 Deployment Option 1: RAILWAY (Recommended - Easiest)

### Prerequisites

1. GitHub account (repository must be public or private with access)
2. Railway account (free tier available)

### Step-by-Step

#### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

#### 2. Create Railway Account

- Visit: https://railway.app
- Sign up with GitHub (click "Deploy with GitHub")
- Authorize Railway

#### 3. Deploy Your Project

- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your `DOST-Frame-Exporter` repository
- Railway will automatically:
  - Detect Node.js runtime
  - Install dependencies from `package.json`
  - Install FFmpeg (via `nixpacks.toml`)
  - Start the app with `node server.js`

#### 4. Configure Environment (if needed)

- In Railway dashboard, go to **Variables**
- Add if desired:
  ```
  NODE_ENV = production
  PORT = 3000
  ```

#### 5. Get Your URL

- Railway generates a public URL like: `https://dost-frame-exporter-prod.up.railway.app`
- Your app is live! 🎉

#### 6. Monitor & Logs

- View logs in Railway dashboard in real-time
- Check status and resource usage

---

## 🚀 Deployment Option 2: RENDER

### Prerequisites

1. GitHub account
2. Render account (free tier available at https://render.com)

### Step-by-Step

#### 1. Push to GitHub (same as above)

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

#### 2. Create Render Account

- Visit: https://render.com
- Click "Sign up" → "GitHub"
- Authorize Render with GitHub

#### 3. Create Web Service

- Dashboard → "New +" → "Web Service"
- Select your `DOST-Frame-Exporter` repo
- Configure settings:
  - **Name**: `dost-frame-exporter`
  - **Runtime**: Node
  - **Build Command**: `npm install`
  - **Start Command**: `node server.js`
  - **Plan**: Free (or Starter for better performance)

#### 4. Environment Variables

- In Render dashboard, go to **Environment**
- Add:
  ```
  NODE_ENV=production
  ```

#### 5. Deploy

- Click "Create Web Service"
- Render deploys automatically (watch logs)
- Gets a URL like: `https://dost-frame-exporter.onrender.com`

#### 6. Important Note (Free Tier)

- Service spins down after 15 minutes of inactivity
- First request takes ~30 seconds to start
- To avoid this, upgrade to Starter plan ($7/month)

---

## 📋 What Gets Deployed

✅ **Included:**

- `server.js` - Your Express app
- `public/` - Frontend files (HTML, CSS, JS)
- `package.json` - Dependencies (express, multer, fluent-ffmpeg, jszip, cors)
- FFmpeg binary (installed by nixpacks)

❌ **Excluded (via .gitignore):**

- `node_modules/` - Reinstalled during build
- `uploads/` - Temporary files (uses ephemeral storage)
- `ffmpeg/bin/ffmpeg.exe` - Replaced with system FFmpeg

---

## ⚠️ Important Limitations on Production

### File Size

- **Local**: 36GB upload limit
- **Production**: Limited to **500MB** (adjust as needed)
  - Edit `UPLOAD_LIMIT` in `server.js` line ~54

### Storage

- Files stored in **ephemeral storage** (deleted when container restarts)
- Suitable for: Temporary processing
- Not suitable for: Permanent file storage

### Processing Time

- Railway: Up to **5+ minutes** per request
- Render: Up to **30 minutes** per request
- No timeout issues for video processing ✅

---

## 🔧 Customization After Deploy

### Increase Upload Limit (if needed)

Edit `server.js` (line ~54):

```javascript
const UPLOAD_LIMIT =
  process.env.NODE_ENV === "production"
    ? 2000 * 1024 * 1024 // 2GB instead of 500MB
    : 36 * 1024 * 1024 * 1024;
```

Then push to GitHub (auto-redeploys).

### Monitor Logs

- **Railway**: Dashboard → Logs (real-time)
- **Render**: Dashboard → Logs (real-time)

### Custom Domain

- Both platforms support custom domains
- Add your domain in platform settings

---

## ✅ Test After Deployment

1. Visit your deployed URL
2. Upload a small test video
3. Extract frames at 2 FPS
4. Download the ZIP file

---

## 🆘 Troubleshooting

### "FFmpeg not found" Error

- Solution: Make sure `nixpacks.toml` is in repository root
- Commit and push changes: `git push`

### Upload Size Limit Error

- Reduce video size or increase `UPLOAD_LIMIT` in `server.js`

### Service Taking Long to Start (Render Free)

- Upgrade to **Starter plan** to keep service warm
- Or use **Railway** (no cold start issues)

### Stuck Processing

- Check logs for errors
- Video might be too large or too long
- Try with a shorter test video first

---

## 📞 Next Steps

1. **Choose platform** (Railway recommended for simplicity)
2. **Push code to GitHub**: `git push`
3. **Follow deployment steps** above
4. **Test your deployment** with a sample video
5. **Share the URL** with users!

**Questions?** Check platform documentation:

- Railway: https://docs.railway.app
- Render: https://render.com/docs
