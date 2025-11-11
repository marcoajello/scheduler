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
  saveDayData();
  
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

  try{
    const qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s));
    const tbody=qs('#tbody'), theadRow=qs('#headerRow');
    const addRowBtn=qs('#addRowBtn'), addCallBtn=qs('#addCallBtn'), addSubBtn=qs('#addSubBtn'), resetBtn=qs('#resetBtn');
    
    // === Multi-select drag system ===
    let selectedRows = new Set();
    
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
      selectedRows.forEach(tr => tr.classList.remove('selected'));
      selectedRows.clear();
    }
    
    // Click outside tbody to clear selection
    document.addEventListener('click', (e) => {
      if (!e.target.closest('tbody') && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
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
    document.addEventListener('keydown', (e)=>{
      const mac = navigator.platform.toUpperCase().includes('MAC');
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase()==='z'){ e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); }
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

    // Utils
    function cid(){return 'c_'+Math.random().toString(36).slice(2,8);} function uid(){return 'r_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);}
    function pad(n){return String(n).padStart(2,'0');}
    function toMinutes(hhmm){if(!hhmm)return 0; const [h,m]=hhmm.split(':').map(Number); return h*60+m;}
    function minutesToHHMM(mins){mins=((mins%(1440))+1440)%1440;const h=Math.floor(mins/60);const m=mins%60;return `${pad(h)}:${pad(m)}`;}
    function hhmmToAmPm(x){const [h0,m]=x.split(':').map(Number);const ap=h0<12?'AM':'PM';let h=h0%12; if(h===0)h=12; return `${h}:${pad(m)} ${ap}`;}

    // State
    const DEFAULT_PALETTE=['#243041','#2f2a41','#41322a','#2a4132','#2a3541','#5aa0ff','#ff8a5a','#5affc1','#d1c9ff','#ffd166'];
    const FIXED_LEFT=[{key:'drag',label:'',fixed:true},{key:'idx',label:'#',fixed:true},{key:'start',label:'START',fixed:true},{key:'end',label:'END',fixed:true},{key:'duration',label:'DUR',fixed:true},{key:'type',label:'TYPE',fixed:true},{key:'title',label:'EVENT',fixed:true},];
    const FIXED_RIGHT=[{key:'actions',label:'',fixed:true}];
    const DEFAULT_CUSTOM_COLS=[{id:cid(),key:'c_text',label:'TEXT',type:'text',show:true,print:true},{id:cid(),key:'c_uploads',label:'MEDIA',type:'upload',show:true,print:true},{id:cid(),key:'c_tags',label:'TAGS',type:'tags',show:true,print:true},];

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
    scheduleStart: s.start || '08:00',
    rows: s.rows || [],
    palette: s.palette || DEFAULT_PALETTE.slice(),
    cols: s.cols || DEFAULT_CUSTOM_COLS.slice()
  };
  return [firstDay];
}

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
    scheduleStart: lastDay.scheduleStart || '08:00',
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
  if (scheduleStart) scheduleStart.value = day.scheduleStart || '08:00';
  
  // Migration: Fix old dark sub-schedule colors
  (day.rows || []).forEach(r => {
    if (r.type === 'SUB' && r.subColor === '#243041') {
      r.subColor = '';  // Clear the old dark color; will use theme default
    }
  });
  
  // Rebuild schedule
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  (day.rows || []).forEach(r => {
    const head = makeRow(r);
    tbody.appendChild(head);
    if (r.type === 'SUB') {
      (r.children || []).forEach(ch => tbody.appendChild(makeSubChildRow(head, ch)));
    }
  });
  
  rebuildHeaders();
  updateHeaderDisplay();
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
  
  // Trigger header designer to update with new day's metadata
  // Use setTimeout to ensure DOM has updated with new values
  setTimeout(() => {
    if (window.updateHeaderMetadata) {
      console.log('[loadDay] Calling updateHeaderMetadata');
      window.updateHeaderMetadata();
    }
  }, 10);
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
      subColor: tr.dataset.subColor || '',
      subFg: tr.dataset.subFg || '',
      rowBg: tr.dataset.rowBg || '',
      rowFg: tr.dataset.rowFg || '',
      // Save formatting properties
      fontFamily: tr.dataset.fontFamily || '',
      fontSize: tr.dataset.fontSize || '',
      bold: tr.dataset.bold === 'true',
      italic: tr.dataset.italic === 'true',
      underline: tr.dataset.underline === 'true',
      align: tr.dataset.align || '',
      custom: getRowCustomFromDOM(tr)
    };
    
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
          // Save formatting properties
          fontFamily: next.dataset.fontFamily || '',
          fontSize: next.dataset.fontSize || '',
          bold: next.dataset.bold === 'true',
          italic: next.dataset.italic === 'true',
          underline: next.dataset.underline === 'true',
          align: next.dataset.align || '',
          custom: getRowCustomFromDOM(next)
        };
        
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
  
  updateDay(currentDayId, {
    date: metaDate?.value || '',
    dow: metaDow?.value || '',
    scheduleStart: scheduleStart?.value || '08:00',
    rows
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
  drag:60, dash:6, idx:36, start:100, end:100, duration:60, type:90, title:200, actions:120
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
  
  // Calculate total table width
  let totalWidth = 0;
  
  cols.forEach(c=>{
    const el = document.createElement('col');
    el.dataset.key = c.key;
    
    // Add data attributes for separator columns
    if(c.type === 'separator') {
      el.dataset.type = 'separator';
      if(c.removeBorders) el.dataset.removeBorders = 'true';
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
      colWidth = 60;
      el.style.width = '60px';
      el.style.minWidth = '60px';
      el.style.maxWidth = '60px';
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
  
  // Force table to exact width of visible columns
  if (visibleWidth > 0) {
    table.style.cssText = `width: ${visibleWidth}px !important; min-width: ${visibleWidth}px !important; max-width: ${visibleWidth}px !important;`;
  } else {
    table.style.cssText = '';
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
          th.style.width = '60px'; th.style.minWidth = '60px'; th.style.maxWidth = '60px';
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
            td.style.width = '60px'; td.style.minWidth = '60px'; td.style.maxWidth = '60px';
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



    function getPalette(){const s=readState(); return Array.isArray(s.palette)&&s.palette.length?s.palette:DEFAULT_PALETTE.slice();}
    function setPalette(p){const s=readState(); writeState({...s, palette:[...new Set(p)]}); renderPalette();}
    function getCols(){const s=readState(); if(Array.isArray(s.cols)) return s.cols; return DEFAULT_CUSTOM_COLS.slice();}
    function setCols(cols){const s=readState(); writeState({...s, cols}); rebuildHeaders(); rebuildRowsKeepData(); persist();}
    
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
    
    function setColumnOrder(order) {
      try {
        // IMPORTANT: Extract row data BEFORE updating headers/order
        // This ensures we're reading from the old DOM structure
        const rowsData = [];
        qsa('tbody tr').forEach(tr=>{
          if(tr.classList.contains('subchild')) return;
          const row={ 
            id:tr.dataset.id, 
            type:tr.dataset.type, 
            title: tr.querySelector('.title')?.value || '', 
            duration: tr.querySelector('.duration')?.value ?? 0, 
            offset: tr.querySelector('.offset')?.value ?? 0, 
            anchorMode: tr.dataset.anchorMode || 'start', 
            anchorId: tr.dataset.anchorId || '', 
            subColor: tr.dataset.subColor || '', 
            subFg: tr.dataset.subFg || '', 
            rowBg: tr.dataset.rowBg || '', 
            rowFg: tr.dataset.rowFg || '', 
            custom: getRowCustomFromDOM(tr), 
            children: [] 
          };
          if(tr.dataset.type==='SUB'){
            let next=tr.nextElementSibling;
            while(next && next.classList.contains('subchild') && next.dataset.parent===tr.dataset.id){
              const child={ 
                id: next.dataset.id, 
                title: next.querySelector('.subTitle').value, 
                duration: next.querySelector('.subDur')?.value || next.querySelector('.subOffset')?.value || 0,
                subType: next.dataset.subType || 'event',
                subChildColor: next.dataset.subChildColor || '', 
                subChildFg: next.dataset.subChildFg || '', 
                custom: getRowCustomFromDOM(next) 
              };
              row.children.push(child);
              next=next.nextElementSibling;
            }
          }
          rowsData.push(row);
        });
        
        // NOW update the order and rebuild with extracted data
        const s = readState();
        const currentDay = getCurrentDay();
        if (currentDay) {
          currentDay.rows = rowsData;
          updateDay(currentDay);
        }
        writeState({...s, columnOrder: order});
        rebuildHeaders();
        rebuildUI();
      } catch(e) {
        console.error('Error setting column order:', e);
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
      // Compress images before storing
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImage(file, 0.7, 1200); // 70% quality, max 1200px
        } catch (e) {
          console.warn('Image compression failed, using original:', e);
        }
      }
      
      // Store in local IndexedDB
      const db = vaultDb || await openVault();
      const localId = await new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        const st = tx.objectStore('files');
        const obj = {name: file.name, type: file.type, data: file, created: Date.now()};
        const r = st.add(obj);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      
      // ALSO upload to Supabase if authenticated
      if (window.SupabaseAPI?.auth?.isAuthenticated()) {
        try {
          console.log('📤 Uploading to Supabase:', file.name);
          const result = await window.SupabaseAPI.storage.uploadImage(file, 'schedules/');
          if (result.success) {
            console.log('✓ Uploaded to Supabase:', result.url);
          } else {
            console.warn('⚠️ Supabase upload failed:', result.error);
          }
        } catch (err) {
          console.error('⚠️ Supabase upload error:', err);
          // Continue with local ID even if cloud upload fails
        }
      }
      
      return localId;
    }
    
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
          <td>
            <select class="colAlign" data-key="${c.key}">
              <option value="left"${align==='left'?' selected':''}>←</option>
              <option value="center"${align==='center'?' selected':''}>↔</option>
              <option value="right"${align==='right'?' selected':''}>→</option>
            </select>
          </td>
          <td><input type="checkbox" class="colShow" data-key="${c.key}"${isVisible?' checked':''} /></td>
          <td><input type="checkbox" class="colPrint" data-key="${c.key}"${isPrintable?' checked':''} /></td>
          <td>
            <div class="col-controls" style="display:flex;gap:4px;flex-direction:column;">
              <div style="display:flex;gap:4px;">
                <button class="ghost colMoveUp" data-key="${c.key}" title="Move up"${!canMoveUp?' disabled':''} style="padding:2px 6px;font-size:12px;">↑</button>
                <button class="ghost colMoveDown" data-key="${c.key}" title="Move down"${!canMoveDown?' disabled':''} style="padding:2px 6px;font-size:12px;">↓</button>
                ${!isBuiltIn ? `<button class="ghost colDel" data-key="${c.key}" title="Remove" style="padding:2px 6px;font-size:12px;">✕</button>` : ''}
              </div>
              ${isSeparator ? `
                <div style="display:flex;gap:4px;align-items:center;margin-top:2px;">
                  <input type="text" class="colSepChar" data-key="${c.key}" value="${c.separatorChar||'—'}" placeholder="—" style="width:30px;text-align:center;padding:2px;" maxlength="3" />
                  <label style="font-size:10px;color:var(--muted);display:flex;align-items:center;gap:2px;white-space:nowrap;">
                    <input type="checkbox" class="colRemoveBorders" data-key="${c.key}"${c.removeBorders?' checked':''} />
                    No Borders
                  </label>
                </div>
              ` : ''}
            </div>
          </td>
        `;
        
        // Event listeners
        const label = row.querySelector('.colLabel');
        const typeSel = row.querySelector('.colType');
        const alignSel = row.querySelector('.colAlign');
        const showChk = row.querySelector('.colShow');
        const printChk = row.querySelector('.colPrint');
        const moveUp = row.querySelector('.colMoveUp');
        const moveDown = row.querySelector('.colMoveDown');
        const del = row.querySelector('.colDel');
        const sepChar = row.querySelector('.colSepChar');
        const removeBordersChk = row.querySelector('.colRemoveBorders');
        
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
                if(!c.fixed) { setCols(cols); }
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
              if(!c.fixed) { setCols(cols); }
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
            
            // Save the updated column type first
            setCols(cols);
            
            // THEN clear data if changing TO separator (after UI is rebuilt)
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
                // Rebuild UI again to show cleared data
                rebuildUI();
              }
            }
            
            persist && persist();
            renderColManager(); // Rebuild to show/hide separator controls
          }
        });
        
        // Alignment
        alignSel && alignSel.addEventListener('change', () => { 
          setColAlignment(c.key, alignSel.value);
          applyColumnAlignments();
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
            }
          }
        });
        
        // Print
        printChk && printChk.addEventListener('change', () => {
          updatePrintColumns();
        });
        
        // Move up/down
        moveUp && moveUp.addEventListener('click', (e) => {
          console.log('moveUp clicked!', c.key);
          e.preventDefault();
          e.stopPropagation();
          const newOrder = [...columnOrder];
          const currentIdx = newOrder.indexOf(c.key);
          if(currentIdx > 1) { // Can't move past drag (0) or idx (1)
            [newOrder[currentIdx-1], newOrder[currentIdx]] = [newOrder[currentIdx], newOrder[currentIdx-1]];
            setColumnOrder(newOrder);
            applyColWidths(); // Force column width recalculation
            renderColManager();
            persist && persist();
          }
        });
        
        moveDown && moveDown.addEventListener('click', (e) => {
          console.log('moveDown clicked!', c.key);
          e.preventDefault();
          e.stopPropagation();
          const newOrder = [...columnOrder];
          const currentIdx = newOrder.indexOf(c.key);
          if(currentIdx < newOrder.length - 2) { // Can't move past actions (last)
            [newOrder[currentIdx], newOrder[currentIdx+1]] = [newOrder[currentIdx+1], newOrder[currentIdx]];
            setColumnOrder(newOrder);
            applyColWidths(); // Force column width recalculation
            renderColManager();
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
              // Remove from columnOrder too
              const newOrder = columnOrder.filter(k => k !== c.key);
              setColumnOrder(newOrder);
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
            persist && persist();
          }
        });
        
        // Remove borders
        removeBordersChk && removeBordersChk.addEventListener('change', () => {
          console.log('removeBorders toggled:', removeBordersChk.checked, 'for column:', c.key);
          const cols = getCols();
          const colToUpdate = cols.find(col => col.key === c.key);
          if(colToUpdate) {
            colToUpdate.removeBorders = removeBordersChk.checked;
            console.log('Updated column:', colToUpdate);
            setCols(cols); // This triggers rebuildHeaders() and rebuildRowsKeepData()
            persist && persist();
            renderColManager(); // Rebuild manager to show updated state
          }
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
      setCols(cols); 
      
      // Add to columnOrder before actions
      const order = getColumnOrder();
      const actionsIdx = order.indexOf('actions');
      if(actionsIdx !== -1) {
        order.splice(actionsIdx, 0, newKey);
      } else {
        order.push(newKey);
      }
      setColumnOrder(order);
      
      renderColManager();
      persist && persist(); 
    });
    colReset && colReset.addEventListener('click', ()=> setCols(DEFAULT_CUSTOM_COLS.slice()));

    // Popovers
    function closeAllPopovers(){ qsa('.popover.is-open').forEach(p=> p.classList.remove('is-open')); }
    document.addEventListener('click', (e)=>{ if(!e.target.closest('.popover') && !e.target.closest('[data-popover-trigger]')) closeAllPopovers(); });
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
          cell.style.setProperty('text-align', align, 'important');
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
            
            // Apply alignment to cell using CSS custom properties
            cell.style.setProperty('--col-align', format.align);
            cell.style.setProperty('text-align', format.align, 'important');
            
            // Apply alignment to all inputs/textareas/selects in cell
            const inputs = cell.querySelectorAll('input:not([type="color"]), textarea, select');
            console.log('[applyColumnFormats] Found', inputs.length, 'inputs in cell');
            inputs.forEach((input) => {
              input.style.setProperty('text-align', format.align, 'important');
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
        } else {
          const isSubchild = targetElement.classList.contains('subchild');
          const isSub = targetElement.dataset.type === 'SUB';
          return {
            fontFamily: targetElement.dataset.fontFamily || '',
            fontSize: targetElement.dataset.fontSize || '',
            bold: targetElement.dataset.bold === 'true',
            italic: targetElement.dataset.italic === 'true',
            underline: targetElement.dataset.underline === 'true',
            align: targetElement.dataset.align || '',
            fgColor: isSubchild ? (targetElement.dataset.subChildFg || '') : isSub ? (targetElement.dataset.subFg || '') : (targetElement.dataset.rowFg || ''),
            bgColor: isSubchild ? (targetElement.dataset.subChildColor || '') : isSub ? (targetElement.dataset.subColor || '') : (targetElement.dataset.rowBg || '')
          };
        }
      };
      
      const current = getCurrentFormat();
      const pop = document.createElement('div');
      pop.className = 'format-popover popover compact-format is-open';
      
      // Check if bulk formatting (multiple selected rows)
      const isBulkFormat = selectedRows.size > 1 && selectedRows.has(targetElement);
      const bulkCount = isBulkFormat ? selectedRows.size : 1;
      const bulkIndicator = isBulkFormat ? ` <span style="color:var(--primary);font-size:11px;">(${bulkCount} rows)</span>` : '';
      
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
          <strong style="font-size:12px;color:var(--text);">Format${bulkIndicator}</strong>
          <button class="ghost pop-close">✕</button>
        </div>
        <div class="compact-format-grid">
          <div class="format-row">
            <select class="fmt-font" title="Font" style="font-size:11px;padding:4px;">
              <option value="">Font</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', Courier, monospace">Courier</option>
            </select>
            <select class="fmt-size" title="Size" style="font-size:11px;padding:4px;">
              <option value="">Size</option>
              <option value="10px">10</option>
              <option value="12px">12</option>
              <option value="14px">14</option>
              <option value="16px">16</option>
              <option value="18px">18</option>
              <option value="20px">20</option>
            </select>
          </div>
          <div class="format-row">
            <button class="fmt-btn fmt-bold ${current.bold ? 'active' : ''}" title="Bold" style="font-weight:bold;">B</button>
            <button class="fmt-btn fmt-italic ${current.italic ? 'active' : ''}" title="Italic" style="font-style:italic;">I</button>
            <button class="fmt-btn fmt-underline ${current.underline ? 'active' : ''}" title="Underline" style="text-decoration:underline;">U</button>
            <select class="fmt-align" title="Align" style="font-size:11px;padding:4px;">
              <option value="">Align</option>
              <option value="left">←</option>
              <option value="center">↔</option>
              <option value="right">→</option>
            </select>
          </div>
          <div class="format-row">
            <label class="color-label" style="display:flex;align-items:center;gap:4px;font-size:11px;">
              <span>Text</span>
              <input type="color" class="fmt-fg" value="${current.fgColor || '#000000'}" style="width:32px;height:24px;">
            </label>
            <label class="color-label" style="display:flex;align-items:center;gap:4px;font-size:11px;">
              <span>BG</span>
              <input type="color" class="fmt-bg" value="${current.bgColor || '#ffffff'}" style="width:32px;height:24px;">
            </label>
          </div>
          <div class="format-actions" style="display:none;">
            <button class="fmt-apply" style="flex:1;">Apply</button>
            <button class="ghost fmt-clear" style="flex:1;">Clear</button>
          </div>
        </div>
      `;
      
      pop.innerHTML = popupHTML;
      
      triggerBtn.after(pop);
      
      // Position popover relative to button using fixed positioning
      const btnRect = triggerBtn.getBoundingClientRect();
      const popupHeight = formatType === 'column' ? 120 : 280;
      const viewportHeight = window.innerHeight;
      
      pop.style.position = 'fixed';
      pop.style.left = (btnRect.left) + 'px';
      
      if (btnRect.bottom + popupHeight + 4 > viewportHeight) {
        pop.style.top = Math.max(10, btnRect.top - popupHeight - 4) + 'px';
      } else {
        pop.style.top = (btnRect.bottom + 4) + 'px';
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
      const alignSel = pop.querySelector('.fmt-align');
      if(fontSel) fontSel.value = current.fontFamily || '';
      if(sizeSel) sizeSel.value = current.fontSize || '';
      if(alignSel) alignSel.value = current.align || '';
      
      const boldBtn = pop.querySelector('.fmt-bold');
      const italicBtn = pop.querySelector('.fmt-italic');
      const underlineBtn = pop.querySelector('.fmt-underline');
      
      // Function to apply formatting immediately
      const applyFormatNow = () => {
        const fgEl = pop.querySelector('.fmt-fg');
        const bgEl = pop.querySelector('.fmt-bg');
        const format = {
          fontFamily: fontSel?.value || '',
          fontSize: sizeSel?.value || '',
          bold: boldBtn?.classList.contains('active') || false,
          italic: italicBtn?.classList.contains('active') || false,
          underline: underlineBtn?.classList.contains('active') || false,
          align: alignSel?.value || '',
          fgColor: fgEl ? fgEl.value : '#000000',
          bgColor: bgEl ? bgEl.value : '#ffffff'
        };
        
        console.log('[Format changed] formatType:', formatType, 'format:', format);
        
        // Apply to all selected rows if multi-selection is active
        const rowsToFormat = selectedRows.size > 1 && selectedRows.has(targetElement) 
          ? Array.from(selectedRows) 
          : [targetElement];
        
        console.log(`[Bulk format] Applying to ${rowsToFormat.length} row(s)`);
        
        rowsToFormat.forEach(row => {
          applyRowBg(row, format.bgColor, false, false);
          row.dataset.rowFg = format.fgColor;
          row.dataset.fontFamily = format.fontFamily;
          row.dataset.fontSize = format.fontSize;
          row.dataset.bold = format.bold ? 'true' : '';
          row.dataset.italic = format.italic ? 'true' : '';
          row.dataset.underline = format.underline ? 'true' : '';
          row.dataset.align = format.align;
          
          // Apply formatting to row
          applyFormatting(row, format, formatType);
        });
        
        persist();
      };
      
      // Attach change listeners to apply formatting immediately
      if (boldBtn) boldBtn.addEventListener('click', () => {
        boldBtn.classList.toggle('active');
        applyFormatNow();
      });
      if (italicBtn) italicBtn.addEventListener('click', () => {
        italicBtn.classList.toggle('active');
        applyFormatNow();
      });
      if (underlineBtn) underlineBtn.addEventListener('click', () => {
        underlineBtn.classList.toggle('active');
        applyFormatNow();
      });
      
      if (fontSel) fontSel.addEventListener('change', applyFormatNow);
      if (sizeSel) sizeSel.addEventListener('change', applyFormatNow);
      if (alignSel) alignSel.addEventListener('change', applyFormatNow);
      
      const fgInput = pop.querySelector('.fmt-fg');
      const bgInput = pop.querySelector('.fmt-bg');
      if(fgInput) fgInput.addEventListener('input', applyFormatNow);
      if(bgInput) bgInput.addEventListener('input', applyFormatNow);
      
      const applyBtn = pop.querySelector('.fmt-apply');
      if (applyBtn) applyBtn.addEventListener('click', () => {
        applyFormatNow();
        pop.remove();
      });
      
      const clearBtn = pop.querySelector('.fmt-clear');
      if (clearBtn) clearBtn.addEventListener('click', () => {
        // Clear all selected rows if multi-selection is active
        const rowsToClear = selectedRows.size > 1 && selectedRows.has(targetElement) 
          ? Array.from(selectedRows) 
          : [targetElement];
        
        console.log(`[Bulk clear] Clearing ${rowsToClear.length} row(s)`);
        
        rowsToClear.forEach(row => {
          row.dataset.rowFg = '';
          row.dataset.fontFamily = '';
          row.dataset.fontSize = '';
          row.dataset.bold = '';
          row.dataset.italic = '';
          row.dataset.underline = '';
          row.dataset.align = '';
          applyRowBg(row, '', false, false);
          
          const inputs = row.querySelectorAll('input:not(.duration):not(.offset), textarea, select');
          inputs.forEach(inp => {
            inp.style.fontFamily = '';
            inp.style.fontSize = '';
            inp.style.fontWeight = '';
            inp.style.fontStyle = '';
            inp.style.textDecoration = '';
            inp.style.textAlign = '';
            inp.style.color = '';
          });
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
            fgColor: isSubchild ? (rowElement.dataset.subChildFg || '') : 
                     isSub ? (rowElement.dataset.subFg || '') : 
                     (rowElement.dataset.rowFg || ''),
            bgColor: isSubchild ? (rowElement.dataset.subChildColor || '') : 
                     isSub ? (rowElement.dataset.subColor || '') : 
                     (rowElement.dataset.rowBg || '')
          };
        }
      };
      
      // Check if this button already has a popover
      let pop = triggerBtn.nextElementSibling;
      if (pop && pop.classList.contains('format-popover')) {
        // Just toggle it
      } else {
        // Create new formatting popover
        const current = getCurrentFormatting();
        
        pop=document.createElement('div'); 
        pop.className='format-popover popover';
        pop.innerHTML=`
          <div class="pop-head"><strong>Format Text</strong><button class="ghost pop-close">✕</button></div>
          
          <div class="format-section">
            <label class="format-label">Font Family</label>
            <select class="format-font-family">
              <option value="">Default</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
              <option value="'Times New Roman', Times, serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', Courier, monospace">Courier New</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="Impact, sans-serif">Impact</option>
            </select>
          </div>
          
          <div class="format-section">
            <label class="format-label">Font Size</label>
            <select class="format-font-size">
              <option value="">Default</option>
              <option value="10px">10px</option>
              <option value="11px">11px</option>
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
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
              <button class="format-btn format-align-center" data-active="${current.align==='center'}" title="Center">⬌</button>
              <button class="format-btn format-align-right" data-active="${current.align==='right'}" title="Right">➡</button>
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
        
        // Clear buttons
        pop.querySelector('.clear-fg').addEventListener('click', (e)=> {
          e.preventDefault();
          pop.querySelector('.format-fg-color').value = '#000000';
        });
        pop.querySelector('.clear-bg').addEventListener('click', (e)=> {
          e.preventDefault();
          pop.querySelector('.format-bg-color').value = '#ffffff';
        });
        
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
            underline: false, align: 'left', fgColor: '', bgColor: ''
          }, formatType);
          pop.classList.remove('is-open');
          persist();
        });
        
        // Close button
        pop.querySelector('.pop-close').addEventListener('click', ()=> pop.classList.remove('is-open'));
        
        triggerBtn.after(pop);
      }
      
      triggerBtn.setAttribute('data-popover-trigger','');
      const newBtn = triggerBtn.cloneNode(true);
      triggerBtn.parentNode.replaceChild(newBtn, triggerBtn);
      
      newBtn.addEventListener('click', (e)=> { 
        e.stopPropagation(); 
        closeAllPopovers(); 
        pop.classList.add('is-open'); 
        
        const r = newBtn.getBoundingClientRect(); 
        const popupHeight = 500; // max-height from CSS
        const viewportHeight = window.innerHeight;
        
        pop.style.position = 'fixed';
        pop.style.left = r.left + 'px';
        
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
    
    function applyFormatting(element, formatting, formatType='row') {
      try {
      // Store formatting in dataset
      if (formatting.fontFamily) element.dataset.fontFamily = formatting.fontFamily;
      else delete element.dataset.fontFamily;
      
      if (formatting.fontSize) element.dataset.fontSize = formatting.fontSize;
      else delete element.dataset.fontSize;
      
      element.dataset.bold = formatting.bold;
      element.dataset.italic = formatting.italic;
      element.dataset.underline = formatting.underline;
      element.dataset.align = formatting.align;
      
      if (formatting.fgColor) element.dataset.rowFg = formatting.fgColor;
      else delete element.dataset.rowFg;
      
      if (formatting.bgColor) element.dataset.rowBg = formatting.bgColor;
      else delete element.dataset.rowBg;
      
      // Apply visual styles
      if (formatType === 'row') {
        // Apply to all TD elements in the row for proper inheritance (except control columns)
        element.querySelectorAll('td').forEach(td => {
          const key = td.dataset.key;
          const isControlColumn = key === 'drag' || key === 'idx' || key === 'actions';
          
          if (!isControlColumn) {
            if (formatting.fontFamily) td.style.fontFamily = formatting.fontFamily;
            else td.style.fontFamily = '';
            
            if (formatting.fontSize) td.style.fontSize = formatting.fontSize;
            else td.style.fontSize = '';
            
            td.style.fontWeight = formatting.bold ? 'bold' : '';
            td.style.fontStyle = formatting.italic ? 'italic' : '';
            td.style.textDecoration = formatting.underline ? 'underline' : '';
          }
          
          // Apply alignment to text cells (not drag or actions)
          if (!td.classList.contains('drag') && !td.classList.contains('actions')) {
            td.style.textAlign = formatting.align;
          }
        });
        
        // Also apply to inputs and text areas in the row
        element.querySelectorAll('input[type="text"], input.title, input.subTitle, textarea').forEach(input => {
          if (formatting.fontFamily) input.style.fontFamily = formatting.fontFamily;
          else input.style.fontFamily = '';
          
          if (formatting.fontSize) input.style.fontSize = formatting.fontSize;
          else input.style.fontSize = '';
          
          input.style.fontWeight = formatting.bold ? 'bold' : '';
          input.style.fontStyle = formatting.italic ? 'italic' : '';
          input.style.textDecoration = formatting.underline ? 'underline' : '';
        });
        
        if (formatting.fgColor) {
          // Handle different row types
          if (element.classList.contains('subchild')) {
            element.dataset.subChildFg = formatting.fgColor;
            element.style.setProperty('--subchild-fg', formatting.fgColor);
          } else if (element.dataset.type === 'SUB') {
            element.dataset.subFg = formatting.fgColor;
            element.style.setProperty('--sub-fg', formatting.fgColor);
          } else {
            element.dataset.rowFg = formatting.fgColor;
            element.style.setProperty('--row-fg', formatting.fgColor);
          }
          // Apply color to all cells EXCEPT control columns (drag, idx, actions)
          console.log('🎨 Applying fg color to cells:', formatting.fgColor);
          element.querySelectorAll('td').forEach(td => {
            const key = td.dataset.key;
            if (key !== 'drag' && key !== 'idx' && key !== 'actions') {
              td.style.setProperty('color', formatting.fgColor, 'important');
            }
          });
          // Also apply to inputs
          element.querySelectorAll('input, textarea').forEach(input => {
            input.style.setProperty('color', formatting.fgColor, 'important');
          });
        } else {
          if (element.classList.contains('subchild')) {
            delete element.dataset.subChildFg;
            element.style.removeProperty('--subchild-fg');
          } else if (element.dataset.type === 'SUB') {
            delete element.dataset.subFg;
            element.style.removeProperty('--sub-fg');
          } else {
            delete element.dataset.rowFg;
            element.style.removeProperty('--row-fg');
          }
          element.querySelectorAll('td').forEach(td => {
            const key = td.dataset.key;
            if (key !== 'drag' && key !== 'idx' && key !== 'actions') {
              td.style.removeProperty('color');
            }
          });
          // Also clear from inputs
          element.querySelectorAll('input, textarea').forEach(input => {
            input.style.removeProperty('color');
          });
        }
        
        if (formatting.bgColor) {
          // Handle different row types
          if (element.classList.contains('subchild')) {
            element.dataset.subChildColor = formatting.bgColor;
            element.style.setProperty('--subchild-bg', formatting.bgColor);
          } else if (element.dataset.type === 'SUB') {
            element.dataset.subColor = formatting.bgColor;
            element.style.setProperty('--sub-bg', formatting.bgColor);
          } else {
            element.dataset.rowBg = formatting.bgColor;
            element.style.setProperty('--row-bg', formatting.bgColor);
          }
        } else {
          if (element.classList.contains('subchild')) {
            delete element.dataset.subChildColor;
            element.style.removeProperty('--subchild-bg');
          } else if (element.dataset.type === 'SUB') {
            delete element.dataset.subColor;
            element.style.removeProperty('--sub-bg');
          } else {
            delete element.dataset.rowBg;
            element.style.removeProperty('--row-bg');
          }
        }
        
        // Update row number color to match
        const rowNumCell = element.querySelector('td:first-child');
        if (rowNumCell && formatting.fgColor) {
          rowNumCell.style.color = formatting.fgColor;
        } else if (rowNumCell) {
          rowNumCell.style.color = '';
        }
      } else if (formatType === 'meta') {
        // Apply to meta display
        const metaDisplay = document.getElementById('metaDisplay');
        if (metaDisplay) {
          if (formatting.fontFamily) metaDisplay.style.fontFamily = formatting.fontFamily;
          else metaDisplay.style.fontFamily = '';
          
          if (formatting.fontSize) metaDisplay.style.fontSize = formatting.fontSize;
          else metaDisplay.style.fontSize = '';
          
          metaDisplay.style.fontWeight = formatting.bold ? 'bold' : '';
          metaDisplay.style.fontStyle = formatting.italic ? 'italic' : '';
          metaDisplay.style.textDecoration = formatting.underline ? 'underline' : '';
          metaDisplay.style.textAlign = formatting.align;
          
          if (formatting.fgColor) metaDisplay.style.color = formatting.fgColor;
          else metaDisplay.style.color = '';
          
          if (formatting.bgColor) metaDisplay.style.backgroundColor = formatting.bgColor;
          else metaDisplay.style.backgroundColor = '';
        }
      } else if (formatType === 'cell') {
        // Apply formatting to individual cell
        console.log('[Cell Format] Applying to element:', element);
        console.log('[Cell Format] Formatting:', formatting);
        
        const textarea = element.querySelector('textarea, input[type="text"]');
        console.log('[Cell Format] Found textarea:', textarea);
        
        if (textarea) {
          // Store formatting in TD dataset (parent cell)
          const td = textarea.closest('td');
          console.log('[Cell Format] Found TD:', td);
          
          if (td) {
            if (formatting.fontFamily) td.dataset.fontFamily = formatting.fontFamily;
            else delete td.dataset.fontFamily;
            
            if (formatting.fontSize) td.dataset.fontSize = formatting.fontSize;
            else delete td.dataset.fontSize;
            
            td.dataset.bold = formatting.bold;
            td.dataset.italic = formatting.italic;
            td.dataset.underline = formatting.underline;
            td.dataset.align = formatting.align;
            
            // Always store colors, even if empty
            td.dataset.cellFg = formatting.fgColor || '';
            td.dataset.cellBg = formatting.bgColor || '';
            
            console.log('[Cell Format] Stored in dataset - fg:', td.dataset.cellFg, 'bg:', td.dataset.cellBg);
          }
          
          // Apply visual styles to textarea
          if (formatting.fontFamily) {
            textarea.style.fontFamily = formatting.fontFamily;
          } else {
            textarea.style.fontFamily = '';
          }
          
          if (formatting.fontSize) {
            textarea.style.fontSize = formatting.fontSize;
          } else {
            textarea.style.fontSize = '';
          }
          
          textarea.style.fontWeight = formatting.bold ? 'bold' : '';
          textarea.style.fontStyle = formatting.italic ? 'italic' : '';
          textarea.style.textDecoration = formatting.underline ? 'underline' : '';
          textarea.style.textAlign = formatting.align || 'left';
          
          // Apply colors - color inputs always have values
          if (formatting.fgColor) {
            textarea.style.setProperty('color', formatting.fgColor, 'important');
          } else {
            textarea.style.removeProperty('color');
          }
          
          if (formatting.bgColor) {
            textarea.style.setProperty('background-color', formatting.bgColor, 'important');
          } else {
            textarea.style.removeProperty('background-color');
          }
          
          console.log('[Cell Format] Applied styles - color:', textarea.style.color, 'bg:', textarea.style.backgroundColor);
        } else {
          console.error('[Cell Format] No textarea found in element');
        }
      } else if (formatType === 'column') {
        // Apply formatting to entire column via setColFormat
        const key = element.dataset.key;
        if (key) {
          setColFormat(key, formatting);
        }
      }
      } catch(error) {
        console.error('Error in applyFormatting:', error);
      }
    }

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
      const cols = getAllColumnsSorted();
      theadRow.innerHTML='';
      cols.forEach(col=>{
        const th=document.createElement('th'); 
        th.dataset.key=col.key;
        
        // Add data attributes for separator columns
        if(col.type === 'separator') {
          th.dataset.type = 'separator';
          if(col.removeBorders) {
            th.dataset.removeBorders = 'true';
            console.log(`Setting removeBorders=true on th for ${col.key}`);
          } else {
            delete th.dataset.removeBorders;
            console.log(`Removing removeBorders from th for ${col.key}`);
          }
        }
        
        // Add format button to ALL columns except drag
        if(col.key !== 'drag'){
          const labelSpan = document.createElement('span');
          labelSpan.textContent = col.label || '';
          th.appendChild(labelSpan);
        } else {
          th.textContent = col.label || '';
        }
        
        if(col.key==='drag'||col.key==='actions'){ th.classList.add(col.key==='drag'?'fixed-left':'fixed-right'); th.textContent=''; }
        if(!col.fixed){ if(col.show===false) th.classList.add('col-hide'); if(col.print===false) th.classList.add('col-print-hide'); }
        theadRow.appendChild(th);
      });
    
      applyColWidths(); addHeaderResizeGrips();
}

    // Custom cells
    function appendCustomCells(tr,rowData){
      // Get custom columns in sorted order (excluding fixed columns)
      const customCols = getAllColumnsSorted().filter(col => !col.fixed);
      customCols.forEach(col=>{
        const td=document.createElement('td'); td.dataset.key=col.key;
        td.className = 'custom-cell'; // Add class for styling
        if(col.show===false) td.classList.add('col-hide');
        if(col.print===false) td.classList.add('col-print-hide');
        const cellData = ((rowData.custom||{})[col.key])||'';
        
        // Handle both old format (string) and new format (object with formatting)
        let val = '';
        let cellFormatting = null;
        if (typeof cellData === 'object' && cellData.value !== undefined) {
          val = cellData.value;
          cellFormatting = cellData.formatting;
        } else {
          val = cellData;
        }
        
        if(col.type==='text'){
          td.innerHTML=`<div class="cell-wrapper">
            <textarea class="cc-input" data-ckey="${col.key}" rows="2" placeholder="${col.label||''}">${val}</textarea>
            <button class="ghost cell-format-btn" title="Format cell">✎</button>
          </div>`;
          
          // Restore saved formatting if it exists
          if (cellFormatting) {
            if (cellFormatting.fontFamily) td.dataset.fontFamily = cellFormatting.fontFamily;
            if (cellFormatting.fontSize) td.dataset.fontSize = cellFormatting.fontSize;
            if (cellFormatting.bold) td.dataset.bold = 'true';
            if (cellFormatting.italic) td.dataset.italic = 'true';
            if (cellFormatting.underline) td.dataset.underline = 'true';
            if (cellFormatting.align) td.dataset.align = cellFormatting.align;
            // Colors can be empty strings, check for undefined/null instead
            if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null) {
              td.dataset.cellFg = cellFormatting.fgColor;
            }
            if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null) {
              td.dataset.cellBg = cellFormatting.bgColor;
            }
            
            // Apply visual styles to textarea
            const textarea = td.querySelector('textarea');
            if (textarea && cellFormatting) {
              if (cellFormatting.fontFamily) textarea.style.fontFamily = cellFormatting.fontFamily;
              if (cellFormatting.fontSize) textarea.style.fontSize = cellFormatting.fontSize;
              if (cellFormatting.bold) textarea.style.fontWeight = 'bold';
              if (cellFormatting.italic) textarea.style.fontStyle = 'italic';
              if (cellFormatting.underline) textarea.style.textDecoration = 'underline';
              if (cellFormatting.align) textarea.style.textAlign = cellFormatting.align;
              // Apply colors with !important flag to override CSS
              if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                textarea.style.setProperty('color', cellFormatting.fgColor, 'important');
              }
              if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                textarea.style.setProperty('background-color', cellFormatting.bgColor, 'important');
              }
            }
          }
          
          // Add cell formatting
          const formatBtn = td.querySelector('.cell-format-btn');
          if (formatBtn) {
            buildFormattingPopover(formatBtn, td, 'cell');
          }
        } else if(col.type==='upload'){
          td.innerHTML=`<div class="uploadBox" data-ckey="${col.key}">
            <div class="u-actions"><button class="u-add">Upload</button><input class="u-file" type="file" multiple accept="image/*,video/*,audio/*" hidden></div>
            <div class="u-grid"></div></div>`;
          const ids=Array.isArray(val)?val:(typeof val==='string'&&val.startsWith('[')?JSON.parse(val):[]);
          td.dataset.vaultIds=JSON.stringify(ids); buildUploadUI(td,ids);
        } else if(col.type==='tags'){
          td.innerHTML=`<div class="tagsBox"><div class="tags-pills"></div><input class="tags-input" placeholder="Add tag and press Enter"><textarea class="cc-input tags-value" data-ckey="${col.key}" hidden>${val}</textarea></div>`;
          hydrateTagsBox(td,val);
        } else if(col.type==='separator'){
          // Separator column - show the configured character
          td.dataset.type = 'separator';
          if(col.removeBorders) {
            td.dataset.removeBorders = 'true';
            console.log(`Setting removeBorders=true on td for ${col.key}`);
          } else {
            delete td.dataset.removeBorders;
            console.log(`Removing removeBorders from td for ${col.key}`);
          }
          td.textContent = col.separatorChar || '—';
          console.log(`Creating separator cell for ${col.key}: char="${td.textContent}", removeBorders=${col.removeBorders}`);
          td.style.textAlign = 'center';
        } else { td.innerHTML=`<input class="cc-input" data-ckey="${col.key}" type="text" placeholder="${col.label||''}" value="${val}"/>`; }
        tr.appendChild(td);
        td.querySelector('.cc-input')?.addEventListener('input', persist);
      });
    }

    function buildUploadUI(td,ids){
      const box=td.querySelector('.uploadBox'); const btn=box.querySelector('.u-add'); const fileInput=box.querySelector('.u-file'); const grid=box.querySelector('.u-grid');
      
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
        
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length === 0) return;
        
        // Upload dropped files
        for(const f of files){ 
          const id = await vaultPut(f); 
          ids.push(id);
        } 
        td.dataset.vaultIds = JSON.stringify(ids); 
        persist(); 
        await refresh();
      });
      
      async function refresh(){
        grid.innerHTML='';
        for(const id of ids){
          try{
            const rec=await vaultGet(Number(id)); if(!rec) continue;
            const url=URL.createObjectURL(rec.data);
            const item=document.createElement('div'); item.className='u-item'; item.innerHTML=`<button class="u-del" title="Remove">✕</button>`;
            if(rec.type.startsWith('image/')){ const img=document.createElement('img'); img.src=url; img.className='u-thumb'; item.appendChild(img); }
            else if(rec.type.startsWith('video/')){ const vid=document.createElement('video'); vid.src=url; vid.controls=true; vid.className='u-thumb'; item.appendChild(vid); }
            else if(rec.type.startsWith('audio/')){ const aud=document.createElement('audio'); aud.src=url; aud.controls=true; aud.className='u-audio'; item.appendChild(aud); }
            else { const a=document.createElement('a'); a.href=url; a.textContent=rec.name; a.target='_blank'; item.appendChild(a); }
            item.querySelector('.u-del').addEventListener('click', ()=>{ const ix=ids.indexOf(id); if(ix>-1){ ids.splice(ix,1); td.dataset.vaultIds=JSON.stringify(ids); persist(); refresh(); } });
            grid.appendChild(item);
          }catch(e){}
        }
      }
      btn && btn.addEventListener('click', ()=> fileInput && fileInput.click());
      fileInput && fileInput.addEventListener('change', async e=>{ const files=Array.from(e.target.files||[]); for(const f of files){ const id=await vaultPut(f); ids.push(id);} td.dataset.vaultIds=JSON.stringify(ids); persist(); await refresh(); fileInput.value=''; });
      refresh();
    }

    function hydrateTagsBox(td,val){
      const box=td.querySelector('.tagsBox'); const pills=box.querySelector('.tags-pills'); const input=box.querySelector('.tags-input'); const value=box.querySelector('.tags-value');
      function render(arr){ pills.innerHTML=''; arr.forEach(tag=>{ const b=document.createElement('span'); b.className='tag-pill'; b.textContent=tag; const x=document.createElement('button'); x.textContent='×'; x.className='tag-x'; x.addEventListener('click', ()=>{ const left=arr.filter(t=>t!==tag); value.value=left.join(', '); render(left); persist(); }); b.appendChild(x); pills.appendChild(b); }); }
      function current(){ return value.value? value.value.split(',').map(s=>s.trim()).filter(Boolean):[]; }
      render(current()); input.addEventListener('keydown', e=>{ if(e.key==='Enter' && input.value.trim()){ const arr=current(); arr.push(input.value.trim()); value.value=Array.from(new Set(arr)).join(', '); input.value=''; render(current()); persist(); } });
    }

    // Rows
    function makeRow(rowData){
      const tr=document.createElement('tr'); tr.className='row'; tr.draggable=true;
      tr.dataset.type=rowData.type||'EVENT'; tr.dataset.id=rowData.id||uid();
      tr.dataset.anchorMode=rowData.anchorMode||(tr.dataset.type==='SUB'?'eventEnd':'start');
      tr.dataset.anchorId=rowData.anchorId||'';
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
      
      // Restore formatting properties
      if(rowData.fontFamily){ 
        tr.dataset.fontFamily=rowData.fontFamily; 
        tr.style.fontFamily=rowData.fontFamily;
      }
      if(rowData.fontSize){ 
        tr.dataset.fontSize=rowData.fontSize; 
        tr.style.fontSize=rowData.fontSize;
      }
      if(rowData.bold){ 
        tr.dataset.bold='true'; 
        tr.style.fontWeight='bold';
      }
      if(rowData.italic){ 
        tr.dataset.italic='true'; 
        tr.style.fontStyle='italic';
      }
      if(rowData.underline){ 
        tr.dataset.underline='true'; 
        tr.style.textDecoration='underline';
      }
      if(rowData.align){ 
        tr.dataset.align=rowData.align; 
        tr.style.textAlign=rowData.align;
      }

      const cells={}; const td=k=>{ const el=document.createElement('td'); el.dataset.key=k; return el; };
      cells.drag=td('drag'); cells.drag.className='drag'; cells.drag.textContent='⠿';
      cells.idx=td('idx'); cells.idx.className='idx';
      
      // For SUB-SCHEDULE and CALL TIME, leave start cell blank instead of dash
      cells.start=td('start'); cells.start.className='start ampm'; 
      if(tr.dataset.type==='EVENT') {
        cells.start.textContent='—';
      }
      
      cells.end=td('end'); cells.end.className='end ampm'; cells.end.textContent='—';
      cells.duration=td('duration');
      if(tr.dataset.type==='SUB'||tr.dataset.type==='CALL TIME'){
        cells.duration.innerHTML=`<input class="offset" type="number" step="5" min="-10080" max="10080" value="${Number(rowData.offset||0)||0}">`;
        cells.duration.querySelector('.offset').addEventListener('input', ()=>{ recalc(); persist(); });
      } else {
        cells.duration.innerHTML=`<input class="duration" type="number" min="0" step="5" value="${Number(rowData.duration)||0}">`;
        cells.duration.querySelector('.duration').addEventListener('input', ()=>{ recalc(); persist(); });
      }
      cells.type=td('type');
      if(tr.dataset.type==='SUB'){ cells.type.innerHTML=`<span class="badge">SUB-SCHEDULE</span>`; }
      else {
        cells.type.innerHTML=`<select class="type">
          <option value="EVENT"${tr.dataset.type==='EVENT'?' selected':''}>EVENT</option>
          <option value="CALL TIME"${tr.dataset.type==='CALL TIME'?' selected':''}>CALL TIME</option>
          <option value="SUB" disabled>SUB-SCHEDULE</option>
        </select>`;
        cells.type.querySelector('.type').addEventListener('change', e=>{ tr.dataset.type=e.target.value; recalc(); persist(); refreshAnchorSelectors(); });
      }
      cells.title=td('title');
      function formatButtonHTML(){ return `<button class="ghost formatBtn" title="Format text">✎</button>`; }

      if(tr.dataset.type==='CALL TIME'){
        const anchorMode=rowData.anchorMode||'start';
        cells.title.innerHTML=`<div class="titleWrap">
          <input class="title" value="${(rowData.title||'Call Time').replace(/"/g,'&quot;')}"/>
          <div class="anchorRow">
            <label>Anchor:</label>
            <select class="anchorMode">
              <option value="start"${anchorMode==='start'?' selected':''}>Schedule Start</option>
              <option value="eventStart"${anchorMode==='eventStart'?' selected':''}>Event Start</option>
              <option value="eventEnd"${anchorMode==='eventEnd'?' selected':''}>Event End</option>
            </select>
            <select class="anchorEvent" ${anchorMode==='start'?'disabled':''}></select>
          </div>
        </div>`;
        const modeSel=cells.title.querySelector('.anchorMode'), evtSel=cells.title.querySelector('.anchorEvent'), titleInput=cells.title.querySelector('.title');
        titleInput && titleInput.addEventListener('input', persist);
        modeSel && modeSel.addEventListener('change', ()=>{ tr.dataset.anchorMode=modeSel.value; evtSel && (evtSel.disabled=(modeSel.value==='start')); if(evtSel && evtSel.disabled) tr.dataset.anchorId=''; recalc(); persist(); refreshAnchorSelectors(); });
        evtSel && evtSel.addEventListener('change', ()=>{ tr.dataset.anchorId=evtSel.value||''; recalc(); persist(); });

        // Add format button to drag cell
        cells.drag.innerHTML = `⠿ <button class="ghost formatBtn" title="Format text" style="font-size:12px;padding:2px 4px;margin-left:2px;">✎</button>`;
        const formatBtn=cells.drag.querySelector('.formatBtn');
        formatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          buildCompactFormatPopover(formatBtn, tr, 'row');
        });
      } else if(tr.dataset.type==='SUB'){
        const anchorMode=rowData.anchorMode||'eventEnd'; 
        const computedColor = getComputedStyle(document.documentElement).getPropertyValue('--sub-bg').trim() || '#e2e8f0';
        const subColor=rowData.subColor||computedColor;
        cells.title.innerHTML=`<div class="titleWrap">
          <input class="title" value="${(rowData.title||'Sub-schedule').replace(/"/g,'&quot;')}"/>
          <div class="anchorRow subControls">
            <label>Anchor:</label>
            <select class="anchorMode">
              <option value="start"${anchorMode==='start'?' selected':''}>Schedule Start</option>
              <option value="eventStart"${anchorMode==='eventStart'?' selected':''}>Event Start</option>
              <option value="eventEnd"${anchorMode==='eventEnd'?' selected':''}>Event End</option>
            </select>
            <select class="anchorEvent" ${anchorMode==='start'?'disabled':''}></select>
            <button class="addSubEv">+ SUB-EVENT</button>
          </div>
        </div>`;
        const modeSel=cells.title.querySelector('.anchorMode'), evtSel=cells.title.querySelector('.anchorEvent'), addBtn=cells.title.querySelector('.addSubEv'), titleInput=cells.title.querySelector('.title');
        titleInput && titleInput.addEventListener('input', persist);
        modeSel && modeSel.addEventListener('change', ()=>{ tr.dataset.anchorMode=modeSel.value; evtSel && (evtSel.disabled=(modeSel.value==='start')); if(evtSel && evtSel.disabled) tr.dataset.anchorId=''; recalc(); persist(); refreshAnchorSelectors(); });
        evtSel && evtSel.addEventListener('change', ()=>{ tr.dataset.anchorId=evtSel.value||''; recalc(); persist(); });
        addBtn && addBtn.addEventListener('click', ()=>{
          const child={id:uid(), title:'Sub Event', duration:30};
          const subTr=makeSubChildRow(tr, child);
          let ref=tr; while(ref.nextElementSibling && ref.nextElementSibling.classList.contains('subchild') && ref.nextElementSibling.dataset.parent===tr.dataset.id){ ref=ref.nextElementSibling; }
          ref.after(subTr); applyRowBg(tr, subColor, true, false); persist(); renumber(); recalc();
        });
        
        // Add format button to drag cell
        cells.drag.innerHTML = `⠿ <button class="ghost formatBtn" title="Format text" style="font-size:12px;padding:2px 4px;margin-left:2px;">✎</button>`;
        const formatBtn=cells.drag.querySelector('.formatBtn');
        formatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          buildCompactFormatPopover(formatBtn, tr, 'row');
        });
        applyRowBg(tr, tr.dataset.subColor||subColor, true,false);
      } else {
        cells.title.innerHTML=`<div class="titleWrap">
          <input class="title" value="${(rowData.title||'New Event').replace(/"/g,'&quot;')}">
        </div>`;
        cells.title.querySelector('.title').addEventListener('input', ()=>{ persist(); refreshAnchorSelectors(); });
        
        // Add format button to drag cell
        cells.drag.innerHTML = `⠿ <button class="ghost formatBtn" title="Format text" style="font-size:12px;padding:2px 4px;margin-left:2px;">✎</button>`;
        const formatBtn=cells.drag.querySelector('.formatBtn');
        formatBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          buildCompactFormatPopover(formatBtn, tr, 'row');
        });
      }

      cells.actions=td('actions'); cells.actions.className='actions';
      cells.actions.innerHTML=`<button class="dup" title="Duplicate">⎘</button><button class="del" title="Delete">✕</button>`;
      cells.actions.querySelector('.dup').addEventListener('click', ()=>{
        const newRow = makeRow({
          id: uid(), type: tr.dataset.type, title: tr.querySelector('.title')?.value || '',
          duration: tr.querySelector('.duration')?.value ?? 0, offset: tr.querySelector('.offset')?.value ?? 0,
          anchorMode: tr.dataset.anchorMode, anchorId: tr.dataset.anchorId,
          subColor: tr.dataset.subColor || '', subFg: tr.dataset.subFg || '',
          rowBg: tr.dataset.rowBg || '', rowFg: tr.dataset.rowFg || '',
          custom: getRowCustomFromDOM(tr)
        });
        tr.after(newRow);
        applyColumnVisibilityToRow(newRow); // Apply current column visibility
        if(tr.dataset.type==='SUB'){
          const kids=collectChildren(tr);
          kids.forEach(k=>{
            const kidData={ id:uid(), title:k.querySelector('.subTitle').value, duration:k.querySelector('.subDur').value,
              subChildColor: k.dataset.subChildColor || '', subChildFg: k.dataset.subChildFg || '', custom: getRowCustomFromDOM(k) };
            const clone=makeSubChildRow(newRow, kidData); newRow.after(clone);
            applyColumnVisibilityToRow(clone); // Apply current column visibility to sub-children
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
      allCols.forEach(col => {
        if (col.key === 'drag') tr.appendChild(cells.drag);
        else if (col.key === 'idx') tr.appendChild(cells.idx);
        else if (col.key === 'start') tr.appendChild(cells.start);
        else if (col.key === 'end') tr.appendChild(cells.end);
        else if (col.key === 'duration') tr.appendChild(cells.duration);
        else if (col.key === 'type') tr.appendChild(cells.type);
        else if (col.key === 'title') tr.appendChild(cells.title);
        else if (col.key === 'actions') tr.appendChild(cells.actions);
        else {
          // Custom column - need to create it here inline
          const customCols = [col];
          customCols.forEach(c => {
            const td=document.createElement('td'); td.dataset.key=c.key;
            td.className = 'custom-cell';
            if(c.show===false) td.classList.add('col-hide');
            if(c.print===false) td.classList.add('col-print-hide');
            const cellData = ((rowData.custom||{})[c.key])||'';
            
            let val = '';
            let cellFormatting = null;
            if (typeof cellData === 'object' && cellData.value !== undefined) {
              val = cellData.value;
              cellFormatting = cellData.formatting;
            } else {
              val = cellData;
            }
            
            if(c.type==='separator'){
              td.dataset.type = 'separator';
              if(c.removeBorders) td.dataset.removeBorders = 'true';
              td.textContent = c.separatorChar || '—';
              td.style.textAlign = 'center';
            } else if(c.type==='text'){
              td.innerHTML=`<div class="cell-wrapper">
                <textarea class="cc-input" data-ckey="${c.key}" rows="2" placeholder="${c.label||''}">${val}</textarea>
                <button class="ghost cell-format-btn" title="Format cell">✎</button>
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
                
                const textarea = td.querySelector('textarea');
                if (textarea && cellFormatting) {
                  if (cellFormatting.fontFamily) textarea.style.fontFamily = cellFormatting.fontFamily;
                  if (cellFormatting.fontSize) textarea.style.fontSize = cellFormatting.fontSize;
                  if (cellFormatting.bold) textarea.style.fontWeight = 'bold';
                  if (cellFormatting.italic) textarea.style.fontStyle = 'italic';
                  if (cellFormatting.underline) textarea.style.textDecoration = 'underline';
                  if (cellFormatting.align) textarea.style.textAlign = cellFormatting.align;
                  if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                    textarea.style.setProperty('color', cellFormatting.fgColor, 'important');
                  }
                  if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                    textarea.style.setProperty('background-color', cellFormatting.bgColor, 'important');
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
              td.innerHTML=`<div class="tagsBox"><div class="tags-pills"></div><input class="tags-input" placeholder="Add tag and press Enter"><textarea class="cc-input tags-value" data-ckey="${c.key}" hidden>${val}</textarea></div>`;
              hydrateTagsBox(td,val);
            } else {
              td.innerHTML=`<input class="cc-input" data-ckey="${c.key}" type="text" placeholder="${c.label||''}" value="${val}"/>`;
              td.querySelector('.cc-input')?.addEventListener('input', persist);
            }
            tr.appendChild(td);
          });
        }
      });

      tr.addEventListener('dragstart', e=>{ beginAction();
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
        // Clear multi-drag
        if (tr._multiDrag) {
          tr._multiDrag.forEach(row => row.classList.remove('dragging'));
          tr._multiDrag = null;
        } else {
          tr.classList.remove('dragging');
        }
        
        if(tr.dataset.type==='SUB'&&Array.isArray(tr._dragKids)){ let ref=tr; tr._dragKids.forEach(k=>{ ref.after(k); k.classList.remove('attached'); ref=k; }); tr._dragKids=null; }
        persist(); recalc(); refreshAnchorSelectors();
      });
      
      // Add click handler for multi-select (on index cell to not interfere with inputs)
      // Multi-row selection on drag handle
      cells.drag.addEventListener('click', (e) => {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          toggleRowSelection(tr, e.shiftKey);
        }
      });
      cells.drag.style.cursor = 'pointer';
      cells.drag.title = 'Drag to reorder | Shift/Cmd+click to multi-select';

      if(rowData.type==='SUB' && Array.isArray(rowData.children)){ tr._pendingChildren=rowData.children.map(ch=> makeSubChildRow(tr, ch)); }
      tr.classList.toggle('subheader', tr.dataset.type==='SUB');
      return tr;
    }

    function makeSubChildRow(parentTr, child){
      const tr=document.createElement('tr'); tr.className='row subchild'; tr.dataset.parent=parentTr.dataset.id; tr.dataset.id=child.id; tr.draggable=true;
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
      
      // Restore formatting properties
      if(child.fontFamily){ 
        tr.dataset.fontFamily=child.fontFamily; 
        tr.style.fontFamily=child.fontFamily;
      }
      if(child.fontSize){ 
        tr.dataset.fontSize=child.fontSize; 
        tr.style.fontSize=child.fontSize;
      }
      if(child.bold){ 
        tr.dataset.bold='true'; 
        tr.style.fontWeight='bold';
      }
      if(child.italic){ 
        tr.dataset.italic='true'; 
        tr.style.fontStyle='italic';
      }
      if(child.underline){ 
        tr.dataset.underline='true'; 
        tr.style.textDecoration='underline';
      }
      if(child.align){ 
        tr.dataset.align=child.align; 
        tr.style.textAlign=child.align;
      }

      const td=k=>{ const el=document.createElement('td'); el.dataset.key=k; return el; };
      const cells={};
      cells.drag=td('drag'); cells.drag.className='drag'; cells.drag.title='Drag sub-event';
      cells.idx=td('idx'); cells.idx.className='idx';
      cells.start=td('start'); cells.start.className='start ampm'; cells.start.textContent='—';
      cells.end=td('end'); cells.end.className='end ampm'; cells.end.textContent='—';
      
      // Duration/Offset field - changes based on subType
      cells.duration=td('duration');
      const subType = child.subType || 'event';
      if(subType === 'call'){
        cells.duration.innerHTML=`<input class="subOffset" type="number" step="5" value="${Number(child.offset)||0}" placeholder="±min">`;
        cells.duration.querySelector('.subOffset').addEventListener('input', ()=>{ recalc(); persist(); });
      } else {
        cells.duration.innerHTML=`<input class="subDur" type="number" min="0" step="5" value="${Number(child.duration)||0}">`;
        cells.duration.querySelector('.subDur').addEventListener('input', ()=>{ recalc(); persist(); });
      }
      
      // Add type selector for sub-events
      cells.type=td('type'); 
      cells.type.innerHTML=`<select class="subType" style="font-size:11px;padding:2px 4px;background:#2f2a41;color:#d1c9ff;border:1px solid #3a3150;border-radius:6px;">
        <option value="event"${subType==='event'?' selected':''}>EVENT</option>
        <option value="call"${subType==='call'?' selected':''}>CALL TIME</option>
      </select>`;
      cells.type.querySelector('.subType').addEventListener('change', (e)=>{ 
        tr.dataset.subType=e.target.value;
        // Rebuild duration cell based on type
        const durationCell = tr.querySelector('td[data-key="duration"]');
        if(e.target.value === 'call'){
          const currentVal = durationCell.querySelector('.subDur')?.value || 0;
          durationCell.innerHTML=`<input class="subOffset" type="number" step="5" value="${currentVal}" placeholder="±min">`;
          durationCell.querySelector('.subOffset').addEventListener('input', ()=>{ recalc(); persist(); });
        } else {
          const currentVal = durationCell.querySelector('.subOffset')?.value || 0;
          durationCell.innerHTML=`<input class="subDur" type="number" min="0" step="5" value="${Math.abs(currentVal)}">`;
          durationCell.querySelector('.subDur').addEventListener('input', ()=>{ recalc(); persist(); });
        }
        recalc(); 
        persist(); 
      });
      
      cells.title=td('title');
      cells.title.innerHTML=`<div class="subTitleWrap">
        <input class="subTitle" value="${(child.title||'Sub Event').replace(/"/g,'&quot;')}">
      </div>`;
      
      // Add format button to drag cell
      cells.drag.innerHTML = `⋮⋮ <button class="ghost formatBtn" title="Format text" style="font-size:11px;padding:1px 3px;margin-left:2px;">✎</button>`;
      const formatBtn=cells.drag.querySelector('.formatBtn');
      formatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        buildCompactFormatPopover(formatBtn, tr, 'row');
      });

      cells.actions=td('actions'); cells.actions.className='actions'; cells.actions.innerHTML=`<button class="dup">⎘</button><button class="del">✕</button>`;
      cells.actions.querySelector('.dup').addEventListener('click', ()=>{
        const subType = tr.dataset.subType||'event';
        const childData = { 
          id:uid(), 
          title: cells['title'].querySelector('.subTitle').value, 
          subType: subType,
          subChildColor: tr.dataset.subChildColor||'', 
          subChildFg: tr.dataset.subChildFg||'', 
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
        renumber(); recalc(); persist();
      });
      cells.actions.querySelector('.del').addEventListener('click', ()=>{ tr.remove(); renumber(); recalc(); persist(); });

      // Append all cells in sorted column order
      const allCols = getAllColumnsSorted();
      allCols.forEach(col => {
        if (col.key === 'drag') tr.appendChild(cells.drag);
        else if (col.key === 'idx') tr.appendChild(cells.idx);
        else if (col.key === 'start') tr.appendChild(cells.start);
        else if (col.key === 'end') tr.appendChild(cells.end);
        else if (col.key === 'duration') tr.appendChild(cells.duration);
        else if (col.key === 'type') tr.appendChild(cells.type);
        else if (col.key === 'title') tr.appendChild(cells.title);
        else if (col.key === 'actions') tr.appendChild(cells.actions);
        else {
          // Custom column - need to create it here inline
          const customCols = [col];
          customCols.forEach(c => {
            const td=document.createElement('td'); td.dataset.key=c.key;
            td.className = 'custom-cell';
            if(c.show===false) td.classList.add('col-hide');
            if(c.print===false) td.classList.add('col-print-hide');
            const cellData = ((child.custom||{})[c.key])||'';
            
            let val = '';
            let cellFormatting = null;
            if (typeof cellData === 'object' && cellData.value !== undefined) {
              val = cellData.value;
              cellFormatting = cellData.formatting;
            } else {
              val = cellData;
            }
            
            if(c.type==='separator'){
              td.dataset.type = 'separator';
              if(c.removeBorders) td.dataset.removeBorders = 'true';
              td.textContent = c.separatorChar || '—';
              td.style.textAlign = 'center';
            } else if(c.type==='text'){
              td.innerHTML=`<div class="cell-wrapper">
                <textarea class="cc-input" data-ckey="${c.key}" rows="2" placeholder="${c.label||''}">${val}</textarea>
                <button class="ghost cell-format-btn" title="Format cell">✎</button>
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
                
                const textarea = td.querySelector('textarea');
                if (textarea && cellFormatting) {
                  if (cellFormatting.fontFamily) textarea.style.fontFamily = cellFormatting.fontFamily;
                  if (cellFormatting.fontSize) textarea.style.fontSize = cellFormatting.fontSize;
                  if (cellFormatting.bold) textarea.style.fontWeight = 'bold';
                  if (cellFormatting.italic) textarea.style.fontStyle = 'italic';
                  if (cellFormatting.underline) textarea.style.textDecoration = 'underline';
                  if (cellFormatting.align) textarea.style.textAlign = cellFormatting.align;
                  if (cellFormatting.fgColor !== undefined && cellFormatting.fgColor !== null && cellFormatting.fgColor !== '') {
                    textarea.style.setProperty('color', cellFormatting.fgColor, 'important');
                  }
                  if (cellFormatting.bgColor !== undefined && cellFormatting.bgColor !== null && cellFormatting.bgColor !== '') {
                    textarea.style.setProperty('background-color', cellFormatting.bgColor, 'important');
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
              td.innerHTML=`<div class="tagsBox"><div class="tags-pills"></div><input class="tags-input" placeholder="Add tag and press Enter"><textarea class="cc-input tags-value" data-ckey="${c.key}" hidden>${val}</textarea></div>`;
              hydrateTagsBox(td,val);
            } else {
              td.innerHTML=`<input class="cc-input" data-ckey="${c.key}" type="text" placeholder="${c.label||''}" value="${val}"/>`;
              td.querySelector('.cc-input')?.addEventListener('input', persist);
            }
            tr.appendChild(td);
          });
        }
      });

      tr.addEventListener('dragstart', e=>{ tr.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      tr.addEventListener('dragend', ()=>{ tr.classList.remove('dragging'); persist(); recalc(); });
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
            // Save value and formatting data
            out[col.key] = {
              value: input.value,
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
        const row={ id:tr.dataset.id, type:tr.dataset.type, title: tr.querySelector('.title')?.value || '', duration: tr.querySelector('.duration')?.value ?? 0, offset: tr.querySelector('.offset')?.value ?? 0, anchorMode: tr.dataset.anchorMode || 'start', anchorId: tr.dataset.anchorId || '', subColor: tr.dataset.subColor || '', subFg: tr.dataset.subFg || '', rowBg: tr.dataset.rowBg || '', rowFg: tr.dataset.rowFg || '', custom: getRowCustomFromDOM(tr), children: [] };
        if(tr.dataset.type==='SUB'){
          let next=tr.nextElementSibling;
          while(next && next.classList.contains('subchild') && next.dataset.parent===tr.dataset.id){
            rowsOut.push; // noop prevent linter
            const child={ id: next.dataset.id, title: next.querySelector('.subTitle').value, duration: next.querySelector('.subDur').value, subChildColor: next.dataset.subChildColor || '', subChildFg: next.dataset.subChildFg || '', custom: getRowCustomFromDOM(next) };
            row.children.push(child);
            next=next.nextElementSibling;
          }
        }
        rowsOut.push(row);
      });
      writeState({...s, rows: rowsOut}); rebuildUI();
    }

    function renumber(){ 
      let idx=0; 
      qsa('tbody tr').forEach(tr=>{ 
        const td=tr.querySelector('td[data-key="idx"]'); 
        if(!td) return; 
        if(tr.classList.contains('subchild')) {
          td.textContent='•';
        } else { 
          idx+=1; 
          td.textContent=idx;
          // Make row number inherit row text color (not background color)
          const rowFgColor = tr.dataset.rowFg || tr.dataset.subFg;
          if(rowFgColor) {
            td.style.color = rowFgColor;
          } else {
            td.style.color = '';
          }
        } 
      }); 
    }

    // Timeline
    function buildEventTimeline(){
      const rows=qsa('tbody tr'); const timeline={}; const base=toMinutes(readState().start || scheduleStart?.value || '08:00'); let cursor=base;
      rows.forEach(tr=>{ if(tr.dataset.type==='EVENT' && !tr.classList.contains('subchild')){ const dur=Number(tr.querySelector('.duration')?.value)||0; const id=tr.dataset.id; timeline[id]={start:cursor,end:cursor+dur,title:tr.querySelector('.title')?.value||'Untitled'}; cursor+=dur; } });
      return {timeline, base};
    }
    function recalc(){
      const {timeline, base}=buildEventTimeline();
      qsa('tbody tr').forEach(tr=>{
        const s=tr.querySelector('td[data-key="start"]'), e=tr.querySelector('td[data-key="end"]'); if(!s||!e) return;
        if(tr.dataset.type==='EVENT'){ const t=timeline[tr.dataset.id]; s.textContent=hhmmToAmPm(minutesToHHMM(t.start)); e.textContent=hhmmToAmPm(minutesToHHMM(t.end)); }
        else if(tr.dataset.type==='CALL TIME'){
  const mode   = tr.dataset.anchorMode || 'start';
  const offset = Number(tr.querySelector('.offset')?.value) || 0;
  let anchor = base;
  if (mode==='eventStart' || mode==='eventEnd') {
    const t = timeline[tr.dataset.anchorId];
    if (t) anchor = (mode==='eventStart' ? t.start : t.end);
  }
  const timeText = hhmmToAmPm(minutesToHHMM(anchor + offset));
  
  // If END column is hidden, show time in START cell; otherwise leave START blank
  const endColHidden = e.classList.contains('col-hide') || e.style.display === 'none';
  s.textContent = endColHidden ? timeText : '';
  e.textContent = timeText;
}
        else if(tr.dataset.type==='SUB'){ 
          const mode=tr.dataset.anchorMode||'eventEnd'; 
          const anchorId=tr.dataset.anchorId||''; 
          const offset=Number(tr.querySelector('.offset')?.value)||0; 
          let anchor=base; 
          if(mode==='eventStart' && timeline[anchorId]) anchor=timeline[anchorId].start; 
          if(mode==='eventEnd' && timeline[anchorId]) anchor=timeline[anchorId].end; 
          const timeText = hhmmToAmPm(minutesToHHMM(anchor+offset));
          
          // If END column is hidden, show time in START cell; otherwise leave START blank
          const endColHidden = e.classList.contains('col-hide') || e.style.display === 'none';
          s.textContent = endColHidden ? timeText : '';
          e.textContent = timeText; 
          
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
              const callTimeText = hhmmToAmPm(minutesToHHMM(subCursor+callOffset));
              const endColHidden = eCell && (eCell.classList.contains('col-hide') || eCell.style.display === 'none');
              sCell && (sCell.textContent = endColHidden ? callTimeText : ''); 
              eCell && (eCell.textContent = callTimeText);
              // Don't advance cursor for call times
            } else {
              // Regular event: adds duration
              const dur=Number(next.querySelector('.subDur')?.value)||0;
              if(dur===0){
                sCell && (sCell.textContent='—'); 
                eCell && (eCell.textContent=hhmmToAmPm(minutesToHHMM(subCursor)));
              } else {
                sCell && (sCell.textContent=hhmmToAmPm(minutesToHHMM(subCursor))); 
                eCell && (eCell.textContent=hhmmToAmPm(minutesToHHMM(subCursor+dur))); 
                subCursor+=dur;
              }
            }
            next=next.nextElementSibling; 
          } 
        }
      });
    }

    function refreshAnchorSelectors(){
      const events=qsa('tbody tr').filter(tr=> tr.dataset.type==='EVENT' && !tr.classList.contains('subchild')).map(tr=>({ id:tr.dataset.id, label:`Row ${tr.querySelector('td[data-key="idx"]').textContent.trim()}` }));
      qsa('tbody tr').forEach(tr=>{
        if(tr.dataset.type!=='SUB' && tr.dataset.type!=='CALL TIME') return;
        const modeSel=tr.querySelector('.anchorMode'); const evtSel=tr.querySelector('.anchorEvent'); if(!evtSel||!modeSel) return;
        const current=tr.dataset.anchorId || '';
        evtSel.innerHTML = `<option value="">— Select event —</option>` + events.map(o=>`<option value="${o.id}" ${o.id===current?'selected':''}>${o.label}</option>`).join('');
        evtSel.disabled = (modeSel.value==='start');
      });
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
        renumber(); recalc(); refreshAnchorSelectors();
        return;
      }
      
      if(dragging.classList.contains('subchild')){
        const parentId=dragging.dataset.parent;
        const siblings=qsa(`tbody tr.subchild[data-parent="${parentId}"]:not(.dragging)`);
        const after=calcAfter(siblings, e.clientY);
        if(after==null){ let ref=qs(`tbody tr.row[data-id="${parentId}"]`); if(!ref) return; while(ref.nextElementSibling && ref.nextElementSibling.classList.contains('subchild') && ref.nextElementSibling.dataset.parent===parentId){ ref=ref.nextElementSibling; } ref.after(dragging); }
        else { after.before(dragging); }
        recalc(); return;
      }
      const candidates=qsa('tbody tr:not(.dragging):not(.subchild)');
      const afterEl=calcAfter(candidates, e.clientY);
      if(afterEl==null) tbody.appendChild(dragging); else tbody.insertBefore(dragging, afterEl);
      if(dragging.dataset.type==='SUB' && Array.isArray(dragging._dragKids)){ let ref=dragging; dragging._dragKids.forEach(k=>{ ref.after(k); ref=k; }); }
      renumber(); recalc(); refreshAnchorSelectors();
    });
    function calcAfter(list,y){ let closest={offset:-Infinity,element:null}; list.forEach(el=>{ const box=el.getBoundingClientRect(); const offset=y-box.top-box.height/2; if(offset<0 && offset>closest.offset){ closest={offset,element:el}; } }); return closest.element; }

    function persist(){
      // Skip persist if we're in the middle of loading a file
      if (window.__LOADING_FILE__) {
        console.log('⚠️ Skipping persist during file load');
        return;
      }
      // Save current day data
      saveDayData();
    }

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
            scheduleStart: data.start || '08:00',
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
      
      Object.keys(colVisState).forEach(key => {
        if (!colVisState[key]) {
          const cell = row.querySelector(`td[data-key="${key}"]`);
          if (cell) {
            cell.style.visibility = 'collapse';
          }
        }
      });
    }
    
    function applySavedColumnVisibility() {
      const colVisState = JSON.parse(localStorage.getItem('columnVisibility') || '{}');
      
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
      
      // Open print settings modal
      const modal = document.getElementById('printColModal');
      
      // Set image height
      const imageHeightInput = document.getElementById('pdfImageHeight');
      if (imageHeightInput) {
        imageHeightInput.value = savedImageHeight;
      }
      
      // Set paper size and orientation
      const paperSizeSelect = document.getElementById('pdfPaperSize');
      const orientationSelect = document.getElementById('pdfOrientation');
      if (paperSizeSelect) paperSizeSelect.value = savedPaperSize;
      if (orientationSelect) orientationSelect.value = savedOrientation;
      
      modal.style.display = 'flex';
    });
    
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

    async function buildCompleteHTML() {
      console.log('📄 Building PDF HTML with selective extraction...');
      
      // Helper to escape font-family for HTML attributes (replace " with ')
      const escapeFontFamily = (ff) => ff.replace(/"/g, "'");
      
      const metaTitle = document.getElementById('metaTitle')?.value || '';
      const metaVersion = document.getElementById('metaVersion')?.value || '';
      const metaDate = document.getElementById('metaDate')?.value || '';
      const metaDow = document.getElementById('metaDow')?.value || '';
      const metaX = document.getElementById('metaX')?.value || '';
      const metaY = document.getElementById('metaY')?.value || '';
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
      
      // Calculate total table width from visible columns
      let totalTableWidth = 0;
      cols.forEach(col => {
        const key = col.dataset.key;
        if (key === 'actions') return;
        // Skip columns not in print selection
        if (window.selectedPrintColumns && window.selectedPrintColumns.length > 0 && !window.selectedPrintColumns.includes(key) && key !== 'drag') return;
        
        const widthStr = col.style.width || '100px';
        const width = parseInt(widthStr);
        if (!isNaN(width)) {
          totalTableWidth += width;
        }
      });
      
      console.log('✓ Total table width for PDF:', totalTableWidth + 'px');
      
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
      const metaDisplay = hasHeader ? '' : `${metaTitle} v.${metaVersion} • ${metaDate} ${metaDow} • Day ${metaX} of ${metaY}`;
      
      // Build clean colgroup
      let colGroupHTML = '<colgroup>';
      cols.forEach(col => {
        const key = col.dataset.key;
        const width = col.style.width || '';
        
        if (key === 'drag') {
          // Replace drag with idx column - keep same width
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes('idx')) {
            colGroupHTML += `<col data-key="idx" style="width: ${width}">`;
          }
        } else if (col.dataset.type === 'separator') {
          // Separator columns - include if in print selection
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            const removeBorders = col.dataset.removeBorders === 'true';
            colGroupHTML += `<col data-key="${key}" data-type="separator"${removeBorders ? ' data-remove-borders="true"' : ''} style="width: ${width}">`;
          }
        } else if (key !== 'actions' && key !== 'idx') {
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            colGroupHTML += `<col data-key="${key}" style="width: ${width}">`;
          }
        }
      });
      colGroupHTML += '</colgroup>';
      
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
        const borderRadius = isFirst ? 'border-radius: 8pt 0 0 0; ' : (isLast ? 'border-radius: 0 8pt 0 0; ' : '');
        
        if (key === 'drag') {
          // Include index column header but rename it to just the number symbol
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes('idx')) {
            const idxBorderStyle = isLast ? 'border: 1pt solid #666;' : 'border: 1pt solid #666; border-right: none;';
            tableHeaderHTML += `<th style="background: #ddd; color: #000; font-weight: 700; font-size: 7pt !important; padding: 4pt; ${idxBorderStyle} text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; ${borderRadius}">#</th>`;
            headerIndex++;
          }
        } else if (th.dataset.type === 'separator') {
          // Separator column header - include if in print selection
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            const removeBorders = th.dataset.removeBorders === 'true';
            const borderStyle = removeBorders ? 'border-top: 1pt solid #666 !important; border-bottom: 1pt solid #666 !important; border-left: none !important; border-right: none !important;' : 'border: 1pt solid #666;';
            tableHeaderHTML += `<th data-type="separator"${removeBorders ? ' data-remove-borders="true"' : ''} style="background: #ddd; color: #000; font-weight: 700; font-size: 7pt !important; padding: 0; ${borderStyle} text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; ${borderRadius}">${th.textContent.trim() || ''}</th>`;
            headerIndex++;
          }        } else if (key !== 'actions' && key !== 'idx') {
          if (!window.selectedPrintColumns || window.selectedPrintColumns.length === 0 || window.selectedPrintColumns.includes(key)) {
            // Clone the th and remove all UI elements (buttons, etc.)
            const clone = th.cloneNode(true);
            const uiElements = clone.querySelectorAll('button, .col-resize-grip, svg, .icon');
            uiElements.forEach(el => el.remove());
            const text = clone.textContent.trim();
            
            // Center align time-related headers
            let align = 'left';
            if (key === 'start' || key === 'end' || key === 'duration' || key === 'type') {
              align = 'center';
            }
            
            // Special border handling for START, END, plus remove double borders
            let borderStyle = 'border: 1pt solid #666;';
            if (key === 'start') {
              borderStyle = 'border-top: 1pt solid #666; border-bottom: 1pt solid #666; border-left: 1pt solid #666; border-right: none;';
            } else if (key === 'end') {
              // END removes both left and right borders (adjacent to dash on right)
              borderStyle = 'border-top: 1pt solid #666; border-bottom: 1pt solid #666; border-left: none; border-right: none;';
            } else if (key === 'duration' && !isLast) {
              // DUR keeps left border but removes right (unless it's the last column)
              borderStyle = 'border: 1pt solid #666; border-right: none;';
            } else if (!isLast) {
              // Remove right border for all other headers except the last one to avoid double borders
              borderStyle = 'border: 1pt solid #666; border-right: none;';
            }
            
            tableHeaderHTML += `<th style="background: #ddd; color: #000; font-weight: 700; font-size: 7pt !important; padding: 4pt; ${borderStyle} text-align: ${align}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; ${borderRadius}">${text}</th>`;
            headerIndex++;
          }
        }
      });
      tableHeaderHTML += '</tr></thead>';
      
      // Build clean body rows
      console.log('📋 Extracting table data...');
      let bodyHTML = '<tbody>';
      const rows = Array.from(tbody.querySelectorAll('tr'));
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const isLastRow = (rowIndex === rows.length - 1);
        const rowType = row.dataset.type;
        const isSubchild = row.classList.contains('subchild');
        
        // Get row colors - ONLY use dataset for backgrounds (to avoid dark theme), but allow computed for text
        let rowBgColor = '';
        let rowFgColor = '';
        
        // Background: strictly from dataset only
        if (isSubchild) {
          rowBgColor = row.dataset.subChildColor || '';
        } else if (rowType === 'SUB') {
          rowBgColor = row.dataset.subColor || '';
        } else {
          rowBgColor = row.dataset.rowBg || '';
        }
        
        // Foreground: dataset first, then computed
        if (isSubchild) {
          rowFgColor = row.dataset.subChildFg || '';
        } else if (rowType === 'SUB') {
          rowFgColor = row.dataset.subFg || '';
        } else {
          rowFgColor = row.dataset.rowFg || '';
        }
        
        // If no dataset foreground color, use computed (for better text visibility)
        if (!rowFgColor) {
          const computed = window.getComputedStyle(row);
          rowFgColor = computed.color || '';
        }
        
        // Extract row-level text formatting from dataset
        const rowFontFamily = row.dataset.fontFamily || '';
        const rowFontSize = row.dataset.fontSize || '';
        const rowBold = row.dataset.bold === 'true';
        const rowItalic = row.dataset.italic === 'true';
        const rowUnderline = row.dataset.underline === 'true';
        const rowAlign = row.dataset.align || '';
        
        const rowClass = row.className || '';
        let rowStyle = '';
        if (rowBgColor) rowStyle += `background-color: ${rowBgColor}; `;
        if (rowFgColor) rowStyle += `color: ${rowFgColor}; `;
        if (rowFontFamily) rowStyle += `font-family: ${escapeFontFamily(rowFontFamily)}; `;
        if (rowFontSize) rowStyle += `font-size: ${rowFontSize}; `;
        if (rowBold) rowStyle += `font-weight: bold; `;
        if (rowItalic) rowStyle += `font-style: italic; `;
        if (rowUnderline) rowStyle += `text-decoration: underline; `;
        if (rowAlign) rowStyle += `text-align: ${rowAlign}; `;
        
        // Debug log first few rows
        if (rowIndex < 3) {
          console.log(`Row ${rowIndex}: bg=${rowBgColor}, fg=${rowFgColor}, font=${rowFontFamily}, style="${rowStyle}"`);
        }
        
        bodyHTML += `<tr class="${rowClass}" ${rowStyle ? `style="${rowStyle}"` : ''}>`;
        
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
            
            // Find the idx cell in this row and extract its number
            const idxCell = row.querySelector('td[data-key="idx"]');
            cellContent = idxCell ? idxCell.textContent.trim() : '';
            
            // Add styling for idx column, including corner radius for last row
            let idxStyle = 'border: 1pt solid #666 !important; border-right: none !important; text-align: center; vertical-align: middle; padding: 3pt 4pt !important;';
            if (isLastRow) {
              idxStyle += ' border-bottom-left-radius: 8pt !important;';
            }
            
            bodyHTML += `<td style="${idxStyle}">${cellContent}</td>`;
            continue;
          }
          
          // Check for images first
          const images = Array.from(cell.querySelectorAll('img'));
          if (images.length > 0) {
            cellContent = '<div class="cell-media">';
            for (const img of images) {
              let imgSrc = img.src;
              if (imgSrc.startsWith('blob:')) {
                try {
                  imgSrc = await blobToDataURL(imgSrc);
                } catch (e) {
                  console.warn('Failed to convert image:', e);
                  continue;
                }
              }
              cellContent += `<img src="${imgSrc}">`;
            }
            cellContent += '</div>';
          } else {
            // Handle EVENT column (title) specially to avoid anchor UI
            if (key === 'title') {
              const titleInput = cell.querySelector('input.title');
              if (titleInput) {
                cellContent = titleInput.value || '';
                
                // Cell colors: dataset ONLY for backgrounds, computed OK for foreground
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
                } else if (titleInput.style.backgroundColor) {
                  // Check inline style directly (not computed) for title backgrounds
                  cellBgStyle += `background-color: ${titleInput.style.backgroundColor} !important; `;
                }
                
                // Extract ALL visual properties from the input for PDF
                const computedStyle = window.getComputedStyle(titleInput);
                const fontSize = computedStyle.fontSize;
                const fontFamily = computedStyle.fontFamily;
                const fontWeight = computedStyle.fontWeight;
                const fontStyle = computedStyle.fontStyle;
                const textDecoration = computedStyle.textDecoration;
                const textAlign = computedStyle.textAlign;
                
                // Extract border properties
                const borderRadius = computedStyle.borderRadius;
                const borderColor = computedStyle.borderColor;
                const borderWidth = computedStyle.borderWidth;
                const borderStyle = computedStyle.borderStyle;
                
                // Extract background from computed style as final fallback
                if (!cellBg && !titleInput.style.backgroundColor) {
                  const bgColor = computedStyle.backgroundColor;
                  // Exclude white, transparent, and default theme backgrounds (#0f1217 dark, #ffffff light)
                  if (bgColor && 
                      bgColor !== 'rgba(0, 0, 0, 0)' && 
                      bgColor !== 'transparent' && 
                      bgColor !== 'rgb(255, 255, 255)' &&
                      bgColor !== 'rgb(15, 18, 23)' &&  // #0f1217 dark theme
                      bgColor !== 'rgb(11, 15, 21)') {  // #0b0f15 darker variant
                    cellBgStyle += `background-color: ${bgColor} !important; `;
                  }
                }
                
                // Apply font properties (without minimum threshold to catch all formatting)
                if (fontSize) {
                  cellTextStyle += `font-size: ${fontSize} !important; `;
                }
                if (fontFamily && fontFamily !== 'inherit') {
                  cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                }
                if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
                  cellTextStyle += `font-weight: ${fontWeight} !important; `;
                }
                if (fontStyle && fontStyle !== 'normal') {
                  cellTextStyle += `font-style: ${fontStyle} !important; `;
                }
                if (textDecoration && textDecoration !== 'none' && !textDecoration.includes('none')) {
                  cellTextStyle += `text-decoration: ${textDecoration} !important; `;
                }
                if (textAlign && textAlign !== 'left') {
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
            else {
              const input = cell.querySelector('input:not([type="color"]), textarea, select');
              if (input) {
                // For SUB-SCHEDULE and CALL TIME rows, skip the duration/offset field
                if (key === 'duration' && (rowType === 'SUB' || rowType === 'CALL TIME')) {
                  cellContent = '';
                } else {
                  cellContent = input.value || '';
                  
                  // Cell colors: dataset ONLY for backgrounds, computed OK for foreground
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
                  } else if (input.style.backgroundColor) {
                    // Check inline style directly (not computed) for textarea backgrounds
                    cellBgStyle += `background-color: ${input.style.backgroundColor} !important; `;
                  }
                  
                  // Extract visual properties from the input/textarea (for fonts) and cell (for backgrounds)
                  const cellStyle = window.getComputedStyle(cell);
                  const inputStyle = window.getComputedStyle(input);
                  
                  const fontSize = inputStyle.fontSize;
                  const fontFamily = inputStyle.fontFamily;
                  const fontWeight = inputStyle.fontWeight;
                  const fontStyle = inputStyle.fontStyle;
                  const textDecoration = inputStyle.textDecoration;
                  const textAlign = inputStyle.textAlign;
                  
                  // Extract border properties from input
                  const borderRadius = inputStyle.borderRadius;
                  const borderColor = inputStyle.borderColor;
                  const borderWidth = inputStyle.borderWidth;
                  const borderStyle = inputStyle.borderStyle;
                  
                  // Extract background from computed style as final fallback
                  if (!cellBg && !input.style.backgroundColor) {
                    const bgColor = inputStyle.backgroundColor;
                    // Exclude white, transparent, and default theme backgrounds (#0f1217 dark, #ffffff light)
                    if (bgColor && 
                        bgColor !== 'rgba(0, 0, 0, 0)' && 
                        bgColor !== 'transparent' && 
                        bgColor !== 'rgb(255, 255, 255)' &&
                        bgColor !== 'rgb(15, 18, 23)' &&  // #0f1217 dark theme
                        bgColor !== 'rgb(11, 15, 21)') {  // #0b0f15 darker variant
                      cellBgStyle += `background-color: ${bgColor} !important; `;
                    }
                  }
                  
                  // Apply font properties
                  if (fontSize) {
                    cellTextStyle += `font-size: ${fontSize} !important; `;
                  }
                  if (fontFamily && fontFamily !== 'inherit') {
                    cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                  }
                  if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
                    cellTextStyle += `font-weight: ${fontWeight} !important; `;
                  }
                  if (fontStyle && fontStyle !== 'normal') {
                    cellTextStyle += `font-style: ${fontStyle} !important; `;
                  }
                  if (textDecoration && textDecoration !== 'none' && !textDecoration.includes('none')) {
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
              } else {
                // Special handling for separator columns
                if (cell.dataset.type === 'separator') {
                  cellContent = cell.textContent.trim() || '—'; // Use cell content or default dash
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
                  const textAlign = computedStyle.textAlign;
                  
                  // Apply styles
                  if (fontSize) {
                    cellTextStyle += `font-size: ${fontSize} !important; `;
                  }
                  if (fontFamily && fontFamily !== 'inherit') {
                    cellTextStyle += `font-family: ${escapeFontFamily(fontFamily)} !important; `;
                  }
                  if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
                    cellTextStyle += `font-weight: ${fontWeight} !important; `;
                  }
                  if (fontStyle && fontStyle !== 'normal') {
                    cellTextStyle += `font-style: ${fontStyle} !important; `;
                  }
                  if (textAlign && textAlign !== 'left') {
                    cellTextStyle += `text-align: ${textAlign} !important; `;
                  }
                  
                  // Get colors
                  const cellFg = cell.dataset.cellFg;
                  const cellBg = cell.dataset.cellBg;
                  
                  if (cellFg) {
                    cellTextStyle += `color: ${cellFg} !important; `;
                  } else {
                    const computedFg = computedStyle.color;
                    if (computedFg && computedFg !== 'rgba(0, 0, 0, 0)') {
                      cellTextStyle += `color: ${computedFg} !important; `;
                    }
                  }
                  
                  if (cellBg) {
                    cellBgStyle += `background-color: ${cellBg} !important; `;
                  }
                }
              }
            }
          }
          
          
          // Debug log first row's cells
          if (rowIndex === 1 && (cellTextStyle || cellBgStyle)) {
            console.log(`Row 1, Cell ${key}: textStyle="${cellTextStyle}" bgStyle="${cellBgStyle}"`);
          }
          
          // Combine row background with cell background
          let tdStyle = '';
          let spanBgStyle = '';
          
          // Determine which background to use - cell takes precedence over row
          if (cellBgStyle) {
            spanBgStyle = cellBgStyle;
          } else if (rowBgColor) {
            spanBgStyle = `background-color: ${rowBgColor}; `;
          }
          
          // Special handling for separator columns
          if (cell.dataset.type === 'separator') {
            // Inherit row background and text color
            const rowBg = row.style.backgroundColor || rowBgColor || '#ffffff';
            const rowColor = row.style.color || rowFgColor || '#000000';
            const removeBorders = cell.dataset.removeBorders === 'true';
            
            // Inherit row formatting properties
            let separatorStyle = `text-align: center !important; padding: 6pt 1pt !important; vertical-align: middle !important; white-space: nowrap !important; line-height: 1 !important; `;
            
            // Background
            if (rowBg) separatorStyle += `background-color: ${rowBg} !important; `;
            
            // Text color - inherit from row
            if (rowColor) separatorStyle += `color: ${rowColor} !important; `;
            
            // Font properties - inherit from row
            if (rowFontFamily) separatorStyle += `font-family: ${rowFontFamily} !important; `;
            else separatorStyle += `font-family: Arial, sans-serif !important; `;
            
            if (rowFontSize) separatorStyle += `font-size: ${rowFontSize} !important; `;
            else separatorStyle += `font-size: 10pt !important; `;
            
            if (rowBold) separatorStyle += `font-weight: bold !important; `;
            else separatorStyle += `font-weight: normal !important; `;
            
            if (rowItalic) separatorStyle += `font-style: italic !important; `;
            if (rowUnderline) separatorStyle += `text-decoration: underline !important; `;
            
            // Borders
            if (removeBorders) {
              separatorStyle += `border-left: none !important; border-right: none !important; border-top: 1pt solid #666 !important; border-bottom: 1pt solid #666 !important; `;
            } else {
              separatorStyle += `border: 1pt solid #666 !important; `;
            }
            
            tdStyle += separatorStyle;
          } else {
            // Add borders - all cells get full borders now with border-spacing: 0
            // ADD PADDING DIRECTLY TO TD for proper text indentation
            
            // Determine if this is first or last cell in the row
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
            
            // Base borders - all rows get full borders for page break handling
            tdStyle += `border: 1pt solid #666 !important; vertical-align: ${key === 'start' || key === 'end' || key === 'duration' ? 'middle' : 'top'}; `;
            
            // Check if adjacent to a separator column with removeBorders
            const allCells = Array.from(row.querySelectorAll('td'));
            const thisCellIndex = allCells.indexOf(cell);
            const prevCell = thisCellIndex > 0 ? allCells[thisCellIndex - 1] : null;
            const nextCell = thisCellIndex < allCells.length - 1 ? allCells[thisCellIndex + 1] : null;
            
            // Remove borders adjacent to separators with removeBorders=true
            if (nextCell && nextCell.dataset.type === 'separator' && nextCell.dataset.removeBorders === 'true') {
              tdStyle += `border-right: none !important; `;
            }
            if (prevCell && prevCell.dataset.type === 'separator' && prevCell.dataset.removeBorders === 'true') {
              tdStyle += `border-left: none !important; `;
            }
            
            // Add padding directly to TD - significant indentation for text columns
            const isTimeColumn = (key === 'start' || key === 'end' || key === 'duration' || key === 'type');
            if (isTimeColumn) {
              tdStyle += `padding: 3pt 4pt !important; `;
            } else {
              tdStyle += `padding: 3pt 5pt 3pt 8pt !important; `;
            }
            
            // Remove double borders between cells
            if (!isLastCell && key !== 'start' && !(nextCell && nextCell.dataset.type === 'separator')) {
              tdStyle += `border-right: none !important; `;
            }
            
            // Add bottom rounded corners to last row
            if (isLastRow && isFirstCell) {
              tdStyle += `border-bottom-left-radius: 8pt !important; `;
            }
            if (isLastRow && isLastCell) {
              tdStyle += `border-bottom-right-radius: 8pt !important; `;
            }
            
            // Add text alignment based on column type
            if (key === 'start' || key === 'end' || key === 'duration') {
              tdStyle += `text-align: center; white-space: nowrap; `;
            } else if (key === 'type') {
              tdStyle += `text-align: center; white-space: nowrap; `;
            } else {
              tdStyle += `text-align: left; word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; `;
            }
          }
          
          // Wrap content in span with text styles for better PDF rendering
          // EXCEPT for separator column which should be rendered directly
          if (cell.dataset.type === 'separator') {
            // Use content from cell or default dash
            const sepContent = cellContent || '&mdash;';
            const removeBorders = cell.dataset.removeBorders === 'true' ? ' data-remove-borders="true"' : '';
            bodyHTML += `<td data-type="separator"${removeBorders} style="${tdStyle}">${sepContent}</td>`;
          } else if (cellTextStyle || spanBgStyle) {
            // Move background to span
            let spanStyle = cellTextStyle;
            
            // Add background to span
            if (spanBgStyle) {
              spanStyle += spanBgStyle;
            }
            
            // Make span display block to fill width, with padding for full background coverage
            spanStyle += ' display: block; ';
            
            // If border-radius is present, add overflow hidden
            if (spanStyle.includes('border-radius')) {
              spanStyle += ' overflow: hidden; ';
            }
            
            // Add indent to text columns (not time columns) - REMOVED since padding is now on TD
            
            bodyHTML += `<td style="${tdStyle}"><span style="${spanStyle}">${cellContent}</span></td>`;
            
            // Debug: log first content cell to verify TD padding
            if (cellContent && !window._firstContentLogged && key !== 'drag' && cell.dataset.type !== 'separator') {
              console.log(`📝 First content cell (${key}) TD style:`, tdStyle);
              window._firstContentLogged = true;
            }
          } else {
            // No custom text formatting - simple span without padding (TD has padding)
            let spanStyle = `font-size: 9pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; display: block; `;
            
            // Add background to span
            if (spanBgStyle) {
              spanStyle += spanBgStyle;
            }
            
            bodyHTML += `<td style="${tdStyle}"><span style="${spanStyle}">${cellContent}</span></td>`;
            
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
  </style>
</head>
<body>
  ${headerHTML}
  ${metaDisplay ? `<div class="print-meta">${metaDisplay}</div>` : ''}
  <div>
    <table style="border-collapse: separate; border-spacing: 0; table-layout: fixed; width: ${totalTableWidth}px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
      ${colGroupHTML}
      ${tableHeaderHTML}
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

    addRowBtn && addRowBtn.addEventListener('click', ()=>{ 
      const newRow = makeRow({ id:uid(), type:'EVENT', title:'New Event', duration:30, custom:{} });
      tbody.appendChild(newRow); 
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors(); 
    });
    addCallBtn && addCallBtn.addEventListener('click', ()=>{ 
      const newRow = makeRow({ id:uid(), type:'CALL TIME', title:'Call Time', offset:0, anchorMode:'start', anchorId:'', custom:{} });
      tbody.appendChild(newRow); 
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors(); 
    });
    addSubBtn && addSubBtn.addEventListener('click', ()=>{
      const header=makeRow({ id:uid(), type:'SUB', title:'Sub-schedule', offset:0, anchorMode:'eventEnd', anchorId:'', subColor:'', custom:{}, children:[{id:uid(), title:'Sub Event', duration:30, custom:{}}] });
      tbody.appendChild(header);
      applyColumnVisibilityToRow(header);
      if(header._pendingChildren){ 
        header._pendingChildren.forEach(child => applyColumnVisibilityToRow(child));
        header.after(...header._pendingChildren); 
        delete header._pendingChildren; 
      }
      renumber(); recalc(); persist(); refreshAnchorSelectors();
    });

    // === Floating Action Button ===
    const fab = document.getElementById('fab');
    const fabMenu = document.getElementById('fabMenu');
    const fabAddEvent = document.getElementById('fabAddEvent');
    const fabAddCall = document.getElementById('fabAddCall');
    const fabAddSub = document.getElementById('fabAddSub');
    
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
      const newRow = makeRow({ id:uid(), type:'EVENT', title:'New Event', duration:30, custom:{} });
      tbody.appendChild(newRow);
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddCall && fabAddCall.addEventListener('click', () => {
      const newRow = makeRow({ id:uid(), type:'CALL TIME', title:'Call Time', offset:0, anchorMode:'start', anchorId:'', custom:{} });
      tbody.appendChild(newRow);
      applyColumnVisibilityToRow(newRow);
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddSub && fabAddSub.addEventListener('click', () => {
      const header=makeRow({ id:uid(), type:'SUB', title:'Sub-schedule', offset:0, anchorMode:'eventEnd', anchorId:'', subColor:'', custom:{}, children:[{id:uid(), title:'Sub Event', duration:30, custom:{}}] });
      tbody.appendChild(header);
      applyColumnVisibilityToRow(header);
      if(header._pendingChildren){ 
        header._pendingChildren.forEach(child => applyColumnVisibilityToRow(child));
        header.after(...header._pendingChildren); 
        delete header._pendingChildren; 
      }
      renumber(); recalc(); persist(); refreshAnchorSelectors();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    // Add Day button
    const fabAddDay = document.getElementById('fabAddDay');
    fabAddDay && fabAddDay.addEventListener('click', () => {
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
      
      const choice = confirm('Would you like to duplicate the current day\'s schedule?\n\nOK = Duplicate schedule\nCancel = Start with blank day (one event)');
      saveDayData(); // Save current day first
      addNewDay(choice);
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
      
      const rows = [
        {id:uid(),type:'EVENT',title:'SET UP',duration:45, custom:{}},
        {id:uid(),type:'EVENT',title:'REHEARSE',duration:30, custom:{}},
        {id:uid(),type:'SUB', title:'Talent Prep', offset:-30, anchorMode:'eventEnd', anchorId:'', subColor:'', subFg:'', custom:{}, children:[
          {id:uid(), title:'Hair & Makeup', duration:45, custom:{}},
          {id:uid(), title:'Wardrobe', duration:20, custom:{}}
        ]},
        {id:uid(),type:'EVENT',title:'SHOOT',duration:90, custom:{}},
        {id:uid(),type:'CALL TIME',title:'Call Time',offset:0, anchorMode:'start', anchorId:'', custom:{}},
        {id:uid(),type:'EVENT',title:'LUNCH',duration:60, custom:{}},
        {id:uid(),type:'EVENT',title:'SHOOT (Afternoon Block)',duration:120, custom:{}},
        {id:uid(),type:'EVENT',title:'WRAP',duration:30, custom:{}}
      ];
      
      const firstDay = {
        id: generateDayId(),
        dayNumber: 1,
        date: '',
        dow: '',
        scheduleStart: '08:00',
        rows,
        palette: getPalette(),
        cols: getCols()
      };
      
      const st = readState();
      writeState({ 
        ...st, 
        days: [firstDay],
        projectMeta: { title: '', version: '' },
        activeDayId: firstDay.id,
        print: getPrint(), 
        layouts: getLayouts(), 
        activeLayoutId: getActiveLayoutId() 
      });
      
      rebuildUI();
    });

    // Print settings
    function applyPrintUiFromState(){ const p=getPrint(); psUseDesigner&&(psUseDesigner.checked=!!p.useDesigner); psShowMeta&&(psShowMeta.checked=!!p.showMeta); psCompact&&(psCompact.checked=!!p.compact); psGridLines&&(psGridLines.checked=!!p.gridLines); psBreakSubs&&(psBreakSubs.checked=!!p.breakSubs); psMediaSize&&(psMediaSize.value=p.mediaSize||'m'); psMediaHeight&&(psMediaHeight.value=p.mediaHeight||100); psMediaMax&&(psMediaMax.value=p.mediaMax||0); psAppendGallery&&(psAppendGallery.checked=!!p.appendGallery); psGalleryCols&&(psGalleryCols.value=p.galleryCols||4); psGallerySize&&(psGallerySize.value=p.gallerySize||'m'); }
    function bindPrintInputs(){ [psUseDesigner,psShowMeta,psCompact,psGridLines,psBreakSubs,psMediaSize,psMediaHeight,psMediaMax,psAppendGallery,psGalleryCols,psGallerySize].forEach(el=>{ el&&el.addEventListener('change', ()=>{ setPrint({ useDesigner:psUseDesigner?.checked, showMeta:psShowMeta?.checked, compact:psCompact?.checked, gridLines:psGridLines?.checked, breakSubs:psBreakSubs?.checked, mediaSize:psMediaSize?.value, mediaHeight:Number(psMediaHeight?.value||100), mediaMax:Number(psMediaMax?.value||0), appendGallery:psAppendGallery?.checked, galleryCols:Number(psGalleryCols?.value||4), gallerySize:psGallerySize?.value }); }); }); }
    function applyBodyPrintClasses(p){ document.body.classList.toggle('print-hide-meta', !p.showMeta); document.body.classList.toggle('print-compact', !!p.compact); document.body.classList.toggle('print-no-grid', !p.gridLines); document.body.classList.toggle('print-break-subs', !!p.breakSubs); document.body.classList.remove('media-s','media-m','media-l'); document.body.classList.add('media-'+(p.mediaSize||'m')); document.body.classList.remove('gallery-s','gallery-m','gallery-l'); document.body.classList.add('gallery-'+(p.gallerySize||'m')); }
    function buildDynamicPrintCSS(p){ const max=p.mediaMax||0; const height=p.mediaHeight||100; let css=''; if(max>0){ css+=`.uploadBox .u-grid .u-item:nth-child(n+${max+1}){display:none!important;}`;} css+=`@media print { .uploadBox .u-item, .uploadBox .u-thumb, .uploadBox img, .uploadBox video { max-height: ${height}px !important; } }`; const cols=Math.max(1,p.galleryCols||4); css+=`#printGallery .g-grid{grid-template-columns:repeat(${cols},1fr);}`; printDynamic.textContent=css; }
    async function buildGallery(p){ if(!p.appendGallery){ printGallery.hidden=true; galleryGrid.innerHTML=''; return; } printGallery.hidden=false; galleryGrid.innerHTML=''; const cells=qsa('td[data-key^="c_"] .uploadBox'); for(const cell of cells){ let ids=[]; try{ ids=JSON.parse(cell.parentElement.dataset.vaultIds||'[]'); }catch{} for(const id of ids){ try{ const rec=await vaultGet(Number(id)); if(!rec) continue; if(!/^image|^video/.test(rec.type)) continue; const url=URL.createObjectURL(rec.data); const item=document.createElement('div'); item.className='g-item'; if(rec.type.startsWith('image/')){ item.innerHTML=`<img src="${url}"><div class="cap">${rec.name||'Image'}</div>`; } else { item.innerHTML=`<video src="${url}" controls></video><div class="cap">${rec.name||'Video'}</div>`; } galleryGrid.appendChild(item); }catch(e){} } } }
    function beforePrint(){ const p=getPrint(); applyBodyPrintClasses(p); buildGallery(p).catch(()=>{}); }
    window.onbeforeprint=beforePrint;

    // Meta format button
    (function() {
      const btn = qs('#metaFormatBtn');
      const display = qs('#metaDisplay');
      if (btn && display) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          buildFormattingPopover(btn, display, 'meta');
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
      
      // Setup schedule change listener
      scheduleStart && scheduleStart.addEventListener('change', () => {
        saveDayData();
      });
    }

    rebuildUI();
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
      if (themeText) themeText.textContent = 'DARK';
    } else {
      if (themeText) themeText.textContent = 'LIGHT';
    }
    
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('scheduler-theme', isLight ? 'light' : 'dark');
      if (themeText) {
        themeText.textContent = isLight ? 'DARK' : 'LIGHT';
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
    scheduleStart: s.start || '08:00',
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
    scheduleStart: s.start || '08:00',
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
    const main = document.querySelector('main.container');
    if (!main) {
      console.warn('Could not find main.container for zoom');
      return;
    }
    
    console.log(`🔍 Applying zoom: ${(zoomLevel * 100).toFixed(0)}%`);
    
    // Use CSS zoom instead of transform scale to maintain sharpness
    main.style.zoom = zoomLevel;
    
    localStorage.setItem('scheduleZoom', zoomLevel);
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
      });
    }
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

document.getElementById('printColConfirm')?.addEventListener('click', () => {
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
  
  console.log('🖨️ Print settings saved:', { imageHeight, paperSize, orientation });
  
  localStorage.setItem('pdfImageHeight', imageHeight);
  localStorage.setItem('pdfPaperSize', paperSize);
  localStorage.setItem('pdfOrientation', orientation);
  
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

})();
