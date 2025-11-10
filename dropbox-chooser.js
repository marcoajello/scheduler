// Dropbox Chooser Integration
// ============================
// This uses Dropbox Chooser/Saver APIs (no OAuth needed!)

const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY'; // Replace with your key

// ==============================================
// SCHEDULE FILES - DROPBOX CHOOSER
// ==============================================

// Open file from Dropbox
window.openFromDropbox = function() {
  Dropbox.choose({
    success: async function(files) {
      try {
        // Fetch the file content
        const response = await fetch(files[0].link);
        const text = await response.text();
        const data = JSON.parse(text);
        
        // Track filename
        const fileName = files[0].name;
        localStorage.setItem('currentCloudFile', fileName);
        localStorage.setItem('currentCloudProvider', 'dropbox');
        
        // Load into app
        const writeState = window.writeState || function(s) {
          localStorage.setItem('shootScheduler_v8_10', JSON.stringify(s));
        };
        
        window.__LOADING_FILE__ = true;
        writeState(data);
        location.reload();
      } catch (error) {
        console.error('Error loading from Dropbox:', error);
        alert('Failed to load file: ' + error.message);
      }
    },
    cancel: function() {
      // User canceled
    },
    linkType: 'direct',
    multiselect: false,
    extensions: ['.json'],
    folderselect: false,
  });
};

// Save file to Dropbox
window.saveToDropbox = function(state) {
  // Get filename
  const currentFile = localStorage.getItem('currentCloudFile');
  const fileName = currentFile || `Schedule_${new Date().toISOString().split('T')[0]}.json`;
  
  // Convert to JSON
  const jsonString = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create blob URL (Dropbox Saver needs a URL, not a File object!)
  const blobUrl = URL.createObjectURL(blob);
  
  Dropbox.save({
    files: [{
      url: blobUrl,
      filename: fileName
    }],
    success: function() {
      localStorage.setItem('currentCloudFile', fileName);
      localStorage.setItem('currentCloudProvider', 'dropbox');
      URL.revokeObjectURL(blobUrl); // Clean up
      alert('✓ Saved to Dropbox!');
    },
    error: function(errorMessage) {
      URL.revokeObjectURL(blobUrl); // Clean up
      alert('Failed to save: ' + errorMessage);
    }
  });
};

// ==============================================
// IMAGES - DROPBOX CHOOSER
// ==============================================

// Pick image from Dropbox (for upload column)
window.pickImageFromDropbox = function(callback) {
  Dropbox.choose({
    success: function(files) {
      // Return direct link to image
      callback(files[0].link);
    },
    cancel: function() {
      // User canceled
    },
    linkType: 'direct',
    multiselect: false,
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    folderselect: false,
  });
};

// Save image to Dropbox (when uploading to schedule)
window.saveImageToDropbox = async function(file) {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    
    Dropbox.save({
      files: [{
        url: blobUrl,
        filename: file.name
      }],
      success: function() {
        URL.revokeObjectURL(blobUrl);
        console.log('Image saved to Dropbox');
        resolve({ success: true });
      },
      error: function(errorMessage) {
        URL.revokeObjectURL(blobUrl);
        console.error('Dropbox image save failed:', errorMessage);
        reject(new Error(errorMessage));
      }
    });
  });
};

console.log('Dropbox Chooser API loaded');
