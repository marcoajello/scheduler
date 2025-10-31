/* ====================================================
   PRINT FIELD PICKER MODULE
   Allows users to select which columns to include in printouts
   and hides all UI elements from printed output
   ==================================================== */

(function() {
  'use strict';
  
  const PRINT_FIELDS_KEY = 'scheduler_print_fields';
  
  // Default field definitions - MUST match actual scheduler columns
  const DEFAULT_FIELDS = [
    { key: 'idx', label: 'Row #', builtin: true, enabled: true },
    { key: 'start', label: 'Start', builtin: true, enabled: true },
    { key: 'end', label: 'End', builtin: true, enabled: true },
    { key: 'duration', label: 'Dur/Offset', builtin: true, enabled: true },
    { key: 'type', label: 'Type', builtin: true, enabled: true },
    { key: 'title', label: 'Event', builtin: true, enabled: true }
  ];
  
  // Get current field selections from localStorage
  function getPrintFields() {
    try {
      const stored = localStorage.getItem(PRINT_FIELDS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error loading print fields:', e);
    }
    return DEFAULT_FIELDS.slice();
  }
  
  // Save field selections to localStorage
  function savePrintFields(fields) {
    try {
      localStorage.setItem(PRINT_FIELDS_KEY, JSON.stringify(fields));
    } catch (e) {
      console.warn('Error saving print fields:', e);
    }
  }
  
  // Get custom columns from the app's column configuration
  function getCustomColumns() {
    try {
      // Method 1: Try to get columns from the global getCols function
      if (typeof getCols === 'function') {
        const cols = getCols();
        console.log('Print Field Picker: Found columns via getCols:', cols);
        return cols.map(col => ({
          key: col.key,
          label: col.label || col.key,
          builtin: false,
          enabled: true
        }));
      }
      
      // Method 2: Try to read from localStorage state
      const state = localStorage.getItem('__SCHEDULER_STATE__');
      if (state) {
        const parsed = JSON.parse(state);
        
        // Check for columns in current day
        if (parsed.days && parsed.days.length > 0 && parsed.activeDayId) {
          const activeDay = parsed.days.find(d => d.id === parsed.activeDayId) || parsed.days[0];
          if (activeDay.cols) {
            console.log('Print Field Picker: Found columns in active day:', activeDay.cols);
            return activeDay.cols.map(col => ({
              key: col.key,
              label: col.label || col.key,
              builtin: false,
              enabled: true
            }));
          }
        }
        
        // Fallback to top-level cols
        if (parsed.cols) {
          console.log('Print Field Picker: Found columns in state:', parsed.cols);
          return parsed.cols.map(col => ({
            key: col.key,
            label: col.label || col.key,
            builtin: false,
            enabled: true
          }));
        }
      }
      
      // Method 3: Try to detect from the table headers
      const headerRow = document.getElementById('headerRow');
      if (headerRow) {
        const customCols = [];
        const headers = headerRow.querySelectorAll('th[data-key]');
        headers.forEach(th => {
          const key = th.dataset.key;
          const label = th.textContent.trim();
          
          // Skip built-in and fixed columns
          const builtinKeys = ['drag', 'idx', 'start', 'end', 'duration', 'type', 'title', 'actions'];
          if (!builtinKeys.includes(key) && key.startsWith('c_')) {
            customCols.push({
              key: key,
              label: label || key,
              builtin: false,
              enabled: true
            });
          }
        });
        
        if (customCols.length > 0) {
          console.log('Print Field Picker: Found columns from table headers:', customCols);
          return customCols;
        }
      }
      
      console.log('Print Field Picker: No custom columns found');
    } catch (e) {
      console.warn('Error getting custom columns:', e);
    }
    return [];
  }
  
  // Merge saved fields with current columns
  function mergeFieldsWithColumns() {
    const saved = getPrintFields();
    const custom = getCustomColumns();
    
    // Create a map of saved field states
    const savedMap = {};
    saved.forEach(f => {
      savedMap[f.key] = f.enabled;
    });
    
    // Start with builtin fields
    const merged = DEFAULT_FIELDS.map(f => ({
      ...f,
      enabled: savedMap[f.key] !== undefined ? savedMap[f.key] : f.enabled
    }));
    
    // Add custom columns
    custom.forEach(col => {
      merged.push({
        key: col.key,
        label: col.label,
        builtin: false,
        enabled: savedMap[col.key] !== undefined ? savedMap[col.key] : true
      });
    });
    
    return merged;
  }
  
  // Create the field picker UI
  function createFieldPickerUI() {
    const panel = document.getElementById('printPanel');
    if (!panel) {
      console.warn('Print panel not found');
      return;
    }
    
    // Check if picker already exists
    if (document.getElementById('printFieldPicker')) {
      return;
    }
    
    const fields = mergeFieldsWithColumns();
    
    const picker = document.createElement('div');
    picker.id = 'printFieldPicker';
    picker.className = 'print-field-picker';
    
    const html = `
      <h3>Select Columns to Print</h3>
      <div class="field-picker-grid" id="fieldPickerGrid">
        ${fields.map(field => `
          <div class="field-picker-item">
            <input 
              type="checkbox" 
              id="field_${field.key}" 
              data-field-key="${field.key}"
              ${field.enabled ? 'checked' : ''}
            >
            <label for="field_${field.key}">${field.label}</label>
          </div>
        `).join('')}
      </div>
      <div class="field-picker-actions">
        <button id="fpSelectAll" class="ghost">Select All</button>
        <button id="fpDeselectAll" class="ghost">Deselect All</button>
        <button id="fpResetDefault" class="ghost">Reset to Defaults</button>
        <button id="fpRefresh" class="ghost" title="Refresh to detect newly added columns">↻ Refresh</button>
        <span class="grow"></span>
        <span class="field-picker-hint">${fields.length} columns available</span>
      </div>
    `;
    
    picker.innerHTML = html;
    
    // Insert the picker right after the summary element
    const summary = panel.querySelector('summary');
    if (summary && summary.nextElementSibling) {
      summary.nextElementSibling.insertAdjacentElement('beforebegin', picker);
    } else {
      panel.appendChild(picker);
    }
    
    // Attach event listeners
    attachFieldPickerListeners();
  }
  
  // Attach event listeners to the field picker
  function attachFieldPickerListeners() {
    const grid = document.getElementById('fieldPickerGrid');
    if (!grid) return;
    
    // Checkbox change handler
    grid.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        updatePrintFields();
      }
    });
    
    // Select All button
    const selectAll = document.getElementById('fpSelectAll');
    if (selectAll) {
      selectAll.addEventListener('click', () => {
        const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        updatePrintFields();
      });
    }
    
    // Deselect All button
    const deselectAll = document.getElementById('fpDeselectAll');
    if (deselectAll) {
      deselectAll.addEventListener('click', () => {
        const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        updatePrintFields();
      });
    }
    
    // Reset to Defaults button
    const reset = document.getElementById('fpResetDefault');
    if (reset) {
      reset.addEventListener('click', () => {
        if (confirm('Reset to default column selections?')) {
          localStorage.removeItem(PRINT_FIELDS_KEY);
          refreshFieldPicker();
        }
      });
    }
    
    // Refresh button
    const refresh = document.getElementById('fpRefresh');
    if (refresh) {
      refresh.addEventListener('click', () => {
        refreshFieldPicker();
        alert('Field picker refreshed! Any newly added columns should now appear.');
      });
    }
  }
  
  // Update print fields based on checkbox states
  function updatePrintFields() {
    const grid = document.getElementById('fieldPickerGrid');
    if (!grid) return;
    
    const fields = [];
    const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
      const key = cb.dataset.fieldKey;
      const label = cb.nextElementSibling.textContent;
      const enabled = cb.checked;
      
      fields.push({ key, label, enabled });
    });
    
    savePrintFields(fields);
    applyPrintFieldClasses();
  }
  
  // Apply CSS classes to hide columns based on selections
  function applyPrintFieldClasses() {
    const fields = getPrintFields();
    const body = document.body;
    
    // Remove existing print-hide classes
    body.className = body.className
      .split(' ')
      .filter(c => !c.startsWith('print-hide-col-'))
      .join(' ');
    
    // Add classes for disabled fields
    fields.forEach(field => {
      if (!field.enabled) {
        body.classList.add(`print-hide-col-${field.key}`);
      }
    });
  }
  
  // Refresh the field picker UI
  function refreshFieldPicker() {
    const picker = document.getElementById('printFieldPicker');
    if (picker) {
      picker.remove();
    }
    createFieldPickerUI();
    applyPrintFieldClasses();
  }
  
  // Generate dynamic CSS for custom columns
  function generateCustomColumnCSS() {
    const fields = mergeFieldsWithColumns();
    const customFields = fields.filter(f => !f.builtin);
    
    if (customFields.length === 0) return;
    
    let css = '/* Dynamic Print Column Styles */\n';
    css += '@media print {\n';
    
    customFields.forEach(field => {
      css += `  .print-hide-col-${field.key} th[data-key="${field.key}"],\n`;
      css += `  .print-hide-col-${field.key} td[data-key="${field.key}"] {\n`;
      css += `    display: none !important;\n`;
      css += `  }\n\n`;
    });
    
    css += '}\n';
    
    // Inject or update the style element
    let styleEl = document.getElementById('printFieldPickerDynamic');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'printFieldPickerDynamic';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }
  
  // Hook into the existing print button
  function enhancePrintButton() {
    const printBtn = document.getElementById('printBtn');
    if (!printBtn) return;
    
    // Store original click handler
    const originalHandler = printBtn.onclick;
    
    // Replace with enhanced handler
    printBtn.onclick = function(e) {
      applyPrintFieldClasses();
      
      // Call original handler if it exists
      if (originalHandler) {
        originalHandler.call(this, e);
      } else {
        // Default print behavior
        if (typeof beforePrint === 'function') {
          beforePrint();
        }
        window.print();
      }
    };
  }
  
  // Initialize on DOM ready
  function init() {
    createFieldPickerUI();
    generateCustomColumnCSS();
    applyPrintFieldClasses();
    enhancePrintButton();
    
    // Refresh when print panel is opened
    const printPanel = document.getElementById('printPanel');
    if (printPanel) {
      printPanel.addEventListener('toggle', () => {
        if (printPanel.open) {
          console.log('Print panel opened, refreshing field picker...');
          refreshFieldPicker();
        }
      });
    }
    
    // Re-generate CSS when columns change
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('columns-changed', () => {
        generateCustomColumnCSS();
        refreshFieldPicker();
      });
    }
    
    // Refresh periodically to catch column changes
    setInterval(() => {
      const printPanel = document.getElementById('printPanel');
      if (printPanel && printPanel.open) {
        const currentFields = mergeFieldsWithColumns();
        const picker = document.getElementById('printFieldPicker');
        if (picker) {
          const currentCheckboxCount = picker.querySelectorAll('input[type="checkbox"]').length;
          if (currentCheckboxCount !== currentFields.length) {
            console.log('Column count changed, refreshing field picker...');
            refreshFieldPicker();
          }
        }
      }
    }, 2000); // Check every 2 seconds
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Export functions for external use
  window.PrintFieldPicker = {
    refresh: refreshFieldPicker,
    getPrintFields: getPrintFields,
    applyPrintFieldClasses: applyPrintFieldClasses
  };
  
})();
