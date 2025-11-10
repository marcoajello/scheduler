# 🚀 Quick Deployment Checklist

## What's in This Folder

✅ **11 production files** (485 KB) - Upload these to GitHub
📖 **3 documentation files** - For reference

**Ready to deploy!** All junk files removed.

---

## Deploy in 3 Steps (15 minutes)

### ☁️ Step 1: GitHub (5 min)

1. Create new repo: https://github.com/new
   - Name: `scheduler-app`
   - Public repository
2. Upload all 14 files from this folder
3. Settings → Pages → Deploy from `main` branch
4. Wait 2 minutes
5. ✅ Live at: `https://YOUR_USERNAME.github.io/scheduler-app/`

### 🌐 Step 2: Squarespace (5 min)

1. Pages → Add **Blank Page** → Name it "Scheduler"
2. Add **Code Block** → Paste the iframe code below
3. Save & Publish
4. ✅ Done!

**Iframe code for Squarespace:**
```html
<iframe 
  src="https://YOUR_USERNAME.github.io/scheduler-app/" 
  style="width: 100%; height: 100vh; border: none;"
  title="Production Scheduler">
</iframe>
```

Replace `YOUR_USERNAME` with your GitHub username.

### 🔧 Step 3: Configure (5 min)

**Before first use, update these:**

1. **index.html** line ~473:
   - Replace `YOUR_DROPBOX_APP_KEY_HERE` with your Dropbox key
   
2. **supabase-client.js** lines 4-5:
   - Already has your Supabase credentials ✅

That's it!

---

## Test Checklist

Visit your Squarespace page and test:
- [ ] App loads
- [ ] Can create/edit schedule
- [ ] "📦 Save to Dropbox" works
- [ ] "📦 Open from Dropbox" works
- [ ] PDF generation works
- [ ] Light/dark theme toggle works

---

## Files Included

**Core (3):**
- index.html, script.js, styles.css

**Integrations (2):**
- supabase-client.js, dropbox-chooser.js

**Features (6):**
- header-designer.js/css
- csv-exporter.js
- print-styles.css
- spacing-fix.css
- theme-and-improvements.css

**Docs (3):**
- README.md - For GitHub
- DEPLOYMENT_GUIDE.md - Detailed instructions
- FILES.txt - File list

---

## Need Help?

**Read:** DEPLOYMENT_GUIDE.md (full instructions)

**Common Issues:**
- Dropbox not working? Check app key in index.html
- App not loading? Check GitHub Pages is enabled
- Changes not showing? Hard refresh (Cmd+Shift+R)

---

## Update Workflow

1. Edit files locally
2. Test at http://localhost:8000
3. Upload changed files to GitHub
4. Wait 1-2 minutes
5. Hard refresh Squarespace page
6. ✅ Live!

---

**You're ready to deploy! 🎉**
