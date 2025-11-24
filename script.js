// === Global Error Handler ===
window.addEventListener('error', function(event) {
  const errorMsg = event.error?.message || event.message || 'Unknown error';
  
  // Filter out non-critical errors that don't affect functionality
  const ignoredErrors = [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Script error.',
    'undefined is not an object',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Load failed',
    'NetworkError',
    'NotFoundError',
    'AbortError',
    'QuotaExceededError'
  ];
  
  if (ignoredErrors.some(ignored => errorMsg.includes(ignored))) {
    console.warn('Non-critical error ignored:', errorMsg);
    return;
  }
  
  console.error('Script Error:', event.error || event.message);
  console.error('Full error details:', event);
  console.error('Error stack:', event.error?.stack);
  const errorTray = document.getElementById('errorTray');
  if (errorTray) {
    errorTray.style.display = 'block';
    errorTray.style.backgroundColor = '#441414';
    errorTray.style.color = '#ff6b6b';
    errorTray.style.padding = '10px';
    errorTray.style.marginBottom = '10px';
    errorTray.style.borderRadius = '6px';
    errorTray.style.cursor = 'pointer';
    errorTray.textContent = 'Error: ' + errorMsg + ' (click to dismiss)';
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (errorTray.style.display === 'block') {
        errorTray.style.display = 'none';
      }
    }, 5000);
    
    // Click to dismiss
    errorTray.onclick = () => { errorTray.style.display = 'none'; };
  }
  // Don't prevent default - let error still log to console
});

// === Global Utility Functions ===
// Calculate appropriate text color based on background brightness
function getContrastColor(hexColor) {
  if (!hexColor || hexColor === '') return '';
  // Remove # if present
  const hex = hexColor.replace('#', '');
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// === Header Logic Start ===
function getVal(id){ return document.getElementById(id)?.value?.trim() || ""; }
function getDayOfWeek(){ return getVal('dayOfWeek') || getVal('metaDow'); }
function getDateVal(){ return getVal('shootDate') || getVal('metaDate'); }
function getDayX(){ return getVal('dayX') || getVal('metaX') || "?"; }
function getDayY(){ return getVal('dayY') || getVal('metaY') || "?"; }

function formatMetaDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  const dow = d.toLocaleDateString(undefined, { weekday: 'long' });
  const mdy = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dow} ${mdy}`;
}

function updateHeaderDisplay() {
  const title    = getVal('metaTitle') || 'Untitled';
  const version  = getVal('metaVersion') || '1.0';
  const dayOfW   = getDayOfWeek();
  const dateISO  = getDateVal();
  const dayX     = getDayX();
  const dayY     = getDayY();

  const versionText = version ? ` v.${version}` : '';
  const dateText    = (dayOfW && dateISO) ? ` ${dayOfW} ${formatDate(dateISO)}` : '';
  const dayText     = `Day ${dayX} of ${dayY}`;

  const headerEl = document.getElementById('shootHeader');
  if (headerEl) headerEl.textContent = `${title} — Shooting schedule${versionText} —${dateText ? dateText + ' — ' : ' '}${dayText}`;

  const display = document.getElementById('metaDisplay');
  if (display){
    const niceDate = formatMetaDate(dateISO);
    const parts = [ title || 'Untitled', version ? `v${version}` : null, `Day ${dayX} of ${dayY}`, niceDate || null ].filter(Boolean);
    display.textContent = parts.join(' — ');
  }
}

['metaTitle','metaVersion','dayOfWeek','shootDate','dayX','dayY','metaDow','metaDate','metaX','metaY']
  .forEach(id => document.getElementById(id)?.addEventListener('input', updateHeaderDisplay));

document.getElementById('metaDate')?.addEventListener('input', () => {
  const shootDate = getDateVal();
  if (shootDate) {
    const dow = new Date(shootDate).toLocaleDateString(undefined, { weekday: 'long' });
    (document.getElementById('metaDow') || document.getElementById('dayOfWeek'))?.setAttribute('value', dow);
    const dowEl = (document.getElementById('metaDow') || document.getElementById('dayOfWeek'));
    if (dowEl) dowEl.value = dow;
  }
  updateHeaderDisplay();
  
  // Save date to current day
  if (typeof saveDayData === 'function') {
    saveDayData();
  }
  
  // Trigger header designer metadata update
  if (window.updateHeaderMetadata) {
    window.updateHeaderMetadata();
  }
});

document.addEventListener('DOMContentLoaded', updateHeaderDisplay);

document.addEventListener('DOMContentLoaded', () => {
  try {
    const tray = document.getElementById('errorTray');
    const checks = [
      ['#scheduleTable', !!document.getElementById('scheduleTable')],
      ['#tbody', !!document.getElementById('tbody')],
      ['#metaDisplay', !!document.getElementById('metaDisplay')],
    ];
    const failed = checks.filter(([_, ok]) => !ok).map(([name]) => name);
    if (failed.length && tray){ tray.style.display='block'; tray.textContent='Basic validation failed: ' + failed.join(', '); }
    if (typeof applyColWidths === 'function'){ try { applyColWidths(); } catch(_){} }
    
    // Load saved badge size ratio
    const savedBadgeSize = localStorage.getItem('badgeSizeRatio') || '0.09';
    document.documentElement.style.setProperty('--badge-size-ratio', savedBadgeSize);
  } catch(_e) {}
});
// === Header Logic End ===

// Inject a "Version" field into the meta section (if missing) and wire it up
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const metaRow = document.querySelector('#metaSection .row');
    if (!metaRow) return;

    // Create the field only if it doesn't exist yet
    if (!document.getElementById('metaVersion')) {
      const versionLabel = document.createElement('label');
      versionLabel.innerHTML = `
        Version
        <input id="metaVersion" type="text" placeholder="e.g., 3.5">
      `;

      // Prefer to insert right after the Date field; fallback to append
      const dateInput = document.getElementById('metaDate');
      const dateLabel = dateInput ? dateInput.closest('label') : null;
      if (dateLabel && dateLabel.parentElement === metaRow) {
        dateLabel.insertAdjacentElement('afterend', versionLabel);
      } else {
        metaRow.appendChild(versionLabel);
      }
    }

    // Wire to header/meta-line updater
    const metaVersion = document.getElementById('metaVersion');
    if (metaVersion) {
      metaVersion.addEventListener('input', () => {
        if (typeof updateHeaderDisplay === 'function') updateHeaderDisplay();
      });
    }

    // Trigger once so the meta line reflects any prefilled value
    if (typeof updateHeaderDisplay === 'function') updateHeaderDisplay();

    // (Optional) light layout help if you want it, injected only once:
    if (!document.getElementById('metaStyleOnce')) {
      const style = document.createElement('style');
      style.id = 'metaStyleOnce';
      style.textContent = `
        .meta.card .row {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 0.8fr; /* Title | Day | Date | Version */
          gap: 16px;
          align-items: end;
        }
        .meta.card input[type="text"],
        .meta.card input[type="date"],
        .meta.card input[type="number"] { width: 100%; }
      `;
      document.head.appendChild(style);
    }
  });
})();

// --- Meta helpers + header wiring (safe to paste once) ---
function getVal(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function formatMetaDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dow = d.toLocaleDateString(undefined, { weekday: "long" });
  const mdy = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${dow} ${mdy}`; // e.g., Monday Oct 27, 2025
}

function updateHeaderDisplay() {
  const title   = getVal("metaTitle") || "Untitled";
  const version = getVal("metaVersion");        // <-- VERSION HERE
  const dateISO = getVal("shootDate") || getVal("metaDate");
  const dayOfW  = getVal("dayOfWeek") || getVal("metaDow");
  const dayX    = getVal("dayX") || getVal("metaX") || "?";
  const dayY    = getVal("dayY") || getVal("metaY") || "?";

  // H1 header (keep your existing wording if you prefer)
  const h1 = document.getElementById("shootHeader");
  if (h1) {
    const versionText = version ? ` v.${version}` : "";
    const dateText = (dayOfW && dateISO) ? ` ${dayOfW} ${new Date(dateISO).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : "";
    const dayText = `Day ${dayX} of ${dayY}`;
    h1.textContent = `${title} — Shooting schedule${versionText} —${dateText ? dateText + " — " : " "}${dayText}`;
  }

  // Meta line under the fields:
  // "Title — vX — Day x of y — Monday Oct 27, 2025"
  const display = document.getElementById("metaDisplay");
  if (display) {
    const niceDate = formatMetaDate(dateISO);
    const parts = [
      title,
      version ? `v${version}` : null,
      `Day ${dayX} of ${dayY}`,
      niceDate || null
    ].filter(Boolean);
    display.textContent = parts.join(" — ");
  }
}

// Recompute whenever inputs change
["metaTitle","metaVersion","metaDate","metaDow","shootDate","dayOfWeek","metaX","metaY","dayX","dayY"]
  .forEach(id => document.getElementById(id)?.addEventListener("input", updateHeaderDisplay));

document.addEventListener("DOMContentLoaded", updateHeaderDisplay);


/* v8.9.1r — Unified: working buttons, per-row color pickers, designer & print */
(function(){
  const tray = document.getElementById('errorTray');
  const showErr = (err)=>{ 
    if(!tray) return; 
    const errorMsg = err?.message || String(err);
    
    // Use same filtering as global handler
    const ignoredErrors = [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'Script error.',
      'undefined is not an object',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Load failed',
      'NetworkError',
      'NotFoundError',
      'AbortError',
      'QuotaExceededError'
    ];
    
    if (ignoredErrors.some(ignored => errorMsg.includes(ignored))) {
      console.warn('Non-critical error ignored:', errorMsg);
      return;
    }
    
    tray.style.display='block'; 
    tray.textContent='Error: ' + errorMsg + ' (click to dismiss)'; 
    console.error(err); 
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (tray.style.display === 'block') {
        tray.style.display = 'none';
      }
    }, 5000);
    
    // Click to dismiss
    tray.onclick = () => { tray.style.display = 'none'; };
  };
  // Remove duplicate error handler - using global one instead

  // === 3-Option Dialog Helper ===
  function showThreeOptionDialog(title, message, options) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        display: flex;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        z-index: 10000000;
        align-items: center;
        justify-content: center;
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: var(--panel, #fff);
        color: var(--text, #111827);
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      `;
      
      const buttonsHtml = options.map((opt, i) => {
        const isPrimary = i === 0;
        const isCancel = opt.value === 'cancel';
        const style = isCancel 
          ? 'background: var(--panel, white); color: var(--text, #1f2937); border: 1px solid var(--border, #d1d5db);'
          : isPrimary 
            ? 'background: #2563eb; color: white; border: none;'
            : 'background: var(--muted, #6b7280); color: white; border: none;';
        return `<button data-value="${opt.value}" style="padding: 10px 16px; ${style} border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">${opt.label}</button>`;
      }).join('');
      
      content.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 8px;">${title}</h3>
        <p style="font-size: 13px; color: var(--muted, #6b7280); margin-bottom: 20px;">${message}</p>
        <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
          ${buttonsHtml}
        </div>
      `;
      
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      content.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(btn.dataset.value);
        });
      });
      
      // Close on background click = cancel
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve('cancel');
        }
      });
      
      // ESC key = cancel
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', escHandler);
          resolve('cancel');
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }
  
  // Expose globally
  window.showThreeOptionDialog = showThreeOptionDialog;

  try{
    const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s));
    const tbody=qs('#tbody'), theadRow=qs('#headerRow');
    const addRowBtn=qs('#addRowBtn'), addCallBtn=qs('#addCallBtn'), addSubBtn=qs('#addSubBtn'), resetBtn=qs('#resetBtn');
    
    // === Multi-select drag system ===
    let selectedRows = new Set();
    window.selectedRows = selectedRows; // Make accessible for select-all handler
    
    // === Option Key Detection for Cursor Change ===
    document.addEventListener('keydown', (e) => {
      if (e.altKey && !document.body.classList.contains('option-key-held')) {
        document.body.classList.add('option-key-held');
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (!e.altKey && document.body.classList.contains('option-key-held')) {
        document.body.classList.remove('option-key-held');
      }
    });
    
    // Also handle when window loses focus
    window.addEventListener('blur', () => {
      document.body.classList.remove('option-key-held');
    });
    
    // === Cell Copy/Cut/Paste System ===
    let cellClipboard = null;
    
    document.addEventListener('keydown', (e) => {
      const isCopy = (e.metaKey || e.ctrlKey) && e.key === 'c';
      const isCut = (e.metaKey || e.ctrlKey) && e.key === 'x';
      const isPaste = (e.metaKey || e.ctrlKey) && e.key === 'v';
      
      // For copy/cut/paste, check if we should handle at cell level
      if (isCopy || isCut || isPaste) {
        // If cells are selected, handle at cell level
        if (SelectionManager.selectedCells.size > 0) {
          // Allow browser paste if there's text selected in a contenteditable
          const hasTextSelection = e.target.isContentEditable && window.getSelection().toString().length > 0;
          if (isPaste && hasTextSelection) {
            // Let browser handle pasting into selected text
            return;
          }
          
          // Otherwise prevent default and handle cell-level copy/cut/paste
          e.preventDefault();
          
          if (isCopy || isCut) {
            // Copy cell data
            cellClipboard = {
              cells: [],
              isCut: isCut
            };
            
            SelectionManager.selectedCells.forEach(cell => {
            const rowId = cell.closest('tr').dataset.id;
            const colKey = cell.dataset.key;
            const contenteditable = cell.querySelector('[contenteditable]');
            const textarea = cell.querySelector('textarea');
            const uploadBox = cell.querySelector('.uploadBox');
            const tagsBox = cell.querySelector('.tagsBox');
            
            let value = null;
            let formatting = null;
            
            if (contenteditable) {
              value = contenteditable.textContent;
              // Get cell formatting
              formatting = {
                fontFamily: cell.dataset.fontFamily,
                fontSize: cell.dataset.fontSize,
                bold: cell.dataset.bold,
                italic: cell.dataset.italic,
                underline: cell.dataset.underline,
                align: cell.dataset.align,
                valign: cell.dataset.valign,
                fgColor: cell.dataset.cellFg,
                bgColor: cell.dataset.cellBg
              };
            } else if (textarea) {
              value = textarea.value;
            } else if (uploadBox) {
              value = cell.dataset.vaultIds;
              console.log('[Copy] Media cell - vaultIds:', value);
            } else if (tagsBox) {
              value = tagsBox.querySelector('textarea')?.value;
              console.log('[Copy] Tags cell - textarea value:', value);
            }
            
            cellClipboard.cells.push({
              rowId,
              colKey,
              value,
              formatting
            });
            console.log('[Copy] Added to clipboard:', { rowId, colKey, value });
          });
          
          console.log(`[Clipboard] ${isCut ? 'Cut' : 'Copied'}`, cellClipboard.cells.length, 'cells');
          
          // If cut, clear the cells
          if (isCut) {
            SelectionManager.selectedCells.forEach(cell => {
              const contenteditable = cell.querySelector('[contenteditable]');
              const textarea = cell.querySelector('textarea');
              
              if (contenteditable) {
                contenteditable.textContent = '';
              } else if (textarea) {
                textarea.value = '';
              }
            });
            persist();
          }
        } else if (isPaste && cellClipboard) {
          // Paste cell data
          const targetCells = Array.from(SelectionManager.selectedCells);
          
          // Paste into each selected cell
          let needsRebuild = false;
          targetCells.forEach((targetCell, index) => {
            // If we have fewer clipboard cells than targets, wrap around
            const sourceCell = cellClipboard.cells[index % cellClipboard.cells.length];
            
            const contenteditable = targetCell.querySelector('[contenteditable]');
            const textarea = targetCell.querySelector('textarea');
            const uploadBox = targetCell.querySelector('.uploadBox');
            const tagsBox = targetCell.querySelector('.tagsBox');
            
            if (contenteditable && sourceCell.value !== null) {
              contenteditable.textContent = sourceCell.value;
              
              // Apply formatting if available using the proper formatting function
              if (sourceCell.formatting) {
                window.applyCellFormat(targetCell, sourceCell.formatting);
              }
            } else if (uploadBox && sourceCell.value !== null) {
              // Paste media IDs
              console.log('[Paste] Into media cell - setting vaultIds:', sourceCell.value);
              targetCell.dataset.vaultIds = sourceCell.value;
              needsRebuild = true;
            } else if (tagsBox && sourceCell.value !== null) {
              // Paste tags
              const tagsTextarea = tagsBox.querySelector('textarea');
              console.log('[Paste] Into tags cell - textarea found:', !!tagsTextarea, 'value:', sourceCell.value);
              if (tagsTextarea) {
                tagsTextarea.value = sourceCell.value;
                needsRebuild = true;
              }
            } else if (textarea && sourceCell.value !== null) {
              textarea.value = sourceCell.value;
            }
          });
          
          console.log('[Clipboard] Pasted into', targetCells.length, 'cells');
          persist();
          
          // If we pasted media/tags, rebuild those specific cells
          if (needsRebuild) {
            targetCells.forEach(async (targetCell) => {
              const uploadBox = targetCell.querySelector('.uploadBox');
              const tagsBox = targetCell.querySelector('.tagsBox');
              
              if (uploadBox) {
                // Rebuild media cell
                const grid = uploadBox.querySelector('.u-grid');
                if (grid) {
                  grid.innerHTML = '';
                  let ids = [];
                  try {
                    ids = JSON.parse(targetCell.dataset.vaultIds || '[]');
                  } catch(e) {}
                  
                  for (const id of ids) {
                    try {
                      const rec = await window.vaultGet(Number(id));
                      if (!rec) continue;
                      
                      const item = document.createElement('div');
                      item.className = 'u-item';
                      item.draggable = true;
                      item.dataset.vaultId = id;
                      
                      if (rec.type.startsWith('image/')) {
                        const url = URL.createObjectURL(rec.data);
                        item.innerHTML = `<img src="${url}" class="u-thumb">`;
                      } else if (rec.type.startsWith('video/')) {
                        const url = URL.createObjectURL(rec.data);
                        item.innerHTML = `<video src="${url}" class="u-thumb"></video>`;
                      }
                      
                      grid.appendChild(item);
                    } catch(e) {
                      console.error('[Paste] Error loading vault item:', e);
                    }
                  }
                }
              } else if (tagsBox) {
                // Rebuild tags cell
                console.log('[Paste] Rebuilding tags cell');
                const textarea = tagsBox.querySelector('textarea');
                const pills = tagsBox.querySelector('.tags-pills');
                console.log('[Paste] Found textarea:', !!textarea, 'pills:', !!pills, 'TagManager:', !!window.TagManager);
                if (textarea && pills && window.TagManager) {
                  // Tags are stored as comma-separated string, not JSON
                  const tagString = textarea.value || '';
                  const ids = tagString.split(',').filter(Boolean);
                  console.log('[Paste] Tag IDs to render:', ids);
                  window.TagManager.renderTagsInCell(pills, ids);
                }
              }
            });
          }
        }
        }  // Close the if (SelectionManager.selectedCells.size > 0) block
        
        return; // Handled at cell level, done
      }
    });
    
    // === Excel-style Selection System ===
    const SelectionManager = {
      selectedCells: new Set(),
      selectionType: null, // 'cell', 'row', 'column', 'mixed'
      lastSelectedCell: null,
      lastSelectedHeader: null, // Track last clicked header for column range selection
      lastSelectedRow: null, // Track last clicked row for row range selection
      isSelecting: false,
      
      clear() {
        console.log('[SelectionManager.clear] Clearing', this.selectedCells.size, 'cells - Stack trace:');
        console.trace();
        this.selectedCells.forEach(cell => cell.classList.remove('cell-selected'));
        this.selectedCells.clear();
        this.selectionType = null;
        this.lastSelectedCell = null;
        this.lastSelectedHeader = null;
        this.lastSelectedRow = null;
        
        // Also clear the old selectedRows Set for backwards compatibility
        if (window.selectedRows) {
          window.selectedRows.forEach(row => row.classList.remove('selected'));
          window.selectedRows.clear();
        }
      },
      
      selectCell(td, addToSelection = false) {
        if (!addToSelection) {
          this.clear();
        }
        
        if (td.dataset.key === 'drag' || td.dataset.key === 'actions') {
          return; // Don't select control columns
        }
        
        this.selectedCells.add(td);
        td.classList.add('cell-selected');
        this.lastSelectedCell = td;
        this.selectionType = 'cell';
        console.log('[SelectionManager] Selected', this.selectedCells.size, 'cells, type:', this.selectionType);
        this.updateFormatPanel();
      },
      
      selectRow(tr, addToSelection = false) {
        console.log('[SelectionManager] selectRow called, addToSelection:', addToSelection);
        
        if (!addToSelection) {
          this.clear();
          // Also clear the old selectedRows Set
          if (window.selectedRows) {
            window.selectedRows.forEach(row => row.classList.remove('selected'));
            window.selectedRows.clear();
          }
        }
        
        const cells = tr.querySelectorAll('td:not([data-key="drag"]):not([data-key="actions"])');
        console.log('[SelectionManager] Found', cells.length, 'cells in row');
        
        cells.forEach(cell => {
          this.selectedCells.add(cell);
          cell.classList.add('cell-selected');
        });
        
        // Also update the old selectedRows Set for backwards compatibility
        if (window.selectedRows) {
          window.selectedRows.add(tr);
          tr.classList.add('selected');
        }
        
        this.lastSelectedCell = cells[0];
        this.lastSelectedRow = tr;
        this.selectionType = 'row';
        console.log('[SelectionManager] Selected', this.selectedCells.size, 'cells, type:', this.selectionType);
        this.updateFormatPanel();
      },
      
      selectColumn(key, addToSelection = false) {
        console.log('[SelectionManager] selectColumn called:', key, 'addToSelection:', addToSelection);
        
        if (!addToSelection) {
          this.clear();
        }
        
        // Get the main tbody and only select cells in data rows
        const tbody = document.getElementById('tbody');
        if (!tbody) {
          console.error('[SelectionManager] Could not find tbody - DOM not ready?');
          console.trace();
          return;
        }
        
        if (!tbody.querySelectorAll) {
          console.error('[SelectionManager] tbody exists but has no querySelectorAll method:', tbody);
          console.trace();
          return;
        }
        
        const dataRows = tbody.querySelectorAll('tr[data-id]');
        console.log('[SelectionManager] Found', dataRows.length, 'data rows');
        
        dataRows.forEach(row => {
          const cell = row.querySelector(`td[data-key="${key}"]`);
          if (cell) {
            this.selectedCells.add(cell);
            cell.classList.add('cell-selected');
          }
        });
        
        this.lastSelectedCell = this.selectedCells.values().next().value;
        this.selectionType = 'column';
        this.updateFormatPanel();
        
        console.log('[SelectionManager] Column selection complete, total cells:', this.selectedCells.size);
      },
      
      selectRange(startCell, endCell) {
        console.log('[SelectionManager] selectRange from', startCell.dataset.key, 'to', endCell.dataset.key);
        
        // Safety check: don't allow range selection between header and body cells
        if (startCell.tagName !== endCell.tagName) {
          console.warn('[SelectionManager] Cannot select range between header and body cells');
          // Just select the end cell
          this.selectCell(endCell, false);
          return;
        }
        
        // If selecting header cells, use simpler selection logic
        if (startCell.tagName === 'TH') {
          console.log('[SelectionManager] Header range selection - selecting individual cells');
          this.clear();
          // Get all headers between start and end
          const allHeaders = Array.from(document.querySelectorAll('thead th[data-key]'));
          const startIdx = allHeaders.indexOf(startCell);
          const endIdx = allHeaders.indexOf(endCell);
          const minIdx = Math.min(startIdx, endIdx);
          const maxIdx = Math.max(startIdx, endIdx);
          
          for (let i = minIdx; i <= maxIdx; i++) {
            this.selectedCells.add(allHeaders[i]);
            allHeaders[i].classList.add('cell-selected');
          }
          this.lastSelectedCell = endCell;
          this.selectionType = 'cell';
          console.log('[SelectionManager] Selected', this.selectedCells.size, 'header cells');
          this.updateFormatPanel();
          return;
        }
        
        this.clear();
        
        // Get tbody from the actual cells
        const tbody = startCell.closest('tbody');
        if (!tbody) {
          console.error('[SelectionManager] Could not find tbody from start cell');
          console.trace();
          return;
        }
        
        if (!tbody.querySelectorAll) {
          console.error('[SelectionManager] tbody exists but has no querySelectorAll:', tbody);
          console.trace();
          return;
        }
        
        const allRows = Array.from(tbody.querySelectorAll('tr[data-id]'));
        const allCols = Array.from(document.querySelectorAll('thead th')).map(th => th.dataset.key).filter(k => k);
        
        const startRowElement = startCell.closest('tr');
        const endRowElement = endCell.closest('tr');
        
        console.log('[SelectionManager] Start row:', startRowElement, 'in tbody?', tbody.contains(startRowElement));
        console.log('[SelectionManager] End row:', endRowElement, 'in tbody?', tbody.contains(endRowElement));
        console.log('[SelectionManager] Total rows in tbody:', allRows.length);
        
        const startRow = allRows.indexOf(startRowElement);
        const endRow = allRows.indexOf(endRowElement);
        const startCol = allCols.indexOf(startCell.dataset.key);
        const endCol = allCols.indexOf(endCell.dataset.key);
        
        // Validate indices
        if (startRow === -1 || endRow === -1) {
          console.error('[SelectionManager] Invalid row - cell not in table');
          return;
        }
        if (startCol === -1 || endCol === -1) {
          console.error('[SelectionManager] Invalid column - cell key not found');
          return;
        }
        
        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);
        
        console.log('[SelectionManager] Range: rows', minRow, '-', maxRow, 'cols', minCol, '-', maxCol);
        
        for (let r = minRow; r <= maxRow; r++) {
          // Bounds check
          if (r < 0 || r >= allRows.length) continue;
          
          for (let c = minCol; c <= maxCol; c++) {
            if (c < 0 || c >= allCols.length) continue;
            
            const key = allCols[c];
            if (!key || key === 'drag' || key === 'actions') continue;
            
            const cell = allRows[r].querySelector(`td[data-key="${key}"]`);
            if (cell) {
              this.selectedCells.add(cell);
              cell.classList.add('cell-selected');
            }
          }
        }
        
        console.log('[SelectionManager] Selected', this.selectedCells.size, 'cells in range');
        this.selectionType = 'cell';
        this.updateFormatPanel();
      },
      
      selectRangeByIndices(tbody, startRowIndex, startColKey, endRowIndex, endColKey) {
        console.log('[SelectionManager] selectRangeByIndices:', startRowIndex, startColKey, 'to', endRowIndex, endColKey);
        this.clear();
        
        if (!tbody) {
          console.error('[SelectionManager] No tbody provided');
          console.trace();
          return;
        }
        
        if (!tbody.querySelectorAll) {
          console.error('[SelectionManager] tbody has no querySelectorAll:', tbody);
          console.trace();
          return;
        }
        
        // Only get actual data rows with data-id attribute
        const allRows = Array.from(tbody.querySelectorAll('tr[data-id]'));
        const allCols = Array.from(document.querySelectorAll('thead th')).map(th => th.dataset.key).filter(k => k);
        
        console.log('[SelectionManager] Total data rows:', allRows.length, 'Total cols:', allCols.length);
        
        const startCol = allCols.indexOf(startColKey);
        const endCol = allCols.indexOf(endColKey);
        
        // Validate indices
        if (startRowIndex < 0 || startRowIndex >= allRows.length || endRowIndex < 0 || endRowIndex >= allRows.length) {
          console.error('[SelectionManager] Invalid row indices:', startRowIndex, endRowIndex, 'max:', allRows.length);
          return;
        }
        if (startCol === -1 || endCol === -1) {
          console.error('[SelectionManager] Invalid column keys:', startColKey, endColKey);
          return;
        }
        
        const minRow = Math.min(startRowIndex, endRowIndex);
        const maxRow = Math.max(startRowIndex, endRowIndex);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);
        
        console.log('[SelectionManager] Selecting rows', minRow, '-', maxRow, 'cols', minCol, '-', maxCol);
        
        // Debug: check first cell
        if (allRows[minRow]) {
          const firstKey = allCols[minCol];
          console.log('[SelectionManager] DEBUG: Looking for first cell with key:', firstKey);
          console.log('[SelectionManager] DEBUG: First row has', allRows[minRow].querySelectorAll('td').length, 'td elements');
          const testCell = allRows[minRow].querySelector(`td[data-key="${firstKey}"]`);
          console.log('[SelectionManager] DEBUG: Found cell?', !!testCell);
          if (!testCell) {
            // Check what data-key values exist
            const keys = Array.from(allRows[minRow].querySelectorAll('td')).map(td => td.dataset.key);
            console.log('[SelectionManager] DEBUG: Available data-key values:', keys);
          }
        }
        
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const key = allCols[c];
            if (!key || key === 'drag' || key === 'actions') continue;
            
            const cell = allRows[r].querySelector(`td[data-key="${key}"]`);
            if (cell) {
              this.selectedCells.add(cell);
              cell.classList.add('cell-selected');
            }
          }
        }
        
        console.log('[SelectionManager] Selected', this.selectedCells.size, 'cells');
        this.selectionType = 'cell';
        this.updateFormatPanel();
      },
      
      updateFormatPanel() {
        // Update the format panel UI to show current formatting of selection
        console.log('[Selection] Updating format panel for', this.selectedCells.size, 'cells, type:', this.selectionType);
        
        if (this.selectedCells.size === 0) {
          // No selection - reset to defaults
          const textColorPicker = document.getElementById('textColorPicker');
          const bgColorPicker = document.getElementById('bgColorPicker');
          if (textColorPicker) textColorPicker.value = '#000000';
          if (bgColorPicker) bgColorPicker.value = '#ffffff';
          return;
        }
        
        // Get first selected cell to read formatting
        const firstCell = Array.from(this.selectedCells)[0];
        if (!firstCell) return;
        
        // Read from cell dataset first, then fall back to computed style
        let fgColor = firstCell.dataset.cellFg || '';
        let bgColor = firstCell.dataset.cellBg || '';
        
        // If no dataset values, try computed styles
        if (!fgColor || !bgColor) {
          const computedStyle = window.getComputedStyle(firstCell);
          if (!fgColor) fgColor = computedStyle.color;
          if (!bgColor) bgColor = computedStyle.backgroundColor;
        }
        
        // Convert rgb() to hex if needed
        const rgbToHex = (rgb) => {
          if (!rgb || rgb === 'transparent') return null;
          if (rgb.startsWith('#')) return rgb;
          const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
          if (!match) return null;
          const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
          return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
        };
        
        const hexFg = rgbToHex(fgColor) || '#000000';
        const hexBg = rgbToHex(bgColor) || '#ffffff';
        
        // Update color pickers
        const textColorPicker = document.getElementById('textColorPicker');
        const bgColorPicker = document.getElementById('bgColorPicker');
        
        if (textColorPicker) textColorPicker.value = hexFg;
        if (bgColorPicker) bgColorPicker.value = hexBg;
        
        console.log('[Selection] Updated color pickers - fg:', hexFg, 'bg:', hexBg);
      },
      
      getSelection() {
        return Array.from(this.selectedCells);
      },
      
      getSelectionType() {
        return this.selectionType;
      },
      
      getSelectedCells() {
        return Array.from(this.selectedCells);
      }
    };
    
    window.SelectionManager = SelectionManager;
    
    // Initialize Border Designer
    BorderDesigner.init({
      selectionManager: SelectionManager,
      persistCallback: persist
    });
    
    // Initialize Format Designer
    FormatDesigner.init({
      selectionManager: SelectionManager,
      persistCallback: persist
    });
    
    // Add cell selection handlers (runs immediately since script is at end of body)
    (() => {
      console.log('[Selection Setup] Starting handler setup...');
      const table = document.querySelector('#scheduleTable');
      const tbody = document.getElementById('tbody');
      console.log('[Selection Setup] table:', table, 'tbody:', tbody);
      
      if (!tbody) {
        console.error('[Selection Setup] tbody not found in DOM - selection handlers not initialized');
        return;
      }
      
      let dragStartPosition = null;
      
      if (!table) {
        console.error('[Selection Setup] table not found!');
        return;
      }
      
      // Unified cell selection handler for both headers and body cells
      table.addEventListener('mousedown', (e) => {
        // Skip selection logic if clicking on resize grips, but let the event continue to grip handlers
        if (e.target.classList.contains('col-resize-grip') ||
            e.target.classList.contains('row-resize-grip') ||
            e.target.closest('.col-resize-grip') ||
            e.target.closest('.row-resize-grip')) {
          console.log('[Selection] Skipping selection logic - resize grip will handle');
          return; // Skip selection, but grip's own handler will still fire
        }
        
        // Skip selection logic if clicking on overlays
        if (e.target.classList.contains('u-add-overlay') ||
            e.target.classList.contains('tags-add-overlay') ||
            e.target.closest('.u-add-overlay') ||
            e.target.closest('.tags-add-overlay')) {
          console.log('[Selection] Skipping selection logic - overlay will handle');
          return; // Skip selection, let overlay handler fire
        }
        
        // Skip selection logic if clicking on draggable media items or tag pills
        // BUT allow resize handle, slider, and edit UI to work
        if (e.target.closest('.media-badge-slider') ||
            e.target.closest('.media-badge-resize-handle') ||
            e.target.closest('.media-badge-edit-container') ||
            e.target.closest('.media-badge-preview') ||
            e.target.closest('.media-badge-input')) {
          // Let edit UI work without triggering drag
          return;
        }
        
        if (e.target.closest('.u-item[draggable="true"]') ||
            e.target.closest('.tag-pill[draggable="true"]')) {
          console.log('[Selection] Skipping selection logic - draggable item will handle');
          return; // Skip selection, let drag handler fire
        }
        
        // Get either td or th
        const cell = e.target.closest('td, th');
        if (!cell) return;
        
        console.log('[Selection] Cell mousedown:', cell.tagName, cell.dataset.key);
        
        // Handle drag header (TH with drag key)
        if (cell.dataset.key === 'drag' && cell.tagName === 'TH') {
          if (e.altKey) {
            // Option+Click: Select all header cells
            e.preventDefault();
            e.stopPropagation(); // Prevent select all handler from firing
            console.log('[Selection] Option+Click on drag header - selecting all header cells');
            
            SelectionManager.clear();
            const allHeaders = theadRow.querySelectorAll('th:not([data-key="drag"]):not([data-key="actions"])');
            allHeaders.forEach(th => {
              SelectionManager.selectedCells.add(th);
              th.classList.add('cell-selected');
            });
            
            SelectionManager.selectionType = 'header-row';
            SelectionManager.lastSelectedCell = allHeaders[0];
            
            return;
          } else {
            // Normal click: let select all handler work
            console.log('[Selection] Skipping drag header - select all will handle');
            return;
          }
        }
        
        // Skip if clicking on input/textarea/button/select/contenteditable
        // UNLESS Option key is pressed (then force cell selection)
        if (!e.altKey && 
            (e.target.matches('input, textarea, button, select, [contenteditable]') ||
             e.target.closest('button'))) {
          console.log('[Selection] Skipping - clicked on UI element');
          return;
        }
        
        // If Option key pressed, prevent default to stop textarea/input from focusing
        if (e.altKey && 
            (e.target.matches('input, textarea') || 
             e.target.closest('.uploadBox, .tagsBox'))) {
          e.preventDefault();
          console.log('[Selection] Option key - forcing cell selection');
        }
        
        // Skip actions column
        if (cell.dataset.key === 'actions') return;
        
        // DRAG COLUMN: Row selection with drag detection
        if (cell.dataset.key === 'drag' && cell.tagName === 'TD') {
          // DON'T preventDefault here - it blocks native drag
          console.log('[Selection] DRAG COLUMN CLICKED');
          
          const row = cell.closest('tr');
          if (!row) return;
          
          let isDragging = false;
          let startX = e.clientX;
          let startY = e.clientY;
          
          const onMouseMove = (moveEvent) => {
            const deltaX = Math.abs(moveEvent.clientX - startX);
            const deltaY = Math.abs(moveEvent.clientY - startY);
            
            if (deltaX > 5 || deltaY > 5) {
              isDragging = true;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            }
          };
          
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            if (!isDragging) {
              const isAddToSelection = e.metaKey || e.ctrlKey;
              const isRangeSelect = e.shiftKey;
              
              if (isRangeSelect && SelectionManager.lastSelectedRow) {
                // Shift+click: range select rows
                console.log('[Selection] Shift+click range select rows');
                
                const tbody = row.closest('tbody');
                if (tbody) {
                  const allRows = Array.from(tbody.querySelectorAll('tr[data-id]'));
                  const startIdx = allRows.indexOf(SelectionManager.lastSelectedRow);
                  const endIdx = allRows.indexOf(row);
                  
                  if (startIdx !== -1 && endIdx !== -1) {
                    const minIdx = Math.min(startIdx, endIdx);
                    const maxIdx = Math.max(startIdx, endIdx);
                    
                    SelectionManager.clear();
                    for (let i = minIdx; i <= maxIdx; i++) {
                      SelectionManager.selectRow(allRows[i], i > minIdx);
                    }
                  }
                }
              } else {
                // Normal or Cmd+click
                console.log('[Selection] Calling selectRow, addToSelection:', isAddToSelection);
                SelectionManager.selectRow(row, isAddToSelection);
              }
            }
          };
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          
          return;
        }
        
        // HEADER CLICK BEHAVIORS:
        // Normal click: Select entire column data cells
        // Shift+click: Extend column selection
        // Cmd+click: Add column to selection
        // Option+click: Select header cell
        // Option+Cmd+click: Add header cell to selection
        // Option+Shift+click: Extend header cell selection
        if (cell.tagName === 'TH') {
          e.preventDefault(); // Prevent text selection
          console.log('[Selection] Header click - shift:', e.shiftKey, 'meta:', e.metaKey, 'alt:', e.altKey);
          
          // Clear drag state
          dragStartPosition = null;
          SelectionManager.isSelecting = false;
          
          if (e.altKey) {
            // OPTION KEY: Header cell selection mode
            if (e.shiftKey) {
              // Option+Shift: extend header cell selection
              console.log('[Selection] Option+Shift+Header - extend header cell selection');
              if (SelectionManager.lastSelectedCell && SelectionManager.lastSelectedCell.tagName === 'TH') {
                SelectionManager.selectRange(SelectionManager.lastSelectedCell, cell);
              } else {
                SelectionManager.selectCell(cell, false);
              }
            } else if (e.metaKey || e.ctrlKey) {
              // Option+Cmd: add header cell to selection
              console.log('[Selection] Option+Cmd+Header - add header cell to selection');
              SelectionManager.selectCell(cell, true);
            } else {
              // Option alone: select just this header cell
              console.log('[Selection] Option+Header - select header cell:', cell.dataset.key);
              SelectionManager.selectCell(cell, false);
            }
          } else {
            // NO OPTION KEY: Column selection mode
            if (e.shiftKey) {
              // Shift: extend column selection
              console.log('[Selection] Shift+Header - extend column selection');
              if (SelectionManager.lastSelectedHeader) {
                // Range select columns between last and current
                const lastKey = SelectionManager.lastSelectedHeader.dataset.key;
                const currentKey = cell.dataset.key;
                const allCols = getAllColumnsSorted();
                const lastIdx = allCols.findIndex(c => c.key === lastKey);
                const currentIdx = allCols.findIndex(c => c.key === currentKey);
                
                if (lastIdx !== -1 && currentIdx !== -1) {
                  const minIdx = Math.min(lastIdx, currentIdx);
                  const maxIdx = Math.max(lastIdx, currentIdx);
                  for (let i = minIdx; i <= maxIdx; i++) {
                    SelectionManager.selectColumn(allCols[i].key, i > minIdx);
                  }
                }
              } else {
                SelectionManager.selectColumn(cell.dataset.key, false);
              }
              
              // Visual feedback on headers
              if (SelectionManager.lastSelectedHeader) {
                const allCols = getAllColumnsSorted();
                const lastKey = SelectionManager.lastSelectedHeader.dataset.key;
                const currentKey = cell.dataset.key;
                const lastIdx = allCols.findIndex(c => c.key === lastKey);
                const currentIdx = allCols.findIndex(c => c.key === currentKey);
                
                if (lastIdx !== -1 && currentIdx !== -1) {
                  const minIdx = Math.min(lastIdx, currentIdx);
                  const maxIdx = Math.max(lastIdx, currentIdx);
                  document.querySelectorAll('th.column-selected').forEach(h => h.classList.remove('column-selected'));
                  for (let i = minIdx; i <= maxIdx; i++) {
                    const header = document.querySelector(`th[data-key="${allCols[i].key}"]`);
                    if (header) header.classList.add('column-selected');
                  }
                }
              }
              
              // Store this header for next shift-click
              SelectionManager.lastSelectedHeader = cell;
            } else if (e.metaKey || e.ctrlKey) {
              // Cmd: add column to selection
              console.log('[Selection] Cmd+Header - add column to selection');
              SelectionManager.selectColumn(cell.dataset.key, true);
              cell.classList.add('column-selected');
              SelectionManager.lastSelectedHeader = cell;
            } else {
              // Normal click: select single column
              console.log('[Selection] Normal header click - selecting column:', cell.dataset.key);
              SelectionManager.selectColumn(cell.dataset.key, false);
              
              // Visual feedback on header
              document.querySelectorAll('th.column-selected').forEach(h => h.classList.remove('column-selected'));
              cell.classList.add('column-selected');
              
              // Store this header for next shift-click
              SelectionManager.lastSelectedHeader = cell;
            }
          }
          
          return;
        }
        
        // CELL SELECTION (works for both td and th)
        const isAddToSelection = e.metaKey || e.ctrlKey;
        const isRangeSelect = e.shiftKey;
        
        e.preventDefault(); // Prevent text selection
        
        if (isRangeSelect && SelectionManager.lastSelectedCell) {
          console.log('[Selection] Shift+click range select');
          SelectionManager.selectRange(SelectionManager.lastSelectedCell, cell);
          // Clear drag state for header selections
          if (cell.tagName === 'TH') {
            dragStartPosition = null;
            SelectionManager.isSelecting = false;
          }
        } else if (!isAddToSelection && cell.tagName === 'TD') {
          // Start drag selection (only for body cells)
          const tbody = cell.closest('tbody');
          if (!tbody || !tbody.querySelectorAll || tbody.tagName !== 'TBODY') {
            console.warn('[Selection] Cannot start drag selection - invalid tbody');
            SelectionManager.selectCell(cell, false);
            dragStartPosition = null;
            return;
          }
          
          const allRows = Array.from(tbody.querySelectorAll('tr[data-id]'));
          const rowIndex = allRows.indexOf(cell.closest('tr'));
          
          dragStartPosition = {
            tbody: tbody,
            rowIndex: rowIndex,
            colKey: cell.dataset.key
          };
          SelectionManager.isSelecting = true;
          tbody.classList.add('selecting');
          SelectionManager.selectCell(cell, false);
        } else {
          // Simple cell selection
          SelectionManager.selectCell(cell, isAddToSelection);
          // Clear drag state for header selections
          if (cell.tagName === 'TH') {
            dragStartPosition = null;
            SelectionManager.isSelecting = false;
          }
        }
      });
      
      // Mousemove handler for drag selection (tbody only)
      if (tbody) {
        tbody.addEventListener('mousemove', (e) => {
          if (!SelectionManager.isSelecting || !dragStartPosition) return;
          
          const td = e.target.closest('td');
          if (!td) return;
          if (td.dataset.key === 'drag' || td.dataset.key === 'actions') return;
          
          console.log('[Selection] Dragging to:', td.dataset.key);
          
          // Use the tbody from drag start to ensure consistency
          const dragTbody = dragStartPosition.tbody;
          if (!dragTbody || !dragTbody.querySelectorAll) {
            console.warn('[Selection] Invalid tbody reference, clearing drag state');
            SelectionManager.isSelecting = false;
            dragStartPosition = null;
            return;
          }
          
          // Get current position
          const allRows = Array.from(dragTbody.querySelectorAll('tr[data-id]'));
          const currentRowIndex = allRows.indexOf(td.closest('tr'));
          
          if (currentRowIndex === -1) return; // Can't find current row
          
          // Use indices to select range
          SelectionManager.selectRangeByIndices(
            dragTbody,
            dragStartPosition.rowIndex,
            dragStartPosition.colKey,
            currentRowIndex,
            td.dataset.key
          );
        });
        
        document.addEventListener('mouseup', () => {
          if (SelectionManager.isSelecting) {
            console.log('[Selection] Drag ended');
          }
          SelectionManager.isSelecting = false;
          
          // Re-enable row dragging using stored tbody reference
          // NO LONGER NEEDED - rows only draggable from handle
          /* if (dragStartPosition && dragStartPosition.tbody && dragStartPosition.tbody.querySelectorAll) {
            try {
              dragStartPosition.tbody.querySelectorAll('tr[data-type]').forEach(row => {
                row.draggable = true;
              });
            } catch (e) {
              console.warn('[Selection] Error re-enabling row dragging:', e);
            }
          } */
          
          dragStartPosition = null;
          
          // Remove selecting class from all tbody elements
          document.querySelectorAll('tbody').forEach(tb => tb.classList.remove('selecting'));
        });
        
        console.log('[Selection Setup] Handlers attached');
      }
      
      console.log('[Selection Setup] Handler setup complete');
    })(); // End selection handlers IIFE
    
    
    function toggleRowSelection(tr, isShift = false) {
      if (tr.classList.contains('subchild')) return; // Don't multi-select sub-children
      
      if (isShift && selectedRows.size > 0) {
        // Shift-click: select range
        const allRows = Array.from(qsa('tbody tr:not(.subchild)'));
        const lastSelected = Array.from(selectedRows)[selectedRows.size - 1];
        const lastIdx = allRows.indexOf(lastSelected);
        const currIdx = allRows.indexOf(tr);
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        for (let i = start; i <= end; i++) {
          selectedRows.add(allRows[i]);
          allRows[i].classList.add('selected');
        }
      } else {
        // Regular click: toggle single
        if (selectedRows.has(tr)) {
          selectedRows.delete(tr);
          tr.classList.remove('selected');
        } else {
          selectedRows.add(tr);
          tr.classList.add('selected');
        }
      }
    }
    
    function clearSelection() {
      console.log('[clearSelection] CLEARING SELECTION - Stack trace:');
      console.trace();
      selectedRows.forEach(tr => tr.classList.remove('selected'));
      selectedRows.clear();
      SelectionManager.clear();
    }
    
    // Click outside tbody to clear selection
    document.addEventListener('click', (e) => {
      // Don't clear while dragging either designer
      if (anyPopoverDragging || BorderDesigner.isDragging() || FormatDesigner.isDragging()) return;
      if (e.target.closest('.popover')) return; // Don't clear if clicking inside popover
      
      // Don't clear if clicking resize grips
      const isGrip = e.target.classList.contains('row-resize-grip') || 
          e.target.classList.contains('col-resize-grip') ||
          e.target.closest('.row-resize-grip') ||
          e.target.closest('.col-resize-grip');
      
      console.log('[Global Click] target:', e.target, 'isGrip:', isGrip, 'gripId:', e.target.dataset?.gripId, 'inTbody:', !!e.target.closest('tbody'), 'inThead:', !!e.target.closest('thead'));
      
      if (isGrip) {
        console.log('[Global Click] Skipping - clicked on resize grip');
        return;
      }
      
      if (!e.target.closest('tbody') && !e.target.closest('thead') && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
        document.querySelectorAll('th.column-selected').forEach(h => h.classList.remove('column-selected'));
      }
    });
    
    // === Global History System ===
    const undoBtn = qs('#undoBtn'), redoBtn = qs('#redoBtn');
    const UNDO_LIMIT = 200;
    let UNDO_STACK = [], REDO_STACK = [];
    window.__HIST_SUPPRESS__ = false;
    window.__HIST_BATCHING__ = false;
    window.__HIST_BATCH_PREV__ = null;

    function statesEqual(a,b){ try{return JSON.stringify(a)===JSON.stringify(b)}catch(_){return false} }
    function updateUndoUi(){ if(undoBtn) undoBtn.disabled = UNDO_STACK.length===0; if(redoBtn) redoBtn.disabled = REDO_STACK.length===0; }
    function pushUndo(prev){
      if (!prev) return;
      if (UNDO_STACK.length && statesEqual(UNDO_STACK[UNDO_STACK.length-1], prev)) return;
      UNDO_STACK.push(prev);
      if (UNDO_STACK.length>UNDO_LIMIT) UNDO_STACK.shift();
      REDO_STACK.length=0; updateUndoUi();
    }
    function beginAction(){ window.__HIST_BATCHING__ = true; window.__HIST_BATCH_PREV__ = window.__HIST_BATCH_PREV__ || readState(); }
    function endAction(){
      if (window.__HIST_BATCHING__) {
        const prev = window.__HIST_BATCH_PREV__;
        window.__HIST_BATCHING__ = false; window.__HIST_BATCH_PREV__ = null;
        if (prev) pushUndo(prev);
        updateUndoUi();
      }
    }
    function applyStateAndRebuild(state){
      window.__HIST_SUPPRESS__ = true;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state||{})); rebuildUI(); }
      finally { window.__HIST_SUPPRESS__ = false; updateUndoUi(); }
    }
    function undo(){ const curr=readState(); const prev=UNDO_STACK.pop(); if(!prev) return; REDO_STACK.push(curr); applyStateAndRebuild(prev); }
    function redo(){ const curr=readState(); const next=REDO_STACK.pop(); if(!next) return; UNDO_STACK.push(curr); applyStateAndRebuild(next); }
    undoBtn && undoBtn.addEventListener('click', undo);
    redoBtn && redoBtn.addEventListener('click', redo);
    
    // Live mode is now managed by alert-system.js
    
    document.addEventListener('keydown', (e)=>{
      const mac = navigator.platform.toUpperCase().includes('MAC');
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase()==='z'){ e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); }
    });
    
    // ESC to clear selection
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Don't clear while dragging either designer
        if (anyPopoverDragging || BorderDesigner.isDragging() || FormatDesigner.isDragging()) return;
        clearSelection();
      }
    });
    const scheduleStart=qs('#scheduleStart'), saveBtn=qs('#saveBtn'), loadBtn=qs('#loadBtn'), loadInput=qs('#loadInput'), printBtn=qs('#printBtn');

    // Meta
    const metaTitle=qs('#metaTitle'), metaDate=qs('#metaDate'), metaX=qs('#metaX'), metaY=qs('#metaY'), metaDisplay=qs('#metaDisplay'), metaDow=qs('#metaDow');

    // Palette
    const palChips=qs('#palChips'), palAdd=qs('#palAdd'), palReset=qs('#palReset'), palSave=qs('#palSave');

    // Column Manager
    const colList=qs('#colList'), colAdd=qs('#colAdd'), colReset=qs('#colReset');

    // Print settings
    const psUseDesigner=qs('#psUseDesigner'), psShowMeta=qs('#psShowMeta'), psCompact=qs('#psCompact'), psGridLines=qs('#psGridLines'), psBreakSubs=qs('#psBreakSubs'), psMediaSize=qs('#psMediaSize'), psMediaHeight=qs('#psMediaHeight'), psMediaMax=qs('#psMediaMax'), psAppendGallery=qs('#psAppendGallery'), psGalleryCols=qs('#psGalleryCols'), psGallerySize=qs('#psGallerySize');
    const printDynamic=qs('#printDynamic'), printGallery=qs('#printGallery'), galleryGrid=qs('#galleryGrid');

    // Designer
    const designerCanvas=qs('#designerCanvas'), propsBody=qs('#propsBody'), dLayoutSelect=qs('#dLayoutSelect'), dNewLayout=qs('#dNewLayout'), dDupLayout=qs('#dDupLayout'), dDelLayout=qs('#dDelLayout');
    const dAddMeta=qs('#dAddMeta'), dAddTable=qs('#dAddTable'), dAddGallery=qs('#dAddGallery'), dAddText=qs('#dAddText'), dAddImage=qs('#dAddImage');
    const designerPrintRoot=qs('#designerPrintRoot');

    const STORAGE_KEY='shootScheduler_v8_10';
try{const __ps=readState(); if(__ps.print&&__ps.print.useDesigner){ writeState({...__ps, print:{...__ps.print, useDesigner:false}}); }}catch(_){}
    const VAULT_DB='shootVault_v1'; let vaultDb=null;
    
    // Media label storage - one label per media ID
    function getMediaLabel(mediaId) {
      const labels = JSON.parse(localStorage.getItem('mediaLabels') || '{}');
      return labels[mediaId] || '';
    }
    
    function setMediaLabel(mediaId, label) {
      const labels = JSON.parse(localStorage.getItem('mediaLabels') || '{}');
      if (label && label.trim()) {
        labels[mediaId] = label.trim();
      } else {
        delete labels[mediaId]; // Remove empty labels
      }
      localStorage.setItem('mediaLabels', JSON.stringify(labels));
    }

    // Utils
    function cid(){return 'c_'+Math.random().toString(36).slice(2,8);} function uid(){return 'r_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);}
    function pad(n){return String(n).padStart(2,'0');}
    function toMinutes(hhmm){
      if(!hhmm)return 0; 
      // Handle both "8:00" and "8:00 AM" formats
      const cleanTime = hhmm.replace(/\s*(AM|PM)\s*$/i, '');
      const [h,m]=cleanTime.split(':').map(Number); 
      // If original had PM and wasn't 12, add 12 hours
      if(/PM$/i.test(hhmm) && h !== 12) {
        return (h + 12) * 60 + m;
      }
      // If original had AM and was 12, convert to 0
      if(/AM$/i.test(hhmm) && h === 12) {
        return m;
      }
      return h*60+m;
    }
    function minutesToHHMM(mins){mins=((mins%(1440))+1440)%1440;const h=Math.floor(mins/60);const m=mins%60;return `${pad(h)}:${pad(m)}`;}
    function hhmmToAmPm(x){const [h0,m]=x.split(':').map(Number);const ap=h0<12?'AM':'PM';let h=h0%12; if(h===0)h=12; return `${h}:${pad(m)} ${ap}`;}
    
    // Time format preference
    function getTimeFormat() {
      return localStorage.getItem('timeFormat') || '12h';
    }
    function setTimeFormat(format) {
      localStorage.setItem('timeFormat', format);
    }
    
    // Universal time formatter that respects user preference
    function formatTime(hhmm) {
      const format = getTimeFormat();
      if (format === '24h') {
        // 24-hour format: just return HH:MM
        const [h, m] = hhmm.split(':').map(Number);
        return `${h}:${pad(m)}`;
      } else {
        // 12-hour format: convert to AM/PM
        return hhmmToAmPm(hhmm);
      }
    }


    // State
    const DEFAULT_PALETTE=['#243041','#2f2a41','#41322a','#2a4132','#2a3541','#5aa0ff','#ff8a5a','#5affc1','#d1c9ff','#ffd166'];
    const FIXED_LEFT=[{key:'drag',label:'',fixed:true},{key:'idx',label:'#',fixed:true},{key:'start',label:'START',fixed:true},{key:'end',label:'END',fixed:true},{key:'duration',label:'DUR',fixed:true},{key:'type',label:'TYPE',fixed:true},];
    const FIXED_RIGHT=[{key:'actions',label:'',fixed:true}];
    const DEFAULT_CUSTOM_COLS=[{id:cid(),key:'c_text',label:'TEXT',type:'text',show:true,print:true},{id:cid(),key:'c_uploads',label:'MEDIA',type:'upload',show:true,print:true},{id:cid(),key:'c_tags',label:'TAGS',type:'tags',show:true,print:true},];
    
    // Default schedule template with pre-formatted headers and starter row
    // Cache for the default schedule template loaded from JSON
    let _defaultScheduleCache = null;
    let _templateLoadPromise = null;
    
    // Load default schedule from JSON file (async, with sync fallback)
    async function loadDefaultScheduleFromFile() {
      try {
        const response = await fetch('default_schedule.json');
        if (response.ok) {
          _defaultScheduleCache = await response.json();
          console.log('[Template] Loaded default_schedule.json');
        }
      } catch (e) {
        console.warn('[Template] Could not load default_schedule.json:', e);
      }
      return _defaultScheduleCache;
    }
    
    // Start loading immediately, store promise
    _templateLoadPromise = loadDefaultScheduleFromFile();
    
    // Expose promise for initial load
    window._waitForTemplate = () => _templateLoadPromise;
    
    function getDefaultScheduleTemplate() {
      // Generate fresh IDs
      const freshDayId = 'day-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const freshRowId = 'r_' + Math.random().toString(36).substr(2, 10);
      
      // If we have the cached template, deep clone it and replace IDs
      if (_defaultScheduleCache) {
        const template = JSON.parse(JSON.stringify(_defaultScheduleCache));
        
        // Replace day ID
        if (template.days && template.days[0]) {
          template.days[0].id = freshDayId;
          
          // Replace row IDs
          if (template.days[0].rows) {
            template.days[0].rows.forEach((row, i) => {
              row.id = 'r_' + Math.random().toString(36).substr(2, 10);
            });
          }
        }
        
        // Update activeDayId to match
        template.activeDayId = freshDayId;
        
        return template;
      }
      
      // Fallback: minimal template if JSON not loaded yet
      console.warn('[Template] Using fallback - default_schedule.json not yet loaded');
      return {"colW":{"drag":60,"dash":6,"duration":75,"actions":90,"idx":42,"start":75,"end":75,"type":75},"days":[{"id":freshDayId,"dayNumber":1,"date":"","dow":"","scheduleStart":"8:00 AM","rows":[{"id":freshRowId,"type":"EVENT","title":"","duration":30,"offset":0,"anchorMode":"start","anchorId":"","custom":{},"cellFormatting":{}}],"palette":["#243041","#2f2a41","#41322a","#2a4132","#2a3541","#5aa0ff","#ff8a5a","#5affc1","#d1c9ff","#ffd166"],"cols":[{"id":"c_1","key":"c_text","label":"TEXT","type":"text","show":true,"print":true}]}],"projectMeta":{"title":"","version":""},"activeDayId":freshDayId,"cols":[{"id":"c_1","key":"c_text","label":"TEXT","type":"text","show":true,"print":true}],"columnOrder":["drag","idx","start","end","duration","type","title","c_text","actions"]};
    }

    function readState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{}}catch(e){return{}}}
    
function writeState(s){
  try{
    if (window.__HIST_SUPPRESS__) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s||{})); return; }
    const prev = readState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s||{}));
    if (window.__HIST_BATCHING__) { if (!window.__HIST_BATCH_PREV__) window.__HIST_BATCH_PREV__ = prev; return; }
    if (!statesEqual(prev, s)) pushUndo(prev);
  }catch(_){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s||{}));
  }
}

// === Multi-Day System ===
function generateDayId() {
  return 'day-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function _getProjectMeta() {
  const s = readState();
  return s.projectMeta || { title: '', version: '' };
}

function setProjectMeta(meta) {
  const s = readState();
  writeState({ ...s, projectMeta: meta });
}

function _getDays() {
  const s = readState();
  if (Array.isArray(s.days) && s.days.length > 0) {
    return s.days;
  }
  // Migrate old single-day format to multi-day
  const firstDay = {
    id: generateDayId(),
    dayNumber: 1,
    date: s.meta?.date || '',
    dow: s.meta?.dow || '',
    scheduleStart: s.start || '8:00',
    rows: s.rows || [],
    palette: s.palette || DEFAULT_PALETTE.slice(),
    cols: s.cols || DEFAULT_CUSTOM_COLS.slice()
  };
  return [firstDay];
}

// Expose globally for alert system
window._getDays = _getDays;

// Expose for file menu (outside IIFE)
window.getDefaultScheduleTemplate = getDefaultScheduleTemplate;

function getActiveDayId() {
  const s = readState();
  if (s.activeDayId) return s.activeDayId;
  const days = _getDays();
  return days[0]?.id || null;
}

function setActiveDayId(dayId) {
  const s = readState();
  writeState({ ...s, activeDayId: dayId });
}

function getCurrentDay() {
  const days = _getDays();
  const activeId = getActiveDayId();
  return days.find(d => d.id === activeId) || days[0];
}

function updateDay(dayId, updates) {
  const s = readState();
  const days = _getDays();
  const idx = days.findIndex(d => d.id === dayId);
  if (idx === -1) return;
  
  days[idx] = { ...days[idx], ...updates };
  writeState({ ...s, days });
}

function addNewDay(duplicateSchedule = false) {
  const s = readState();
  const days = _getDays();
  const lastDay = days[days.length - 1];
  
  // Calculate new date (increment from last day)
  let newDate = '';
  let newDow = '';
  if (lastDay.date) {
    const lastDate = new Date(lastDay.date + 'T00:00:00');
    lastDate.setDate(lastDate.getDate() + 1);
    newDate = lastDate.toISOString().split('T')[0];
    newDow = lastDate.toLocaleDateString(undefined, { weekday: 'long' });
  }
  
  const newDay = {
    id: generateDayId(),
    dayNumber: days.length + 1,
    date: newDate,
    dow: newDow,
    scheduleStart: lastDay.scheduleStart || '8:00',
    rows: duplicateSchedule ? JSON.parse(JSON.stringify(lastDay.rows || [])) : 
          [{id:uid(), type:'EVENT', title:'New Event', duration:30, custom:{}}],
    palette: lastDay.palette || DEFAULT_PALETTE.slice(),
    cols: lastDay.cols || DEFAULT_CUSTOM_COLS.slice()
  };
  
  // Regenerate IDs for duplicated rows
  if (duplicateSchedule) {
    newDay.rows = newDay.rows.map(r => ({
      ...r,
      id: uid(),
      children: r.children?.map(ch => ({ ...ch, id: uid() }))
    }));
  }
  
  days.push(newDay);
  writeState({ ...s, days, activeDayId: newDay.id });
  renderDayTabs();
  loadDay(newDay.id);
}

function deleteDay(dayId) {
  const s = readState();
  const days = _getDays();
  
  if (days.length === 1) {
    alert('Cannot delete the last day.');
    return;
  }
  
  const idx = days.findIndex(d => d.id === dayId);
  if (idx === -1) return;
  
  const dayNum = idx + 1;
  if (!confirm(`Delete Day ${dayNum}? This cannot be undone.`)) return;
  
  days.splice(idx, 1);
  
  // Renumber remaining days
  days.forEach((day, i) => {
    day.dayNumber = i + 1;
  });
  
  // Set new active day
  let newActiveId = days[Math.min(idx, days.length - 1)].id;
  
  writeState({ ...s, days, activeDayId: newActiveId });
  renderDayTabs();
  loadDay(newActiveId);
}

function loadDay(dayId) {
  const days = _getDays();
  const day = days.find(d => d.id === dayId);
  console.log('[loadDay] Loading day:', dayId, 'Row count:', day?.rows?.length);
  console.log('[loadDay] First row cellFormatting:', day?.rows?.[0]?.cellFormatting);
  if (!day) return;
  
  setActiveDayId(dayId);
  
  // Update UI with day data
  const metaDate = document.getElementById('metaDate');
  const metaDow = document.getElementById('metaDow');
  const metaX = document.getElementById('metaX');
  const metaY = document.getElementById('metaY');
  const scheduleStart = document.getElementById('scheduleStart');
  
  if (metaDate) metaDate.value = day.date || '';
  
  // Auto-calculate day of week from date if not stored or if date changed
  let dowToUse = day.dow || '';
  if (day.date && (!day.dow || day.dow === '')) {
    dowToUse = new Date(day.date).toLocaleDateString(undefined, { weekday: 'long' });
  }
  
  if (metaDow) metaDow.value = dowToUse;
  if (metaX) metaX.value = day.dayNumber;
  if (metaY) metaY.value = days.length;
  if (scheduleStart) {
    // Format based on time format preference
    const timeValue = day.scheduleStart || '8:00';
    const minutes = toMinutes(timeValue);
    const hhmm = minutesToHHMM(minutes);
    const format = getTimeFormat();
    
    if (format === '12h') {
      scheduleStart.value = hhmmToAmPm(hhmm);
    } else {
      const [h, m] = hhmm.split(':').map(Number);
      scheduleStart.value = `${h}:${String(m).padStart(2, '0')}`;
    }
  }
  
  // Migration: Fix old dark sub-schedule colors
  (day.rows || []).forEach(r => {
    if (r.type === 'SUB' && r.subColor === '#243041') {
      r.subColor = '';  // Clear the old dark color; will use theme default
    }
  });
  
  // Load sharpie state from day data
  if (typeof SharpieManager !== 'undefined') {
    SharpieManager.loadState(day.rows || []);
  }
  
  // Rebuild schedule
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  (day.rows || []).forEach(r => {
    console.log('[loadDay] Row cellFormatting:', r.id, r.cellFormatting);
    const head = makeRow(r);
    tbody.appendChild(head);
    
    if (r.type === 'SUB') {
      (r.children || []).forEach(ch => {
        const childRow = makeSubChildRow(head, ch);
        tbody.appendChild(childRow);
      });
    }
  });
  
  rebuildHeaders();
  updateHeaderDisplay();
  
  // Restore header cell formatting
  console.log('[loadDay] Header formatting data:', day.headerFormatting);
  if (day.headerFormatting) {
    console.log('[loadDay] Restoring header formatting for', Object.keys(day.headerFormatting).length, 'columns');
    const scheduleTable = document.getElementById('scheduleTable');
    const thead = scheduleTable ? scheduleTable.querySelector('thead') : null;
    if (thead) {
      Object.keys(day.headerFormatting).forEach(key => {
        const th = thead.querySelector(`th[data-key="${key}"]`);
        if (th) {
          const formatting = day.headerFormatting[key];
          console.log('[loadDay] Applying header formatting to', key, ':', formatting);
          
          // Store in dataset
          if (formatting.fontFamily !== undefined) th.dataset.fontFamily = formatting.fontFamily || '';
          if (formatting.fontSize !== undefined) th.dataset.fontSize = formatting.fontSize || '';
          if (formatting.bold !== undefined) th.dataset.bold = formatting.bold ? 'true' : '';
          if (formatting.italic !== undefined) th.dataset.italic = formatting.italic ? 'true' : '';
          if (formatting.underline !== undefined) th.dataset.underline = formatting.underline ? 'true' : '';
          if (formatting.align !== undefined) th.dataset.align = formatting.align || '';
          if (formatting.valign !== undefined) th.dataset.valign = formatting.valign || '';
          if (formatting.fgColor !== undefined) th.dataset.cellFg = formatting.fgColor || '';
          if (formatting.bgColor !== undefined) th.dataset.cellBg = formatting.bgColor || '';
          
          // Apply visual styles to TH
          if (formatting.fontFamily !== undefined && formatting.fontFamily) {
            th.style.setProperty('font-family', formatting.fontFamily, 'important');
          }
          if (formatting.fontSize !== undefined && formatting.fontSize) {
            th.style.setProperty('font-size', formatting.fontSize, 'important');
          }
          if (formatting.bold !== undefined) {
            th.style.setProperty('font-weight', formatting.bold ? 'bold' : 'normal', 'important');
          }
          if (formatting.italic !== undefined) {
            th.style.setProperty('font-style', formatting.italic ? 'italic' : 'normal', 'important');
          }
          if (formatting.underline !== undefined) {
            th.style.setProperty('text-decoration', formatting.underline ? 'underline' : 'none', 'important');
          }
          if (formatting.align !== undefined && formatting.align) {
            th.style.setProperty('text-align', formatting.align, 'important');
          }
          if (formatting.valign !== undefined && formatting.valign) {
            th.style.setProperty('vertical-align', formatting.valign, 'important');
          }
          if (formatting.fgColor !== undefined && formatting.fgColor) {
            th.style.setProperty('color', formatting.fgColor, 'important');
          }
          if (formatting.bgColor !== undefined && formatting.bgColor) {
            console.log('[loadDay] Setting header bgColor for', key, 'to', formatting.bgColor);
            th.style.setProperty('background-color', formatting.bgColor, 'important');
          }
          
          // Apply border formatting if present
          if (formatting.borderTop !== undefined) th.dataset.borderTop = formatting.borderTop || '';
          if (formatting.borderRight !== undefined) th.dataset.borderRight = formatting.borderRight || '';
          if (formatting.borderBottom !== undefined) th.dataset.borderBottom = formatting.borderBottom || '';
          if (formatting.borderLeft !== undefined) th.dataset.borderLeft = formatting.borderLeft || '';
          
          // Apply border styles
          if (formatting.borderTop) th.style.setProperty('border-top', formatting.borderTop, 'important');
          if (formatting.borderRight) th.style.setProperty('border-right', formatting.borderRight, 'important');
          if (formatting.borderBottom) th.style.setProperty('border-bottom', formatting.borderBottom, 'important');
          if (formatting.borderLeft) th.style.setProperty('border-left', formatting.borderLeft, 'important');
        } else {
          console.warn('[loadDay] Could not find TH for key:', key);
        }
      });
    } else {
      console.warn('[loadDay] Could not find thead element');
    }
  } else {
    console.log('[loadDay] No header formatting to restore');
  }
  
  renderDayTabs();
  
  // Apply saved column visibility
  applySavedColumnVisibility();
  
  renumber();
  recalc(); // This will update CALL TIME/SUB-SCHEDULE START cells based on END column visibility
  refreshAnchorSelectors();
  
  // Apply saved column widths after rebuilding rows
  syncCellWidths();
  
  // Apply column formats to newly rendered cells
  applyColumnFormats();
  
  // Apply column alignments to all cells
  applyColumnAlignments();
  
  // Reapply row formatting after all column operations
  if (window.reapplyAllRowFormatting) {
    setTimeout(() => {
      console.log('[loadDay] Calling reapplyAllRowFormatting');
      window.reapplyAllRowFormatting();
    }, 100);
  }
  
  // Trigger header designer to update with new day's metadata
  // Use setTimeout to ensure DOM has updated with new values
  setTimeout(() => {
    if (window.updateHeaderMetadata) {
      console.log('[loadDay] Calling updateHeaderMetadata');
      window.updateHeaderMetadata();
    }
  }, 10);
  
  // Apply row heights and add resize grips
  applyRowHeights();
  addRowResizeGrips();
  
  // Apply sharpie state to DOM after rows are built AND formatted
  if (typeof SharpieManager !== 'undefined') {
    setTimeout(() => {
      console.log('[loadDay] Applying sharpie state (100ms)');
      SharpieManager.applyState();
    }, 100);
    setTimeout(() => {
      console.log('[loadDay] Reapplying sharpie state (500ms)');
      SharpieManager.applyState();
    }, 500);
    setTimeout(() => {
      console.log('[loadDay] Reapplying sharpie state (1000ms)');
      SharpieManager.applyState();
    }, 1000);
    setTimeout(() => {
      console.log('[loadDay] Final sharpie state apply (2000ms)');
      SharpieManager.applyState();
    }, 2000);
  }
}

function saveDayData() {
  const currentDayId = getActiveDayId();
  if (!currentDayId) return;
  
  const scheduleStart = document.getElementById('scheduleStart');
  const metaDate = document.getElementById('metaDate');
  const metaDow = document.getElementById('metaDow');
  const tbody = document.getElementById('tbody');
  
  const rows = [];
  const trs = Array.from(tbody.querySelectorAll('tr'));
  
  trs.forEach(tr => {
    if (tr.classList.contains('subchild')) return; // Skip sub-schedule children for now
    
    const base = {
      id: tr.dataset.id || uid(),
      type: tr.dataset.type || 'EVENT',
      title: tr.querySelector('.title')?.value || tr.querySelector('.subTitle')?.value || '',
      duration: Number(tr.querySelector('.duration')?.value) || 30,
      offset: Number(tr.querySelector('.offset')?.value) || 0,
      anchorMode: tr.dataset.anchorMode || 'start',
      anchorId: tr.dataset.anchorId || '',
      callTimeDisplay: tr.dataset.callTimeDisplay || 'end',
      subColor: tr.dataset.subColor || '',
      subFg: tr.dataset.subFg || '',
      rowBg: tr.dataset.rowBg || '',
      rowFg: tr.dataset.rowFg || '',
      fontFamily: tr.dataset.fontFamily || '',
      fontSize: tr.dataset.fontSize || '',
      bold: tr.dataset.bold === 'true',
      italic: tr.dataset.italic === 'true',
      underline: tr.dataset.underline === 'true',
      align: tr.dataset.align || '',
      valign: tr.dataset.valign || '',
      completed: tr.dataset.completed === 'true',
      completedAt: tr.dataset.completedAt ? Number(tr.dataset.completedAt) : null,
      mealWrapType: tr.dataset.mealWrapType || '',
      custom: getRowCustomFromDOM(tr)
    };
    
    // Save cell-based formatting
    const cellFormatting = {};
    tr.querySelectorAll('td[data-key]').forEach(td => {
      const key = td.dataset.key;
      if (key === 'drag' || key === 'actions') return; // Skip control columns
      
      // Only save if cell has formatting
      if (td.dataset.fontFamily || td.dataset.fontSize || td.dataset.bold || 
          td.dataset.italic || td.dataset.underline || td.dataset.align || td.dataset.valign ||
          td.dataset.cellFg || td.dataset.cellBg || 
          td.dataset.borderTop !== undefined || td.dataset.borderRight !== undefined || 
          td.dataset.borderBottom !== undefined || td.dataset.borderLeft !== undefined) {
        
        cellFormatting[key] = {
          fontFamily: td.dataset.fontFamily || '',
          fontSize: td.dataset.fontSize || '',
          bold: td.dataset.bold === 'true',
          italic: td.dataset.italic === 'true',
          underline: td.dataset.underline === 'true',
          align: td.dataset.align || '',
          valign: td.dataset.valign || '',
          fgColor: td.dataset.cellFg || '',
          bgColor: td.dataset.cellBg || ''
        };
        
        // Add border formatting
        const borderData = BorderDesigner.getBorderFormatting(td);
        Object.assign(cellFormatting[key], borderData);
      }
    });
    
    if (Object.keys(cellFormatting).length > 0) {
      base.cellFormatting = cellFormatting;
    }
    
    // Save separator-specific data
    if (base.type === 'SEPARATOR') {
      const separatorText = tr.querySelector('.separator-text');
      if (separatorText) {
        base.separatorText = separatorText.textContent || '';
        base.separatorFormatting = {
          fontFamily: separatorText.style.fontFamily || '',
          fontSize: separatorText.style.fontSize || '',
          bold: separatorText.style.fontWeight === 'bold',
          italic: separatorText.style.fontStyle === 'italic',
          underline: separatorText.style.textDecoration === 'underline',
          align: separatorText.style.textAlign || '',
          fgColor: separatorText.style.color || ''
        };
      }
      base.duration = 0; // Ensure separator has 0 duration
    }
    
    // Handle sub-schedule children
    if (base.type === 'SUB') {
      const children = [];
      let next = tr.nextElementSibling;
      while (next && next.classList.contains('subchild') && next.dataset.parent === base.id) {
        const subType = next.dataset.subType || 'event';
        const childData = {
          id: next.dataset.id || uid(),
          title: next.querySelector('.subTitle')?.value || '',
          subType: subType,
          subChildColor: next.dataset.subChildColor || '',
          subChildFg: next.dataset.subChildFg || '',
          completed: next.dataset.completed === 'true',
          completedAt: next.dataset.completedAt ? Number(next.dataset.completedAt) : null,
          mealWrapType: next.dataset.mealWrapType || '',
          custom: getRowCustomFromDOM(next)
        };
        
        // Save cell-based formatting for children
        const childCellFormatting = {};
        next.querySelectorAll('td[data-key]').forEach(td => {
          const key = td.dataset.key;
          if (key === 'drag' || key === 'actions') return;
          
          if (td.dataset.fontFamily || td.dataset.fontSize || td.dataset.bold || 
              td.dataset.italic || td.dataset.underline || td.dataset.align || td.dataset.valign ||
              td.dataset.cellFg || td.dataset.cellBg ||
              td.dataset.borderTop !== undefined || td.dataset.borderRight !== undefined || 
              td.dataset.borderBottom !== undefined || td.dataset.borderLeft !== undefined) {
            
            childCellFormatting[key] = {
              fontFamily: td.dataset.fontFamily || '',
              fontSize: td.dataset.fontSize || '',
              bold: td.dataset.bold === 'true',
              italic: td.dataset.italic === 'true',
              underline: td.dataset.underline === 'true',
              align: td.dataset.align || '',
              valign: td.dataset.valign || '',
              fgColor: td.dataset.cellFg || '',
              bgColor: td.dataset.cellBg || ''
            };
            
            // Add border formatting
            const borderData = BorderDesigner.getBorderFormatting(td);
            Object.assign(childCellFormatting[key], borderData);
          }
        });
        
        if (Object.keys(childCellFormatting).length > 0) {
          childData.cellFormatting = childCellFormatting;
        }
        
        // Save either duration or offset depending on type
        if (subType === 'call') {
          childData.offset = Number(next.querySelector('.subOffset')?.value) || 0;
          childData.duration = 0;
        } else {
          childData.duration = Number(next.querySelector('.subDur')?.value) || 0;
          childData.offset = 0;
        }
        
        children.push(childData);
        next = next.nextElementSibling;
      }
      base.children = children;
    }
    
    rows.push(base);
  });
  
  console.log('[saveDayData] Saving rows with cellFormatting:', JSON.stringify(rows.map(r => ({
    id: r.id,
    cellFormatting: r.cellFormatting
  })), null, 2));
  
  // Save header cell formatting
  console.log('[saveDayData] Checking for header formatting...');
  const headerFormatting = {};
  const scheduleTable = document.getElementById('scheduleTable');
  const thead = scheduleTable ? scheduleTable.querySelector('thead') : null;
  if (thead) {
    console.log('[saveDayData] Found schedule table thead:', thead);
    const allTHs = thead.querySelectorAll('th');
    console.log('[saveDayData] Total TH elements:', allTHs.length);
    allTHs.forEach((th, i) => {
      console.log(`[saveDayData] TH ${i}:`, th, 'hasDataKey:', 'key' in th.dataset, 'dataKey:', th.dataset.key, 'innerHTML:', th.innerHTML.substring(0, 50));
    });
    
    const thsWithDataKey = thead.querySelectorAll('th[data-key]');
    console.log('[saveDayData] TH elements with data-key:', thsWithDataKey.length);
    
    thsWithDataKey.forEach(th => {
      const key = th.dataset.key;
      console.log('[saveDayData] Examining TH with key:', key);
      
      if (key === 'drag' || key === 'actions') {
        console.log('[saveDayData] Skipping control column:', key);
        return; // Skip control columns
      }
      
      console.log('[saveDayData] Checking TH', key, '- dataset:', {
        fontFamily: th.dataset.fontFamily,
        fontSize: th.dataset.fontSize,
        bold: th.dataset.bold,
        italic: th.dataset.italic,
        underline: th.dataset.underline,
        align: th.dataset.align,
        valign: th.dataset.valign,
        cellFg: th.dataset.cellFg,
        cellBg: th.dataset.cellBg,
        borderTop: th.dataset.borderTop,
        borderRight: th.dataset.borderRight,
        borderBottom: th.dataset.borderBottom,
        borderLeft: th.dataset.borderLeft
      });
      
      // Only save if header has formatting
      if (th.dataset.fontFamily || th.dataset.fontSize || th.dataset.bold || 
          th.dataset.italic || th.dataset.underline || th.dataset.align || th.dataset.valign ||
          th.dataset.cellFg || th.dataset.cellBg || 
          th.dataset.borderTop !== undefined || th.dataset.borderRight !== undefined || 
          th.dataset.borderBottom !== undefined || th.dataset.borderLeft !== undefined) {
        
        console.log('[saveDayData] TH', key, 'HAS formatting - saving it');
        headerFormatting[key] = {
          fontFamily: th.dataset.fontFamily || '',
          fontSize: th.dataset.fontSize || '',
          bold: th.dataset.bold === 'true',
          italic: th.dataset.italic === 'true',
          underline: th.dataset.underline === 'true',
          align: th.dataset.align || '',
          valign: th.dataset.valign || '',
          fgColor: th.dataset.cellFg || '',
          bgColor: th.dataset.cellBg || ''
        };
        
        // Add border formatting
        const borderData = BorderDesigner.getBorderFormatting(th);
        Object.assign(headerFormatting[key], borderData);
        
        console.log('[saveDayData] Saved header formatting for', key, ':', headerFormatting[key]);
      } else {
        console.log('[saveDayData] TH', key, 'has NO formatting');
      }
    });
  } else {
    console.log('[saveDayData] No thead found!');
  }
  
  console.log('[saveDayData] Final headerFormatting object:', headerFormatting);
  
  updateDay(currentDayId, {
    date: metaDate?.value || '',
    dow: metaDow?.value || '',
    scheduleStart: scheduleStart?.value || '8:00',
    rows,
    headerFormatting: Object.keys(headerFormatting).length > 0 ? headerFormatting : undefined
  });
}

function renderDayTabs() {
  const dayTabsBar = document.getElementById('dayTabsBar');
  const dayTabs = document.getElementById('dayTabs');
  if (!dayTabs) return;
  
  const days = _getDays();
  const activeId = getActiveDayId();
  
  dayTabs.innerHTML = '';
  
  days.forEach((day, idx) => {
    const tab = document.createElement('div');
    tab.className = 'day-tab';
    if (day.id === activeId) tab.classList.add('active');
    tab.dataset.dayId = day.id;
    
    const label = document.createElement('span');
    label.textContent = `Day ${day.dayNumber}`;
    tab.appendChild(label);
    
    if (days.length > 1) {
      const closeBtn = document.createElement('span');
      closeBtn.className = 'day-tab-close';
      closeBtn.innerHTML = '×';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        deleteDay(day.id);
      };
      tab.appendChild(closeBtn);
    }
    
    tab.onclick = () => {
      if (day.id !== activeId) {
        saveDayData(); // Save current day before switching
        loadDay(day.id);
      }
    };
    
    dayTabs.appendChild(tab);
  });
}

function handleMetaXYEdits() {
  const metaX = document.getElementById('metaX');
  const metaY = document.getElementById('metaY');
  
  if (!metaX || !metaY) return;
  
  metaX.addEventListener('change', () => {
    const days = _getDays();
    const currentIdx = days.findIndex(d => d.id === getActiveDayId());
    const newX = parseInt(metaX.value) || 1;
    
    if (newX !== currentIdx + 1) {
      if (!confirm(`Day X has changed from ${currentIdx + 1} to ${newX}. This doesn't match the current tab position. Continue anyway?`)) {
        metaX.value = currentIdx + 1;
      }
    }
  });
  
  metaY.addEventListener('change', () => {
    const days = _getDays();
    const newY = parseInt(metaY.value) || 1;
    
    if (newY !== days.length) {
      if (!confirm(`Day Y has changed from ${days.length} to ${newY}. This doesn't match the total number of days. Continue anyway?`)) {
        metaY.value = days.length;
      }
    }
  });
}


// === Column width persistence & application ===
const DEFAULT_COL_WIDTHS = {
  /* min suggested widths: drag:28, actions:96 */
  drag:60, dash:6, idx:36, start:100, end:100, duration:60, type:90, title:200, actions:90
};
function getColW(){
  try{
    const s = readState();
    return s.colW || {...DEFAULT_COL_WIDTHS};
  }catch(e){ return {...DEFAULT_COL_WIDTHS}; }
}
function setColW(map){
  // Force drag to fixed width - never allow it to change
  map.drag = 60;
  const s = readState();
  writeState({...s, colW: map});
  applyColWidths();
}
function rebuildColGroup(){
  const table = document.getElementById('scheduleTable');
  if(!table) return;
  let cg = table.querySelector('#colGroup');
  if(!cg){ cg = document.createElement('colgroup'); cg.id='colGroup'; table.insertBefore(cg, table.firstChild); }
  cg.innerHTML='';
  const w = getColW();
  const cols = getAllColumnsSorted();
  const colVisState = JSON.parse(localStorage.getItem('columnVisibility') || '{}');
  
  console.log('[rebuildColGroup] Cols count:', cols.length);
  console.log('[rebuildColGroup] Saved widths:', w);
  
  // Calculate total table width
  let totalWidth = 0;
  
  cols.forEach(c=>{
    const el = document.createElement('col');
    el.dataset.key = c.key;
    
    // Add data attributes for separator columns
    if(c.type === 'separator') {
      el.dataset.type = 'separator';
    }
    
    // Apply visibility for hidden columns
    if (c.fixed) {
      // Built-in columns use columnVisibility localStorage
      if (colVisState[c.key] === false) {
        el.style.visibility = 'collapse';
      }
    } else {
      // Custom columns use show property
      if (c.show === false) {
        el.style.visibility = 'collapse';
      }
    }
    
    let colWidth = 0;
    
    // Force drag and actions to fixed widths - never allow them to change
    if(c.key === 'drag'){
      colWidth = 60;
      el.style.width = '60px';
      el.style.minWidth = '60px';
      el.style.maxWidth = '60px';
    } else if(c.type === 'separator'){
      colWidth = 20;
      el.style.width = '20px';
      el.style.minWidth = '20px';
      el.style.maxWidth = '20px';
    } else if(c.key === 'actions'){
      // Width depends on whether sharpie buttons are visible
      colWidth = document.body.classList.contains('sharpie-buttons-collapsed') ? 60 : 94;
    } else if(w[c.key]) {
      colWidth = w[c.key];
      el.style.width = w[c.key] + 'px';
      el.style.minWidth = w[c.key] + 'px';
      el.style.maxWidth = w[c.key] + 'px';
    } else {
      // Columns without saved width get default with explicit styles
      colWidth = 100;
      el.style.width = '100px';
      el.style.minWidth = '100px';
      el.style.maxWidth = '100px';
      console.log('[rebuildColGroup] Column', c.key, 'has no saved width, using 100px default');
    }
    
    totalWidth += colWidth;
    cg.appendChild(el);
  });
  
  // Set table width based only on visible columns
  let visibleWidth = 0;
  cols.forEach(c => {
    const colEl = cg.querySelector(`col[data-key="${c.key}"]`);
    if (colEl && colEl.style.visibility !== 'collapse') {
      if (c.key === 'drag' || c.key === 'actions') {
        visibleWidth += 60;
      } else if (c.type === 'separator') {
        visibleWidth += 20;
      } else if (w[c.key]) {
        visibleWidth += w[c.key];
      } else {
        visibleWidth += 100;
      }
    }
  });
  
  console.log('[rebuildColGroup] Visible width calculated:', visibleWidth);
  
  // Force table to exact width of visible columns
  if (visibleWidth > 0) {
    table.style.cssText = `width: ${visibleWidth}px !important; min-width: ${visibleWidth}px !important; max-width: ${visibleWidth}px !important; table-layout: fixed !important;`;
    console.log('[rebuildColGroup] Set table width to:', visibleWidth);
  } else {
    table.style.cssText = 'table-layout: fixed !important;';
  }
}

// Recalculate table width without rebuilding colgroup (preserves visibility styles)
function recalculateTableWidth() {
  const table = document.getElementById('scheduleTable');
  if (!table) return;
  
  const cg = table.querySelector('#colGroup');
  if (!cg) return;
  
  const w = getColW();
  const cols = getAllColumnsSorted();
  
  // Calculate width of only visible columns
  let visibleWidth = 0;
  
  cols.forEach(c => {
    const colEl = cg.querySelector(`col[data-key="${c.key}"]`);
    if (colEl && colEl.style.visibility !== 'collapse') {
      if (c.key === 'drag' || c.key === 'actions') {
        visibleWidth += 60;
      } else if (c.type === 'separator') {
        visibleWidth += 20;
      } else if (w[c.key]) {
        visibleWidth += w[c.key];
      } else {
        visibleWidth += 100;
      }
    }
  });
  
  // Force table to exact width of visible columns
  if (visibleWidth > 0) {
    table.style.cssText = `width: ${visibleWidth}px !important; min-width: ${visibleWidth}px !important; max-width: ${visibleWidth}px !important;`;
  } else {
    table.style.cssText = '';
  }
}

function syncCellWidths(){
  try{
    const w = getColW();
    console.log('🔧 syncCellWidths called with:', w);
    const theadRow = document.getElementById('headerRow');
    const tbody = document.getElementById('tbody');
    if(theadRow){
      [...theadRow.children].forEach(th=>{
        const key = th.dataset.key; if(!key) return;
        // Force drag and actions columns to fixed widths
        if(key === 'drag'){
          th.style.width = '60px'; th.style.minWidth = '60px'; th.style.maxWidth = '60px';
        } else if(key === 'actions'){
          // Don't set inline styles - let CSS handle the width with transitions
          // Width is controlled by CSS based on body.sharpie-buttons-collapsed class
        } else {
          const px = w[key]; 
          if(px){ 
            th.style.width = px + 'px'; 
            th.style.minWidth = px + 'px';
            th.style.maxWidth = px + 'px'; // Lock the width
          }
        }
      });
    }
    if(tbody){
      [...tbody.querySelectorAll('tr.row')].forEach(tr=>{
        [...tr.children].forEach(td=>{
          const key = td.dataset.key;
          // Force drag and actions columns to fixed widths
          if(key === 'drag'){
            td.style.width = '60px'; td.style.minWidth = '60px'; td.style.maxWidth = '60px';
          } else if(key === 'actions'){
            // Don't set inline styles - let CSS handle the width with transitions
            // Width is controlled by CSS based on body.sharpie-buttons-collapsed class
          } else {
            const px = w[key];
            if(px){ 
              td.style.width = px + 'px'; 
              td.style.minWidth = px + 'px';
              td.style.maxWidth = px + 'px'; // Lock the width
              td.style.overflow = 'hidden';
            }
          }
        });
      });
    }
  }catch(e){}
}
function applyColWidths(){ rebuildColGroup(); syncCellWidths(); }

function addHeaderResizeGrips(){
  const theadRow = document.getElementById('headerRow');
  if(!theadRow) return;
  
  // Remove all existing grips first to prevent duplicates
  theadRow.querySelectorAll('.col-resize-grip').forEach(g => g.remove());
  
  const headers = [...theadRow.children];
  
  headers.forEach((th, index) => {
    const key = th.dataset.key;
    if(!key || key==='drag' || key==='dash') return; // skip drag and dash columns
    
    const grip = document.createElement('span');
    grip.className='col-resize-grip';
    th.appendChild(grip);
    
    let startX=0, startW=0, isResizing=false;
    
    // For actions column, we resize the previous column instead
    const isActionsColumn = (key === 'actions');
    const targetKey = isActionsColumn ? headers[index - 1]?.dataset.key : key;
    
    if(!targetKey) return; // safety check
    
    const onDown = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      const w = getColW();
      startW = w[targetKey] || th.offsetWidth || 100;
      
      let tooltip = null;
      
      const onMove = (ev)=>{
        if(!isResizing) return;
        ev.preventDefault();
        
        const dx = ev.clientX - startX;
        
        // Never allow drag or separator columns to be resized
        if(targetKey === 'drag') return;
        
        // Check if this is a separator column
        const cols = getAllColumnsSorted();
        const targetCol = cols.find(c => c.key === targetKey);
        if(targetCol && targetCol.type === 'separator') return;
        
        const minW = 0; // Allow columns to collapse completely
        const newW = Math.max(minW, startW + dx);
        
        // Create tooltip on first move
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.className = 'resize-dimension-tooltip';
          tooltip.textContent = newW + 'px';
          document.body.appendChild(tooltip);
        }
        
        // Update tooltip
        if (tooltip) {
          tooltip.textContent = Math.round(newW) + 'px';
          tooltip.style.left = (ev.clientX + 10) + 'px';
          tooltip.style.top = (ev.clientY + 10) + 'px';
        }
        
        // ONLY update the target column width, don't call syncCellWidths for all
        const map = {...getColW(), [targetKey]: newW};
        // Ensure drag is always locked
        map.drag = 60;
        
        // Save the width
        const s = readState();
        writeState({...s, colW: map});
        
        // Apply width ONLY to the target column with max-width to lock it
        const targetTh = headers.find(h => h.dataset.key === targetKey);
        if(targetTh) {
          targetTh.style.width = newW + 'px';
          targetTh.style.minWidth = newW + 'px';
          targetTh.style.maxWidth = newW + 'px';
        }
        
        // Update all cells in that column
        const tbody = document.getElementById('tbody');
        if(tbody) {
          tbody.querySelectorAll(`td[data-key="${targetKey}"]`).forEach(td => {
            td.style.width = newW + 'px';
            td.style.minWidth = newW + 'px';
            td.style.maxWidth = newW + 'px';
            td.style.overflow = 'hidden';
          });
        }
        
        // Update the colgroup for that column
        const colEl = document.querySelector(`col[data-key="${targetKey}"]`);
        if(colEl) {
          colEl.style.width = newW + 'px';
          colEl.style.minWidth = newW + 'px';
          colEl.style.maxWidth = newW + 'px';
        }
        
        // Recalculate table width to accommodate the resize
        const allCols = getAllColumnsSorted();
        let newTableWidth = 0;
        allCols.forEach(c => {
          const colElement = document.querySelector(`col[data-key="${c.key}"]`);
          if (colElement && colElement.style.visibility !== 'collapse') {
            const w = parseInt(colElement.style.width) || 100;
            newTableWidth += w;
          }
        });
        const table = document.getElementById('scheduleTable');
        if (table && newTableWidth > 0) {
          table.style.width = newTableWidth + 'px';
          table.style.minWidth = newTableWidth + 'px';
          table.style.maxWidth = newTableWidth + 'px';
        }
      };
      
      const onUp = ()=>{ 
        isResizing = false;
        
        // Remove tooltip
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
        
        window.removeEventListener('mousemove', onMove); 
        window.removeEventListener('mouseup', onUp); 
      };
      
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    
    grip.addEventListener('mousedown', onDown);
  });
}

// === COLW MIGRATION v2 ===
(function(){
  try{
    const s = readState();
    const w = s.colW || {};
    let changed = false;
    if (w.drag !== 60) { w.drag = 60; changed = true; }
    if (w.dash !== 6) { w.dash = 6; changed = true; }
    if (w.duration == null || w.duration === 110) { w.duration = 80; changed = true; }
    if (w.type === 120) { w.type = 90; changed = true; } // Narrow type column
    if (w.title === 300) { w.title = 200; changed = true; } // Narrow title column
    if (w.actions == null) { w.actions = (DEFAULT_COL_WIDTHS.actions||120); changed = true; }
    if (changed) writeState({ ...s, colW: w });
  }catch(e){}
})();

// === ROW HEIGHT MANAGEMENT ===
function getRowH(){
  try{
    const s = readState();
    return s.rowH || {};
  }catch(e){ return {}; }
}
function setRowH(map){
  const s = readState();
  writeState({...s, rowH: map});
  applyRowHeights();
}
function applyRowHeights(){
  console.log('[applyRowHeights] Starting - current row heights in storage:', getRowH());
  const heights = getRowH();
  const tbody = document.getElementById('tbody');
  if(!tbody) return;
  
  // Apply saved header height
  const s = readState();
  if (s.headerHeight) {
    const headerRow = document.getElementById('headerRow');
    if (headerRow) {
      const h = s.headerHeight;
      headerRow.style.setProperty('height', h + 'px', 'important');
      headerRow.style.setProperty('min-height', h + 'px', 'important');
      headerRow.style.setProperty('max-height', h + 'px', 'important');
      headerRow.style.setProperty('overflow', 'hidden', 'important');
      
      const ths = headerRow.querySelectorAll('th');
      const verticalPadding = h < 32 ? '0px' : '2px';
      ths.forEach(th => {
        th.style.setProperty('height', h + 'px', 'important');
        th.style.setProperty('min-height', h + 'px', 'important');
        th.style.setProperty('max-height', h + 'px', 'important');
        th.style.setProperty('overflow', 'hidden', 'important');
        th.style.setProperty('line-height', '1', 'important');
        th.style.setProperty('padding', `${verticalPadding} 4px`, 'important');
        
        // Constrain any inputs/buttons inside header cells
        const inputs = th.querySelectorAll('input, button, select');
        if (h < 30) {
          // Small header - constrain buttons (but skip action column buttons)
          inputs.forEach(input => {
            // Skip action column buttons - they maintain fixed 22px size
            if (input.closest('th[data-key="actions"]') && input.tagName === 'BUTTON') return;
            
            input.style.setProperty('padding', '0 4px', 'important');
            input.style.setProperty('min-height', '0', 'important');
            input.style.setProperty('line-height', '1', 'important');
            input.style.setProperty('height', 'auto', 'important');
            input.style.setProperty('max-height', Math.max(h - 4, 8) + 'px', 'important');
            input.style.setProperty('font-size', '10px', 'important');
          });
        } else {
          // Normal header - restore normal button sizing (but skip action buttons)
          inputs.forEach(input => {
            // Skip action column buttons - they maintain fixed 22px size
            if (input.closest('th[data-key="actions"]') && input.tagName === 'BUTTON') return;
            
            input.style.removeProperty('padding');
            input.style.removeProperty('min-height');
            input.style.removeProperty('line-height');
            input.style.removeProperty('height');
            input.style.removeProperty('max-height');
            input.style.removeProperty('font-size');
          });
        }
      });
    }
  }
  
  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    if(heights[id]){
      const h = heights[id];
      
      // Check if force-row-height mode is on and this row has images
      const hasImages = tr.querySelector('.uploadBox .u-thumb');
      const forceRowHeight = document.body.classList.contains('force-row-height');
      
      if (forceRowHeight && hasImages) {
        // Let images control row height - set min height to match image height + padding
        const thumbHeight = getComputedStyle(document.documentElement).getPropertyValue('--thumb-height').trim();
        const heightValue = parseInt(thumbHeight) || 80;
        const totalHeight = heightValue + 10; // Add 10px for 5px top + 5px bottom padding
        
        // console.log('Force row height ON - thumbHeight:', thumbHeight, 'totalHeight:', totalHeight);
        
        tr.style.setProperty('height', totalHeight + 'px', 'important');
        tr.style.setProperty('min-height', totalHeight + 'px', 'important');
        tr.style.setProperty('max-height', totalHeight + 'px', 'important');
        tr.style.setProperty('overflow', 'visible', 'important');
        
        const cells = tr.querySelectorAll('td');
        cells.forEach(td => {
          // Skip START/END cells and custom text cells - let them keep their default CSS styling
          const isTimeCell = td.classList.contains('start') || td.classList.contains('end') || td.classList.contains('ampm');
          const isTextCell = td.dataset.key && td.dataset.key.startsWith('c_') && td.querySelector('[contenteditable]');
          const isActionsCell = td.classList.contains('actions') || td.dataset.key === 'actions';
          
          td.style.setProperty('height', totalHeight + 'px', 'important');
          td.style.setProperty('min-height', totalHeight + 'px', 'important');
          td.style.setProperty('max-height', totalHeight + 'px', 'important');
          td.style.setProperty('overflow', 'visible', 'important');
          
          if (!isTimeCell && !isTextCell && !isActionsCell) {
            td.style.setProperty('padding', '5px 10px', 'important');
          }
          
          td.style.setProperty('line-height', 'normal', 'important');
        });
      } else {
        // Normal behavior - apply height constraints
        tr.style.setProperty('height', h + 'px', 'important');
        tr.style.setProperty('min-height', h + 'px', 'important');
        tr.style.setProperty('max-height', h + 'px', 'important');
        tr.style.setProperty('overflow', 'hidden', 'important'); // Clip content
        
        // Also clip cells
        const cells = tr.querySelectorAll('td');
        cells.forEach(td => {
          td.style.setProperty('overflow', 'hidden', 'important'); // Clip content
          td.style.setProperty('height', h + 'px', 'important');
          td.style.setProperty('min-height', h + 'px', 'important');
          td.style.setProperty('max-height', h + 'px', 'important');
          
          // Apply padding to normal cells, but skip tag/media/text cells entirely
          if (!td.querySelector('.tagsBox') && !td.querySelector('.uploadBox') && !td.querySelector('.cc-input')) {
            td.style.setProperty('padding', '0 4px', 'important');
          } else {
            // Explicitly remove padding from tag/media/text cells
            td.style.removeProperty('padding');
          }
          // Tag and media cells keep their padding:0 from CSS
          
          td.style.setProperty('line-height', '1', 'important');
        // REMOVED: td.style.setProperty('font-size', '8px', 'important'); // Text should maintain its size
        
        // Remove padding from inputs and contenteditable to allow smaller rows
        // But skip inputs inside uploadBox and tagsBox - those are controlled by their containers
        const inputs = td.querySelectorAll('input, textarea, select, [contenteditable]');
        inputs.forEach(input => {
          // Skip if this input is inside uploadBox, tagsBox, is a text cell (cc-input), or is a duration/offset field
          if (input.closest('.uploadBox') || input.closest('.tagsBox') || input.classList.contains('cc-input') || input.classList.contains('duration') || input.classList.contains('offset') || input.classList.contains('subDur') || input.classList.contains('subOffset')) return;
          
          input.style.setProperty('padding', '0 4px', 'important');
          input.style.setProperty('min-height', '0', 'important');
          input.style.setProperty('line-height', '1', 'important');
          // REMOVED: input.style.setProperty('font-size', '8px', 'important'); // Text should maintain its size
        });
        
        // Constrain/restore buttons based on row height
        const buttons = td.querySelectorAll('button');
        if (h < 30) {
          // Small row - constrain buttons (but skip action buttons which have fixed sizing)
          buttons.forEach(button => {
            // Skip action column buttons - they maintain fixed 18px size
            if (button.closest('td.actions')) {
              console.log('[applyRowHeights] Skipping action button in small row, height:', h);
              return;
            }
            
            // Type badges get less aggressive shrinking
            if (button.classList.contains('type-badge')) {
              button.style.setProperty('padding', '1px 4px', 'important');
              button.style.setProperty('font-size', '12px', 'important');
              button.style.setProperty('max-height', Math.max(h - 2, 18) + 'px', 'important');
            } else {
              // Regular buttons shrink less aggressively
              button.style.setProperty('padding', '2px 6px', 'important');
              button.style.setProperty('min-height', '0', 'important');
              button.style.setProperty('line-height', '1', 'important');
              button.style.setProperty('font-size', '10px', 'important');
              button.style.setProperty('height', 'auto', 'important');
              button.style.setProperty('max-height', Math.max(h - 4, 16) + 'px', 'important');
            }
          });
        } else {
          // Normal row - restore normal button sizing (including action buttons this time)
          buttons.forEach(button => {
            // Always remove any inline styles that might have been applied
            button.style.removeProperty('padding');
            button.style.removeProperty('min-height');
            button.style.removeProperty('line-height');
            button.style.removeProperty('font-size');
            button.style.removeProperty('height');
            button.style.removeProperty('max-height');
            button.style.removeProperty('width');
            button.style.removeProperty('min-width');
            button.style.removeProperty('max-width');
            
            console.log('[applyRowHeights] Restored button styles for row height:', h);
          });
        }
        
        // Constrain cell-wrapper divs
        const wrapper = td.querySelector('.cell-wrapper');
        if (wrapper) {
          wrapper.style.setProperty('overflow', 'visible', 'important');
        }
        
        // Remove rows attribute from textareas
        const textarea = td.querySelector('textarea');
        if (textarea) {
          textarea.removeAttribute('rows');
        }
      });
      } // Close the else block for forceRowHeight check
    } else {
      tr.style.height = '';
      tr.style.minHeight = '';
      tr.style.maxHeight = '';
      tr.style.overflow = '';
      
      const cells = tr.querySelectorAll('td');
      cells.forEach(td => {
        td.style.overflow = '';
        td.style.height = '';
        td.style.maxHeight = '';
        td.style.removeProperty('padding');
        td.style.removeProperty('line-height');
        td.style.removeProperty('font-size'); // Clean up in case it was set
        
        const wrapper = td.querySelector('.cell-wrapper');
        if (wrapper) {
          wrapper.style.removeProperty('overflow');
        }
        
        const input = td.querySelector('input, textarea, select');
        if (input) {
          input.style.removeProperty('padding');
          input.style.removeProperty('line-height');
          input.style.removeProperty('font-size'); // Clean up in case it was set
          input.style.removeProperty('box-sizing');
          // Restore rows attribute for textareas
          if (input.tagName === 'TEXTAREA' && !input.hasAttribute('rows')) {
            input.setAttribute('rows', '2');
          }
        }
      });
    }
  });
}

// Expose to window so it can be called from event handlers
window.applyRowHeights = applyRowHeights;

// Add row resize grips to all rows
function addRowResizeGrips(){
  const tbody = document.getElementById('tbody');
  if(!tbody) return;
  
  // Remove existing grips
  tbody.querySelectorAll('.row-resize-grip').forEach(g => g.remove());
  
  const rows = tbody.querySelectorAll('tr[data-id]');
  
  rows.forEach(tr => {
    const id = tr.dataset.id;
    if(!id) return;
    
    const grip = document.createElement('span');
    grip.className = 'row-resize-grip';
    
    // Append to the first TD to keep it in flow
    const firstTd = tr.querySelector('td');
    if(!firstTd) return;
    
    // Make sure the TD is positioned relatively
    if(getComputedStyle(firstTd).position === 'static'){
      firstTd.style.position = 'relative';
    }
    
    firstTd.appendChild(grip);
    
    let startY = 0, startH = 0, targetH = 0, isResizing = false;
    let tooltip = null;
    
    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startY = e.clientY;
      startH = tr.offsetHeight;
      targetH = startH;
      
      // Check if this row is in a multi-selection
      const rowsToResize = (window.selectedRows && window.selectedRows.has(tr) && window.selectedRows.size > 1) 
        ? Array.from(window.selectedRows) 
        : [tr];
      
      // Create tooltip
      tooltip = document.createElement('div');
      tooltip.className = 'resize-dimension-tooltip';
      tooltip.textContent = startH + 'px' + (rowsToResize.length > 1 ? ` (${rowsToResize.length} rows)` : '');
      document.body.appendChild(tooltip);
      
      const onMove = (ev) => {
        if(!isResizing) return;
        ev.preventDefault();
        
        const dy = ev.clientY - startY;
        const minH = 4; // Minimum row height - very small
        const newH = Math.max(minH, startH + dy);
        targetH = newH; // Track the target height
        
        // Update all rows in selection
        rowsToResize.forEach(rowToResize => {
          // Update row height with overflow clipping
          rowToResize.style.setProperty('height', newH + 'px', 'important');
          rowToResize.style.setProperty('min-height', newH + 'px', 'important');
          rowToResize.style.setProperty('max-height', newH + 'px', 'important');
          rowToResize.style.setProperty('overflow', 'hidden', 'important'); // Clip content
        
          // Also clip cells
          const cells = rowToResize.querySelectorAll('td');
        cells.forEach(td => {
          // Actions cell needs visible overflow so buttons aren't clipped
          if (td.classList.contains('actions')) {
            td.style.setProperty('overflow', 'visible', 'important');
          } else {
            td.style.setProperty('overflow', 'hidden', 'important'); // Clip content
          }
          
          td.style.setProperty('height', newH + 'px', 'important');
          td.style.setProperty('min-height', newH + 'px', 'important');
          td.style.setProperty('max-height', newH + 'px', 'important');
          
          // Skip action buttons - they maintain their CSS-defined size
          
          // Constrain cell-wrapper divs
          const wrapper = td.querySelector('.cell-wrapper');
          if (wrapper) {
            wrapper.style.setProperty('overflow', 'visible', 'important');
          }
        });
        }); // Close rowsToResize.forEach
        
        // Update tooltip with actual rendered height (not target)
        if(tooltip){
          const actualHeight = rowsToResize[0].offsetHeight;
          tooltip.textContent = Math.round(actualHeight) + 'px' + (rowsToResize.length > 1 ? ` (${rowsToResize.length} rows)` : '');
          tooltip.style.left = (ev.clientX + 10) + 'px';
          tooltip.style.top = (ev.clientY + 10) + 'px';
        }
      };
      
      const onUp = () => {
        if(!isResizing) return;
        isResizing = false;
        
        // Save the target height for all resized rows
        const heights = getRowH();
        rowsToResize.forEach(rowToResize => {
          const rowId = rowToResize.dataset.id;
          if (rowId) {
            heights[rowId] = targetH;
          }
        });
        setRowH(heights);
        
        // Remove tooltip
        if(tooltip){
          tooltip.remove();
          tooltip = null;
        }
        
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        
        persist();
      };
      
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    
    grip.addEventListener('mousedown', onDown);
  });
  
  // Add resize grip to header row
  const thead = document.querySelector('thead');
  const headerRow = document.getElementById('headerRow');
  console.log('[Header Resize Setup] thead:', !!thead, 'headerRow:', !!headerRow);
  if (thead && headerRow) {
    // Remove existing header grip
    thead.querySelectorAll('.row-resize-grip').forEach(g => {
      console.log('[Header Resize Setup] Removing old grip:', g);
      g.remove();
    });
    
    const headerGrip = document.createElement('span');
    headerGrip.className = 'row-resize-grip';
    headerGrip.dataset.gripId = 'grip_' + Date.now(); // Unique ID
    
    const firstTh = headerRow.querySelector('th');
    console.log('[Header Resize Setup] firstTh:', firstTh, 'headerRow height:', headerRow.offsetHeight);
    if (firstTh) {
      if (getComputedStyle(firstTh).position === 'static') {
        firstTh.style.position = 'relative';
      }
      firstTh.appendChild(headerGrip);
      console.log('[Header Resize Setup] Grip added. Dimensions:', headerGrip.offsetWidth, 'x', headerGrip.offsetHeight, 'ID:', headerGrip.dataset.gripId);
      console.log('[Header Resize Setup] Grip computed style:', getComputedStyle(headerGrip).position, getComputedStyle(headerGrip).bottom, getComputedStyle(headerGrip).height);
      
      // Handlers are attached via delegation in setupHeaderResizeHandler() - see below
    }
  }
}





    function getPalette(){const s=readState(); return Array.isArray(s.palette)&&s.palette.length?s.palette:DEFAULT_PALETTE.slice();}
    function setPalette(p){const s=readState(); writeState({...s, palette:[...new Set(p)]}); renderPalette();}
    function getCols(){const s=readState(); if(Array.isArray(s.cols)) return s.cols; return DEFAULT_CUSTOM_COLS.slice();}
    function setCols(cols){
      // DATA ONLY - no automatic rebuilds
      // Callers must explicitly rebuild if needed
      const s=readState(); 
      writeState({...s, cols});
    }
    
    // Column order management - controls position of ALL columns (built-in + custom)
    function getColumnOrder() {
      try {
        const s = readState();
        if (Array.isArray(s.columnOrder) && s.columnOrder.length > 0) return s.columnOrder;
      } catch(e) {
        console.warn('Error reading columnOrder:', e);
      }
      
      // Default order: drag, idx, built-ins, custom keys, actions
      try {
        const defaultOrder = ['drag', 'idx', 'start', 'end', 'duration', 'type', 'title'];
        const customKeys = getCols().map(c => c.key);
        return [...defaultOrder, ...customKeys, 'actions'];
      } catch(e) {
        console.error('Error generating default column order:', e);
        return ['drag', 'idx', 'start', 'end', 'duration', 'type', 'title', 'actions'];
      }
    }
    
    // Physically reorder columns in the DOM without destroying/recreating
    function reorderColumnsInDOM(order) {
      console.log('[reorderColumnsInDOM] Reordering columns to:', order);
      
      const table = document.getElementById('scheduleTable');
      if (!table) {
        console.warn('[reorderColumnsInDOM] Table not found');
        return;
      }
      
      const colgroup = table.querySelector('colgroup');
      const thead = table.querySelector('thead tr');
      const tbody = table.querySelector('tbody');
      
      if (!colgroup || !thead || !tbody) {
        console.warn('[reorderColumnsInDOM] Missing table elements');
        return;
      }
      
      // Reorder colgroup
      const cols = Array.from(colgroup.querySelectorAll('col'));
      const colMap = new Map();
      cols.forEach(col => colMap.set(col.dataset.key, col));
      
      colgroup.innerHTML = '';
      order.forEach(key => {
        const col = colMap.get(key);
        if (col) colgroup.appendChild(col);
      });
      
      // Reorder thead
      const ths = Array.from(thead.querySelectorAll('th'));
      const thMap = new Map();
      ths.forEach(th => thMap.set(th.dataset.key, th));
      
      thead.innerHTML = '';
      order.forEach(key => {
        const th = thMap.get(key);
        if (th) thead.appendChild(th);
      });
      
      // Reorder all tbody rows
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach(row => {
        const tds = Array.from(row.querySelectorAll('td[data-key]'));
        const tdMap = new Map();
        tds.forEach(td => tdMap.set(td.dataset.key, td));
        
        // Remove all TDs
        tds.forEach(td => td.remove());
        
        // Re-append in order
        order.forEach(key => {
          const td = tdMap.get(key);
          if (td) row.appendChild(td);
        });
      });
      
      console.log('[reorderColumnsInDOM] Reorder complete');
    }
    
    function setColumnOrder(order) {
      try {
        console.log('[setColumnOrder] Setting order:', order);
        const s = readState();
        writeState({...s, columnOrder: order});
        
        // Use DOM manipulation instead of full rebuild
        reorderColumnsInDOM(order);
        
        // Update column manager to reflect new order
        renderColManager();
      } catch(e) {
        console.error('[setColumnOrder] Error:', e);
      }
    }
    
    // Lightweight version for simple reordering (no row data extraction)
    function updateColumnOrder(order) {
      try {
        const s = readState();
        writeState({...s, columnOrder: order});
        rebuildHeaders();
      } catch(e) {
        console.error('Error updating column order:', e);
      }
    }
    
    // Get all columns sorted by order
    function getAllColumnsSorted() {
      try {
        const order = getColumnOrder();
        const allCols = [...FIXED_LEFT, ...getCols(), ...FIXED_RIGHT];
        
        // Sort by order array
        return allCols.sort((a, b) => {
          const aIndex = order.indexOf(a.key);
          const bIndex = order.indexOf(b.key);
          if (aIndex === -1) return 1; // Unknown columns go to end
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      } catch(e) {
        console.error('Error sorting columns:', e);
        // Fallback to unsorted
        return [...FIXED_LEFT, ...getCols(), ...FIXED_RIGHT];
      }
    }
    function getPrint(){const s=readState(); return s.print||{useDesigner:false, showMeta:true, compact:false, gridLines:true, breakSubs:false, mediaSize:'m', mediaMax:0, appendGallery:false, galleryCols:4, gallerySize:'m'};}
    function setPrint(p){const s=readState(); writeState({...s, print:p}); applyPrintUiFromState();}
    
    // Column format management
    function getColAlignments(){
      const s=readState();
      return s.colAlignments || {};
    }
    
    function setColAlignment(colKey, alignment){
      const s=readState();
      const alignments={...getColAlignments(), [colKey]:alignment};
      writeState({...s, colAlignments:alignments});
    }
    
    function getColAlignment(colKey){
      const alignments=getColAlignments();
      return alignments[colKey] || '';
    }
    
    function getColFormats(){
      const s=readState();
      return s.colFormats || {};
    }
    
    function setColFormat(key, format){
      console.log('[setColFormat] Setting format for column:', key, format);
      const s=readState(); 
      const formats={...getColFormats(), [key]:format}; 
      console.log('[setColFormat] All formats:', formats);
      writeState({...s, colFormats:formats}); 
      applyColumnFormats(); 
      persist();
    }
    function clearColFormat(key){const s=readState(); const formats={...getColFormats()}; delete formats[key]; writeState({...s, colFormats:formats}); applyColumnFormats(); persist();}
    
    // Expose formatting functions for FormatDesigner module
    window.setColFormat = setColFormat;
    window.clearColFormat = clearColFormat;
    window.getColAlignment = getColAlignment;
    window.applyCellFormat = applyFormatting; // applyFormatting is defined later
    window.clearCellFormat = function(cell) {
      // Clear dataset
      cell.dataset.fontFamily = '';
      cell.dataset.fontSize = '';
      cell.dataset.bold = '';
      cell.dataset.italic = '';
      cell.dataset.underline = '';
      cell.dataset.align = '';
      cell.dataset.valign = '';
      cell.dataset.cellFg = '';
      cell.dataset.cellBg = '';
      
      // Clear TD styles
      cell.style.removeProperty('background-color');
      cell.style.removeProperty('color');
      cell.style.removeProperty('vertical-align');
      
      // Clear input styles
      const input = cell.querySelector('textarea, input, select');
      if (input) {
        input.style.removeProperty('font-family');
        input.style.removeProperty('font-size');
        input.style.removeProperty('font-weight');
        input.style.removeProperty('font-style');
        input.style.removeProperty('text-decoration');
        input.style.removeProperty('text-align');
        input.style.removeProperty('color');
        input.style.removeProperty('background-color');
      }
    };


    // IndexedDB
    function openVault(){
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        return Promise.reject(new Error('IndexedDB not available'));
      }
      return new Promise((resolve,reject)=>{
        try {
          const req=indexedDB.open(VAULT_DB,1);
          req.onupgradeneeded=e=>{const db=e.target.result; if(!db.objectStoreNames.contains('files')){const s=db.createObjectStore('files',{keyPath:'id',autoIncrement:true}); s.createIndex('created','created',{unique:false});}};
          req.onsuccess=()=>{vaultDb=req.result; resolve(vaultDb)}; 
          req.onerror=()=>reject(req.error);
        } catch(e) {
          reject(e);
        }
      });
    }
    async function vaultPut(file) {
      console.log('[vaultPut] Starting upload:', file.name, file.type);
      
      // Compress images before storing
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImage(file, 0.7, 1200); // 70% quality, max 1200px
          console.log('[vaultPut] Image compressed');
        } catch (e) {
          console.warn('[vaultPut] Image compression failed, using original:', e);
        }
      }
      
      // Store in local IndexedDB
      const db = vaultDb || await openVault();
      const localId = await new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const st = tx.objectStore('files');
        const obj = {name: file.name, type: file.type, data: file, created: Date.now()};
        const r = st.add(obj);
        r.onsuccess = () => {
          console.log('[vaultPut] Stored in IndexedDB with ID:', r.result);
          resolve(r.result);
        };
        r.onerror = () => {
          console.error('[vaultPut] IndexedDB error:', r.error);
          reject(r.error);
        };
      });
      
      // ALSO upload to Supabase if authenticated
      if (window.SupabaseAPI?.auth?.isAuthenticated()) {
        try {
          console.log('[vaultPut] Uploading to Supabase:', file.name);
          const result = await window.SupabaseAPI.storage.uploadImage(file, 'schedules/');
          if (result.success) {
            console.log('[vaultPut] Uploaded to Supabase:', result.url);
          } else {
            console.warn('[vaultPut] Supabase upload failed:', result.error);
          }
        } catch (err) {
          console.error('[vaultPut] Supabase upload error:', err);
          // Continue with local ID even if cloud upload fails
        }
      }
      
      console.log('[vaultPut] Returning ID:', localId);
      return localId;
    }
    
    // Make vault functions globally accessible for tag system
    window.vaultPut = vaultPut;
    
    async function compressImage(file, quality = 0.7, maxSize = 1200) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Scale down if too large
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                reject(new Error('Compression failed'));
              }
            }, 'image/jpeg', quality);
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    async function vaultGet(id){const db=vaultDb||await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readonly');const st=tx.objectStore('files');const r=st.get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    
    // Make vaultGet globally accessible for tag system  
    window.vaultGet = vaultGet;


    // Meta line
    function formatMetaLine(){
      const title=metaTitle?.value?.trim?.()||''; const x=metaX?.value?.trim?.()||'', y=metaY?.value?.trim?.()||''; const date=metaDate?.value||'';
      const bits=[]; if(title) bits.push(title); if(x&&y) bits.push(`Day ${x} of ${y}`);
      if(date){ const d=new Date(`${date}T00:00:00`); const dow=d.toLocaleDateString(undefined,{weekday:'long'}); const fmt=d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); metaDow && (metaDow.value=dow); bits.push(`${dow} ${fmt}`); } else { metaDow && (metaDow.value=''); }
      metaDisplay && (metaDisplay.textContent = bits.length? bits.join(' — ') : '—');
      // Store title separately for print
      metaDisplay && metaDisplay.setAttribute('data-title-only', title || '—');
    }

    // Palette UI
    function renderPalette(){
      if(!palChips) return;
      palChips.innerHTML='';
      getPalette().forEach(hex=>{
        const chip=document.createElement('button'); chip.className='chip'; chip.style.background=hex; chip.title=hex;
        chip.addEventListener('click', ()=>{
          const sel=document.activeElement?.closest?.('tr.row'); if(!sel){ alert('Click into a row first.'); return; }
          applyRowBg(sel, hex, sel.dataset.type==='SUB', sel.classList.contains('subchild'));
          persist();
        });
        chip.addEventListener('contextmenu', e=>{ e.preventDefault(); const p=getPalette().filter(c=>c.toLowerCase()!==hex.toLowerCase()); setPalette(p); });
        palChips.appendChild(chip);
      });
    }
    palAdd && palAdd.addEventListener('input', ()=>{ const hex=palAdd.value; if(!hex) return; const p=getPalette(); p.push(hex); setPalette(p); });
    palReset && palReset.addEventListener('click', ()=> setPalette(DEFAULT_PALETTE.slice()));
    palSave && palSave.addEventListener('click', ()=>{ const s=readState(); writeState({...s, palette:getPalette()}); alert('Palette saved.'); });

    // Column Manager
    function renderColManager(){
      try {
        if(!colList) return;
        colList.innerHTML='';
        
        // Get current states
        const colVisState = JSON.parse(localStorage.getItem('columnVisibility') || '{}');
        const printColumns = JSON.parse(localStorage.getItem('printColumns') || '[]');
        const printSet = new Set(printColumns);
        const columnOrder = getColumnOrder();
        const allCols = getAllColumnsSorted();
        
        // Render all columns in order (except drag/actions which stay fixed)
        allCols.forEach((c, displayIdx) => {
        if(c.key === 'drag' || c.key === 'actions') return; // Skip fixed columns
        
        const row = document.createElement('tr');
        const align = getColAlignment(c.key) || (c.fixed ? 'center' : 'left');
        const isVisible = c.fixed ? (colVisState[c.key] !== false) : (c.show !== false);
        const isPrintable = printSet.size === 0 || printSet.has(c.key);
        const isBuiltIn = c.fixed;
        const isSeparator = c.type === 'separator';
        
        // Find actual position in columnOrder for reordering
        const orderIdx = columnOrder.indexOf(c.key);
        const canMoveUp = orderIdx > 1; // Can't move past drag or idx
        const canMoveDown = orderIdx < columnOrder.length - 2; // Can't move past actions
        
        console.log(`${c.key}: orderIdx=${orderIdx}, canMoveUp=${canMoveUp}, canMoveDown=${canMoveDown}, orderLength=${columnOrder.length}`);
        
        row.innerHTML = `
          <td>
            ${isSeparator ? `<input class="colLabel" value="${(c.label||'').replace(/"/g,'&quot;')}" data-key="${c.key}" placeholder="Label" />` : `<input class="colLabel" value="${(c.label||'').replace(/"/g,'&quot;')}" data-key="${c.key}" ${isBuiltIn?'readonly':''} />`}
          </td>
          <td>
            ${isBuiltIn ? 
              '<span style="font-size:11px;color:var(--muted);text-transform:uppercase;">Built-in</span>' :
              `<select class="colType" data-key="${c.key}">
                <option value="text"${c.type==='text'?' selected':''}>TEXT</option>
                <option value="upload"${c.type==='upload'?' selected':''}>MEDIA</option>
                <option value="tags"${c.type==='tags'?' selected':''}>TAGS</option>
                <option value="separator"${c.type==='separator'?' selected':''}>SEPARATOR</option>
              </select>`
            }
          </td>
          <td><input type="checkbox" class="colShow" data-key="${c.key}"${isVisible?' checked':''} /></td>
          <td><input type="checkbox" class="colPrint" data-key="${c.key}"${isPrintable?' checked':''} /></td>
          <td>
            <div class="col-controls" style="display:flex;gap:4px;align-items:center;">
              ${isSeparator ? `<input type="text" class="colSepChar" data-key="${c.key}" value="${c.separatorChar||'—'}" placeholder="—" style="width:30px;text-align:center;padding:2px;" maxlength="3" />` : `<span style="width:30px;display:inline-block;"></span>`}
              <button class="ghost colMoveUp" data-key="${c.key}" title="Move up"${!canMoveUp?' disabled':''} style="padding:2px 6px;font-size:12px;">↑</button>
              <button class="ghost colMoveDown" data-key="${c.key}" title="Move down"${!canMoveDown?' disabled':''} style="padding:2px 6px;font-size:12px;">↓</button>
              ${!isBuiltIn ? `<button class="ghost colDel" data-key="${c.key}" title="Remove" style="padding:2px 6px;font-size:12px;">✕</button>` : `<span style="width:26px;display:inline-block;"></span>`}
            </div>
          </td>
        `;
        
        // Event listeners
        const label = row.querySelector('.colLabel');
        const typeSel = row.querySelector('.colType');
        const showChk = row.querySelector('.colShow');
        const printChk = row.querySelector('.colPrint');
        const moveUp = row.querySelector('.colMoveUp');
        const moveDown = row.querySelector('.colMoveDown');
        const del = row.querySelector('.colDel');
        const sepChar = row.querySelector('.colSepChar');
        
        console.log(`Column ${c.key}: moveUp=${!!moveUp}, moveDown=${!!moveDown}, del=${!!del}`);
        
        // Test if buttons are clickable at all
        if(moveUp) {
          console.log('moveUp button HTML:', moveUp.outerHTML.substring(0, 100));
          console.log('moveUp disabled?', moveUp.disabled);
        }
        
        // Label editing
        if(label && !isBuiltIn) {
          let labelTimeout;
          label.addEventListener('input', () => { 
            clearTimeout(labelTimeout);
            labelTimeout = setTimeout(() => {
              const cols = getCols();
              const colToUpdate = cols.find(col => col.key === c.key);
              if(colToUpdate) {
                colToUpdate.label = label.value;
                setCols(cols);
                // Update just the header, don't rebuild everything
                const th = theadRow.querySelector(`th[data-key="${c.key}"]`);
                if (th) {
                  const labelSpan = th.querySelector('span');
                  if (labelSpan) labelSpan.textContent = label.value;
                }
                persist && persist();
              }
            }, 2000);
          });
          
          label.addEventListener('blur', () => { 
            clearTimeout(labelTimeout);
            const cols = getCols();
            const colToUpdate = cols.find(col => col.key === c.key);
            if(colToUpdate) {
              colToUpdate.label = label.value;
              setCols(cols);
              // Update just the header, don't rebuild everything
              const th = theadRow.querySelector(`th[data-key="${c.key}"]`);
              if (th) {
                const labelSpan = th.querySelector('span');
                if (labelSpan) labelSpan.textContent = label.value;
              }
              persist && persist();
            }
          });
        }
        
        // Type change
        typeSel && typeSel.addEventListener('change', () => { 
          const cols = getCols();
          const colToUpdate = cols.find(col => col.key === c.key);
          if(colToUpdate) {
            const oldType = colToUpdate.type;
            const newType = typeSel.value;
            colToUpdate.type = newType;
            
            // Save the updated column type
            setCols(cols);
            
            // Clear data if changing TO separator
            if(newType === 'separator') {
              const s = readState();
              if(s.rows) {
                s.rows.forEach(row => {
                  if(row.custom && row.custom[c.key]) {
                    delete row.custom[c.key];
                  }
                  // Also clear from children if it's a SUB
                  if(row.children) {
                    row.children.forEach(child => {
                      if(child.custom && child.custom[c.key]) {
                        delete child.custom[c.key];
                      }
                    });
                  }
                });
                writeState(s);
              }
            }
            
            // Type changes require full rebuild to re-render cells
            rebuildUI();
            persist && persist();
          }
        });
        
        // Visibility
        showChk && showChk.addEventListener('change', () => { 
          if(isBuiltIn) {
            colVisState[c.key] = showChk.checked;
            localStorage.setItem('columnVisibility', JSON.stringify(colVisState));
            applySavedColumnVisibility();
          } else {
            const cols = getCols();
            const colToUpdate = cols.find(col => col.key === c.key);
            if(colToUpdate) {
              colToUpdate.show = showChk.checked;
              setCols(cols);
              // Apply visibility directly without full rebuild
              applySavedColumnVisibility();
              recalculateTableWidth();
              persist && persist();
            }
          }
        });
        
        // Print
        printChk && printChk.addEventListener('change', () => {
          updatePrintColumns();
        });
        
        moveUp && moveUp.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const newOrder = [...getColumnOrder()];
          const currentIdx = newOrder.indexOf(c.key);
          if(currentIdx > 1) {
            [newOrder[currentIdx-1], newOrder[currentIdx]] = [newOrder[currentIdx], newOrder[currentIdx-1]];
            setColumnOrder(newOrder);
            persist && persist();
          }
        });
        
        moveDown && moveDown.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const newOrder = [...getColumnOrder()];
          const currentIdx = newOrder.indexOf(c.key);
          if(currentIdx < newOrder.length - 2) {
            [newOrder[currentIdx], newOrder[currentIdx+1]] = [newOrder[currentIdx+1], newOrder[currentIdx]];
            setColumnOrder(newOrder);
            persist && persist();
          }
        });
        
        // Delete
        del && del.addEventListener('click', (e) => {
          console.log('delete clicked!', c.key);
          e.preventDefault();
          e.stopPropagation();
          if(confirm(`Delete column "${c.label}"? This will remove all data in this column.`)) {
            const cols = getCols();
            const idx = cols.findIndex(col => col.key === c.key);
            if(idx !== -1) {
              cols.splice(idx, 1); 
              setCols(cols);
              
              // Remove from columnOrder
              const newOrder = columnOrder.filter(k => k !== c.key);
              const s = readState();
              writeState({...s, columnOrder: newOrder});
              
              // Delete requires full rebuild to remove cells
              rebuildUI();
              renderColManager();
              persist && persist();
            }
          }
        });
        
        // Separator character
        sepChar && sepChar.addEventListener('input', () => {
          const cols = getCols();
          const colToUpdate = cols.find(col => col.key === c.key);
          if(colToUpdate) {
            colToUpdate.separatorChar = sepChar.value;
            setCols(cols);
            
            // Update separator cells with new character
            const sepTds = document.querySelectorAll(`td[data-key="${c.key}"][data-type="separator"]`);
            sepTds.forEach(td => {
              const rowType = td.closest('tr')?.dataset?.type;
              if (rowType !== 'CALL TIME' && rowType !== 'SUB') {
                td.textContent = sepChar.value || '—';
              }
            });
            
            persist && persist();
          }
        });
        
        // Drag and drop functionality
        row.draggable = true;
        row.dataset.colKey = c.key;
        row.style.cursor = 'move';
        
        row.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', c.key);
          row.style.opacity = '0.4';
        });
        
        row.addEventListener('dragend', (e) => {
          row.style.opacity = '1';
        });
        
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          // Visual feedback
          const tbody = row.parentElement;
          const draggingRow = tbody.querySelector('[style*="opacity: 0.4"]');
          if (draggingRow && draggingRow !== row) {
            const rect = row.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
              row.style.borderTop = '2px solid var(--accent)';
              row.style.borderBottom = '';
            } else {
              row.style.borderBottom = '2px solid var(--accent)';
              row.style.borderTop = '';
            }
          }
        });
        
        row.addEventListener('dragleave', (e) => {
          row.style.borderTop = '';
          row.style.borderBottom = '';
        });
        
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.style.borderTop = '';
          row.style.borderBottom = '';
          
          const draggedKey = e.dataTransfer.getData('text/plain');
          const targetKey = c.key;
          
          if (draggedKey === targetKey) return;
          
          // Calculate drop position
          const rect = row.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const dropBefore = e.clientY < midpoint;
          
          // Reorder columns
          const newOrder = [...columnOrder];
          const draggedIdx = newOrder.indexOf(draggedKey);
          const targetIdx = newOrder.indexOf(targetKey);
          
          // Remove dragged item
          newOrder.splice(draggedIdx, 1);
          
          // Insert at new position
          let insertIdx = targetIdx;
          if (draggedIdx < targetIdx && !dropBefore) {
            insertIdx = targetIdx; // Insert after
          } else if (draggedIdx < targetIdx && dropBefore) {
            insertIdx = targetIdx - 1; // Insert before
          } else if (draggedIdx > targetIdx && dropBefore) {
            insertIdx = targetIdx; // Insert before
          } else {
            insertIdx = targetIdx + 1; // Insert after
          }
          
          // Enforce boundaries (can't move past drag/idx at start or actions at end)
          insertIdx = Math.max(2, Math.min(insertIdx, newOrder.length - 1));
          
          newOrder.splice(insertIdx, 0, draggedKey);
          
          setColumnOrder(newOrder); // This calls rebuildUI which calls renderColManager
          persist && persist();
        });
        
        
        colList.appendChild(row);
      });
      } catch(e) {
        console.error('Error in renderColManager:', e);
        // Try to show something basic so the page isn't completely broken
        if(colList) {
          colList.innerHTML = '<tr><td colspan="6" style="color:red;padding:12px;">Error loading column manager. Check console.</td></tr>';
        }
      }
    }
    
    // Helper function to update print columns from current checkbox state
    function updatePrintColumns() {
      const checkboxes = document.querySelectorAll('.col-table .colPrint:checked');
      const selected = Array.from(checkboxes).map(cb => cb.dataset.key);
      localStorage.setItem('printColumns', JSON.stringify(selected));
      window.selectedPrintColumns = selected;
    }
    
    // Initialize print columns on first render if not already set
    function initializePrintColumns() {
      let saved = localStorage.getItem('printColumns');
      
      // Clean up any existing printColumns that include 'dash'
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.includes('dash')) {
            console.warn('Removing "dash" from saved printColumns');
            const cleaned = parsed.filter(k => k !== 'dash');
            localStorage.setItem('printColumns', JSON.stringify(cleaned));
            saved = localStorage.getItem('printColumns');
          }
        } catch (e) {
          console.warn('Failed to parse printColumns, resetting');
          saved = null;
        }
      }
      
      if (!saved) {
        // First time - save all columns as default (exclude drag, actions, and separator columns)
        const allCols = getAllColumnsSorted()
          .filter(c => c.key !== 'drag' && c.key !== 'actions' && c.type !== 'separator')
          .map(c => c.key);
        localStorage.setItem('printColumns', JSON.stringify(allCols));
        console.log('Initialized print columns with:', allCols);
      }
    }
    
    colAdd && colAdd.addEventListener('click', ()=>{ 
      const cols=getCols(); 
      const newKey = 'c_'+cid().slice(2);
      cols.push({id:cid(), key:newKey, label:'Custom', type:'text', show:true, print:true}); 
      
      // Add to columnOrder BEFORE calling setCols
      const order = getColumnOrder();
      const actionsIdx = order.indexOf('actions');
      if(actionsIdx !== -1) {
        order.splice(actionsIdx, 0, newKey);
      } else {
        order.push(newKey);
      }
      
      // Save both at once without triggering rebuilds yet
      const s = readState();
      writeState({...s, cols, columnOrder: order});
      
      // Now rebuild everything once
      rebuildUI();
      
      persist && persist(); 
    });
    colReset && colReset.addEventListener('click', ()=> {
      setCols(DEFAULT_CUSTOM_COLS.slice());
      // Reset requires full rebuild since columns change
      rebuildUI();
    });

    // Popovers
    let anyPopoverDragging = false; // Global flag for legacy popover support
    
    function closeAllPopovers(){ 
      // Don't close while dragging either designer
      if (anyPopoverDragging || BorderDesigner.isDragging() || FormatDesigner.isDragging()) return;
      qsa('.popover.is-open').forEach(p => {
        p.classList.remove('is-open');
      }); 
    }
    document.addEventListener('click', (e)=>{ 
      // Don't close while dragging either designer
      if (anyPopoverDragging || BorderDesigner.isDragging() || FormatDesigner.isDragging()) return;
      if(!e.target.closest('.popover') && !e.target.closest('[data-popover-trigger]')) closeAllPopovers(); 
    });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAllPopovers(); });

    // Apply column formats to all cells
    function applyColumnAlignments(){
      const alignments = getColAlignments();
      const allCols = getAllColumnsSorted();
      
      allCols.forEach(col => {
        const align = alignments[col.key];
        if(!align) return;
        
        const cells = document.querySelectorAll(`td[data-key="${col.key}"]`);
        cells.forEach(cell => {
          cell.style.setProperty('text-align', align);
        });
      });
    }
    
    function applyColumnFormats(){
      const formats = getColFormats();
      console.log('[applyColumnFormats] Applying alignment formats:', formats);
      const tbody = document.getElementById('tbody');
      if(!tbody) {
        console.log('[applyColumnFormats] No tbody found!');
        return;
      }
      
      // Skip formatting for time-related columns
      const skipColumns = ['start', 'end', 'idx', 'drag'];
      
      // Clean up any formats that might exist for protected columns
      skipColumns.forEach(col => {
        if (formats[col]) {
          console.log('[applyColumnFormats] Removing format from protected column:', col);
          delete formats[col];
          const s = readState();
          s.colFormats = formats;
          writeState(s);
        }
      });
      
      Object.keys(formats).forEach(colKey => {
        // Skip time columns (double-check)
        if (skipColumns.includes(colKey)) {
          console.log('[applyColumnFormats] Skipping protected column:', colKey);
          return;
        }
        
        const format = formats[colKey];
        const cells = tbody.querySelectorAll(`td[data-key="${colKey}"]`);
        console.log('[applyColumnFormats] Column', colKey, '- Found', cells.length, 'cells');
        
        cells.forEach(cell => {
          // ONLY apply alignment - NO colors, NO text formatting
          if(format && format.align) {
            console.log('[applyColumnFormats] Applying alignment', format.align, 'to cell');
            
            // Apply alignment to cell (no !important - last applied wins)
            cell.style.setProperty('--col-align', format.align);
            cell.style.setProperty('text-align', format.align);
            
            // Apply alignment to all inputs/textareas/selects/contenteditable in cell
            const inputs = cell.querySelectorAll('input:not([type="color"]), textarea, select, [contenteditable]');
            console.log('[applyColumnFormats] Found', inputs.length, 'inputs in cell');
            inputs.forEach((input) => {
              input.style.setProperty('text-align', format.align);
            });
          }
        });
      });
    }

    // Compact formatting popover
    function buildCompactFormatPopover(triggerBtn, targetElement, formatType='column'){
      // Close all existing popovers first
      document.querySelectorAll('.format-popover.is-open').forEach(p => p.classList.remove('is-open'));
      
      const getKey = () => formatType === 'column' ? targetElement.dataset.key : null;
      const getCurrentFormat = () => {
        if(formatType === 'column'){
          const formats = getColFormats();
          return formats[getKey()] || {};
        } else if(formatType === 'cell'){
          // For cells (TD elements), read from TD dataset
          return {
            fontFamily: targetElement.dataset.fontFamily || '',
            fontSize: targetElement.dataset.fontSize || '',
            bold: targetElement.dataset.bold === 'true',
            italic: targetElement.dataset.italic === 'true',
            underline: targetElement.dataset.underline === 'true',
            align: targetElement.dataset.align || '',
            valign: targetElement.dataset.valign || '',
            fgColor: targetElement.dataset.cellFg || '',
            bgColor: targetElement.dataset.cellBg || ''
          };
        } else {
          // For rows - read from first selected cell in SelectionManager
          const firstCell = Array.from(SelectionManager.selectedCells)[0];
          if (firstCell) {
            return {
              fontFamily: firstCell.dataset.fontFamily || '',
              fontSize: firstCell.dataset.fontSize || '',
              bold: firstCell.dataset.bold === 'true',
              italic: firstCell.dataset.italic === 'true',
              underline: firstCell.dataset.underline === 'true',
              align: firstCell.dataset.align || '',
              valign: firstCell.dataset.valign || '',
              fgColor: firstCell.dataset.cellFg || '',
              bgColor: firstCell.dataset.cellBg || ''
            };
          }
          return {};
        }
      };
      
      const current = getCurrentFormat();
      const pop = document.createElement('div');
      pop.className = 'format-popover popover compact-format is-open';
      
      // Check if bulk formatting (multiple selected cells)
      const selectedCount = SelectionManager.selectedCells.size;
      const isBulkFormat = selectedCount > 1;
      // Count unique rows for display
      const uniqueRows = new Set();
      SelectionManager.selectedCells.forEach(cell => {
        const row = cell.closest('tr');
        if (row) uniqueRows.add(row);
      });
      const bulkCount = uniqueRows.size;
      const bulkIndicator = isBulkFormat && bulkCount > 1 ? ` <span style="color:var(--primary);font-size:11px;">(${bulkCount} rows)</span>` : '';
      
      // Build different HTML based on formatType
      // For columns: ONLY show alignment (no text formatting, no colors)
      // For rows: show full formatting options
      const popupHTML = formatType === 'column' ? `
        <div class="pop-head">
          <strong style="font-size:12px;color:var(--text);">Column Alignment</strong>
          <button class="ghost pop-close">✕</button>
        </div>
        <div class="compact-format-grid" style="padding:12px;">
          <div class="format-row" style="gap:8px;">
            <button class="fmt-btn fmt-align-left ${current.align === 'left' ? 'active' : ''}" title="Align Left" style="flex:1;padding:8px;">←</button>
            <button class="fmt-btn fmt-align-center ${current.align === 'center' ? 'active' : ''}" title="Align Center" style="flex:1;padding:8px;">↔</button>
            <button class="fmt-btn fmt-align-right ${current.align === 'right' ? 'active' : ''}" title="Align Right" style="flex:1;padding:8px;">→</button>
          </div>
          <div class="format-actions" style="margin-top:8px;gap:8px;">
            <button class="ghost fmt-clear" style="flex:1;">Clear</button>
          </div>
        </div>
      ` : `
        <div class="pop-head">
          <strong style="font-size:9px;color:var(--muted);font-weight:600;letter-spacing:0.5px;">FORMAT${bulkIndicator}</strong>
          <button class="ghost pop-close">✕</button>
        </div>
        <div class="compact-format-grid">
          <div class="format-row">
            <select class="fmt-font" title="Font" style="font-size:10px;padding:3px;flex:1;">
              <option value="" style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">Font</option>
              <option value="Arial, sans-serif" style="font-family:Arial,sans-serif;">Arial</option>
              <option value="'Avenir', 'Century Gothic', sans-serif" style="font-family:'Avenir','Century Gothic',sans-serif;">Avenir</option>
              <option value="'Brush Script MT', cursive" style="font-family:'Brush Script MT',cursive;">Brush Script</option>
              <option value="'Century Gothic', 'AppleGothic', sans-serif" style="font-family:'Century Gothic','AppleGothic',sans-serif;">Century Gothic</option>
              <option value="'Comic Sans MS', cursive" style="font-family:'Comic Sans MS',cursive;">Comic Sans MS</option>
              <option value="'Consolas', 'Monaco', monospace" style="font-family:'Consolas','Monaco',monospace;">Consolas</option>
              <option value="'Courier New', monospace" style="font-family:'Courier New',monospace;">Courier New</option>
              <option value="'Franklin Gothic Medium', sans-serif" style="font-family:'Franklin Gothic Medium',sans-serif;">Franklin Gothic</option>
              <option value="'Futura', 'Trebuchet MS', sans-serif" style="font-family:'Futura','Trebuchet MS',sans-serif;">Futura</option>
              <option value="Garamond, serif" style="font-family:Garamond,serif;">Garamond</option>
              <option value="Georgia, serif" style="font-family:Georgia,serif;">Georgia</option>
              <option value="'Gill Sans', 'Gill Sans MT', sans-serif" style="font-family:'Gill Sans','Gill Sans MT',sans-serif;">Gill Sans</option>
              <option value="'Helvetica Neue', Helvetica, sans-serif" style="font-family:'Helvetica Neue',Helvetica,sans-serif;">Helvetica</option>
              <option value="Impact, sans-serif" style="font-family:Impact,sans-serif;">Impact</option>
              <option value="'Times New Roman', serif" style="font-family:'Times New Roman',serif;">Times New Roman</option>
              <option value="'Trebuchet MS', sans-serif" style="font-family:'Trebuchet MS',sans-serif;">Trebuchet MS</option>
              <option value="Verdana, sans-serif" style="font-family:Verdana,sans-serif;">Verdana</option>
            </select>
            <select class="fmt-size" title="Size" style="font-size:10px;padding:3px;width:50px;">
              <option value="">Size</option>
              <option value="6px">6</option>
              <option value="7px">7</option>
              <option value="8px">8</option>
              <option value="9px">9</option>
              <option value="10px">10</option>
              <option value="11px">11</option>
              <option value="12px">12</option>
              <option value="13px">13</option>
              <option value="14px">14</option>
              <option value="15px">15</option>
              <option value="16px">16</option>
              <option value="17px">17</option>
              <option value="18px">18</option>
              <option value="19px">19</option>
              <option value="20px">20</option>
              <option value="21px">21</option>
              <option value="22px">22</option>
              <option value="24px">24</option>
              <option value="28px">28</option>
              <option value="32px">32</option>
            </select>
          </div>
          <div class="format-row" style="display:flex;gap:6px;align-items:flex-start;">
            <div style="display:grid;grid-template-columns:repeat(3,26px);grid-template-rows:repeat(3,26px);gap:2px;">
              <button class="fmt-btn fmt-bold ${current.bold ? 'active' : ''}" title="Bold" style="font-weight:bold;width:26px;height:26px;padding:0;font-size:10px;">B</button>
              <button class="fmt-btn fmt-italic ${current.italic ? 'active' : ''}" title="Italic" style="font-style:italic;width:26px;height:26px;padding:0;font-size:10px;">I</button>
              <button class="fmt-btn fmt-underline ${current.underline ? 'active' : ''}" title="Underline" style="text-decoration:underline;width:26px;height:26px;padding:0;font-size:10px;">U</button>
              <button class="fmt-btn fmt-align-left ${current.align === 'left' ? 'active' : ''}" title="Left" style="width:26px;height:26px;padding:0;font-size:10px;">⬅</button>
              <button class="fmt-btn fmt-align-center ${current.align === 'center' ? 'active' : ''}" title="Center" style="width:26px;height:26px;padding:0;font-size:10px;">↔</button>
              <button class="fmt-btn fmt-align-right ${current.align === 'right' ? 'active' : ''}" title="Right" style="width:26px;height:26px;padding:0;font-size:10px;">➡</button>
              <button class="fmt-btn fmt-valign-top ${current.valign === 'top' ? 'active' : ''}" title="Top" style="width:26px;height:26px;padding:0;font-size:10px;">⬆</button>
              <button class="fmt-btn fmt-valign-middle ${current.valign === 'middle' ? 'active' : ''}" title="Middle" style="width:26px;height:26px;padding:0;font-size:10px;">↕</button>
              <button class="fmt-btn fmt-valign-bottom ${current.valign === 'bottom' ? 'active' : ''}" title="Bottom" style="width:26px;height:26px;padding:0;font-size:10px;">⬇</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
              <label class="color-label" style="display:flex;align-items:center;gap:4px;font-size:10px;">
                <span style="min-width:26px;">Text</span>
                <input type="color" class="fmt-fg" value="${(current.fgColor && current.fgColor !== 'transparent') ? current.fgColor : '#000000'}" style="flex:1;height:20px;">
              </label>
              <label class="color-label" style="display:flex;align-items:center;gap:4px;font-size:10px;">
                <span style="min-width:26px;">BG</span>
                <input type="color" class="fmt-bg" value="${(current.bgColor && current.bgColor !== 'transparent') ? current.bgColor : '#ffffff'}" style="flex:1;height:20px;">
              </label>
            </div>
          </div>
          <div class="format-actions" style="display:none;">
            <button class="fmt-apply" style="flex:1;">Apply</button>
            <button class="ghost fmt-clear" style="flex:1;">Clear</button>
          </div>
        </div>
      `;
      
      pop.innerHTML = popupHTML;
      
      triggerBtn.after(pop);
      
      // Stop all clicks and mousedown inside popover from bubbling to drag cell (which would trigger row selection)
      pop.addEventListener('click', (e) => e.stopPropagation());
      pop.addEventListener('mousedown', (e) => e.stopPropagation());
      
      // Position popover relative to button using fixed positioning
      const btnRect = triggerBtn.getBoundingClientRect();
      const popupHeight = formatType === 'column' ? 120 : 280;
      
      pop.style.position = 'fixed';
      
      // Position to the left of the button
      const popRect = pop.getBoundingClientRect();
      const popupWidth = popRect.width;
      
      let left = btnRect.left - popupWidth - 50;
      let top = btnRect.bottom + 10;
      
      // Keep within viewport bounds
      left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
      top = Math.max(10, Math.min(top, window.innerHeight - popupHeight - 10));
      
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      
      // Make popup draggable by header
      const popHeader = pop.querySelector('.pop-head');
      if (popHeader) {
        let currentX, currentY, initialX, initialY;
        
        popHeader.addEventListener('mousedown', (e) => {
          // Don't drag if clicking close button
          if (e.target.closest('.pop-close')) return;
          
          anyPopoverDragging = true;
          const rect = pop.getBoundingClientRect();
          initialX = e.clientX - rect.left;
          initialY = e.clientY - rect.top;
          
          e.preventDefault();
          e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
          if (!anyPopoverDragging) return;
          
          e.preventDefault();
          e.stopPropagation();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
          
          // Keep within viewport
          const maxX = window.innerWidth - pop.offsetWidth - 10;
          const maxY = window.innerHeight - pop.offsetHeight - 10;
          
          currentX = Math.max(10, Math.min(currentX, maxX));
          currentY = Math.max(10, Math.min(currentY, maxY));
          
          pop.style.left = currentX + 'px';
          pop.style.top = currentY + 'px';
        });
        
        document.addEventListener('mouseup', (e) => {
          // Small delay before clearing to prevent immediate close (same as Border Designer)
          setTimeout(() => {
            anyPopoverDragging = false;
          }, 10);
        });
      }
      
      // Close button handler (works for both column and row)
      const closeBtn = pop.querySelector('.pop-close');
      if (closeBtn) closeBtn.addEventListener('click', () => pop.remove());
      
      // === COLUMN FORMATTING (ALIGNMENT ONLY) ===
      if (formatType === 'column') {
        const leftBtn = pop.querySelector('.fmt-align-left');
        const centerBtn = pop.querySelector('.fmt-align-center');
        const rightBtn = pop.querySelector('.fmt-align-right');
        const clearBtn = pop.querySelector('.fmt-clear');
        
        const applyAlignment = (align) => {
          // Clear all active states
          leftBtn.classList.remove('active');
          centerBtn.classList.remove('active');
          rightBtn.classList.remove('active');
          
          // Set new active state
          if (align === 'left') leftBtn.classList.add('active');
          if (align === 'center') centerBtn.classList.add('active');
          if (align === 'right') rightBtn.classList.add('active');
          
          // Apply to column
          setColFormat(getKey(), { align });
        };
        
        leftBtn.addEventListener('click', () => applyAlignment('left'));
        centerBtn.addEventListener('click', () => applyAlignment('center'));
        rightBtn.addEventListener('click', () => applyAlignment('right'));
        
        clearBtn.addEventListener('click', () => {
          clearColFormat(getKey());
          pop.remove();
        });
        
        return; // Exit early for column formatting
      }
      
      // === ROW FORMATTING (FULL OPTIONS) ===
      const fontSel = pop.querySelector('.fmt-font');
      const sizeSel = pop.querySelector('.fmt-size');
      if(fontSel) fontSel.value = current.fontFamily || '';
      if(sizeSel) sizeSel.value = current.fontSize || '';
      
      const boldBtn = pop.querySelector('.fmt-bold');
      const italicBtn = pop.querySelector('.fmt-italic');
      const underlineBtn = pop.querySelector('.fmt-underline');
      
      // Function to apply formatting immediately
      const applyFormatNow = () => {
        const fgEl = pop.querySelector('.fmt-fg');
        const bgEl = pop.querySelector('.fmt-bg');
        
        // Get align from active button
        const alignLeftBtn = pop.querySelector('.fmt-align-left');
        const alignCenterBtn = pop.querySelector('.fmt-align-center');
        const alignRightBtn = pop.querySelector('.fmt-align-right');
        let align = 'left';
        if (alignCenterBtn?.classList.contains('active')) align = 'center';
        if (alignRightBtn?.classList.contains('active')) align = 'right';
        
        const format = {
          fontFamily: fontSel?.value || '',
          fontSize: sizeSel?.value || '',
          bold: boldBtn?.classList.contains('active') || false,
          italic: italicBtn?.classList.contains('active') || false,
          underline: underlineBtn?.classList.contains('active') || false,
          align: align,
          fgColor: fgEl ? fgEl.value : '',
          bgColor: bgEl ? bgEl.value : ''
        };
        
        // Apply to all selected cells
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, format);
        });
        
        persist();
      };
      
      // Attach change listeners to apply formatting immediately
      if (boldBtn) boldBtn.addEventListener('click', () => {
        boldBtn.classList.toggle('active');
        const isBold = boldBtn.classList.contains('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { bold: isBold });
        });
        persist();
      });
      
      if (italicBtn) italicBtn.addEventListener('click', () => {
        italicBtn.classList.toggle('active');
        const isItalic = italicBtn.classList.contains('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { italic: isItalic });
        });
        persist();
      });
      
      if (underlineBtn) underlineBtn.addEventListener('click', () => {
        underlineBtn.classList.toggle('active');
        const isUnderline = underlineBtn.classList.contains('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { underline: isUnderline });
        });
        persist();
      });
      
      // Vertical alignment buttons
      const valignTopBtn = pop.querySelector('.fmt-valign-top');
      const valignMiddleBtn = pop.querySelector('.fmt-valign-middle');
      const valignBottomBtn = pop.querySelector('.fmt-valign-bottom');
      
      if (valignTopBtn) valignTopBtn.addEventListener('click', () => {
        // Clear all valign active states
        valignTopBtn.classList.add('active');
        if (valignMiddleBtn) valignMiddleBtn.classList.remove('active');
        if (valignBottomBtn) valignBottomBtn.classList.remove('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { valign: 'top' });
        });
        persist();
      });
      
      if (valignMiddleBtn) valignMiddleBtn.addEventListener('click', () => {
        // Clear all valign active states
        if (valignTopBtn) valignTopBtn.classList.remove('active');
        valignMiddleBtn.classList.add('active');
        if (valignBottomBtn) valignBottomBtn.classList.remove('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { valign: 'middle' });
        });
        persist();
      });
      
      if (valignBottomBtn) valignBottomBtn.addEventListener('click', () => {
        // Clear all valign active states
        if (valignTopBtn) valignTopBtn.classList.remove('active');
        if (valignMiddleBtn) valignMiddleBtn.classList.remove('active');
        valignBottomBtn.classList.add('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { valign: 'bottom' });
        });
        persist();
      });
      
      if (fontSel) fontSel.addEventListener('change', () => {
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { fontFamily: fontSel.value });
        });
        persist();
      });
      
      if (sizeSel) sizeSel.addEventListener('change', () => {
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { fontSize: sizeSel.value });
        });
        persist();
      });
      
      // Horizontal alignment buttons
      const alignLeftBtn = pop.querySelector('.fmt-align-left');
      const alignCenterBtn = pop.querySelector('.fmt-align-center');
      const alignRightBtn = pop.querySelector('.fmt-align-right');
      
      if (alignLeftBtn) alignLeftBtn.addEventListener('click', () => {
        // Clear all align active states
        alignLeftBtn.classList.add('active');
        if (alignCenterBtn) alignCenterBtn.classList.remove('active');
        if (alignRightBtn) alignRightBtn.classList.remove('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { align: 'left' });
        });
        persist();
      });
      
      if (alignCenterBtn) alignCenterBtn.addEventListener('click', () => {
        // Clear all align active states
        if (alignLeftBtn) alignLeftBtn.classList.remove('active');
        alignCenterBtn.classList.add('active');
        if (alignRightBtn) alignRightBtn.classList.remove('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { align: 'center' });
        });
        persist();
      });
      
      if (alignRightBtn) alignRightBtn.addEventListener('click', () => {
        // Clear all align active states
        if (alignLeftBtn) alignLeftBtn.classList.remove('active');
        if (alignCenterBtn) alignCenterBtn.classList.remove('active');
        alignRightBtn.classList.add('active');
        
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          applyFormatting(cell, { align: 'right' });
        });
        persist();
      });
      
      const fgInput = pop.querySelector('.fmt-fg');
      const bgInput = pop.querySelector('.fmt-bg');
      
      // Stop propagation on color inputs so clicks don't bubble to drag cell
      if(fgInput) {
        fgInput.addEventListener('click', (e) => e.stopPropagation());
        fgInput.addEventListener('input', () => {
          const selectedCells = SelectionManager.getSelectedCells();
          selectedCells.forEach(cell => {
            applyFormatting(cell, { fgColor: fgInput.value });
          });
          persist();
        });
      }
      if(bgInput) {
        bgInput.addEventListener('click', (e) => e.stopPropagation());
        bgInput.addEventListener('input', () => {
          const selectedCells = SelectionManager.getSelectedCells();
          selectedCells.forEach(cell => {
            applyFormatting(cell, { bgColor: bgInput.value });
          });
          persist();
        });
      }
      
      const applyBtn = pop.querySelector('.fmt-apply');
      if (applyBtn) applyBtn.addEventListener('click', () => {
        applyFormatNow();
        pop.remove();
      });
      
      const clearBtn = pop.querySelector('.fmt-clear');
      if (clearBtn) clearBtn.addEventListener('click', () => {
        // Clear all selected cells
        const selectedCells = SelectionManager.getSelectedCells();
        selectedCells.forEach(cell => {
          // Clear dataset
          cell.dataset.fontFamily = '';
          cell.dataset.fontSize = '';
          cell.dataset.bold = '';
          cell.dataset.italic = '';
          cell.dataset.underline = '';
          cell.dataset.align = '';
          cell.dataset.valign = '';
          cell.dataset.cellFg = '';
          cell.dataset.cellBg = '';
          
          // Clear TD styles
          cell.style.removeProperty('background-color');
          cell.style.removeProperty('color');
          cell.style.removeProperty('vertical-align');
          
          // Clear input styles
          const input = cell.querySelector('textarea, input, select');
          if (input) {
            input.style.removeProperty('font-family');
            input.style.removeProperty('font-size');
            input.style.removeProperty('font-weight');
            input.style.removeProperty('font-style');
            input.style.removeProperty('text-decoration');
            input.style.removeProperty('text-align');
            input.style.removeProperty('color');
            input.style.removeProperty('background-color');
          }
        });
        
        persist();
        pop.remove();
      });
      
      setTimeout(() => {
        const closeOutside = (e) => {
          if(!pop.contains(e.target) && e.target !== triggerBtn){
            pop.remove();
            document.removeEventListener('click', closeOutside);
          }
        };
        document.addEventListener('click', closeOutside);
      }, 100);
    }

    function buildFormattingPopover(triggerBtn, rowElement, formatType='row'){
      try {
      // formatType: 'row', 'meta', 'cell'
      
      // Get current formatting from row or cell dataset
      const getCurrentFormatting = () => {
        if (formatType === 'cell') {
          // For cells, read from TD dataset
          return {
            fontFamily: rowElement.dataset.fontFamily || '',
            fontSize: rowElement.dataset.fontSize || '',
            bold: rowElement.dataset.bold === 'true',
            italic: rowElement.dataset.italic === 'true',
            underline: rowElement.dataset.underline === 'true',
            align: rowElement.dataset.align || 'left',
            valign: rowElement.dataset.valign || 'top',
            fgColor: rowElement.dataset.cellFg || '',
            bgColor: rowElement.dataset.cellBg || ''
          };
        } else if (formatType === 'column') {
          // For columns, get from colFormats
          const formats = getColFormats();
          return formats[rowElement.dataset.key] || {};
        } else {
          // For rows, use existing logic
          const isSubchild = rowElement.classList.contains('subchild');
          const isSub = rowElement.dataset.type === 'SUB';
          return {
            fontFamily: rowElement.dataset.fontFamily || '',
            fontSize: rowElement.dataset.fontSize || '',
            bold: rowElement.dataset.bold === 'true',
            italic: rowElement.dataset.italic === 'true',
            underline: rowElement.dataset.underline === 'true',
            align: rowElement.dataset.align || 'left',
            valign: rowElement.dataset.valign || 'top',
            fgColor: isSubchild ? (rowElement.dataset.subChildFg || '') : 
                     isSub ? (rowElement.dataset.subFg || '') : 
                     (rowElement.dataset.rowFg || ''),
            bgColor: isSubchild ? (rowElement.dataset.subChildColor || '') : 
                     isSub ? (rowElement.dataset.subColor || '') : 
                     (rowElement.dataset.rowBg || '')
          };
        }
      };
      
      // ALWAYS remove all existing format popups first (nuclear option)
      document.querySelectorAll('.format-popover').forEach(oldPop => oldPop.remove());
      
      // Create new formatting popover
      const current = getCurrentFormatting();
      
      let pop = document.createElement('div'); 
      pop.className='format-popover popover';
      pop.innerHTML=`
        <div class="pop-head" style="font-size: 11px;"><strong>FORMAT TEXT</strong><button class="ghost pop-close">✕</button></div>
          
          <div class="format-section">
            <label class="format-label">Font Family</label>
            <select class="format-font-family">
              <option value="" style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">Default</option>
              <option value="Arial, sans-serif" style="font-family:Arial,sans-serif;">Arial</option>
              <option value="'Avenir', 'Century Gothic', sans-serif" style="font-family:'Avenir','Century Gothic',sans-serif;">Avenir</option>
              <option value="'Brush Script MT', cursive" style="font-family:'Brush Script MT',cursive;">Brush Script</option>
              <option value="'Century Gothic', 'AppleGothic', sans-serif" style="font-family:'Century Gothic','AppleGothic',sans-serif;">Century Gothic</option>
              <option value="'Comic Sans MS', cursive" style="font-family:'Comic Sans MS',cursive;">Comic Sans MS</option>
              <option value="'Consolas', 'Monaco', monospace" style="font-family:'Consolas','Monaco',monospace;">Consolas</option>
              <option value="'Courier New', Courier, monospace" style="font-family:'Courier New',Courier,monospace;">Courier New</option>
              <option value="'Franklin Gothic Medium', sans-serif" style="font-family:'Franklin Gothic Medium',sans-serif;">Franklin Gothic</option>
              <option value="'Futura', 'Trebuchet MS', sans-serif" style="font-family:'Futura','Trebuchet MS',sans-serif;">Futura</option>
              <option value="Garamond, serif" style="font-family:Garamond,serif;">Garamond</option>
              <option value="Georgia, serif" style="font-family:Georgia,serif;">Georgia</option>
              <option value="'Gill Sans', 'Gill Sans MT', sans-serif" style="font-family:'Gill Sans','Gill Sans MT',sans-serif;">Gill Sans</option>
              <option value="'Helvetica Neue', Helvetica, sans-serif" style="font-family:'Helvetica Neue',Helvetica,sans-serif;">Helvetica</option>
              <option value="Impact, sans-serif" style="font-family:Impact,sans-serif;">Impact</option>
              <option value="'Times New Roman', Times, serif" style="font-family:'Times New Roman',Times,serif;">Times New Roman</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="Verdana, sans-serif">Verdana</option>
            </select>
          </div>
          
          <div class="format-section">
            <label class="format-label">Font Size</label>
            <select class="format-font-size">
              <option value="">Default</option>
              <option value="6px">6px</option>
              <option value="7px">7px</option>
              <option value="8px">8px</option>
              <option value="9px">9px</option>
              <option value="10px">10px</option>
              <option value="11px">11px</option>
              <option value="12px">12px</option>
              <option value="13px">13px</option>
              <option value="14px">14px</option>
              <option value="15px">15px</option>
              <option value="16px">16px</option>
              <option value="17px">17px</option>
              <option value="18px">18px</option>
              <option value="19px">19px</option>
              <option value="20px">20px</option>
              <option value="21px">21px</option>
              <option value="22px">22px</option>
              <option value="24px">24px</option>
              <option value="28px">28px</option>
              <option value="32px">32px</option>
            </select>
          </div>
          
          <div class="format-section">
            <label class="format-label">Text Style</label>
            <div class="format-buttons">
              <button class="format-btn format-bold" data-active="${current.bold}" title="Bold"><strong>B</strong></button>
              <button class="format-btn format-italic" data-active="${current.italic}" title="Italic"><em>I</em></button>
              <button class="format-btn format-underline" data-active="${current.underline}" title="Underline"><u>U</u></button>
            </div>
          </div>
          
          <div class="format-section">
            <label class="format-label">Alignment</label>
            <div class="format-buttons">
              <button class="format-btn format-align-left" data-active="${current.align==='left'}" title="Left">⬅</button>
              <button class="format-btn format-align-center" data-active="${current.align==='center'}" title="Center">↔</button>
              <button class="format-btn format-align-right" data-active="${current.align==='right'}" title="Right">➡</button>
            </div>
            <div class="format-buttons" style="margin-top: 4px;">
              <button class="format-btn format-valign-top" data-active="${current.valign==='top'}" title="Top">⬆</button>
              <button class="format-btn format-valign-middle" data-active="${current.valign==='middle'}" title="Middle">↕</button>
              <button class="format-btn format-valign-bottom" data-active="${current.valign==='bottom'}" title="Bottom">⬇</button>
            </div>
          </div>
          
          <div class="format-section">
            <label class="format-label">Font Color</label>
            <div class="color-picker-row">
              <input type="color" class="format-fg-color" value="${current.fgColor||'#000000'}" />
              <button class="ghost clear-fg">Clear</button>
            </div>
            <div class="chips chips-fg"></div>
          </div>
          
          <div class="format-section">
            <label class="format-label">Background Color</label>
            <div class="color-picker-row">
              <input type="color" class="format-bg-color" value="${current.bgColor||'#ffffff'}" />
              <button class="ghost clear-bg">Clear</button>
            </div>
            <div class="chips chips-bg"></div>
          </div>
          
          <div class="pop-actions">
            <button class="apply-format">Apply</button>
            <button class="ghost reset-format">Reset All</button>
          </div>`;
        
        // Set current values
        const fontFamily = pop.querySelector('.format-font-family');
        const fontSize = pop.querySelector('.format-font-size');
        if (current.fontFamily) fontFamily.value = current.fontFamily;
        if (current.fontSize) fontSize.value = current.fontSize;
        
        // Add color chips
        const chipsFg = pop.querySelector('.chips-fg');
        const chipsBg = pop.querySelector('.chips-bg');
        getPalette().forEach(hex=>{
          const chipFg=document.createElement('button'); 
          chipFg.className='chip'; chipFg.style.background=hex; chipFg.title=hex;
          chipFg.addEventListener('click', (e)=> { e.preventDefault(); pop.querySelector('.format-fg-color').value=hex; });
          chipsFg.appendChild(chipFg);
          
          const chipBg=document.createElement('button'); 
          chipBg.className='chip'; chipBg.style.background=hex; chipBg.title=hex;
          chipBg.addEventListener('click', (e)=> { e.preventDefault(); pop.querySelector('.format-bg-color').value=hex; });
          chipsBg.appendChild(chipBg);
        });
        
        // Toggle buttons
        pop.querySelector('.format-bold').addEventListener('click', (e)=> {
          e.preventDefault();
          const btn = e.currentTarget;
          btn.dataset.active = btn.dataset.active === 'true' ? 'false' : 'true';
        });
        pop.querySelector('.format-italic').addEventListener('click', (e)=> {
          e.preventDefault();
          const btn = e.currentTarget;
          btn.dataset.active = btn.dataset.active === 'true' ? 'false' : 'true';
        });
        pop.querySelector('.format-underline').addEventListener('click', (e)=> {
          e.preventDefault();
          const btn = e.currentTarget;
          btn.dataset.active = btn.dataset.active === 'true' ? 'false' : 'true';
        });
        
        // Alignment buttons
        pop.querySelectorAll('.format-align-left, .format-align-center, .format-align-right').forEach(btn => {
          btn.addEventListener('click', (e)=> {
            e.preventDefault();
            e.stopPropagation();
            pop.querySelectorAll('.format-align-left, .format-align-center, .format-align-right').forEach(b => b.dataset.active = 'false');
            btn.dataset.active = 'true';
          });
        });
        
        // Vertical alignment buttons
        pop.querySelectorAll('.format-valign-top, .format-valign-middle, .format-valign-bottom').forEach(btn => {
          btn.addEventListener('click', (e)=> {
            e.preventDefault();
            e.stopPropagation();
            pop.querySelectorAll('.format-valign-top, .format-valign-middle, .format-valign-bottom').forEach(b => b.dataset.active = 'false');
            btn.dataset.active = 'true';
          });
        });
        
        // Clear buttons
        pop.querySelector('.clear-fg').addEventListener('click', (e)=> {
          e.preventDefault();
          pop.querySelector('.format-fg-color').value = '#000000';
        });
        pop.querySelector('.clear-bg').addEventListener('click', (e)=> {
          e.preventDefault();
          pop.querySelector('.format-bg-color').value = '#ffffff';
        });
        
        // Prevent color pickers from deselecting cells
        const fgColorInput = pop.querySelector('.format-fg-color');
        const bgColorInput = pop.querySelector('.format-bg-color');
        fgColorInput.addEventListener('click', (e) => e.stopPropagation());
        fgColorInput.addEventListener('mousedown', (e) => e.stopPropagation());
        bgColorInput.addEventListener('click', (e) => e.stopPropagation());
        bgColorInput.addEventListener('mousedown', (e) => e.stopPropagation());
        
        // Apply button
        pop.querySelector('.apply-format').addEventListener('click', ()=>{
          const formatting = {
            fontFamily: fontFamily.value,
            fontSize: fontSize.value,
            bold: pop.querySelector('.format-bold').dataset.active === 'true',
            italic: pop.querySelector('.format-italic').dataset.active === 'true',
            underline: pop.querySelector('.format-underline').dataset.active === 'true',
            align: pop.querySelector('[data-active="true"][class*="format-align"]')?.classList.contains('format-align-center') ? 'center' : 
                   pop.querySelector('[data-active="true"][class*="format-align"]')?.classList.contains('format-align-right') ? 'right' : 'left',
            valign: pop.querySelector('[data-active="true"][class*="format-valign"]')?.classList.contains('format-valign-middle') ? 'middle' :
                    pop.querySelector('[data-active="true"][class*="format-valign"]')?.classList.contains('format-valign-bottom') ? 'bottom' : 'top',
            fgColor: pop.querySelector('.format-fg-color').value,
            bgColor: pop.querySelector('.format-bg-color').value
          };
          
          console.log('🎨 Applying formatting:', formatting);
          applyFormatting(rowElement, formatting, formatType);
          pop.classList.remove('is-open');
          persist();
        });
        
        // Reset button
        pop.querySelector('.reset-format').addEventListener('click', ()=>{
          applyFormatting(rowElement, {
            fontFamily: '', fontSize: '', bold: false, italic: false, 
            underline: false, align: 'left', valign: 'top', fgColor: '', bgColor: ''
          }, formatType);
          pop.classList.remove('is-open');
          persist();
        });
        
        // Close button
        pop.querySelector('.pop-close').addEventListener('click', ()=> pop.classList.remove('is-open'));
        
        document.body.appendChild(pop); // Append to body to escape table stacking context
      
      triggerBtn.setAttribute('data-popover-trigger','');
      const newBtn = triggerBtn.cloneNode(true);
      triggerBtn.parentNode.replaceChild(newBtn, triggerBtn);
      
      // Store bidirectional references
      newBtn._formatPopover = pop;
      pop._activeButton = newBtn;
      
      newBtn.addEventListener('click', (e)=> { 
        e.stopPropagation(); 
        closeAllPopovers(); 
        
        // Force popup to be the last element in body (ensures it paints last)
        if (pop.parentNode === document.body) {
          document.body.removeChild(pop);
        }
        document.body.appendChild(pop);
        
        pop.classList.add('is-open'); 
        
        const r = newBtn.getBoundingClientRect(); 
        const popupHeight = 500; // max-height from CSS
        const viewportHeight = window.innerHeight;
        
        pop.style.position = 'fixed';
        pop.style.setProperty('z-index', '2147483647', 'important'); // Force maximum z-index
        pop.style.left = (r.left + 100) + 'px'; // Shift right to avoid drag handles
        
        // Check if popup would go off bottom of screen
        if (r.bottom + popupHeight + 4 > viewportHeight) {
          // Position above button instead
          pop.style.top = Math.max(10, r.top - popupHeight - 4) + 'px';
        } else {
          // Position below button (default)
          pop.style.top = (r.bottom + 4) + 'px';
        }
      });
      return pop;
      } catch(error) {
        console.error('Error in buildFormattingPopover:', error);
        return null;
      }
    }
    
    function applyFormatting(td, formatting) {
      try {
        // Cell-based formatting only
        // element is a TD or TH cell
        
        if (!td || !td.dataset) {
          console.error('[applyFormatting] Invalid cell element:', td);
          return;
        }
        
        // Skip control columns
        const key = td.dataset.key;
        if (key === 'drag' || key === 'actions') {
          return;
        }
        
        const isTH = td.tagName === 'TH';
        
        // Store formatting in TD/TH dataset
        if (formatting.fontFamily !== undefined) td.dataset.fontFamily = formatting.fontFamily || '';
        if (formatting.fontSize !== undefined) td.dataset.fontSize = formatting.fontSize || '';
        if (formatting.bold !== undefined) td.dataset.bold = formatting.bold ? 'true' : '';
        if (formatting.italic !== undefined) td.dataset.italic = formatting.italic ? 'true' : '';
        if (formatting.underline !== undefined) td.dataset.underline = formatting.underline ? 'true' : '';
        if (formatting.align !== undefined) td.dataset.align = formatting.align || '';
        if (formatting.valign !== undefined) td.dataset.valign = formatting.valign || '';
        if (formatting.fgColor !== undefined) td.dataset.cellFg = formatting.fgColor || '';
        if (formatting.bgColor !== undefined) td.dataset.cellBg = formatting.bgColor || '';
        
        // Apply horizontal alignment to TD/TH cell itself so inputs center properly
        if (formatting.align !== undefined) {
          if (formatting.align) {
            td.style.setProperty('text-align', formatting.align, 'important');
          } else {
            td.style.removeProperty('text-align');
          }
        }
        
        // Apply vertical alignment to TD/TH cell itself
        if (formatting.valign !== undefined) {
          if (formatting.valign) {
            td.style.setProperty('vertical-align', formatting.valign, 'important');
          } else {
            td.style.removeProperty('vertical-align');
          }
        }
        
        // Apply background color to TD/TH cell itself for full coverage
        if (formatting.bgColor !== undefined) {
          if (formatting.bgColor) {
            td.style.setProperty('background-color', formatting.bgColor, 'important');
          } else {
            td.style.removeProperty('background-color');
          }
        }
        
        // Apply text color to TD/TH cell
        if (formatting.fgColor !== undefined) {
          if (formatting.fgColor) {
            td.style.setProperty('color', formatting.fgColor, 'important');
          } else {
            td.style.removeProperty('color');
          }
        }
        
        // TH elements: apply font styles directly to the TH
        if (isTH) {
          if (formatting.fontFamily !== undefined) {
            if (formatting.fontFamily) {
              td.style.setProperty('font-family', formatting.fontFamily, 'important');
            } else {
              td.style.removeProperty('font-family');
            }
          }
          
          if (formatting.fontSize !== undefined) {
            if (formatting.fontSize) {
              td.style.setProperty('font-size', formatting.fontSize, 'important');
            } else {
              td.style.removeProperty('font-size');
            }
          }
          
          if (formatting.bold !== undefined) {
            td.style.setProperty('font-weight', formatting.bold ? 'bold' : 'normal', 'important');
          }
          
          if (formatting.italic !== undefined) {
            td.style.setProperty('font-style', formatting.italic ? 'italic' : 'normal', 'important');
          }
          
          if (formatting.underline !== undefined) {
            td.style.setProperty('text-decoration', formatting.underline ? 'underline' : 'none', 'important');
          }
          
          if (formatting.align !== undefined) {
            td.style.setProperty('text-align', formatting.align || 'left', 'important');
          }
          
          if (formatting.fgColor !== undefined) {
            if (formatting.fgColor) {
              td.style.setProperty('color', formatting.fgColor, 'important');
            } else {
              td.style.removeProperty('color');
            }
          }
          
          return; // TH formatting done, skip input handling below
        }
        
        // TD elements: find the input/textarea/select/contenteditable in this cell
        const input = td.querySelector('textarea, input, select, [contenteditable]');
        
        if (input) {
          // Cell has input - apply font styles to input
          if (formatting.fontFamily !== undefined) {
            if (formatting.fontFamily) {
              input.style.setProperty('font-family', formatting.fontFamily, 'important');
            } else {
              input.style.removeProperty('font-family');
            }
          }
          
          if (formatting.fontSize !== undefined) {
            if (formatting.fontSize) {
              input.style.setProperty('font-size', formatting.fontSize, 'important');
            } else {
              input.style.removeProperty('font-size');
            }
          }
          
          if (formatting.bold !== undefined) {
            input.style.setProperty('font-weight', formatting.bold ? 'bold' : 'normal', 'important');
          }
          
          if (formatting.italic !== undefined) {
            input.style.setProperty('font-style', formatting.italic ? 'italic' : 'normal', 'important');
          }
          
          if (formatting.underline !== undefined) {
            input.style.setProperty('text-decoration', formatting.underline ? 'underline' : 'none', 'important');
          }
          
          if (formatting.align !== undefined) {
            input.style.setProperty('text-align', formatting.align || 'left', 'important');
          }
          
          if (formatting.fgColor !== undefined) {
            if (formatting.fgColor) {
              input.style.setProperty('color', formatting.fgColor, 'important');
            } else {
              input.style.removeProperty('color');
            }
          }
          
          if (formatting.bgColor !== undefined) {
            if (formatting.bgColor) {
              input.style.setProperty('background-color', formatting.bgColor, 'important');
            } else {
              input.style.removeProperty('background-color');
            }
          }
          
          // Special handling for contenteditable divs: use flexbox for vertical alignment
          if (input.hasAttribute('contenteditable') && formatting.valign !== undefined) {
            if (formatting.valign) {
              input.style.setProperty('display', 'flex', 'important');
              input.style.setProperty('flex-direction', 'column', 'important');
              if (formatting.valign === 'top') {
                input.style.setProperty('justify-content', 'flex-start', 'important');
              } else if (formatting.valign === 'middle') {
                input.style.setProperty('justify-content', 'center', 'important');
              } else if (formatting.valign === 'bottom') {
                input.style.setProperty('justify-content', 'flex-end', 'important');
              }
            } else {
              // Clear flexbox valign
              input.style.removeProperty('display');
              input.style.removeProperty('flex-direction');
              input.style.removeProperty('justify-content');
            }
          }
        } else {
          // No input - apply all styles directly to TD (for start/end/idx columns)
          if (formatting.fontFamily !== undefined) {
            if (formatting.fontFamily) {
              td.style.setProperty('font-family', formatting.fontFamily, 'important');
            } else {
              td.style.removeProperty('font-family');
            }
          }
          
          if (formatting.fontSize !== undefined) {
            if (formatting.fontSize) {
              td.style.setProperty('font-size', formatting.fontSize, 'important');
            } else {
              td.style.removeProperty('font-size');
            }
          }
          
          if (formatting.bold !== undefined) {
            td.style.setProperty('font-weight', formatting.bold ? 'bold' : 'normal', 'important');
          }
          
          if (formatting.italic !== undefined) {
            td.style.setProperty('font-style', formatting.italic ? 'italic' : 'normal', 'important');
          }
          
          if (formatting.underline !== undefined) {
            td.style.setProperty('text-decoration', formatting.underline ? 'underline' : 'none', 'important');
          }
          
          if (formatting.align !== undefined) {
            td.style.setProperty('text-align', formatting.align || 'left', 'important');
          }
          
          // Apply colors to TD (already done above, but ensure they're applied)
          if (formatting.fgColor !== undefined) {
            if (formatting.fgColor) {
              td.style.setProperty('color', formatting.fgColor, 'important');
            } else {
              td.style.removeProperty('color');
            }
          }
          
          if (formatting.bgColor !== undefined) {
            if (formatting.bgColor) {
              td.style.setProperty('background-color', formatting.bgColor, 'important');
            } else {
              td.style.removeProperty('background-color');
            }
          }
        }
        
        // Apply borders if any are present in formatting
        if (formatting.borderTop !== undefined || formatting.borderRight !== undefined || 
            formatting.borderBottom !== undefined || formatting.borderLeft !== undefined) {
          BorderDesigner.applyBordersToCell(td, formatting);
        }
        
      } catch(error) {
        console.error('Error in applyFormatting:', error);
      }
    }
    
    // Expose applyFormatting globally so it can be called from loadDay
    window.applyFormatting = applyFormatting;
    
    // Reapply formatting to all rows after page load
    function reapplyAllRowFormatting() {
      console.log('[reapplyAllRowFormatting] Starting');
      const tbody = document.getElementById('tbody');
      if (!tbody) return;
      
      const currentDayId = getActiveDayId();
      if (!currentDayId) return;
      
      const days = _getDays();
      const day = days.find(d => d.id === currentDayId);
      if (!day) return;
      
      console.log('[reapplyAllRowFormatting] Found day with', day.rows.length, 'rows');
      
      (day.rows || []).forEach(r => {
        const head = tbody.querySelector(`tr[data-id="${r.id}"]`);
        if (!head) return;
        
        // Reapply formatting to main row if it has formatting data
        if (r.fontFamily || r.fontSize || r.bold || r.italic || r.underline || r.align || r.rowFg || r.rowBg) {
          console.log('[reapplyAllRowFormatting] Row', r.id, 'has formatting:', {
            bold: r.bold,
            fgColor: r.rowFg,
            bgColor: r.rowBg
          });
          const formatting = {
            fontFamily: r.fontFamily || '',
            fontSize: r.fontSize || '',
            bold: r.bold || false,
            italic: r.italic || false,
            underline: r.underline || false,
            align: r.align || '',
            fgColor: r.rowFg || '',
            bgColor: r.rowBg || ''
          };
          applyFormatting(head, formatting, 'row');
        }
        
        // Reapply formatting to sub-schedule children
        if (r.type === 'SUB' && r.children) {
          r.children.forEach(ch => {
            const childRow = tbody.querySelector(`tr.subchild[data-id="${ch.id}"]`);
            if (!childRow) return;
            
            if (ch.fontFamily || ch.fontSize || ch.bold || ch.italic || ch.underline || ch.align) {
              const childFormatting = {
                fontFamily: ch.fontFamily || '',
                fontSize: ch.fontSize || '',
                bold: ch.bold || false,
                italic: ch.italic || false,
                underline: ch.underline || false,
                align: ch.align || '',
                fgColor: ch.subChildFg || '',
                bgColor: ch.subChildColor || ''
              };
              applyFormatting(childRow, childFormatting, 'row');
            }
          });
        }
      });
    }
    
    // Expose globally so loadDay can call it
    window.reapplyAllRowFormatting = reapplyAllRowFormatting;
    
    // Call it immediately since we're already in DOMContentLoaded
    setTimeout(reapplyAllRowFormatting, 100);

    // Row color helpers
    function applyRowBg(tr,color,isSub,isChild){
      if(isChild){ 
        if(color){ 
          tr.dataset.subChildColor=color; 
          tr.style.setProperty('--subchild-bg', color);
          // Auto-set text color for contrast
          const autoFg = getContrastColor(color);
          if (autoFg && !tr.dataset.subChildFg) {
            tr.style.setProperty('--subchild-fg', autoFg);
          }
        } else { 
          delete tr.dataset.subChildColor; 
          tr.style.removeProperty('--subchild-bg'); 
          const parent=qs(`tbody tr.row[data-id="${tr.dataset.parent}"]`); 
          if(parent) tr.style.setProperty('--subchild-bg', parent.dataset.subColor || ''); 
        } 
        return; 
      }
      if(isSub){ 
        tr.dataset.subColor=color||''; 
        tr.style.setProperty('--sub-bg', color||'');
        // Auto-set text color for contrast
        if (color) {
          const autoFg = getContrastColor(color);
          if (autoFg && !tr.dataset.subFg) {
            tr.style.setProperty('--sub-fg', autoFg);
          }
        }
        return; 
      }
      if(color){ 
        tr.dataset.rowBg=color; 
        tr.style.setProperty('--row-bg', color);
        // Auto-set text color for contrast
        const autoFg = getContrastColor(color);
        if (autoFg && !tr.dataset.rowFg) {
          tr.style.setProperty('--row-fg', autoFg);
        }
      } else { 
        delete tr.dataset.rowBg; 
        tr.style.removeProperty('--row-bg'); 
      }
    }
    function applyRowFg(tr,color,isSub,isChild){
      if(isChild){ 
        if(color){ 
          tr.dataset.subChildFg=color; 
          tr.style.setProperty('--subchild-fg', color); 
        } else { 
          delete tr.dataset.subChildFg; 
          tr.style.removeProperty('--subchild-fg');
          // Reapply auto-contrast if background color exists
          if (tr.dataset.subChildColor) {
            const autoFg = getContrastColor(tr.dataset.subChildColor);
            if (autoFg) tr.style.setProperty('--subchild-fg', autoFg);
          }
        } 
        return; 
      }
      if(isSub){ 
        if(color){ 
          tr.dataset.subFg=color; 
          tr.style.setProperty('--sub-fg', color); 
        } else { 
          delete tr.dataset.subFg; 
          tr.style.removeProperty('--sub-fg');
          // Reapply auto-contrast if background color exists
          if (tr.dataset.subColor) {
            const autoFg = getContrastColor(tr.dataset.subColor);
            if (autoFg) tr.style.setProperty('--sub-fg', autoFg);
          }
        } 
        return; 
      }
      if(color){ 
        tr.dataset.rowFg=color; 
        tr.style.setProperty('--row-fg', color); 
      } else { 
        delete tr.dataset.rowFg; 
        tr.style.removeProperty('--row-fg');
        // Reapply auto-contrast if background color exists
        if (tr.dataset.rowBg) {
          const autoFg = getContrastColor(tr.dataset.rowBg);
          if (autoFg) tr.style.setProperty('--row-fg', autoFg);
        }
      }
    }

    // Headers
    function rebuildHeaders(){
      console.log('[rebuildHeaders] REBUILDING HEADERS - Stack trace:');
      console.trace();
      
      // Save existing header formatting before rebuilding
      const savedFormatting = {};
      theadRow.querySelectorAll('th[data-key]').forEach(th => {
        const key = th.dataset.key;
        if (key === 'drag' || key === 'actions') return;
        
        if (th.dataset.fontFamily || th.dataset.fontSize || th.dataset.bold || 
            th.dataset.italic || th.dataset.underline || th.dataset.align || th.dataset.valign ||
            th.dataset.cellFg || th.dataset.cellBg || 
            th.dataset.borderTop || th.dataset.borderRight || 
            th.dataset.borderBottom || th.dataset.borderLeft) {
          
          savedFormatting[key] = {
            fontFamily: th.dataset.fontFamily || '',
            fontSize: th.dataset.fontSize || '',
            bold: th.dataset.bold === 'true',
            italic: th.dataset.italic === 'true',
            underline: th.dataset.underline === 'true',
            align: th.dataset.align || '',
            valign: th.dataset.valign || '',
            fgColor: th.dataset.cellFg || '',
            bgColor: th.dataset.cellBg || '',
            borderTop: th.dataset.borderTop || '',
            borderRight: th.dataset.borderRight || '',
            borderBottom: th.dataset.borderBottom || '',
            borderLeft: th.dataset.borderLeft || ''
          };
        }
      });
      
      const cols = getAllColumnsSorted();
      theadRow.innerHTML='';
      cols.forEach(col=>{
        const th=document.createElement('th'); 
        th.dataset.key=col.key;
        
        // Add data attributes for separator columns
        if(col.type === 'separator') {
          th.dataset.type = 'separator';
        }
        
        // Add format button to ALL columns except drag
        if(col.key !== 'drag'){
          const labelSpan = document.createElement('span');
          labelSpan.textContent = col.label || '';
          th.appendChild(labelSpan);
        } else {
          // Drag column: just add label (help icon is in CSS ::after)
          th.textContent = col.label || '';
          th.title = 'OPTION + CLICK TO SELECT HEADER ROW';
        }
        
        if(col.key==='drag'||col.key==='actions'){ 
          th.classList.add(col.key==='drag'?'fixed-left':'fixed-right'); 
          if(col.key === 'actions') {
            // Create button container for side-by-side layout
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; gap: 4px; align-items: center; justify-content: flex-end;';
            
            // Add master sharpie toggle button
            const sharpieToggle = document.createElement('button');
            sharpieToggle.className = 'ghost master-sharpie-toggle';
            // Clean angled sharpie silhouette
            sharpieToggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 20 20" style="display: block;"><g transform="rotate(180 10 10)"><path d="M 18 2 L 16 4 L 14 6 L 16 8 L 18 6 L 20 4 Z" fill="#dc2626"/><path d="M 16 4 L 14 6 L 8 12 L 10 14 L 16 8 L 18 6 Z" fill="#d1d5db"/><path d="M 14 6 L 8 12 L 10 14 L 16 8 Z" fill="#9ca3af"/><path d="M 8 12 L 10 14 L 7 17 L 4 20 L 0 16 L 3 13 L 6 10 Z" fill="#dc2626"/><path d="M 7 17 L 4 20 L 0 16 L 3 13 Z" fill="#b91c1c"/></g></svg>`;
            sharpieToggle.title = 'Toggle Sharpie Lines';
            sharpieToggle.style.cssText = 'border-radius:6px; display:inline-flex; align-items:center; justify-content:center;';
            
            // Set initial state based on current visibility (check both SharpieManager and localStorage)
            const isHidden = (typeof SharpieManager !== 'undefined' && SharpieManager.areLinesHidden()) || 
                           localStorage.getItem('sharpie-lines-hidden') === 'true';
            
            if (isHidden) {
              sharpieToggle.classList.add('lines-hidden');
              sharpieToggle.title = 'Show Sharpie Lines';
            } else {
              sharpieToggle.classList.remove('lines-hidden');
              sharpieToggle.title = 'Hide Sharpie Lines';
            }
            
            // Toggle all sharpie lines visibility
            sharpieToggle.addEventListener('click', (e) => {
              e.stopPropagation();
              
              if (typeof SharpieManager !== 'undefined') {
                SharpieManager.toggleVisibility();
                
                if(SharpieManager.areLinesHidden()) {
                  sharpieToggle.classList.add('lines-hidden');
                  sharpieToggle.title = 'Show Sharpie Lines';
                } else {
                  sharpieToggle.classList.remove('lines-hidden');
                  sharpieToggle.title = 'Hide Sharpie Lines';
                }
              } else {
                console.error('[Sharpie] SharpieManager not loaded');
              }
            });
            
            // Add format button
            const formatBtn = document.createElement('button');
            formatBtn.className = 'ghost';
            formatBtn.textContent = 'A';
            formatBtn.title = 'Format Selection';
            formatBtn.style.cssText = 'border-radius:6px; display:inline-flex; align-items:center; justify-content:center;';
            
            // Open format popover when clicked
            formatBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const selected = SelectionManager.getSelection();
              if (selected.length === 0) {
                alert('Please select cells or rows to format');
                return;
              }
              // Open format designer
              FormatDesigner.open(formatBtn, 'row');
            });
            
            // Add border button
            const borderBtn = document.createElement('button');
            borderBtn.className = 'ghost border-trigger-btn';
            borderBtn.textContent = '⊞';
            borderBtn.title = 'Cell Borders';
            borderBtn.style.cssText = 'border-radius:6px; display:inline-flex; align-items:center; justify-content:center;';
            
            // Open border designer when clicked
            borderBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const selected = SelectionManager.getSelection();
              if (selected.length === 0) {
                alert('Please select cells to apply borders');
                return;
              }
              BorderDesigner.open(borderBtn);
            });
            
            btnContainer.appendChild(sharpieToggle);
            btnContainer.appendChild(formatBtn);
            btnContainer.appendChild(borderBtn);
            th.appendChild(btnContainer);
          } else {
            th.textContent='';
          }
        }
        
        // Apply visibility for hidden columns
        const colVisState = JSON.parse(localStorage.getItem('columnVisibility') || '{}');
        if (col.fixed) {
          // Built-in columns use columnVisibility localStorage
          if (colVisState[col.key] === false) {
            th.style.visibility = 'collapse';
          }
        } else {
          // Custom columns use show property
          if (col.show === false) {
            th.style.visibility = 'collapse';
          }
        }
        
        if(!col.fixed){ if(col.print===false) th.classList.add('col-print-hide'); }
        
        // Restore saved formatting if it exists
        if (savedFormatting[col.key]) {
          const formatting = savedFormatting[col.key];
          if (formatting.fontFamily) th.dataset.fontFamily = formatting.fontFamily;
          if (formatting.fontSize) th.dataset.fontSize = formatting.fontSize;
          if (formatting.bold) th.dataset.bold = 'true';
          if (formatting.italic) th.dataset.italic = 'true';
          if (formatting.underline) th.dataset.underline = 'true';
          if (formatting.align) th.dataset.align = formatting.align;
          if (formatting.valign) th.dataset.valign = formatting.valign;
          if (formatting.fgColor) th.dataset.cellFg = formatting.fgColor;
          if (formatting.bgColor) th.dataset.cellBg = formatting.bgColor;
          if (formatting.borderTop) th.dataset.borderTop = formatting.borderTop;
          if (formatting.borderRight) th.dataset.borderRight = formatting.borderRight;
          if (formatting.borderBottom) th.dataset.borderBottom = formatting.borderBottom;
          if (formatting.borderLeft) th.dataset.borderLeft = formatting.borderLeft;
          
          // Apply visual styles
          if (formatting.fontFamily) th.style.setProperty('font-family', formatting.fontFamily, 'important');
          if (formatting.fontSize) th.style.setProperty('font-size', formatting.fontSize, 'important');
          if (formatting.bold) th.style.setProperty('font-weight', 'bold', 'important');
          if (formatting.italic) th.style.setProperty('font-style', 'italic', 'important');
          if (formatting.underline) th.style.setProperty('text-decoration', 'underline', 'important');
          if (formatting.align) th.style.setProperty('text-align', formatting.align, 'important');
          if (formatting.valign) th.style.setProperty('vertical-align', formatting.valign, 'important');
          if (formatting.fgColor) th.style.setProperty('color', formatting.fgColor, 'important');
          if (formatting.bgColor) th.style.setProperty('background-color', formatting.bgColor, 'important');
          if (formatting.borderTop) th.style.setProperty('border-top', formatting.borderTop, 'important');
          if (formatting.borderRight) th.style.setProperty('border-right', formatting.borderRight, 'important');
          if (formatting.borderBottom) th.style.setProperty('border-bottom', formatting.borderBottom, 'important');
          if (formatting.borderLeft) th.style.setProperty('border-left', formatting.borderLeft, 'important');
        }
        
        // Add native tooltip to all headers
        if (col.key === 'drag') {
          th.title = 'OPTION + CLICK TO SELECT HEADER ROW';
        } else if (col.key !== 'actions') {
          th.title = 'OPTION + CLICK TO SELECT HEADER CELLS';
        }
        
        
        theadRow.appendChild(th);
      });
    
      applyColWidths(); addHeaderResizeGrips();
      
      // Transfer left borders from hidden columns to first visible column
      transferBordersFromHiddenColumns();
      
      // Re-setup select all handler after headers are rebuilt
      if (typeof setupSelectAllHandler === 'function') {
        setupSelectAllHandler();
      }
      
      // Apply saved header height
      try {
        const savedState = JSON.parse(localStorage.getItem('shootScheduler_v8_10') || '{}');
        if (savedState.headerHeight) {
          const h = savedState.headerHeight;
          theadRow.style.setProperty('height', h + 'px', 'important');
          theadRow.style.setProperty('min-height', h + 'px', 'important');
          theadRow.style.setProperty('max-height', h + 'px', 'important');
          
          const ths = theadRow.querySelectorAll('th');
          const verticalPadding = h < 32 ? '0px' : '2px';
          ths.forEach(th => {
            th.style.setProperty('height', h + 'px', 'important');
            th.style.setProperty('min-height', h + 'px', 'important');
            th.style.setProperty('max-height', h + 'px', 'important');
            th.style.setProperty('padding', `${verticalPadding} 4px`, 'important');
            
            // Constrain any inputs/buttons inside header cells
            const inputs = th.querySelectorAll('input, button, select');
            if (h < 30) {
              // Small header - constrain buttons
              inputs.forEach(input => {
                input.style.setProperty('padding', '0 4px', 'important');
                input.style.setProperty('min-height', '0', 'important');
                input.style.setProperty('line-height', '1', 'important');
                input.style.setProperty('height', 'auto', 'important');
                input.style.setProperty('max-height', Math.max(h - 4, 8) + 'px', 'important');
                input.style.setProperty('font-size', '10px', 'important');
              });
            } else {
              // Normal header - restore normal button sizing
              inputs.forEach(input => {
                input.style.removeProperty('padding');
                input.style.removeProperty('min-height');
                input.style.removeProperty('line-height');
                input.style.removeProperty('height');
                input.style.removeProperty('max-height');
                input.style.removeProperty('font-size');
              });
            }
          });
        }
      } catch(e) {
        // Silently fail if no saved height
      }
}

    // Transfer left borders from hidden columns to the next visible column
    function transferBordersFromHiddenColumns() {
      const headers = Array.from(theadRow.querySelectorAll('th'));
      
      // First, clear all previously transferred borders
      headers.forEach(th => {
        if (th.dataset.transferredBorderLeft) {
          delete th.dataset.transferredBorderLeft;
          // Only remove the style if there's no original border
          if (!th.dataset.borderLeft) {
            th.style.removeProperty('border-left');
          }
        }
      });
      
      // Scan through all headers and transfer borders from hidden to next visible
      for (let i = 0; i < headers.length; i++) {
        const th = headers[i];
        const isHidden = th.style.visibility === 'collapse';
        
        if (isHidden && th.dataset.borderLeft) {
          // This hidden column has a left border - find the next visible column
          for (let j = i + 1; j < headers.length; j++) {
            const nextTh = headers[j];
            if (nextTh.style.visibility !== 'collapse') {
              // Found next visible column - transfer the border if it doesn't already have an original one
              if (!nextTh.dataset.borderLeft) {
                nextTh.dataset.transferredBorderLeft = th.dataset.borderLeft;
                nextTh.style.setProperty('border-left', th.dataset.borderLeft, 'important');
              }
              break;
            }
          }
        }
      }
      
      // Also transfer borders in all rows
      const tbody = document.getElementById('tbody');
      if (tbody) {
        tbody.querySelectorAll('tr.row').forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td'));
          
          // First, clear all previously transferred borders in this row
          cells.forEach(td => {
            if (td.dataset.transferredBorderLeft) {
              delete td.dataset.transferredBorderLeft;
              // Only remove the style if there's no original border
              if (!td.dataset.borderLeft) {
                td.style.removeProperty('border-left');
              }
            }
          });
          
          for (let i = 0; i < cells.length; i++) {
            const td = cells[i];
            const isHidden = td.style.visibility === 'collapse';
            
            if (isHidden && td.dataset.borderLeft) {
              // This hidden cell has a left border - find the next visible cell
              for (let j = i + 1; j < cells.length; j++) {
                const nextTd = cells[j];
                if (nextTd.style.visibility !== 'collapse') {
                  // Found next visible cell - transfer the border if it doesn't already have an original one
                  if (!nextTd.dataset.borderLeft) {
                    nextTd.dataset.transferredBorderLeft = td.dataset.borderLeft;
                    nextTd.style.setProperty('border-left', td.dataset.borderLeft, 'important');
                  }
                  break;
                }
              }
            }
          }
        });
      }
    }

    // Custom cells
    function appendCustomCells(tr,rowData){
      // Get custom columns in sorted order (excluding fixed columns)
      const customCols = getAllColumnsSorted().filter(col => !col.fixed);
      customCols.forEach(col=>{
        const td=document.createElement('td'); td.dataset.key=col.key;
        td.className = 'custom-cell'; // Add class for styling
        if(col.show===false) td.style.visibility = 'collapse';
        if(col.print===false) td.classList.add('col-print-hide');
        const cellData = ((rowData.custom||{})[col.key])||'';
        
        // Handle both old format (string) and new format (object with formatting)
        let val = '';
        // Get cell formatting from rowData.cellFormatting, not from cellData
        let cellFormatting = rowData.cellFormatting ? rowData.cellFormatting[col.key] : null;
        console.log(`[appendCustomCells] Cell ${col.key} formatting:`, cellFormatting);
        
        if (typeof cellData === 'object' && cellData.value !== undefined) {
          val = cellData.value;
          // Override with cellData.formatting if it exists (backwards compatibility)
          if (cellData.formatting) {
            cellFormatting = cellData.formatting;
          }
        } else {
          val = cellData;
        }
        
        if(col.type==='text'){
          // Ensure val is a string for contenteditable divs
          const textVal = (val == null) ? '' : String(val);
          td.innerHTML=`<div class="cc-input" contenteditable="true" data-ckey="${col.key}" data-placeholder="${col.label||''}" title="CLICK TO EDIT | OPTION + CLICK TO SELECT CELL">${textVal}</div>`;
          
          // Force zero padding on text cell TDs
          td.style.setProperty('padding', '0', 'important');
          
          // Restore saved formatting if it exists
          if (cellFormatting) {
            if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
            if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
            if (cellFormatting.bold) td.dataset.bold = 'true';
            if (cellFormatting.italic) td.dataset.italic = 'true';
            if (cellFormatting.underline) td.dataset.underline = 'true';
            if (cellFormatting.align) td.dataset.align = cellFormatting.align;
            if (cellFormatting.valign) td.dataset.valign = cellFormatting.valign;
            // Colors can be empty strings, check for undefined/null instead
            if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
              td.dataset.cellFg = cellFormatting.fgColor;
            }
            if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
              td.dataset.cellBg = cellFormatting.bgColor;
            }
            
            // Apply vertical alignment to TD
            if (cellFormatting.valign) {
              td.style.setProperty('vertical-align', cellFormatting.valign, 'important');
            }
          }
          
          // Apply formatting to contenteditable div
          const editableDiv = td.querySelector('[contenteditable]');
          
          if (editableDiv) {
            // Apply minimal padding to contenteditable for readability
            editableDiv.style.setProperty('padding', '2px', 'important');
            editableDiv.style.setProperty('margin', '0', 'important');
            
            // Apply row-level formatting first (fonts and alignment only - colors inherit from TD)
            if (rowData.fontFamily) editableDiv.style.fontFamily = rowData.fontFamily;
            if (rowData.fontSize) editableDiv.style.fontSize = rowData.fontSize;
            if (rowData.bold) editableDiv.style.fontWeight = 'bold';
            if (rowData.italic) editableDiv.style.fontStyle = 'italic';
            if (rowData.underline) editableDiv.style.textDecoration = 'underline';
            if (rowData.align) editableDiv.style.textAlign = rowData.align;
            
            if (rowData.valign) {
              editableDiv.style.display = 'flex';
              editableDiv.style.flexDirection = 'column';
              if (rowData.valign === 'top') editableDiv.style.justifyContent = 'flex-start';
              else if (rowData.valign === 'middle') editableDiv.style.justifyContent = 'center';
              else if (rowData.valign === 'bottom') editableDiv.style.justifyContent = 'flex-end';
            }
            
            // Override with cell-level formatting
            if (cellFormatting) {
              if (cellFormatting.fontFamily) editableDiv.style.fontFamily = cellFormatting.fontFamily;
              if (cellFormatting.fontSize) editableDiv.style.fontSize = cellFormatting.fontSize;
              if (cellFormatting.bold) editableDiv.style.fontWeight = 'bold';
              if (cellFormatting.italic) editableDiv.style.fontStyle = 'italic';
              if (cellFormatting.underline) editableDiv.style.textDecoration = 'underline';
              if (cellFormatting.align) editableDiv.style.textAlign = cellFormatting.align;
              
              if (cellFormatting.valign) {
                editableDiv.style.display = 'flex';
                editableDiv.style.flexDirection = 'column';
                if (cellFormatting.valign === 'top') editableDiv.style.justifyContent = 'flex-start';
                else if (cellFormatting.valign === 'middle') editableDiv.style.justifyContent = 'center';
                else if (cellFormatting.valign === 'bottom') editableDiv.style.justifyContent = 'flex-end';
              }
              
              // Cell colors - only set if explicitly defined
              if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                editableDiv.style.color = cellFormatting.fgColor;
              }
              if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                editableDiv.style.backgroundColor = cellFormatting.bgColor;
              }
            }
          }
          
          // Restore borders using BorderDesigner
          if (cellFormatting && (cellFormatting.borderTop !== undefined || cellFormatting.borderRight !== undefined || 
              cellFormatting.borderBottom !== undefined || cellFormatting.borderLeft !== undefined)) {
            BorderDesigner.applyBordersToCell(td, cellFormatting);
          }
        } else if(col.type==='upload'){
          td.innerHTML=`<div class="uploadBox" data-ckey="${col.key}">
            <div class="u-actions"><button class="u-add">Upload</button><input class="u-file" type="file" multiple accept="image/*,video/*,audio/*" hidden></div>
            <div class="u-grid"></div></div>`;
          const ids=Array.isArray(val)?val:(typeof val==='string'&&val.startsWith('[')?JSON.parse(val):[]);
          td.dataset.vaultIds=JSON.stringify(ids); buildUploadUI(td,ids);
        } else if(col.type==='tags'){
          td.innerHTML=`<div class="tagsBox"><div class="tags-pills"></div><button class="tags-add-btn" title="Add tags">+</button><textarea class="cc-input tags-value" data-ckey="${col.key}" hidden>${val}</textarea></div>`;
          
          // Restore saved formatting if it exists
          if (cellFormatting) {
            if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
            if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
            if (cellFormatting.bold) td.dataset.bold = 'true';
            if (cellFormatting.italic) td.dataset.italic = 'true';
            if (cellFormatting.underline) td.dataset.underline = 'true';
            if (cellFormatting.align) td.dataset.align = cellFormatting.align;
            if (cellFormatting.valign) td.dataset.valign = cellFormatting.valign;
            if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
              td.dataset.cellFg = cellFormatting.fgColor;
            }
            if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
              td.dataset.cellBg = cellFormatting.bgColor;
            }
            
            // Apply styles to TD for background and vertical alignment
            if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
              td.style.setProperty('background-color', cellFormatting.bgColor, 'important');
            }
            if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
              td.style.setProperty('color', cellFormatting.fgColor, 'important');
            }
            if (cellFormatting.valign) {
              td.style.setProperty('vertical-align', cellFormatting.valign, 'important');
            }
            
            // Restore borders using BorderDesigner
            if (cellFormatting.borderTop !== undefined || cellFormatting.borderRight !== undefined || 
                cellFormatting.borderBottom !== undefined || cellFormatting.borderLeft !== undefined) {
              BorderDesigner.applyBordersToCell(td, cellFormatting);
            }
          }
          
          hydrateTagsBox(td,val);
        } else if(col.type==='separator'){
          // Separator column - show the configured character
          td.dataset.type = 'separator';
          // Hide separator for CALL TIME, SUB-SCHEDULE, and milestone rows
          const rowType = tr.dataset.type;
          const isMilestone = tr.dataset.isMilestone === 'true';
          if (rowType === 'CALL TIME' || rowType === 'SUB' || isMilestone) {
            td.textContent = '';
          } else {
            td.textContent = col.separatorChar || '—';
          }
          td.style.textAlign = 'center';
          
          // Restore saved formatting if it exists
          if (cellFormatting) {
            if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
            if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
            if (cellFormatting.bold) td.dataset.bold = 'true';
            if (cellFormatting.italic) td.dataset.italic = 'true';
            if (cellFormatting.underline) td.dataset.underline = 'true';
            if (cellFormatting.align) td.dataset.align = cellFormatting.align;
            if (cellFormatting.valign) td.dataset.valign = cellFormatting.valign;
            if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
              td.dataset.cellFg = cellFormatting.fgColor;
            }
            if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
              td.dataset.cellBg = cellFormatting.bgColor;
            }
            
            // Apply styles to TD
            if (cellFormatting.fontFamily) td.style.setProperty('font-family', cellFormatting.fontFamily, 'important');
            if (cellFormatting.fontSize) td.style.setProperty('font-size', cellFormatting.fontSize, 'important');
            if (cellFormatting.bold) td.style.setProperty('font-weight', 'bold', 'important');
            if (cellFormatting.italic) td.style.setProperty('font-style', 'italic', 'important');
            if (cellFormatting.underline) td.style.setProperty('text-decoration', 'underline', 'important');
            if (cellFormatting.align) td.style.setProperty('text-align', cellFormatting.align, 'important');
            if (cellFormatting.valign) td.style.setProperty('vertical-align', cellFormatting.valign, 'important');
            if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
              td.style.setProperty('background-color', cellFormatting.bgColor, 'important');
            }
            if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
              td.style.setProperty('color', cellFormatting.fgColor, 'important');
            }
            
            // Restore borders using BorderDesigner
            if (cellFormatting.borderTop !== undefined || cellFormatting.borderRight !== undefined || 
                cellFormatting.borderBottom !== undefined || cellFormatting.borderLeft !== undefined) {
              BorderDesigner.applyBordersToCell(td, cellFormatting);
            }
          }
        } else { td.innerHTML=`<input class="cc-input" data-ckey="${col.key}" type="text" placeholder="${col.label||''}" value="${val}"/>`; }
        tr.appendChild(td);
        td.querySelector('.cc-input')?.addEventListener('input', persist);
      });
    }

    function buildUploadUI(td,ids){
      console.log('[buildUploadUI] FUNCTION CALLED, ids:', ids);
      const box=td.querySelector('.uploadBox'); const btn=box.querySelector('.u-add'); const fileInput=box.querySelector('.u-file'); const grid=box.querySelector('.u-grid');
      console.log('[buildUploadUI] Found box:', box, 'btn:', btn, 'fileInput:', fileInput, 'grid:', grid);
      
      // Add drag and drop support to the box
      box.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.classList.add('drag-over');
      });
      
      box.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.classList.remove('drag-over');
      });
      
      box.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        box.classList.remove('drag-over');
        
        console.log('[Media] Drop detected');
        console.log('[Media] DataTransfer types:', e.dataTransfer.types);
        
        // Check if it's a media item being dragged (copy operation)
        const mediaId = e.dataTransfer.getData('text/media-id');
        console.log('[Media] Media ID from drag:', mediaId);
        if (mediaId) {
          console.log('[Media] Media item dropped:', mediaId);
          // Copy the media ID to this cell
          if (!ids.includes(Number(mediaId))) {
            ids.push(Number(mediaId));
            td.dataset.vaultIds = JSON.stringify(ids);
            persist();
            await refresh();
            
            // If force row height is on, re-apply row heights to expand this row
            if (document.body.classList.contains('force-row-height')) {
              setTimeout(() => {
                if (typeof window.applyRowHeights === 'function') {
                  window.applyRowHeights();
                }
              }, 100); // Small delay to let image load
            }
          } else {
            console.log('[Media] Media already in this cell');
          }
          return;
        }
        
        // Otherwise handle file drops
        const files = Array.from(e.dataTransfer.files || []);
        console.log('[Media] Files dropped:', files.length);
        
        if (files.length === 0) {
          console.warn('[Media] No files in drop');
          return;
        }
        
        // Upload dropped files
        for(const f of files){ 
          console.log('[Media] Uploading:', f.name);
          const id = await vaultPut(f); 
          console.log('[Media] Vault ID:', id);
          ids.push(id);
        } 
        
        console.log('[Media] All IDs:', ids);
        td.dataset.vaultIds = JSON.stringify(ids);
        
        console.log('[Media] Calling persist()');
        persist(); 
        
        console.log('[Media] Calling refresh()');
        await refresh();
        
        // If force row height is on, re-apply row heights to expand this row
        if (document.body.classList.contains('force-row-height')) {
          setTimeout(() => {
            if (typeof window.applyRowHeights === 'function') {
              window.applyRowHeights();
            }
          }, 100); // Small delay to let image load
        }
        
        console.log('[Media] Drop complete');
      });
      
      async function refresh(){
        grid.innerHTML='';
        
        for(let i = 0; i < ids.length; i++){
          const id = ids[i];
          const label = getMediaLabel(id); // Get label by media ID
          try{
            const rec=await vaultGet(Number(id)); if(!rec) continue;
            const url=URL.createObjectURL(rec.data);
            const item=document.createElement('div'); item.className='u-item'; item.innerHTML=`<button class="u-del" title="Remove">✕</button>`;
            
            // Add badge for image/video items
            if(rec.type.startsWith('image/') || rec.type.startsWith('video/')){ 
              const badge = document.createElement('div');
              badge.className = 'media-badge' + (label ? ' has-label' : '');
              badge.dataset.mediaIndex = i;
              badge.innerHTML = label || '+';
              badge.title = 'Click to edit label';
              if (label) {
                const savedColor = localStorage.getItem('badgeColor') || '#3182ce';
                badge.style.backgroundColor = savedColor;
              }
              item.appendChild(badge);
              
              // Badge click handler for editing
              badge.addEventListener('click', (e) => {
                console.log('[Badge] Click event fired on badge');
                e.stopPropagation();
                const currentLabel = badge.textContent === '+' ? '' : badge.textContent;
                
                console.log('[Badge] Creating edit container, current label:', currentLabel);
                
                // Set editing flag to prevent drag
                item.dataset.editing = 'true';
                
                // Create centered edit container
                const editContainer = document.createElement('div');
                editContainer.className = 'media-badge-edit-container';
                
                // Text input (centered)
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'media-badge-input';
                input.value = currentLabel;
                input.maxLength = 20;
                input.placeholder = 'Label...';
                
                // Color picker
                const colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.className = 'media-badge-color-picker';
                colorPicker.value = localStorage.getItem('badgeColor') || '#3182ce';
                colorPicker.title = 'Badge color';
                
                // Update badge color on change
                colorPicker.addEventListener('input', () => {
                  localStorage.setItem('badgeColor', colorPicker.value);
                  // Update preview badge
                  if (previewBadge.classList.contains('has-label')) {
                    previewBadge.style.backgroundColor = colorPicker.value;
                  }
                  // Update all badges with labels in the page
                  document.querySelectorAll('.media-badge.has-label').forEach(b => {
                    b.style.backgroundColor = colorPicker.value;
                  });
                });
                
                // Container for input and color picker
                const inputRow = document.createElement('div');
                inputRow.className = 'media-badge-input-row';
                inputRow.appendChild(input);
                inputRow.appendChild(colorPicker);
                
                // Live preview badge (top-left corner)
                const previewBadge = document.createElement('div');
                previewBadge.className = 'media-badge-preview' + (currentLabel ? ' has-label' : '');
                previewBadge.textContent = currentLabel || '+';
                if (currentLabel) {
                  const savedColor = localStorage.getItem('badgeColor') || '#3182ce';
                  previewBadge.style.backgroundColor = savedColor;
                }
                
                // Size slider
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.className = 'media-badge-slider';
                slider.min = '0.06';
                slider.max = '0.45'; // Twice as big as before (was 0.225)
                slider.step = '0.001';
                slider.value = localStorage.getItem('badgeSizeRatio') || '0.09';
                slider.title = 'Badge size';
                
                // Update size as slider moves
                slider.addEventListener('input', () => {
                  console.log('[Slider] Input event - value:', slider.value);
                  document.documentElement.style.setProperty('--badge-size-ratio', slider.value);
                  localStorage.setItem('badgeSizeRatio', slider.value);
                });
                
                // Let slider work - stop propagation so item doesn't catch it
                slider.addEventListener('mousedown', (e) => {
                  console.log('[Slider] Mousedown - target:', e.target);
                  e.stopPropagation();
                });
                
                slider.addEventListener('change', () => {
                  console.log('[Slider] Change event');
                });
                
                // Prevent edit controls from triggering drag (but let slider work)
                editContainer.addEventListener('mousedown', (e) => {
                  console.log('[EditContainer] Mousedown - target:', e.target.className);
                  if (!e.target.closest('.media-badge-slider')) {
                    console.log('[EditContainer] Stopping propagation (not slider)');
                    e.stopPropagation();
                  } else {
                    console.log('[EditContainer] Allowing slider event through');
                  }
                });
                editContainer.addEventListener('pointerdown', (e) => {
                  if (!e.target.closest('.media-badge-slider')) {
                    e.stopPropagation();
                  }
                });
                previewBadge.addEventListener('mousedown', (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                });
                previewBadge.addEventListener('pointerdown', (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                });
                
                // Update preview as user types AND propagate to other cells
                input.addEventListener('input', () => {
                  const val = input.value.trim();
                  previewBadge.textContent = val || '+';
                  if (val) {
                    previewBadge.classList.add('has-label');
                    previewBadge.style.backgroundColor = colorPicker.value;
                  } else {
                    previewBadge.classList.remove('has-label');
                    previewBadge.style.backgroundColor = '';
                  }
                  
                  // Real-time propagation to all other cells with same media ID
                  console.log('[Propagation] Looking for media ID:', id, 'type:', typeof id);
                  const idStr = String(id);
                  let foundCount = 0;
                  document.querySelectorAll('td[data-vault-ids]').forEach(cell => {
                    const cellIds = JSON.parse(cell.dataset.vaultIds || '[]').map(String); // Convert all to strings
                    console.log('[Propagation] Cell IDs:', cellIds, 'includes?', cellIds.includes(idStr));
                    if (cellIds.includes(idStr)) {
                      const grid = cell.querySelector('.uploadBox');
                      if (grid) {
                        grid.querySelectorAll('.media-badge').forEach(b => {
                          const badgeItem = b.closest('.u-item');
                          console.log('[Propagation] Badge item media ID:', badgeItem?.dataset.mediaId);
                          if (badgeItem && badgeItem.dataset.mediaId === idStr && b !== badge) {
                            foundCount++;
                            console.log('[Propagation] Updating badge #', foundCount);
                            b.textContent = val || '+';
                            if (val) {
                              b.classList.add('has-label');
                              b.style.backgroundColor = colorPicker.value;
                            } else {
                              b.classList.remove('has-label');
                              b.style.backgroundColor = '';
                            }
                          }
                        });
                      }
                    }
                  });
                  console.log('[Propagation] Updated', foundCount, 'other badges');
                });
                
                editContainer.appendChild(slider);
                editContainer.appendChild(inputRow);
                
                // Append to body since it's position:fixed
                document.body.appendChild(editContainer);
                item.appendChild(previewBadge);
                
                // Position the fixed container relative to the badge
                const badgeRect = badge.getBoundingClientRect();
                editContainer.style.top = (badgeRect.bottom + 2) + 'px';
                editContainer.style.left = badgeRect.left + 'px';
                
                badge.style.display = 'none';
                input.focus();
                input.select();
                
                // Click outside handler (declared before saveLabel so it can be removed)
                let clickOutsideHandler;
                
                const saveLabel = () => {
                  const newLabel = input.value.trim();
                  
                  // Save label by media ID
                  setMediaLabel(id, newLabel);
                  
                  // Update badge
                  if (newLabel) {
                    badge.textContent = newLabel;
                    badge.classList.add('has-label');
                    badge.style.backgroundColor = colorPicker.value;
                  } else {
                    badge.textContent = '+';
                    badge.classList.remove('has-label');
                    badge.style.backgroundColor = '';
                  }
                  
                  // Clean up
                  editContainer.remove();
                  previewBadge.remove();
                  badge.style.display = '';
                  delete item.dataset.editing;
                  document.removeEventListener('mousedown', clickOutsideHandler);
                  
                  persist();
                  
                  // Refresh all cells with this media ID to propagate label
                  const idStr = String(id);
                  document.querySelectorAll('td[data-vault-ids]').forEach(cell => {
                    const cellIds = JSON.parse(cell.dataset.vaultIds || '[]').map(String);
                    if (cellIds.includes(idStr)) {
                      // Trigger refresh for this cell
                      const grid = cell.querySelector('.uploadBox');
                      if (grid) {
                        // Find and update badges in this cell
                        grid.querySelectorAll('.media-badge').forEach(b => {
                          const item = b.closest('.u-item');
                          if (item && item.dataset.mediaId === idStr) {
                            if (newLabel) {
                              b.textContent = newLabel;
                              b.classList.add('has-label');
                              b.style.backgroundColor = colorPicker.value;
                            } else {
                              b.textContent = '+';
                              b.classList.remove('has-label');
                              b.style.backgroundColor = '';
                            }
                          }
                        });
                      }
                    }
                  });
                };
                
                // Save on Enter, close on Escape
                input.addEventListener('keydown', (e) => {
                  if (e.key === 'Enter') saveLabel();
                  if (e.key === 'Escape') {
                    editContainer.remove();
                    previewBadge.remove();
                    badge.style.display = '';
                    delete item.dataset.editing;
                    document.removeEventListener('mousedown', clickOutsideHandler);
                  }
                });
                
                // Close when clicking outside the edit UI
                clickOutsideHandler = (e) => {
                  if (!editContainer.contains(e.target) && 
                      !previewBadge.contains(e.target) &&
                      e.target !== badge) {
                    saveLabel();
                  }
                };
                // Add slight delay so this doesn't immediately trigger
                setTimeout(() => {
                  document.addEventListener('mousedown', clickOutsideHandler);
                }, 100);
              });
            }
            
            if(rec.type.startsWith('image/')){ 
              const img=document.createElement('img'); 
              img.src=url; 
              img.className='u-thumb'; 
              img.draggable=false; // Prevent img from interfering with parent drag
              item.appendChild(img); 
            }
            else if(rec.type.startsWith('video/')){ 
              const vid=document.createElement('video'); 
              vid.src=url; 
              vid.controls=true; 
              vid.className='u-thumb'; 
              item.appendChild(vid); 
            }
            else if(rec.type.startsWith('audio/')){ 
              const aud=document.createElement('audio'); 
              aud.src=url; 
              aud.controls=true; 
              aud.className='u-audio'; 
              item.appendChild(aud); 
            }
            else { 
              const a=document.createElement('a'); 
              a.href=url; 
              a.textContent=rec.name; 
              a.target='_blank'; 
              a.draggable=false; // Prevent link from interfering
              item.appendChild(a); 
            }
            
            // Make media item draggable
            item.draggable = true;
            item.dataset.mediaId = id;
            console.log('[Media] Made item draggable:', id, item.draggable);
            
            // Block drag when editing, but allow slider interaction
            item.addEventListener('mousedown', (e) => {
              console.log('[Item] Mousedown - target:', e.target.className, 'editing:', item.dataset.editing);
              if (item.dataset.editing === 'true' && 
                  !e.target.closest('.media-badge-slider') &&
                  !e.target.closest('.media-badge-input') &&
                  !e.target.closest('.media-badge-edit-container')) {
                console.log('[Item] Preventing default');
                e.preventDefault();
              }
            });
            
            item.addEventListener('dragstart', (e) => {
              console.log('[Item] Dragstart - editing flag:', item.dataset.editing);
              // Block drag if item is being edited
              if (item.dataset.editing === 'true') {
                console.log('[Item] Blocking dragstart - editing in progress');
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              console.log('[Media] Dragstart fired for ID:', id);
              e.dataTransfer.setData('text/media-id', id);
              e.dataTransfer.effectAllowed = 'copy';
              item.style.opacity = '0.5';
              document.body.classList.add('dragging-media');
            });
            item.addEventListener('dragend', () => {
              console.log('[Media] Dragend fired for ID:', id);
              item.style.opacity = '1';
              document.body.classList.remove('dragging-media');
              
              // Clean up all drag-over classes
              document.querySelectorAll('.uploadBox.drag-over').forEach(box => {
                box.classList.remove('drag-over');
              });
            });
            
            item.querySelector('.u-del').addEventListener('click', ()=>{ 
              const ix=ids.indexOf(id); 
              if(ix>-1){ 
                ids.splice(ix,1); 
                td.dataset.vaultIds=JSON.stringify(ids); 
                
                // Label remains in localStorage by media ID (intentional - may be reused)
                
                updateOverlay(); // Immediate update after splice
                persist(); 
                refresh(); 
              } 
            });
            grid.appendChild(item);
          }catch(e){}
        }
        updateOverlay(); // Update overlay after refresh completes
        
        // If force row height is on, re-apply row heights after images load
        if (document.body.classList.contains('force-row-height')) {
          // Wait for all images in this grid to load
          const images = grid.querySelectorAll('img.u-thumb');
          if (images.length > 0) {
            Promise.all(
              Array.from(images).map(img => {
                if (img.complete && img.naturalHeight > 0) return Promise.resolve();
                return new Promise(resolve => {
                  img.addEventListener('load', resolve, { once: true });
                  img.addEventListener('error', resolve, { once: true });
                  // Timeout fallback in case events don't fire
                  setTimeout(resolve, 1000);
                });
              })
            ).then(() => {
              // Add extra delay to ensure DOM has fully updated
              setTimeout(() => {
                if (typeof window.applyRowHeights === 'function') {
                  window.applyRowHeights();
                }
              }, 100);
            });
          } else {
            // No images, just apply with small delay
            setTimeout(() => {
              if (typeof window.applyRowHeights === 'function') {
                window.applyRowHeights();
              }
            }, 100);
          }
        }
      }
      btn && btn.addEventListener('click', ()=> fileInput && fileInput.click());
      
      // Remove any existing overlay first (in case buildUploadUI is called multiple times)
      const existingOverlay = box.querySelector('.u-add-overlay');
      if (existingOverlay) {
        console.log('[Media Overlay] Removing existing overlay');
        existingOverlay.remove();
      }
      
      // Add clickable + overlay for empty cells
      const addOverlay = document.createElement('div');
      addOverlay.className = 'u-add-overlay';
      
      // Add text label (not clickable)
      const label = document.createElement('span');
      label.className = 'u-add-label';
      label.textContent = 'CLICK TO ADD MEDIA';
      addOverlay.appendChild(label);
      
      // Add button (clickable)
      const button = document.createElement('button');
      button.className = 'u-add-button';
      button.textContent = '+';
      button.addEventListener('click', (e) => {
        console.log('[Media Overlay] Button clicked!');
        e.stopPropagation();
        fileInput && fileInput.click();
      });
      addOverlay.appendChild(button);
      
      box.appendChild(addOverlay);
      console.log('[Media Overlay] Created and appended to box');
      
      // Show/hide overlay based on whether cell has items
      const updateOverlay = () => {
        const actualItemCount = grid.querySelectorAll('.u-item').length;
        console.log('[Media Overlay] updateOverlay called, ids.length:', ids.length, 'actual items in grid:', actualItemCount);
        console.log('[Media Overlay] Overlay element:', addOverlay, 'classList before:', Array.from(addOverlay.classList));
        
        // Show overlay if grid is actually empty, even if ids array has stale data
        if (actualItemCount === 0) {
          addOverlay.classList.add('visible');
          console.log('[Media Overlay] Visible (grid empty), classList after:', Array.from(addOverlay.classList));
        } else {
          addOverlay.classList.remove('visible');
          console.log('[Media Overlay] Hidden (has items), classList after:', Array.from(addOverlay.classList));
        }
      };
      updateOverlay();
      
      fileInput && fileInput.addEventListener('change', async e=>{ const files=Array.from(e.target.files||[]); for(const f of files){ const id=await vaultPut(f); ids.push(id);} td.dataset.vaultIds=JSON.stringify(ids); persist(); await refresh(); fileInput.value=''; });
      refresh();
    }

    function hydrateTagsBox(td,val){
      // Delegate to TagManager's hydrateTagsBox to avoid duplication
      if (typeof TagManager.hydrateTagsBox === 'function') {
        TagManager.hydrateTagsBox(td, val);
      }
    }

    // Rows
    function makeRow(rowData){
      const tr=document.createElement('tr'); tr.className='row'; tr.draggable=false; // Only draggable from handle
      const rowId = rowData.id||uid();
      tr.id = rowId; // Set actual id attribute for getElementById
      tr.dataset.id = rowId; // Also keep in dataset for backwards compatibility
      tr.dataset.type=rowData.type||'EVENT';
      tr.dataset.anchorMode=rowData.anchorMode||(tr.dataset.type==='SUB'?'eventEnd':'start');
      tr.dataset.anchorId=rowData.anchorId||'';
      tr.dataset.callTimeDisplay=rowData.callTimeDisplay||'end';
      tr.dataset.mealWrapType=rowData.mealWrapType||'';
      
      // Check if this is a milestone event (Camera Wrap or Tail-lights)
      const mealWrapLower = (rowData.mealWrapType || '').toLowerCase();
      const isMilestone = mealWrapLower === 'camera wrap' || mealWrapLower === 'tail-lights';
      tr.dataset.isMilestone = isMilestone ? 'true' : '';
      
      // restore colors
      if(rowData.rowBg){ 
        tr.dataset.rowBg=rowData.rowBg; 
        tr.style.setProperty('--row-bg', rowData.rowBg);
        // Auto-set text color if not explicitly set
        if (!rowData.rowFg) {
          const autoFg = getContrastColor(rowData.rowBg);
          if (autoFg) tr.style.setProperty('--row-fg', autoFg);
        }
      }
      if(rowData.rowFg){ tr.dataset.rowFg=rowData.rowFg; tr.style.setProperty('--row-fg', rowData.rowFg); }
      if(rowData.subColor){ 
        tr.dataset.subColor=rowData.subColor; 
        tr.style.setProperty('--sub-bg', rowData.subColor);
        // Auto-set text color if not explicitly set
        if (!rowData.subFg) {
          const autoFg = getContrastColor(rowData.subColor);
          if (autoFg) tr.style.setProperty('--sub-fg', autoFg);
        }
      }
      if(rowData.subFg){ tr.dataset.subFg=rowData.subFg; tr.style.setProperty('--sub-fg', rowData.subFg); }
      
      // Store completed state in dataset only (SharpieManager will apply the class)
      if(rowData.completed) {
        tr.dataset.completed = 'true';
      }
      if(rowData.completedAt) {
        tr.dataset.completedAt = rowData.completedAt;
      }
      
      // Restore row-level formatting properties
      if(rowData.fontFamily) tr.dataset.fontFamily = rowData.fontFamily;
      if(rowData.fontSize) tr.dataset.fontSize = rowData.fontSize;
      if(rowData.bold) tr.dataset.bold = 'true';
      if(rowData.italic) tr.dataset.italic = 'true';
      if(rowData.underline) tr.dataset.underline = 'true';
      if(rowData.align) tr.dataset.align = rowData.align;
      if(rowData.valign) tr.dataset.valign = rowData.valign;

      const cells={}; const td=k=>{ const el=document.createElement('td'); el.dataset.key=k; return el; };
      cells.drag=td('drag'); cells.drag.className='drag'; cells.drag.textContent='⠿';
      
      // Enable dragging only when mouse is down on the drag handle
      cells.drag.addEventListener('mousedown', (e) => {
        tr.draggable = true;
      });
      
      cells.drag.addEventListener('mouseup', (e) => {
        tr.draggable = false;
      });
      
      // Also disable on mouse leave in case they drag off
      cells.drag.addEventListener('mouseleave', (e) => {
        if (e.buttons === 1) { // Left button is held
          // Keep draggable true during drag
        } else {
          tr.draggable = false;
        }
      });
      
      cells.idx=td('idx'); cells.idx.className='idx';
      
      // Apply formatting if it exists
      const idxFormatting = rowData.cellFormatting ? rowData.cellFormatting['idx'] : null;
      if (idxFormatting) {
        if (idxFormatting.align) cells.idx.style.setProperty('text-align', idxFormatting.align, 'important');
        if (idxFormatting.valign) cells.idx.style.setProperty('vertical-align', idxFormatting.valign, 'important');
      }
      
      // For SUB-SCHEDULE, CALL TIME, and milestone events, leave start cell blank instead of dash
      cells.start=td('start'); cells.start.className='start ampm'; 
      if(tr.dataset.type==='EVENT' && tr.dataset.isMilestone !== 'true') {
        cells.start.textContent='—';
      } else if(tr.dataset.type==='SEPARATOR') {
        cells.start.textContent='';
        cells.start.classList.add('separator-cell');
      }
      // CALL TIME, SUB, and milestones get blank start (time shown in end cell)
      
      // Apply formatting if it exists
      const startFormatting = rowData.cellFormatting ? rowData.cellFormatting['start'] : null;
      if (startFormatting) {
        if (startFormatting.align) cells.start.style.setProperty('text-align', startFormatting.align, 'important');
        if (startFormatting.valign) cells.start.style.setProperty('vertical-align', startFormatting.valign, 'important');
      }
      
      cells.end=td('end'); cells.end.className='end ampm'; 
      if(tr.dataset.type==='SEPARATOR') {
        cells.end.textContent='';
        cells.end.classList.add('separator-cell');
      } else {
        cells.end.textContent='—';
      }
      
      // Apply formatting if it exists
      const endFormatting = rowData.cellFormatting ? rowData.cellFormatting['end'] : null;
      if (endFormatting) {
        if (endFormatting.align) cells.end.style.setProperty('text-align', endFormatting.align, 'important');
        if (endFormatting.valign) cells.end.style.setProperty('vertical-align', endFormatting.valign, 'important');
      }
      
      cells.duration=td('duration');
      if(tr.dataset.type==='SUB'||tr.dataset.type==='CALL TIME'||tr.dataset.isMilestone==='true'){
        cells.duration.innerHTML=`<input class="offset" type="number" step="5" min="-10080" max="10080" value="${Number(rowData.offset||0)||0}">`;
        const offsetInput = cells.duration.querySelector('.offset');
        offsetInput.addEventListener('input', ()=>{ recalc(); persist(); });
        offsetInput.addEventListener('wheel', ()=>{ setTimeout(()=>{ recalc(); }, 0); });
        offsetInput.addEventListener('change', ()=>{ recalc(); persist(); });
      } else if(tr.dataset.type==='SEPARATOR'){
        // SEPARATOR has no duration input - purely visual pass-through
        cells.duration.innerHTML='';
        cells.duration.classList.add('separator-cell');
      } else {
        cells.duration.innerHTML=`<input class="duration" type="number" min="0" step="5" value="${Number(rowData.duration)||0}" title="OPTION + MOUSE WHEEL TO SCROLL">`;
        const durInput = cells.duration.querySelector('.duration');
        durInput.addEventListener('input', ()=>{ recalc(); persist(); });
        durInput.addEventListener('wheel', ()=>{ setTimeout(()=>{ recalc(); }, 0); });
        durInput.addEventListener('change', ()=>{ recalc(); persist(); });
      }
      
      // Apply formatting to DURATION cell if it exists
      const durationFormatting = rowData.cellFormatting ? rowData.cellFormatting['duration'] : null;
      if (durationFormatting) {
        if (durationFormatting.align) cells.duration.style.setProperty('text-align', durationFormatting.align, 'important');
        if (durationFormatting.valign) cells.duration.style.setProperty('vertical-align', durationFormatting.valign, 'important');
      }
      
      cells.type=td('type');
      if(tr.dataset.type==='SUB'){ 
        // SUB-SCHEDULE: clickable badge that opens anchor popover
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge sub-badge">SUB-SCHEDULE</button>
          </div>
        `;
        
        const badge = cells.type.querySelector('.type-badge');
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          showAnchorPopover(tr, badge);
        });
      }
      else if(tr.dataset.type==='CALL TIME'){
        // CALL TIME: clickable badge that opens anchor popover
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge call-badge">CALL TIME</button>
          </div>
        `;
        
        const badge = cells.type.querySelector('.type-badge');
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          showAnchorPopover(tr, badge);
        });
      }
      else if(tr.dataset.type==='SEPARATOR'){
        // SEPARATOR: non-clickable badge
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge separator-badge">SEPARATOR</button>
          </div>
        `;
        cells.type.classList.add('separator-cell');
      }
      else if(tr.dataset.isMilestone === 'true'){
        // MILESTONE (Camera Wrap, Tail-lights): just shows the designation, click to change
        const designation = rowData.mealWrapType || '';
        const badgeText = designation.toUpperCase();
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge milestone-badge">${badgeText}</button>
          </div>
        `;
        
        const badge = cells.type.querySelector('.type-badge');
        // Click opens designation menu to change or clear
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const existingMenu = document.querySelector('.meal-wrap-menu');
          if (existingMenu) existingMenu.remove();
          
          const menu = document.createElement('div');
          menu.className = 'popover meal-wrap-menu is-open';
          menu.innerHTML = `
            <div style="padding: 6px;">
              <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; color: var(--muted);">Change Designation</div>
              <button class="meal-wrap-option" data-type="1st meal">1st Meal</button>
              <button class="meal-wrap-option" data-type="2nd meal">2nd Meal</button>
              <button class="meal-wrap-option" data-type="camera wrap">Camera Wrap</button>
              <button class="meal-wrap-option" data-type="tail-lights">Tail-Lights</button>
              <button class="meal-wrap-option meal-wrap-clear" data-type="">Clear (Back to Event)</button>
            </div>
          `;
          
          const rect = badge.getBoundingClientRect();
          menu.style.left = rect.left + 'px';
          menu.style.top = (rect.bottom + 4) + 'px';
          
          document.body.appendChild(menu);
          
          menu.querySelectorAll('.meal-wrap-option').forEach(opt => {
            opt.addEventListener('click', () => {
              const type = opt.dataset.type;
              rowData.mealWrapType = type;
              tr.dataset.mealWrapType = type;
              persist();
              loadDay(getActiveDayId());
              menu.remove();
            });
          });
          
          setTimeout(() => {
            const closeMenu = (e) => {
              if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
              }
            };
            document.addEventListener('click', closeMenu);
          }, 0);
        });
      }
      else {
        // EVENT: badge button opens meal/wrap designation menu
        const designation = rowData.mealWrapType || '';
        const badgeText = designation ? designation.toUpperCase() : 'EVENT';
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge event-badge ${designation ? 'has-designation' : ''}">${badgeText}</button>
          </div>
        `;
        
        const badge = cells.type.querySelector('.type-badge');
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Create popover menu
          const existingMenu = document.querySelector('.meal-wrap-menu');
          if (existingMenu) existingMenu.remove();
          
          const menu = document.createElement('div');
          menu.className = 'popover meal-wrap-menu is-open';
          menu.innerHTML = `
            <div style="padding: 6px;">
              <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; color: var(--muted);">Meal/Wrap Designation</div>
              <button class="meal-wrap-option" data-type="1st meal">1st Meal</button>
              <button class="meal-wrap-option" data-type="2nd meal">2nd Meal</button>
              <button class="meal-wrap-option" data-type="camera wrap">Camera Wrap</button>
              <button class="meal-wrap-option" data-type="tail-lights">Tail-Lights</button>
              ${designation ? '<button class="meal-wrap-option meal-wrap-clear" data-type="">Clear Designation</button>' : ''}
            </div>
          `;
          
          // Position menu near button
          const rect = badge.getBoundingClientRect();
          menu.style.left = rect.left + 'px';
          menu.style.top = (rect.bottom + 4) + 'px';
          
          document.body.appendChild(menu);
          
          // Handle option clicks
          menu.querySelectorAll('.meal-wrap-option').forEach(opt => {
            opt.addEventListener('click', () => {
              const type = opt.dataset.type;
              rowData.mealWrapType = type;
              tr.dataset.mealWrapType = type;
              persist();
              loadDay(getActiveDayId());
              menu.remove();
            });
          });
          
          // Close on outside click
          setTimeout(() => {
            const closeMenu = (e) => {
              if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
              }
            };
            document.addEventListener('click', closeMenu);
          }, 0);
        });
      }

      // Apply formatting to TYPE cell if it exists
      const typeFormatting = rowData.cellFormatting ? rowData.cellFormatting['type'] : null;
      if (typeFormatting) {
        if (typeFormatting.align) cells.type.style.setProperty('text-align', typeFormatting.align, 'important');
        if (typeFormatting.valign) cells.type.style.setProperty('vertical-align', typeFormatting.valign, 'important');
      }

      cells.actions=td('actions'); cells.actions.className='actions';
      // Check both rowData.completed AND SharpieManager state
      const isComplete = rowData.completed || (typeof SharpieManager !== 'undefined' && SharpieManager.isMarked(rowId));
      console.log('[makeRow] Creating button for', rowId, '- isComplete:', isComplete, '- rowData.completed:', rowData.completed, '- SharpieManager.isMarked:', typeof SharpieManager !== 'undefined' ? SharpieManager.isMarked(rowId) : 'N/A');
      cells.actions.innerHTML=`<div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end; width: fit-content; margin-left: auto;"><button class="sharpie ${isComplete ? 'active' : ''}" title="Mark Complete"><svg width="12" height="12" viewBox="0 0 20 20" style="display: block;"><g transform="rotate(180 10 10)"><path d="M 18 2 L 16 4 L 14 6 L 16 8 L 18 6 L 20 4 Z" fill="#dc2626"/><path d="M 16 4 L 14 6 L 8 12 L 10 14 L 16 8 L 18 6 Z" fill="#d1d5db"/><path d="M 14 6 L 8 12 L 10 14 L 16 8 Z" fill="#9ca3af"/><path d="M 8 12 L 10 14 L 7 17 L 4 20 L 0 16 L 3 13 L 6 10 Z" fill="#dc2626"/><path d="M 7 17 L 4 20 L 0 16 L 3 13 Z" fill="#b91c1c"/></g></svg></button><button class="dup" title="Duplicate">⎘</button><button class="del" title="Delete">✕</button></div>`;
      
      // Log button sizes immediately after creation
      const actionButtons = cells.actions.querySelectorAll('button');
      actionButtons.forEach((btn, idx) => {
        const computed = window.getComputedStyle(btn);
        console.log(`[makeRow] Button ${idx} (${btn.className}) initial size: ${computed.width} x ${computed.height}, padding: ${computed.padding}`);
      });
      
      // Verify button was created with correct class
      const createdButton = cells.actions.querySelector('.sharpie');
      if (createdButton && isComplete) {
        console.log('[makeRow] Verification - button has active class:', createdButton.classList.contains('active'));
      }
      
      // Sharpie button - mark row as complete
      cells.actions.querySelector('.sharpie').addEventListener('click', (e)=>{
        e.stopPropagation();
        
        const rowId = tr.id || tr.dataset.id;
        if (!rowId) {
          console.error('[Sharpie] Row has no ID');
          return;
        }
        
        // SharpieManager.toggle() handles everything: class, dataset, button state
        if (typeof SharpieManager !== 'undefined') {
          SharpieManager.toggle(rowId);
        } else {
          console.error('[Sharpie] SharpieManager not loaded');
        }
        
        persist();
      });
      
      cells.actions.querySelector('.dup').addEventListener('click', ()=>{
        // Collect cell formatting from original row
        const cellFormatting = {};
        tr.querySelectorAll('td[data-key]').forEach(td => {
          const key = td.dataset.key;
          if (key === 'drag' || key === 'actions') return;
          
          if (td.dataset.fontFamily || td.dataset.fontSize || td.dataset.bold || 
              td.dataset.italic || td.dataset.underline || td.dataset.align || td.dataset.valign ||
              td.dataset.cellFg || td.dataset.cellBg ||
              td.dataset.borderTop || td.dataset.borderRight || 
              td.dataset.borderBottom || td.dataset.borderLeft) {
            cellFormatting[key] = {
              fontFamily: td.dataset.fontFamily || '',
              fontSize: td.dataset.fontSize || '',
              bold: td.dataset.bold === 'true',
              italic: td.dataset.italic === 'true',
              underline: td.dataset.underline === 'true',
              align: td.dataset.align || '',
              valign: td.dataset.valign || '',
              fgColor: td.dataset.cellFg || '',
              bgColor: td.dataset.cellBg || '',
              borderTop: td.dataset.borderTop || '',
              borderRight: td.dataset.borderRight || '',
              borderBottom: td.dataset.borderBottom || '',
              borderLeft: td.dataset.borderLeft || ''
            };
          }
        });
        
        const newRow = makeRow({
          id: uid(), type: tr.dataset.type,
          duration: tr.querySelector('.duration')?.value ?? 0, offset: tr.querySelector('.offset')?.value ?? 0,
          anchorMode: tr.dataset.anchorMode, anchorId: tr.dataset.anchorId,
          subColor: tr.dataset.subColor || '', subFg: tr.dataset.subFg || '',
          rowBg: tr.dataset.rowBg || '', rowFg: tr.dataset.rowFg || '',
          cellFormatting: cellFormatting,
          custom: getRowCustomFromDOM(tr)
        });
        tr.after(newRow);
        applyColumnVisibilityToRow(newRow); // Apply current column visibility
        updateDragHandles(); // Update to new 3x3 grid format
        
        // Copy row height from original
        const heights = getRowH();
        const origId = tr.dataset.id;
        const newId = newRow.dataset.id;
        if (heights[origId]) {
          heights[newId] = heights[origId];
          setRowH(heights);
        }
        
        if(tr.dataset.type==='SUB'){
          const kids=collectChildren(tr);
          kids.forEach(k=>{
            // Collect cell formatting from child
            const childCellFormatting = {};
            k.querySelectorAll('td[data-key]').forEach(td => {
              const key = td.dataset.key;
              if (key === 'drag' || key === 'actions') return;
              
              if (td.dataset.fontFamily || td.dataset.fontSize || td.dataset.bold || 
                  td.dataset.italic || td.dataset.underline || td.dataset.align || td.dataset.valign ||
                  td.dataset.cellFg || td.dataset.cellBg ||
                  td.dataset.borderTop || td.dataset.borderRight || 
                  td.dataset.borderBottom || td.dataset.borderLeft) {
                childCellFormatting[key] = {
                  fontFamily: td.dataset.fontFamily || '',
                  fontSize: td.dataset.fontSize || '',
                  bold: td.dataset.bold === 'true',
                  italic: td.dataset.italic === 'true',
                  underline: td.dataset.underline === 'true',
                  align: td.dataset.align || '',
                  valign: td.dataset.valign || '',
                  fgColor: td.dataset.cellFg || '',
                  bgColor: td.dataset.cellBg || '',
                  borderTop: td.dataset.borderTop || '',
                  borderRight: td.dataset.borderRight || '',
                  borderBottom: td.dataset.borderBottom || '',
                  borderLeft: td.dataset.borderLeft || ''
                };
              }
            });
            
            const kidData={ 
              id:uid(), 
              duration:k.querySelector('.subDur').value,
              subChildColor: k.dataset.subChildColor || '', 
              subChildFg: k.dataset.subChildFg || '',
              cellFormatting: childCellFormatting,
              custom: getRowCustomFromDOM(k) 
            };
            const clone=makeSubChildRow(newRow, kidData); 
            newRow.after(clone);
            applyColumnVisibilityToRow(clone); // Apply current column visibility to sub-children
            
            // Copy row height from original child
            const childOrigId = k.dataset.id;
            const childNewId = clone.dataset.id;
            if (heights[childOrigId]) {
              heights[childNewId] = heights[childOrigId];
              setRowH(heights);
            }
          });
        }
        renumber(); recalc(); persist(); refreshAnchorSelectors();
      });
      cells.actions.querySelector('.del').addEventListener('click', ()=>{
        if(tr.dataset.type==='SUB'){ collectChildren(tr).forEach(k=> k.remove()); }
        tr.remove(); renumber(); recalc(); persist(); refreshAnchorSelectors();
      });

      // Append all cells in sorted column order
      const allCols = getAllColumnsSorted();
      
      // SEPARATOR rows get a completely different structure
      if (tr.dataset.type === 'SEPARATOR') {
        // Set default background if not already set
        const bgColor = rowData.rowBg || '#374151';
        const fgColor = rowData.rowFg || '#ffffff';
        
        tr.dataset.rowBg = bgColor;
        tr.dataset.rowFg = fgColor;
        tr.style.setProperty('--row-bg', bgColor);
        tr.style.setProperty('--row-fg', fgColor);
        // Also set inline style for print compatibility
        tr.style.backgroundColor = bgColor;
        
        // Count columns for colspan (all except drag and actions)
        const middleColCount = allCols.filter(c => c.key !== 'drag' && c.key !== 'actions').length;
        
        // Drag cell - also set background for consistency
        cells.drag.style.backgroundColor = bgColor;
        cells.drag.style.color = fgColor;
        cells.drag.style.borderColor = bgColor;
        tr.appendChild(cells.drag);
        
        // Single spanning cell with editable text
        const spanCell = document.createElement('td');
        spanCell.className = 'separator-span-cell';
        spanCell.setAttribute('colspan', middleColCount);
        spanCell.dataset.key = 'separator-content';
        // Set inline styles for print
        spanCell.style.backgroundColor = bgColor;
        spanCell.style.borderColor = bgColor;
        
        const separatorText = rowData.separatorText || '';
        spanCell.innerHTML = `<div class="separator-text" contenteditable="true" data-placeholder="Enter separator text...">${separatorText}</div>`;
        
        // Apply separator text formatting if exists
        const sepFormatting = rowData.separatorFormatting || {};
        const textEl = spanCell.querySelector('.separator-text');
        textEl.style.color = sepFormatting.fgColor || fgColor;
        if (sepFormatting.fontFamily) textEl.style.fontFamily = sepFormatting.fontFamily;
        if (sepFormatting.fontSize) textEl.style.fontSize = sepFormatting.fontSize;
        if (sepFormatting.bold) textEl.style.fontWeight = 'bold';
        if (sepFormatting.italic) textEl.style.fontStyle = 'italic';
        if (sepFormatting.underline) textEl.style.textDecoration = 'underline';
        if (sepFormatting.align) textEl.style.textAlign = sepFormatting.align;
        
        textEl.addEventListener('input', persist);
        textEl.addEventListener('click', (e) => e.stopPropagation());
        
        tr.appendChild(spanCell);
        
        // Actions cell - also set background
        cells.actions.style.backgroundColor = bgColor;
        cells.actions.style.borderColor = bgColor;
        tr.appendChild(cells.actions);
        
      } else {
        // Normal row - append all cells in sorted column order
        allCols.forEach(col => {
          if (col.key === 'drag') {
            tr.appendChild(cells.drag);
          }
          else if (col.key === 'idx') {
            tr.appendChild(cells.idx);
          }
          else if (col.key === 'start') {
            tr.appendChild(cells.start);
          }
          else if (col.key === 'end') {
            tr.appendChild(cells.end);
          }
          else if (col.key === 'duration') {
            tr.appendChild(cells.duration);
          }
          else if (col.key === 'type') {
            tr.appendChild(cells.type);
          }
          else if (col.key === 'actions') {
            tr.appendChild(cells.actions);
          }
          else {
            // Custom column - need to create it here inline
            const customCols = [col];
            customCols.forEach(c => {
              const td=document.createElement('td'); td.dataset.key=c.key;
              td.className = 'custom-cell';
              if(c.show===false) td.style.visibility = 'collapse';
              if(c.print===false) td.classList.add('col-print-hide');
              const cellData = ((rowData.custom||{})[c.key])||'';
              
              let val = '';
              // Get cell formatting from rowData.cellFormatting, not from cellData
              let cellFormatting = rowData.cellFormatting ? rowData.cellFormatting[c.key] : null;
              console.log(`[makeRow] Cell ${c.key} formatting:`, cellFormatting);
              
              if (typeof cellData === 'object' && cellData.value !== undefined) {
                val = cellData.value;
                // Override with cellData.formatting if it exists (backwards compatibility)
                if (cellData.formatting) {
                  cellFormatting = cellData.formatting;
                }
              } else {
                val = cellData;
              }
              
              if(c.type==='separator'){
                td.dataset.type = 'separator';
                // Hide separator for CALL TIME, SUB-SCHEDULE, and milestone rows
                const rowType = tr.dataset.type;
                const isMilestone = tr.dataset.isMilestone === 'true';
                if (rowType === 'CALL TIME' || rowType === 'SUB' || isMilestone) {
                  td.textContent = '';
                } else {
                  td.textContent = c.separatorChar || '—';
                }
                td.style.textAlign = 'center';
              } else if(c.type==='text'){
              // Ensure val is a string for contenteditable divs
              const textVal = (val == null) ? '' : String(val);
              
              td.innerHTML=`<div class="cell-wrapper">
                <div class="cc-input" contenteditable="true" data-ckey="${c.key}" data-placeholder="${c.label||''}" title="CLICK TO EDIT | OPTION + CLICK TO SELECT CELL">${textVal}</div>
                
              </div>`;
              
              if (cellFormatting) {
                if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
                if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
                if (cellFormatting.bold) td.dataset.bold = 'true';
                if (cellFormatting.italic) td.dataset.italic = 'true';
                if (cellFormatting.underline) td.dataset.underline = 'true';
                if (cellFormatting.align) td.dataset.align = cellFormatting.align;
                if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
                  td.dataset.cellFg = cellFormatting.fgColor;
                }
                if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
                  td.dataset.cellBg = cellFormatting.bgColor;
                }
              }
              
              const editableDiv = td.querySelector('[contenteditable]');
              
              if (editableDiv) {
                // Apply row-level formatting first (fonts and alignment only)
                if (rowData.fontFamily) editableDiv.style.fontFamily = rowData.fontFamily;
                if (rowData.fontSize) editableDiv.style.fontSize = rowData.fontSize;
                if (rowData.bold) editableDiv.style.fontWeight = 'bold';
                if (rowData.italic) editableDiv.style.fontStyle = 'italic';
                if (rowData.underline) editableDiv.style.textDecoration = 'underline';
                if (rowData.align) editableDiv.style.textAlign = rowData.align;
                
                if (rowData.valign) {
                  editableDiv.style.display = 'flex';
                  editableDiv.style.flexDirection = 'column';
                  if (rowData.valign === 'top') editableDiv.style.justifyContent = 'flex-start';
                  else if (rowData.valign === 'middle') editableDiv.style.justifyContent = 'center';
                  else if (rowData.valign === 'bottom') editableDiv.style.justifyContent = 'flex-end';
                }
                
                // Override with cell-level formatting
                if (cellFormatting) {
                  if (cellFormatting.fontFamily) editableDiv.style.fontFamily = cellFormatting.fontFamily;
                  if (cellFormatting.fontSize) editableDiv.style.fontSize = cellFormatting.fontSize;
                  if (cellFormatting.bold) editableDiv.style.fontWeight = 'bold';
                  if (cellFormatting.italic) editableDiv.style.fontStyle = 'italic';
                  if (cellFormatting.underline) editableDiv.style.textDecoration = 'underline';
                  if (cellFormatting.align) editableDiv.style.textAlign = cellFormatting.align;
                  
                  if (cellFormatting.valign) {
                    editableDiv.style.display = 'flex';
                    editableDiv.style.flexDirection = 'column';
                    if (cellFormatting.valign === 'top') editableDiv.style.justifyContent = 'flex-start';
                    else if (cellFormatting.valign === 'middle') editableDiv.style.justifyContent = 'center';
                    else if (cellFormatting.valign === 'bottom') editableDiv.style.justifyContent = 'flex-end';
                  }
                  
                  // Cell colors - only set if explicitly defined
                  if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                    editableDiv.style.color = cellFormatting.fgColor;
                  }
                  if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                    editableDiv.style.backgroundColor = cellFormatting.bgColor;
                  }
                }
              }
              
              // Restore borders using BorderDesigner
              if (cellFormatting && (cellFormatting.borderTop !== undefined || cellFormatting.borderRight !== undefined || 
                  cellFormatting.borderBottom !== undefined || cellFormatting.borderLeft !== undefined)) {
                BorderDesigner.applyBordersToCell(td, cellFormatting);
              }
              
              td.querySelector('.cc-input')?.addEventListener('input', persist);
              
            } else if(c.type==='upload'){
              td.innerHTML=`<div class="uploadBox">
                <div class="u-grid"></div>
                <button class="ghost u-add">+</button>
                <input type="file" class="u-file" accept="image/*,video/*" multiple hidden/>
              </div>`;
              const ids=Array.isArray(val)?val:(typeof val==='string'&&val.startsWith('[')?JSON.parse(val):[]);
              td.dataset.vaultIds=JSON.stringify(ids); 
              buildUploadUI(td,ids);
            } else if(c.type==='tags'){
              td.innerHTML=`<div class="tagsBox"><div class="tags-pills"></div><textarea class="cc-input tags-value" data-ckey="${c.key}" hidden>${val}</textarea></div>`;
              
              // Apply cell formatting to tags cell
              if (cellFormatting) {
                if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
                if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
                if (cellFormatting.bold) td.dataset.bold = 'true';
                if (cellFormatting.italic) td.dataset.italic = 'true';
                if (cellFormatting.underline) td.dataset.underline = 'true';
                if (cellFormatting.align) td.dataset.align = cellFormatting.align;
                if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
                  td.dataset.cellFg = cellFormatting.fgColor;
                }
                if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
                  td.dataset.cellBg = cellFormatting.bgColor;
                }
                
                // Apply styles to TD for background
                if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                  td.style.setProperty('background-color', cellFormatting.bgColor, 'important');
                }
                if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                  td.style.setProperty('color', cellFormatting.fgColor, 'important');
                }
                
                // Restore borders using BorderDesigner
                if (cellFormatting.borderTop !== undefined || cellFormatting.borderRight !== undefined || 
                    cellFormatting.borderBottom !== undefined || cellFormatting.borderLeft !== undefined) {
                  BorderDesigner.applyBordersToCell(td, cellFormatting);
                }
              }
              
              hydrateTagsBox(td,val);
            } else {
              td.innerHTML=`<input class="cc-input" data-ckey="${c.key}" type="text" placeholder="${c.label||''}" value="${val}"/>`;
              td.querySelector('.cc-input')?.addEventListener('input', persist);
            }
            
            // Apply default borders to custom column cells
            
            tr.appendChild(td);
          });
        }
      });
      } // Close else block for non-SEPARATOR rows

      tr.addEventListener('dragstart', e=>{ 
        // Don't drag row if dragging media item or tag pill
        if (e.target.closest('.u-item') || e.target.closest('.tag-pill')) {
          e.stopPropagation();
          return;
        }
        
        beginAction();
        if(tr.classList.contains('subchild')) return;
        
        // Handle multi-select drag
        if (selectedRows.size > 1 && selectedRows.has(tr)) {
          tr._multiDrag = Array.from(selectedRows);
          tr._multiDrag.forEach(row => row.classList.add('dragging'));
        } else {
          tr.classList.add('dragging');
        }
        
        e.dataTransfer.effectAllowed='move';
        if(tr.dataset.type==='SUB'){ tr._dragKids=collectChildren(tr); tr._dragKids.forEach(k=>k.classList.add('attached')); }
      });
      tr.addEventListener('dragend', ()=>{ endAction();
        // Disable dragging until next mousedown on handle
        tr.draggable = false;
        
        // Clear multi-drag
        if (tr._multiDrag) {
          tr._multiDrag.forEach(row => row.classList.remove('dragging'));
          tr._multiDrag = null;
        } else {
          tr.classList.remove('dragging');
        }
        
        if(tr.dataset.type==='SUB'&&Array.isArray(tr._dragKids)){ let ref=tr; tr._dragKids.forEach(k=>{ ref.after(k); k.classList.remove('attached'); ref=k; }); tr._dragKids=null; }
        renumber(); recalc(); refreshAnchorSelectors(); persist();
      });
      
      // Row selection is now handled by table-level mousedown handler
      cells.drag.style.cursor = 'pointer';
      cells.drag.title = 'Click to select | Shift/Cmd+click to multi-select | Drag to reorder';

      if(rowData.type==='SUB' && Array.isArray(rowData.children)){ 
        tr._pendingChildren=rowData.children.map(ch=> makeSubChildRow(tr, ch));
      }
      tr.classList.toggle('subheader', tr.dataset.type==='SUB');
      tr.classList.toggle('separator-row', tr.dataset.type==='SEPARATOR');
      
      // Restore cell-based formatting if present
      if (rowData.cellFormatting) {
        Object.keys(rowData.cellFormatting).forEach(key => {
          const cell = tr.querySelector(`td[data-key="${key}"]`);
          if (cell) {
            applyFormatting(cell, rowData.cellFormatting[key]);
          }
        });
      }
      
      return tr;
    }

    function makeSubChildRow(parentTr, child){
      const tr=document.createElement('tr'); tr.className='row subchild'; tr.dataset.parent=parentTr.dataset.id; 
      tr.id = child.id; // Set actual id attribute for getElementById
      tr.dataset.id=child.id; // Also keep in dataset for backwards compatibility
      tr.draggable=false; // Only draggable from handle
      tr.dataset.subType = child.subType || 'event'; // Track sub-event type
      if(child.subChildColor){ tr.dataset.subChildColor=child.subChildColor; tr.style.setProperty('--subchild-bg', child.subChildColor); }
      else if(parentTr.dataset.subColor){ tr.style.setProperty('--subchild-bg', parentTr.dataset.subColor); }
      if(child.subChildFg){ 
        tr.dataset.subChildFg=child.subChildFg; 
        tr.style.setProperty('--subchild-fg', child.subChildFg); 
      } else {
        // Default to white text for subevents
        tr.dataset.subChildFg='#ffffff';
        tr.style.setProperty('--subchild-fg', '#ffffff');
      }
      
      // Store completed state in dataset only (SharpieManager will apply the class)
      if(child.completed) {
        tr.dataset.completed = 'true';
      }
      if(child.completedAt) {
        tr.dataset.completedAt = child.completedAt;
      }
      if(child.mealWrapType) {
        tr.dataset.mealWrapType = child.mealWrapType;
      }
      
      // Restore child row-level formatting properties
      if(child.fontFamily) tr.dataset.fontFamily = child.fontFamily;
      if(child.fontSize) tr.dataset.fontSize = child.fontSize;
      if(child.bold) tr.dataset.bold = 'true';
      if(child.italic) tr.dataset.italic = 'true';
      if(child.underline) tr.dataset.underline = 'true';
      if(child.align) tr.dataset.align = child.align;
      if(child.valign) tr.dataset.valign = child.valign;

      const td=k=>{ const el=document.createElement('td'); el.dataset.key=k; return el; };
      const cells={};
      cells.drag=td('drag'); cells.drag.className='drag'; cells.drag.title='Drag sub-event';
      
      // Enable dragging only when mouse is down on the drag handle
      cells.drag.addEventListener('mousedown', (e) => {
        tr.draggable = true;
      });
      
      cells.drag.addEventListener('mouseup', (e) => {
        tr.draggable = false;
      });
      
      cells.drag.addEventListener('mouseleave', (e) => {
        if (e.buttons === 1) { // Left button is held
          // Keep draggable true during drag
        } else {
          tr.draggable = false;
        }
      });
      
      cells.idx=td('idx'); cells.idx.className='idx';
      
      // Apply formatting if it exists
      const idxFormatting = child.cellFormatting ? child.cellFormatting['idx'] : null;
      if (idxFormatting) {
        if (idxFormatting.align) cells.idx.style.setProperty('text-align', idxFormatting.align, 'important');
        if (idxFormatting.valign) cells.idx.style.setProperty('vertical-align', idxFormatting.valign, 'important');
      }
      
      cells.start=td('start'); cells.start.className='start ampm'; cells.start.textContent='—';
      
      // Apply formatting if it exists
      const startFormatting = child.cellFormatting ? child.cellFormatting['start'] : null;
      if (startFormatting) {
        if (startFormatting.align) cells.start.style.setProperty('text-align', startFormatting.align, 'important');
        if (startFormatting.valign) cells.start.style.setProperty('vertical-align', startFormatting.valign, 'important');
      }
      
      cells.end=td('end'); cells.end.className='end ampm'; cells.end.textContent='—';
      
      // Apply formatting if it exists
      const endFormatting = child.cellFormatting ? child.cellFormatting['end'] : null;
      if (endFormatting) {
        if (endFormatting.align) cells.end.style.setProperty('text-align', endFormatting.align, 'important');
        if (endFormatting.valign) cells.end.style.setProperty('vertical-align', endFormatting.valign, 'important');
      }
      
      // Duration/Offset field - changes based on subType
      cells.duration=td('duration');
      const subType = child.subType || 'event';
      if(subType === 'call'){
        cells.duration.innerHTML=`<input class="subOffset" type="number" step="5" value="${Number(child.offset)||0}" placeholder="±min">`;
        const subOffsetInput = cells.duration.querySelector('.subOffset');
        subOffsetInput.addEventListener('input', ()=>{ recalc(); persist(); });
        subOffsetInput.addEventListener('wheel', ()=>{ setTimeout(()=>{ recalc(); }, 0); });
        subOffsetInput.addEventListener('change', ()=>{ recalc(); persist(); });
      } else {
        cells.duration.innerHTML=`<input class="subDur" type="number" min="0" step="5" value="${Number(child.duration)||0}" title="OPTION + MOUSE WHEEL TO SCROLL">`;
        const subDurInput = cells.duration.querySelector('.subDur');
        subDurInput.addEventListener('input', ()=>{ recalc(); persist(); });
        subDurInput.addEventListener('wheel', ()=>{ setTimeout(()=>{ recalc(); }, 0); });
        subDurInput.addEventListener('change', ()=>{ recalc(); persist(); });
      }
      
      // Apply formatting to DURATION cell if it exists
      const durationFormatting = child.cellFormatting ? child.cellFormatting['duration'] : null;
      if (durationFormatting) {
        if (durationFormatting.align) cells.duration.style.setProperty('text-align', durationFormatting.align, 'important');
        if (durationFormatting.valign) cells.duration.style.setProperty('vertical-align', durationFormatting.valign, 'important');
      }
      
      // Add type badge for sub-events (no changing allowed)
      cells.type=td('type'); 
      if(subType === 'call') {
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge call-badge sub-call-badge">CALL</button>
          </div>
        `;
        
        // Make call badge clickable for Include in Header toggle
        const badge = cells.type.querySelector('.type-badge');
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          showSubCallPopover(tr, badge);
        });
      } else {
        // SUB-EVENT: badge button opens meal/wrap designation menu
        const designation = child.mealWrapType || '';
        const badgeText = designation ? designation.toUpperCase() : 'EVENT';
        cells.type.innerHTML=`
          <div class="type-cell-wrapper">
            <button class="type-badge event-badge sub-event-badge ${designation ? 'has-designation' : ''}">${badgeText}</button>
          </div>
        `;
        
        const badge = cells.type.querySelector('.type-badge');
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Create popover menu
          const existingMenu = document.querySelector('.meal-wrap-menu');
          if (existingMenu) existingMenu.remove();
          
          const menu = document.createElement('div');
          menu.className = 'popover meal-wrap-menu is-open';
          menu.innerHTML = `
            <div style="padding: 6px;">
              <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; color: var(--muted);">Meal/Wrap Designation</div>
              <button class="meal-wrap-option" data-type="1st meal">1st Meal</button>
              <button class="meal-wrap-option" data-type="2nd meal">2nd Meal</button>
              <button class="meal-wrap-option" data-type="camera wrap">Camera Wrap</button>
              <button class="meal-wrap-option" data-type="tail-lights">Tail-Lights</button>
              ${designation ? '<button class="meal-wrap-option meal-wrap-clear" data-type="">Clear Designation</button>' : ''}
            </div>
          `;
          
          // Position menu near button
          const rect = badge.getBoundingClientRect();
          menu.style.left = rect.left + 'px';
          menu.style.top = (rect.bottom + 4) + 'px';
          
          document.body.appendChild(menu);
          
          // Handle option clicks
          menu.querySelectorAll('.meal-wrap-option').forEach(opt => {
            opt.addEventListener('click', () => {
              const type = opt.dataset.type;
              child.mealWrapType = type;
              tr.dataset.mealWrapType = type;
              persist();
              loadDay(getActiveDayId());
              menu.remove();
            });
          });
          
          // Close on outside click
          setTimeout(() => {
            const closeMenu = (e) => {
              if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
              }
            };
            document.addEventListener('click', closeMenu);
          }, 0);
        });
      }
      
      // Apply formatting to TYPE cell if it exists
      const typeFormatting = child.cellFormatting ? child.cellFormatting['type'] : null;
      if (typeFormatting) {
        if (typeFormatting.align) cells.type.style.setProperty('text-align', typeFormatting.align, 'important');
        if (typeFormatting.valign) cells.type.style.setProperty('vertical-align', typeFormatting.valign, 'important');
      }
      
      // Drag handle - 3x3 grid of dots
      cells.drag.innerHTML = `<div class="drag-dots"></div>`;

      cells.actions=td('actions'); cells.actions.className='actions'; 
      // Check both child.completed AND SharpieManager state
      const isComplete = child.completed || (typeof SharpieManager !== 'undefined' && SharpieManager.isMarked(child.id));
      cells.actions.innerHTML=`<div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end; width: fit-content; margin-left: auto;"><button class="sharpie ${isComplete ? 'active' : ''}" title="Mark Complete"><svg width="12" height="12" viewBox="0 0 20 20" style="display: block;"><g transform="rotate(180 10 10)"><path d="M 18 2 L 16 4 L 14 6 L 16 8 L 18 6 L 20 4 Z" fill="#dc2626"/><path d="M 16 4 L 14 6 L 8 12 L 10 14 L 16 8 L 18 6 Z" fill="#d1d5db"/><path d="M 14 6 L 8 12 L 10 14 L 16 8 Z" fill="#9ca3af"/><path d="M 8 12 L 10 14 L 7 17 L 4 20 L 0 16 L 3 13 L 6 10 Z" fill="#dc2626"/><path d="M 7 17 L 4 20 L 0 16 L 3 13 Z" fill="#b91c1c"/></g></svg></button><button class="dup">⎘</button><button class="del">✕</button></div>`;
      
      // Sharpie button - mark row as complete
      cells.actions.querySelector('.sharpie').addEventListener('click', (e)=>{
        e.stopPropagation();
        
        const rowId = tr.id || tr.dataset.id;
        if (!rowId) {
          console.error('[Sharpie] Sub-child row has no ID');
          return;
        }
        
        // SharpieManager.toggle() handles everything: class, dataset, button state
        if (typeof SharpieManager !== 'undefined') {
          SharpieManager.toggle(rowId);
        } else {
          console.error('[Sharpie] SharpieManager not loaded');
        }
        
        persist();
      });
      
      cells.actions.querySelector('.dup').addEventListener('click', ()=>{
        // Collect cell formatting from original
        const cellFormatting = {};
        tr.querySelectorAll('td[data-key]').forEach(td => {
          const key = td.dataset.key;
          if (key === 'drag' || key === 'actions') return;
          
          if (td.dataset.fontFamily || td.dataset.fontSize || td.dataset.bold || 
              td.dataset.italic || td.dataset.underline || td.dataset.align ||
              td.dataset.cellFg || td.dataset.cellBg) {
            cellFormatting[key] = {
              fontFamily: td.dataset.fontFamily || '',
              fontSize: td.dataset.fontSize || '',
              bold: td.dataset.bold === 'true',
              italic: td.dataset.italic === 'true',
              underline: td.dataset.underline === 'true',
              align: td.dataset.align || '',
              fgColor: td.dataset.cellFg || '',
              bgColor: td.dataset.cellBg || ''
            };
          }
        });
        
        const subType = tr.dataset.subType||'event';
        const childData = { 
          id:uid(), 
          subType: subType,
          subChildColor: tr.dataset.subChildColor||'', 
          subChildFg: tr.dataset.subChildFg||'',
          cellFormatting: cellFormatting,
          custom: getRowCustomFromDOM(tr) 
        };
        // Copy either duration or offset depending on type
        if(subType === 'call'){
          childData.offset = cells['duration'].querySelector('.subOffset')?.value || 0;
          childData.duration = 0;
        } else {
          childData.duration = cells['duration'].querySelector('.subDur')?.value || 0;
          childData.offset = 0;
        }
        const clone=makeSubChildRow(parentTr, childData);
        tr.after(clone); 
        applyColumnVisibilityToRow(clone); // Apply current column visibility
        updateDragHandles(); // Update to new 3x3 grid format
        
        // Copy row height from original
        const heights = getRowH();
        const origId = tr.dataset.id;
        const newId = clone.dataset.id;
        if (heights[origId]) {
          heights[newId] = heights[origId];
          setRowH(heights);
        }
        
        renumber(); recalc(); persist();
      });
      cells.actions.querySelector('.del').addEventListener('click', ()=>{ tr.remove(); renumber(); recalc(); persist(); });

      // Append all cells in sorted column order
      const allCols = getAllColumnsSorted();
      allCols.forEach(col => {
        if (col.key === 'drag') {
          tr.appendChild(cells.drag);
        }
        else if (col.key === 'idx') {
          tr.appendChild(cells.idx);
        }
        else if (col.key === 'start') {
          tr.appendChild(cells.start);
        }
        else if (col.key === 'end') {
          tr.appendChild(cells.end);
        }
        else if (col.key === 'duration') {
          tr.appendChild(cells.duration);
        }
        else if (col.key === 'type') {
          tr.appendChild(cells.type);
        }
        else if (col.key === 'actions') {
          tr.appendChild(cells.actions);
        }
        else {
          // Custom column - need to create it here inline
          const customCols = [col];
          customCols.forEach(c => {
            const td=document.createElement('td'); td.dataset.key=c.key;
            td.className = 'custom-cell';
            if(c.show===false) td.style.visibility = 'collapse';
            if(c.print===false) td.classList.add('col-print-hide');
            const cellData = ((child.custom||{})[c.key])||'';
            
            let val = '';
            // Get cell formatting from child.cellFormatting, not from cellData
            let cellFormatting = child.cellFormatting ? child.cellFormatting[c.key] : null;
            
            if (typeof cellData === 'object' && cellData.value !== undefined) {
              val = cellData.value;
              // Override with cellData.formatting if it exists (backwards compatibility)
              if (cellData.formatting) {
                cellFormatting = cellData.formatting;
              }
            } else {
              val = cellData;
            }
            
            if(c.type==='separator'){
              td.dataset.type = 'separator';
              // Hide separator for sub-children with call type
              const subType = tr.dataset.subType;
              if (subType === 'call') {
                td.textContent = '';
              } else {
                td.textContent = c.separatorChar || '—';
              }
              td.style.textAlign = 'center';
            } else if(c.type==='text'){
              // Ensure val is a string for contenteditable divs
              const textVal = (val == null) ? '' : String(val);
              td.innerHTML=`<div class="cell-wrapper">
                <div class="cc-input" contenteditable="true" data-ckey="${c.key}" data-placeholder="${c.label||''}" title="CLICK TO EDIT | OPTION + CLICK TO SELECT CELL">${textVal}</div>
                
              </div>`;
              
              if (cellFormatting) {
                if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
                if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
                if (cellFormatting.bold) td.dataset.bold = 'true';
                if (cellFormatting.italic) td.dataset.italic = 'true';
                if (cellFormatting.underline) td.dataset.underline = 'true';
                if (cellFormatting.align) td.dataset.align = cellFormatting.align;
                if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
                  td.dataset.cellFg = cellFormatting.fgColor;
                }
                if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
                  td.dataset.cellBg = cellFormatting.bgColor;
                }
              }
              
              const editableDiv = td.querySelector('[contenteditable]');
              
              if (editableDiv) {
                // Apply child row-level formatting first (fonts and alignment only)
                if (child.fontFamily) editableDiv.style.fontFamily = child.fontFamily;
                if (child.fontSize) editableDiv.style.fontSize = child.fontSize;
                if (child.bold) editableDiv.style.fontWeight = 'bold';
                if (child.italic) editableDiv.style.fontStyle = 'italic';
                if (child.underline) editableDiv.style.textDecoration = 'underline';
                if (child.align) editableDiv.style.textAlign = child.align;
                
                if (child.valign) {
                  editableDiv.style.display = 'flex';
                  editableDiv.style.flexDirection = 'column';
                  if (child.valign === 'top') editableDiv.style.justifyContent = 'flex-start';
                  else if (child.valign === 'middle') editableDiv.style.justifyContent = 'center';
                  else if (child.valign === 'bottom') editableDiv.style.justifyContent = 'flex-end';
                }
                
                // Override with cell-level formatting
                if (cellFormatting) {
                  if (cellFormatting.fontFamily) editableDiv.style.fontFamily = cellFormatting.fontFamily;
                  if (cellFormatting.fontSize) editableDiv.style.fontSize = cellFormatting.fontSize;
                  if (cellFormatting.bold) editableDiv.style.fontWeight = 'bold';
                  if (cellFormatting.italic) editableDiv.style.fontStyle = 'italic';
                  if (cellFormatting.underline) editableDiv.style.textDecoration = 'underline';
                  if (cellFormatting.align) editableDiv.style.textAlign = cellFormatting.align;
                  
                  if (cellFormatting.valign) {
                    editableDiv.style.display = 'flex';
                    editableDiv.style.flexDirection = 'column';
                    if (cellFormatting.valign === 'top') editableDiv.style.justifyContent = 'flex-start';
                    else if (cellFormatting.valign === 'middle') editableDiv.style.justifyContent = 'center';
                    else if (cellFormatting.valign === 'bottom') editableDiv.style.justifyContent = 'flex-end';
                  }
                  
                  // Cell colors - only set if explicitly defined
                  if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                    editableDiv.style.color = cellFormatting.fgColor;
                  }
                  if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                    editableDiv.style.backgroundColor = cellFormatting.bgColor;
                  }
                }
              }
              
              td.querySelector('.cc-input')?.addEventListener('input', persist);
              
            } else if(c.type==='upload'){
              td.innerHTML=`<div class="uploadBox">
                <div class="u-grid"></div>
                <button class="ghost u-add">+</button>
                <input type="file" class="u-file" accept="image/*,video/*" multiple hidden/>
              </div>`;
              const ids=Array.isArray(val)?val:(typeof val==='string'&&val.startsWith('[')?JSON.parse(val):[]);
              td.dataset.vaultIds=JSON.stringify(ids); 
              buildUploadUI(td,ids);
            } else if(c.type==='tags'){
              td.innerHTML=`<div class="tagsBox"><div class="tags-pills"></div><textarea class="cc-input tags-value" data-ckey="${c.key}" hidden>${val}</textarea></div>`;
              
              // Apply cell formatting to tags cell
              if (cellFormatting) {
                if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
                if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
                if (cellFormatting.bold) td.dataset.bold = 'true';
                if (cellFormatting.italic) td.dataset.italic = 'true';
                if (cellFormatting.underline) td.dataset.underline = 'true';
                if (cellFormatting.align) td.dataset.align = cellFormatting.align;
                if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
                  td.dataset.cellFg = cellFormatting.fgColor;
                }
                if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
                  td.dataset.cellBg = cellFormatting.bgColor;
                }
                
                // Apply styles to TD for background
                if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                  td.style.setProperty('background-color', cellFormatting.bgColor, 'important');
                }
                if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                  td.style.setProperty('color', cellFormatting.fgColor, 'important');
                }
              }
              
              hydrateTagsBox(td,val);
            } else {
              td.innerHTML=`<input class="cc-input" data-ckey="${c.key}" type="text" placeholder="${c.label||''}" value="${val}"/>`;
              td.querySelector('.cc-input')?.addEventListener('input', persist);
            }
            
            // Apply default borders to custom column cells
            
            tr.appendChild(td);
          });
        }
      });

      tr.addEventListener('dragstart', e=>{ tr.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      tr.addEventListener('dragend', ()=>{ 
        tr.draggable = false; // Disable until next mousedown on handle
        tr.classList.remove('dragging'); 
        renumber(); recalc(); refreshAnchorSelectors(); persist();
      });
      
      // Restore cell-based formatting if present
      if (child.cellFormatting) {
        Object.keys(child.cellFormatting).forEach(key => {
          const cell = tr.querySelector(`td[data-key="${key}"]`);
          if (cell) {
            applyFormatting(cell, child.cellFormatting[key]);
          }
        });
      }
      
      return tr;
    }

    // Helpers
    function collectChildren(parentTr){ const kids=[]; let next=parentTr.nextElementSibling; while(next && next.classList.contains('subchild') && next.dataset.parent===parentTr.dataset.id){ kids.push(next); next=next.nextElementSibling; } return kids; }
    function getRowCustomFromDOM(tr){
      const out={};
      // Use same sorted column list as appendCustomCells
      const customCols = getAllColumnsSorted().filter(col => !col.fixed);
      customCols.forEach(col=>{
        // Skip separator columns - they don't store data
        if(col.type==='separator') return;
        
        if(col.type==='upload'){ 
          const td=tr.querySelector(`td[data-key="${col.key}"]`); 
          const idsStr=td?.dataset?.vaultIds||'[]'; 
          try{ out[col.key]=JSON.parse(idsStr);}catch{ out[col.key]=[]; } 
        }
        else if(col.type==='tags'){ 
          const val=tr.querySelector(`td[data-key="${col.key}"] .tags-value`)?.value||''; 
          out[col.key]=val; 
        }
        else { 
          const input=tr.querySelector(`.cc-input[data-ckey="${col.key}"]`); 
          if(input){ 
            const td = input.closest('td');
            // Get value - use textContent for contenteditable divs, value for inputs
            const val = input.hasAttribute('contenteditable') ? input.textContent : input.value;
            // Save value and formatting data
            out[col.key] = {
              value: val,
              formatting: {
                fontFamily: td?.dataset?.fontFamily || '',
                fontSize: td?.dataset?.fontSize || '',
                bold: td?.dataset?.bold === 'true',
                italic: td?.dataset?.italic === 'true',
                underline: td?.dataset?.underline === 'true',
                align: td?.dataset?.align || 'left',
                fgColor: td?.dataset?.cellFg || '',
                bgColor: td?.dataset?.cellBg || ''
              }
            };
          } 
        }
      }); 
      return out;
    }

    // Rebuild body preserving data
    function rebuildRowsKeepData(){
      const s=readState(); const rowsOut=[];
      qsa('tbody tr').forEach(tr=>{
        if(tr.classList.contains('subchild')) return;
        const row={ id:tr.dataset.id, type:tr.dataset.type, title: tr.querySelector('.title')?.value || '', duration: tr.querySelector('.duration')?.value ?? 0, offset: tr.querySelector('.offset')?.value ?? 0, anchorMode: tr.dataset.anchorMode || 'start', anchorId: tr.dataset.anchorId || '', callTimeDisplay: tr.dataset.callTimeDisplay || 'end', subColor: tr.dataset.subColor || '', subFg: tr.dataset.subFg || '', rowBg: tr.dataset.rowBg || '', rowFg: tr.dataset.rowFg || '', fontFamily: tr.dataset.fontFamily || '', fontSize: tr.dataset.fontSize || '', bold: tr.dataset.bold === 'true', italic: tr.dataset.italic === 'true', underline: tr.dataset.underline === 'true', align: tr.dataset.align || '', valign: tr.dataset.valign || '', custom: getRowCustomFromDOM(tr), children: [] };
        if(tr.dataset.type==='SUB'){
          let next=tr.nextElementSibling;
          while(next && next.classList.contains('subchild') && next.dataset.parent===tr.dataset.id){
            rowsOut.push; // noop prevent linter
            const child={ id: next.dataset.id, title: next.querySelector('.subTitle')?.value || '', duration: next.querySelector('.subDur')?.value || 0, subChildColor: next.dataset.subChildColor || '', subChildFg: next.dataset.subChildFg || '', fontFamily: next.dataset.fontFamily || '', fontSize: tr.dataset.fontSize || '', bold: next.dataset.bold === 'true', italic: next.dataset.italic === 'true', underline: next.dataset.underline === 'true', align: next.dataset.align || '', valign: next.dataset.valign || '', custom: getRowCustomFromDOM(next) };
            row.children.push(child);
            next=next.nextElementSibling;
          }
        }
        rowsOut.push(row);
      });
      
      // Update the current day's rows (multi-day system)
      const currentDayId = getActiveDayId();
      if (currentDayId) {
        updateDay(currentDayId, { rows: rowsOut });
      } else {
        // Fallback for legacy single-day (shouldn't happen but just in case)
        const freshState = readState();
        writeState({...freshState, rows: rowsOut}); 
      }
      
      // DO NOT call rebuildUI - let caller decide if rebuild is needed
      console.log('[rebuildRowsKeepData] Data extracted and saved. Caller should rebuild if needed.');
    }

    function renumber(){ 
      let idx=0; 
      let parentIdx = null;
      let subIdx = 0;
      
      qsa('tbody tr').forEach(tr=>{ 
        const td=tr.querySelector('td[data-key="idx"]'); 
        if(!td) return; 
        
        if(tr.classList.contains('subchild')) {
          // Sub-schedule child: use parent number + letter (6A, 6B, etc)
          const letter = String.fromCharCode(65 + subIdx); // 65 = 'A'
          td.textContent = `${parentIdx}${letter}`;
          subIdx++;
        } else if(tr.dataset.type === 'SEPARATOR') {
          // SEPARATOR rows don't have a number - leave empty for overlay
          td.textContent = '';
        } else { 
          // Main row: increment counter
          idx+=1; 
          td.textContent=idx;
          
          // If this is a SUB-SCHEDULE, track it for children
          if(tr.dataset.type === 'SUB') {
            parentIdx = idx;
            subIdx = 0;
          } else {
            parentIdx = null;
          }
        }
        // Reapply cell formatting from dataset
        reapplyCellFormatting(td);
      }); 
    }

    // Timeline
    function buildEventTimeline(){
      const rows=qsa('tbody tr'); const timeline={}; const base=toMinutes(readState().start || scheduleStart?.value || '8:00'); let cursor=base;
      rows.forEach(tr=>{ 
        // Only include regular EVENTs (not milestones) in timeline
        if(tr.dataset.type==='EVENT' && !tr.classList.contains('subchild') && tr.dataset.isMilestone !== 'true'){ 
          const dur=Number(tr.querySelector('.duration')?.value)||0; 
          const id=tr.dataset.id; 
          timeline[id]={start:cursor,end:cursor+dur,title:tr.querySelector('.title')?.value||'Untitled'}; 
          cursor+=dur; 
        } 
      });
      return {timeline, base};
    }
    function reapplyCellFormatting(td) {
      // Reapply formatting from TD dataset (used after recalc updates content)
      if (!td || !td.dataset) return;
      
      const formatting = {};
      if (td.dataset.fontFamily) formatting.fontFamily = td.dataset.fontFamily;
      if (td.dataset.fontSize) formatting.fontSize = td.dataset.fontSize;
      if (td.dataset.bold) formatting.bold = td.dataset.bold === 'true';
      if (td.dataset.italic) formatting.italic = td.dataset.italic === 'true';
      if (td.dataset.underline) formatting.underline = td.dataset.underline === 'true';
      if (td.dataset.align) formatting.align = td.dataset.align;
      if (td.dataset.cellFg) formatting.fgColor = td.dataset.cellFg;
      if (td.dataset.cellBg) formatting.bgColor = td.dataset.cellBg;
      
      if (Object.keys(formatting).length > 0) {
        applyFormatting(td, formatting);
      }
    }
    
    // Auto-hide separator columns adjacent to single-time cells (CALL TIME)
    function hideAdjacentSeparators(tr, timeCell) {
      // Find all cells in this row
      const cells = Array.from(tr.querySelectorAll('td[data-key]'));
      const timeCellElement = tr.querySelector(`td[data-key="${timeCell}"]`);
      
      if (!timeCellElement) return;
      
      const timeCellIndex = cells.indexOf(timeCellElement);
      
      // Check left neighbor
      if (timeCellIndex > 0) {
        const leftCell = cells[timeCellIndex - 1];
        if (leftCell.dataset.type === 'separator') {
          leftCell.style.visibility = 'collapse';
        }
      }
      
      // Check right neighbor
      if (timeCellIndex < cells.length - 1) {
        const rightCell = cells[timeCellIndex + 1];
        if (rightCell.dataset.type === 'separator') {
          rightCell.style.visibility = 'collapse';
        }
      }
      
      // Show separators adjacent to the empty cell
      const emptyCellKey = timeCell === 'start' ? 'end' : 'start';
      const emptyCellElement = tr.querySelector(`td[data-key="${emptyCellKey}"]`);
      
      if (emptyCellElement) {
        const emptyCellIndex = cells.indexOf(emptyCellElement);
        
        // Show left neighbor of empty cell
        if (emptyCellIndex > 0) {
          const leftCell = cells[emptyCellIndex - 1];
          if (leftCell.dataset.type === 'separator') {
            leftCell.style.visibility = '';
          }
        }
        
        // Show right neighbor of empty cell
        if (emptyCellIndex < cells.length - 1) {
          const rightCell = cells[emptyCellIndex + 1];
          if (rightCell.dataset.type === 'separator') {
            rightCell.style.visibility = '';
          }
        }
      }
    }
    
    function recalc(){
      const {timeline, base}=buildEventTimeline();
      qsa('tbody tr').forEach(tr=>{
        const s=tr.querySelector('td[data-key="start"]'), e=tr.querySelector('td[data-key="end"]'); if(!s||!e) return;
        if(tr.dataset.type==='EVENT' && tr.dataset.isMilestone !== 'true'){ 
          const t=timeline[tr.dataset.id]; 
          s.textContent=formatTime(minutesToHHMM(t.start)); 
          e.textContent=formatTime(minutesToHHMM(t.end)); 
          // Reapply cell formatting from dataset
          reapplyCellFormatting(s);
          reapplyCellFormatting(e);
        }
        else if(tr.dataset.isMilestone === 'true'){
          // Milestone events (Camera Wrap, Tail-lights) pass-through from row above
          // Find the previous row and grab its end time (or start if no end)
          const prevRow = tr.previousElementSibling;
          const offset = Number(tr.querySelector('.offset')?.value) || 0;
          let timeText = '--:--';
          
          if (prevRow) {
            const prevEnd = prevRow.querySelector('td[data-key="end"]');
            const prevStart = prevRow.querySelector('td[data-key="start"]');
            const prevEndText = prevEnd?.textContent?.trim();
            const prevStartText = prevStart?.textContent?.trim();
            
            // Use end time if available and not empty/dash, otherwise start time
            let baseTime = null;
            if (prevEndText && prevEndText !== '' && prevEndText !== '—') {
              baseTime = prevEndText;
            } else if (prevStartText && prevStartText !== '' && prevStartText !== '—') {
              baseTime = prevStartText;
            }
            
            if (baseTime) {
              // Apply offset if any
              if (offset !== 0) {
                const baseMinutes = toMinutes(baseTime);
                timeText = formatTime(minutesToHHMM(baseMinutes + offset));
              } else {
                timeText = baseTime;
              }
            }
          }
          
          // Show time in end cell only, start cell empty
          s.textContent = '';
          e.textContent = timeText;
          hideAdjacentSeparators(tr, 'end');
          
          reapplyCellFormatting(s);
          reapplyCellFormatting(e);
        }
        else if(tr.dataset.type==='SEPARATOR'){
          // SEPARATOR rows have no times - keep them empty
          s.textContent = '';
          e.textContent = '';
        }
        else if(tr.dataset.type==='CALL TIME'){
  const mode   = tr.dataset.anchorMode || 'start';
  const offset = Number(tr.querySelector('.offset')?.value) || 0;
  let anchor = base;
  if (mode==='eventStart' || mode==='eventEnd') {
    const t = timeline[tr.dataset.anchorId];
    if (t) anchor = (mode==='eventStart' ? t.start : t.end);
  }
  const timeText = formatTime(minutesToHHMM(anchor + offset));
  
  // User can toggle which cell shows time (default: 'end')
  const displayCell = tr.dataset.callTimeDisplay || 'end';
  
  if (displayCell === 'start') {
    s.textContent = timeText;
    e.textContent = '';
    hideAdjacentSeparators(tr, 'start');
  } else {
    s.textContent = '';
    e.textContent = timeText;
    hideAdjacentSeparators(tr, 'end');
  }
  
  // Reapply cell formatting from dataset
  reapplyCellFormatting(s);
  reapplyCellFormatting(e);
}
        else if(tr.dataset.type==='SUB'){ 
          const mode=tr.dataset.anchorMode||'eventEnd'; 
          const anchorId=tr.dataset.anchorId||''; 
          const offset=Number(tr.querySelector('.offset')?.value)||0; 
          let anchor=base; 
          if(mode==='eventStart' && timeline[anchorId]) anchor=timeline[anchorId].start; 
          if(mode==='eventEnd' && timeline[anchorId]) anchor=timeline[anchorId].end; 
          const timeText = formatTime(minutesToHHMM(anchor+offset));
          
          // User can toggle which cell shows time (default: 'end')
          const displayCell = tr.dataset.callTimeDisplay || 'end';
          
          if (displayCell === 'start') {
            s.textContent = timeText;
            e.textContent = '';
            hideAdjacentSeparators(tr, 'start');
          } else {
            s.textContent = '';
            e.textContent = timeText;
            hideAdjacentSeparators(tr, 'end');
          }
          
          // Reapply cell formatting from dataset
          reapplyCellFormatting(s);
          reapplyCellFormatting(e);
          
          let subCursor=anchor+offset; 
          let subStartTime=anchor+offset; // Track sub-schedule start for call time anchoring
          let next=tr.nextElementSibling; 
          
          while(next && next.classList.contains('subchild') && next.dataset.parent===tr.dataset.id){ 
            const sCell=next.querySelector('td[data-key="start"]'); 
            const eCell=next.querySelector('td[data-key="end"]'); 
            const subType=next.dataset.subType||'event'; 
            
            if(subType==='call'){
              // Call time: uses offset from current cursor position
              const callOffset=Number(next.querySelector('.subOffset')?.value)||0;
              const callTimeText = formatTime(minutesToHHMM(subCursor+callOffset));
              const endColHidden = eCell && (eCell.classList.contains('col-hide') || eCell.style.display === 'none');
              sCell && (sCell.textContent = endColHidden ? callTimeText : ''); 
              eCell && (eCell.textContent = callTimeText);
              // Reapply cell formatting from dataset
              if(sCell) reapplyCellFormatting(sCell);
              if(eCell) reapplyCellFormatting(eCell);
              // Don't advance cursor for call times
            } else {
              // Regular event: adds duration
              const dur=Number(next.querySelector('.subDur')?.value)||0;
              if(dur===0){
                sCell && (sCell.textContent='—'); 
                eCell && (eCell.textContent=formatTime(minutesToHHMM(subCursor)));
              } else {
                sCell && (sCell.textContent=formatTime(minutesToHHMM(subCursor))); 
                eCell && (eCell.textContent=formatTime(minutesToHHMM(subCursor+dur))); 
                subCursor+=dur;
              }
              // Reapply cell formatting from dataset
              if(sCell) reapplyCellFormatting(sCell);
              if(eCell) reapplyCellFormatting(eCell);
            }
            next=next.nextElementSibling; 
          } 
        }
      });
    }

    // Helper to extract all data from a row (for rebuilding)
    function getRowData(tr) {
      return {
        id: tr.dataset.id,
        type: tr.dataset.type,
        duration: Number(tr.querySelector('.duration')?.value) || 0,
        offset: Number(tr.querySelector('.offset')?.value) || 0,
        anchorMode: tr.dataset.anchorMode || 'start',
        anchorId: tr.dataset.anchorId || '',
        callTimeDisplay: tr.dataset.callTimeDisplay || 'end',
        subColor: tr.dataset.subColor || '',
        subFg: tr.dataset.subFg || '',
        rowBg: tr.dataset.rowBg || '',
        rowFg: tr.dataset.rowFg || '',
        fontFamily: tr.dataset.fontFamily || '',
        fontSize: tr.dataset.fontSize || '',
        bold: tr.dataset.bold === 'true',
        italic: tr.dataset.italic === 'true',
        underline: tr.dataset.underline === 'true',
        align: tr.dataset.align || '',
        valign: tr.dataset.valign || '',
        custom: getRowCustomFromDOM(tr),
        cellFormatting: {} // TODO: extract cell formatting if needed
      };
    }
    
    // Show anchor popover for CALL TIME and SUB-SCHEDULE rows
    function showAnchorPopover(tr, triggerElement) {
      // Close any existing popover
      const existing = document.querySelector('.anchor-popover');
      if (existing) existing.remove();
      
      // Create popover
      const popover = document.createElement('div');
      popover.className = 'anchor-popover popover is-open';
      
      const isSub = tr.dataset.type === 'SUB';
      const isCallTime = tr.dataset.type === 'CALL TIME';
      
      const currentMode = tr.dataset.anchorMode || (isSub ? 'eventEnd' : 'start');
      const currentAnchorId = tr.dataset.anchorId || '';
      const currentDisplay = tr.dataset.callTimeDisplay || 'end'; // For CALL TIME only
      
      // Get available events for anchoring
      const events = qsa('tbody tr').filter(t => t.dataset.type==='EVENT' && !t.classList.contains('subchild')).map(t => ({
        id: t.dataset.id,
        label: `Row ${t.querySelector('td[data-key="idx"]').textContent.trim()}`
      }));
      
      popover.innerHTML = `
        <div class="pop-head">
          <strong>${isSub ? 'SUB-SCHEDULE' : 'CALL TIME'} ANCHOR</strong>
          <button class="ghost pop-close">✕</button>
        </div>
        <div class="anchor-controls">
          <label>
            <span style="font-size: 11px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 4px;">Anchor to:</span>
            <select class="anchorMode" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
              ${isCallTime ? `<option value="start"${currentMode==='start'?' selected':''}>Schedule Start</option>` : ''}
              <option value="eventStart"${currentMode==='eventStart'?' selected':''}>Event Start</option>
              <option value="eventEnd"${currentMode==='eventEnd'?' selected':''}>Event End</option>
            </select>
          </label>
          
          <label style="margin-top: 8px;">
            <span style="font-size: 11px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 4px;">Event:</span>
            <select class="anchorEvent" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);" ${currentMode==='start'?'disabled':''}>
              <option value="">— Select event —</option>
              ${events.map(e => `<option value="${e.id}"${e.id===currentAnchorId?' selected':''}>${e.label}</option>`).join('')}
            </select>
          </label>
          
          ${isCallTime ? `
            <label style="margin-top: 8px;">
              <span style="font-size: 11px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 4px;">Display in:</span>
              <select class="displayCell" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                <option value="start"${currentDisplay==='start'?' selected':''}>START column</option>
                <option value="end"${currentDisplay==='end'?' selected':''}>END column</option>
              </select>
            </label>
            <label style="margin-top: 12px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" class="includeInHeader" ${tr.dataset.includeInHeader !== 'false' ? 'checked' : ''} style="cursor: pointer;">
              <span style="font-size: 11px; font-weight: 600;">Include in Header</span>
            </label>
          ` : ''}
          
          ${isSub ? `
            <label style="margin-top: 8px;">
              <span style="font-size: 11px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 4px;">Display in:</span>
              <select class="displayCell" style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                <option value="start"${currentDisplay==='start'?' selected':''}>START column</option>
                <option value="end"${currentDisplay==='end'?' selected':''}>END column</option>
              </select>
            </label>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button class="add-sub-event" style="flex: 1; padding: 8px; background: var(--accent); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 11px;">
                + EVENT
              </button>
              <button class="add-sub-call" style="flex: 1; padding: 8px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 11px;">
                + CALL TIME
              </button>
            </div>
          ` : ''}
        </div>
      `;
      
      document.body.appendChild(popover);
      
      // Position popover
      const rect = triggerElement.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.top = (rect.bottom + 4) + 'px';
      popover.style.left = rect.left + 'px';
      popover.style.zIndex = '99999';
      
      // Wire up controls
      const modeSelect = popover.querySelector('.anchorMode');
      const eventSelect = popover.querySelector('.anchorEvent');
      const closeBtn = popover.querySelector('.pop-close');
      
      modeSelect.addEventListener('change', () => {
        tr.dataset.anchorMode = modeSelect.value;
        eventSelect.disabled = (modeSelect.value === 'start');
        if (modeSelect.value === 'start') {
          tr.dataset.anchorId = '';
          eventSelect.value = '';
        }
        recalc();
        persist();
      });
      
      eventSelect.addEventListener('change', () => {
        tr.dataset.anchorId = eventSelect.value;
        recalc();
        persist();
      });
      
      // For CALL TIME and SUB: wire up display cell toggle
      if (isCallTime || isSub) {
        const displaySelect = popover.querySelector('.displayCell');
        displaySelect.addEventListener('change', () => {
          tr.dataset.callTimeDisplay = displaySelect.value;
          recalc();
          persist();
        });
      }
      
      // For CALL TIME: wire up Include in Header checkbox
      if (isCallTime) {
        const includeCheckbox = popover.querySelector('.includeInHeader');
        if (includeCheckbox) {
          includeCheckbox.addEventListener('change', () => {
            tr.dataset.includeInHeader = includeCheckbox.checked ? 'true' : 'false';
            persist();
            // Trigger header update if getDynamicCallTimes is used
            if (window.updateHeaderMetadata) {
              window.updateHeaderMetadata();
            }
          });
        }
      }
      
      closeBtn.addEventListener('click', () => {
        popover.remove();
      });
      
      if (isSub) {
        const addSubBtn = popover.querySelector('.add-sub-event');
        const addCallBtn = popover.querySelector('.add-sub-call');
        
        addSubBtn.addEventListener('click', () => {
          const newChild = makeSubChildRow(tr, { id: uid(), subType: 'event', duration: 30, custom: {} });
          let lastChild = tr;
          const kids = collectChildren(tr);
          if (kids.length > 0) {
            lastChild = kids[kids.length - 1];
          }
          lastChild.after(newChild);
          renumber();
          recalc();
          persist();
          popover.remove();
        });
        
        addCallBtn.addEventListener('click', () => {
          const newChild = makeSubChildRow(tr, { id: uid(), subType: 'call', offset: 0, custom: {} });
          let lastChild = tr;
          const kids = collectChildren(tr);
          if (kids.length > 0) {
            lastChild = kids[kids.length - 1];
          }
          lastChild.after(newChild);
          renumber();
          recalc();
          persist();
          popover.remove();
        });
      }
      
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', function closePopover(e) {
          if (!popover.contains(e.target) && !triggerElement.contains(e.target)) {
            popover.remove();
            document.removeEventListener('click', closePopover);
          }
        });
      }, 0);
    }
    
    // Show popover for sub-schedule call times
    function showSubCallPopover(tr, triggerElement) {
      // Close any existing popover
      const existing = document.querySelector('.sub-call-popover');
      if (existing) existing.remove();
      
      // Create popover
      const popover = document.createElement('div');
      popover.className = 'sub-call-popover popover is-open';
      
      popover.innerHTML = `
        <div class="pop-head">
          <strong>CALL TIME OPTIONS</strong>
          <button class="ghost pop-close">✕</button>
        </div>
        <div style="padding: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" class="includeInHeader" ${tr.dataset.includeInHeader !== 'false' ? 'checked' : ''} style="cursor: pointer;">
            <span style="font-size: 11px; font-weight: 600;">Include in Header</span>
          </label>
        </div>
      `;
      
      document.body.appendChild(popover);
      
      // Position popover
      const rect = triggerElement.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.top = (rect.bottom + 4) + 'px';
      popover.style.left = rect.left + 'px';
      popover.style.zIndex = '99999';
      
      // Wire up controls
      const closeBtn = popover.querySelector('.pop-close');
      const includeCheckbox = popover.querySelector('.includeInHeader');
      
      includeCheckbox.addEventListener('change', () => {
        tr.dataset.includeInHeader = includeCheckbox.checked ? 'true' : 'false';
        persist();
        // Trigger header update if getDynamicCallTimes is used
        if (window.updateHeaderMetadata) {
          window.updateHeaderMetadata();
        }
      });
      
      closeBtn.addEventListener('click', () => {
        popover.remove();
      });
      
      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', function closePopover(e) {
          if (!popover.contains(e.target) && !triggerElement.contains(e.target)) {
            popover.remove();
            document.removeEventListener('click', closePopover);
          }
        });
      }, 0);
    }
    
    function refreshAnchorSelectors(){
      // Anchor selectors are now in popovers - no need to refresh them constantly
      // This function is kept for backwards compatibility with existing calls
      // If a popover is open, update its event list
      const openPopover = document.querySelector('.anchor-popover');
      if (openPopover) {
        const events = qsa('tbody tr').filter(tr => tr.dataset.type==='EVENT' && !tr.classList.contains('subchild')).map(tr => ({
          id: tr.dataset.id,
          label: `Row ${tr.querySelector('td[data-key="idx"]').textContent.trim()}`
        }));
        
        const eventSelect = openPopover.querySelector('.anchorEvent');
        if (eventSelect) {
          const current = eventSelect.value;
          eventSelect.innerHTML = `<option value="">— Select event —</option>` + 
            events.map(e => `<option value="${e.id}"${e.id===current?' selected':''}>${e.label}</option>`).join('');
        }
      }
    }

    // DnD
    tbody.addEventListener('dragover', e=>{
      e.preventDefault();
      const dragging=qs('tbody .dragging'); if(!dragging) return;
      
      // Handle multi-drag
      if (dragging._multiDrag && dragging._multiDrag.length > 1) {
        const candidates=qsa('tbody tr:not(.dragging):not(.subchild)');
        const afterEl=calcAfter(candidates, e.clientY);
        
        // Move all selected rows together
        const sorted = dragging._multiDrag.sort((a, b) => {
          return Array.from(tbody.children).indexOf(a) - Array.from(tbody.children).indexOf(b);
        });
        
        if(afterEl==null) {
          sorted.forEach(row => {
            tbody.appendChild(row);
            if(row.dataset.type==='SUB' && Array.isArray(row._dragKids)) {
              let ref=row; row._dragKids.forEach(k=>{ ref.after(k); ref=k; });
            }
          });
        } else {
          sorted.reverse().forEach(row => {
            tbody.insertBefore(row, afterEl);
            if(row.dataset.type==='SUB' && Array.isArray(row._dragKids)) {
              let ref=row; row._dragKids.forEach(k=>{ ref.after(k); ref=k; });
            }
          });
        }
        // Don't renumber/recalc during drag - only update position
        return;
      }
      
      if(dragging.classList.contains('subchild')){
        const parentId=dragging.dataset.parent;
        const siblings=qsa(`tbody tr.subchild[data-parent="${parentId}"]:not(.dragging)`);
        const after=calcAfter(siblings, e.clientY);
        if(after==null){ let ref=qs(`tbody tr.row[data-id="${parentId}"]`); if(!ref) return; while(ref.nextElementSibling && ref.nextElementSibling.classList.contains('subchild') && ref.nextElementSibling.dataset.parent===parentId){ ref=ref.nextElementSibling; } ref.after(dragging); }
        else { after.before(dragging); }
        // Don't recalc during drag
        return;
      }
      const candidates=qsa('tbody tr:not(.dragging):not(.subchild)');
      const afterEl=calcAfter(candidates, e.clientY);
      if(afterEl==null) tbody.appendChild(dragging); else tbody.insertBefore(dragging, afterEl);
      if(dragging.dataset.type==='SUB' && Array.isArray(dragging._dragKids)){ let ref=dragging; dragging._dragKids.forEach(k=>{ ref.after(k); ref=k; }); }
      // Don't renumber/recalc during drag - only update position
    });
    function calcAfter(list,y){ 
      // Get current zoom level to compensate coordinates
      const scheduleScroll = document.querySelector('.schedule-scroll');
      const zoom = scheduleScroll ? parseFloat(scheduleScroll.style.zoom || '1') : 1;
      
      // Adjust mouse Y for zoom
      const adjustedY = y / zoom;
      
      let closest={offset:-Infinity,element:null}; 
      list.forEach(el=>{ 
        const box=el.getBoundingClientRect(); 
        // box coordinates are already in zoomed space, so use adjustedY
        const offset=adjustedY-box.top-box.height/2; 
        if(offset<0 && offset>closest.offset){ 
          closest={offset,element:el}; 
        } 
      }); 
      return closest.element; 
    }

    function persist(){
      // Skip persist if we're in the middle of loading a file
      if (window.__LOADING_FILE__) {
        console.log('⚠️ Skipping persist during file load');
        return;
      }
      // Save current day data
      saveDayData();
    }
    
    // Make persist globally accessible for tag system
    window.persist = persist;

    saveBtn && saveBtn.addEventListener('click', ()=>{ 
      saveDayData(); // Save current day before exporting
      const s = readState();
      const data = JSON.stringify(s, null, 2); 
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(new Blob([data], {type:'application/json'})); 
      a.download = 'shoot-multiday.json'; 
      document.body.appendChild(a); 
      a.click(); 
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); 
      a.remove(); 
    });
    
    loadBtn && loadBtn.addEventListener('click', () => {
      loadInput && loadInput.click();
    });
    
    loadInput && loadInput.addEventListener('change', async e=>{ 
      UNDO_STACK.length = 0; 
      REDO_STACK.length = 0; 
      try {
        localStorage.removeItem(STORAGE_KEY+'_UNDO');
        localStorage.removeItem(STORAGE_KEY+'_REDO');
      } catch(_) { } 
      updateUndoUi(); 
      const f = e.target.files?.[0]; 
      if(!f) return; 
      try { 
        const t = await f.text(); 
        const data = JSON.parse(t);
        
        // Check if it's old format and migrate
        if (data.rows && !data.days) {
          const firstDay = {
            id: generateDayId(),
            dayNumber: 1,
            date: data.meta?.date || '',
            dow: data.meta?.dow || '',
            scheduleStart: data.start || '8:00',
            rows: data.rows || [],
            palette: data.palette || DEFAULT_PALETTE.slice(),
            cols: data.cols || DEFAULT_CUSTOM_COLS.slice()
          };
          data.days = [firstDay];
          data.projectMeta = { title: data.meta?.title || '', version: '' };
          data.activeDayId = firstDay.id;
          delete data.rows;
          delete data.start;
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); 
        rebuildUI(); 
      } catch(err) { 
        showErr(err);
      } finally { 
        e.target.value = ''; 
      } 
    });
    
    // Page Guides button
    const pageGuidesBtn = document.getElementById('pageGuidesBtn');
    pageGuidesBtn && pageGuidesBtn.addEventListener('click', () => {
      window.togglePageGuides();
    });
    
    // Column Visibility - applySavedColumnVisibility still needed for Show checkboxes
    function applyColumnVisibilityToRow(row) {
      const colVisState = JSON.parse(localStorage.getItem('columnVisibility') || '{}');
      const cols = getAllColumnsSorted();
      
      // Apply visibility for built-in columns from localStorage
      Object.keys(colVisState).forEach(key => {
        if (!colVisState[key]) {
          const cell = row.querySelector(`td[data-key="${key}"]`);
          if (cell) {
            cell.style.visibility = 'collapse';
          }
        }
      });
      
      // Apply visibility for custom columns based on show property
      cols.forEach(col => {
        if (!col.fixed && col.show === false) {
          const cell = row.querySelector(`td[data-key="${col.key}"]`);
          if (cell) {
            cell.style.visibility = 'collapse';
          }
        }
      });
    }
    
    function applySavedColumnVisibility() {
      const colVisState = JSON.parse(localStorage.getItem('columnVisibility') || '{}');
      
      // Rebuild headers to match current visibility state
      rebuildHeaders();
      
      // Apply visibility to all columns
      Object.keys(colVisState).forEach(key => {
        const isVisible = colVisState[key];
        const headers = document.querySelectorAll(`th[data-key="${key}"]`);
        const cells = document.querySelectorAll(`td[data-key="${key}"]`);
        const colEls = document.querySelectorAll(`col[data-key="${key}"]`);
        
        if (isVisible) {
          headers.forEach(h => h.style.visibility = '');
          cells.forEach(c => c.style.visibility = '');
          colEls.forEach(c => c.style.visibility = '');
        } else {
          headers.forEach(h => h.style.visibility = 'collapse');
          cells.forEach(c => c.style.visibility = 'collapse');
          colEls.forEach(c => c.style.visibility = 'collapse');
        }
      });
      
      // Transfer borders from hidden columns to first visible column
      if (typeof transferBordersFromHiddenColumns === 'function') {
        transferBordersFromHiddenColumns();
      }
      
      // Recalculate table width after applying visibility
      setTimeout(() => {
        recalculateTableWidth();
        if (window.updatePageGuidePosition && document.getElementById('pageWidthGuides')?.style.display !== 'none') {
          updatePageGuidePosition();
        }
      }, 50);
    }
    
    // Print button - opens print settings modal
    printBtn && printBtn.addEventListener('click', () => {
      // Load saved preferences
      const savedImageHeight = localStorage.getItem('pdfImageHeight') || '150';
      const savedPaperSize = localStorage.getItem('pdfPaperSize') || 'letter';
      const savedOrientation = localStorage.getItem('pdfOrientation') || 'landscape';
      const savedShowHeader = localStorage.getItem('pdfShowHeader') !== 'false'; // default true
      const savedShowColumnHeaders = localStorage.getItem('pdfShowColumnHeaders') !== 'false'; // default true
      const savedRoundedCorners = localStorage.getItem('pdfRoundedCorners') === 'true'; // default false
      const savedColumnWidthFactor = localStorage.getItem('pdfColumnWidthFactor') || '0.5';
      
      // Open print settings modal
      const modal = document.getElementById('printColModal');
      
      // Reset to full schedule by default
      const fullRadio = document.querySelector('input[name="reportType"][value="full"]');
      if (fullRadio) fullRadio.checked = true;
      updateReportModalSections();
      
      // Populate tag list and sub-schedule list
      populateReportTags();
      populateSubSchedules();
      
      // Set image height
      const imageHeightInput = document.getElementById('pdfImageHeight');
      if (imageHeightInput) {
        imageHeightInput.value = savedImageHeight;
      }
      
      // Set column width factor
      const columnWidthFactorInput = document.getElementById('pdfColumnWidthFactor');
      if (columnWidthFactorInput) {
        columnWidthFactorInput.value = savedColumnWidthFactor;
      }
      
      // Set paper size and orientation
      const paperSizeSelect = document.getElementById('pdfPaperSize');
      const orientationSelect = document.getElementById('pdfOrientation');
      if (paperSizeSelect) paperSizeSelect.value = savedPaperSize;
      if (orientationSelect) orientationSelect.value = savedOrientation;
      
      // Set checkboxes
      const showHeaderCheckbox = document.getElementById('pdfShowHeader');
      const showColumnHeadersCheckbox = document.getElementById('pdfShowColumnHeaders');
      const roundedCornersCheckbox = document.getElementById('pdfRoundedCorners');
      if (showHeaderCheckbox) showHeaderCheckbox.checked = savedShowHeader;
      if (showColumnHeadersCheckbox) showColumnHeadersCheckbox.checked = savedShowColumnHeaders;
      if (roundedCornersCheckbox) roundedCornersCheckbox.checked = savedRoundedCorners;
      
      modal.style.display = 'flex';
    });
    
    // Live update image height CSS variable when changed in modal (for Puppeteer PDF)
    document.getElementById('pdfImageHeight')?.addEventListener('input', (e) => {
      const imageHeight = e.target.value || '150';
      localStorage.setItem('pdfImageHeight', imageHeight);
    });
    
    // ==================== REPORT TYPE HANDLERS ====================
    
    // Report type radio buttons - show/hide sections
    document.querySelectorAll('input[name="reportType"]').forEach(radio => {
      radio.addEventListener('change', updateReportModalSections);
    });
    
    function updateReportModalSections() {
      const reportType = document.querySelector('input[name="reportType"]:checked')?.value;
      const tagSection = document.getElementById('tagSelectorSection');
      const subSection = document.getElementById('subscheduleSection');
      const standardSettings = document.getElementById('standardPrintSettings');
      
      // Hide all conditional sections first
      if (tagSection) tagSection.style.display = 'none';
      if (subSection) subSection.style.display = 'none';
      if (standardSettings) standardSettings.style.display = 'block';
      
      if (reportType === 'tags') {
        if (tagSection) tagSection.style.display = 'block';
        // Keep standard settings visible for orientation/paper size
      } else if (reportType === 'subschedule') {
        if (subSection) subSection.style.display = 'block';
      }
      // 'full' and 'master' just use standard settings
    }
    
    function populateReportTags() {
      const tagList = document.getElementById('reportTagList');
      if (!tagList || !window.TagManager) return;
      
      const allTags = Object.values(window.TagManager.tags || {});
      
      if (allTags.length === 0) {
        tagList.innerHTML = '<div style="color: #999; font-size: 12px; padding: 12px; text-align: center;">No tags found. Add tags to columns first.</div>';
        return;
      }
      
      tagList.innerHTML = '';
      allTags.forEach(tag => {
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; border-radius: 4px;';
        label.innerHTML = `
          <input type="checkbox" value="${tag.id}" class="report-tag-checkbox" style="width: 16px; height: 16px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${tag.color || '#94a3b8'};"></div>
          <span>${tag.label}</span>
        `;
        label.addEventListener('mouseenter', () => label.style.background = '#e5e7eb');
        label.addEventListener('mouseleave', () => label.style.background = 'transparent');
        tagList.appendChild(label);
      });
    }
    
    function populateSubSchedules() {
      const select = document.getElementById('subscheduleSelect');
      if (!select) return;
      
      const tbody = document.getElementById('tbody');
      const subScheduleRows = tbody.querySelectorAll('tr[data-type="SUB"]');
      
      select.innerHTML = '<option value="">-- Select a sub-schedule --</option>';
      
      subScheduleRows.forEach(row => {
        const titleEl = row.querySelector('.subTitle');
        const title = titleEl ? titleEl.textContent.trim() : 'Untitled Sub-Schedule';
        const option = document.createElement('option');
        option.value = row.dataset.id;
        option.textContent = title || 'Untitled Sub-Schedule';
        select.appendChild(option);
      });
    }

    // Make PDF generation function global so column picker can access it
    window.generatePDFWithPuppeteer = async function generatePDFWithPuppeteer() {
      try {
        const btn = document.getElementById('printBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Generating PDF...';
        btn.disabled = true;

        const html = await buildCompleteHTML();
        
        const htmlSizeKB = Math.round(html.length / 1024);
        console.log('Total HTML payload:', htmlSizeKB, 'KB');
        
        if (htmlSizeKB > 5000) {
          console.warn('⚠️ Payload is very large (>5MB), may cause server issues');
        }
        
        const orientation = localStorage.getItem('pdfOrientation') || 'landscape';
        console.log('📤 Sending to server - orientation:', orientation);
        
        const response = await fetch('https://railway-pdf-server-production.up.railway.app/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            html: html,
            orientation: orientation
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Railway error response:', errorText);
          let error;
          try {
            error = JSON.parse(errorText);
          } catch (e) {
            error = { details: errorText };
          }
          throw new Error(error.details || 'PDF generation failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Open in new tab
        window.open(url, '_blank');
        
        // Also trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        btn.textContent = originalText;
        btn.disabled = false;
        
        // Fix: Reapply column visibility and sync widths to prevent misalignment
        setTimeout(() => {
          applySavedColumnVisibility();
          if (window.syncCellWidths) {
            syncCellWidths({ recalcNeeded: false });
          }
        }, 100);

      } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF: ' + error.message);
        const btn = document.getElementById('printBtn');
        btn.textContent = 'Print';
        btn.disabled = false;
        
        // Fix: Reapply column visibility even on error
        setTimeout(() => {
          applySavedColumnVisibility();
          if (window.syncCellWidths) {
            syncCellWidths({ recalcNeeded: false });
          }
        }, 100);
      }
    }

    async function buildCompleteHTML(filterRowIds = null, separatorBeforeIds = null, tagReportData = null) {
      console.log('📄 Building PDF HTML with selective extraction...', filterRowIds ? `Filtering to ${filterRowIds.length} rows` : 'All rows');
      if (separatorBeforeIds && separatorBeforeIds.size > 0) {
        console.log('📄 Will add separators before', separatorBeforeIds.size, 'rows');
      }
      if (tagReportData) {
        console.log('📄 Tag report for:', tagReportData.tagNames);
      }
      
      // Helper to escape font-family for HTML attributes (replace " with ')
      const escapeFontFamily = (ff) => ff.replace(/"/g, "'");
      
      const metaTitle = document.getElementById('metaTitle')?.value || '';
      const metaVersion = document.getElementById('metaVersion')?.value || '';
      const metaDateRaw = document.getElementById('metaDate')?.value || '';
      const metaDow = document.getElementById('metaDow')?.value || '';
      const metaX = document.getElementById('metaX')?.value || '';
      const metaY = document.getElementById('metaY')?.value || '';
      
      // Format date as MM/DD/YYYY
      let metaDate = '';
      if (metaDateRaw) {
        const d = new Date(metaDateRaw + 'T00:00:00');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        metaDate = `${month}/${day}/${year}`;
      }
      
      const pdfImageHeight = localStorage.getItem('pdfImageHeight') || '150';
      
      // Get paper settings
      const paperSize = localStorage.getItem('pdfPaperSize') || 'letter';
      const orientation = localStorage.getItem('pdfOrientation') || 'landscape';
      
      console.log('📄 Building HTML - paperSize:', paperSize, 'orientation:', orientation);
      console.log('📐 Will use page dimensions:', orientation === 'landscape' ? 'LANDSCAPE (wider)' : 'PORTRAIT (taller)');
      
      // Define paper sizes in inches
      const paperSizes = {
        letter: orientation === 'landscape' ? '11in 8.5in' : '8.5in 11in',
        legal: orientation === 'landscape' ? '14in 8.5in' : '8.5in 14in',
        tabloid: orientation === 'landscape' ? '17in 11in' : '11in 17in',
        a4: orientation === 'landscape' ? '11.69in 8.27in' : '8.27in 11.69in',
        a3: orientation === 'landscape' ? '16.54in 11.69in' : '11.69in 16.54in'
      };
      const pageSize = paperSizes[paperSize] || paperSizes.letter;
      
      console.log('📐 Calculated page size:', pageSize);
      
      // Fetch print CSS file
      console.log('📥 Fetching print-styles.css...');
      let printCSS = '';
      try {
        const response = await fetch('./print-styles.css');
        printCSS = await response.text();
      } catch (e) {
        console.warn('Failed to load print-styles.css:', e);
      }
      
      // Get header image by rendering Header Designer to canvas
      let headerHTML = '';
      let hasHeader = false;
      
      console.log('🖼️ Rendering header to canvas...');
      
      // Provide function to extract call times from schedule
      if (!window.getDynamicCallTimes) {
        window.getDynamicCallTimes = () => {
          const callTimes = [];
          const rows = document.querySelectorAll('tbody tr[data-type="CALL TIME"]');
          
          rows.forEach(tr => {
            // Check if this call time should be included in header
            const includeInHeader = tr.dataset.includeInHeader !== 'false'; // default true
            if (!includeInHeader) return;
            
            const titleInput = tr.querySelector('.title');
            const endCell = tr.querySelector('td[data-key="end"]');
            
            if (titleInput && endCell) {
              const label = titleInput.value || 'Call Time';
              const time = endCell.textContent.trim();
              
              if (time && time !== '—') {
                callTimes.push({ time, label });
              }
            }
          });
          
          return callTimes;
        };
      }
      
      // Try to render header designer to canvas (width will be set after cols are loaded)
      let headerCanvas = null;

      // Get original table structure
      const table = document.getElementById('scheduleTable');
      const cols = Array.from(table.querySelectorAll('#colGroup col'));
      const headerRow = table.querySelector('#headerRow');
      const tbody = table.querySelector('#tbody');
      
      // Detect outer table border from Border Designer - do this EARLY before generating HTML
      // Check all four edges and use the first one found
      const convertBorderToPt = (value) => {
        if (!value) return '';
        const match = value.match(/^(\d+(?:\.\d+)?)px\s+(\w+)\s+(.+)$/);
        if (match) {
          const [, width, style, color] = match;
          const pt = (parseFloat(width) * 0.75).toFixed(2);
          return `${pt}pt ${style} ${color}`;
        }
        return value;
      };
      
      let outerBorder = '';
      
      // Check top border (first header cell)
      const firstHeaderCell = headerRow.querySelector('th:not([data-key="actions"]):not([data-key="drag"])');
      if (firstHeaderCell && firstHeaderCell.dataset.borderTop) {
        outerBorder = convertBorderToPt(firstHeaderCell.dataset.borderTop);
      }
      
      // Check left border if no top border found
      if (!outerBorder && firstHeaderCell && firstHeaderCell.dataset.borderLeft) {
        outerBorder = convertBorderToPt(firstHeaderCell.dataset.borderLeft);
      }
      
      // Check bottom border (last row)
      if (!outerBorder) {
        const lastBodyRow = Array.from(tbody.querySelectorAll('tr')).pop();
        if (lastBodyRow) {
          const lastCell = lastBodyRow.querySelector('td:not([data-key="actions"])');
          if (lastCell && lastCell.dataset.borderBottom) {
            outerBorder = convertBorderToPt(lastCell.dataset.borderBottom);
          }
        }
      }
      
      // Check right border
      if (!outerBorder) {
        const allHeaderCells = Array.from(headerRow.querySelectorAll('th:not([data-key="actions"])'));
        const lastHeaderCell = allHeaderCells.pop();
        if (lastHeaderCell && lastHeaderCell.dataset.borderRight) {
          outerBorder = convertBorderToPt(lastHeaderCell.dataset.borderRight);
        }
      }
      
      console.log('🔲 Detected outerBorder:', outerBorder || 'none');
      
      // Render header at its DESIGNED size (not forced to table width)
      if (window.renderHeaderToCanvas && !headerCanvas) {
        try {
          headerCanvas = await window.renderHeaderToCanvas(); // No width argument - use designed size
          
          if (headerCanvas) {
            console.log('✓ Header rendered at designed size:', headerCanvas.width, 'x', headerCanvas.height);
            const headerDataUrl = headerCanvas.toDataURL('image/jpeg', 0.85);
            const sizeKB = Math.round(headerDataUrl.length / 1024);
            console.log('Header image size:', sizeKB, 'KB');
            
            // Render at exact canvas dimensions - no scaling
            headerHTML = `<div class="header-image"><img src="${headerDataUrl}" style="width: ${headerCanvas.width}px; height: ${headerCanvas.height}px; display: block; margin: 0 auto 6pt auto;"></div>`;
            hasHeader = true;
          }
        } catch (e) {
          console.warn('Failed to render header:', e);
        }
      }
      
      // Only show meta display if no header image
      let metaDisplay = hasHeader ? '' : `${metaTitle} v.${metaVersion} • ${metaDow} ${metaDate} • Day ${metaX} of ${metaY}`;
      
      // Append tag report data if this is a tag report
      if (tagReportData && tagReportData.tagNames) {
        // Format hours
        const formatMinutes = (mins) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };
        
        const onSetDisplay = formatMinutes(tagReportData.totalOnSetMinutes);
        
        let tagInfo = `${tagReportData.tagNames} • On Set: ${onSetDisplay}`;
        
        // Only show Working time for minors
        if (tagReportData.cumulativeMinutes !== null) {
          const workingDisplay = formatMinutes(tagReportData.cumulativeMinutes);
          tagInfo += ` • Working: ${workingDisplay}`;
        }
        
        if (metaDisplay) {
          metaDisplay += ` • ${tagInfo}`;
        } else {
          metaDisplay = tagInfo;
        }
      }
      
      // Build clean colgroup
      // Scale column widths for PDF - UI widths are too large for print
      const PDF_WIDTH_SCALE = parseFloat(localStorage.getItem('pdfColumnWidthFactor') || '0.5');
      console.log('📏 PDF Column Width Scale Factor:', PDF_WIDTH_SCALE);
      
      const scaleWidth = (widthStr) => {
        if (!widthStr) {
          console.log('  ⚠️ No width string provided');
          return '';
        }
        const match = widthStr.match(/^([\d.]+)(.*)$/);
        if (!match) {
          console.log(`  ⚠️ Width string doesn't match pattern: ${widthStr}`);
          return widthStr;
        }
        const value = parseFloat(match[1]);
        const unit = match[2] || 'px';
        const scaled = `${value * PDF_WIDTH_SCALE}${unit}`;
        console.log(`  📐 Scaling width: ${widthStr} → ${scaled}`);
        return scaled;
      };
      
      let colGroupHTML = '<colgroup>';
      const scaledWidths = {}; // Map of column keys to scaled widths
      
      cols.forEach(col => {
        const key = col.dataset.key;
        let originalWidth = col.style.width || '';
        
        // If no inline style, use computed style
        if (!originalWidth) {
          const computed = window.getComputedStyle(col);
          originalWidth = computed.width;
          console.log(`  ℹ️ Column ${key}: using computed width ${originalWidth} (no inline style)`);
        } else {
          console.log(`  ℹ️ Column ${key}: using inline width ${originalWidth}`);
        }
        
        const width = scaleWidth(originalWidth);
        scaledWidths[key] = width; // Store for use in TH/TD
        
        if (key === 'drag') {
          // Replace drag with idx column - keep same width
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes('idx')) {
            scaledWidths['idx'] = width; // Also store under 'idx' key
            colGroupHTML += `<col data-key="idx" style="width: ${width} !important; min-width: ${width} !important; max-width: ${width} !important;">`;
          }
        } else if (col.dataset.type === 'separator') {
          // Separator columns - include if in print selection
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            colGroupHTML += `<col data-key="${key}" data-type="separator" style="width: ${width} !important; min-width: ${width} !important; max-width: ${width} !important;">`;
          }
        } else if (key !== 'actions' && key !== 'idx') {
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            colGroupHTML += `<col data-key="${key}" style="width: ${width} !important; min-width: ${width} !important; max-width: ${width} !important;">`;
          }
        }
      });
      colGroupHTML += '</colgroup>';
      
      // Calculate total table width from scaled visible columns
      let totalTableWidth = 0;
      Object.keys(scaledWidths).forEach(key => {
        if (key === 'actions' || key === 'drag') return;
        // Skip columns not in print selection
        if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0) {
          if (key === 'idx' && !window.selectedPrintColumns.includes('idx')) return;
          if (key !== 'idx' && !window.selectedPrintColumns.includes(key)) return;
        }
        
        const widthStr = scaledWidths[key];
        const width = parseFloat(widthStr);
        if (!isNaN(width)) {
          totalTableWidth += width;
        }
      });
      
      console.log('✓ Total scaled table width for PDF:', totalTableWidth + 'px');
      
      
      // Build clean header
      let tableHeaderHTML = '<thead><tr>';
      const headers = Array.from(headerRow.querySelectorAll('th'));
      let headerIndex = 0;
      let totalVisibleHeaders = headers.filter(th => {
        const key = th.dataset.key;
        if (key === 'actions' || key === 'idx') return false; // Skip actions and idx (idx is handled via drag)
        if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0) {
          if (key === 'drag') return window.selectedPrintColumns.includes('idx');
          return window.selectedPrintColumns.includes(key);
        }
        return true;
      }).length;
      
      headers.forEach(th => {
        const key = th.dataset.key;
        const isFirst = (headerIndex === 0);
        const isLast = (headerIndex === totalVisibleHeaders - 1);
        // Only round cell corners if there's no outer border (wrapper will handle corners)
        const borderRadius = outerBorder ? '' : (isFirst ? 'border-radius: 8pt 0 0 0; ' : (isLast ? 'border-radius: 0 8pt 0 0; ' : ''));
        
        if (key === 'drag') {
          // Include index column header but rename it to just the number symbol
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes('idx')) {
            // Extract formatting from the actual th element
            const computedStyle = window.getComputedStyle(th);
            let headerStyle = '';
            
            // Background color
            const bgColor = computedStyle.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
              headerStyle += `background-color: ${bgColor} !important; `;
            }
            
            // Text color
            const color = computedStyle.color;
            if (color && color !== 'rgba(0, 0, 0, 0)') {
              headerStyle += `color: ${color} !important; `;
            }
            
            // Font properties
            const fontSize = computedStyle.fontSize;
            const fontFamily = computedStyle.fontFamily;
            const fontWeight = computedStyle.fontWeight;
            const fontStyle = computedStyle.fontStyle;
            const textAlign = computedStyle.textAlign;
            const textDecoration = computedStyle.textDecoration;
            
            if (fontSize) headerStyle += `font-size: ${fontSize} !important; `;
            if (fontFamily && !fontFamily.includes('system-ui')) {
              headerStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
            }
            if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
              headerStyle += `font-weight: ${fontWeight} !important; `;
            }
            if (fontStyle && fontStyle !== 'normal') {
              headerStyle += `font-style: ${fontStyle} !important; `;
            }
            if (textAlign) headerStyle += `text-align: ${textAlign} !important; `;
            if (textDecoration && !textDecoration.includes('none')) {
              headerStyle += `text-decoration: ${textDecoration} !important; `;
            }
            
            // Check if user applied custom borders
            const customBorders = BorderDesigner.getBorderStylesForPDF(th, {
              isFirstPrintedColumn: isFirst,
              isLastPrintedColumn: isLast,
              isFirstRow: true,
              hasOuterBorder: !!outerBorder
            });
            if (customBorders) headerStyle += customBorders;
            
            headerStyle += `padding: 3pt 2pt; ${borderRadius}`;
            
            // Add scaled width
            if (scaledWidths['idx']) {
              headerStyle += `width: ${scaledWidths['idx']} !important; min-width: ${scaledWidths['idx']} !important; max-width: ${scaledWidths['idx']} !important; `;
            }
            
            tableHeaderHTML += `<th style="${headerStyle}">#</th>`;
            headerIndex++;
          }
        } else if (th.dataset.type === 'separator') {
          // Separator column header - include if in print selection
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            // Extract formatting from the actual th element
            const computedStyle = window.getComputedStyle(th);
            let headerStyle = '';
            
            // Background color
            const bgColor = computedStyle.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
              headerStyle += `background-color: ${bgColor} !important; `;
            }
            
            // Text color
            const color = computedStyle.color;
            if (color && color !== 'rgba(0, 0, 0, 0)') {
              headerStyle += `color: ${color} !important; `;
            }
            
            // Font properties
            const fontSize = computedStyle.fontSize;
            const fontFamily = computedStyle.fontFamily;
            const fontWeight = computedStyle.fontWeight;
            const fontStyle = computedStyle.fontStyle;
            const textAlign = computedStyle.textAlign;
            const textDecoration = computedStyle.textDecoration;
            
            if (fontSize) headerStyle += `font-size: ${fontSize} !important; `;
            if (fontFamily && !fontFamily.includes('system-ui')) {
              headerStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
            }
            if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
              headerStyle += `font-weight: ${fontWeight} !important; `;
            }
            if (fontStyle && fontStyle !== 'normal') {
              headerStyle += `font-style: ${fontStyle} !important; `;
            }
            if (textAlign) headerStyle += `text-align: ${textAlign} !important; `;
            if (textDecoration && !textDecoration.includes('none')) {
              headerStyle += `text-decoration: ${textDecoration} !important; `;
            }
            
            // Check for custom borders from BorderDesigner
            const customBorders = BorderDesigner.getBorderStylesForPDF(th, {
              isFirstPrintedColumn: isFirst,
              isLastPrintedColumn: isLast,
              isFirstRow: true,
              hasOuterBorder: !!outerBorder
            });
            if (customBorders) headerStyle += customBorders;
            
            headerStyle += `padding: 0; ${borderRadius}`;
            
            // Add scaled width
            if (scaledWidths[key]) {
              headerStyle += `width: ${scaledWidths[key]} !important; min-width: ${scaledWidths[key]} !important; max-width: ${scaledWidths[key]} !important; `;
            }
            
            tableHeaderHTML += `<th data-type="separator" style="${headerStyle}">${th.textContent.trim() || ''}</th>`;
            headerIndex++;
          }        } else if (key !== 'actions' && key !== 'idx') {
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            // Clone the th and remove all UI elements (buttons, etc.)
            const clone = th.cloneNode(true);
            const uiElements = clone.querySelectorAll('button, .col-resize-grip, svg, .icon');
            uiElements.forEach(el => el.remove());
            const text = clone.textContent.trim();
            
            // Extract formatting from the actual th element
            const computedStyle = window.getComputedStyle(th);
            let headerStyle = '';
            
            // Background color
            const bgColor = computedStyle.backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
              headerStyle += `background-color: ${bgColor} !important; `;
            }
            
            // Text color
            const color = computedStyle.color;
            if (color && color !== 'rgba(0, 0, 0, 0)') {
              headerStyle += `color: ${color} !important; `;
            }
            
            // Font properties
            const fontSize = computedStyle.fontSize;
            const fontFamily = computedStyle.fontFamily;
            const fontWeight = computedStyle.fontWeight;
            const fontStyle = computedStyle.fontStyle;
            const textAlign = computedStyle.textAlign;
            const textDecoration = computedStyle.textDecoration;
            
            if (fontSize) headerStyle += `font-size: ${fontSize} !important; `;
            if (fontFamily && !fontFamily.includes('system-ui')) {
              headerStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
            }
            if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
              headerStyle += `font-weight: ${fontWeight} !important; `;
            }
            if (fontStyle && fontStyle !== 'normal') {
              headerStyle += `font-style: ${fontStyle} !important; `;
            }
            if (textAlign) headerStyle += `text-align: ${textAlign} !important; `;
            if (textDecoration && !textDecoration.includes('none')) {
              headerStyle += `text-decoration: ${textDecoration} !important; `;
            }
            
            // Check for custom borders from BorderDesigner
            const customBorders = BorderDesigner.getBorderStylesForPDF(th, {
              isFirstPrintedColumn: isFirst,
              isLastPrintedColumn: isLast,
              isFirstRow: true,
              hasOuterBorder: !!outerBorder
            });
            if (customBorders) headerStyle += customBorders;
            
            headerStyle += `padding: 3pt 2pt; ${borderRadius}`;
            
            // Add scaled width
            if (scaledWidths[key]) {
              headerStyle += `width: ${scaledWidths[key]} !important; min-width: ${scaledWidths[key]} !important; max-width: ${scaledWidths[key]} !important; `;
            }
            
            tableHeaderHTML += `<th style="${headerStyle}">${text}</th>`;
            headerIndex++;
          }
        }
      });
      tableHeaderHTML += '</tr></thead>';
      
      // Build clean body rows
      console.log('📋 Extracting table data...');
      let bodyHTML = '<tbody>';
      const rows = Array.from(tbody.querySelectorAll('tr'));
      
      // Get saved row heights
      const rowHeights = getRowH();
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const rowId = row.dataset.id;
        
        // Skip rows not in filter list (if filter is active)
        if (filterRowIds && !filterRowIds.includes(rowId)) {
          continue;
        }
        
        const isLastRow = (rowIndex === rows.length - 1);
        const rowType = row.dataset.type;
        const isSubchild = row.classList.contains('subchild');
        
        // NO ROW-LEVEL FORMATTING - pure cell-based only
        // All formatting comes from individual cell.dataset properties
        
        const rowClass = row.className || '';
        let rowStyle = '';
        if (rowId && rowHeights[rowId]) {
          // Convert px to pt for PDF (1px ≈ 0.75pt)
          const heightPt = Math.round(rowHeights[rowId] * 0.75);
          rowStyle = ` style="height: ${heightPt}pt;"`;
        }
        
        // Add separator row if this row is non-sequential from previous
        if (separatorBeforeIds && separatorBeforeIds.has(rowId)) {
          bodyHTML += `<tr class="row-separator"><td colspan="50" style="height: 18pt; background: transparent; border: none !important; padding: 0 !important; text-align: center; vertical-align: middle;">
            <div style="display: inline-flex; flex-direction: column; align-items: center;">
              <div style="width: 2pt; height: 10pt; border-left: 2pt dotted #64748b;"></div>
              <div style="font-size: 8pt; font-weight: bold; color: #64748b; line-height: 1;">▼</div>
            </div>
          </td></tr>`;
        }
        
        bodyHTML += `<tr class="${rowClass}"${rowStyle}>`;
        
        const cells = Array.from(row.querySelectorAll('td'));
        
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const key = cell.dataset.key;
          
          if (key === 'actions') continue;
          if (key === 'idx') continue; // Skip idx - we extract it when processing drag column
          // Skip columns not in print selection
          if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0 && !window.selectedPrintColumns.includes(key) && key !== 'drag') continue;
          
          let cellContent = '';
          let cellTextStyle = ''; // For span (text formatting)
          let cellBgStyle = ''; // For TD (background)
          
          // Handle drag column -> get the number from the idx cell instead
          if (key === 'drag') {
            if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0 && !window.selectedPrintColumns.includes('idx')) continue;
            
            // Find the idx cell in this row and extract its number and formatting
            const idxCell = row.querySelector('td[data-key="idx"]');
            cellContent = idxCell ? idxCell.textContent.trim() : '';
            
            // Extract formatting from idx cell
            let idxTextStyle = '';
            let idxBgStyle = '';
            
            if (idxCell) {
              const idxComputed = window.getComputedStyle(idxCell);
              
              // Get all text formatting
              const fontSize = idxComputed.fontSize;
              const fontFamily = idxComputed.fontFamily;
              const fontWeight = idxComputed.fontWeight;
              const fontStyle = idxComputed.fontStyle;
              const textDecoration = idxComputed.textDecoration;
              const color = idxComputed.color;
              
              if (fontSize) idxTextStyle += `font-size: ${fontSize} !important; `;
              if (fontFamily && fontFamily !== 'inherit') idxTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
              if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') idxTextStyle += `font-weight: ${fontWeight} !important; `;
              if (fontStyle && fontStyle !== 'normal') idxTextStyle += `font-style: ${fontStyle} !important; `;
              if (textDecoration && textDecoration !== 'none' && !textDecoration.includes('none')) idxTextStyle += `text-decoration: ${textDecoration} !important; `;
              if (color && color !== 'rgba(0, 0, 0, 0)') idxTextStyle += `color: ${color} !important; `;
              
              // Get background - check dataset first, then computed, then row background
              const cellBg = idxCell.dataset.cellBg;
              if (cellBg) {
                idxBgStyle = `background-color: ${cellBg} !important; `;
              } else {
                const bgColor = idxComputed.backgroundColor;
                if (bgColor && 
                    bgColor !== 'rgba(0, 0, 0, 0)' && 
                    bgColor !== 'transparent' &&
                    bgColor !== 'rgb(255, 255, 255)' &&
                    bgColor !== 'rgb(15, 18, 23)' &&
                    bgColor !== 'rgb(11, 15, 21)') {
                  idxBgStyle = `background-color: ${bgColor} !important; `;
                } else {
                  // Fallback to computed row background
                  const rowStyle = window.getComputedStyle(row);
                  const rowBg = rowStyle.backgroundColor;
                  if (rowBg && 
                      rowBg !== 'rgba(0, 0, 0, 0)' && 
                      rowBg !== 'transparent' &&
                      rowBg !== 'rgb(255, 255, 255)' &&
                      rowBg !== 'rgb(15, 18, 23)' &&
                      rowBg !== 'rgb(11, 15, 21)') {
                    idxBgStyle = `background-color: ${rowBg} !important; `;
                  }
                }
              }
            }
            
            // Base styling for idx column
            let idxStyle = 'text-align: center; vertical-align: middle; padding: 3pt 4pt !important;';
            
            // Check for custom borders on the idx cell
            if (idxCell) {
              // Idx column is always first if it's printed
              // Determine if idx is also the last printed column
              const visibleColumnsForBorder = Array.from(row.querySelectorAll('td')).filter(td => {
                const k = td.dataset.key;
                if (k === 'actions') return false;
                if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0) {
                  if (k === 'drag') return window.selectedPrintColumns.includes('idx');
                  return window.selectedPrintColumns.includes(k);
                }
                return true;
              });
              const isLastPrintedColumn = (visibleColumnsForBorder.length === 1 && visibleColumnsForBorder[0].dataset.key === 'idx');
              
              const customBorders = BorderDesigner.getBorderStylesForPDF(idxCell, {
                isFirstPrintedColumn: true,
                isLastPrintedColumn: isLastPrintedColumn,
                isFirstRow: rowIndex === 0,
                isLastRow: isLastRow,
                hasOuterBorder: !!outerBorder
              });
              if (customBorders) {
                idxStyle += customBorders;
              }
            }
            
            if (isLastRow && !outerBorder) {
              idxStyle += ' border-bottom-left-radius: 8pt !important;';
            }
            
            // Add background to TD
            if (idxBgStyle) {
              idxStyle += idxBgStyle;
            }
            
            // Wrap content in span with text formatting
            if (idxTextStyle) {
              bodyHTML += `<td style="${idxStyle}"><span style="${idxTextStyle}">${cellContent}</span></td>`;
            } else {
              bodyHTML += `<td style="${idxStyle}">${cellContent}</td>`;
            }
            continue;
          }
          
          // Check for tag pills first (tagsBox cells)
          const tagsBox = cell.querySelector('.tagsBox');
          let hasTagContent = false;  // Flag to skip other handlers
          console.log(`🏷️ [${key}] Start processing - tagsBox: ${!!tagsBox}`);
          if (tagsBox) {
            // Get tag IDs from the hidden textarea
            const tagsValue = tagsBox.querySelector('.tags-value');
            const tagIds = tagsValue ? tagsValue.value.split(',').filter(id => id.trim()) : [];
            console.log('🏷️ Found tagsBox with', tagIds.length, 'tags, TagManager:', !!window.TagManager);
            
            if (tagIds.length > 0 && window.TagManager) {
              // Extract background color for cell
              const cellBg = cell.dataset.cellBg;
              if (cellBg) {
                cellBgStyle += `background-color: ${cellBg} !important; `;
              }
              
              // Render tag pills with inline styles
              cellContent = '<div style="display: flex; flex-wrap: wrap; gap: 3pt; align-items: center; padding: 2pt;">';
              
              // Pre-load all tag images in parallel
              const tagDataPromises = tagIds.map(async (tagId) => {
                const tag = window.TagManager.getTag(tagId);
                if (!tag) return null;
                
                let imgSrc = null;
                
                // Load image if it's an image tag
                if (tag.type === 'image' && (tag.imageUrl || tag.vaultId)) {
                  imgSrc = tag.imageUrl;
                  
                  // If no cloud URL, try to get from vault
                  if (!imgSrc && tag.vaultId && window.vaultGet) {
                    try {
                      const record = await window.vaultGet(tag.vaultId);
                      if (record && record.data) {
                        const blob = record.data;
                        imgSrc = await new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onloadend = () => resolve(reader.result);
                          reader.onerror = reject;
                          reader.readAsDataURL(blob);
                        });
                      }
                    } catch (e) {
                      console.warn('Failed to load vault image for PDF:', e);
                    }
                  }
                  
                  // Convert blob URLs to data URLs
                  if (imgSrc && imgSrc.startsWith('blob:')) {
                    try {
                      imgSrc = await blobToDataURL(imgSrc);
                    } catch (e) {
                      console.warn('Failed to convert blob URL:', e);
                    }
                  }
                }
                
                return { tag, imgSrc };
              });
              
              // Wait for all images to load
              const tagDataArray = await Promise.all(tagDataPromises);
              console.log('🏷️ Images loaded for', tagDataArray.length, 'tags');
              
              // Now render all pills
              for (const tagData of tagDataArray) {
                if (!tagData || !tagData.tag) continue;
                
                const { tag, imgSrc } = tagData;
                
                // Get contrasting text color
                const textColor = tag.color ? window.TagManager.getContrastColor(tag.color) : '#ffffff';
                
                // Base pill styles with conditional padding
                const pillStyle = `
                  display: inline-flex;
                  align-items: center;
                  gap: 3pt;
                  padding: ${imgSrc ? '2pt 6pt 2pt 2pt' : '4pt 6pt'};
                  border-radius: 999pt;
                  border: 0.75pt solid ${tag.color || '#94a3b8'};
                  background-color: ${tag.color || '#374151'};
                  color: ${textColor};
                  font-family: Arial, sans-serif;
                  font-size: 6pt;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.3pt;
                  min-height: 16pt;
                  line-height: 1.2;
                  white-space: nowrap;
                `;
                
                // Build image HTML if available
                const imgHTML = imgSrc 
                  ? `<img src="${imgSrc}" style="width: 15pt; height: 15pt; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` 
                  : '';
                
                cellContent += `<span style="${pillStyle}">${imgHTML}<span>${tag.label}</span></span>`;
              }
              
              cellContent += '</div>';
              hasTagContent = true;  // Mark that we have tag content
              console.log('🏷️ Rendered tag pills, content length:', cellContent.length);
            } else {
              cellContent = '';
              console.log('🏷️ No tags or TagManager not available');
            }
          }
          
          // Only process images/title/text if we didn't already handle tags
          if (!hasTagContent) {
            // Check for images in uploadBox cells
            const images = Array.from(cell.querySelectorAll('img'));
            if (images.length > 0) {
            // Extract background color for media cells
            const cellBg = cell.dataset.cellBg;
            if (cellBg) {
              cellBgStyle += `background-color: ${cellBg} !important; `;
            } else {
              // Check TD background
              const tdStyle = window.getComputedStyle(cell);
              const tdBgColor = tdStyle.backgroundColor;
              if (tdBgColor && 
                  tdBgColor !== 'rgba(0, 0, 0, 0)' && 
                  tdBgColor !== 'transparent' && 
                  tdBgColor !== 'rgb(255, 255, 255)' &&
                  tdBgColor !== 'rgb(15, 18, 23)' &&
                  tdBgColor !== 'rgb(11, 15, 21)') {
                cellBgStyle += `background-color: ${tdBgColor} !important; `;
              } else {
                // Fallback to computed row background
                const rowStyle = window.getComputedStyle(row);
                const rowBg = rowStyle.backgroundColor;
                if (rowBg && 
                    rowBg !== 'rgba(0, 0, 0, 0)' && 
                    rowBg !== 'transparent' &&
                    rowBg !== 'rgb(255, 255, 255)' &&
                    rowBg !== 'rgb(15, 18, 23)' &&
                    rowBg !== 'rgb(11, 15, 21)') {
                  cellBgStyle += `background-color: ${rowBg} !important; `;
                }
              }
            }
            
            cellContent = '<div class="cell-media">';
            // Process each image with its badge
            const uItems = Array.from(cell.querySelectorAll('.u-item'));
            for (const uItem of uItems) {
              const img = uItem.querySelector('img');
              const badge = uItem.querySelector('.media-badge');
              
              if (!img) continue;
              
              let imgSrc = img.src;
              if (imgSrc.startsWith('blob:')) {
                try {
                  imgSrc = await blobToDataURL(imgSrc);
                } catch (e) {
                  console.warn('Failed to convert image:', e);
                  continue;
                }
              }
              
              // Check if there's a badge with a label
              const badgeLabel = badge && badge.textContent && badge.textContent !== '+' ? badge.textContent : null;
              
              if (badgeLabel) {
                // Get badge background color (or use default)
                const badgeColor = badge.style.backgroundColor || 'rgba(49, 130, 206, 0.9)';
                
                // Wrap image with badge overlay
                cellContent += `
                  <div style="position: relative; display: inline-block;">
                    <img src="${imgSrc}">
                    <div style="
                      position: absolute;
                      top: 3pt;
                      left: 3pt;
                      background: ${badgeColor};
                      color: #fff;
                      border-radius: 4pt;
                      padding: 2pt 4pt;
                      font-size: 7pt;
                      font-weight: 600;
                      line-height: 1.2;
                      white-space: nowrap;
                    ">${badgeLabel}</div>
                  </div>
                `;
              } else {
                // No badge, just the image
                cellContent += `<img src="${imgSrc}">`;
              }
            }
            cellContent += '</div>';
          } else {
            // Handle EVENT column (title) specially to avoid anchor UI
            if (key === 'title') {
              const titleInput = cell.querySelector('input.title');
              if (titleInput) {
                cellContent = titleInput.value || '';
                
                // Cell colors: dataset ONLY, no row fallbacks
                const cellFg = cell.dataset.cellFg;
                const cellBg = cell.dataset.cellBg;
                
                if (cellFg) {
                  cellTextStyle += `color: ${cellFg} !important; `;
                } else {
                  const computedFg = window.getComputedStyle(titleInput).color;
                  if (computedFg && computedFg !== 'rgba(0, 0, 0, 0)') {
                    cellTextStyle += `color: ${computedFg} !important; `;
                  }
                }
                
                if (cellBg) {
                  cellBgStyle += `background-color: ${cellBg} !important; `;
                } else if (titleInput.style.backgroundColor &&
                           titleInput.style.backgroundColor !== 'rgb(255, 255, 255)' &&
                           titleInput.style.backgroundColor !== 'white' &&
                           titleInput.style.backgroundColor !== '#ffffff') {
                  // Check inline style directly (not computed) for title backgrounds (but filter white)
                  cellBgStyle += `background-color: ${titleInput.style.backgroundColor} !important; `;
                }
                
                // Extract ALL visual properties from the input for PDF
                const computedStyle = window.getComputedStyle(titleInput);
                let fontSize = computedStyle.fontSize;
                let fontFamily = computedStyle.fontFamily;
                let fontWeight = computedStyle.fontWeight;
                let fontStyle = computedStyle.fontStyle;
                let textDecoration = computedStyle.textDecoration;
                let textAlign = computedStyle.textAlign;
                
                // NO ROW FALLBACKS - use only what's explicitly set on cell or computed from input
                
                // Extract border properties
                const borderRadius = computedStyle.borderRadius;
                const borderColor = computedStyle.borderColor;
                const borderWidth = computedStyle.borderWidth;
                const borderStyle = computedStyle.borderStyle;
                
                // Extract background from computed style as final fallback
                if (!cellBg && !titleInput.style.backgroundColor) {
                  // First check input's background
                  const bgColor = computedStyle.backgroundColor;
                  // Exclude white, transparent, and default theme backgrounds (#0f1217 dark, #ffffff light)
                  if (bgColor && 
                      bgColor !== 'rgba(0, 0, 0, 0)' && 
                      bgColor !== 'transparent' && 
                      bgColor !== 'rgb(255, 255, 255)' &&
                      bgColor !== 'rgb(15, 18, 23)' &&  // #0f1217 dark theme
                      bgColor !== 'rgb(11, 15, 21)') {  // #0b0f15 darker variant
                    cellBgStyle += `background-color: ${bgColor} !important; `;
                  } else {
                    // Check TD background
                    const tdStyle = window.getComputedStyle(cell);
                    const tdBgColor = tdStyle.backgroundColor;
                    if (tdBgColor && 
                        tdBgColor !== 'rgba(0, 0, 0, 0)' && 
                        tdBgColor !== 'transparent' && 
                        tdBgColor !== 'rgb(255, 255, 255)' &&
                        tdBgColor !== 'rgb(15, 18, 23)' &&
                        tdBgColor !== 'rgb(11, 15, 21)') {
                      cellBgStyle += `background-color: ${tdBgColor} !important; `;
                    } else {
                      // Fallback to computed row background
                      const rowStyle = window.getComputedStyle(row);
                      const rowBg = rowStyle.backgroundColor;
                      if (rowBg && 
                          rowBg !== 'rgba(0, 0, 0, 0)' && 
                          rowBg !== 'transparent' &&
                          rowBg !== 'rgb(255, 255, 255)' &&
                          rowBg !== 'rgb(15, 18, 23)' &&
                          rowBg !== 'rgb(11, 15, 21)') {
                        cellBgStyle += `background-color: ${rowBg} !important; `;
                      }
                    }
                  }
                }
                
                // Apply font properties - only include non-default values
                if (fontSize) {
                  cellTextStyle += `font-size: ${fontSize} !important; `;
                }
                if (fontFamily && fontFamily !== 'inherit' && !fontFamily.includes('system-ui')) {
                  cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                }
                // Only include bold if not normal
                if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
                  cellTextStyle += `font-weight: ${fontWeight} !important; `;
                }
                // Only include italic if not normal
                if (fontStyle && fontStyle !== 'normal') {
                  cellTextStyle += `font-style: ${fontStyle} !important; `;
                }
                if (textDecoration && !textDecoration.includes('none')) {
                  cellTextStyle += `text-decoration: ${textDecoration} !important; `;
                }
                if (textAlign && textAlign !== 'left' && textAlign !== 'start') {
                  cellTextStyle += `text-align: ${textAlign} !important; `;
                }
                
                // Apply border properties to the span - ONLY if explicitly formatted (not default input border)
                // Skip border extraction to avoid gray form field appearance in PDF
                // if (borderRadius && borderRadius !== '0px' && borderRadius !== '8px') {
                //   cellTextStyle += `border-radius: ${borderRadius} !important; `;
                // }
                // if (borderWidth && borderWidth !== '0px' && borderWidth !== '1px') {
                //   cellTextStyle += `border: ${borderWidth} ${borderStyle} ${borderColor} !important; `;
                // }
              } else {
                cellContent = '';
              }
            }
            // Handle other columns
            else if (!hasTagContent) {  // Only process if we don't have tag content already
              const input = cell.querySelector('input:not([type="color"]), textarea, select');
              const contenteditable = cell.querySelector('[contenteditable]');
              if (input) {
                // For SUB-SCHEDULE and CALL TIME rows, skip the duration/offset field content but keep background
                if (key === 'duration' && (rowType === 'SUB' || rowType === 'CALL TIME')) {
                  cellContent = '';
                  
                  // Still extract background color for these cells
                  const cellBg = cell.dataset.cellBg;
                  
                  if (cellBg) {
                    cellBgStyle += `background-color: ${cellBg} !important; `;
                  } else {
                    // Check input background
                    const inputStyle = window.getComputedStyle(input);
                    const inputBgColor = inputStyle.backgroundColor;
                    
                    if (inputBgColor && 
                        inputBgColor !== 'rgba(0, 0, 0, 0)' && 
                        inputBgColor !== 'transparent' && 
                        inputBgColor !== 'rgb(255, 255, 255)' &&
                        inputBgColor !== 'rgb(15, 18, 23)' &&
                        inputBgColor !== 'rgb(11, 15, 21)') {
                      cellBgStyle += `background-color: ${inputBgColor} !important; `;
                    } else {
                      // Check TD background
                      const tdStyle = window.getComputedStyle(cell);
                      const tdBgColor = tdStyle.backgroundColor;
                      if (tdBgColor && 
                          tdBgColor !== 'rgba(0, 0, 0, 0)' && 
                          tdBgColor !== 'transparent' && 
                          tdBgColor !== 'rgb(255, 255, 255)' &&
                          tdBgColor !== 'rgb(15, 18, 23)' &&
                          tdBgColor !== 'rgb(11, 15, 21)') {
                        cellBgStyle += `background-color: ${tdBgColor} !important; `;
                      } else {
                        // Fallback to computed row background
                        const rowStyle = window.getComputedStyle(row);
                        const rowBg = rowStyle.backgroundColor;
                        if (rowBg && 
                            rowBg !== 'rgba(0, 0, 0, 0)' && 
                            rowBg !== 'transparent' &&
                            rowBg !== 'rgb(255, 255, 255)' &&
                            rowBg !== 'rgb(15, 18, 23)' &&
                            rowBg !== 'rgb(11, 15, 21)') {
                          cellBgStyle += `background-color: ${rowBg} !important; `;
                        }
                      }
                    }
                  }
                } else {
                  cellContent = input.value || '';
                  
                  // Cell colors: dataset ONLY, no row fallbacks
                  const cellFg = cell.dataset.cellFg;
                  const cellBg = cell.dataset.cellBg;
                  
                  if (cellFg) {
                    cellTextStyle += `color: ${cellFg} !important; `;
                  } else {
                    const computedFg = window.getComputedStyle(input).color;
                    if (computedFg && computedFg !== 'rgba(0, 0, 0, 0)') {
                      cellTextStyle += `color: ${computedFg} !important; `;
                    }
                  }
                  
                  if (cellBg) {
                    cellBgStyle += `background-color: ${cellBg} !important; `;
                  } else if (input.style.backgroundColor &&
                             input.style.backgroundColor !== 'rgb(255, 255, 255)' &&
                             input.style.backgroundColor !== 'white' &&
                             input.style.backgroundColor !== '#ffffff') {
                    // Check inline style directly (not computed) for textarea backgrounds (but filter white)
                    cellBgStyle += `background-color: ${input.style.backgroundColor} !important; `;
                  }
                  
                  // Extract visual properties from the input/textarea (for fonts) and cell (for backgrounds)
                  const cellStyle = window.getComputedStyle(cell);
                  const inputStyle = window.getComputedStyle(input);
                  
                  let fontSize = inputStyle.fontSize;
                  let fontFamily = inputStyle.fontFamily;
                  let fontWeight = inputStyle.fontWeight;
                  let fontStyle = inputStyle.fontStyle;
                  let textDecoration = inputStyle.textDecoration;
                  let textAlign = inputStyle.textAlign;
                  
                  // NO ROW FALLBACKS - use only what's explicitly set on cell or computed from input
                  
                  // Extract border properties from input
                  const borderRadius = inputStyle.borderRadius;
                  const borderColor = inputStyle.borderColor;
                  const borderWidth = inputStyle.borderWidth;
                  const borderStyle = inputStyle.borderStyle;
                  
                  // Extract background from computed style as final fallback
                  if (!cellBg && !input.style.backgroundColor) {
                    // First check input's background
                    const bgColor = inputStyle.backgroundColor;
                    // Exclude white, transparent, and default theme backgrounds (#0f1217 dark, #ffffff light)
                    if (bgColor && 
                        bgColor !== 'rgba(0, 0, 0, 0)' && 
                        bgColor !== 'transparent' && 
                        bgColor !== 'rgb(255, 255, 255)' &&
                        bgColor !== 'rgb(15, 18, 23)' &&  // #0f1217 dark theme
                        bgColor !== 'rgb(11, 15, 21)') {  // #0b0f15 darker variant
                      cellBgStyle += `background-color: ${bgColor} !important; `;
                    } else {
                      // Check TD background
                      const tdStyle = window.getComputedStyle(cell);
                      const tdBgColor = tdStyle.backgroundColor;
                      if (tdBgColor && 
                          tdBgColor !== 'rgba(0, 0, 0, 0)' && 
                          tdBgColor !== 'transparent' && 
                          tdBgColor !== 'rgb(255, 255, 255)' &&
                          tdBgColor !== 'rgb(15, 18, 23)' &&
                          tdBgColor !== 'rgb(11, 15, 21)') {
                        cellBgStyle += `background-color: ${tdBgColor} !important; `;
                      } else {
                        // Fallback to computed row background
                        const rowStyle = window.getComputedStyle(row);
                        const rowBg = rowStyle.backgroundColor;
                        if (rowBg && 
                            rowBg !== 'rgba(0, 0, 0, 0)' && 
                            rowBg !== 'transparent' &&
                            rowBg !== 'rgb(255, 255, 255)' &&
                            rowBg !== 'rgb(15, 18, 23)' &&
                            rowBg !== 'rgb(11, 15, 21)') {
                          cellBgStyle += `background-color: ${rowBg} !important; `;
                        }
                      }
                    }
                  }
                  
                  // Apply font properties - only include non-default values
                  if (fontSize) {
                    cellTextStyle += `font-size: ${fontSize} !important; `;
                  }
                  if (fontFamily && fontFamily !== 'inherit' && !fontFamily.includes('system-ui')) {
                    cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                  }
                  // Only include bold if not normal
                  if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
                    cellTextStyle += `font-weight: ${fontWeight} !important; `;
                  }
                  // Only include italic if not normal
                  if (fontStyle && fontStyle !== 'normal') {
                    cellTextStyle += `font-style: ${fontStyle} !important; `;
                  }
                  if (textDecoration && !textDecoration.includes('none')) {
                    cellTextStyle += `text-decoration: ${textDecoration} !important; `;
                  }
                  if (textAlign && textAlign !== 'left' && textAlign !== 'start') {
                    cellTextStyle += `text-align: ${textAlign} !important; `;
                  }
                  
                  // Apply border properties to the span - ONLY if explicitly formatted (not default input border)
                  // Skip border extraction to avoid gray form field appearance in PDF
                  // if (borderRadius && borderRadius !== '0px' && borderRadius !== '8px') {
                  //   cellTextStyle += `border-radius: ${borderRadius} !important; `;
                  // }
                  // if (borderWidth && borderWidth !== '0px' && borderWidth !== '1px') {
                  //   cellTextStyle += `border: ${borderWidth} ${borderStyle} ${borderColor} !important; `;
                  // }
                }
              } else if (contenteditable) {
                // Handle contenteditable cells
                cellContent = contenteditable.textContent || '';
                
                // Extract visual properties from the contenteditable (need this early for background fallback)
                const contentStyle = window.getComputedStyle(contenteditable);
                
                // Cell colors: dataset ONLY, no row fallbacks
                const cellFg = cell.dataset.cellFg;
                const cellBg = cell.dataset.cellBg;
                
                if (cellFg) {
                  cellTextStyle += `color: ${cellFg} !important; `;
                } else {
                  const computedFg = window.getComputedStyle(contenteditable).color;
                  if (computedFg && computedFg !== 'rgba(0, 0, 0, 0)') {
                    cellTextStyle += `color: ${computedFg} !important; `;
                  }
                }
                
                if (cellBg) {
                  cellBgStyle += `background-color: ${cellBg} !important; `;
                } else if (contenteditable.style.backgroundColor && 
                           contenteditable.style.backgroundColor !== 'rgb(255, 255, 255)' &&
                           contenteditable.style.backgroundColor !== 'white' &&
                           contenteditable.style.backgroundColor !== '#ffffff') {
                  // Check inline style directly for contenteditable backgrounds (but filter white)
                  cellBgStyle += `background-color: ${contenteditable.style.backgroundColor} !important; `;
                } else {
                  // Extract background from computed style as fallback
                  const bgColor = contentStyle.backgroundColor;
                  // Exclude white, transparent, and default theme backgrounds
                  if (bgColor && 
                      bgColor !== 'rgba(0, 0, 0, 0)' && 
                      bgColor !== 'transparent' && 
                      bgColor !== 'rgb(255, 255, 255)' &&
                      bgColor !== 'rgb(15, 18, 23)' &&  // #0f1217 dark theme
                      bgColor !== 'rgb(11, 15, 21)') {  // #0b0f15 darker variant
                    cellBgStyle += `background-color: ${bgColor} !important; `;
                  } else {
                    // Check TD background as final fallback
                    const tdStyle = window.getComputedStyle(cell);
                    const tdBgColor = tdStyle.backgroundColor;
                    if (tdBgColor && 
                        tdBgColor !== 'rgba(0, 0, 0, 0)' && 
                        tdBgColor !== 'transparent' && 
                        tdBgColor !== 'rgb(255, 255, 255)' &&
                        tdBgColor !== 'rgb(15, 18, 23)' &&
                        tdBgColor !== 'rgb(11, 15, 21)') {
                      cellBgStyle += `background-color: ${tdBgColor} !important; `;
                    } else {
                      // Fallback to computed row background
                      const rowStyle = window.getComputedStyle(row);
                      const rowBg = rowStyle.backgroundColor;
                      if (rowBg && 
                          rowBg !== 'rgba(0, 0, 0, 0)' && 
                          rowBg !== 'transparent' &&
                          rowBg !== 'rgb(255, 255, 255)' &&
                          rowBg !== 'rgb(15, 18, 23)' &&
                          rowBg !== 'rgb(11, 15, 21)') {
                        cellBgStyle += `background-color: ${rowBg} !important; `;
                      }
                    }
                  }
                }
                
                // Use already-declared contentStyle from above
                let fontSize = contentStyle.fontSize;
                let fontFamily = contentStyle.fontFamily;
                let fontWeight = contentStyle.fontWeight;
                let fontStyle = contentStyle.fontStyle;
                let textDecoration = contentStyle.textDecoration;
                let textAlign = contentStyle.textAlign;
                
                // Apply formatting styles
                if (fontSize) {
                  cellTextStyle += `font-size: ${fontSize} !important; `;
                }
                if (fontFamily && fontFamily !== 'inherit' && !fontFamily.includes('system-ui')) {
                  cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                }
                if (fontWeight) {
                  cellTextStyle += `font-weight: ${fontWeight} !important; `;
                }
                if (fontStyle) {
                  cellTextStyle += `font-style: ${fontStyle} !important; `;
                }
                if (textDecoration && !textDecoration.includes('none')) {
                  cellTextStyle += `text-decoration: ${textDecoration} !important; `;
                }
                if (textAlign && textAlign !== 'left' && textAlign !== 'start') {
                  cellTextStyle += `text-align: ${textAlign} !important; `;
                }
              } else {
                // Special handling for separator columns
                if (cell.dataset.type === 'separator') {
                  cellContent = cell.textContent.trim(); // Use cell content as-is (may be empty for CALL TIME/SUB)
                  
                  // Extract computed styles from the TD for separator cells
                  const computedStyle = window.getComputedStyle(cell);
                  const fontSize = computedStyle.fontSize;
                  const fontFamily = computedStyle.fontFamily;
                  const fontWeight = computedStyle.fontWeight;
                  const fontStyle = computedStyle.fontStyle;
                  const textDecoration = computedStyle.textDecoration;
                  const textAlign = computedStyle.textAlign;
                  const verticalAlign = computedStyle.verticalAlign;
                  
                  // Apply styles
                  if (fontSize) {
                    cellTextStyle += `font-size: ${fontSize} !important; `;
                  }
                  if (fontFamily && fontFamily !== 'inherit' && !fontFamily.includes('system-ui')) {
                    cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                  }
                  if (fontWeight) {
                    cellTextStyle += `font-weight: ${fontWeight} !important; `;
                  }
                  if (fontStyle) {
                    cellTextStyle += `font-style: ${fontStyle} !important; `;
                  }
                  if (textDecoration && !textDecoration.includes('none')) {
                    cellTextStyle += `text-decoration: ${textDecoration} !important; `;
                  }
                  if (textAlign && textAlign !== 'left' && textAlign !== 'start') {
                    cellTextStyle += `text-align: ${textAlign} !important; `;
                  }
                  if (verticalAlign && verticalAlign !== 'baseline') {
                    cellTextStyle += `vertical-align: ${verticalAlign} !important; `;
                  }
                  
                  // Get colors from dataset
                  const cellFg = cell.dataset.cellFg;
                  const cellBg = cell.dataset.cellBg;
                  
                  if (cellFg) {
                    cellTextStyle += `color: ${cellFg} !important; `;
                  }
                  
                  if (cellBg) {
                    cell._pdfBgColor = cellBg;
                  } else {
                    // Fallback to computed row background
                    const rowStyle = window.getComputedStyle(row);
                    const rowBg = rowStyle.backgroundColor;
                    if (rowBg && 
                        rowBg !== 'rgba(0, 0, 0, 0)' && 
                        rowBg !== 'transparent' &&
                        rowBg !== 'rgb(255, 255, 255)' &&
                        rowBg !== 'rgb(15, 18, 23)' &&
                        rowBg !== 'rgb(11, 15, 21)') {
                      cell._pdfBgColor = rowBg;
                    }
                  }
                } else {
                  // Plain text cell (idx, start, end, duration, etc.) - remove all UI elements
                  const clone = cell.cloneNode(true);
                  const uiElements = clone.querySelectorAll('button, .format-popup, .upload-btn, input, textarea, select, svg, .icon');
                  uiElements.forEach(el => el.remove());
                  cellContent = clone.textContent.trim();
                  
                  // Extract computed styles from the TD itself for plain text cells
                  const computedStyle = window.getComputedStyle(cell);
                  const fontSize = computedStyle.fontSize;
                  const fontFamily = computedStyle.fontFamily;
                  const fontWeight = computedStyle.fontWeight;
                  const fontStyle = computedStyle.fontStyle;
                  const textDecoration = computedStyle.textDecoration;
                  const textAlign = computedStyle.textAlign;
                  
                  // Apply styles - be aggressive, capture everything
                  if (fontSize) {
                    cellTextStyle += `font-size: ${fontSize} !important; `;
                  }
                  if (fontFamily && fontFamily !== 'inherit' && !fontFamily.includes('system-ui')) {
                    cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                  }
                  // Capture ALL font weights (including normal, bold, etc.)
                  if (fontWeight) {
                    cellTextStyle += `font-weight: ${fontWeight} !important; `;
                  }
                  // Capture ALL font styles (including normal, italic, etc.)
                  if (fontStyle) {
                    cellTextStyle += `font-style: ${fontStyle} !important; `;
                  }
                  if (textDecoration && !textDecoration.includes('none')) {
                    cellTextStyle += `text-decoration: ${textDecoration} !important; `;
                  }
                  if (textAlign && textAlign !== 'left' && textAlign !== 'start') {
                    cellTextStyle += `text-align: ${textAlign} !important; `;
                  }
                  
                  // Get colors - NO ROW FALLBACKS
                  const cellFg = cell.dataset.cellFg;
                  const cellBg = cell.dataset.cellBg;
                  
                  if (cellFg) {
                    cellTextStyle += `color: ${cellFg} !important; `;
                  } else {
                    const computedFg = computedStyle.color;
                    if (computedFg && computedFg !== 'rgba(0, 0, 0, 0)' && computedFg !== 'rgb(0, 0, 0)') {
                      cellTextStyle += `color: ${computedFg} !important; `;
                    }
                  }
                  
                  // For plain text cells, background must go on TD, not span
                  // Check dataset, then computed, then row background
                  if (cellBg) {
                    cell._pdfBgColor = cellBg;
                  } else {
                    // Check computed background
                    const computedBg = computedStyle.backgroundColor;
                    if (computedBg && 
                        computedBg !== 'rgba(0, 0, 0, 0)' && 
                        computedBg !== 'transparent' &&
                        computedBg !== 'rgb(255, 255, 255)' &&
                        computedBg !== 'rgb(15, 18, 23)' &&
                        computedBg !== 'rgb(11, 15, 21)') {
                      cell._pdfBgColor = computedBg;
                    } else {
                      // Fallback to computed row background for empty cells
                      const rowStyle = window.getComputedStyle(row);
                      const rowBg = rowStyle.backgroundColor;
                      if (rowBg && 
                          rowBg !== 'rgba(0, 0, 0, 0)' && 
                          rowBg !== 'transparent' &&
                          rowBg !== 'rgb(255, 255, 255)' &&
                          rowBg !== 'rgb(15, 18, 23)' &&
                          rowBg !== 'rgb(11, 15, 21)') {
                        cell._pdfBgColor = rowBg;
                      }
                    }
                  }
                }
              }
            }
          }
          } // End of non-tag content processing
          
          
          // Debug log first row's cells
          if (rowIndex === 1 && (cellTextStyle || cellBgStyle)) {
            console.log(`Row 1, Cell ${key}: textStyle="${cellTextStyle}" bgStyle="${cellBgStyle}"`);
          }
          
          // Combine row background with cell background
          let tdStyle = '';
          let spanBgStyle = '';
          
          // Add scaled width to cell
          if (scaledWidths[key]) {
            tdStyle += `width: ${scaledWidths[key]} !important; min-width: ${scaledWidths[key]} !important; max-width: ${scaledWidths[key]} !important; `;
          }
          
          // For plain text cells (start/end/idx), apply background to TD instead of span
          const isPlainTextCell = !cell.querySelector('input, textarea, select');
          
          // Apply background to TD for ALL cells (plain text and input cells)
          if (cell._pdfBgColor && isPlainTextCell) {
            // Plain text cells: background on TD only
            tdStyle += `background-color: ${cell._pdfBgColor} !important; `;
          } else if (cellBgStyle) {
            // Input cells: background on BOTH TD and span
            tdStyle += cellBgStyle;  // Apply to TD
            spanBgStyle = cellBgStyle;  // Also apply to span
          }
          
          // Add user-applied borders from BorderDesigner
          // Determine if this is the first printed column
          const visibleColumnsForBorder = Array.from(row.querySelectorAll('td')).filter(td => {
            const k = td.dataset.key;
            if (k === 'actions') return false;
            if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0) {
              if (k === 'drag') return window.selectedPrintColumns.includes('idx');
              return window.selectedPrintColumns.includes(k);
            }
            return true;
          });
          const cellIndexForBorder = visibleColumnsForBorder.indexOf(cell);
          const isFirstPrintedColumn = (cellIndexForBorder === 0);
          const isLastPrintedColumn = (cellIndexForBorder === visibleColumnsForBorder.length - 1);
          
          const borderStyles = BorderDesigner.getBorderStylesForPDF(cell, {
            isFirstPrintedColumn: isFirstPrintedColumn,
            isLastPrintedColumn: isLastPrintedColumn,
            isFirstRow: rowIndex === 0,
            isLastRow: isLastRow,
            hasOuterBorder: !!outerBorder
          });
          if (borderStyles) {
            tdStyle += borderStyles;
          }
          
          // Special handling for separator columns
          if (cell.dataset.type === 'separator') {
            // Base separator style
            let separatorStyle = `padding: 6pt 1pt !important; white-space: nowrap !important; line-height: 1 !important; `;
            
            // Apply cell formatting
            if (cellTextStyle) {
              // User has applied custom formatting - use it completely
              separatorStyle += cellTextStyle;
            } else {
              // No custom formatting - use defaults
              separatorStyle += `font-family: Arial, sans-serif !important; `;
              separatorStyle += `font-size: 10pt !important; `;
              separatorStyle += `font-weight: normal !important; `;
              separatorStyle += `text-align: center !important; `;
              separatorStyle += `vertical-align: middle !important; `;
            }
            
            // NO automatic borders - user controls all borders via BorderDesigner
            
            tdStyle += separatorStyle;
          } else {
            // NO default borders - only custom borders from BorderDesigner will show
            
            // Extract vertical alignment from cell dataset if available (for contenteditable cells)
            // Otherwise use default logic
            let verticalAlign;
            if (cell.dataset.valign) {
              verticalAlign = cell.dataset.valign;
            } else {
              verticalAlign = (key === 'start' || key === 'end' || key === 'duration') ? 'middle' : 'top';
            }
            tdStyle += `vertical-align: ${verticalAlign}; `;
            
            // Add padding directly to TD - minimal padding for time columns
            const isTimeColumn = (key === 'start' || key === 'end' || key === 'duration' || key === 'type');
            if (isTimeColumn) {
              tdStyle += `padding: 3pt 2pt !important; `;
            } else {
              tdStyle += `padding: 3pt 5pt 3pt 8pt !important; `;
            }
            
            // Add bottom rounded corners to last row
            const visibleColumns = Array.from(row.querySelectorAll('td')).filter(td => {
              const k = td.dataset.key;
              if (k === 'actions') return false;
              if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0) {
                if (k === 'drag') return window.selectedPrintColumns.includes('idx');
                return window.selectedPrintColumns.includes(k);
              }
              return true;
            });
            const cellIndex = visibleColumns.indexOf(cell);
            const isFirstCell = (cellIndex === 0);
            const isLastCell = (cellIndex === visibleColumns.length - 1);
            
            if (isLastRow && isFirstCell && !outerBorder) {
              tdStyle += `border-bottom-left-radius: 8pt !important; `;
            }
            if (isLastRow && isLastCell && !outerBorder) {
              tdStyle += `border-bottom-right-radius: 8pt !important; `;
            }
            
            // Add white-space: nowrap for time columns only
            if (isTimeColumn) {
              tdStyle += `white-space: nowrap; `;
            } else {
              tdStyle += `word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; `;
            }
          }
          
          // Wrap content in span with text styles for better PDF rendering
          // EXCEPT for separator column which should be rendered directly
          if (cell.dataset.type === 'separator') {
            // Use content from cell as-is (may be empty for CALL TIME/SUB)
            const sepContent = cellContent;
            bodyHTML += `<td data-type="separator" style="${tdStyle}">${sepContent}</td>`;
          } else if (cellTextStyle || spanBgStyle || (isPlainTextCell && cell._pdfBgColor) || hasTagContent) {
            // Debug for tag cells
            if (key === 'c_tags') {
              console.log(`🏷️ Condition check - cellTextStyle: ${!!cellTextStyle}, spanBgStyle: ${!!spanBgStyle}, isPlainTextCell: ${isPlainTextCell}, cell._pdfBgColor: ${!!cell._pdfBgColor}, hasTagContent: ${hasTagContent}, cellContent length: ${cellContent ? cellContent.length : 0}`);
            }
            // Has text formatting OR background (in span or TD) OR tag content
            let spanStyle = cellTextStyle;
            
            // Add background to span (only if not a plain text cell with TD background)
            if (spanBgStyle && !(isPlainTextCell && cell._pdfBgColor)) {
              spanStyle += spanBgStyle;
            }
            
            // Make span display block to fill width
            spanStyle += ' display: block; ';
            
            // If border-radius is present, add overflow hidden
            if (spanStyle.includes('border-radius')) {
              spanStyle += ' overflow: hidden; ';
            }
            
            // For plain text cells with no custom text formatting, use default font
            if (!cellTextStyle && isPlainTextCell) {
              spanStyle += ' font-size: 9pt; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; ';
            }
            
            // For plain text cells with TD background, render directly without span wrapper
            if (isPlainTextCell && cell._pdfBgColor) {
              // Add all text styles to TD
              let tdWithTextStyle = tdStyle + cellTextStyle;
              // Add default font if no custom text formatting
              if (!cellTextStyle) {
                tdWithTextStyle += ' font-size: 9pt; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; ';
              }
              
              // Debug logging for empty START/END cells
              if (!cellContent && (key === 'start' || key === 'end')) {
                console.log(`🔍 ${rowType} row empty ${key} cell:`);
                console.log(`   cell._pdfBgColor: ${cell._pdfBgColor}`);
                console.log(`   tdStyle includes bg: ${tdStyle.includes('background-color')}`);
                console.log(`   Full HTML: ${`<td style="${tdWithTextStyle}">${cellContent || '\u00A0'}</td>`.substring(0, 200)}...`);
              }
              
              // Debug logging for tag cells
              if (key === 'c_tags' || hasTagContent) {
                console.log(`🏷️ [${key}] ABOUT TO ADD - hasTagContent: ${hasTagContent}, cellContent: ${cellContent ? cellContent.substring(0, 100) + '...' : 'EMPTY'}`);
              }
              
              bodyHTML += `<td style="${tdWithTextStyle}">${cellContent || '\u00A0'}</td>`;
            } else {
              // For plain text cells WITHOUT TD background, or input cells, use span wrapper
              // For plain text cells with TD background AND text formatting, make span transparent
              if (isPlainTextCell && cell._pdfBgColor) {
                spanStyle += ' background: transparent !important; ';
              }
              
              // Debug logging for tag cells
              if (key === 'c_tags' || hasTagContent) {
                console.log(`🏷️ Adding to bodyHTML (span) - key: ${key}, hasTagContent: ${hasTagContent}, cellContent length: ${cellContent ? cellContent.length : 0}`);
              }
              
              bodyHTML += `<td style="${tdStyle}"><span style="${spanStyle}">${cellContent || '\u00A0'}</span></td>`;
            }
            
            // Debug: log first content cell to verify TD padding
            if (cellContent && !window._firstContentLogged && key !== 'drag' && cell.dataset.type !== 'separator') {
              console.log(`📝 First content cell (${key}) TD style:`, tdStyle);
              window._firstContentLogged = true;
            }
          } else {
            // No custom text formatting - simple span without padding (TD has padding)
            
            // Debug for tag cells that reach this branch
            if (key === 'c_tags' || hasTagContent) {
              console.log(`🏷️ Tag cell in ELSE branch - hasTagContent: ${hasTagContent}, cellContent length: ${cellContent ? cellContent.length : 0}`);
            }
            
            // For plain text cells with TD background, render directly without span wrapper
            if (isPlainTextCell && cell._pdfBgColor) {
              // Add font styling to TD
              let tdWithFont = tdStyle;
              tdWithFont += ' font-size: 9pt; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; ';
              bodyHTML += `<td style="${tdWithFont}">${cellContent || '\u00A0'}</td>`;
            } else {
              let spanStyle = `font-size: 9pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; display: block; `;
              
              // Add background to span
              if (spanBgStyle) {
                spanStyle += spanBgStyle;
              }
              
              bodyHTML += `<td style="${tdStyle}"><span style="${spanStyle}">${cellContent || '\u00A0'}</span></td>`;
            }
            
            // Debug: log first default cell to verify TD padding
            if (cellContent && !window._firstDefaultLogged && key !== 'drag' && cell.dataset.type !== 'separator') {
              console.log(`📝 First default cell (${key}) TD style:`, tdStyle);
              window._firstDefaultLogged = true;
            }
          }
        }
        
        bodyHTML += '</tr>';
      }
      
      bodyHTML += '</tbody>';
      
      console.log('✓ PDF HTML built:', Math.round((printCSS.length + bodyHTML.length) / 1024), 'KB');
      
      // Get print settings from localStorage
      const pdfShowHeader = localStorage.getItem('pdfShowHeader') !== 'false'; // default true
      const pdfShowColumnHeaders = localStorage.getItem('pdfShowColumnHeaders') !== 'false'; // default true
      const pdfRoundedCorners = localStorage.getItem('pdfRoundedCorners') === 'true'; // default false
      

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
    }
    
    /* Strip @media print wrapper from CSS for PDF generation */
    ${printCSS.replace(/@media print\s*\{/, '').replace(/\}\s*$/, '')}
    
    /* Override page size with explicit orientation */
    @page {
      size: ${pageSize};
      margin: 0.3in;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    .header-image {
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    .header-image + div {
      page-break-before: avoid;
      page-break-inside: avoid;
    }
    
    /* Override image height */
    .cell-media {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 3pt !important;
      align-items: flex-start !important;
    }
    
    .cell-media img {
      max-height: ${pdfImageHeight}px !important;
      max-width: 120pt !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      display: block !important;
    }
    
    /* Force text wrapping in all table cells */
    table td {
      word-wrap: break-word !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
    
    .print-meta {
      margin-bottom: 12pt;
    }
    
    .schedule-scroll {
      width: fit-content !important;
      ${outerBorder ? `border: ${outerBorder} !important;` : ''}
      ${pdfRoundedCorners ? `border-radius: 8pt !important; overflow: hidden !important;` : ''}
    }
  </style>
</head>
<body>
  ${pdfShowHeader ? headerHTML : ''}
  ${pdfShowHeader && metaDisplay ? `<div class="print-meta">${metaDisplay}</div>` : ''}
  <div class="schedule-scroll">
    <table id="scheduleTable" class="schedule" style="table-layout: fixed; width: ${totalTableWidth}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
      ${colGroupHTML}
      ${pdfShowColumnHeaders ? tableHeaderHTML : ''}
      ${bodyHTML}
    </table>
  </div>
</body>
</html>
`;
    }

    async function blobToDataURL(blobUrl) {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // ==================== TAG REPORT GENERATION ====================
    
    /**
     * Filter schedule rows by selected tags
     * @param {string[]} tagIds - Array of tag IDs to filter by
     * @returns {Array} Array of filtered row objects with metadata
     */
    function filterRowsByTags(tagIds) {
      console.log('🏷️ filterRowsByTags called with:', tagIds);
      
      // Helper function to parse time strings to minutes
      const parseTimeStr = (timeStr) => {
        if (!timeStr) return 0;
        timeStr = timeStr.trim();
        
        const is12Hour = /AM|PM/i.test(timeStr);
        
        if (is12Hour) {
          const isPM = /PM/i.test(timeStr);
          const timeOnly = timeStr.replace(/\s*(AM|PM)/i, '').trim();
          let [hours, minutes] = timeOnly.split(':').map(Number);
          
          if (isPM && hours !== 12) hours += 12;
          else if (!isPM && hours === 12) hours = 0;
          
          return hours * 60 + (minutes || 0);
        } else {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + (minutes || 0);
        }
      };
      
      const tbody = document.getElementById('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const schedule = window.getData ? window.getData() : null;
      
      console.log('🏷️ Total rows to check:', rows.length);
      
      const filteredRows = [];
      
      rows.forEach((row, originalIndex) => {
        const rowId = row.dataset.id;
        const rowType = row.dataset.type;
        
        // Find row data in schedule
        let rowData = null;
        let dayIndex = 0;
        let dayDate = '';
        let dayDow = '';
        
        if (schedule && schedule.days) {
          for (let i = 0; i < schedule.days.length; i++) {
            const day = schedule.days[i];
            rowData = day.rows.find(r => r.id === rowId);
            if (rowData) {
              dayIndex = i;
              dayDate = day.date || '';
              dayDow = day.dow || '';
              break;
            }
          }
        }
        
        // Check ALL tag columns in this row for selected tags
        const allTagsBoxes = row.querySelectorAll('.tagsBox');
        let rowTagIds = [];
        
        allTagsBoxes.forEach(tagsBox => {
          const tagsValue = tagsBox.querySelector('.tags-value');
          if (tagsValue && tagsValue.value) {
            const ids = tagsValue.value.split(',').filter(id => id.trim());
            rowTagIds = rowTagIds.concat(ids);
          }
        });
        
        // Also check schedule data for tags (in case DOM isn't synced)
        if (rowData && rowData.custom) {
          Object.keys(rowData.custom).forEach(colKey => {
            const colData = rowData.custom[colKey];
            if (Array.isArray(colData.value)) {
              rowTagIds = rowTagIds.concat(colData.value);
            }
          });
        }
        
        // Remove duplicates
        rowTagIds = [...new Set(rowTagIds)];
        
        if (rowTagIds.length === 0) return;
        
        const hasMatchingTag = rowTagIds.some(id => tagIds.includes(id));
        
        console.log('🏷️ Row', rowId, 'has tags:', rowTagIds, 'match:', hasMatchingTag);
        
        if (!hasMatchingTag) return;
        
        // Extract row information - get title from multiple sources
        // 1. From schedule data (rowData.title)
        // 2. From DOM .title or .subTitle input
        // 3. From first text custom column
        let title = '';
        if (rowData && rowData.title) {
          title = rowData.title;
        } else {
          const titleInput = row.querySelector('.title, .subTitle');
          if (titleInput && titleInput.value) {
            title = titleInput.value;
          } else {
            // Try first custom column with text content
            const firstTextCell = row.querySelector('.cc-input');
            if (firstTextCell) {
              title = firstTextCell.textContent || firstTextCell.value || '';
            }
          }
        }
        
        console.log('🏷️ Row title:', title, 'from rowData:', rowData?.title);
        
        const startCell = row.querySelector('td[data-key="start"]');
        const endCell = row.querySelector('td[data-key="end"]');
        const durationInput = row.querySelector('input.duration, input.subDur');
        
        const start = startCell ? startCell.textContent.trim() : '';
        const end = endCell ? endCell.textContent.trim() : '';
        const duration = durationInput ? parseInt(durationInput.value) || 0 : 0;
        
        // Convert times to minutes for sorting
        const startMinutes = start && start !== '—' ? parseTimeStr(start) : 0;
        const endMinutes = end && end !== '—' ? parseTimeStr(end) : 0;
        
        // Extract custom column data from schedule data and DOM
        const customColumns = {};
        
        // First from schedule data
        if (rowData && rowData.custom) {
          Object.keys(rowData.custom).forEach(colKey => {
            const colData = rowData.custom[colKey];
            customColumns[colKey] = colData.value || '';
          });
        }
        
        // Also check DOM for text columns (cc-input elements)
        row.querySelectorAll('td[data-key^="c_"]').forEach(td => {
          const colKey = td.dataset.key;
          if (!customColumns[colKey]) {
            const ccInput = td.querySelector('.cc-input');
            if (ccInput) {
              // Text content for contenteditable divs
              customColumns[colKey] = ccInput.textContent || ccInput.value || '';
            }
          }
        });
        
        filteredRows.push({
          rowId,
          type: rowType,
          title,
          start,
          startMinutes,
          end,
          endMinutes,
          duration,
          dayIndex,
          dayDate,
          dayDow,
          tags: rowTagIds,
          customColumns,
          isCallTime: rowType === 'CALL TIME',
          isFirstEvent: false,
          isLastEvent: false,
          originalIndex
        });
      });
      
      console.log('🏷️ Filtered rows found:', filteredRows.length);
      
      // Sort by day, then by start time
      filteredRows.sort((a, b) => {
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
        return a.startMinutes - b.startMinutes;
      });
      
      // Mark first and last events
      if (filteredRows.length > 0) {
        filteredRows[0].isFirstEvent = true;
        filteredRows[filteredRows.length - 1].isLastEvent = true;
      }
      
      return filteredRows;
    }
    
    /**
     * Build HTML for tag report with timeline
     * @param {Array} filteredRows - Filtered row objects
     * @param {string} tagNames - Comma-separated tag names
     * @param {Object} metadata - Report metadata
     * @returns {string} Complete HTML string
     */
    function buildTagReportHTML(filteredRows, tagNames, metadata, orientation = 'portrait', hasMinor = false) {
      const pageSize = orientation === 'landscape' ? '11in 8.5in' : '8.5in 11in';
      
      if (filteredRows.length === 0) {
        return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>No Events Found</title></head>
<body style="font-family: Arial, sans-serif; padding: 40pt; text-align: center; color: #666;">
  <h2>No Events Found</h2>
  <p>No events were found for the selected tags.</p>
</body>
</html>`;
      }
      
      // Group by day
      const dayGroups = {};
      filteredRows.forEach(row => {
        const key = `${row.dayIndex}`;
        if (!dayGroups[key]) {
          dayGroups[key] = {
            dayIndex: row.dayIndex,
            dayDate: row.dayDate,
            dayDow: row.dayDow,
            rows: []
          };
        }
        dayGroups[key].rows.push(row);
      });
      
      const days = Object.values(dayGroups);
      
      // Calculate call and wrap times for display
      let callTimeDisplay = '';
      let wrapTimeDisplay = '';
      
      filteredRows.forEach(row => {
        if (row.isCallTime) {
          if (row.endMinutes > 0 && !callTimeDisplay) {
            callTimeDisplay = row.end;
          }
        } else {
          if (row.startMinutes > 0 && !callTimeDisplay) {
            callTimeDisplay = row.start;
          }
        }
        if (row.endMinutes > 0) {
          wrapTimeDisplay = row.end;
        }
      });
      
      // Format hours from metadata
      const formatMinutes = (mins) => {
        if (mins === null || mins === undefined) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };
      
      const totalOnSetDisplay = formatMinutes(metadata.onSetMinutes);
      const cumulativeDisplay = hasMinor ? formatMinutes(metadata.cumulativeMinutes) : '';
      
      // Build single-line metadata string like schedule report
      let metaDisplay = '';
      if (metadata.title) metaDisplay += metadata.title;
      if (metadata.version) metaDisplay += ` v.${metadata.version}`;
      if (metadata.dow && metadata.date) metaDisplay += ` • ${metadata.dow} ${metadata.date}`;
      else if (metadata.date) metaDisplay += ` • ${metadata.date}`;
      if (metadata.dayX && metadata.dayY) metaDisplay += ` • Day ${metadata.dayX} of ${metadata.dayY}`;
      
      // Append tag names and hours
      metaDisplay += ` • ${tagNames}`;
      if (totalOnSetDisplay) metaDisplay += ` • On Set: ${totalOnSetDisplay}`;
      if (cumulativeDisplay) metaDisplay += ` • Working: ${cumulativeDisplay}`;
      
      // Build event blocks HTML
      let eventsHTML = '';
      
      days.forEach((day, dayIdx) => {
        // Day header
        if (days.length > 1) {
          eventsHTML += `
            <div style="page-break-before: ${dayIdx > 0 ? 'always' : 'auto'}; margin-bottom: 6pt;">
              <h2 style="font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3pt; color: #1e293b; margin: 0 0 6pt 0;">
                ${day.dayDow}, ${day.dayDate}
              </h2>
            </div>
          `;
        }
        
        day.rows.forEach((row, idx) => {
          const isLast = idx === day.rows.length - 1;
          
          // Check if next row is non-sequential (for separator)
          const nextRow = idx < day.rows.length - 1 ? day.rows[idx + 1] : null;
          const isNonSequential = nextRow && (nextRow.originalIndex - row.originalIndex > 1);
          
          // Format time display - hide dash for single-time events like call times
          let timeDisplay = '';
          if (row.start && row.start !== '—' && row.end && row.end !== '—') {
            timeDisplay = `${row.start} - ${row.end}`;
          } else if (row.end && row.end !== '—') {
            timeDisplay = row.end;
          } else if (row.start && row.start !== '—') {
            timeDisplay = row.start;
          } else {
            timeDisplay = '—';
          }
          
          // Event block - compact
          eventsHTML += `
            <div style="page-break-inside: avoid; margin-bottom: 0;">
              <div class="event-block" style="
                display: flex;
                gap: 8pt;
                padding: 4pt 8pt;
                border-left: 2pt solid ${row.isCallTime ? '#10b981' : '#3182ce'};
                background: ${row.isCallTime ? '#f0fdf4' : '#f8fafc'};
                border-radius: 2pt;
              ">
                <div class="time-col" style="
                  min-width: 55pt;
                  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
                  font-size: 7pt;
                  color: #1e293b;
                ">
                  <div style="font-weight: 700;">${timeDisplay}</div>
                  ${row.duration ? `<div style="color: #64748b; font-size: 6pt;">${formatDuration(row.duration)}</div>` : ''}
                </div>
                <div class="event-details" style="flex: 1;">
                  <div style="font-weight: 600; font-size: 7pt; color: #0f172a;">
                    ${row.title || 'Untitled Event'}${row.isCallTime ? ' <span style="color: #059669;">★</span>' : ''}
                  </div>
                </div>
              </div>
              
              ${!isLast ? (isNonSequential ? `
                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                  margin: 0 0 0 9pt;
                ">
                  <div style="
                    width: 1pt;
                    height: 12pt;
                    border-left: 1pt dotted #94a3b8;
                  "></div>
                  <div style="
                    font-size: 6pt;
                    color: #94a3b8;
                    margin-left: -3pt;
                  ">▼</div>
                </div>
              ` : `
                <div class="timeline-connector" style="
                  width: 2pt;
                  height: 8pt;
                  margin: 0 0 0 8pt;
                  background: linear-gradient(to bottom, 
                    #cbd5e1 0%, 
                    #cbd5e1 40%, 
                    transparent 40%, 
                    transparent 60%, 
                    #cbd5e1 60%, 
                    #cbd5e1 100%
                  );
                "></div>
              `) : ''}
            </div>
          `;
        });
      });
      
      // Build complete HTML
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${tagNames}</title>
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    
    @page {
      size: ${pageSize};
      margin: 0.4in;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif;
      font-size: 7pt;
      color: #1e293b;
      background: white;
    }
    
    .header {
      margin-bottom: 10pt;
      padding-bottom: 6pt;
      border-bottom: 1pt solid #e2e8f0;
    }
    
    .report-title {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 4pt 0;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    
    .report-subtitle {
      font-size: 8pt;
      font-weight: 600;
      margin: 0 0 2pt 0;
      color: #3182ce;
    }
    
    .metadata {
      font-size: 6pt;
      color: #64748b;
      margin-top: 4pt;
    }
    
    .metadata-row {
      display: inline;
      margin-right: 12pt;
    }
    
    .metadata-label {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }
    
    .call-wrap-times {
      display: inline-flex;
      gap: 16pt;
      margin: 6pt 0 0 0;
      padding: 4pt 8pt;
      background: #f1f5f9;
      border-radius: 3pt;
    }
    
    .time-badge {
      display: flex;
      align-items: center;
      gap: 4pt;
    }
    
    .time-badge-label {
      font-size: 6pt;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.3pt;
    }
    
    .time-badge-value {
      font-size: 8pt;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 7pt; color: #64748b; margin-bottom: 6pt;">${metaDisplay}</div>
    
    <div class="call-wrap-times">
      <div class="time-badge">
        <span class="time-badge-label">Call:</span>
        <span class="time-badge-value">${callTimeDisplay}</span>
      </div>
      <div class="time-badge">
        <span class="time-badge-label">Wrap:</span>
        <span class="time-badge-value">${wrapTimeDisplay}</span>
      </div>
    </div>
  </div>
  
  <div class="events">
    ${eventsHTML}
  </div>
</body>
</html>
`;
    }
    
    function formatDuration(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${mins}m`;
      }
    }
    
    /**
     * Generate tag report PDF
     */
    async function generateTagReport(selectedTagIds, viewMode = 'digest', tagOrientation = 'portrait') {
      try {
        console.log('🏷️ Generating tag report for:', selectedTagIds);
        console.log('📋 View mode:', viewMode, 'Orientation:', tagOrientation);
        
        // Get tag details
        const tags = selectedTagIds.map(id => window.TagManager.getTag(id)).filter(t => t);
        const tagNames = tags.map(t => t.label).join(', ');
        const hasMinor = tags.some(t => t.isMinor);
        
        // Build title with tag names appended
        const baseTitle = document.getElementById('metaTitle')?.value || '';
        const titleWithTags = baseTitle ? `${baseTitle} - ${tagNames}` : tagNames;
        
        // Filter rows
        const filteredRows = filterRowsByTags(selectedTagIds);
        console.log('📋 Filtered rows:', filteredRows.length);
        
        if (filteredRows.length === 0) {
          alert('No events found for the selected tags.');
          return;
        }
        
        let html;
        let orientation = tagOrientation;
        
        if (viewMode === 'schedule') {
          // Schedule view - use full row layout with filtering
          const filteredRowIds = filteredRows.map(r => r.rowId);
          
          // Calculate which rows need a separator before them (non-sequential)
          const separatorBeforeIds = new Set();
          for (let i = 1; i < filteredRows.length; i++) {
            const prevIndex = filteredRows[i - 1].originalIndex;
            const currIndex = filteredRows[i].originalIndex;
            if (currIndex - prevIndex > 1) {
              separatorBeforeIds.add(filteredRows[i].rowId);
            }
          }
          
          // Calculate hours for tag report - handle call times properly
          let earliestMinutes = Infinity;
          let latestMinutes = 0;
          
          filteredRows.forEach(row => {
            if (row.isCallTime) {
              // Call times: the "call" time is in the end column
              if (row.endMinutes > 0 && row.endMinutes < earliestMinutes) {
                earliestMinutes = row.endMinutes;
              }
            } else {
              // Events: use start time
              if (row.startMinutes > 0 && row.startMinutes < earliestMinutes) {
                earliestMinutes = row.startMinutes;
              }
            }
            // For wrap, always use the latest end time
            if (row.endMinutes > latestMinutes) {
              latestMinutes = row.endMinutes;
            }
          });
          
          const totalOnSetMinutes = latestMinutes - earliestMinutes;
          
          const tagReportData = {
            tagNames,
            totalOnSetMinutes,
            // Only include cumulative working time for minors
            cumulativeMinutes: hasMinor ? filteredRows
              .filter(r => !r.isCallTime && r.duration > 0)
              .reduce((sum, r) => sum + r.duration, 0) : null
          };
          
          // Temporarily set orientation for buildCompleteHTML
          const savedOrientation = localStorage.getItem('pdfOrientation');
          localStorage.setItem('pdfOrientation', tagOrientation);
          
          // Load and set print columns
          const savedPrintColumns = localStorage.getItem('printColumns');
          if (savedPrintColumns) {
            try {
              const parsed = JSON.parse(savedPrintColumns);
              window.selectedPrintColumns = (parsed && parsed.length > 0) ? parsed : null;
            } catch (e) {
              window.selectedPrintColumns = null;
            }
          } else {
            window.selectedPrintColumns = null;
          }
          
          html = await buildCompleteHTML(filteredRowIds, separatorBeforeIds, tagReportData);
          
          // Restore original values
          if (savedOrientation) {
            localStorage.setItem('pdfOrientation', savedOrientation);
          } else {
            localStorage.removeItem('pdfOrientation');
          }
          
        } else {
          // Digest view - compact timeline
          // Get full metadata like schedule report uses
          const metaVersion = document.getElementById('metaVersion')?.value || '';
          const metaDateRaw = document.getElementById('metaDate')?.value || '';
          const metaX = document.getElementById('metaX')?.value || '1';
          const metaY = document.getElementById('metaY')?.value || '1';
          
          // Format date
          let metaDate = '';
          let metaDow = '';
          if (metaDateRaw) {
            const d = new Date(metaDateRaw + 'T00:00:00');
            if (!isNaN(d.getTime())) {
              const month = d.getMonth() + 1;
              const day = d.getDate();
              const year = d.getFullYear();
              metaDate = `${month}/${day}/${year}`;
              metaDow = d.toLocaleDateString('en-US', { weekday: 'long' });
            }
          }
          
          // Calculate hours for digest
          let earliestMinutes = Infinity;
          let latestMinutes = 0;
          
          filteredRows.forEach(row => {
            if (row.isCallTime) {
              if (row.endMinutes > 0 && row.endMinutes < earliestMinutes) {
                earliestMinutes = row.endMinutes;
              }
            } else {
              if (row.startMinutes > 0 && row.startMinutes < earliestMinutes) {
                earliestMinutes = row.startMinutes;
              }
            }
            if (row.endMinutes > latestMinutes) {
              latestMinutes = row.endMinutes;
            }
          });
          
          const digestOnSetMinutes = latestMinutes - earliestMinutes;
          const digestCumulativeMinutes = hasMinor ? filteredRows
            .filter(r => !r.isCallTime && r.duration > 0)
            .reduce((sum, r) => sum + r.duration, 0) : null;
          
          html = buildTagReportHTML(filteredRows, tagNames, {
            title: baseTitle,
            version: metaVersion,
            date: metaDate,
            dow: metaDow,
            dayX: metaX,
            dayY: metaY,
            onSetMinutes: digestOnSetMinutes,
            cumulativeMinutes: digestCumulativeMinutes
          }, tagOrientation, hasMinor);
        }
        
        console.log('📄 HTML built, sending to Puppeteer...');
        console.log('📐 Tag report orientation:', orientation);
        
        // Send to Puppeteer
        const response = await fetch('https://railway-pdf-server-production.up.railway.app/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            html: html,
            orientation: orientation
          })
        });
        
        if (!response.ok) {
          throw new Error('PDF generation failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Open in new tab
        window.open(url, '_blank');
        
        // Also trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${tagNames.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('✅ Tag report generated successfully');
      } catch (error) {
        console.error('❌ Tag report generation error:', error);
        alert('Failed to generate report: ' + error.message);
      }
    }
    
    /**
     * Generate master schedule report (no sub-schedules)
     * Shows only top-level events and call times, excluding SUB rows and their children
     */
    async function generateMasterReport(orientation = 'landscape') {
      try {
        console.log('📋 Generating master report...');
        
        // Get all rows and filter to master-level only (exclude SUB and subchild rows)
        const allRows = Array.from(document.querySelectorAll('#tbody tr'));
        const masterRowIds = [];
        
        allRows.forEach(row => {
          const rowType = row.dataset.type;
          const isSubChild = row.classList.contains('subchild');
          
          // Include only top-level rows (EVENT, CALL TIME) - exclude SUB headers and their children
          if (!isSubChild && rowType !== 'SUB') {
            masterRowIds.push(row.dataset.id);
          }
        });
        
        console.log('📋 Master rows:', masterRowIds.length);
        
        if (masterRowIds.length === 0) {
          alert('No master-level events found.');
          return;
        }
        
        // Set orientation
        const savedOrientation = localStorage.getItem('pdfOrientation');
        localStorage.setItem('pdfOrientation', orientation);
        
        // Load print columns
        const savedPrintColumns = localStorage.getItem('printColumns');
        if (savedPrintColumns) {
          try {
            const parsed = JSON.parse(savedPrintColumns);
            window.selectedPrintColumns = (parsed && parsed.length > 0) ? parsed : null;
          } catch (e) {
            window.selectedPrintColumns = null;
          }
        } else {
          window.selectedPrintColumns = null;
        }
        
        // Build HTML with filtering
        const html = await buildCompleteHTML(masterRowIds, null, null);
        
        // Restore orientation
        if (savedOrientation) {
          localStorage.setItem('pdfOrientation', savedOrientation);
        } else {
          localStorage.removeItem('pdfOrientation');
        }
        
        // Send to Puppeteer
        const response = await fetch('https://railway-pdf-server-production.up.railway.app/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, orientation })
        });
        
        if (!response.ok) {
          throw new Error('PDF generation failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        window.open(url, '_blank');
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `master-schedule-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('✅ Master report generated successfully');
      } catch (error) {
        console.error('❌ Master report generation error:', error);
        alert('Failed to generate master report: ' + error.message);
      }
    }
    
    /**
     * Generate sub-schedule report
     * Shows only a specific sub-schedule header and its children
     */
    async function generateSubScheduleReport(subScheduleId, orientation = 'landscape') {
      try {
        console.log('📋 Generating sub-schedule report for:', subScheduleId);
        
        // Find the sub-schedule header row
        const subHeader = document.querySelector(`#tbody tr[data-id="${subScheduleId}"]`);
        if (!subHeader || subHeader.dataset.type !== 'SUB') {
          alert('Sub-schedule not found.');
          return;
        }
        
        // Collect the sub-schedule header and all its children
        const subRowIds = [subScheduleId];
        let sibling = subHeader.nextElementSibling;
        while (sibling && sibling.classList.contains('subchild')) {
          subRowIds.push(sibling.dataset.id);
          sibling = sibling.nextElementSibling;
        }
        
        console.log('📋 Sub-schedule rows:', subRowIds.length);
        
        // Set orientation
        const savedOrientation = localStorage.getItem('pdfOrientation');
        localStorage.setItem('pdfOrientation', orientation);
        
        // Load print columns
        const savedPrintColumns = localStorage.getItem('printColumns');
        if (savedPrintColumns) {
          try {
            const parsed = JSON.parse(savedPrintColumns);
            window.selectedPrintColumns = (parsed && parsed.length > 0) ? parsed : null;
          } catch (e) {
            window.selectedPrintColumns = null;
          }
        } else {
          window.selectedPrintColumns = null;
        }
        
        // Get sub-schedule title for report metadata
        const titleCell = subHeader.querySelector('.subTitle');
        const subTitle = titleCell ? titleCell.textContent.trim() : 'Sub-Schedule';
        
        // Build HTML with filtering and sub-schedule title
        const html = await buildCompleteHTML(subRowIds, null, { tagNames: subTitle });
        
        // Restore orientation
        if (savedOrientation) {
          localStorage.setItem('pdfOrientation', savedOrientation);
        } else {
          localStorage.removeItem('pdfOrientation');
        }
        
        // Send to Puppeteer
        const response = await fetch('https://railway-pdf-server-production.up.railway.app/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, orientation })
        });
        
        if (!response.ok) {
          throw new Error('PDF generation failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        window.open(url, '_blank');
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `subschedule-${subTitle.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('✅ Sub-schedule report generated successfully');
      } catch (error) {
        console.error('❌ Sub-schedule report generation error:', error);
        alert('Failed to generate sub-schedule report: ' + error.message);
      }
    }
    
    // Make report functions globally accessible
    window.generateTagReport = generateTagReport;
    window.generateMasterReport = generateMasterReport;
    window.generateSubScheduleReport = generateSubScheduleReport;

    addRowBtn && addRowBtn.addEventListener('click', ()=>{ 
      const newRow = makeRow({ id:uid(), type:'EVENT', duration:30, custom:{} });
      tbody.appendChild(newRow); 
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
    });
    addCallBtn && addCallBtn.addEventListener('click', ()=>{ 
      const newRow = makeRow({ id:uid(), type:'CALL TIME', offset:0, anchorMode:'start', anchorId:'', callTimeDisplay:'end', custom:{} });
      tbody.appendChild(newRow); 
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
    });
    addSubBtn && addSubBtn.addEventListener('click', ()=>{
      const header=makeRow({ id:uid(), type:'SUB', offset:0, anchorMode:'eventEnd', anchorId:'', callTimeDisplay:'end', subColor:'', custom:{}, children:[{id:uid(), duration:30, custom:{}}] });
      tbody.appendChild(header);
      applyColumnVisibilityToRow(header);
      if(header._pendingChildren){ 
        header._pendingChildren.forEach(child => applyColumnVisibilityToRow(child));
        header.after(...header._pendingChildren); 
        delete header._pendingChildren; 
      }
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
    });

    // === Floating Action Button ===
    const fab = document.getElementById('fab');
    const fabMenu = document.getElementById('fabMenu');
    const fabAddEvent = document.getElementById('fabAddEvent');
    const fabAddCall = document.getElementById('fabAddCall');
    const fabAddSub = document.getElementById('fabAddSub');
    const fabAddSeparator = document.getElementById('fabAddSeparator');
    
    let fabOpen = false;
    
    fab && fab.addEventListener('click', (e) => {
      e.stopPropagation();
      fabOpen = !fabOpen;
      fab.classList.toggle('active', fabOpen);
      fabMenu.classList.toggle('active', fabOpen);
    });
    
    // Close FAB menu when clicking outside
    document.addEventListener('click', (e) => {
      if (fabOpen && !e.target.closest('.fab-container')) {
        fabOpen = false;
        fab.classList.remove('active');
        fabMenu.classList.remove('active');
      }
    });
    
    // FAB option handlers
    fabAddEvent && fabAddEvent.addEventListener('click', () => {
      const newRow = makeRow({ id:uid(), type:'EVENT', duration:30, custom:{} });
      tbody.appendChild(newRow);
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddCall && fabAddCall.addEventListener('click', () => {
      const newRow = makeRow({ id:uid(), type:'CALL TIME', offset:0, anchorMode:'start', anchorId:'', callTimeDisplay:'end', custom:{} });
      tbody.appendChild(newRow);
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddSub && fabAddSub.addEventListener('click', () => {
      const header=makeRow({ id:uid(), type:'SUB', offset:0, anchorMode:'eventEnd', anchorId:'', callTimeDisplay:'end', subColor:'', custom:{}, children:[{id:uid(), duration:30, custom:{}}] });
      tbody.appendChild(header);
      applyColumnVisibilityToRow(header);
      if(header._pendingChildren){ 
        header._pendingChildren.forEach(child => applyColumnVisibilityToRow(child));
        header.after(...header._pendingChildren); 
        delete header._pendingChildren; 
      }
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddSeparator && fabAddSeparator.addEventListener('click', () => {
      const newRow = makeRow({ id:uid(), type:'SEPARATOR', duration:0, separatorText:'', custom:{} });
      tbody.appendChild(newRow);
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      addRowResizeGrips();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    // Add Day button
    const fabAddDay = document.getElementById('fabAddDay');
    fabAddDay && fabAddDay.addEventListener('click', async () => {
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
      
      const choice = await showThreeOptionDialog(
        'Add New Day',
        'How would you like to create the new day?',
        [
          { label: 'Duplicate', value: 'duplicate' },
          { label: 'New', value: 'blank' },
          { label: 'Cancel', value: 'cancel' }
        ]
      );
      
      if (choice === 'cancel') return;
      
      saveDayData(); // Save current day first
      addNewDay(choice === 'duplicate');
    });

    resetBtn && resetBtn.addEventListener('click', ()=>{ 
      UNDO_STACK.length = 0; 
      REDO_STACK.length = 0; 
      try {
        localStorage.removeItem(STORAGE_KEY+'_UNDO');
        localStorage.removeItem(STORAGE_KEY+'_REDO');
      } catch(_) { } 
      updateUndoUi();
      
      if(!confirm('Reset to sample schedule? This will reset to a single day.')) return;
      
      // Fetch from default_schedule.json
      fetch('default_schedule.json')
        .then(response => response.json())
        .then(template => {
          // Generate fresh IDs
          const freshDayId = generateDayId();
          if (template.days && template.days[0]) {
            template.days[0].id = freshDayId;
            if (template.days[0].rows) {
              template.days[0].rows.forEach(row => {
                row.id = uid();
              });
            }
          }
          template.activeDayId = freshDayId;
          
          // Merge with current print/layout settings
          const st = readState();
          writeState({ 
            ...template,
            print: getPrint(), 
            layouts: getLayouts(), 
            activeLayoutId: getActiveLayoutId() 
          });
          
          rebuildUI();
        })
        .catch(err => {
          console.error('Failed to load sample schedule:', err);
          alert('Could not load sample schedule');
        });
    });

    // Print settings
    function applyPrintUiFromState(){ const p=getPrint(); psUseDesigner&&(psUseDesigner.checked=!!p.useDesigner); psShowMeta&&(psShowMeta.checked=!!p.showMeta); psCompact&&(psCompact.checked=!!p.compact); psGridLines&&(psGridLines.checked=!!p.gridLines); psBreakSubs&&(psBreakSubs.checked=!!p.breakSubs); psMediaSize&&(psMediaSize.value=p.mediaSize||'m'); psMediaHeight&&(psMediaHeight.value=p.mediaHeight||100); psMediaMax&&(psMediaMax.value=p.mediaMax||0); psAppendGallery&&(psAppendGallery.checked=!!p.appendGallery); psGalleryCols&&(psGalleryCols.value=p.galleryCols||4); psGallerySize&&(psGallerySize.value=p.gallerySize||'m'); }
    function bindPrintInputs(){ [psUseDesigner,psShowMeta,psCompact,psGridLines,psBreakSubs,psMediaSize,psMediaHeight,psMediaMax,psAppendGallery,psGalleryCols,psGallerySize].forEach(el=>{ el&&el.addEventListener('change', ()=>{ setPrint({ useDesigner:psUseDesigner?.checked, showMeta:psShowMeta?.checked, compact:psCompact?.checked, gridLines:psGridLines?.checked, breakSubs:psBreakSubs?.checked, mediaSize:psMediaSize?.value, mediaHeight:Number(psMediaHeight?.value||100), mediaMax:Number(psMediaMax?.value||0), appendGallery:psAppendGallery?.checked, galleryCols:Number(psGalleryCols?.value||4), gallerySize:psGallerySize?.value }); }); }); }
    function applyBodyPrintClasses(p){ document.body.classList.toggle('print-hide-meta', !p.showMeta); document.body.classList.toggle('print-compact', !!p.compact); document.body.classList.toggle('print-no-grid', !p.gridLines); document.body.classList.toggle('print-break-subs', !!p.breakSubs); document.body.classList.remove('media-s','media-m','media-l'); document.body.classList.add('media-'+(p.mediaSize||'m')); document.body.classList.remove('gallery-s','gallery-m','gallery-l'); document.body.classList.add('gallery-'+(p.gallerySize||'m')); }
    function buildDynamicPrintCSS(p){ const max=p.mediaMax||0; const height=p.mediaHeight||100; let css=''; if(max>0){ css+=`.uploadBox .u-grid .u-item:nth-child(n+${max+1}){display:none!important;}`;} css+=`@media print { .uploadBox .u-item, .uploadBox .u-thumb, .uploadBox img, .uploadBox video { max-height: ${height}px !important; } }`; const cols=Math.max(1,p.galleryCols||4); css+=`#printGallery .g-grid{grid-template-columns:repeat(${cols},1fr);}`; printDynamic.textContent=css; }
    async function buildGallery(p){ if(!p.appendGallery){ printGallery.hidden=true; galleryGrid.innerHTML=''; return; } printGallery.hidden=false; galleryGrid.innerHTML=''; const cells=qsa('td[data-key^="c_"] .uploadBox'); for(const cell of cells){ let ids=[]; try{ ids=JSON.parse(cell.parentElement.dataset.vaultIds||'[]'); }catch{} for(const id of ids){ try{ const rec=await vaultGet(Number(id)); if(!rec) continue; if(!/^image|^video/.test(rec.type)) continue; const url=URL.createObjectURL(rec.data); const item=document.createElement('div'); item.className='g-item'; if(rec.type.startsWith('image/')){ item.innerHTML=`<img src="${url}"><div class="cap">${rec.name||'Image'}</div>`; } else { item.innerHTML=`<video src="${url}" controls></video><div class="cap">${rec.name||'Video'}</div>`; } galleryGrid.appendChild(item); }catch(e){} } } }
    function beforePrint(){ 
      const p=getPrint(); 
      applyBodyPrintClasses(p); 
      buildGallery(p).catch(()=>{}); 
      
      // Set print image height from display setting (WYSIWYG)
      const imageHeight = localStorage.getItem('imageHeight') || '80';
      const imageHeightPx = parseInt(imageHeight) || 80;
      const imageHeightPt = Math.round(imageHeightPx * 0.75);
      document.documentElement.style.setProperty('--print-image-height', imageHeightPt + 'pt');
      console.log('🖨️ Native print: using display imageHeight', imageHeightPx + 'px', '→ --print-image-height', imageHeightPt + 'pt');
      
      // Apply print column preferences from Column Manager
      const savedPrintColumns = localStorage.getItem('printColumns');
      if (savedPrintColumns) {
        try {
          const printCols = JSON.parse(savedPrintColumns);
          const printSet = new Set(printCols);
          
          // Apply to header cells
          document.querySelectorAll('#scheduleTable thead th[data-key]').forEach(th => {
            const key = th.dataset.key;
            if (key && key !== 'drag' && key !== 'actions') {
              if (printSet.size > 0 && !printSet.has(key)) {
                th.classList.add('col-print-hide');
              } else {
                th.classList.remove('col-print-hide');
              }
            }
          });
          
          // Apply to body cells
          document.querySelectorAll('#scheduleTable tbody td[data-key]').forEach(td => {
            const key = td.dataset.key;
            if (key && key !== 'drag' && key !== 'actions') {
              if (printSet.size > 0 && !printSet.has(key)) {
                td.classList.add('col-print-hide');
              } else {
                td.classList.remove('col-print-hide');
              }
            }
          });
          
          // Apply to colgroup cols
          document.querySelectorAll('#scheduleTable colgroup col[data-key]').forEach(col => {
            const key = col.dataset.key;
            if (key && key !== 'drag' && key !== 'actions') {
              if (printSet.size > 0 && !printSet.has(key)) {
                col.classList.add('col-print-hide');
              } else {
                col.classList.remove('col-print-hide');
              }
            }
          });
          
          console.log('🖨️ Native print: applied print columns:', printCols);
        } catch (e) {
          console.warn('Failed to parse print columns for native print');
        }
      }
      
      // Transfer left border from hidden drag column to first visible column (idx)
      // This ensures the leftmost border prints correctly
      const thead = document.querySelector('#scheduleTable thead');
      const tbody = document.getElementById('tbody');
      
      if (thead) {
        const firstVisibleTh = thead.querySelector('th[data-key="idx"]');
        if (firstVisibleTh) {
          // Check if idx has a left border defined, if not check if drag had one to transfer
          const dragTh = thead.querySelector('th[data-key="drag"]');
          console.log('🖨️ Header idx borderLeft:', firstVisibleTh.dataset.borderLeft);
          if (dragTh && dragTh.dataset.borderLeft && !firstVisibleTh.dataset.borderLeft) {
            firstVisibleTh.dataset.printTransferredBorderLeft = dragTh.dataset.borderLeft;
            firstVisibleTh.style.setProperty('border-left', dragTh.dataset.borderLeft, 'important');
          }
          // If idx already has its own left border, just make sure it's applied for print
          else if (firstVisibleTh.dataset.borderLeft) {
            firstVisibleTh.style.setProperty('border-left', firstVisibleTh.dataset.borderLeft, 'important');
            console.log('🖨️ Applied header idx border-left:', firstVisibleTh.dataset.borderLeft);
          }
        }
      }
      
      if (tbody) {
        // Select ALL row types, not just .row
        tbody.querySelectorAll('tr').forEach(tr => {
          const firstVisibleTd = tr.querySelector('td[data-key="idx"]');
          if (firstVisibleTd) {
            const dragTd = tr.querySelector('td[data-key="drag"]');
            if (dragTd && dragTd.dataset.borderLeft && !firstVisibleTd.dataset.borderLeft) {
              firstVisibleTd.dataset.printTransferredBorderLeft = dragTd.dataset.borderLeft;
              firstVisibleTd.style.setProperty('border-left', dragTd.dataset.borderLeft, 'important');
            }
            else if (firstVisibleTd.dataset.borderLeft) {
              firstVisibleTd.style.setProperty('border-left', firstVisibleTd.dataset.borderLeft, 'important');
            }
          }
        });
      }
      
      console.log('🖨️ Native print: transferred left borders for print');
    }
    window.onbeforeprint=beforePrint;
    
    // Restore columns after printing
    window.onafterprint = function() {
      // Remove col-print-hide from all elements (restore screen view)
      document.querySelectorAll('.col-print-hide').forEach(el => {
        // Only remove if it was added by beforePrint, not set by column visibility
        // Check if column is actually visible in screen view
        const key = el.dataset.key;
        if (key) {
          const allCols = getAllColumnsSorted();
          const col = allCols.find(c => c.key === key);
          // If column should be visible on screen, remove the print-hide class
          if (col && col.show !== false) {
            el.classList.remove('col-print-hide');
          }
        }
      });
      
      // Clean up transferred print borders
      document.querySelectorAll('[data-print-transferred-border-left]').forEach(el => {
        delete el.dataset.printTransferredBorderLeft;
        // Remove the inline style if it wasn't an original border
        if (!el.dataset.borderLeft) {
          el.style.removeProperty('border-left');
        }
      });
      
      console.log('🖨️ Native print: restored screen view');
    };

    // Meta format button
    (function() {
      const btn = qs('#metaFormatBtn');
      const display = qs('#metaDisplay');
      if (btn && display) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          FormatDesigner.open(btn, 'meta');
        });
      }
    })();

    // Designer (from 8.9, simplified + fixed)
    function getLayouts(){ return readState().layouts || [ { id: 'layout_default', name:'One‑pager', modules:[ {id:uid(), type:'meta', x:1,y:1,w:12,h:2}, {id:uid(), type:'table', x:1,y:3,w:12,h:10} ] } ]; }
    function setLayouts(arr){ const s=readState(); writeState({...s, layouts: arr}); refreshLayoutPicker(); renderDesigner(); }
    function getActiveLayoutId(){ return readState().activeLayoutId || getLayouts()[0].id; }
    function setActiveLayoutId(id){ const s=readState(); writeState({...s, activeLayoutId:id}); refreshLayoutPicker(); renderDesigner(); }
    function refreshLayoutPicker(){ if(!dLayoutSelect) return; const arr=getLayouts(); const active=getActiveLayoutId(); dLayoutSelect.innerHTML = arr.map(l=>`<option value="${l.id}" ${l.id===active?'selected':''}>${l.name}</option>`).join(''); }

    function renderDesigner(){
      if(!designerCanvas) return;
      designerCanvas.innerHTML = '<div class="grid-bg">' + new Array(12).fill(0).map(()=>'<div></div>').join('') + '</div>';
      const arr=getLayouts(); const activeId=getActiveLayoutId(); const layout=arr.find(l=>l.id===activeId) || arr[0]; if(!layout) return;
      (layout.modules||[]).forEach(m=> createModuleEl(m));
    }
    function labelForType(t){ return { meta:'Meta Header', table:'Schedule Table', gallery:'Media Gallery', text:'Text Box', image:'Image/Logo' }[t] || t; }
    function previewForType(m){
      if(m.type==='meta'){ return `<div class="pv pv-meta">Project, date, day — auto from meta</div>`; }
      if(m.type==='table'){ return `<div class="pv pv-table">Schedule table (respects column Print toggles)</div>`; }
      if(m.type==='gallery'){ return `<div class="pv pv-gallery">Media thumbnails</div>`; }
      if(m.type==='text'){ return `<div class="pv pv-text">${(m.text||'Double‑click to edit text…').replace(/</g,'&lt;')}</div>`; }
      if(m.type==='image'){ return `<div class="pv pv-image">${m.url?`<img src="${m.url}" style="max-width:100%;max-height:100%;">`:'Drop URL in props'}</div>`; }
      return '<em>Unknown</em>';
    }
    const GRID_COLS=12, CELL_W=72, CELL_H=48, GAP=8, OFFSET={x:12,y:12};
    function toPx(col, isY=false){ return ((col-1)*(CELL_W+GAP) + OFFSET[isY?'y':'x']) + 'px'; }
    function toPxW(w){ return (w*CELL_W + (w-1)*GAP) + 'px'; }
    function toPxH(h){ return (h*CELL_H + (h-1)*GAP) + 'px'; }
    function snap(v, cell){ return Math.max(1, Math.round(v/cell)); }
    function createModuleEl(m){
      const el=document.createElement('div'); el.className='module'; el.dataset.id=m.id; el.dataset.type=m.type;
      el.style.left = toPx(m.x); el.style.top=toPx(m.y, true); el.style.width = toPxW(m.w); el.style.height = toPxH(m.h);
      el.innerHTML = `<div class="m-head"><span>${labelForType(m.type)}</span><div class="m-actions"><button class="ghost m-del" title="Remove">✕</button></div></div><div class="m-body">${previewForType(m)}</div><div class="handle"></div>`;
      designerCanvas.appendChild(el);
      enableDragResize(el, m);
      el.querySelector('.m-del').addEventListener('click', ()=> removeModule(m.id));
      el.addEventListener('mousedown', ()=> selectModule(m.id));
      el.addEventListener('dblclick', ()=>{ const arr=getLayouts(); const layout=arr.find(l=>l.id===getActiveLayoutId()); const mod=layout.modules.find(mm=>mm.id===m.id); if(mod?.type==='text'){ const t=prompt('Edit text:', mod.text||''); if(t!=null){ mod.text=t; saveLayout(); renderDesigner(); selectModule(mod.id);} } });
    }
    function saveLayout(){ const arr=getLayouts(); writeState({...readState(), layouts:arr}); }
    function selectModule(id){ qsa('.module').forEach(n=> n.classList.toggle('selected', n.dataset.id===id)); const arr=getLayouts(); const layout=arr.find(l=>l.id===getActiveLayoutId()); const mod=layout.modules.find(x=>x.id===id); renderProps(mod); }
    function removeModule(id){ const arr=getLayouts(); const layout=arr.find(l=>l.id===getActiveLayoutId()); layout.modules=(layout.modules||[]).filter(m=>m.id!==id); setLayouts(arr); }
    function enableDragResize(el, m){
      let dragging=false, resizing=false, startX=0,startY=0, orig={x:m.x,y:m.y,w:m.w,h:m.h};
      el.addEventListener('mousedown', (e)=>{ if(e.target.classList.contains('handle')){ resizing=true; } else { dragging=true; } startX=e.clientX; startY=e.clientY; orig={x:m.x,y:m.y,w:m.w,h:m.h}; selectModule(m.id); e.preventDefault(); });
      window.addEventListener('mousemove', (e)=>{ if(!dragging && !resizing) return; const dx=e.clientX-startX, dy=e.clientY-startY; if(dragging){ const col = e.shiftKey ? Math.max(1, Math.round(orig.x + dx/ (CELL_W+GAP))) : snap((orig.x-0) + dx/(CELL_W+GAP),1); const row = e.shiftKey ? Math.max(1, Math.round(orig.y + dy/ (CELL_H+GAP))) : snap((orig.y-0) + dy/(CELL_H+GAP),1); m.x=Math.max(1, Math.min(GRID_COLS, col)); m.y=Math.max(1, row); el.style.left=toPx(m.x); el.style.top=toPx(m.y,true); } else if(resizing){ const w = e.shiftKey ? Math.max(1, Math.round(orig.w + dx/(CELL_W+GAP))) : snap(orig.w + dx/(CELL_W+GAP),1); const h = e.shiftKey ? Math.max(1, Math.round(orig.h + dy/(CELL_H+GAP))) : snap(orig.h + dy/(CELL_H+GAP),1); m.w=Math.max(1, Math.min(GRID_COLS - (m.x-1), w)); m.h=Math.max(1, h); el.style.width=toPxW(m.w); el.style.height=toPxH(m.h); } });
      window.addEventListener('mouseup', ()=>{ if(dragging||resizing){ dragging=false; resizing=false; saveLayout(); } });
    }
    function renderProps(m){
      if(!propsBody) return;
      if(!m){ propsBody.innerHTML='<em>Select a module…</em>'; return; }
      propsBody.innerHTML=`
        <label>Type <input value="${labelForType(m.type)}" readonly></label>
        <label>Position (x,y) / Size (w,h)
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
            <input type="number" class="p-x" min="1" value="${m.x||1}">
            <input type="number" class="p-y" min="1" value="${m.y||1}">
            <input type="number" class="p-w" min="1" value="${m.w||6}">
            <input type="number" class="p-h" min="1" value="${m.h||4}">
          </div>
        </label>
        ${m.type==='text'?`<label>Text<br><textarea class="p-text" rows="4">${(m.text||'').replace(/</g,'&lt;')}</textarea></label>`:''}
        ${m.type==='image'?`<label>Image URL<br><input type="text" class="p-url" placeholder="https://…" value="${m.url||''}"></label>`:''}
      `;
      const arr=getLayouts(); const layout=arr.find(l=>l.id===getActiveLayoutId()); const mod=layout.modules.find(x=>x.id===m.id);
      const px=propsBody.querySelector('.p-x'), py=propsBody.querySelector('.p-y'), pw=propsBody.querySelector('.p-w'), ph=propsBody.querySelector('.p-h');
      [px,py,pw,ph].forEach(inp=> inp && inp.addEventListener('change', ()=>{ mod.x=Math.max(1, Number(px.value||1)); mod.y=Math.max(1, Number(py.value||1)); mod.w=Math.max(1, Number(pw.value||6)); mod.h=Math.max(1, Number(ph.value||4)); saveLayout(); renderDesigner(); selectModule(mod.id); }));
      const ptext=propsBody.querySelector('.p-text'); if(ptext){ ptext.addEventListener('input', ()=>{ mod.text=ptext.value; saveLayout(); renderDesigner(); selectModule(mod.id); }); }
      const purl=propsBody.querySelector('.p-url'); if(purl){ purl.addEventListener('input', ()=>{ mod.url=purl.value; saveLayout(); renderDesigner(); selectModule(mod.id); }); }
    }
    function addModule(type){ const arr=getLayouts(); const layout=arr.find(l=>l.id===getActiveLayoutId()); const m={id:uid(), type, x:1,y:1,w:type==='meta'?12:6,h:type==='table'?8:4}; if(type==='text') m.text='Your text…'; layout.modules.push(m); setLayouts(arr); selectModule(m.id); }
    dAddMeta && dAddMeta.addEventListener('click', ()=> addModule('meta'));
    dAddTable && dAddTable.addEventListener('click', ()=> addModule('table'));
    dAddGallery && dAddGallery.addEventListener('click', ()=> addModule('gallery'));
    dAddText && dAddText.addEventListener('click', ()=> addModule('text'));
    dAddImage && dAddImage.addEventListener('click', ()=> addModule('image'));
    dNewLayout && dNewLayout.addEventListener('click', ()=>{ const arr=getLayouts(); const id='layout_'+cid(); arr.push({id,name:'Custom '+(arr.length+1),modules:[]}); setLayouts(arr); setActiveLayoutId(id); });
    dDupLayout && dDupLayout.addEventListener('click', ()=>{ const arr=getLayouts(); const activeId=getActiveLayoutId(); const src=arr.find(l=>l.id===activeId); if(!src) return; const dup={...JSON.parse(JSON.stringify(src)), id:'layout_'+cid(), name:src.name+' (copy)'}; arr.push(dup); setLayouts(arr); setActiveLayoutId(dup.id); });
    dDelLayout && dDelLayout.addEventListener('click', ()=>{ const arr=getLayouts(); if(arr.length<=1) return alert('Keep at least one layout.'); const activeId=getActiveLayoutId(); const idx=arr.findIndex(l=>l.id===activeId); if(idx>-1){ arr.splice(idx,1); setLayouts(arr); setActiveLayoutId(arr[0].id);} });
    dLayoutSelect && dLayoutSelect.addEventListener('change', ()=> setActiveLayoutId(dLayoutSelect.value));

    async function renderDesignerToPrint(){
      const layouts=getLayouts(), activeId=getActiveLayoutId(); const layout=layouts.find(l=>l.id===activeId); if(!layout){ return; }
      const s=readState(); const meta=s.meta||{}; const cols=getCols().filter(c=>c.print!==false);
      designerPrintRoot.innerHTML='';
      const page=document.createElement('div'); page.className='dpr-page';
      (layout.modules||[]).forEach(m=>{
        const box=document.createElement('div'); box.className='dpr-module'; box.style.margin=`${m.y*4}px 0 0 ${m.x*4}px`; box.style.width=`${m.w*60}px`;
        const title=document.createElement('div'); title.className='dpr-title'; title.textContent=labelForType(m.type);
        const body=document.createElement('div');
        if(m.type==='meta'){
          body.innerHTML = `<div><strong>${meta.title||''}</strong></div><div>${meta.dow||''} ${meta.date||''} — Day ${meta.x||''} of ${meta.y||''}</div>`;
        } else if(m.type==='text'){
          body.textContent = m.text||'';
        } else if(m.type==='image'){
          if(m.url){ const img=new Image(); img.src=m.url; img.style.maxWidth='100%'; img.style.height='auto'; body.appendChild(img); } else { body.innerHTML='<em>No image URL</em>'; }
        } else if(m.type==='table'){
          const table=document.createElement('table'); table.style.width='100%'; table.style.borderCollapse='collapse'; table.innerHTML='<thead></thead><tbody></tbody>';
          const thead=table.querySelector('thead'); const thr=document.createElement('tr');
          ['#','Start','End','Dur','Type','Event', ...cols.map(c=>c.label)].forEach(h=>{ const th=document.createElement('th'); th.textContent=h; th.style.border='1px solid #ddd'; th.style.padding='4px 6px'; th.style.textAlign='left'; thr.appendChild(th); });
          thead.appendChild(thr);
          const tbodyP=table.querySelector('tbody');
          (s.rows||[]).forEach((r,idx)=>{
            if(r.type==='SUB'){
              const tr=document.createElement('tr');
              const td=document.createElement('td'); td.colSpan=6+cols.length; td.textContent=`SUB: ${r.title||''}`; td.style.background='#efeff6'; td.style.border='1px solid #ddd'; td.style.padding='4px 6px'; tr.appendChild(td); tbodyP.appendChild(tr);
              (r.children||[]).forEach(ch=>{
                const trc=document.createElement('tr');
                trc.innerHTML = `<td style="border:1px solid #ddd;padding:4px 6px;">•</td><td></td><td></td><td style="border:1px solid #ddd;padding:4px 6px;">${ch.duration||''}</td><td style="border:1px solid #ddd;padding:4px 6px;">SUB</td><td style="border:1px solid #ddd;padding:4px 6px;">${ch.title||''}</td>`;
                cols.forEach(c=>{ const td=document.createElement('td'); td.style.border='1px solid #ddd'; td.style.padding='4px 6px'; if(c.type==='text'){ td.textContent = ch.custom?.[c.key]||''; } else if(c.type==='tags'){ td.textContent = ch.custom?.[c.key]||''; } else if(c.type==='upload'){ td.textContent = (ch.custom?.[c.key]||[]).length + ' file(s)'; } trc.appendChild(td); });
                tbodyP.appendChild(trc);
              });
            } else {
              const tr=document.createElement('tr');
              tr.innerHTML = `<td style="border:1px solid #ddd;padding:4px 6px;">${idx+1}</td><td style="border:1px solid #ddd;padding:4px 6px;"></td><td style="border:1px solid #ddd;padding:4px 6px;"></td><td style="border:1px solid #ddd;padding:4px 6px;">${r.duration||r.offset||''}</td><td style="border:1px solid #ddd;padding:4px 6px;">${r.type}</td><td style="border:1px solid #ddd;padding:4px 6px;">${r.title||''}</td>`;
              cols.forEach(c=>{ const td=document.createElement('td'); td.style.border='1px solid #ddd'; td.style.padding='4px 6px'; if(c.type==='text'){ td.textContent = r.custom?.[c.key]||''; } else if(c.type==='tags'){ td.textContent = r.custom?.[c.key]||''; } else if(c.type==='upload'){ td.textContent = (r.custom?.[c.key]||[]).length + ' file(s)'; } tr.appendChild(td); });
              tbodyP.appendChild(tr);
            }
          });
          body.appendChild(table);
        } else if(m.type==='gallery'){
          const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gap='6px'; let cols=4; wrap.style.gridTemplateColumns=`repeat(${cols},1fr)`;
          const ids=[]; (s.rows||[]).forEach(r=>{ (r.custom?.c_uploads||[]).forEach(id=>ids.push(Number(id))); if(r.type==='SUB'){ (r.children||[]).forEach(ch=> (ch.custom?.c_uploads||[]).forEach(id=>ids.push(Number(id))) ); } });
          body.appendChild(wrap);
          (async ()=>{ await openVault(); for(const id of ids){ try{ const rec=await vaultGet(id); if(!rec) continue; if(!/^image|^video/.test(rec.type)) continue; const url=URL.createObjectURL(rec.data); const card=document.createElement('div'); card.style.border='1px solid #ddd'; card.style.borderRadius='8px'; card.style.padding='4px'; if(rec.type.startsWith('image/')){ const img=new Image(); img.src=url; img.style.width='100%'; img.style.height='120px'; img.style.objectFit='cover'; card.appendChild(img); } else { const v=document.createElement('video'); v.src=url; v.controls=true; v.style.width='100%'; v.style.height='120px'; v.style.objectFit='cover'; card.appendChild(v); } wrap.appendChild(card); }catch(e){} } })();
        }
        box.appendChild(title); box.appendChild(body); page.appendChild(box);
      });
      designerPrintRoot.appendChild(page);
    }

    // Boot UI
    function updateDragHandles() {
      // Update all existing drag handles to use new 3x3 grid format
      document.querySelectorAll('td[data-key="drag"]').forEach(cell => {
        cell.innerHTML = '<div class="drag-dots"></div>';
      });
    }
    
    function rebuildUI(){
      openVault().catch(()=>{});
      let s=readState();
      
      // Initialize multi-day if needed
      if (!s.days) {
        const days = _getDays(); // This will migrate old format
        const projectMeta = s.meta ? { title: s.meta.title || '', version: '' } : { title: '', version: '' };
        s = { ...s, days, projectMeta, activeDayId: days[0]?.id };
        writeState(s);
      }
      
      // Load project meta
      const projectMeta = _getProjectMeta();
      if(metaTitle) metaTitle.value = projectMeta.title || '';
      if(document.getElementById('metaVersion')) document.getElementById('metaVersion').value = projectMeta.version || '';
      
      // Render day tabs
      renderDayTabs();
      
      // Load active day
      const currentDay = getCurrentDay();
      if (currentDay) {
        loadDay(currentDay.id);
      }
      
      formatMetaLine();
      rebuildHeaders(); renderColManager(); initializePrintColumns(); renderPalette();
      
      applyPrintUiFromState(); bindPrintInputs();
      refreshLayoutPicker(); renderDesigner();
      
      // Update drag handles to new 3x3 grid format
      updateDragHandles();
      
      // Apply row heights and add resize grips
      applyRowHeights();
      addRowResizeGrips();
      
      // Setup meta X/Y edit handlers
      handleMetaXYEdits();
      
      // Setup project meta listeners
      metaTitle && metaTitle.addEventListener('input', () => {
        const meta = _getProjectMeta();
        setProjectMeta({ ...meta, title: metaTitle.value });
      });
      
      const metaVersion = document.getElementById('metaVersion');
      metaVersion && metaVersion.addEventListener('input', () => {
        const meta = _getProjectMeta();
        setProjectMeta({ ...meta, version: metaVersion.value });
      });
      
      // Setup day-specific listeners
      metaDate && metaDate.addEventListener('input', ()=>{ 
        formatMetaLine(); 
        saveDayData();
      });
      
      // Normalize and validate schedule start input
      scheduleStart && scheduleStart.addEventListener('input', (e) => {
        const format = getTimeFormat();
        
        if (format === '12h') {
          // Allow numbers, colon, space, A, P, M
          let value = e.target.value.replace(/[^0-9: APMapm]/g, '');
          
          // Auto-add colon after 1-2 digits if user types numbers continuously
          if (value.length === 3 && !value.includes(':') && !value.includes(' ')) {
            value = value.slice(0, 2) + ':' + value.slice(2);
          }
          
          e.target.value = value;
        } else {
          // 24h mode: only numbers and colon
          let value = e.target.value.replace(/[^0-9:]/g, '');
          
          // Auto-add colon after 1-2 digits
          if (value.length === 3 && !value.includes(':')) {
            value = value.slice(0, 2) + ':' + value.slice(2);
          }
          
          e.target.value = value;
        }
      });
      
      // Validate on blur to ensure proper format
      scheduleStart && scheduleStart.addEventListener('blur', (e) => {
        const format = getTimeFormat();
        let value = e.target.value.trim();
        
        if (!value) {
          e.target.value = format === '12h' ? '8:00 AM' : '8:00';
          return;
        }
        
        // Parse the time
        let h, m, isPM = false;
        
        if (format === '12h') {
          // Handle 12h format with AM/PM
          const ampmMatch = value.match(/([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?/i);
          if (!ampmMatch) {
            e.target.value = '8:00 AM';
            return;
          }
          
          h = parseInt(ampmMatch[1], 10);
          m = parseInt(ampmMatch[2], 10);
          isPM = ampmMatch[3] && ampmMatch[3].toUpperCase() === 'PM';
          
          // Validate 12h hour (1-12)
          if (isNaN(h) || h < 1 || h > 12) h = 8;
          
          // Validate minute (0-59)
          if (isNaN(m) || m < 0 || m > 59) m = 0;
          
          // Default to AM if not specified
          const period = isPM ? 'PM' : 'AM';
          e.target.value = `${h}:${String(m).padStart(2, '0')} ${period}`;
        } else {
          // Handle 24h format
          const parts = value.split(':');
          if (parts.length !== 2) {
            e.target.value = '8:00';
            return;
          }
          
          h = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          
          // Validate hour (0-23)
          if (isNaN(h) || h < 0 || h > 23) h = 8;
          
          // Validate minute (0-59)
          if (isNaN(m) || m < 0 || m > 59) m = 0;
          
          // Format without leading zero for single-digit hours
          e.target.value = `${h}:${String(m).padStart(2, '0')}`;
        }
      });
      
      // Setup schedule change listener
      scheduleStart && scheduleStart.addEventListener('change', () => {
        saveDayData();
        recalc();
      });
      
      // Add Enter key handler for immediate application
      scheduleStart && scheduleStart.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          scheduleStart.blur(); // This will trigger the change event
          saveDayData();
          recalc();
        }
      });
      
      // Time format toggle button
      const timeFormatToggle = document.getElementById('timeFormatToggle');
      if (timeFormatToggle) {
        // Set initial state (unchecked = 12h, checked = 24h)
        const currentFormat = getTimeFormat();
        timeFormatToggle.checked = currentFormat === '24h';
        
        timeFormatToggle.addEventListener('change', () => {
          const newFormat = timeFormatToggle.checked ? '24h' : '12h';
          setTimeFormat(newFormat);
          
          // Convert scheduleStart input to new format
          if (scheduleStart) {
            const currentValue = scheduleStart.value;
            const minutes = toMinutes(currentValue);
            const hhmm = minutesToHHMM(minutes);
            
            if (newFormat === '12h') {
              scheduleStart.value = hhmmToAmPm(hhmm);
              scheduleStart.placeholder = '8:00 AM';
              scheduleStart.maxLength = 8;
            } else {
              const [h, m] = hhmm.split(':').map(Number);
              scheduleStart.value = `${h}:${String(m).padStart(2, '0')}`;
              scheduleStart.placeholder = '8:00';
              scheduleStart.maxLength = 5;
            }
          }
          
          // Recalculate to update all times in schedule
          recalc();
        });
      }
    }

    // Check if we need to load template first (empty localStorage)
    const initialState = readState();
    const needsTemplate = !initialState.days || initialState.days.length === 0;
    
    if (needsTemplate && window._waitForTemplate) {
      // Wait for template to load, then initialize with it
      window._waitForTemplate().then(() => {
        const template = window.getDefaultScheduleTemplate();
        if (template) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
        }
        rebuildUI();
      });
    } else {
      rebuildUI();
    }
    window.addEventListener('beforeunload', persist);
  }catch(err){ showErr(err); }

  // === Safe persistence of Undo/Redo stacks ===
  try{
    const u = JSON.parse(localStorage.getItem(STORAGE_KEY + '_UNDO') || '[]');
    const r = JSON.parse(localStorage.getItem(STORAGE_KEY + '_REDO') || '[]');
    if (Array.isArray(u)) UNDO_STACK = u;
    if (Array.isArray(r)) REDO_STACK = r;
    if (typeof updateUndoUi === 'function') updateUndoUi();
  }catch(_){}
  window.addEventListener('beforeunload', ()=>{
    try{
      localStorage.setItem(STORAGE_KEY + '_UNDO', JSON.stringify(UNDO_STACK||[]));
      localStorage.setItem(STORAGE_KEY + '_REDO', JSON.stringify(REDO_STACK||[]));
    }catch(_){}
  });
})();

window.addEventListener('resize', ()=>{ try{  }catch(e){} });

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const themeText = themeToggle.querySelector('.theme-text');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('scheduler-theme') || 'light';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      if (themeText) themeText.textContent = 'DARK';
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      if (themeText) themeText.textContent = 'LIGHT';
    }
    
    themeToggle.addEventListener('click', () => {
      const isCurrentlyLight = document.body.classList.contains('light-theme');
      
      if (isCurrentlyLight) {
        // Switch to dark
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('scheduler-theme', 'dark');
        if (themeText) themeText.textContent = 'LIGHT';
      } else {
        // Switch to light
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('scheduler-theme', 'light');
        if (themeText) themeText.textContent = 'DARK';
      }
    });
  }
  
  // Fix contrast for all existing colored rows on page load
  function fixAllRowContrast() {
    // Get ALL table rows
    const allRows = document.querySelectorAll('tbody tr');
    
    allRows.forEach(tr => {
      // Determine which type of row this is
      const isSub = tr.classList.contains('subheader');
      const isChild = tr.classList.contains('subchild');
      
      // Check if user has explicitly set a text color (stored in data attributes)
      let hasUserColor = false;
      let bgColor = null;
      
      if (isChild) {
        hasUserColor = !!(tr.dataset.subChildFg);
        bgColor = tr.dataset.subChildColor;
      } else if (isSub) {
        hasUserColor = !!(tr.dataset.subFg);
        bgColor = tr.dataset.subColor;
      } else {
        hasUserColor = !!(tr.dataset.rowFg);
        bgColor = tr.dataset.rowBg;
      }
      
      // Only apply auto-contrast if:
      // 1. Row has a background color
      // 2. User has NOT explicitly set a text color
      if (bgColor && !hasUserColor) {
        const autoFg = getContrastColor(bgColor);
        if (autoFg) {
          if (isChild) {
            tr.style.setProperty('--subchild-fg', autoFg);
          } else if (isSub) {
            tr.style.setProperty('--sub-fg', autoFg);
          } else {
            tr.style.setProperty('--row-fg', autoFg);
          }
        }
      }
    });
  }
  
  // Run the contrast fix multiple times to catch dynamic content
  setTimeout(fixAllRowContrast, 100);
  setTimeout(fixAllRowContrast, 500);
  setTimeout(fixAllRowContrast, 1000);
  
  // Print header functionality
  const printHeaderText = document.getElementById('printHeaderText');
  
  if (printHeaderText) {
    // Load saved print header
    const savedHeader = localStorage.getItem('scheduler-print-header') || '';
    printHeaderText.value = savedHeader;
    
    // Save on change
    printHeaderText.addEventListener('input', () => {
      localStorage.setItem('scheduler-print-header', printHeaderText.value);
    });
  }
});



// Modify beforePrint to use print header
const originalBeforePrint = window.beforePrint || (() => {});
window.beforePrint = function() {
  originalBeforePrint();
  
  // Inject header designer HTML if available
  if (typeof window.getHeaderHTML === 'function') {
    const headerHTML = window.getHeaderHTML();
    if (headerHTML) {
      // Find or create a container for the print header
      let printHeaderContainer = document.getElementById('printHeaderContainer');
      if (!printHeaderContainer) {
        printHeaderContainer = document.createElement('div');
        printHeaderContainer.id = 'printHeaderContainer';
        printHeaderContainer.className = 'print-header-container';
        // Insert after metaSection
        const metaSection = document.getElementById('metaSection');
        if (metaSection && metaSection.parentNode) {
          metaSection.parentNode.insertBefore(printHeaderContainer, metaSection.nextSibling);
        }
      }
      printHeaderContainer.innerHTML = headerHTML;
      printHeaderContainer.style.display = 'block';
    }
  }
  
  const printHeaderText = document.getElementById('printHeaderText');
  const metaDisplay = document.getElementById('metaDisplay');
  
  if (printHeaderText && printHeaderText.value.trim() && metaDisplay) {
    // Use custom print header
    metaDisplay.textContent = printHeaderText.value.trim();
    metaDisplay.removeAttribute('data-title-only');
    
    // Apply formatting from printHeaderFormatData
    const formatData = document.getElementById('printHeaderFormatData');
    if (formatData && formatData.dataset.formatting) {
      try {
        const formatting = JSON.parse(formatData.dataset.formatting);
        if (formatting.fontFamily) metaDisplay.style.fontFamily = formatting.fontFamily;
        if (formatting.fontSize) metaDisplay.style.fontSize = formatting.fontSize;
        metaDisplay.style.fontWeight = formatting.bold ? 'bold' : '';
        metaDisplay.style.fontStyle = formatting.italic ? 'italic' : '';
        metaDisplay.style.textDecoration = formatting.underline ? 'underline' : '';
        metaDisplay.style.textAlign = formatting.align || 'left';
        if (formatting.fgColor) metaDisplay.style.color = formatting.fgColor;
        if (formatting.bgColor) metaDisplay.style.backgroundColor = formatting.bgColor;
      } catch(e) {}
    }
  }
};


// ============================================================================
// EXPOSE DATA TO REPORT DESIGNER
// ============================================================================

/**
 * Get current day's schedule data for report designer
 * Returns: { rows: [], date: '', dow: '', dayNumber: 1 }
 */
window.getCurrentDay = function() {
  // Access localStorage directly to avoid any scope issues
  const s = readState();
  const days = s.days && s.days.length > 0 ? s.days : [{
    id: 'day-' + Date.now(),
    dayNumber: 1,
    date: s.meta?.date || '',
    dow: s.meta?.dow || '',
    scheduleStart: s.start || '8:00',
    rows: s.rows || [],
    palette: s.palette || DEFAULT_PALETTE.slice(),
    cols: s.cols || DEFAULT_CUSTOM_COLS.slice()
  }];
  
  const activeId = s.activeDayId || days[0]?.id;
  const currentDay = days.find(d => d.id === activeId) || days[0];
  
  if (!currentDay) {
    return { 
      rows: [], 
      date: '', 
      dow: '', 
      dayNumber: 1 
    };
  }
  
  return {
    rows: currentDay.rows || [],
    date: currentDay.date || '',
    dow: currentDay.dow || '',
    dayNumber: currentDay.dayNumber || 1
  };
};

/**
 * Get project metadata for report designer
 * Returns: { title: '', version: '', date: '' }
 */
window.getProjectMeta = function() {
  const s = readState();
  const meta = s.projectMeta || { title: '', version: '' };
  const currentDay = window.getCurrentDay();
  
  return {
    title: meta.title || document.getElementById('metaTitle')?.value || 'Untitled Project',
    version: meta.version || document.getElementById('metaVersion')?.value || '1.0',
    date: currentDay.date || document.getElementById('metaDate')?.value || ''
  };
};

/**
 * Get all days in schedule for report designer
 * Returns: Array of day objects
 */
window.getDays = function() {
  const s = readState();
  if (Array.isArray(s.days) && s.days.length > 0) {
    return s.days;
  }
  // Return default day structure
  return [{
    id: 'day-' + Date.now(),
    dayNumber: 1,
    date: s.meta?.date || '',
    dow: s.meta?.dow || '',
    scheduleStart: s.start || '8:00',
    rows: s.rows || [],
    palette: s.palette || DEFAULT_PALETTE.slice(),
    cols: s.cols || DEFAULT_CUSTOM_COLS.slice()
  }];
};

  // Add visual guides for page width
  window.togglePageGuides = function() {
    const guides = document.getElementById('pageWidthGuides');
    if (!guides) return;
    
    if (guides.style.display === 'none') {
      guides.style.display = 'flex';
      updatePageGuidePosition();
      localStorage.setItem('showPageGuides', 'true');
    } else {
      guides.style.display = 'none';
      localStorage.setItem('showPageGuides', 'false');
    }
  };
  
  // Zoom control
  window.applyZoom = function(zoomLevel) {
    const scheduleScroll = document.querySelector('.schedule-scroll');
    if (!scheduleScroll) {
      console.warn('Could not find .schedule-scroll for zoom');
      return;
    }
    
    console.log(`🔍 Applying zoom: ${(zoomLevel * 100).toFixed(0)}%`);
    
    // Use CSS zoom for crisp vector-style scaling
    scheduleScroll.style.zoom = zoomLevel;
    
    localStorage.setItem('scheduleZoom', zoomLevel);
    
    // Redraw all sharpie lines to compensate for zoom
    if (typeof SharpieManager !== 'undefined') {
      setTimeout(() => {
        console.log('[Zoom] Reapplying sharpie lines after zoom change');
        SharpieManager.applyState();
      }, 50);
    }
  };
  
  // Initialize zoom control when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const zoomControl = document.getElementById('zoomControl');
    console.log('🔍 Zoom control found:', !!zoomControl);
    if (zoomControl) {
      const savedZoom = localStorage.getItem('scheduleZoom') || '1';
      console.log('🔍 Initializing zoom at:', savedZoom);
      zoomControl.value = savedZoom;
      applyZoom(parseFloat(savedZoom));
      
      zoomControl.addEventListener('change', (e) => {
        console.log('🔍 Zoom changed to:', e.target.value);
        applyZoom(parseFloat(e.target.value));
        // Update page guide positions after zoom
        if (document.getElementById('pageWidthGuides')?.style.display !== 'none') {
          setTimeout(() => updatePageGuidePosition(), 50);
        }
      });
    } else {
      console.warn('⚠️ Zoom control not found in DOM');
    }
    
    // Image height control
    const imageHeightControl = document.getElementById('imageHeightControl');
    if (imageHeightControl) {
      const savedHeight = localStorage.getItem('imageHeight') || '80';
      imageHeightControl.value = savedHeight;
      applyImageHeight(parseInt(savedHeight));
      
      imageHeightControl.addEventListener('input', (e) => {
        const height = parseInt(e.target.value);
        applyImageHeight(height);
        localStorage.setItem('imageHeight', height);
        
        // If force row height is on, re-apply row heights to update
        if (document.body.classList.contains('force-row-height')) {
          window.applyRowHeights();
        }
      });
    }
    
    // Force row height toggle
    const forceRowHeightCheckbox = document.getElementById('forceRowHeight');
    if (forceRowHeightCheckbox) {
      const savedForceRowHeight = localStorage.getItem('forceRowHeight') === 'true';
      forceRowHeightCheckbox.checked = savedForceRowHeight;
      
      // Apply initial state
      if (savedForceRowHeight) {
        document.body.classList.add('force-row-height');
      }
      
      // Handle toggle changes
      forceRowHeightCheckbox.addEventListener('change', (e) => {
        console.log('Force row height checkbox changed:', e.target.checked);
        if (e.target.checked) {
          document.body.classList.add('force-row-height');
          localStorage.setItem('forceRowHeight', 'true');
        } else {
          document.body.classList.remove('force-row-height');
          localStorage.setItem('forceRowHeight', 'false');
        }
        // Re-apply row heights to update constraints
        console.log('About to call applyRowHeights, function exists?', typeof window.applyRowHeights === 'function');
        if (typeof window.applyRowHeights === 'function') {
          console.log('Calling applyRowHeights...');
          window.applyRowHeights();
        }
      });
    }
    
    // Periodic check to re-apply row heights when force mode is on
    // This handles images loading at different times
    setInterval(() => {
      if (document.body.classList.contains('force-row-height')) {
        if (typeof window.applyRowHeights === 'function') {
          window.applyRowHeights();
        }
      }
    }, 500); // Check every 500ms
  });
  
  function applyImageHeight(height) {
    document.documentElement.style.setProperty('--thumb-height', height + 'px');
  }
  
  // Add visual guides for page width
  window.togglePageGuides_OLD = function() {
    const guides = document.getElementById('pageWidthGuides');
    if (!guides) return;
    
    if (guides.style.display === 'none') {
      guides.style.display = 'flex';
      updatePageGuidePosition();
      localStorage.setItem('showPageGuides', 'true');
    } else {
      guides.style.display = 'none';
      localStorage.setItem('showPageGuides', 'false');
    }
  };
  
  // Position page guides to align with leftmost visible column
  window.updatePageGuidePosition = function() {
    const guides = document.getElementById('pageWidthGuides');
    const table = document.getElementById('scheduleTable');
    if (!guides || !table) return;
    
    // Get current zoom level
    const zoomLevel = parseFloat(localStorage.getItem('scheduleZoom') || '1');
    
    // Find the first visible column that's not drag/actions
    const headerRow = document.getElementById('headerRow');
    if (!headerRow) return;
    
    const headers = Array.from(headerRow.querySelectorAll('th'));
    let leftmostVisible = null;
    
    for (const th of headers) {
      const key = th.dataset.key;
      if (!key || key === 'drag' || key === 'actions') continue;
      
      const col = table.querySelector(`col[data-key="${key}"]`);
      if (col && col.style.visibility !== 'collapse') {
        leftmostVisible = th;
        break;
      }
    }
    
    if (leftmostVisible) {
      const rect = leftmostVisible.getBoundingClientRect();
      const containerRect = table.closest('.container').getBoundingClientRect();
      const leftOffset = (rect.left - containerRect.left) / zoomLevel;
      guides.style.left = `${leftOffset}px`;
    }
  };
  
  // Auto-show guides on load if previously enabled
  if (localStorage.getItem('showPageGuides') === 'true') {
    const guides = document.getElementById('pageWidthGuides');
    if (guides) {
      guides.style.display = 'flex';
      setTimeout(() => updatePageGuidePosition(), 100);
    }
  } else {
    const guides = document.getElementById('pageWidthGuides');
    if (guides) guides.style.display = 'none';
  }

  console.log('Report Designer data access functions registered');

// ============================================================================
// PRINT COLUMN PICKER
// ============================================================================

window.selectedPrintColumns = null;

document.getElementById('printColCancel')?.addEventListener('click', () => {
  document.getElementById('printColModal').style.display = 'none';
});

document.getElementById('printColConfirm')?.addEventListener('click', async () => {
  // Check which report type is selected
  const reportType = document.querySelector('input[name="reportType"]:checked')?.value || 'full';
  
  // Handle tag reports separately
  if (reportType === 'tags') {
    const selectedTags = Array.from(document.querySelectorAll('.report-tag-checkbox:checked'))
      .map(cb => cb.value);
    
    if (selectedTags.length === 0) {
      alert('Please select at least one tag');
      return;
    }
    
    // Capture view mode and orientation from standard controls
    const tagViewMode = document.querySelector('input[name="tagViewMode"]:checked')?.value || 'digest';
    const tagOrientation = document.getElementById('pdfOrientation')?.value || 'landscape';
    
    document.getElementById('printColModal').style.display = 'none';
    
    await window.generateTagReport(selectedTags, tagViewMode, tagOrientation);
    return;
  }
  
  // Handle sub-schedule reports
  if (reportType === 'subschedule') {
    const subScheduleId = document.getElementById('subscheduleSelect')?.value;
    if (!subScheduleId) {
      alert('Please select a sub-schedule');
      return;
    }
    const orientation = document.getElementById('pdfOrientation')?.value || 'landscape';
    document.getElementById('printColModal').style.display = 'none';
    await window.generateSubScheduleReport(subScheduleId, orientation);
    return;
  }
  
  // Handle master-only reports
  if (reportType === 'master') {
    const orientation = document.getElementById('pdfOrientation')?.value || 'landscape';
    document.getElementById('printColModal').style.display = 'none';
    await window.generateMasterReport(orientation);
    return;
  }
  
  // Standard full schedule print
  // Load print columns from localStorage (set by Column Manager)
  const savedColumns = localStorage.getItem('printColumns');
  
  if (savedColumns) {
    try {
      const parsed = JSON.parse(savedColumns);
      // If empty array, treat as "print all columns"
      window.selectedPrintColumns = (parsed && parsed.length > 0) ? parsed : null;
    } catch (e) {
      console.warn('Failed to parse print columns, using all columns');
      window.selectedPrintColumns = null;
    }
  } else {
    // No saved state - use all columns
    window.selectedPrintColumns = null;
  }
  
  // Save paper settings
  const imageHeight = document.getElementById('pdfImageHeight')?.value || '150';
  const paperSize = document.getElementById('pdfPaperSize')?.value || 'letter';
  const orientation = document.getElementById('pdfOrientation')?.value || 'landscape';
  const showHeader = document.getElementById('pdfShowHeader')?.checked ? 'true' : 'false';
  const showColumnHeaders = document.getElementById('pdfShowColumnHeaders')?.checked ? 'true' : 'false';
  const roundedCorners = document.getElementById('pdfRoundedCorners')?.checked ? 'true' : 'false';
  const columnWidthFactor = document.getElementById('pdfColumnWidthFactor')?.value || '0.5';
  
  console.log('🖨️ Print settings saved:', { imageHeight, paperSize, orientation, showHeader, showColumnHeaders, roundedCorners, columnWidthFactor });
  
  localStorage.setItem('pdfImageHeight', imageHeight);
  localStorage.setItem('pdfPaperSize', paperSize);
  localStorage.setItem('pdfOrientation', orientation);
  localStorage.setItem('pdfShowHeader', showHeader);
  localStorage.setItem('pdfShowColumnHeaders', showColumnHeaders);
  localStorage.setItem('pdfRoundedCorners', roundedCorners);
  localStorage.setItem('pdfColumnWidthFactor', columnWidthFactor);
  
  document.getElementById('printColModal').style.display = 'none';
  
  // Trigger PDF generation
  window.generatePDFWithPuppeteer();
});


// ===================================================================
// AUTO-SYNC AND PROJECT BROWSER - SELF-CONTAINED VERSION
// ===================================================================

(function() {
  'use strict';
  
  // Access localStorage key
  const STORAGE_KEY = 'shootScheduler_v8_10';
  
  // Define readState locally
  function readState() { 
    try { 
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); 
    } catch(e) { 
      console.error('readState error:', e);
      return {}; 
    } 
  }
  
  // Define writeState locally
  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) {
      console.error('writeState error:', e);
    }
  }
  
  // Expose globally for FileBrowser
  window.readState = readState;
  window.writeState = writeState;
  

  // ==============================================
  // SIMPLE CLOUD FILE MANAGEMENT
  // ==============================================
  
  // Show/hide cloud buttons based on auth
  window.addEventListener('authStateChanged', (e) => {
    const saveBtn = document.getElementById('saveToCloudBtn');
    const loadBtn = document.getElementById('loadFromCloudBtn');
    const fileDisplay = document.getElementById('currentFileDisplay');
    
    if (e.detail.authenticated && !e.detail.localMode) {
      if (saveBtn) saveBtn.style.display = 'inline-block';
      if (loadBtn) loadBtn.style.display = 'inline-block';
      
      // Show current file if one is open
      const currentFile = localStorage.getItem('currentCloudFile');
      const provider = localStorage.getItem('currentCloudProvider') || 'supabase';
      if (fileDisplay && currentFile) {
        const icon = provider === 'dropbox' ? '📦' : '📄';
        fileDisplay.textContent = `${icon} ${currentFile}`;
        fileDisplay.style.display = 'inline-block';
      }
    } else {
      if (saveBtn) saveBtn.style.display = 'none';
      if (loadBtn) loadBtn.style.display = 'none';
      if (fileDisplay) fileDisplay.style.display = 'none';
    }
  });
  
  // Save to Cloud
  const saveToCloudBtn = document.getElementById('saveToCloudBtn');
  if (saveToCloudBtn) {
    saveToCloudBtn.addEventListener('click', () => {
      const modal = document.getElementById('saveToCloudModal');
      const input = document.getElementById('saveFileName');
      if (modal && input) {
        // Check if we have a current file open
        const currentFile = localStorage.getItem('currentCloudFile');
        
        if (currentFile) {
          // Pre-fill with current filename for easy update
          input.value = currentFile;
        } else {
          // Suggest new filename from metadata
          const state = readState();
          const title = state.projectMeta?.title || 'Schedule';
          const date = new Date().toISOString().split('T')[0];
          input.value = `${title}_${date}.json`;
        }
        
        modal.style.display = 'flex';
        input.focus();
        input.select();
      }
    });
  }
  
  const saveCancelBtn = document.getElementById('saveCancelBtn');
  if (saveCancelBtn) {
    saveCancelBtn.addEventListener('click', () => {
      const modal = document.getElementById('saveToCloudModal');
      if (modal) modal.style.display = 'none';
    });
  }
  
  const saveConfirmBtn = document.getElementById('saveConfirmBtn');
  if (saveConfirmBtn) {
    saveConfirmBtn.addEventListener('click', async () => {
      const input = document.getElementById('saveFileName');
      const modal = document.getElementById('saveToCloudModal');
      
      if (!input || !input.value.trim()) {
        alert('Please enter a filename');
        return;
      }
      
      const fileName = input.value.trim();
      const state = readState();
      
      // Disable button during save
      saveConfirmBtn.disabled = true;
      saveConfirmBtn.textContent = 'Saving...';
      
      try {
        const result = await window.SupabaseAPI.files.saveScheduleFile(fileName, state);
        
        if (result.success) {
          // Track this as the current file
          localStorage.setItem('currentCloudFile', fileName.endsWith('.json') ? fileName : fileName + '.json');
          
          if (modal) modal.style.display = 'none';
          alert('✓ Schedule saved to cloud!');
        } else {
          alert('Failed to save: ' + result.error);
        }
      } catch (saveError) {
        console.error('Save error:', saveError);
        alert('Save error: ' + saveError.message);
      }
      
      saveConfirmBtn.disabled = false;
      saveConfirmBtn.textContent = 'Save';
    });
  }
  
  // Load from Cloud
  const loadFromCloudBtn = document.getElementById('loadFromCloudBtn');
  if (loadFromCloudBtn) {
    loadFromCloudBtn.addEventListener('click', async () => {
      const browser = document.getElementById('fileBrowser');
      if (browser) {
        browser.style.display = 'flex';
        await renderFileBrowser();
      }
    });
  }
  
  const closeFileBrowser = document.getElementById('closeFileBrowser');
  if (closeFileBrowser) {
    closeFileBrowser.addEventListener('click', () => {
      const browser = document.getElementById('fileBrowser');
      if (browser) browser.style.display = 'none';
    });
  }
  
  // Render file browser
  async function renderFileBrowser() {
    const fileList = document.getElementById('fileList');
    const emptyState = document.getElementById('emptyFileState');
    
    if (!fileList) return;
    
    fileList.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading...</div>';
    if (emptyState) emptyState.style.display = 'none';
    
    const result = await window.SupabaseAPI.files.listScheduleFiles();
    
    if (!result.success) {
      fileList.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading files</div>';
      return;
    }
    
    if (result.data.length === 0) {
      fileList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    
    fileList.innerHTML = '';
    
    // Get currently open file
    const currentFile = localStorage.getItem('currentCloudFile');
    
    result.data.forEach(file => {
      const isCurrentFile = file.name === currentFile;
      
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 16px;
        border: ${isCurrentFile ? '2px solid #2563eb' : '1px solid #e5e7eb'};
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s;
        background: ${isCurrentFile ? '#eff6ff' : '#fff'};
      `;
      
      const info = document.createElement('div');
      info.style.cssText = 'flex: 1;';
      
      const nameContainer = document.createElement('div');
      nameContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';
      
      const name = document.createElement('div');
      name.style.cssText = `font-weight: 500; font-size: 14px; color: ${isCurrentFile ? '#2563eb' : '#111827'};`;
      name.textContent = file.name;
      
      // Add "OPEN" badge if this is the current file
      if (isCurrentFile) {
        const badge = document.createElement('span');
        badge.style.cssText = `
          background: #2563eb;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        `;
        badge.textContent = 'OPEN';
        nameContainer.appendChild(name);
        nameContainer.appendChild(badge);
      } else {
        nameContainer.appendChild(name);
      }
      
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size: 12px; color: #6b7280;';
      const date = new Date(file.created_at);
      meta.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      
      info.appendChild(nameContainer);
      info.appendChild(meta);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText = `
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        color: #6b7280;
        font-size: 20px;
        cursor: pointer;
        border-radius: 4px;
        margin-left: 16px;
      `;
      deleteBtn.title = 'Delete file';
      
      item.appendChild(info);
      item.appendChild(deleteBtn);
      
      // Hover effects
      item.addEventListener('mouseenter', () => {
        item.style.borderColor = '#2563eb';
        item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.borderColor = '#e5e7eb';
        item.style.boxShadow = 'none';
      });
      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.background = '#fee2e2';
        deleteBtn.style.color = '#ef4444';
      });
      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.color = '#6b7280';
      });
      
      // Click entire item to load
      item.addEventListener('click', async (e) => {
        try {
          // Don't load if clicking delete button
          if (e.target === deleteBtn) {
            return;
          }
          
          const confirmed = confirm(`Load "${file.name}"? This will replace your current schedule.`);
          
          if (!confirmed) {
            return;
          }
          
          const result = await window.SupabaseAPI.files.loadScheduleFile(file.name);
          
          if (result.success) {
            // Set flag to prevent persist() from overwriting during reload
            window.__LOADING_FILE__ = true;
            
            writeState(result.data);
            
            // Track which file is currently open
            localStorage.setItem('currentCloudFile', file.name);
            
            const browser = document.getElementById('fileBrowser');
            if (browser) browser.style.display = 'none';
            location.reload();
          } else {
            alert('Failed to load: ' + result.error);
          }
        } catch (error) {
          console.error('Error loading file:', error);
          alert('Error loading file: ' + error.message);
        }
      });
      
      // Delete button
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) {
          return;
        }
        
        const result = await window.SupabaseAPI.files.deleteScheduleFile(file.name);
        
        if (result.success) {
          renderFileBrowser();
        } else {
          alert('Failed to delete: ' + result.error);
        }
      });
      
      fileList.appendChild(item);
    });
  }
  
  // Expose renderFileBrowser to window for File Manager button
  window.renderFileBrowser = renderFileBrowser;

  // ==============================================
  // DROPBOX INTEGRATION
  // ==============================================
  
  // Show current file display on page load
  const fileDisplay = document.getElementById('currentFileDisplay');
  const currentFile = localStorage.getItem('currentCloudFile');
  const provider = localStorage.getItem('currentCloudProvider') || 'supabase';
  if (fileDisplay && currentFile) {
    const icon = provider === 'dropbox' ? '📦' : '📄';
    fileDisplay.textContent = `${icon} ${currentFile}`;
    fileDisplay.style.display = 'inline-block';
  }
  
  // Open from Dropbox button
  const openFromDropboxBtn = document.getElementById('openFromDropboxBtn');
  if (openFromDropboxBtn) {
    openFromDropboxBtn.addEventListener('click', () => {
      if (typeof window.openFromDropbox === 'function') {
        window.openFromDropbox();
      } else {
        alert('Dropbox integration not loaded. Make sure dropbox-chooser.js is included.');
      }
    });
  }
  
  // Save to Dropbox button
  const saveToDropboxBtn = document.getElementById('saveToDropboxBtn');
  if (saveToDropboxBtn) {
    saveToDropboxBtn.addEventListener('click', () => {
      const state = readState();
      
      if (typeof window.saveToDropbox === 'function') {
        window.saveToDropbox(state);
      } else {
        alert('Dropbox integration not loaded. Make sure dropbox-chooser.js is included.');
      }
    });
  }

  // ==============================================
  // FILE MANAGER
  // ==============================================
  
  const currentFileNameInput = document.getElementById('currentFileName');
  const fileProviderLabel = document.getElementById('fileProviderLabel');
  const renameFileBtn = document.getElementById('renameFileBtn');
  
  // Initialize filename display
  function updateFileNameDisplay() {
    const currentFile = localStorage.getItem('currentCloudFile');
    const provider = localStorage.getItem('currentCloudProvider') || 'local';
    const headerDisplay = document.getElementById('headerFileDisplay');
    
    if (currentFile) {
      currentFileNameInput.value = currentFile.replace('.json', '');
      if (fileProviderLabel) {
        fileProviderLabel.textContent = provider === 'dropbox' ? 'Stored on Dropbox' : provider === 'supabase' ? 'Stored on Supabase' : 'Stored locally';
      }
      
      // Update header display
      if (headerDisplay) {
        headerDisplay.textContent = currentFile.replace('.json', '');
      }
    } else {
      currentFileNameInput.value = '';
      currentFileNameInput.placeholder = 'Untitled Schedule';
      if (fileProviderLabel) {
        fileProviderLabel.textContent = 'Not saved';
      }
      
      // Update header display
      if (headerDisplay) {
        headerDisplay.textContent = 'Untitled Schedule';
      }
    }
  }
  
  // Expose globally for FileBrowser
  window.updateFileNameDisplay = updateFileNameDisplay;
  
  // Call on page load
  updateFileNameDisplay();
  
  // Rename file button
  if (renameFileBtn) {
    renameFileBtn.addEventListener('click', () => {
      let newName = currentFileNameInput.value.trim();
      if (!newName) {
        alert('Please enter a filename');
        return;
      }
      
      // Ensure .json extension
      if (!newName.endsWith('.json')) {
        newName += '.json';
      }
      
      localStorage.setItem('currentCloudFile', newName);
      updateFileNameDisplay();
      alert(`File renamed to: ${newName}`);
    });
  }
  
  // Save JSON (local download)
  const saveJsonBtn = document.getElementById('saveJsonBtn');
  if (saveJsonBtn) {
    saveJsonBtn.addEventListener('click', () => {
      const state = readState();
      let filename = currentFileNameInput.value.trim() || 'schedule';
      if (!filename.endsWith('.json')) {
        filename += '.json';
      }
      
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      localStorage.setItem('currentCloudFile', filename);
      localStorage.setItem('currentCloudProvider', 'local');
      updateFileNameDisplay();
    });
  }
  
  // Load JSON (local upload)
  const loadJsonBtn = document.getElementById('loadJsonBtn');
  if (loadJsonBtn) {
    loadJsonBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            window.__LOADING_FILE__ = true;
            writeState(data);
            
            localStorage.setItem('currentCloudFile', file.name);
            localStorage.setItem('currentCloudProvider', 'local');
            
            location.reload();
          } catch (error) {
            alert('Invalid JSON file: ' + error.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
  
  // Save to Supabase
  const saveToCloudBtnMgr = document.getElementById('saveToCloudBtnMgr');
  if (saveToCloudBtnMgr) {
    saveToCloudBtnMgr.addEventListener('click', async () => {
      if (!window.SupabaseAPI || !window.SupabaseAPI.auth.isAuthenticated()) {
        alert('Please sign in to Supabase first');
        return;
      }
      
      let filename = currentFileNameInput.value.trim();
      if (!filename) {
        filename = prompt('Enter a filename:');
        if (!filename) return;
      }
      if (!filename.endsWith('.json')) {
        filename += '.json';
      }
      
      const state = readState();
      const result = await window.SupabaseAPI.files.saveScheduleFile(filename, state);
      
      if (result.success) {
        localStorage.setItem('currentCloudFile', filename);
        localStorage.setItem('currentCloudProvider', 'supabase');
        updateFileNameDisplay();
        alert('✓ Saved to Supabase!');
      } else {
        alert('Failed to save: ' + result.error);
      }
    });
  }
  
  // Open from Supabase
  const loadFromCloudBtnMgr = document.getElementById('loadFromCloudBtnMgr');
  if (loadFromCloudBtnMgr) {
    loadFromCloudBtnMgr.addEventListener('click', async () => {
      if (!window.SupabaseAPI || !window.SupabaseAPI.auth.isAuthenticated()) {
        alert('Please sign in to Supabase first');
        return;
      }
      
      // Open the file browser modal directly
      const browser = document.getElementById('fileBrowser');
      if (browser) {
        browser.style.display = 'flex';
        await renderFileBrowser();
      } else {
        alert('File browser not available');
      }
    });
  }
  
  // Save to Dropbox
  const saveToDropboxBtnMgr = document.getElementById('saveToDropboxBtnMgr');
  if (saveToDropboxBtnMgr) {
    saveToDropboxBtnMgr.addEventListener('click', () => {
      let filename = currentFileNameInput.value.trim();
      if (!filename) {
        filename = prompt('Enter a filename:');
        if (!filename) return;
      }
      if (!filename.endsWith('.json')) {
        filename += '.json';
      }
      
      // Update localStorage with filename before saving
      localStorage.setItem('currentCloudFile', filename);
      
      const state = readState();
      
      if (typeof window.saveToDropbox === 'function') {
        window.saveToDropbox(state);
        updateFileNameDisplay();
      } else {
        alert('Dropbox integration not loaded. Make sure dropbox-chooser.js is included.');
      }
    });
  }
  
  // Open from Dropbox
  const openFromDropboxBtnMgr = document.getElementById('openFromDropboxBtnMgr');
  if (openFromDropboxBtnMgr) {
    openFromDropboxBtnMgr.addEventListener('click', () => {
      if (typeof window.openFromDropbox === 'function') {
        window.openFromDropbox();
      } else {
        alert('Dropbox integration not loaded. Make sure dropbox-chooser.js is included.');
      }
    });
  }
  
  // Export CSV
  const exportCsvBtnMgr = document.getElementById('exportCsvBtnMgr');
  if (exportCsvBtnMgr) {
    exportCsvBtnMgr.addEventListener('click', () => {
      // Call CSVExporter function
      if (window.CSVExporter && typeof window.CSVExporter.exportToCSV === 'function') {
        window.CSVExporter.exportToCSV();
      } else {
        alert('CSV export not available');
      }
    });
  }

  // ==============================================
  // FILE MENU BAR (using FileBrowser)
  // ==============================================
  
  // NEW - Create new schedule
  const fileNew = document.getElementById('fileNew');
  if (fileNew) {
    fileNew.addEventListener('click', async () => {
      if (!window.FileBrowser) {
        alert('File browser not loaded');
        return;
      }
      
      const currentFile = window.FileBrowser.getCurrentFile();
      
      const choice = await window.FileBrowser.showConfirmDialog(
        'New Schedule',
        'What would you like to do with the current schedule?',
        [
          { label: 'Save', value: 'save' },
          { label: "Don't Save", value: 'discard' },
          { label: 'Cancel', value: 'cancel' }
        ]
      );
      
      if (choice === 'cancel') return;
      
      if (choice === 'save') {
        const data = readState();
        if (currentFile) {
          // Quick save to current location
          await window.FileBrowser.quickSave(data);
        } else {
          // Show Save As dialog and wait for it
          window.FileBrowser.showSaveDialog('', () => {
            // After save, proceed with new
            clearAndReload();
          });
          return; // Don't clear yet
        }
      }
      
      clearAndReload();
      
      function clearAndReload() {
        if (window.FileBrowser) window.FileBrowser.clearCurrentFile();
        localStorage.setItem('shootScheduler_v8_10', JSON.stringify(window.getDefaultScheduleTemplate()));
        try {
          localStorage.removeItem('shootScheduler_v8_10_UNDO');
          localStorage.removeItem('shootScheduler_v8_10_REDO');
        } catch(_) { }
        location.reload();
      }
    });
  }
  
  // OPEN - Unified file browser
  const fileOpen = document.getElementById('fileOpen');
  if (fileOpen) {
    fileOpen.addEventListener('click', () => {
      if (!window.FileBrowser) {
        alert('File browser not loaded');
        return;
      }
      
      window.FileBrowser.showOpenDialog((result) => {
        if (result.success) {
          window.__LOADING_FILE__ = true;
          writeState(result.data);
          location.reload();
        }
      });
    });
  }
  
  // SAVE - Quick save to current location
  const fileSave = document.getElementById('fileSave');
  if (fileSave) {
    fileSave.addEventListener('click', async () => {
      if (!window.FileBrowser) {
        alert('File browser not loaded');
        return;
      }
      
      const data = readState();
      const result = await window.FileBrowser.quickSave(data);
      
      if (result.needsSaveAs) {
        // No current file - show Save As dialog
        const currentFile = window.FileBrowser.getCurrentFile();
        window.FileBrowser.showSaveDialog(currentFile?.name || '', () => {
          updateFileNameDisplay();
        });
      }
    });
  }
  
  // SAVE AS - Always prompt for new name/location
  const fileSaveAs = document.getElementById('fileSaveAs');
  if (fileSaveAs) {
    fileSaveAs.addEventListener('click', () => {
      if (!window.FileBrowser) {
        alert('File browser not loaded');
        return;
      }
      
      const currentFile = window.FileBrowser.getCurrentFile();
      window.FileBrowser.showSaveDialog(currentFile?.name || '', () => {
        updateFileNameDisplay();
      });
    });
  }
  
  // CLOSE - Clear current file
  const fileClose = document.getElementById('fileClose');
  if (fileClose) {
    fileClose.addEventListener('click', async () => {
      if (!window.FileBrowser) {
        alert('File browser not loaded');
        return;
      }
      
      const currentFile = window.FileBrowser.getCurrentFile();
      
      const choice = await window.FileBrowser.showConfirmDialog(
        'Close Schedule',
        'What would you like to do with the current schedule?',
        [
          { label: 'Save', value: 'save' },
          { label: "Don't Save", value: 'discard' },
          { label: 'Cancel', value: 'cancel' }
        ]
      );
      
      if (choice === 'cancel') return;
      
      if (choice === 'save') {
        const data = readState();
        if (currentFile) {
          await window.FileBrowser.quickSave(data);
        } else {
          window.FileBrowser.showSaveDialog('', () => {
            clearAndReload();
          });
          return;
        }
      }
      
      clearAndReload();
      
      function clearAndReload() {
        if (window.FileBrowser) window.FileBrowser.clearCurrentFile();
        localStorage.setItem('shootScheduler_v8_10', JSON.stringify(window.getDefaultScheduleTemplate()));
        try {
          localStorage.removeItem('shootScheduler_v8_10_UNDO');
          localStorage.removeItem('shootScheduler_v8_10_REDO');
        } catch(_) { }
        location.reload();
      }
    });
  }

})();

// Drag column header - select all functionality
function setupSelectAllHandler() {
  const dragHeader = document.querySelector('thead th[data-key="drag"]');
  if (!dragHeader) {
    console.warn('[Select All] Drag header not found - will retry after header rebuild');
    return;
  }
  
  // Remove existing listeners by cloning (clean slate)
  const newDragHeader = dragHeader.cloneNode(true);
  dragHeader.replaceWith(newDragHeader);
  
  // Click to select all rows
  newDragHeader.addEventListener('click', (e) => {
    // Ignore if clicking the resize grip
    if (e.target.classList.contains('row-resize-grip') || 
        e.target.closest('.row-resize-grip')) {
      console.log('[Select All] Ignoring click on resize grip');
      return;
    }
    
    // Ignore if Option key is pressed (handled by mousedown for header row selection)
    if (e.altKey) {
      return;
    }
    
    console.log('[Select All] Drag header clicked');
    e.stopPropagation(); // Prevent global click handler from clearing selection
    
    const tbody = document.getElementById('tbody');
    if (!tbody) {
      console.error('[Select All] tbody not found');
      return;
    }
    
    const allRows = tbody.querySelectorAll('tr[data-id]');
    console.log('[Select All] Found', allRows.length, 'rows');
    
    // Clear existing selection
    SelectionManager.clear();
    
    // Select all cells in all rows
    allRows.forEach(tr => {
      const cells = tr.querySelectorAll('td:not([data-key="drag"]):not([data-key="actions"])');
      cells.forEach(cell => {
        SelectionManager.selectedCells.add(cell);
        cell.classList.add('cell-selected');
      });
    });
    
    SelectionManager.selectionType = 'all';
    SelectionManager.lastSelectedCell = SelectionManager.selectedCells.values().next().value;
    
    console.log('[Select All] Selected', SelectionManager.selectedCells.size, 'cells');
    console.log('[Select All] Selection type:', SelectionManager.selectionType);
    console.log('[Select All] First cell:', SelectionManager.lastSelectedCell);
    
    // Also update old system for backward compatibility
    if (window.selectedRows) {
      window.selectedRows.clear();
      allRows.forEach(tr => {
        tr.classList.add('selected');
        window.selectedRows.add(tr);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initial setup
  setupSelectAllHandler();
  
  // Restore saved header height
  try {
    const savedState = JSON.parse(localStorage.getItem('shootScheduler_v8_10') || '{}');
    if (savedState.headerHeight) {
      const headerRow = document.getElementById('headerRow');
      if (headerRow) {
        const h = savedState.headerHeight;
        headerRow.style.setProperty('height', h + 'px', 'important');
        headerRow.style.setProperty('min-height', h + 'px', 'important');
        headerRow.style.setProperty('max-height', h + 'px', 'important');
        
        const ths = headerRow.querySelectorAll('th');
        const verticalPadding = h < 32 ? '0px' : '2px';
        ths.forEach(th => {
          th.style.setProperty('height', h + 'px', 'important');
          th.style.setProperty('min-height', h + 'px', 'important');
          th.style.setProperty('max-height', h + 'px', 'important');
          th.style.setProperty('padding', `${verticalPadding} 4px`, 'important');
          
          // Constrain any inputs/buttons inside header cells
          const inputs = th.querySelectorAll('input, button, select');
          if (h < 30) {
            // Small header - constrain buttons
            inputs.forEach(input => {
              input.style.setProperty('padding', '0 4px', 'important');
              input.style.setProperty('min-height', '0', 'important');
              input.style.setProperty('line-height', '1', 'important');
              input.style.setProperty('height', 'auto', 'important');
              input.style.setProperty('max-height', Math.max(h - 4, 8) + 'px', 'important');
              input.style.setProperty('font-size', '10px', 'important');
            });
          } else {
            // Normal header - restore normal button sizing
            inputs.forEach(input => {
              input.style.removeProperty('padding');
              input.style.removeProperty('min-height');
              input.style.removeProperty('line-height');
              input.style.removeProperty('height');
              input.style.removeProperty('max-height');
              input.style.removeProperty('font-size');
            });
          }
        });
      }
    }
  } catch(e) {
    console.error('Failed to restore header height:', e);
  }
  
  // Setup header resize with event delegation
  let startY = 0, startH = 0, isResizing = false;
  let tooltip = null;
  let headerRow = null;
  
  // Use capture phase on document to catch events before anything else
  document.addEventListener('mousedown', (e) => {
    // Check if clicking a header resize grip
    if (!e.target.classList.contains('row-resize-grip')) return;
    if (!e.target.closest('thead')) return; // Only header grips, not body row grips
    
    console.log('[Header Resize] mousedown triggered on grip!', e.target.dataset.gripId);
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    headerRow = document.getElementById('headerRow');
    if (!headerRow) return;
    
    isResizing = true;
    startY = e.clientY;
    startH = headerRow.offsetHeight;
    
    // Remove any existing tooltip first
    if (tooltip && tooltip.parentNode) {
      tooltip.remove();
    }
    
    tooltip = document.createElement('div');
    tooltip.className = 'resize-dimension-tooltip';
    tooltip.textContent = startH + 'px';
    document.body.appendChild(tooltip);
  }, true); // Capture phase
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing || !headerRow) return;
    e.preventDefault();
    
    const dy = e.clientY - startY;
    const minH = 4; // Allow very small headers
    const newH = Math.max(minH, startH + dy);
    
    // Update header row height
    headerRow.style.setProperty('height', newH + 'px', 'important');
    headerRow.style.setProperty('min-height', newH + 'px', 'important');
    headerRow.style.setProperty('max-height', newH + 'px', 'important');
    headerRow.style.setProperty('overflow', 'hidden', 'important');
    
    // Update all th cells
    const ths = headerRow.querySelectorAll('th');
    ths.forEach(th => {
      th.style.setProperty('height', newH + 'px', 'important');
      th.style.setProperty('min-height', newH + 'px', 'important');
      th.style.setProperty('max-height', newH + 'px', 'important');
      th.style.setProperty('overflow', 'hidden', 'important');
      th.style.setProperty('line-height', '1', 'important');
      // Keep horizontal padding, remove vertical when small
      const verticalPadding = newH < 32 ? '0px' : '2px';
      th.style.setProperty('padding', `${verticalPadding} 4px`, 'important');
      
      // Constrain any inputs/buttons inside header cells
      const inputs = th.querySelectorAll('input, button, select');
      if (newH < 30) {
        // Small header - constrain buttons
        inputs.forEach(input => {
          input.style.setProperty('padding', '0 4px', 'important');
          input.style.setProperty('min-height', '0', 'important');
          input.style.setProperty('line-height', '1', 'important');
          input.style.setProperty('height', 'auto', 'important');
          input.style.setProperty('max-height', Math.max(newH - 4, 8) + 'px', 'important');
          input.style.setProperty('font-size', '10px', 'important');
        });
      } else {
        // Normal header - restore normal button sizing
        inputs.forEach(input => {
          input.style.removeProperty('padding');
          input.style.removeProperty('min-height');
          input.style.removeProperty('line-height');
          input.style.removeProperty('height');
          input.style.removeProperty('max-height');
          input.style.removeProperty('font-size');
        });
      }
    });
    
    // Update tooltip
    if (tooltip) {
      const actualHeight = headerRow.offsetHeight;
      tooltip.textContent = Math.round(actualHeight) + 'px';
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY + 10) + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (!isResizing || !headerRow) return;
    isResizing = false;
    
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
    
    // Save the header height directly to localStorage
    try {
      const currentState = JSON.parse(localStorage.getItem('shootScheduler_v8_10') || '{}');
      currentState.headerHeight = headerRow.offsetHeight;
      localStorage.setItem('shootScheduler_v8_10', JSON.stringify(currentState));
    } catch(e) {
      console.error('Failed to save header height:', e);
    }
    
    headerRow = null;
  });
  
  // Also handle click to prevent bubbling
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('row-resize-grip')) return;
    if (!e.target.closest('thead')) return;
    
    console.log('[Header Resize] Click prevented from bubbling');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true); // Capture phase
});

// ============================================================================
// GLOBAL API FOR ALERT DASHBOARD
// ============================================================================
window.getScheduleData = function() {
  const days = window._getDays ? window._getDays() : [];
  
  // Enhance each row with its calculated display time from the DOM
  days.forEach(day => {
    if (!day.rows) return;
    
    day.rows.forEach(row => {
      // Find the corresponding TR in the DOM
      const tr = document.querySelector(`tr[data-id="${row.id}"]`);
      if (!tr) return;
      
      // Get the displayed start/end times from the DOM
      const startCell = tr.querySelector('td[data-key="start"]');
      const endCell = tr.querySelector('td[data-key="end"]');
      
      if (startCell) {
        const startText = startCell.textContent.trim();
        if (startText && startText !== '-') {
          row.displayStart = startText;
        }
      }
      
      if (endCell) {
        const endText = endCell.textContent.trim();
        if (endText && endText !== '-') {
          row.displayEnd = endText;
        }
      }
    });
  });
  
  // Get column definitions from localStorage
  try {
    const state = JSON.parse(localStorage.getItem('shootScheduler_v8_10') || '{}');
    const cols = state.cols || [];
    return { days, cols };
  } catch(e) {
    return { days, cols: [] };
  }
};

// Mousewheel scrolling for duration/offset inputs
document.addEventListener('wheel', (e) => {
  const input = e.target;
  if (!input.matches('.duration, .offset, .subDur, .subOffset')) return;
  
  // Only allow scroll when Alt/Option key is pressed
  if (!e.altKey) return;
  
  e.preventDefault();
  
  const step = Number(input.step) || 5;
  const current = Number(input.value) || 0;
  const delta = e.deltaY < 0 ? -step : step;
  
  input.value = current + delta;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Add visual highlight
  input.classList.add('changing');
  
  // Remove highlight after a brief delay
  clearTimeout(input._highlightTimeout);
  input._highlightTimeout = setTimeout(() => {
    input.classList.remove('changing');
  }, 300);
}, { passive: false });
