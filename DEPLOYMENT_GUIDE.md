# Deployment Guide - Squarespace + GitHub

## What You're Deploying

**11 essential files** (485 KB total):
- index.html (23 KB)
- script.js (256 KB) 
- styles.css (49 KB)
- supabase-client.js (9 KB)
- dropbox-chooser.js (3.6 KB)
- header-designer.js (113 KB)
- header-designer.css (7.9 KB)
- csv-exporter.js (6 KB)
- print-styles.css (5.8 KB)
- spacing-fix.css (2.1 KB)
- theme-and-improvements.css (7.8 KB)

---

## Step 1: Push to GitHub (5 minutes)

### Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `scheduler-app` (or whatever you want)
3. Make it **Public** (required for free hosting)
4. **Don't** initialize with README
5. Click **Create repository**

### Upload Files

**Option A - GitHub Web Interface (Easiest):**

1. On your new repo page, click **"uploading an existing file"**
2. **Drag and drop all 11 files** from the `/deploy` folder
3. Add commit message: "Initial deployment"
4. Click **Commit changes**

**Option B - Command Line (If you prefer):**

```bash
cd /path/to/your/app/folder
git init
git add *.html *.js *.css
git commit -m "Initial deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/scheduler-app.git
git push -u origin main
```

### Enable GitHub Pages

1. In your repo, go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → **/ (root)**
4. Click **Save**
5. Wait 1-2 minutes for deployment
6. Your app will be live at: `https://YOUR_USERNAME.github.io/scheduler-app/`

---

## Step 2: Deploy to Squarespace (10 minutes)

### Create Blank Page

1. **Squarespace Dashboard** → **Pages**
2. Click **+** → **Blank Page**
3. Name it: "Scheduler" (or whatever you want)
4. **Save**

### Add Code Block

1. **Edit the page**
2. Click **+** → **Code**
3. Select **HTML** (not Markdown)
4. Paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Production Scheduler</title>
  
  <!-- CSS from GitHub -->
  <link rel="stylesheet" href="https://YOUR_USERNAME.github.io/scheduler-app/styles.css">
  <link rel="stylesheet" href="https://YOUR_USERNAME.github.io/scheduler-app/header-designer.css">
  <link rel="stylesheet" href="https://YOUR_USERNAME.github.io/scheduler-app/print-styles.css">
  <link rel="stylesheet" href="https://YOUR_USERNAME.github.io/scheduler-app/spacing-fix.css">
  <link rel="stylesheet" href="https://YOUR_USERNAME.github.io/scheduler-app/theme-and-improvements.css">
</head>
<body>
  <!-- Your app will load here via JavaScript -->
  <div id="app-root"></div>
  
  <!-- Supabase SDK -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  
  <!-- Dropbox Chooser SDK -->
  <script type="text/javascript" 
          src="https://www.dropbox.com/static/api/2/dropins.js" 
          id="dropboxjs" 
          data-app-key="YOUR_DROPBOX_APP_KEY"></script>
  
  <!-- App JavaScript from GitHub -->
  <script src="https://YOUR_USERNAME.github.io/scheduler-app/supabase-client.js"></script>
  <script src="https://YOUR_USERNAME.github.io/scheduler-app/dropbox-chooser.js"></script>
  <script src="https://YOUR_USERNAME.github.io/scheduler-app/csv-exporter.js"></script>
  <script src="https://YOUR_USERNAME.github.io/scheduler-app/header-designer.js"></script>
  <script src="https://YOUR_USERNAME.github.io/scheduler-app/script.js"></script>
  
  <script>
    // Load the full HTML from GitHub
    fetch('https://YOUR_USERNAME.github.io/scheduler-app/index.html')
      .then(response => response.text())
      .then(html => {
        // Extract body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyContent = doc.body.innerHTML;
        document.getElementById('app-root').innerHTML = bodyContent;
        
        // Initialize app after content loads
        if (typeof window.SupabaseAPI?.init === 'function') {
          window.SupabaseAPI.init();
        }
      })
      .catch(error => {
        console.error('Error loading app:', error);
        document.getElementById('app-root').innerHTML = '<h1>Loading error. Please refresh.</h1>';
      });
  </script>
</body>
</html>
```

5. **Replace** `YOUR_USERNAME` with your actual GitHub username (4 places)
6. **Replace** `YOUR_DROPBOX_APP_KEY` with your Dropbox app key
7. Click **Apply**

### Configure Page Settings

1. **Page Settings** (gear icon)
2. **SEO** → Set title and description
3. **Advanced** → **Page Header Code Injection**: (leave empty)
4. **Save**

### Test It

1. **Save & Publish** your Squarespace site
2. Visit your Scheduler page
3. Test both Supabase and Dropbox buttons
4. **Dropbox should work now** (because it's on a real HTTPS domain!)

---

## Step 3: Update App (When You Make Changes)

**Easy workflow:**

1. **Edit files locally** (on your computer)
2. **Test locally** at `http://localhost:8000`
3. **Push to GitHub:**
   - GitHub web: Upload updated files
   - Command line: `git add .` → `git commit -m "Update"` → `git push`
4. **Wait 1-2 minutes** for GitHub Pages to update
5. **Hard refresh** Squarespace page (`Cmd+Shift+R`)
6. Changes are live!

---

## Alternative: Simpler Squarespace Approach

If the above is too complex, you can host everything on GitHub Pages and just **embed an iframe** in Squarespace:

```html
<iframe 
  src="https://YOUR_USERNAME.github.io/scheduler-app/" 
  style="width: 100%; height: 100vh; border: none;"
  title="Production Scheduler">
</iframe>
```

This is easier but gives you less control over the page layout.

---

## Files in /deploy Folder

All clean, production-ready files:
- ✓ No .DS_Store
- ✓ No .md documentation
- ✓ No .sql files  
- ✓ No diagnostic files
- ✓ Only 11 essential files

**Upload only these files to GitHub.**

---

## Troubleshooting

**Dropbox still says "misconfigured":**
- Make sure you're accessing via HTTPS (not localhost)
- Check your Dropbox app key is correct

**Changes don't appear:**
- GitHub Pages takes 1-2 minutes to update
- Hard refresh browser
- Check GitHub Actions tab for deployment status

**App doesn't load on Squarespace:**
- Check browser console (F12) for errors
- Verify all GitHub URLs are correct
- Make sure GitHub repo is Public

**Supabase doesn't work:**
- Check that supabase-client.js has your correct credentials
- Verify RLS policies are set up

---

## Production Checklist

Before going live:
- [ ] Test Supabase login
- [ ] Test Dropbox save/load
- [ ] Test PDF generation (Railway should still work)
- [ ] Test on mobile devices
- [ ] Test in different browsers
- [ ] Share test link with a colleague

---

## What's Next

Once deployed:
1. Get user feedback
2. Add analytics (Google Analytics via Squarespace)
3. Consider custom domain
4. Add more features based on usage
