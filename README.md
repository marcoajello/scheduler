# Production Scheduler

Web-based scheduling application for commercial shoots. Minute-by-minute timeline with drag-and-drop, multi-day support, and cloud sync.

## Features

- ⏱️ Minute-by-minute scheduling with time calculations
- 🖱️ Drag-and-drop event reordering
- 📅 Multi-day shoot support
- ☁️ Cloud storage via Supabase
- 📦 Dropbox integration for file management
- 📄 PDF generation for call sheets
- 🎨 Customizable headers and layouts
- 🌓 Light/dark theme
- 📱 Responsive design

## Setup

See `DEPLOYMENT_GUIDE.md` for full deployment instructions.

### Quick Start

1. Upload all files to GitHub repository
2. Enable GitHub Pages (Settings → Pages → Deploy from main branch)
3. Configure Supabase credentials in `supabase-client.js`
4. Add Dropbox app key in `index.html`
5. Access at `https://YOUR_USERNAME.github.io/REPO_NAME/`

## File Structure

```
├── index.html              # Main HTML
├── script.js               # Core application logic
├── styles.css              # Main styles
├── supabase-client.js      # Supabase integration
├── dropbox-chooser.js      # Dropbox integration
├── header-designer.js      # Header customization
├── header-designer.css     # Header styles
├── csv-exporter.js         # CSV export
├── print-styles.css        # Print formatting
├── spacing-fix.css         # Layout fixes
└── theme-and-improvements.css  # Theme system
```

## Technologies

- Vanilla JavaScript (no frameworks)
- Supabase for authentication & storage
- Dropbox Chooser API for file management
- Puppeteer (Railway) for PDF generation
- IndexedDB for local media storage

## License

Private/Commercial - All rights reserved
