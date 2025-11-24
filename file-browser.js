// =============================================================================
// FILE BROWSER - Unified File Management System
// =============================================================================
// Professional file browser with gateable cloud sync support.
// Abstracts storage providers (local, Supabase, etc.) behind a clean interface.
// =============================================================================

const FileBrowser = (function() {
  'use strict';

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------
  
  const RECENT_FILES_KEY = 'scheduler_recent_files';
  const MAX_RECENT_FILES = 10;
  const CURRENT_FILE_KEY = 'currentCloudFile';
  const CURRENT_PROVIDER_KEY = 'currentCloudProvider';

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  
  let browserModal = null;
  let saveModal = null;
  let currentMode = 'open'; // 'open' or 'save'
  let onFileSelected = null;
  let onFileSaved = null;

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION / GATING
  // ---------------------------------------------------------------------------
  
  // Check if cloud sync is enabled (gateable for paid users)
  function isCloudEnabled() {
    // TODO: Check subscription status
    // For now, check if user is authenticated with Supabase
    // In production, this would check: subscription.tier === 'pro'
    
    const localMode = localStorage.getItem('useLocalMode') === 'true';
    if (localMode) return false;
    
    if (window.SupabaseAPI && window.SupabaseAPI.auth.isAuthenticated()) {
      // Here you would check subscription status:
      // const user = window.SupabaseAPI.auth.getCurrentUser();
      // return user.subscription?.active === true;
      return true; // For now, all authenticated users get cloud
    }
    
    return false;
  }

  // Check if user can use cloud features (for UI display)
  function getCloudStatus() {
    const localMode = localStorage.getItem('useLocalMode') === 'true';
    
    if (localMode) {
      return { available: false, reason: 'local_mode' };
    }
    
    if (!window.SupabaseAPI) {
      return { available: false, reason: 'not_loaded' };
    }
    
    if (!window.SupabaseAPI.auth.isAuthenticated()) {
      return { available: false, reason: 'not_signed_in' };
    }
    
    // TODO: Check subscription
    // if (!hasActiveSubscription()) {
    //   return { available: false, reason: 'no_subscription' };
    // }
    
    return { available: true, reason: null };
  }

  // ---------------------------------------------------------------------------
  // RECENT FILES (Local tracking)
  // ---------------------------------------------------------------------------
  
  function getRecentFiles() {
    try {
      const stored = localStorage.getItem(RECENT_FILES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function addToRecentFiles(file) {
    const recent = getRecentFiles();
    
    // Remove existing entry for same file
    const filtered = recent.filter(f => 
      !(f.name === file.name && f.provider === file.provider)
    );
    
    // Add to front
    filtered.unshift({
      name: file.name,
      provider: file.provider,
      lastOpened: new Date().toISOString(),
      displayName: file.displayName || file.name.replace('.json', '')
    });
    
    // Limit size
    const trimmed = filtered.slice(0, MAX_RECENT_FILES);
    
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
  }

  function removeFromRecentFiles(fileName, provider) {
    const recent = getRecentFiles();
    const filtered = recent.filter(f => 
      !(f.name === fileName && f.provider === provider)
    );
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
  }

  // ---------------------------------------------------------------------------
  // FILE OPERATIONS
  // ---------------------------------------------------------------------------
  
  async function listAllFiles() {
    const files = [];
    
    // Get cloud files if enabled
    if (isCloudEnabled()) {
      try {
        const result = await window.SupabaseAPI.files.listScheduleFiles();
        if (result.success && result.data) {
          result.data.forEach(f => {
            files.push({
              name: f.name,
              displayName: f.name.replace('.json', ''),
              provider: 'cloud',
              providerName: 'Cloud',
              modified: f.updated_at || f.created_at,
              size: f.metadata?.size || null
            });
          });
        }
      } catch (e) {
        console.error('Failed to list cloud files:', e);
      }
    }
    
    // Get recent local files (we can't actually list local files, but we track recent ones)
    const recent = getRecentFiles();
    recent.forEach(f => {
      if (f.provider === 'local') {
        // Only add if not already in cloud list
        const exists = files.some(cf => cf.name === f.name);
        if (!exists) {
          files.push({
            name: f.name,
            displayName: f.displayName || f.name.replace('.json', ''),
            provider: 'local',
            providerName: 'This Device',
            modified: f.lastOpened,
            size: null,
            isRecent: true
          });
        }
      }
    });
    
    // Sort by modified date, newest first
    files.sort((a, b) => {
      const dateA = new Date(a.modified || 0);
      const dateB = new Date(b.modified || 0);
      return dateB - dateA;
    });
    
    return files;
  }

  async function openFile(fileName, provider) {
    if (provider === 'cloud') {
      if (!isCloudEnabled()) {
        showToast('Cloud sync not available', 'error');
        return { success: false, error: 'Cloud sync not available' };
      }
      
      const result = await window.SupabaseAPI.files.loadScheduleFile(fileName);
      if (result.success) {
        // Track in recents
        addToRecentFiles({ name: fileName, provider: 'cloud' });
        
        // Update current file tracking
        localStorage.setItem(CURRENT_FILE_KEY, fileName);
        localStorage.setItem(CURRENT_PROVIDER_KEY, 'supabase');
        
        return { success: true, data: result.data, fileName };
      }
      return result;
      
    } else if (provider === 'local') {
      // For local files, we need to prompt user to select file
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) {
            resolve({ success: false, error: 'No file selected' });
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              
              // Track in recents
              addToRecentFiles({ name: file.name, provider: 'local' });
              
              // Update current file tracking
              localStorage.setItem(CURRENT_FILE_KEY, file.name);
              localStorage.setItem(CURRENT_PROVIDER_KEY, 'local');
              
              resolve({ success: true, data, fileName: file.name });
            } catch (error) {
              resolve({ success: false, error: 'Invalid JSON file' });
            }
          };
          reader.onerror = () => {
            resolve({ success: false, error: 'Failed to read file' });
          };
          reader.readAsText(file);
        };
        
        input.oncancel = () => {
          resolve({ success: false, error: 'Cancelled' });
        };
        
        input.click();
      });
    }
    
    return { success: false, error: 'Unknown provider' };
  }

  async function saveFile(fileName, data, provider) {
    if (!fileName.endsWith('.json')) {
      fileName += '.json';
    }
    
    if (provider === 'cloud') {
      if (!isCloudEnabled()) {
        showToast('Cloud sync not available', 'error');
        return { success: false, error: 'Cloud sync not available' };
      }
      
      const result = await window.SupabaseAPI.files.saveScheduleFile(fileName, data);
      if (result.success) {
        addToRecentFiles({ name: fileName, provider: 'cloud' });
        localStorage.setItem(CURRENT_FILE_KEY, fileName);
        localStorage.setItem(CURRENT_PROVIDER_KEY, 'supabase');
        showToast('Saved to cloud');
      }
      return result;
      
    } else {
      // Local save - download file
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      addToRecentFiles({ name: fileName, provider: 'local' });
      localStorage.setItem(CURRENT_FILE_KEY, fileName);
      localStorage.setItem(CURRENT_PROVIDER_KEY, 'local');
      
      showToast('Downloaded');
      return { success: true };
    }
  }

  async function deleteFile(fileName, provider) {
    if (provider === 'cloud') {
      if (!isCloudEnabled()) {
        return { success: false, error: 'Cloud sync not available' };
      }
      
      const result = await window.SupabaseAPI.files.deleteScheduleFile(fileName);
      if (result.success) {
        removeFromRecentFiles(fileName, 'cloud');
      }
      return result;
    } else {
      // Can't delete local files, just remove from recents
      removeFromRecentFiles(fileName, 'local');
      return { success: true };
    }
  }

  // Quick save to current location
  async function quickSave(data) {
    const currentFile = localStorage.getItem(CURRENT_FILE_KEY);
    const currentProvider = localStorage.getItem(CURRENT_PROVIDER_KEY);
    
    if (!currentFile) {
      // No current file - need Save As
      return { success: false, needsSaveAs: true };
    }
    
    const provider = currentProvider === 'supabase' ? 'cloud' : 'local';
    return await saveFile(currentFile, data, provider);
  }

  // ---------------------------------------------------------------------------
  // CURRENT FILE INFO
  // ---------------------------------------------------------------------------
  
  function getCurrentFile() {
    const name = localStorage.getItem(CURRENT_FILE_KEY);
    const provider = localStorage.getItem(CURRENT_PROVIDER_KEY);
    
    if (!name) return null;
    
    return {
      name,
      displayName: name.replace('.json', ''),
      provider: provider === 'supabase' ? 'cloud' : 'local'
    };
  }

  function clearCurrentFile() {
    localStorage.removeItem(CURRENT_FILE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_KEY);
  }

  // ---------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.fb-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `fb-toast fb-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('fb-toast-visible');
    });
    
    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('fb-toast-visible');
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  // ---------------------------------------------------------------------------
  // BROWSER MODAL UI
  // ---------------------------------------------------------------------------
  
  function createBrowserModal() {
    const modal = document.createElement('div');
    modal.className = 'fb-modal';
    modal.innerHTML = `
      <div class="fb-modal-content">
        <div class="fb-header">
          <h2 class="fb-title">Open Schedule</h2>
          <button class="fb-close" aria-label="Close">&times;</button>
        </div>
        
        <div class="fb-toolbar">
          <button class="fb-btn fb-btn-icon" id="fbOpenLocal" title="Open from this device">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Import File
          </button>
          <div class="fb-toolbar-spacer"></div>
          <div class="fb-cloud-status" id="fbCloudStatus"></div>
        </div>
        
        <div class="fb-file-list" id="fbFileList">
          <div class="fb-loading">Loading...</div>
        </div>
        
        <div class="fb-empty" id="fbEmpty" style="display: none;">
          <div class="fb-empty-icon">📄</div>
          <div class="fb-empty-text">No saved schedules</div>
          <div class="fb-empty-hint">Create a new schedule or import an existing file</div>
        </div>
        
        <div class="fb-footer">
          <button class="fb-btn fb-btn-ghost" id="fbCancel">Cancel</button>
          <button class="fb-btn fb-btn-primary" id="fbOpen" disabled>Open</button>
        </div>
      </div>
    `;
    
    return modal;
  }

  function createSaveModal() {
    const modal = document.createElement('div');
    modal.className = 'fb-modal';
    modal.innerHTML = `
      <div class="fb-modal-content fb-modal-save">
        <div class="fb-header">
          <h2 class="fb-title">Save Schedule</h2>
          <button class="fb-close" aria-label="Close">&times;</button>
        </div>
        
        <div class="fb-save-form">
          <label class="fb-label">File Name</label>
          <input type="text" class="fb-input" id="fbFileName" placeholder="MySchedule" />
          
          <label class="fb-label">Save To</label>
          <div class="fb-location-options" id="fbLocationOptions">
            <label class="fb-location-option">
              <input type="radio" name="saveLocation" value="local" checked />
              <span class="fb-location-info">
                <span class="fb-location-name">This Device</span>
                <span class="fb-location-desc">Download as file</span>
              </span>
            </label>
            <label class="fb-location-option" id="fbCloudOption">
              <input type="radio" name="saveLocation" value="cloud" />
              <span class="fb-location-info">
                <span class="fb-location-name">Cloud</span>
                <span class="fb-location-desc">Sync across devices</span>
              </span>
              <span class="fb-location-badge" id="fbCloudBadge"></span>
            </label>
          </div>
        </div>
        
        <div class="fb-footer">
          <button class="fb-btn fb-btn-ghost" id="fbSaveCancel">Cancel</button>
          <button class="fb-btn fb-btn-primary" id="fbSaveConfirm">Save</button>
        </div>
      </div>
    `;
    
    return modal;
  }

  function renderFileList(files, container) {
    container.innerHTML = '';
    
    if (files.length === 0) {
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'fb-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th class="fb-th-name">Name</th>
          <th class="fb-th-location">Location</th>
          <th class="fb-th-modified">Modified</th>
          <th class="fb-th-actions"></th>
        </tr>
      </thead>
      <tbody id="fbTableBody"></tbody>
    `;
    
    const tbody = table.querySelector('#fbTableBody');
    
    files.forEach(file => {
      const row = document.createElement('tr');
      row.className = 'fb-row';
      row.dataset.fileName = file.name;
      row.dataset.provider = file.provider;
      
      const modifiedDate = file.modified ? formatDate(file.modified) : '—';
      const providerIcon = file.provider === 'cloud' ? '☁️' : '💻';
      
      row.innerHTML = `
        <td class="fb-cell-name">
          <span class="fb-file-icon">📄</span>
          <span class="fb-file-name">${escapeHtml(file.displayName)}</span>
        </td>
        <td class="fb-cell-location">
          <span class="fb-provider-badge fb-provider-${file.provider}">
            ${providerIcon} ${file.providerName}
          </span>
        </td>
        <td class="fb-cell-modified">${modifiedDate}</td>
        <td class="fb-cell-actions">
          <button class="fb-btn-delete" title="Delete" data-name="${escapeHtml(file.name)}" data-provider="${file.provider}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
            </svg>
          </button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
    
    container.appendChild(table);
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (e) {
      return '—';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateCloudStatus(container) {
    const status = getCloudStatus();
    
    if (status.available) {
      container.innerHTML = `<span class="fb-status-ok">☁️ Cloud Connected</span>`;
    } else {
      let message = '';
      switch (status.reason) {
        case 'local_mode':
          message = 'Local Mode';
          break;
        case 'not_signed_in':
          message = 'Sign in for cloud sync';
          break;
        case 'no_subscription':
          message = 'Upgrade for cloud sync';
          break;
        default:
          message = 'Cloud unavailable';
      }
      container.innerHTML = `<span class="fb-status-off">${message}</span>`;
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC METHODS
  // ---------------------------------------------------------------------------
  
  async function showOpenDialog(callback) {
    onFileSelected = callback;
    currentMode = 'open';
    
    // Create modal if needed
    if (!browserModal) {
      browserModal = createBrowserModal();
      document.body.appendChild(browserModal);
      
      // Wire up events
      const closeBtn = browserModal.querySelector('.fb-close');
      const cancelBtn = browserModal.querySelector('#fbCancel');
      const openBtn = browserModal.querySelector('#fbOpen');
      const openLocalBtn = browserModal.querySelector('#fbOpenLocal');
      const fileList = browserModal.querySelector('#fbFileList');
      const emptyState = browserModal.querySelector('#fbEmpty');
      
      closeBtn.onclick = () => hideDialog();
      cancelBtn.onclick = () => hideDialog();
      
      browserModal.onclick = (e) => {
        if (e.target === browserModal) hideDialog();
      };
      
      // Open local file
      openLocalBtn.onclick = async () => {
        const result = await openFile(null, 'local');
        if (result.success) {
          hideDialog();
          if (onFileSelected) onFileSelected(result);
        }
      };
      
      // Row selection
      fileList.onclick = (e) => {
        const row = e.target.closest('.fb-row');
        const deleteBtn = e.target.closest('.fb-btn-delete');
        
        if (deleteBtn) {
          e.stopPropagation();
          handleDelete(deleteBtn.dataset.name, deleteBtn.dataset.provider);
          return;
        }
        
        if (row) {
          // Deselect all
          fileList.querySelectorAll('.fb-row').forEach(r => r.classList.remove('fb-row-selected'));
          row.classList.add('fb-row-selected');
          openBtn.disabled = false;
        }
      };
      
      // Double-click to open
      fileList.ondblclick = (e) => {
        const row = e.target.closest('.fb-row');
        if (row) {
          handleOpen(row.dataset.fileName, row.dataset.provider);
        }
      };
      
      // Open button
      openBtn.onclick = () => {
        const selected = fileList.querySelector('.fb-row-selected');
        if (selected) {
          handleOpen(selected.dataset.fileName, selected.dataset.provider);
        }
      };
    }
    
    // Show modal
    browserModal.classList.add('fb-modal-visible');
    
    // Update cloud status
    const statusContainer = browserModal.querySelector('#fbCloudStatus');
    updateCloudStatus(statusContainer);
    
    // Load files
    const fileList = browserModal.querySelector('#fbFileList');
    const emptyState = browserModal.querySelector('#fbEmpty');
    const openBtn = browserModal.querySelector('#fbOpen');
    
    fileList.innerHTML = '<div class="fb-loading">Loading...</div>';
    emptyState.style.display = 'none';
    openBtn.disabled = true;
    
    const files = await listAllFiles();
    
    if (files.length === 0) {
      fileList.innerHTML = '';
      emptyState.style.display = 'flex';
    } else {
      emptyState.style.display = 'none';
      renderFileList(files, fileList);
    }
  }

  function showSaveDialog(currentName, callback) {
    onFileSaved = callback;
    currentMode = 'save';
    
    // Create modal if needed
    if (!saveModal) {
      saveModal = createSaveModal();
      document.body.appendChild(saveModal);
      
      const closeBtn = saveModal.querySelector('.fb-close');
      const cancelBtn = saveModal.querySelector('#fbSaveCancel');
      const saveBtn = saveModal.querySelector('#fbSaveConfirm');
      const fileNameInput = saveModal.querySelector('#fbFileName');
      const cloudOption = saveModal.querySelector('#fbCloudOption');
      const cloudBadge = saveModal.querySelector('#fbCloudBadge');
      const cloudRadio = cloudOption.querySelector('input[value="cloud"]');
      
      closeBtn.onclick = () => hideDialog();
      cancelBtn.onclick = () => hideDialog();
      
      saveModal.onclick = (e) => {
        if (e.target === saveModal) hideDialog();
      };
      
      saveBtn.onclick = () => {
        const fileName = fileNameInput.value.trim();
        if (!fileName) {
          fileNameInput.focus();
          return;
        }
        
        const location = saveModal.querySelector('input[name="saveLocation"]:checked').value;
        handleSave(fileName, location);
      };
      
      // Enter key to save
      fileNameInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          saveBtn.click();
        }
      };
    }
    
    // Update cloud option availability
    const cloudOption = saveModal.querySelector('#fbCloudOption');
    const cloudRadio = cloudOption.querySelector('input[value="cloud"]');
    const cloudBadge = saveModal.querySelector('#fbCloudBadge');
    const status = getCloudStatus();
    
    if (status.available) {
      cloudRadio.disabled = false;
      cloudOption.classList.remove('fb-location-disabled');
      cloudBadge.textContent = '';
    } else {
      cloudRadio.disabled = true;
      cloudOption.classList.add('fb-location-disabled');
      
      switch (status.reason) {
        case 'not_signed_in':
          cloudBadge.textContent = 'Sign in required';
          break;
        case 'no_subscription':
          cloudBadge.textContent = 'Pro';
          break;
        default:
          cloudBadge.textContent = 'Unavailable';
      }
    }
    
    // Set current file name
    const fileNameInput = saveModal.querySelector('#fbFileName');
    fileNameInput.value = (currentName || '').replace('.json', '');
    
    // Select appropriate location based on current provider
    const currentProvider = localStorage.getItem(CURRENT_PROVIDER_KEY);
    if (currentProvider === 'supabase' && status.available) {
      saveModal.querySelector('input[value="cloud"]').checked = true;
    } else {
      saveModal.querySelector('input[value="local"]').checked = true;
    }
    
    // Show modal
    saveModal.classList.add('fb-modal-visible');
    
    // Focus input
    setTimeout(() => fileNameInput.select(), 100);
  }

  function hideDialog() {
    if (browserModal) {
      browserModal.classList.remove('fb-modal-visible');
    }
    if (saveModal) {
      saveModal.classList.remove('fb-modal-visible');
    }
  }

  async function handleOpen(fileName, provider) {
    const result = await openFile(fileName, provider);
    if (result.success) {
      hideDialog();
      if (onFileSelected) onFileSelected(result);
    } else if (result.error !== 'Cancelled') {
      showToast(result.error || 'Failed to open file', 'error');
    }
  }

  async function handleSave(fileName, provider) {
    // Get current schedule data
    const data = window.readState ? window.readState() : null;
    if (!data) {
      showToast('No schedule data to save', 'error');
      return;
    }
    
    const result = await saveFile(fileName, data, provider);
    if (result.success) {
      hideDialog();
      if (onFileSaved) onFileSaved(result);
      
      // Update header display
      if (window.updateFileNameDisplay) {
        window.updateFileNameDisplay();
      }
    } else {
      showToast(result.error || 'Failed to save', 'error');
    }
  }

  async function handleDelete(fileName, provider) {
    const displayName = fileName.replace('.json', '');
    
    if (!confirm(`Delete "${displayName}"?\n\nThis cannot be undone.`)) {
      return;
    }
    
    const result = await deleteFile(fileName, provider);
    if (result.success) {
      showToast('Deleted');
      
      // Refresh file list
      const fileList = browserModal.querySelector('#fbFileList');
      const emptyState = browserModal.querySelector('#fbEmpty');
      
      const files = await listAllFiles();
      if (files.length === 0) {
        fileList.innerHTML = '';
        emptyState.style.display = 'flex';
      } else {
        renderFileList(files, fileList);
      }
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ---------------------------------------------------------------------------
  
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + O = Open
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault();
      showOpenDialog((result) => {
        if (result.success) {
          window.__LOADING_FILE__ = true;
          if (window.writeState) {
            window.writeState(result.data);
          }
          location.reload();
        }
      });
    }
    
    // Cmd/Ctrl + S = Save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      const data = window.readState ? window.readState() : null;
      if (data) {
        quickSave(data).then(result => {
          if (result.needsSaveAs) {
            const currentFile = getCurrentFile();
            showSaveDialog(currentFile?.name, () => {});
          }
        });
      }
    }
    
    // Cmd/Ctrl + Shift + S = Save As
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
      e.preventDefault();
      const currentFile = getCurrentFile();
      showSaveDialog(currentFile?.name, () => {});
    }
    
    // Escape to close dialogs
    if (e.key === 'Escape') {
      hideDialog();
    }
  });

  // ---------------------------------------------------------------------------
  // EXPORTS
  // ---------------------------------------------------------------------------
  
  return {
    // Dialogs
    showOpenDialog,
    showSaveDialog,
    hideDialog,
    
    // Direct file operations
    openFile,
    saveFile,
    deleteFile,
    quickSave,
    listAllFiles,
    
    // Current file
    getCurrentFile,
    clearCurrentFile,
    
    // Recent files
    getRecentFiles,
    addToRecentFiles,
    
    // Cloud status
    isCloudEnabled,
    getCloudStatus,
    
    // Toast
    showToast
  };

})();

// Make globally available
window.FileBrowser = FileBrowser;

console.log('FileBrowser module loaded');
