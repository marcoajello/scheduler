/**
 * Tag Object System
 * - Persistent tag objects (text and image)
 * - Autocomplete within columns
 * - Image compositing (headshot + text overlay)
 * - Drag-drop reusable tags
 */

const TagSystem = (function() {
  'use strict';

  // ============================================================================
  // STATE
  // ============================================================================
  
  let tags = {}; // {tagId: {id, label, type: 'text'|'image', vaultId, columnKey, color, rules}}
  let columnTags = {}; // {columnKey: [tagId, tagId, ...]} - for autocomplete
  
  const STORAGE_KEY = 'tagObjects_v1';
  
  // ============================================================================
  // RULE TYPES
  // ============================================================================
  
  const RULE_TYPES = {
    hardOut: {
      label: 'Hard Out',
      type: 'time',
      description: 'Must wrap by this time',
      inputType: 'time'
    },
    maxHours: {
      label: 'Max Hours',
      type: 'number',
      description: 'Maximum work hours (triggers OT warning)',
      inputType: 'number',
      min: 0,
      step: 0.5
    },
    mealBreak: {
      label: 'Meal Break Required',
      type: 'number',
      description: 'Hours of continuous work before meal break required',
      inputType: 'number',
      min: 0,
      step: 0.5
    }
  };
  
  // Custom alert types
  const CUSTOM_ALERT_TYPES = {
    duration: { label: 'Duration Alert', description: 'Alert when total duration exceeds threshold' },
    manual: { label: 'Manual Reminder', description: 'Reminder only (no auto-check)' }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  function init() {
    loadTags();
    console.log('[TagSystem] Initialized with', Object.keys(tags).length, 'tags');
  }

  // ============================================================================
  // STORAGE
  // ============================================================================
  
  function loadTags() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        tags = data.tags || {};
        columnTags = data.columnTags || {};
      }
    } catch (e) {
      console.error('[TagSystem] Load error:', e);
    }
  }

  function saveTags() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tags,
        columnTags
      }));
    } catch (e) {
      console.error('[TagSystem] Save error:', e);
    }
  }

  // ============================================================================
  // TAG MANAGEMENT
  // ============================================================================
  
  /**
   * Create or get a text tag
   */
  function createTextTag(label, columnKey, color = null) {
    // Check if tag already exists in this column
    const existing = findTagByLabel(label, columnKey);
    if (existing) return existing.id;

    const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    tags[id] = {
      id,
      label: label.trim(),
      type: 'text',
      columnKey,
      color: color || generateTagColor(label),
      created: Date.now()
    };

    // Add to column index
    if (!columnTags[columnKey]) columnTags[columnKey] = [];
    columnTags[columnKey].push(id);

    saveTags();
    console.log('[TagSystem] Created text tag:', tags[id]);
    return id;
  }

  /**
   * Create an image tag (headshot + text overlay)
   */
  async function createImageTag(imageFile, label, columnKey) {
    try {
      // 1. Create composite image (headshot + text overlay)
      const compositeBlob = await createCompositeImage(imageFile, label);
      
      // 2. Store in vault
      const vaultId = await storeInVault(compositeBlob, `${label}.png`);
      
      // 3. Create tag object
      const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      tags[id] = {
        id,
        label: label.trim(),
        type: 'image',
        vaultId,
        columnKey,
        created: Date.now()
      };

      // Add to column index
      if (!columnTags[columnKey]) columnTags[columnKey] = [];
      columnTags[columnKey].push(id);

      saveTags();
      console.log('[TagSystem] Created image tag:', tags[id]);
      return id;
    } catch (error) {
      console.error('[TagSystem] Image tag creation error:', error);
      throw error;
    }
  }

  /**
   * Create composite image: original image with text overlay at bottom
   */
  async function createCompositeImage(imageFile, text) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate dimensions
          const imgWidth = img.width;
          const imgHeight = img.height;
          const textHeight = 30; // Height for text overlay
          const totalHeight = imgHeight + textHeight;
          
          canvas.width = imgWidth;
          canvas.height = totalHeight;
          
          // Draw image
          ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
          
          // Draw text background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, imgHeight, imgWidth, textHeight);
          
          // Draw text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, imgWidth / 2, imgHeight + textHeight / 2);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Store blob in vault (using existing vault system)
   */
  async function storeInVault(blob, filename) {
    // Convert blob to File object
    const file = new File([blob], filename, { type: 'image/png' });
    
    // This will integrate with the existing vaultPut function
    if (typeof window.vaultPut === 'function') {
      return await window.vaultPut(file);
    }
    throw new Error('Vault system not available');
  }

  /**
   * Find tag by label in column
   */
  function findTagByLabel(label, columnKey) {
    const columnTagIds = columnTags[columnKey] || [];
    for (const tagId of columnTagIds) {
      const tag = tags[tagId];
      if (tag && tag.label.toLowerCase() === label.toLowerCase()) {
        return tag;
      }
    }
    return null;
  }

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================
  
  /**
   * Set rules for a tag
   */
  function setTagRules(tagId, rules) {
    if (!tags[tagId]) {
      console.error('[TagSystem] Tag not found:', tagId);
      return false;
    }
    
    tags[tagId].rules = rules;
    saveTags();
    console.log('[TagSystem] Updated rules for tag:', tagId, rules);
    return true;
  }
  
  /**
   * Get rules for a tag
   */
  function getTagRules(tagId) {
    return tags[tagId]?.rules || null;
  }
  
  /**
   * Add custom alert to tag
   */
  function addCustomAlert(tagId, alert) {
    if (!tags[tagId]) {
      console.error('[TagSystem] Tag not found:', tagId);
      return false;
    }
    
    if (!tags[tagId].rules) {
      tags[tagId].rules = {};
    }
    
    if (!tags[tagId].rules.customAlerts) {
      tags[tagId].rules.customAlerts = [];
    }
    
    const alertId = 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    tags[tagId].rules.customAlerts.push({
      id: alertId,
      ...alert
    });
    
    saveTags();
    console.log('[TagSystem] Added custom alert:', alertId, 'to tag:', tagId);
    return alertId;
  }
  
  /**
   * Remove custom alert from tag
   */
  function removeCustomAlert(tagId, alertId) {
    if (!tags[tagId]?.rules?.customAlerts) {
      return false;
    }
    
    const index = tags[tagId].rules.customAlerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      tags[tagId].rules.customAlerts.splice(index, 1);
      saveTags();
      console.log('[TagSystem] Removed custom alert:', alertId, 'from tag:', tagId);
      return true;
    }
    
    return false;
  }

  // ============================================================================
  // SCHEDULE VALIDATOR
  // ============================================================================
  
  /**
   * Parse time string to minutes since day start
   */
  function parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3]?.toUpperCase();
    
    if (period) {
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }
    
    return hours * 60 + minutes;
  }
  
  /**
   * Format minutes to time string
   */
  function formatTime(minutes, use24h = false) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (use24h) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } else {
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      const period = hours >= 12 ? 'PM' : 'AM';
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    }
  }
  
  /**
   * Calculate row end time
   */
  function calculateRowEndTime(row, scheduleStart) {
    const startMinutes = parseTime(scheduleStart);
    if (startMinutes === null) return null;
    
    const offset = row.offset || 0;
    const duration = row.duration || 0;
    
    return startMinutes + offset + duration;
  }
  
  /**
   * Get all rows that contain a specific tag
   */
  function getRowsWithTag(scheduleData, tagId) {
    const rows = [];
    
    if (!scheduleData?.days) return rows;
    
    scheduleData.days.forEach(day => {
      if (!day.rows) return;
      
      day.rows.forEach(row => {
        // Check if row has tags in c_tags column
        const tagsCell = row.custom?.c_tags;
        if (!tagsCell?.value) return;
        
        const tagIds = tagsCell.value.split(',').map(id => id.trim()).filter(Boolean);
        if (tagIds.includes(tagId)) {
          rows.push({
            ...row,
            dayId: day.id,
            dayNumber: day.dayNumber,
            date: day.date,
            scheduleStart: day.scheduleStart
          });
        }
      });
    });
    
    return rows;
  }
  
  /**
   * Validate hard out rule
   */
  function validateHardOut(tag, rowsWithTag) {
    const violations = [];
    if (!tag.rules?.hardOut) return violations;
    
    const hardOutMinutes = parseTime(tag.rules.hardOut);
    if (hardOutMinutes === null) return violations;
    
    rowsWithTag.forEach(row => {
      const rowEndMinutes = calculateRowEndTime(row, row.scheduleStart);
      if (rowEndMinutes === null) return;
      
      if (rowEndMinutes > hardOutMinutes) {
        violations.push({
          severity: 'critical',
          tagId: tag.id,
          tagLabel: tag.label,
          rowId: row.id,
          dayNumber: row.dayNumber,
          message: `${tag.label} scheduled past hard out (ends ${formatTime(rowEndMinutes)}, hard out ${tag.rules.hardOut})`,
          rule: 'hardOut'
        });
      }
    });
    
    return violations;
  }
  
  /**
   * Validate max hours rule
   */
  function validateMaxHours(tag, rowsWithTag) {
    const violations = [];
    if (!tag.rules?.maxHours) return violations;
    
    // Group by day
    const dayGroups = {};
    rowsWithTag.forEach(row => {
      if (!dayGroups[row.dayId]) {
        dayGroups[row.dayId] = {
          dayNumber: row.dayNumber,
          date: row.date,
          rows: [],
          totalMinutes: 0
        };
      }
      dayGroups[row.dayId].rows.push(row);
      dayGroups[row.dayId].totalMinutes += (row.duration || 0);
    });
    
    // Check each day
    Object.values(dayGroups).forEach(dayGroup => {
      const totalHours = dayGroup.totalMinutes / 60;
      if (totalHours > tag.rules.maxHours) {
        violations.push({
          severity: 'warning',
          tagId: tag.id,
          tagLabel: tag.label,
          dayNumber: dayGroup.dayNumber,
          message: `${tag.label} exceeds max hours on Day ${dayGroup.dayNumber} (${totalHours.toFixed(1)}hrs, max ${tag.rules.maxHours}hrs)`,
          rule: 'maxHours'
        });
      }
    });
    
    return violations;
  }
  
  /**
   * Validate meal break rule
   */
  function validateMealBreak(tag, rowsWithTag) {
    const violations = [];
    if (!tag.rules?.mealBreak) return violations;
    
    // Group by day and sort by time
    const dayGroups = {};
    rowsWithTag.forEach(row => {
      if (!dayGroups[row.dayId]) {
        dayGroups[row.dayId] = {
          dayNumber: row.dayNumber,
          date: row.date,
          scheduleStart: row.scheduleStart,
          rows: []
        };
      }
      dayGroups[row.dayId].rows.push(row);
    });
    
    // Check each day for continuous work blocks
    Object.values(dayGroups).forEach(dayGroup => {
      const sortedRows = dayGroup.rows.sort((a, b) => (a.offset || 0) - (b.offset || 0));
      
      let continuousMinutes = 0;
      let blockStart = null;
      
      for (let i = 0; i < sortedRows.length; i++) {
        const row = sortedRows[i];
        const rowStart = (row.offset || 0);
        const rowEnd = rowStart + (row.duration || 0);
        
        if (blockStart === null) {
          blockStart = rowStart;
          continuousMinutes = row.duration || 0;
        } else {
          const prevRow = sortedRows[i - 1];
          const prevEnd = (prevRow.offset || 0) + (prevRow.duration || 0);
          const gap = rowStart - prevEnd;
          
          // If gap > 30 minutes, consider it a break
          if (gap > 30) {
            // Check if previous block exceeded meal break threshold
            const blockHours = continuousMinutes / 60;
            if (blockHours > tag.rules.mealBreak) {
              violations.push({
                severity: 'warning',
                tagId: tag.id,
                tagLabel: tag.label,
                dayNumber: dayGroup.dayNumber,
                message: `${tag.label} worked ${blockHours.toFixed(1)}hrs without meal break on Day ${dayGroup.dayNumber} (max ${tag.rules.mealBreak}hrs)`,
                rule: 'mealBreak'
              });
            }
            
            // Start new block
            blockStart = rowStart;
            continuousMinutes = row.duration || 0;
          } else {
            // Continue current block
            continuousMinutes += (row.duration || 0);
          }
        }
      }
      
      // Check final block
      if (continuousMinutes > 0) {
        const blockHours = continuousMinutes / 60;
        if (blockHours > tag.rules.mealBreak) {
          violations.push({
            severity: 'warning',
            tagId: tag.id,
            tagLabel: tag.label,
            dayNumber: dayGroup.dayNumber,
            message: `${tag.label} worked ${blockHours.toFixed(1)}hrs without meal break on Day ${dayGroup.dayNumber} (max ${tag.rules.mealBreak}hrs)`,
            rule: 'mealBreak'
          });
        }
      }
    });
    
    return violations;
  }
  
  /**
   * Validate custom duration alerts
   */
  function validateCustomDurationAlerts(tag, rowsWithTag) {
    const violations = [];
    if (!tag.rules?.customAlerts) return violations;
    
    const durationAlerts = tag.rules.customAlerts.filter(a => a.type === 'duration' && a.threshold);
    
    durationAlerts.forEach(alert => {
      // Group by day
      const dayGroups = {};
      rowsWithTag.forEach(row => {
        if (!dayGroups[row.dayId]) {
          dayGroups[row.dayId] = {
            dayNumber: row.dayNumber,
            totalMinutes: 0
          };
        }
        dayGroups[row.dayId].totalMinutes += (row.duration || 0);
      });
      
      // Check each day
      Object.values(dayGroups).forEach(dayGroup => {
        const totalHours = dayGroup.totalMinutes / 60;
        if (totalHours > alert.threshold) {
          violations.push({
            severity: 'info',
            tagId: tag.id,
            tagLabel: tag.label,
            dayNumber: dayGroup.dayNumber,
            message: `${tag.label}: ${alert.description} (${totalHours.toFixed(1)}hrs, threshold ${alert.threshold}hrs)`,
            rule: 'customDuration',
            alertId: alert.id
          });
        }
      });
    });
    
    return violations;
  }
  
  /**
   * Get manual reminders for tag
   */
  function getManualReminders(tag) {
    const reminders = [];
    if (!tag.rules?.customAlerts) return reminders;
    
    const manualAlerts = tag.rules.customAlerts.filter(a => a.type === 'manual');
    
    manualAlerts.forEach(alert => {
      reminders.push({
        severity: 'info',
        tagId: tag.id,
        tagLabel: tag.label,
        message: `${tag.label}: ${alert.description}`,
        rule: 'manualReminder',
        alertId: alert.id
      });
    });
    
    return reminders;
  }
  
  /**
   * Validate entire schedule
   */
  function validateSchedule(scheduleData) {
    const allViolations = [];
    const allReminders = [];
    
    // Check all tags with rules
    Object.values(tags).forEach(tag => {
      if (!tag.rules) return;
      
      const rowsWithTag = getRowsWithTag(scheduleData, tag.id);
      if (rowsWithTag.length === 0) return;
      
      // Validate preset rules
      allViolations.push(...validateHardOut(tag, rowsWithTag));
      allViolations.push(...validateMaxHours(tag, rowsWithTag));
      allViolations.push(...validateMealBreak(tag, rowsWithTag));
      
      // Validate custom duration alerts
      allViolations.push(...validateCustomDurationAlerts(tag, rowsWithTag));
      
      // Get manual reminders
      allReminders.push(...getManualReminders(tag));
    });
    
    return {
      violations: allViolations,
      reminders: allReminders,
      criticalCount: allViolations.filter(v => v.severity === 'critical').length,
      warningCount: allViolations.filter(v => v.severity === 'warning').length,
      infoCount: allViolations.filter(v => v.severity === 'info').length,
      reminderCount: allReminders.length,
      timestamp: Date.now()
    };
  }

  /**
   * Get all tags for a column (for autocomplete)
   */
  function getColumnTags(columnKey) {
    const columnTagIds = columnTags[columnKey] || [];
    return columnTagIds.map(id => tags[id]).filter(Boolean);
  }

  /**
   * Get tag by ID
   */
  function getTag(tagId) {
    return tags[tagId] || null;
  }

  /**
   * Delete tag
   */
  function deleteTag(tagId) {
    const tag = tags[tagId];
    if (!tag) return;

    // Remove from column index
    if (columnTags[tag.columnKey]) {
      columnTags[tag.columnKey] = columnTags[tag.columnKey].filter(id => id !== tagId);
    }

    // Delete tag
    delete tags[tagId];
    saveTags();
    console.log('[TagSystem] Deleted tag:', tagId);
  }

  /**
   * Generate consistent color for tag label
   */
  function generateTagColor(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`;
  }

  /**
   * Search tags by partial label (for autocomplete)
   */
  function searchTags(query, columnKey) {
    const columnTagList = getColumnTags(columnKey);
    if (!query) return columnTagList;

    const lowerQuery = query.toLowerCase();
    return columnTagList.filter(tag => 
      tag.label.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  return {
    init,
    createTextTag,
    createImageTag,
    getTag,
    getColumnTags,
    searchTags,
    deleteTag,
    findTagByLabel,
    // Rule management
    setTagRules,
    getTagRules,
    addCustomAlert,
    removeCustomAlert,
    // Validation
    validateSchedule,
    // Constants
    RULE_TYPES,
    CUSTOM_ALERT_TYPES
  };
})();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TagSystem.init());
} else {
  TagSystem.init();
}

// ============================================================================
// TAG CELL UI SETUP
// ============================================================================

/**
 * Setup an enhanced tag cell with popup modal for tag entry
 * Call this after creating the basic tagsBox HTML structure
 */
TagSystem.setupTagCell = function(td, columnKey, initialTagIds = [], persistCallback = null) {
  console.log('[setupTagCell] FUNCTION CALLED, columnKey:', columnKey, 'initialTagIds:', initialTagIds);
  const box = td.querySelector('.tagsBox');
  console.log('[setupTagCell] Found box:', box);
  if (!box) return;

  const pills = box.querySelector('.tags-pills');
  const value = box.querySelector('.tags-value'); // Hidden textarea with comma-separated tag IDs

  let tagPopup = null;
  let popupInput = null;
  let autocompleteDropdown = null;
  let selectedIndex = -1;

  // Use provided persist callback or try to find global one
  const doPersist = persistCallback || (typeof window.persist === 'function' ? window.persist : () => {});

  // ============================================================================
  // RENDER TAG PILLS
  // ============================================================================
  
  function renderTags(tagIds) {
    pills.innerHTML = '';
    
    tagIds.forEach(tagId => {
      const tag = TagSystem.getTag(tagId);
      if (!tag) return;

      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.dataset.tagId = tagId;
      
      if (tag.type === 'image') {
        pill.classList.add('image-tag');
        
        // Get image from vault
        if (typeof window.vaultGet === 'function') {
          window.vaultGet(tag.vaultId).then(record => {
            if (record && record.data) {
              const url = URL.createObjectURL(record.data);
              const img = document.createElement('img');
              img.src = url;
              pill.prepend(img);
            }
          });
        }
      } else {
        // Text tag - add dummy circle to match image tag sizing
        pill.classList.add('image-tag');
        const dummy = document.createElement('span');
        dummy.className = 'tag-dummy-circle';
        pill.prepend(dummy);
        
        // Use color for background
        if (tag.color) {
          pill.style.backgroundColor = tag.color;
          pill.style.color = 'white';
          pill.style.borderColor = tag.color;
        }
      }

      const label = document.createElement('span');
      label.textContent = tag.label;
      pill.appendChild(label);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-x';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentIds = getCurrentTagIds();
        const newIds = currentIds.filter(id => id !== tagId);
        updateTagIds(newIds);
      });
      pill.appendChild(deleteBtn);

      // Make pill draggable
      pill.draggable = true;
      pill.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/tag-id', tagId);
        e.dataTransfer.effectAllowed = 'copy';
        pill.style.opacity = '0.5';
      });
      pill.addEventListener('dragend', () => {
        pill.style.opacity = '1';
      });

      pills.appendChild(pill);
    });
  }

  // ============================================================================
  // TAG ID MANAGEMENT
  // ============================================================================
  
  function getCurrentTagIds() {
    const val = value.value.trim();
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
  }

  function updateTagIds(tagIds) {
    value.value = tagIds.join(',');
    renderTags(tagIds);
    doPersist();
  }

  // ============================================================================
  // POPUP MODAL
  // ============================================================================
  
  function openTagPopup() {
    closeTagPopup(); // Close any existing popup

    // Create popup overlay
    tagPopup = document.createElement('div');
    tagPopup.className = 'tag-popup-overlay';
    
    // Create popup content
    const content = document.createElement('div');
    content.className = 'tag-popup-content';
    
    // Title
    const title = document.createElement('div');
    title.className = 'tag-popup-title';
    title.textContent = 'Add Tags';
    content.appendChild(title);
    
    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'tag-popup-input-wrapper';
    
    // Input field
    popupInput = document.createElement('input');
    popupInput.type = 'text';
    popupInput.className = 'tag-popup-input';
    popupInput.placeholder = 'Type to search or create tag...';
    inputWrapper.appendChild(popupInput);
    
    content.appendChild(inputWrapper);
    
    // Current tags display
    const currentTagsWrapper = document.createElement('div');
    currentTagsWrapper.className = 'tag-popup-pills-wrapper';
    const currentPillsContainer = document.createElement('div');
    currentPillsContainer.className = 'tags-pills';
    currentTagsWrapper.appendChild(currentPillsContainer);
    content.appendChild(currentTagsWrapper);
    
    // Render current tags in popup
    const currentIds = getCurrentTagIds();
    currentIds.forEach(tagId => {
      const tag = TagSystem.getTag(tagId);
      if (!tag) return;

      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.dataset.tagId = tagId;
      
      if (tag.type === 'image') {
        pill.classList.add('image-tag');
        if (typeof window.vaultGet === 'function') {
          window.vaultGet(tag.vaultId).then(record => {
            if (record && record.data) {
              const url = URL.createObjectURL(record.data);
              const img = document.createElement('img');
              img.src = url;
              pill.prepend(img);
            }
          });
        }
      } else {
        // Text tag - add dummy circle to match image tag sizing
        pill.classList.add('image-tag');
        const dummy = document.createElement('span');
        dummy.className = 'tag-dummy-circle';
        pill.prepend(dummy);
        
        if (tag.color) {
          pill.style.backgroundColor = tag.color;
          pill.style.color = 'white';
          pill.style.borderColor = tag.color;
        }
      }

      const label = document.createElement('span');
      label.textContent = tag.label;
      pill.appendChild(label);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-x';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ids = getCurrentTagIds();
        const newIds = ids.filter(id => id !== tagId);
        updateTagIds(newIds);
        pill.remove();
      });
      pill.appendChild(deleteBtn);

      currentPillsContainer.appendChild(pill);
    });
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tag-popup-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeTagPopup);
    content.appendChild(closeBtn);
    
    tagPopup.appendChild(content);
    document.body.appendChild(tagPopup);
    
    // Focus input
    setTimeout(() => popupInput.focus(), 10);
    
    // Setup event listeners
    setupPopupListeners();
  }

  function closeTagPopup() {
    if (tagPopup) {
      tagPopup.remove();
      tagPopup = null;
      popupInput = null;
    }
    hideAutocomplete();
  }

  function setupPopupListeners() {
    // Input handlers
    popupInput.addEventListener('input', () => {
      const query = popupInput.value.trim();
      if (query.length > 0) {
        showAutocomplete(query);
      } else {
        hideAutocomplete();
      }
    });

    popupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (autocompleteDropdown && selectedIndex >= 0) {
          // Select highlighted autocomplete item
          const items = autocompleteDropdown.querySelectorAll('.tag-autocomplete-item');
          if (items[selectedIndex]) {
            const tagId = items[selectedIndex].dataset.tagId;
            selectTag(tagId);
          }
        } else if (popupInput.value.trim()) {
          // Create new text tag
          const label = popupInput.value.trim();
          const tagId = TagSystem.createTextTag(label, columnKey);
          selectTag(tagId);
        }
      } else if (e.key === 'ArrowDown' && autocompleteDropdown) {
        e.preventDefault();
        const items = autocompleteDropdown.querySelectorAll('.tag-autocomplete-item');
        if (selectedIndex < items.length - 1) {
          if (selectedIndex >= 0) items[selectedIndex].classList.remove('selected');
          selectedIndex++;
          items[selectedIndex].classList.add('selected');
          items[selectedIndex].scrollIntoView({block: 'nearest'});
        }
      } else if (e.key === 'ArrowUp' && autocompleteDropdown) {
        e.preventDefault();
        const items = autocompleteDropdown.querySelectorAll('.tag-autocomplete-item');
        if (selectedIndex > 0) {
          items[selectedIndex].classList.remove('selected');
          selectedIndex--;
          items[selectedIndex].classList.add('selected');
          items[selectedIndex].scrollIntoView({block: 'nearest'});
        }
      } else if (e.key === 'Escape') {
        closeTagPopup();
      }
    });

    // Image drop support
    popupInput.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      popupInput.classList.add('dragging-over');
    });

    popupInput.addEventListener('dragleave', () => {
      popupInput.classList.remove('dragging-over');
    });

    popupInput.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      popupInput.classList.remove('dragging-over');

      // Check if dropping an existing tag
      const tagId = e.dataTransfer.getData('text/tag-id');
      if (tagId) {
        selectTag(tagId);
        return;
      }

      // Check if dropping an image file
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        const imageFile = files[0];
        
        // Prompt for name
        const name = prompt('Enter name for this image tag:');
        if (!name || !name.trim()) return;

        try {
          const tagId = await TagSystem.createImageTag(imageFile, name.trim(), columnKey);
          selectTag(tagId);
        } catch (error) {
          alert('Failed to create image tag: ' + error.message);
        }
      }
    });

    // Close on overlay click
    tagPopup.addEventListener('click', (e) => {
      if (e.target === tagPopup) {
        closeTagPopup();
      }
    });
  }

  // ============================================================================
  // AUTOCOMPLETE
  // ============================================================================
  
  function showAutocomplete(query) {
    hideAutocomplete();

    const matches = TagSystem.searchTags(query, columnKey);
    if (matches.length === 0) return;

    autocompleteDropdown = document.createElement('div');
    autocompleteDropdown.className = 'tag-autocomplete';

    matches.forEach((tag, index) => {
      const item = document.createElement('div');
      item.className = 'tag-autocomplete-item';
      item.dataset.tagId = tag.id;
      if (index === 0) {
        item.classList.add('selected');
        selectedIndex = 0;
      }

      if (tag.type === 'image' && typeof window.vaultGet === 'function') {
        window.vaultGet(tag.vaultId).then(record => {
          if (record && record.data) {
            const url = URL.createObjectURL(record.data);
            const img = document.createElement('img');
            img.src = url;
            item.prepend(img);
          }
        });
      }

      const labelSpan = document.createElement('span');
      labelSpan.className = 'tag-label';
      labelSpan.textContent = tag.label;
      item.appendChild(labelSpan);

      const typeSpan = document.createElement('span');
      typeSpan.className = 'tag-type';
      typeSpan.textContent = tag.type;
      item.appendChild(typeSpan);

      item.addEventListener('click', () => {
        selectTag(tag.id);
      });

      autocompleteDropdown.appendChild(item);
    });

    // Position dropdown below input
    const inputWrapper = tagPopup.querySelector('.tag-popup-input-wrapper');
    inputWrapper.appendChild(autocompleteDropdown);
  }

  function hideAutocomplete() {
    if (autocompleteDropdown) {
      autocompleteDropdown.remove();
      autocompleteDropdown = null;
      selectedIndex = -1;
    }
  }

  function selectTag(tagId) {
    const currentIds = getCurrentTagIds();
    if (!currentIds.includes(tagId)) {
      currentIds.push(tagId);
      updateTagIds(currentIds);
      
      // Add pill to popup display
      const tag = TagSystem.getTag(tagId);
      if (tag) {
        const currentPillsContainer = tagPopup.querySelector('.tags-pills');
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.dataset.tagId = tagId;
        
        if (tag.type === 'image') {
          pill.classList.add('image-tag');
          if (typeof window.vaultGet === 'function') {
            window.vaultGet(tag.vaultId).then(record => {
              if (record && record.data) {
                const url = URL.createObjectURL(record.data);
                const img = document.createElement('img');
                img.src = url;
                pill.prepend(img);
              }
            });
          }
        } else {
          // Text tag - add dummy circle to match image tag sizing
          pill.classList.add('image-tag');
          const dummy = document.createElement('span');
          dummy.className = 'tag-dummy-circle';
          pill.prepend(dummy);
          
          if (tag.color) {
            pill.style.backgroundColor = tag.color;
            pill.style.color = 'white';
            pill.style.borderColor = tag.color;
          }
        }

        const label = document.createElement('span');
        label.textContent = tag.label;
        pill.appendChild(label);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tag-x';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const ids = getCurrentTagIds();
          const newIds = ids.filter(id => id !== tagId);
          updateTagIds(newIds);
          pill.remove();
        });
        pill.appendChild(deleteBtn);

        currentPillsContainer.appendChild(pill);
      }
    }
    popupInput.value = '';
    hideAutocomplete();
  }

  // ============================================================================
  // CLICK HANDLER TO OPEN POPUP
  // ============================================================================
  
  // Remove any existing overlay first (in case setupTagCell is called multiple times)
  const existingOverlay = box.querySelector('.tags-add-overlay');
  if (existingOverlay) {
    console.log('[Tags Overlay] Removing existing overlay');
    existingOverlay.remove();
  }
  
  // Add clickable overlay for empty cells
  const addOverlay = document.createElement('div');
  addOverlay.className = 'tags-add-overlay';
  addOverlay.addEventListener('click', (e) => {
    console.log('[Tags Overlay] Clicked!');
    e.stopPropagation();
    openTagPopup();
  });
  box.appendChild(addOverlay);
  console.log('[Tags Overlay] Created and appended to box');
  
  // Show/hide overlay based on whether cell has tags
  const updateOverlay = () => {
    const hasTags = pills.querySelectorAll('.tag-pill').length > 0;
    console.log('[Tags Overlay] updateOverlay called, hasTags:', hasTags, 'pill count:', pills.querySelectorAll('.tag-pill').length);
    console.log('[Tags Overlay] Overlay element:', addOverlay, 'classList before:', Array.from(addOverlay.classList));
    if (hasTags) {
      addOverlay.classList.remove('visible');
      console.log('[Tags Overlay] Hidden (has tags), classList after:', Array.from(addOverlay.classList));
    } else {
      addOverlay.classList.add('visible');
      console.log('[Tags Overlay] Visible (empty), classList after:', Array.from(addOverlay.classList));
    }
  };
  
  // Wrap original renderTags to update overlay
  const originalRenderTags = renderTags;
  renderTags = function(tagIds) {
    console.log('[Tags Overlay] Wrapped renderTags called with:', tagIds);
    originalRenderTags(tagIds);
    updateOverlay();
  };
  
  updateOverlay();

  // Initial render and set value
  value.value = initialTagIds.join(',');
  renderTags(initialTagIds);
};

// ============================================================================
// TAG RULES EDITOR
// ============================================================================

const TagRulesEditor = (function() {
  'use strict';
  
  let editorElement = null;
  let currentTagId = null;
  
  /**
   * Initialize editor
   */
  function init() {
    createEditor();
    console.log('[TagRulesEditor] Initialized');
  }
  
  /**
   * Create editor modal
   */
  function createEditor() {
    editorElement = document.createElement('div');
    editorElement.id = 'tag-rules-editor';
    editorElement.className = 'tag-rules-editor';
    editorElement.innerHTML = `
      <div class="tag-rules-modal">
        <div class="tag-rules-header">
          <h3>Tag Rules & Alerts</h3>
          <button class="tag-rules-close">×</button>
        </div>
        <div class="tag-rules-body">
          <div class="tag-rules-info">
            <strong id="tag-rules-label"></strong>
          </div>
          
          <div class="tag-rules-section">
            <h4>Preset Rules</h4>
            <div class="tag-rules-preset">
              <label>
                <span>Hard Out</span>
                <input type="time" id="rule-hardOut" />
                <small>Must wrap by this time</small>
              </label>
              <label>
                <span>Max Hours</span>
                <input type="number" id="rule-maxHours" min="0" step="0.5" placeholder="e.g., 8" />
                <small>Maximum work hours (triggers OT warning)</small>
              </label>
              <label>
                <span>Meal Break After</span>
                <input type="number" id="rule-mealBreak" min="0" step="0.5" placeholder="e.g., 6" />
                <small>Hours of continuous work before meal break required</small>
              </label>
            </div>
          </div>
          
          <div class="tag-rules-section">
            <h4>Custom Alerts</h4>
            <div class="tag-rules-custom-list" id="custom-alerts-list"></div>
            <button class="tag-rules-add-custom" id="add-custom-alert">+ Add Custom Alert</button>
          </div>
        </div>
        <div class="tag-rules-footer">
          <button class="tag-rules-cancel">Cancel</button>
          <button class="tag-rules-save">Save Rules</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(editorElement);
    
    // Event listeners
    editorElement.querySelector('.tag-rules-close').addEventListener('click', close);
    editorElement.querySelector('.tag-rules-cancel').addEventListener('click', close);
    editorElement.querySelector('.tag-rules-save').addEventListener('click', save);
    editorElement.querySelector('#add-custom-alert').addEventListener('click', addCustomAlertRow);
    editorElement.addEventListener('click', (e) => {
      if (e.target === editorElement) close();
    });
  }
  
  /**
   * Open editor for a tag
   */
  function open(tagId) {
    const tag = TagSystem.getTag(tagId);
    if (!tag) {
      console.error('[TagRulesEditor] Tag not found:', tagId);
      return;
    }
    
    currentTagId = tagId;
    
    // Set tag label
    document.getElementById('tag-rules-label').textContent = tag.label;
    
    // Load existing rules
    const rules = TagSystem.getTagRules(tagId) || {};
    document.getElementById('rule-hardOut').value = rules.hardOut || '';
    document.getElementById('rule-maxHours').value = rules.maxHours || '';
    document.getElementById('rule-mealBreak').value = rules.mealBreak || '';
    
    // Load custom alerts
    renderCustomAlerts(rules.customAlerts || []);
    
    editorElement.classList.add('open');
  }
  
  /**
   * Close editor
   */
  function close() {
    editorElement.classList.remove('open');
    currentTagId = null;
  }
  
  /**
   * Render custom alerts list
   */
  function renderCustomAlerts(alerts) {
    const list = document.getElementById('custom-alerts-list');
    list.innerHTML = '';
    
    alerts.forEach((alert, index) => {
      const row = document.createElement('div');
      row.className = 'custom-alert-row';
      row.innerHTML = `
        <div class="custom-alert-fields">
          <input type="text" 
                 class="custom-alert-desc" 
                 placeholder="Alert description" 
                 value="${alert.description || ''}" 
                 data-index="${index}" />
          <select class="custom-alert-type" data-index="${index}">
            <option value="manual" ${alert.type === 'manual' ? 'selected' : ''}>Manual Reminder</option>
            <option value="duration" ${alert.type === 'duration' ? 'selected' : ''}>Duration Alert</option>
          </select>
          <input type="number" 
                 class="custom-alert-threshold" 
                 placeholder="Hours" 
                 min="0" 
                 step="0.5"
                 value="${alert.threshold || ''}" 
                 data-index="${index}"
                 ${alert.type === 'manual' ? 'disabled' : ''} />
          <button class="custom-alert-remove" data-index="${index}">×</button>
        </div>
      `;
      list.appendChild(row);
    });
    
    // Add event listeners
    list.querySelectorAll('.custom-alert-type').forEach(select => {
      select.addEventListener('change', (e) => {
        const threshold = list.querySelector(`.custom-alert-threshold[data-index="${e.target.dataset.index}"]`);
        threshold.disabled = e.target.value === 'manual';
        if (e.target.value === 'manual') threshold.value = '';
      });
    });
    
    list.querySelectorAll('.custom-alert-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        removeCustomAlert(index);
      });
    });
  }
  
  /**
   * Add new custom alert row
   */
  function addCustomAlertRow() {
    const rules = TagSystem.getTagRules(currentTagId) || {};
    const alerts = rules.customAlerts || [];
    alerts.push({ description: '', type: 'manual', threshold: null });
    renderCustomAlerts(alerts);
  }
  
  /**
   * Remove custom alert
   */
  function removeCustomAlert(index) {
    const rules = TagSystem.getTagRules(currentTagId) || {};
    const alerts = rules.customAlerts || [];
    alerts.splice(index, 1);
    renderCustomAlerts(alerts);
  }
  
  /**
   * Save rules
   */
  function save() {
    if (!currentTagId) return;
    
    // Collect preset rules
    const hardOut = document.getElementById('rule-hardOut').value;
    const maxHours = document.getElementById('rule-maxHours').value;
    const mealBreak = document.getElementById('rule-mealBreak').value;
    
    // Collect custom alerts
    const customAlerts = [];
    document.querySelectorAll('.custom-alert-row').forEach(row => {
      const desc = row.querySelector('.custom-alert-desc').value.trim();
      const type = row.querySelector('.custom-alert-type').value;
      const threshold = row.querySelector('.custom-alert-threshold').value;
      
      if (desc) {
        customAlerts.push({
          id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          description: desc,
          type: type,
          threshold: threshold ? parseFloat(threshold) : null
        });
      }
    });
    
    // Build rules object
    const rules = {};
    if (hardOut) rules.hardOut = hardOut;
    if (maxHours) rules.maxHours = parseFloat(maxHours);
    if (mealBreak) rules.mealBreak = parseFloat(mealBreak);
    if (customAlerts.length > 0) rules.customAlerts = customAlerts;
    
    // Save
    TagSystem.setTagRules(currentTagId, rules);
    console.log('[TagRulesEditor] Saved rules:', rules);
    
    // Refresh tag manager display if it exists
    if (window.TagManager && window.TagManager.renderDatabase) {
      window.TagManager.renderDatabase();
    }
    
    close();
  }
  
  return {
    init,
    open,
    close
  };
})();

// Initialize rules editor on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TagRulesEditor.init());
} else {
  TagRulesEditor.init();
}

// Expose globally
window.TagRulesEditor = TagRulesEditor;

// ============================================================================
// ALERT DASHBOARD
// ============================================================================

const AlertDashboard = (function() {
  'use strict';
  
  let dashboardElement = null;
  let fabElement = null;
  let isOpen = false;
  let liveMode = false;
  let validationInterval = null;
  
  /**
   * Initialize dashboard
   */
  function init() {
    createFAB();
    createDashboard();
    console.log('[AlertDashboard] Initialized');
  }
  
  /**
   * Create FAB button
   */
  function createFAB() {
    fabElement = document.createElement('button');
    fabElement.id = 'alert-fab';
    fabElement.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span class="alert-badge" style="display: none;">0</span>
    `;
    fabElement.addEventListener('click', toggle);
    document.body.appendChild(fabElement);
  }
  
  /**
   * Create dashboard panel
   */
  function createDashboard() {
    dashboardElement = document.createElement('div');
    dashboardElement.id = 'alert-dashboard';
    dashboardElement.className = 'alert-dashboard';
    dashboardElement.innerHTML = `
      <div class="alert-dashboard-header">
        <h3>Schedule Alerts</h3>
        <div class="alert-dashboard-controls">
          <label class="alert-live-toggle">
            <input type="checkbox" id="alert-live-mode">
            <span>Live Mode</span>
          </label>
          <button id="alert-check-btn" class="alert-check-btn">Check Schedule</button>
          <button id="alert-close-btn" class="alert-close-btn">×</button>
        </div>
      </div>
      <div class="alert-dashboard-body">
        <div class="alert-summary">
          <div class="alert-stat critical">
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Critical</span>
          </div>
          <div class="alert-stat warning">
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Warnings</span>
          </div>
          <div class="alert-stat info">
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Info</span>
          </div>
          <div class="alert-stat reminder">
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Reminders</span>
          </div>
        </div>
        <div class="alert-list"></div>
      </div>
    `;
    
    document.body.appendChild(dashboardElement);
    
    // Event listeners
    document.getElementById('alert-close-btn').addEventListener('click', close);
    document.getElementById('alert-check-btn').addEventListener('click', runValidation);
    document.getElementById('alert-live-mode').addEventListener('change', toggleLiveMode);
  }
  
  /**
   * Toggle dashboard
   */
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }
  
  /**
   * Open dashboard
   */
  function open() {
    isOpen = true;
    dashboardElement.classList.add('open');
    fabElement.classList.add('active');
    runValidation();
  }
  
  /**
   * Close dashboard
   */
  function close() {
    isOpen = false;
    dashboardElement.classList.remove('open');
    fabElement.classList.remove('active');
  }
  
  /**
   * Toggle live mode
   */
  function toggleLiveMode(e) {
    liveMode = e.target.checked;
    
    if (liveMode) {
      console.log('[AlertDashboard] Live mode enabled');
      // Run validation every 5 seconds
      validationInterval = setInterval(runValidation, 5000);
      runValidation(); // Immediate check
    } else {
      console.log('[AlertDashboard] Live mode disabled');
      if (validationInterval) {
        clearInterval(validationInterval);
        validationInterval = null;
      }
    }
  }
  
  /**
   * Run validation
   */
  function runValidation() {
    // Get schedule data from global state
    const scheduleData = window.getScheduleData ? window.getScheduleData() : null;
    
    if (!scheduleData) {
      console.warn('[AlertDashboard] No schedule data available');
      return;
    }
    
    const results = TagSystem.validateSchedule(scheduleData);
    displayResults(results);
    updateFABBadge(results);
  }
  
  /**
   * Display validation results
   */
  function displayResults(results) {
    // Update summary stats
    document.querySelector('.alert-stat.critical .alert-stat-count').textContent = results.criticalCount;
    document.querySelector('.alert-stat.warning .alert-stat-count').textContent = results.warningCount;
    document.querySelector('.alert-stat.info .alert-stat-count').textContent = results.infoCount;
    document.querySelector('.alert-stat.reminder .alert-stat-count').textContent = results.reminderCount;
    
    // Display violations
    const listEl = document.querySelector('.alert-list');
    listEl.innerHTML = '';
    
    if (results.violations.length === 0 && results.reminders.length === 0) {
      listEl.innerHTML = '<div class="alert-empty">✓ No issues found</div>';
      return;
    }
    
    // Group by severity
    const groups = {
      critical: results.violations.filter(v => v.severity === 'critical'),
      warning: results.violations.filter(v => v.severity === 'warning'),
      info: results.violations.filter(v => v.severity === 'info'),
      reminder: results.reminders
    };
    
    // Render each group
    Object.entries(groups).forEach(([severity, items]) => {
      if (items.length === 0) return;
      
      const groupEl = document.createElement('div');
      groupEl.className = `alert-group alert-group-${severity}`;
      
      const headerEl = document.createElement('div');
      headerEl.className = 'alert-group-header';
      headerEl.textContent = `${severity.charAt(0).toUpperCase() + severity.slice(1)} (${items.length})`;
      groupEl.appendChild(headerEl);
      
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'alert-item';
        itemEl.innerHTML = `
          <div class="alert-item-icon">${getIcon(severity)}</div>
          <div class="alert-item-content">
            <div class="alert-item-message">${item.message}</div>
            ${item.dayNumber ? `<div class="alert-item-meta">Day ${item.dayNumber}</div>` : ''}
          </div>
        `;
        groupEl.appendChild(itemEl);
      });
      
      listEl.appendChild(groupEl);
    });
  }
  
  /**
   * Get icon for severity
   */
  function getIcon(severity) {
    const icons = {
      critical: '🔴',
      warning: '⚠️',
      info: 'ℹ️',
      reminder: '📌'
    };
    return icons[severity] || '•';
  }
  
  /**
   * Update FAB badge
   */
  function updateFABBadge(results) {
    const badge = fabElement.querySelector('.alert-badge');
    const totalIssues = results.criticalCount + results.warningCount;
    
    if (totalIssues > 0) {
      badge.textContent = totalIssues;
      badge.style.display = 'block';
      fabElement.classList.add('has-alerts');
    } else {
      badge.style.display = 'none';
      fabElement.classList.remove('has-alerts');
    }
  }
  
  return {
    init,
    open,
    close,
    runValidation
  };
})();

// Initialize dashboard on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AlertDashboard.init());
} else {
  AlertDashboard.init();
}

// Expose globally
window.AlertDashboard = AlertDashboard;

