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
    const scheduleStart=qs('#scheduleStart'), saveBtn=qs('#saveBtn'), loadInput=qs('#loadInput'), printBtn=qs('#printBtn');

    // Meta
    const metaTitle=qs('#metaTitle'), metaDate=qs('#metaDate'), metaX=qs('#metaX'), metaY=qs('#metaY'), metaDisplay=qs('#metaDisplay'), metaDow=qs('#metaDow');

    // Palette
    const palChips=qs('#palChips'), palAdd=qs('#palAdd'), palReset=qs('#palReset'), palSave=qs('#palSave');

    // Column Manager
    const colList=qs('#colList'), colAdd=qs('#colAdd'), colReset=qs('#colReset');

    // Print settings
    const psUseDesigner=qs('#psUseDesigner'), psShowMeta=qs('#psShowMeta'), psCompact=qs('#psCompact'), psGridLines=qs('#psGridLines'), psBreakSubs=qs('#psBreakSubs'), psMediaSize=qs('#psMediaSize'), psMediaMax=qs('#psMediaMax'), psAppendGallery=qs('#psAppendGallery'), psGalleryCols=qs('#psGalleryCols'), psGallerySize=qs('#psGallerySize');
    const printDynamic=qs('#printDynamic'), printGallery=qs('#printGallery'), galleryGrid=qs('#galleryGrid');

    // Designer
    const designerCanvas=qs('#designerCanvas'), propsBody=qs('#propsBody'), dLayoutSelect=qs('#dLayoutSelect'), dNewLayout=qs('#dNewLayout'), dDupLayout=qs('#dDupLayout'), dDelLayout=qs('#dDelLayout');
    const dAddMeta=qs('#dAddMeta'), dAddTable=qs('#dAddTable'), dAddGallery=qs('#dAddGallery'), dAddText=qs('#dAddText'), dAddImage=qs('#dAddImage');
    const designerPrintRoot=qs('#designerPrintRoot');

    const STORAGE_KEY='shootScheduler_v8_9_1r';
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
    const FIXED_LEFT=[{key:'drag',label:'',fixed:true},{key:'idx',label:'#',fixed:true},{key:'start',label:'Start',fixed:true},{key:'end',label:'End',fixed:true},{key:'duration',label:'Dur/Offset',fixed:true},{key:'type',label:'Type',fixed:true},{key:'title',label:'Event',fixed:true},];
    const FIXED_RIGHT=[{key:'actions',label:'',fixed:true}];
    const DEFAULT_CUSTOM_COLS=[{id:cid(),key:'c_text',label:'TEXT',type:'text',show:true,print:true},{id:cid(),key:'c_uploads',label:'MEDIA (UPLOAD)',type:'upload',show:true,print:true},{id:cid(),key:'c_tags',label:'TAGS',type:'tags',show:true,print:true},];

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

function getProjectMeta() {
  const s = readState();
  return s.projectMeta || { title: '', version: '' };
}

function setProjectMeta(meta) {
  const s = readState();
  writeState({ ...s, projectMeta: meta });
}

function getDays() {
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
  const days = getDays();
  return days[0]?.id || null;
}

function setActiveDayId(dayId) {
  const s = readState();
  writeState({ ...s, activeDayId: dayId });
}

function getCurrentDay() {
  const days = getDays();
  const activeId = getActiveDayId();
  return days.find(d => d.id === activeId) || days[0];
}

function updateDay(dayId, updates) {
  const s = readState();
  const days = getDays();
  const idx = days.findIndex(d => d.id === dayId);
  if (idx === -1) return;
  
  days[idx] = { ...days[idx], ...updates };
  writeState({ ...s, days });
}

function addNewDay(duplicateSchedule = false) {
  const s = readState();
  const days = getDays();
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
  const days = getDays();
  
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
  const days = getDays();
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
  if (metaDow) metaDow.value = day.dow || '';
  if (metaX) metaX.value = day.dayNumber;
  if (metaY) metaY.value = days.length;
  if (scheduleStart) scheduleStart.value = day.scheduleStart || '08:00';
  
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
  
  updateHeaderDisplay();
  renderDayTabs();
  renumber();
  recalc();
  refreshAnchorSelectors();
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
  
  const days = getDays();
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
    const days = getDays();
    const currentIdx = days.findIndex(d => d.id === getActiveDayId());
    const newX = parseInt(metaX.value) || 1;
    
    if (newX !== currentIdx + 1) {
      if (!confirm(`Day X has changed from ${currentIdx + 1} to ${newX}. This doesn't match the current tab position. Continue anyway?`)) {
        metaX.value = currentIdx + 1;
      }
    }
  });
  
  metaY.addEventListener('change', () => {
    const days = getDays();
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
  drag:28, idx:36, start:100, end:100, duration:60, type:120, title:300, actions:120
};
function getColW(){
  try{
    const s = readState();
    return s.colW || {...DEFAULT_COL_WIDTHS};
  }catch(e){ return {...DEFAULT_COL_WIDTHS}; }
}
function setColW(map){
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
  const cols = [...FIXED_LEFT, ...getCols(), ...FIXED_RIGHT];
  cols.forEach(c=>{
    const el = document.createElement('col');
    el.dataset.key = c.key;
    if(w[c.key]) el.style.width = w[c.key] + 'px';
    cg.appendChild(el);
  });
}
function syncCellWidths(){
  try{
    const w = getColW();
    const theadRow = document.getElementById('headerRow');
    const tbody = document.getElementById('tbody');
    if(theadRow){
      [...theadRow.children].forEach(th=>{
        const key = th.dataset.key; if(!key) return;
        const px = w[key]; if(px){ th.style.width = px + 'px'; th.style.minWidth = px + 'px'; }
      });
    }
    if(tbody){
      [...tbody.querySelectorAll('tr.row')].forEach(tr=>{
        [...tr.children].forEach(td=>{
          const key = td.dataset.key; const px = w[key];
          if(px){ td.style.width = px + 'px'; td.style.minWidth = px + 'px'; }
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
  
  [...theadRow.children].forEach(th=>{
    const key = th.dataset.key;
    if(!key || key==='drag') return; // skip drag column
    
    const grip = document.createElement('span');
    grip.className='col-resize-grip';
    th.appendChild(grip);
    
    let startX=0, startW=0, isResizing=false;
    
    const onDown = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      const w = getColW();
      startW = w[key] || th.offsetWidth || 100;
      
      const onMove = (ev)=>{
        if(!isResizing) return;
        ev.preventDefault();
        const dx = ev.clientX - startX;
        const minW = (key==='actions'?96:60);
        const newW = Math.max(minW, startW + dx);
        const map = {...getColW(), [key]: newW};
        setColW(map);
        syncCellWidths();
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
    if (w.duration == null || w.duration === 110) { w.duration = 80; changed = true; }
    if (w.actions == null) { w.actions = (DEFAULT_COL_WIDTHS.actions||120); changed = true; }
    if (changed) writeState({ ...s, colW: w });
  }catch(e){}
})();



    function getPalette(){const s=readState(); return Array.isArray(s.palette)&&s.palette.length?s.palette:DEFAULT_PALETTE.slice();}
    function setPalette(p){const s=readState(); writeState({...s, palette:[...new Set(p)]}); renderPalette();}
    function getCols(){const s=readState(); if(Array.isArray(s.cols)) return s.cols; return DEFAULT_CUSTOM_COLS.slice();}
    function setCols(cols){const s=readState(); writeState({...s, cols}); rebuildHeaders(); rebuildRowsKeepData(); persist();}
    function getPrint(){const s=readState(); return s.print||{useDesigner:false, showMeta:true, compact:false, gridLines:true, breakSubs:false, mediaSize:'m', mediaMax:0, appendGallery:false, galleryCols:4, gallerySize:'m'};}
    function setPrint(p){const s=readState(); writeState({...s, print:p}); applyPrintUiFromState();}

    // IndexedDB
    function openVault(){return new Promise((resolve,reject)=>{
      const req=indexedDB.open(VAULT_DB,1);
      req.onupgradeneeded=e=>{const db=e.target.result; if(!db.objectStoreNames.contains('files')){const s=db.createObjectStore('files',{keyPath:'id',autoIncrement:true}); s.createIndex('created','created',{unique:false});}};
      req.onsuccess=()=>{vaultDb=req.result; resolve(vaultDb)}; req.onerror=()=>reject(req.error);
    });}
    async function vaultPut(file){const db=vaultDb||await openVault();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');const st=tx.objectStore('files');const obj={name:file.name,type:file.type,data:file,created:Date.now()};const r=st.add(obj);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
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
      if(!colList) return;
      const cols=getCols(); colList.innerHTML='';
      cols.forEach((c,idx)=>{
        const row=document.createElement('div'); row.className='colRow';
        row.innerHTML=`
          <input class="colLabel" value="${(c.label||'Custom').replace(/"/g,'&quot;')}" />
          <select class="colType">
            <option value="text"${c.type==='text'?' selected':''}>TEXT</option>
            <option value="upload"${c.type==='upload'?' selected':''}>MEDIA (UPLOAD)</option>
            <option value="tags"${c.type==='tags'?' selected':''}>TAGS</option>
          </select>
          <label class="toggle"><input type="checkbox" class="colShow"${c.show!==false?' checked':''}/> Show</label>
          <label class="toggle"><input type="checkbox" class="colPrint"${c.print!==false?' checked':''}/> Print</label>
          <div class="spacer"></div>
          <button class="ghost up" title="Move up">↑</button>
          <button class="ghost down" title="Move down">↓</button>
          <button class="ghost del" title="Remove">✕</button>`;
        const label=row.querySelector('.colLabel'), typeSel=row.querySelector('.colType'), showChk=row.querySelector('.colShow'), printChk=row.querySelector('.colPrint');
        const up=row.querySelector('.up'), down=row.querySelector('.down'), del=row.querySelector('.del');
        let labelTimeout;
        label && label.addEventListener('input', ()=>{ 
          c.label=label.value; 
          clearTimeout(labelTimeout);
          labelTimeout = setTimeout(() => {
            setCols(cols); 
            persist && persist();
          }, 500);
        });
        label && label.addEventListener('blur', ()=>{ 
          clearTimeout(labelTimeout);
          c.label=label.value; 
          setCols(cols); 
          persist && persist(); 
        });
        typeSel && typeSel.addEventListener('change', ()=>{ c.type=typeSel.value; setCols(cols); persist && persist(); });
        showChk && showChk.addEventListener('change', ()=>{ c.show=showChk.checked; setCols(cols); persist && persist(); });
        printChk && printChk.addEventListener('change', ()=>{ c.print=printChk.checked; setCols(cols); persist && persist(); });
        up && up.addEventListener('click', ()=>{ if(idx===0) return; cols.splice(idx-1,0, cols.splice(idx,1)[0]); setCols(cols); persist && persist(); });
        down && down.addEventListener('click', ()=>{ if(idx===cols.length-1) return; cols.splice(idx+1,0, cols.splice(idx,1)[0]); setCols(cols); persist && persist(); });
        del && del.addEventListener('click', ()=>{ 
          if(confirm(`Delete column "${c.label}"? This will remove all data in this column.`)) {
            cols.splice(idx,1); 
            setCols(cols); 
            persist && persist(); 
          }
        });
        colList.appendChild(row);
      });
    }
    colAdd && colAdd.addEventListener('click', ()=>{ const cols=getCols(); cols.push({id:cid(), key:'c_'+cid().slice(2), label:'Custom', type:'text', show:true, print:true}); setCols(cols); persist && persist(); });
    colReset && colReset.addEventListener('click', ()=> setCols(DEFAULT_CUSTOM_COLS.slice()));

    // Popovers
    function closeAllPopovers(){ qsa('.popover.is-open').forEach(p=> p.classList.remove('is-open')); }
    document.addEventListener('click', (e)=>{ if(!e.target.closest('.popover') && !e.target.closest('[data-popover-trigger]')) closeAllPopovers(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAllPopovers(); });

    function buildFormattingPopover(triggerBtn, rowElement, formatType='row'){
      try {
      // formatType: 'row', 'meta'
      
      // Get current formatting from row dataset
      const getCurrentFormatting = () => ({
        fontFamily: rowElement.dataset.fontFamily || '',
        fontSize: rowElement.dataset.fontSize || '',
        bold: rowElement.dataset.bold === 'true',
        italic: rowElement.dataset.italic === 'true',
        underline: rowElement.dataset.underline === 'true',
        align: rowElement.dataset.align || 'left',
        fgColor: rowElement.dataset.rowFg || '',
        bgColor: rowElement.dataset.rowBg || ''
      });
      
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
        // Apply to all TD elements in the row for proper inheritance
        element.querySelectorAll('td').forEach(td => {
          if (formatting.fontFamily) td.style.fontFamily = formatting.fontFamily;
          else td.style.fontFamily = '';
          
          if (formatting.fontSize) td.style.fontSize = formatting.fontSize;
          else td.style.fontSize = '';
          
          td.style.fontWeight = formatting.bold ? 'bold' : '';
          td.style.fontStyle = formatting.italic ? 'italic' : '';
          td.style.textDecoration = formatting.underline ? 'underline' : '';
          
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
          // Handle sub-children differently
          if (element.classList.contains('subchild')) {
            element.dataset.subChildFg = formatting.fgColor;
            element.style.setProperty('--subchild-fg', formatting.fgColor);
          } else {
            element.dataset.rowFg = formatting.fgColor;
            element.style.setProperty('--row-fg', formatting.fgColor);
          }
          // Apply color to all cells
          element.querySelectorAll('td').forEach(td => {
            td.style.color = formatting.fgColor;
          });
        } else {
          if (element.classList.contains('subchild')) {
            delete element.dataset.subChildFg;
            element.style.removeProperty('--subchild-fg');
          } else {
            delete element.dataset.rowFg;
            element.style.removeProperty('--row-fg');
          }
          element.querySelectorAll('td').forEach(td => {
            td.style.color = '';
          });
        }
        
        if (formatting.bgColor) {
          // Handle sub-children differently
          if (element.classList.contains('subchild')) {
            element.dataset.subChildColor = formatting.bgColor;
            element.style.setProperty('--subchild-bg', formatting.bgColor);
          } else {
            element.dataset.rowBg = formatting.bgColor;
            element.style.setProperty('--row-bg', formatting.bgColor);
          }
        } else {
          if (element.classList.contains('subchild')) {
            delete element.dataset.subChildColor;
            element.style.removeProperty('--subchild-bg');
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
        const textarea = element.querySelector('textarea, input[type="text"]');
        if (textarea) {
          if (formatting.fontFamily) textarea.style.fontFamily = formatting.fontFamily;
          else textarea.style.fontFamily = '';
          
          if (formatting.fontSize) textarea.style.fontSize = formatting.fontSize;
          else textarea.style.fontSize = '';
          
          textarea.style.fontWeight = formatting.bold ? 'bold' : '';
          textarea.style.fontStyle = formatting.italic ? 'italic' : '';
          textarea.style.textDecoration = formatting.underline ? 'underline' : '';
          textarea.style.textAlign = formatting.align;
          
          if (formatting.fgColor) textarea.style.color = formatting.fgColor;
          else textarea.style.color = '';
          
          if (formatting.bgColor) textarea.style.backgroundColor = formatting.bgColor;
          else textarea.style.backgroundColor = '';
        }
      }
      } catch(error) {
        console.error('Error in applyFormatting:', error);
      }
    }

    // Row color helpers
    function applyRowBg(tr,color,isSub,isChild){
      if(isChild){ if(color){ tr.dataset.subChildColor=color; tr.style.setProperty('--subchild-bg', color); } else { delete tr.dataset.subChildColor; tr.style.removeProperty('--subchild-bg'); const parent=qs(`tbody tr.row[data-id="${tr.dataset.parent}"]`); if(parent) tr.style.setProperty('--subchild-bg', parent.dataset.subColor || ''); } return; }
      if(isSub){ tr.dataset.subColor=color||''; tr.style.setProperty('--sub-bg', color||''); return; }
      if(color){ tr.dataset.rowBg=color; tr.style.setProperty('--row-bg', color); } else { delete tr.dataset.rowBg; tr.style.removeProperty('--row-bg'); }
    }
    function applyRowFg(tr,color,isSub,isChild){
      if(isChild){ if(color){ tr.dataset.subChildFg=color; tr.style.setProperty('--subchild-fg', color); } else { delete tr.dataset.subChildFg; tr.style.removeProperty('--subchild-fg'); } return; }
      if(isSub){ if(color){ tr.dataset.subFg=color; tr.style.setProperty('--sub-fg', color); } else { delete tr.dataset.subFg; tr.style.removeProperty('--sub-fg'); } return; }
      if(color){ tr.dataset.rowFg=color; tr.style.setProperty('--row-fg', color); } else { delete tr.dataset.rowFg; tr.style.removeProperty('--row-fg'); }
    }

    // Headers
    function rebuildHeaders(){
      const cols=[...FIXED_LEFT, ...getCols(), ...FIXED_RIGHT];
      theadRow.innerHTML='';
      cols.forEach(col=>{
        const th=document.createElement('th'); th.dataset.key=col.key; th.textContent=col.label||'';
        if(col.key==='drag'||col.key==='actions'){ th.classList.add(col.key==='drag'?'fixed-left':'fixed-right'); th.textContent=''; }
        if(!col.fixed){ if(col.show===false) th.classList.add('col-hide'); if(col.print===false) th.classList.add('col-print-hide'); }
        theadRow.appendChild(th);
      });
    
      applyColWidths(); addHeaderResizeGrips();
}

    // Custom cells
    function appendCustomCells(tr,rowData){
      getCols().forEach(col=>{
        const td=document.createElement('td'); td.dataset.key=col.key;
        td.className = 'custom-cell'; // Add class for styling
        if(col.show===false) td.classList.add('col-hide');
        if(col.print===false) td.classList.add('col-print-hide');
        const val=((rowData.custom||{})[col.key])||'';
        if(col.type==='text'){
          td.innerHTML=`<div class="cell-wrapper">
            <textarea class="cc-input" data-ckey="${col.key}" rows="2" placeholder="${col.label||''}">${val}</textarea>
            <button class="ghost cell-format-btn" title="Format cell">✎</button>
          </div>`;
          
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
      if(rowData.rowBg){ tr.dataset.rowBg=rowData.rowBg; tr.style.setProperty('--row-bg', rowData.rowBg); }
      if(rowData.rowFg){ tr.dataset.rowFg=rowData.rowFg; tr.style.setProperty('--row-fg', rowData.rowFg); }
      if(rowData.subColor){ tr.dataset.subColor=rowData.subColor; tr.style.setProperty('--sub-bg', rowData.subColor); }
      if(rowData.subFg){ tr.dataset.subFg=rowData.subFg; tr.style.setProperty('--sub-fg', rowData.subFg); }

      const cells={}; const td=k=>{ const el=document.createElement('td'); el.dataset.key=k; return el; };
      cells.drag=td('drag'); cells.drag.className='drag'; cells.drag.textContent='⠿';
      cells.idx=td('idx'); cells.idx.className='idx';
      cells.start=td('start'); cells.start.className='start ampm'; cells.start.textContent='—';
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
        buildFormattingPopover(formatBtn, tr, 'row');
      } else if(tr.dataset.type==='SUB'){
        const anchorMode=rowData.anchorMode||'eventEnd'; const subColor=rowData.subColor||'#243041';
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
            <button class="addSubEv">+ Sub Event</button>
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
        buildFormattingPopover(formatBtn, tr, 'row');
        applyRowBg(tr, tr.dataset.subColor||subColor, true,false);
      } else {
        cells.title.innerHTML=`<div class="titleWrap">
          <input class="title" value="${(rowData.title||'New Event').replace(/"/g,'&quot;')}">
        </div>`;
        cells.title.querySelector('.title').addEventListener('input', ()=>{ persist(); refreshAnchorSelectors(); });
        
        // Add format button to drag cell
        cells.drag.innerHTML = `⠿ <button class="ghost formatBtn" title="Format text" style="font-size:12px;padding:2px 4px;margin-left:2px;">✎</button>`;
        const formatBtn=cells.drag.querySelector('.formatBtn');
        buildFormattingPopover(formatBtn, tr, 'row');
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
        if(tr.dataset.type==='SUB'){
          const kids=collectChildren(tr);
          kids.forEach(k=>{
            const kidData={ id:uid(), title:k.querySelector('.subTitle').value, duration:k.querySelector('.subDur').value,
              subChildColor: k.dataset.subChildColor || '', subChildFg: k.dataset.subChildFg || '', custom: getRowCustomFromDOM(k) };
            const clone=makeSubChildRow(newRow, kidData); newRow.after(clone);
          });
        }
        renumber(); recalc(); persist(); refreshAnchorSelectors();
      });
      cells.actions.querySelector('.del').addEventListener('click', ()=>{
        if(tr.dataset.type==='SUB'){ collectChildren(tr).forEach(k=> k.remove()); }
        tr.remove(); renumber(); recalc(); persist(); refreshAnchorSelectors();
      });

      tr.appendChild(cells.drag); tr.appendChild(cells.idx); tr.appendChild(cells.start); tr.appendChild(cells.end); tr.appendChild(cells.duration); tr.appendChild(cells.type); tr.appendChild(cells.title);
      appendCustomCells(tr, rowData); tr.appendChild(cells.actions);

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
      cells.idx.addEventListener('click', (e) => {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          e.preventDefault();
          toggleRowSelection(tr, e.shiftKey);
        }
      });
      cells.idx.style.cursor = 'pointer';
      cells.idx.title = 'Shift/Cmd+click to multi-select';

      if(rowData.type==='SUB' && Array.isArray(rowData.children)){ tr._pendingChildren=rowData.children.map(ch=> makeSubChildRow(tr, ch)); }
      tr.classList.toggle('subheader', tr.dataset.type==='SUB');
      return tr;
    }

    function makeSubChildRow(parentTr, child){
      const tr=document.createElement('tr'); tr.className='row subchild'; tr.dataset.parent=parentTr.dataset.id; tr.dataset.id=child.id; tr.draggable=true;
      tr.dataset.subType = child.subType || 'event'; // Track sub-event type
      if(child.subChildColor){ tr.dataset.subChildColor=child.subChildColor; tr.style.setProperty('--subchild-bg', child.subChildColor); }
      else if(parentTr.dataset.subColor){ tr.style.setProperty('--subchild-bg', parentTr.dataset.subColor); }
      if(child.subChildFg){ tr.dataset.subChildFg=child.subChildFg; tr.style.setProperty('--subchild-fg', child.subChildFg); }

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
        <option value="event"${subType==='event'?' selected':''}>Event</option>
        <option value="call"${subType==='call'?' selected':''}>Call Time</option>
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
      buildFormattingPopover(formatBtn, tr, 'row');

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
        tr.after(clone); renumber(); recalc(); persist();
      });
      cells.actions.querySelector('.del').addEventListener('click', ()=>{ tr.remove(); renumber(); recalc(); persist(); });

      tr.appendChild(cells.drag); tr.appendChild(cells.idx); tr.appendChild(cells.start); tr.appendChild(cells.end); tr.appendChild(cells.duration); tr.appendChild(cells.type); tr.appendChild(cells.title);
      appendCustomCells(tr, child); tr.appendChild(cells.actions);

      tr.addEventListener('dragstart', e=>{ tr.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      tr.addEventListener('dragend', ()=>{ tr.classList.remove('dragging'); persist(); recalc(); });
      return tr;
    }

    // Helpers
    function collectChildren(parentTr){ const kids=[]; let next=parentTr.nextElementSibling; while(next && next.classList.contains('subchild') && next.dataset.parent===parentTr.dataset.id){ kids.push(next); next=next.nextElementSibling; } return kids; }
    function getRowCustomFromDOM(tr){
      const out={}; getCols().forEach(col=>{
        if(col.type==='upload'){ const td=tr.querySelector(`td[data-key="${col.key}"]`); const idsStr=td?.dataset?.vaultIds||'[]'; try{ out[col.key]=JSON.parse(idsStr);}catch{ out[col.key]=[]; } }
        else if(col.type==='tags'){ const val=tr.querySelector(`td[data-key="${col.key}"] .tags-value`)?.value||''; out[col.key]=val; }
        else { const input=tr.querySelector(`.cc-input[data-ckey="${col.key}"]`); if(input){ out[col.key]=input.value; } }
      }); return out;
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
  s.textContent = '—';
  e.textContent = hhmmToAmPm(minutesToHHMM(anchor + offset));
}
        else if(tr.dataset.type==='SUB'){ 
          const mode=tr.dataset.anchorMode||'eventEnd'; 
          const anchorId=tr.dataset.anchorId||''; 
          const offset=Number(tr.querySelector('.offset')?.value)||0; 
          let anchor=base; 
          if(mode==='eventStart' && timeline[anchorId]) anchor=timeline[anchorId].start; 
          if(mode==='eventEnd' && timeline[anchorId]) anchor=timeline[anchorId].end; 
          s.textContent='—'; 
          e.textContent=hhmmToAmPm(minutesToHHMM(anchor+offset)); 
          
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
              sCell && (sCell.textContent='—'); 
              eCell && (eCell.textContent=hhmmToAmPm(minutesToHHMM(subCursor+callOffset)));
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
    printBtn && printBtn.addEventListener('click', ()=>{ beforePrint(); window.print(); });

    addRowBtn && addRowBtn.addEventListener('click', ()=>{ tbody.appendChild(makeRow({ id:uid(), type:'EVENT', title:'New Event', duration:30, custom:{} })); renumber(); recalc(); persist(); refreshAnchorSelectors(); });
    addCallBtn && addCallBtn.addEventListener('click', ()=>{ tbody.appendChild(makeRow({ id:uid(), type:'CALL TIME', title:'Call Time', offset:0, anchorMode:'start', anchorId:'', custom:{} })); renumber(); recalc(); persist(); refreshAnchorSelectors(); });
    addSubBtn && addSubBtn.addEventListener('click', ()=>{
      const header=makeRow({ id:uid(), type:'SUB', title:'Sub-schedule', offset:0, anchorMode:'eventEnd', anchorId:'', subColor:'#243041', custom:{}, children:[{id:uid(), title:'Sub Event', duration:30, custom:{}}] });
      tbody.appendChild(header);
      if(header._pendingChildren){ header.after(...header._pendingChildren); delete header._pendingChildren; }
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
      addRowBtn && addRowBtn.click();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddCall && fabAddCall.addEventListener('click', () => {
      addCallBtn && addCallBtn.click();
      fabOpen = false;
      fab.classList.remove('active');
      fabMenu.classList.remove('active');
    });
    
    fabAddSub && fabAddSub.addEventListener('click', () => {
      addSubBtn && addSubBtn.click();
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
        {id:uid(),type:'SUB', title:'Talent Prep', offset:-30, anchorMode:'eventEnd', anchorId:'', subColor:'#2f2a41', subFg:'', custom:{}, children:[
          {id:uid(), title:'Hair & Makeup', duration:45, subChildColor:'#2f2a41', custom:{}},
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
    function applyPrintUiFromState(){ const p=getPrint(); psUseDesigner&&(psUseDesigner.checked=!!p.useDesigner); psShowMeta&&(psShowMeta.checked=!!p.showMeta); psCompact&&(psCompact.checked=!!p.compact); psGridLines&&(psGridLines.checked=!!p.gridLines); psBreakSubs&&(psBreakSubs.checked=!!p.breakSubs); psMediaSize&&(psMediaSize.value=p.mediaSize||'m'); psMediaMax&&(psMediaMax.value=p.mediaMax||0); psAppendGallery&&(psAppendGallery.checked=!!p.appendGallery); psGalleryCols&&(psGalleryCols.value=p.galleryCols||4); psGallerySize&&(psGallerySize.value=p.gallerySize||'m'); }
    function bindPrintInputs(){ [psUseDesigner,psShowMeta,psCompact,psGridLines,psBreakSubs,psMediaSize,psMediaMax,psAppendGallery,psGalleryCols,psGallerySize].forEach(el=>{ el&&el.addEventListener('change', ()=>{ setPrint({ useDesigner:psUseDesigner?.checked, showMeta:psShowMeta?.checked, compact:psCompact?.checked, gridLines:psGridLines?.checked, breakSubs:psBreakSubs?.checked, mediaSize:psMediaSize?.value, mediaMax:Number(psMediaMax?.value||0), appendGallery:psAppendGallery?.checked, galleryCols:Number(psGalleryCols?.value||4), gallerySize:psGallerySize?.value }); }); }); }
    function applyBodyPrintClasses(p){ document.body.classList.toggle('print-hide-meta', !p.showMeta); document.body.classList.toggle('print-compact', !!p.compact); document.body.classList.toggle('print-no-grid', !p.gridLines); document.body.classList.toggle('print-break-subs', !!p.breakSubs); document.body.classList.remove('media-s','media-m','media-l'); document.body.classList.add('media-'+(p.mediaSize||'m')); document.body.classList.remove('gallery-s','gallery-m','gallery-l'); document.body.classList.add('gallery-'+(p.gallerySize||'m')); }
    function buildDynamicPrintCSS(p){ const max=p.mediaMax||0; let css=''; if(max>0){ css+=`.uploadBox .u-grid .u-item:nth-child(n+${max+1}){display:none!important;}`;} const cols=Math.max(1,p.galleryCols||4); css+=`#printGallery .g-grid{grid-template-columns:repeat(${cols},1fr);}`; printDynamic.textContent=css; }
    async function buildGallery(p){ if(!p.appendGallery){ printGallery.hidden=true; galleryGrid.innerHTML=''; return; } printGallery.hidden=false; galleryGrid.innerHTML=''; const cells=qsa('td[data-key^="c_"] .uploadBox'); for(const cell of cells){ let ids=[]; try{ ids=JSON.parse(cell.parentElement.dataset.vaultIds||'[]'); }catch{} for(const id of ids){ try{ const rec=await vaultGet(Number(id)); if(!rec) continue; if(!/^image|^video/.test(rec.type)) continue; const url=URL.createObjectURL(rec.data); const item=document.createElement('div'); item.className='g-item'; if(rec.type.startsWith('image/')){ item.innerHTML=`<img src="${url}"><div class="cap">${rec.name||'Image'}</div>`; } else { item.innerHTML=`<video src="${url}" controls></video><div class="cap">${rec.name||'Video'}</div>`; } galleryGrid.appendChild(item); }catch(e){} } } }
    function beforePrint(){ const p=getPrint(); applyBodyPrintClasses(p); buildGallery(p).catch(()=>{}); }
    window.onbeforeprint=beforePrint;

    // Designer (from 8.9, simplified + fixed)
    function getLayouts(){ return readState().layouts || [ { id: 'layout_default', name:'One‑pager', modules:[ {id:uid(), type:'meta', x:1,y:1,w:12,h:2}, {id:uid(), type:'table', x:1,y:3,w:12,h:10} ] } ]; }
    function setLayouts(arr){ const s=readState(); writeState({...s, layouts: arr}); refreshLayoutPicker(); renderDesigner(); }
    function getActiveLayoutId(){ return readState().activeLayoutId || getLayouts()[0].id; }
    function setActiveLayoutId(id){ const s=readState(); writeState({...s, activeLayoutId:id}); refreshLayoutPicker(); renderDesigner(); }
    function refreshLayoutPicker(){ const arr=getLayouts(); const active=getActiveLayoutId(); dLayoutSelect.innerHTML = arr.map(l=>`<option value="${l.id}" ${l.id===active?'selected':''}>${l.name}</option>`).join(''); }

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
        const days = getDays(); // This will migrate old format
        const projectMeta = s.meta ? { title: s.meta.title || '', version: '' } : { title: '', version: '' };
        s = { ...s, days, projectMeta, activeDayId: days[0]?.id };
        writeState(s);
      }
      
      // Load project meta
      const projectMeta = getProjectMeta();
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
      rebuildHeaders(); renderColManager(); renderPalette();
      
      applyPrintUiFromState(); bindPrintInputs();
      refreshLayoutPicker(); renderDesigner();
      
      // Setup meta X/Y edit handlers
      handleMetaXYEdits();
      
      // Setup project meta listeners
      metaTitle && metaTitle.addEventListener('input', () => {
        const meta = getProjectMeta();
        setProjectMeta({ ...meta, title: metaTitle.value });
      });
      
      const metaVersion = document.getElementById('metaVersion');
      metaVersion && metaVersion.addEventListener('input', () => {
        const meta = getProjectMeta();
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

// Initialize meta format button
document.addEventListener('DOMContentLoaded', () => {
  const metaFormatBtn = document.getElementById('metaFormatBtn');
  const metaDisplay = document.getElementById('metaDisplay');
  if (metaFormatBtn && metaDisplay) {
    // Create a dummy tr element to store meta formatting
    const metaFormatElement = document.createElement('div');
    metaFormatElement.id = 'metaFormatData';
    metaFormatElement.style.display = 'none';
    document.body.appendChild(metaFormatElement);
    
    buildFormattingPopover(metaFormatBtn, metaFormatElement, 'meta');
  }
  
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    // Load saved theme
    const savedTheme = localStorage.getItem('scheduler-theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    }
    
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('scheduler-theme', isLight ? 'light' : 'dark');
    });
  }
  
  // Print header functionality
  const printHeaderText = document.getElementById('printHeaderText');
  const printHeaderFormat = document.getElementById('printHeaderFormat');
  
  if (printHeaderText) {
    // Load saved print header
    const savedHeader = localStorage.getItem('scheduler-print-header') || '';
    printHeaderText.value = savedHeader;
    
    // Save on change
    printHeaderText.addEventListener('input', () => {
      localStorage.setItem('scheduler-print-header', printHeaderText.value);
    });
  }
  
  if (printHeaderFormat && printHeaderText) {
    // Create format storage element
    const printHeaderFormatData = document.createElement('div');
    printHeaderFormatData.id = 'printHeaderFormatData';
    printHeaderFormatData.style.display = 'none';
    document.body.appendChild(printHeaderFormatData);
    
    buildFormattingPopover(printHeaderFormat, printHeaderFormatData, 'print-header');
  }
});

// Modify beforePrint to use print header
const originalBeforePrint = window.beforePrint || (() => {});
window.beforePrint = function() {
  originalBeforePrint();
  
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
  const days = getDays();
  const activeId = getActiveDayId();
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
  const meta = getProjectMeta();
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
  return getDays();
};

console.log('Report Designer data access functions registered');
