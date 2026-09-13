# Deployment Guide — Serene Pomodoro

Your website is 100% static, self-contained, and ready for deployment to any web host. Below are the easiest free ways to deploy it in minutes.

---

## 🌟 Option 1: Netlify Drop (Easiest — Takes 30 Seconds, No CLI/Git Required)

This is the fastest method to get a free live `https://` website URL.

1. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)** (log in or create a free account).
2. Open Windows File Explorer and navigate to:
   ```
   C:\Users\shakt\.gemini\antigravity\scratch
   ```
3. Drag and drop the **`peaceful-pomodoro`** folder directly into the box on the Netlify Drop page.
4. Netlify will instantly deploy it and give you a live production URL (e.g., `https://peaceful-pomodoro-xyz.netlify.app`).

---

## ⚡ Option 2: Vercel (Fast & Professional)

1. Go to **[vercel.com](https://vercel.com)** and sign in.
2. Click **"Add New..."** → **"Project"**.
3. If using GitHub, push this folder to a GitHub repository and import it into Vercel.
4. Or using Vercel CLI (if installed):
   ```bash
   vercel
   ```
5. Pre-configured `vercel.json` and `package.json` are already included in the folder.

---

## 🐙 Option 3: GitHub Pages (Free Forever with GitHub)

1. Go to **[github.com/new](https://github.com/new)** and create a new repository (e.g., `serene-pomodoro`).
2. You can either:
   - **Upload files directly on GitHub**: Click *"uploading an existing file"* on your new GitHub repo page, select all the files from `C:\Users\shakt\.gemini\antigravity\scratch\peaceful-pomodoro`, and commit.
3. In your GitHub repository:
   - Go to **Settings** → **Pages** (on the left menu).
   - Under **Branch**, select `main` (or `master`) and `/ (root)`, then click **Save**.
4. In ~1 minute, your site will be live at `https://<your-username>.github.io/serene-pomodoro/`!

---

## 📱 Progressive Web App (PWA) on Mobile

Once deployed to any HTTPS URL:
- **iPhone / iPad (Safari)**: Tap the Share button → **"Add to Home Screen"**.
- **Android (Chrome)**: Tap the 3-dots menu → **"Install app"** or **"Add to Home Screen"**.
- The app will run standalone in full-screen mode like a native app without any browser address bar!
