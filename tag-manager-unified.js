// UNIFIED TAG MANAGER
// Single source of truth for all tag operations:
// - Database UI for managing tags
// - Cell rendering and interaction
// - Drag-drop between database and cells
// - Autocomplete in cells
// - Local-first storage with cloud sync

const TagManager = {
  // ============================================================================
  // STATE
  // ============================================================================
  
  tags: {},           // {tagId: {id, label, type, vaultId, imageUrl, cropX, cropY, cropRadius, height}}
  columnTags: {},     // {columnKey: [tagId, ...]} - for autocomplete
  currentEditId: null,
  cropCanvas: null,
  cropCtx: null,
  cropState: { x: 0.5, y: 0.5, radius: 0.3 },
  draggedTag: null,
  uploadedFile: null,
  cropImage: null,
  currentColumnKey: null,  // Set when dropping image into cell
  currentTargetBox: null,  // Set when dropping image into cell
  
  STORAGE_KEY: 'tagObjects_v1',

  // ============================================================================
  // UTILITY: GET CONTRASTING TEXT COLOR
  // ============================================================================

  getContrastColor(hexColor) {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  },
  
  // ============================================================================
  // UTILITY: TIME FORMAT
  // ============================================================================
  
  getTimeFormat() {
    return localStorage.getItem('timeFormat') || '12h';
  },
  
  formatHardOutForDisplay(hardOut) {
    if (!hardOut) return '';
    
    const format = this.getTimeFormat();
    
    // If it's already in the correct format, return as-is
    if (format === '12h' && /AM|PM/i.test(hardOut)) return hardOut;
    if (format === '24h' && !/AM|PM/i.test(hardOut)) return hardOut;
    
    // Need to convert
    if (format === '12h') {
      // Convert 24h to 12h (e.g., "15:00" → "3:00 PM")
      const [h, m] = hardOut.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
    } else {
      // Convert 12h to 24h (e.g., "3:00 PM" → "15:00")
      const match = hardOut.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
      if (!match) return hardOut; // Invalid format, return as-is
      
      let [, h, m, period] = match;
      h = parseInt(h);
      m = parseInt(m || 0);
      
      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;
      
      return `${h}:${String(m).padStart(2, '0')}`;
    }
  },

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  init() {
    console.log('[TagManager] Init');
    this.loadTags();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupUI();
        this.attachEventListeners();
      });
    } else {
      this.setupUI();
      this.attachEventListeners();
    }
  },

  // ============================================================================
  // HELPER: RENDER TAGS IN A CELL
  // ============================================================================
  
  async renderTagsInCell(pillsContainer, tagIds) {
    const uniqueTagIds = [...new Set(tagIds.filter(Boolean))]; // Deduplicate
    console.log('[renderTagsInCell] Rendering tags:', uniqueTagIds);
    pillsContainer.innerHTML = '';
    
    for (const tagId of uniqueTagIds) {
      const tag = this.getTag(tagId);
      if (!tag) continue;

      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.dataset.tagId = tagId;
      
      if (tag.type === 'image') {
        pill.classList.add('image-tag');
        
        // Load image from vault or URL
        let imageUrl = tag.imageUrl;
        if (!imageUrl && tag.vaultId && window.vaultGet) {
          try {
            const record = await window.vaultGet(tag.vaultId);
            if (record && record.data) {
              imageUrl = URL.createObjectURL(record.data);
            }
          } catch (e) {
            console.error('[TagManager] Failed to load vault image:', e);
          }
        }
        
        if (imageUrl) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.draggable = false; // Prevent img from interfering with parent drag
          pill.prepend(img);
        }
        
        // Apply background color and contrasting text for image tags too
        if (tag.color) {
          pill.style.backgroundColor = tag.color;
          pill.style.color = this.getContrastColor(tag.color);
          pill.style.borderColor = tag.color;
        }
      } else {
        // Text tag - use color
        if (tag.color) {
          pill.style.backgroundColor = tag.color;
          pill.style.color = this.getContrastColor(tag.color);
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
        
        // Find the tagsBox and value input
        const tagsBox = pillsContainer.closest('.tagsBox');
        const value = tagsBox ? tagsBox.querySelector('.tags-value') : null;
        
        if (value) {
          // Remove this tag ID from the value
          const currentIds = value.value.split(',').filter(id => id.trim());
          const newIds = currentIds.filter(id => id !== tagId);
          value.value = newIds.join(',');
          
          // Call persist if available
          if (window.persist) {
            window.persist();
          }
          
          // Re-render
          this.renderTagsInCell(pillsContainer, newIds);
          
          // Update overlay visibility
          const addOverlay = tagsBox.querySelector('.tags-add-overlay');
          if (addOverlay) {
            if (newIds.length === 0) {
              addOverlay.classList.add('visible');
            } else {
              addOverlay.classList.remove('visible');
            }
          }
        }
      });
      pill.appendChild(deleteBtn);

      // Double-click to edit tag
      pill.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.editTag(tagId);
      });

      // Make pill draggable
      pill.draggable = true;
      pill.addEventListener('dragstart', (e) => {
        console.log('[TagManager] Dragstart fired for tag ID:', tagId);
        e.dataTransfer.setData('text/tag-id', tagId);
        e.dataTransfer.effectAllowed = 'copy';
        pill.style.opacity = '0.5';
      });
      pill.addEventListener('dragend', () => {
        console.log('[TagManager] Dragend fired');
        pill.style.opacity = '1';
      });

      pillsContainer.appendChild(pill);
    }
  },

  // ============================================================================
  // STORAGE
  // ============================================================================

  loadTags() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.tags = data.tags || {};
        this.columnTags = data.columnTags || {};
        
        // Ensure all tags have colors (fix for existing tags without colors)
        let needsSave = false;
        Object.values(this.tags).forEach(tag => {
          if (!tag.color) {
            tag.color = this.generateTagColor(tag.label);
            needsSave = true;
          }
        });
        
        // Clean up any duplicate tag IDs in columnTags
        let hadDuplicates = false;
        Object.keys(this.columnTags).forEach(columnKey => {
          const original = this.columnTags[columnKey];
          const cleaned = [...new Set(original)];
          if (original.length !== cleaned.length) {
            hadDuplicates = true;
          }
          this.columnTags[columnKey] = cleaned;
        });
        
        // Save if we added colors or removed duplicates
        if (needsSave || hadDuplicates) {
          console.log('[TagManager] Updated tags (added colors or removed duplicates), saving');
          this.saveTags();
        }
      }
      console.log('[TagManager] Loaded', Object.keys(this.tags).length, 'tags');
    } catch (e) {
      console.error('[TagManager] Load error:', e);
    }
  },

  saveTags() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        tags: this.tags,
        columnTags: this.columnTags
      }));
    } catch (e) {
      console.error('[TagManager] Save error:', e);
    }
  },

  // ============================================================================
  // TAG CRUD OPERATIONS
  // ============================================================================

  createTextTag(label, columnKey, color = null) {
    // Check if tag already exists in this column
    const existing = this.findTagByLabel(label, columnKey);
    if (existing) return existing.id;

    const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.tags[id] = {
      id,
      label: label.trim(),
      type: 'text',
      columnKey,
      color: color || this.generateTagColor(label),
      created: Date.now()
    };

    // Add to column index (only if not already there)
    if (!this.columnTags[columnKey]) this.columnTags[columnKey] = [];
    if (!this.columnTags[columnKey].includes(id)) {
      this.columnTags[columnKey].push(id);
    }

    this.saveTags();
    console.log('[TagManager] Created text tag:', this.tags[id]);
    return id;
  },

  async createImageTag(imageFile, label, columnKey, cropState = null) {
    try {
      // Store in vault
      const vaultId = await window.vaultPut(imageFile);
      console.log('[TagManager] Stored in vault:', vaultId);
      
      // Try cloud upload if authenticated
      let imageUrl = null;
      if (window.SupabaseAPI?.auth?.isAuthenticated()) {
        try {
          const result = await window.SupabaseAPI.storage.uploadImage(imageFile, 'tags/');
          if (result.success) {
            imageUrl = result.url;
            console.log('[TagManager] Also uploaded to Supabase:', imageUrl);
          }
        } catch (err) {
          console.warn('[TagManager] Supabase upload failed (continuing with local):', err);
        }
      }
      
      const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.tags[id] = {
        id,
        label: label.trim(),
        type: 'image',
        vaultId,
        imageUrl,
        columnKey,
        cropX: cropState?.x || 0.5,
        cropY: cropState?.y || 0.5,
        cropRadius: cropState?.radius || 0.3,
        height: 80,
        color: this.generateTagColor(label), // Ensure all tags have a color
        created: Date.now()
      };

      // Add to column index (only if not already there)
      if (!this.columnTags[columnKey]) this.columnTags[columnKey] = [];
      if (!this.columnTags[columnKey].includes(id)) {
        this.columnTags[columnKey].push(id);
      }

      this.saveTags();
      console.log('[TagManager] Created image tag:', this.tags[id]);
      return id;
    } catch (error) {
      console.error('[TagManager] Image tag creation error:', error);
      throw error;
    }
  },

  getTag(tagId) {
    return this.tags[tagId] || null;
  },

  getColumnTags(columnKey) {
    const columnTagIds = this.columnTags[columnKey] || [];
    return columnTagIds.map(id => this.tags[id]).filter(Boolean);
  },

  findTagByLabel(label, columnKey) {
    const columnTagIds = this.columnTags[columnKey] || [];
    for (const tagId of columnTagIds) {
      const tag = this.tags[tagId];
      if (tag && tag.label.toLowerCase() === label.toLowerCase()) {
        return tag;
      }
    }
    return null;
  },

  searchTags(query, columnKey) {
    const columnTagList = this.getColumnTags(columnKey);
    if (!query) return columnTagList;

    const lowerQuery = query.toLowerCase();
    return columnTagList.filter(tag => 
      tag.label.toLowerCase().includes(lowerQuery)
    );
  },

  generateTagColor(label) {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`;
  },

  getScheduleEventsOptions(selectedEvent) {
    // Get all schedule events from the current schedule
    console.log('[getScheduleEventsOptions] Called with selectedEvent:', selectedEvent);
    
    if (!window.getScheduleData) {
      console.warn('[getScheduleEventsOptions] window.getScheduleData not available');
      return '<option value="">No events available</option>';
    }
    
    const scheduleData = window.getScheduleData();
    console.log('[getScheduleEventsOptions] Schedule data:', scheduleData);
    
    if (!scheduleData || !scheduleData.days) {
      console.warn('[getScheduleEventsOptions] No schedule data or days');
      return '<option value="">No schedule loaded</option>';
    }
    
    // Get user's preferred label column
    const labelColumn = localStorage.getItem('eventLabelColumn') || null;
    console.log('[getScheduleEventsOptions] Using label column:', labelColumn);
    
    const events = [];
    scheduleData.days.forEach(day => {
      if (day.rows) {
        day.rows.forEach((row, rowIndex) => {
          // Get label using fallback hierarchy
          let eventLabel = this.getRowLabel(row, labelColumn);
          
          // Include any row with a label and a type
          if (eventLabel && row.type) {
            const eventId = `${day.id}-${row.id}`;
            const rowNumber = rowIndex + 1;
            
            // Format: "#1 | SET UP"
            events.push({
              id: eventId,
              label: `#${rowNumber} | ${eventLabel}`,
              day: day.dayNumber,
              type: row.type,
              rowNumber: rowNumber
            });
          }
        });
      }
    });
    
    console.log('[getScheduleEventsOptions] Found events:', events);
    
    if (events.length === 0) {
      return '<option value="">No events in schedule</option>';
    }
    
    // Group by day
    const dayGroups = {};
    events.forEach(evt => {
      if (!dayGroups[evt.day]) dayGroups[evt.day] = [];
      dayGroups[evt.day].push(evt);
    });
    
    // Build HTML options
    let html = '';
    Object.keys(dayGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(dayNum => {
      html += `<optgroup label="Day ${dayNum}">`;
      dayGroups[dayNum].forEach(evt => {
        const selected = selectedEvent === evt.id ? 'selected' : '';
        html += `<option value="${evt.id}" ${selected}>${evt.label}</option>`;
      });
      html += `</optgroup>`;
    });
    
    console.log('[getScheduleEventsOptions] Generated HTML length:', html.length);
    return html;
  },
  
  /**
   * Get label for a row using fallback hierarchy
   */
  getRowLabel(row, preferredColumn = null) {
    // 1. Try user's preferred column first
    if (preferredColumn && row.custom && row.custom[preferredColumn]) {
      const value = row.custom[preferredColumn].value || row.custom[preferredColumn];
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    
    // 2. Try row.title
    if (row.title && row.title.trim()) {
      return row.title.trim();
    }
    
    // 3. Try first non-empty custom column
    if (row.custom) {
      for (const key in row.custom) {
        const value = row.custom[key]?.value || row.custom[key];
        if (value && typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
    
    // 4. Fall back to row type
    return row.type || 'Unnamed';
  },

  // ============================================================================
  // CELL INTEGRATION (drag-drop tags into schedule cells)
  // ============================================================================

  setupTagCell(td, columnKey, initialTagIds, persistCallback) {
    console.log('[setupTagCell] Called with:', {columnKey, initialTagIds});
    
    const box = td.querySelector('.tagsBox');
    if (!box) {
      console.log('[setupTagCell] No tagsBox found');
      return;
    }
    
    // Add drag-and-drop support for copying tags between cells
    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      box.classList.add('drag-over');
    });
    
    box.addEventListener('dragleave', (e) => {
      box.classList.remove('drag-over');
    });
    
    box.addEventListener('drop', (e) => {
      const tagId = e.dataTransfer.getData('text/tag-id');
      if (tagId) {
        e.preventDefault();
        e.stopPropagation();
        box.classList.remove('drag-over');
        
        // Add tag to this cell if not already present
        const currentIds = value.value.split(',').filter(id => id.trim());
        if (!currentIds.includes(tagId)) {
          currentIds.push(tagId);
          const uniqueIds = [...new Set(currentIds.filter(Boolean))];
          value.value = uniqueIds.join(',');
          
          if (typeof persistCallback === 'function') {
            persistCallback();
          }
          
          // Re-render tags
          this.renderTagsInCell(pills, uniqueIds);
        }
      }
    });

    const pills = box.querySelector('.tags-pills');
    const value = box.querySelector('.tags-value');
    
    if (!pills || !value) {
      console.log('[setupTagCell] Missing pills or value element');
      return;
    }
    
    // Check if cell is already set up
    if (box.dataset.setupComplete === 'true') {
      console.log('[setupTagCell] Cell already set up, just re-rendering tags');
      // Just re-render the current tags
      this.renderTagsInCell(pills, initialTagIds);
      
      // Update overlay visibility
      const addOverlay = box.querySelector('.tags-add-overlay');
      if (addOverlay) {
        const actualPillCount = pills.querySelectorAll('.tag-pill').length;
        if (actualPillCount === 0) {
          addOverlay.classList.add('visible');
        } else {
          addOverlay.classList.remove('visible');
        }
      }
      
      return;
    }
    
    // Mark as set up
    box.dataset.setupComplete = 'true';
    console.log('[setupTagCell] Marking cell as set up');

    // Helper functions
    const getCurrentTagIds = () => {
      const ids = value.value.split(',').filter(id => id.trim());
      return [...new Set(ids)]; // Deduplicate
    };

    const updateTagIds = (ids) => {
      const uniqueIds = [...new Set(ids.filter(Boolean))]; // Deduplicate
      console.log('[TagManager] Updating tag IDs:', uniqueIds);
      value.value = uniqueIds.join(',');
      
      // Ensure persist is called
      if (typeof persistCallback === 'function') {
        console.log('[TagManager] Calling persistCallback');
        persistCallback();
      } else {
        console.error('[TagManager] persistCallback not available!');
      }
      
      renderTags(ids).then(() => {
        // Update overlay after rendering completes
        if (typeof updateOverlay === 'function') {
          updateOverlay();
        }
      });
    };

    const renderTags = async (tagIds) => {
      console.log('[renderTags] Called with:', tagIds);
      pills.innerHTML = '';
      
      for (const tagId of tagIds) {
        console.log('[renderTags] Rendering tag:', tagId);
        const tag = this.getTag(tagId);
        if (!tag) {
          console.log('[renderTags] Tag not found:', tagId);
          continue;
        }

        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.dataset.tagId = tagId;
        
        if (tag.type === 'image') {
          pill.classList.add('image-tag');
          
          // Load image from vault or URL
          let imageUrl = tag.imageUrl;
          if (!imageUrl && tag.vaultId && window.vaultGet) {
            try {
              const record = await window.vaultGet(tag.vaultId);
              if (record && record.data) {
                imageUrl = URL.createObjectURL(record.data);
              }
            } catch (e) {
              console.error('[TagManager] Failed to load vault image:', e);
            }
          }
          
          if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            pill.prepend(img);
          }
          
          // Apply background color for image tags
          if (tag.color) {
            pill.style.backgroundColor = tag.color;
            pill.style.color = this.getContrastColor(tag.color);
            pill.style.borderColor = tag.color;
          }
        } else {
          // Text tag - use color with contrast
          if (tag.color) {
            pill.style.backgroundColor = tag.color;
            pill.style.color = this.getContrastColor(tag.color);
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

        // Double-click to edit tag
        pill.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.editTag(tagId);
        });

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
      }
    };

    // Open tag picker popup
    const openTagPopup = () => {
      // Create popup overlay
      const tagPopup = document.createElement('div');
      tagPopup.className = 'tag-popup-overlay';
      
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
      const popupInput = document.createElement('input');
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
      currentIds.forEach(async (tagId) => {
        const tag = this.getTag(tagId);
        if (!tag) return;

        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.dataset.tagId = tagId;
        
        if (tag.type === 'image') {
          pill.classList.add('image-tag');
          
          let imageUrl = tag.imageUrl;
          if (!imageUrl && tag.vaultId && window.vaultGet) {
            try {
              const record = await window.vaultGet(tag.vaultId);
              if (record && record.data) {
                imageUrl = URL.createObjectURL(record.data);
              }
            } catch (e) {}
          }
          
          if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.draggable = false;
            pill.prepend(img);
          }
          
          // Apply background color for image tags
          if (tag.color) {
            pill.style.backgroundColor = tag.color;
            pill.style.color = this.getContrastColor(tag.color);
            pill.style.borderColor = tag.color;
          }
        } else {
          // Text tag - use color with contrast
          if (tag.color) {
            pill.style.backgroundColor = tag.color;
            pill.style.color = this.getContrastColor(tag.color);
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
      closeBtn.addEventListener('click', () => closeTagPopup());
      content.appendChild(closeBtn);
      
      tagPopup.appendChild(content);
      document.body.appendChild(tagPopup);
      
      setTimeout(() => popupInput.focus(), 10);
      
      // Autocomplete
      let autocompleteDropdown = null;
      let selectedIndex = -1;
      
      const showAutocomplete = (query) => {
        hideAutocomplete();

        const matches = this.searchTags(query, columnKey);
        if (matches.length === 0) return;

        autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.className = 'tag-autocomplete';

        matches.forEach(async (tag, index) => {
          const item = document.createElement('div');
          item.className = 'tag-autocomplete-item';
          item.dataset.tagId = tag.id;
          if (index === 0) {
            item.classList.add('selected');
            selectedIndex = 0;
          }

          if (tag.type === 'image') {
            let imageUrl = tag.imageUrl;
            if (!imageUrl && tag.vaultId && window.vaultGet) {
              try {
                const record = await window.vaultGet(tag.vaultId);
                if (record && record.data) {
                  imageUrl = URL.createObjectURL(record.data);
                }
              } catch (e) {}
            }
            
            if (imageUrl) {
              const img = document.createElement('img');
              img.src = imageUrl;
              item.prepend(img);
            }
          }

          const labelSpan = document.createElement('span');
          labelSpan.className = 'tag-label';
          labelSpan.textContent = tag.label;
          item.appendChild(labelSpan);

          const typeSpan = document.createElement('span');
          typeSpan.className = 'tag-type';
          typeSpan.textContent = tag.type;
          item.appendChild(typeSpan);

          item.addEventListener('click', () => selectTag(tag.id));

          autocompleteDropdown.appendChild(item);
        });

        inputWrapper.appendChild(autocompleteDropdown);
      };

      const hideAutocomplete = () => {
        if (autocompleteDropdown) {
          autocompleteDropdown.remove();
          autocompleteDropdown = null;
          selectedIndex = -1;
        }
      };

      const selectTag = async (tagId) => {
        const currentIds = getCurrentTagIds();
        if (!currentIds.includes(tagId)) {
          currentIds.push(tagId);
          updateTagIds(currentIds);
          
          // Add pill to popup display
          const tag = this.getTag(tagId);
          if (tag) {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.dataset.tagId = tagId;
            
            if (tag.type === 'image') {
              pill.classList.add('image-tag');
              
              let imageUrl = tag.imageUrl;
              if (!imageUrl && tag.vaultId && window.vaultGet) {
                try {
                  const record = await window.vaultGet(tag.vaultId);
                  if (record && record.data) {
                    imageUrl = URL.createObjectURL(record.data);
                  }
                } catch (e) {}
              }
              
              if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.draggable = false;
                pill.prepend(img);
              }
              
              // Apply background color for image tags
              if (tag.color) {
                pill.style.backgroundColor = tag.color;
                pill.style.color = this.getContrastColor(tag.color);
                pill.style.borderColor = tag.color;
              }
            } else {
              // Text tag - use color with contrast
              if (tag.color) {
                pill.style.backgroundColor = tag.color;
                pill.style.color = this.getContrastColor(tag.color);
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
      };

      const closeTagPopup = () => {
        tagPopup.remove();
        hideAutocomplete();
      };

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
            const items = autocompleteDropdown.querySelectorAll('.tag-autocomplete-item');
            if (items[selectedIndex]) {
              const tagId = items[selectedIndex].dataset.tagId;
              selectTag(tagId);
            }
          } else if (popupInput.value.trim()) {
            const label = popupInput.value.trim();
            const tagId = this.createTextTag(label, columnKey);
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
          
          const name = prompt('Enter name for this image tag:');
          if (!name || !name.trim()) return;

          try {
            const tagId = await this.createImageTag(imageFile, name.trim(), columnKey);
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
    };

    // Click handler to open popup (only for non-empty cells)
    box.addEventListener('click', (e) => {
      // If Option key pressed, let cell selection happen instead
      if (e.altKey) return;
      if (e.target.closest('.tag-pill') || e.target.closest('.tag-x')) return;
      
      // Only open popup if there are tags - empty cells should allow selection
      const hasTags = pills.querySelectorAll('.tag-pill').length > 0;
      if (!hasTags) return;
      
      openTagPopup();
    });

    // ============================================================================
    // ADD OVERLAY FOR EMPTY CELLS
    // ============================================================================
    
    // Remove any existing overlay first
    const existingOverlay = box.querySelector('.tags-add-overlay');
    if (existingOverlay) {
      console.log('[Tags Overlay] Removing existing overlay');
      existingOverlay.remove();
    }
    
    // Add clickable overlay for empty cells
    const addOverlay = document.createElement('div');
    addOverlay.className = 'tags-add-overlay';
    
    // Add text label (not clickable)
    const label = document.createElement('span');
    label.className = 'tags-add-label';
    label.textContent = 'CLICK TO ADD TAGS';
    addOverlay.appendChild(label);
    
    // Add button (clickable)
    const button = document.createElement('button');
    button.className = 'tags-add-button';
    button.textContent = '+';
    button.addEventListener('click', (e) => {
      console.log('[Tags Overlay] Button clicked!');
      // If Option key pressed, let cell selection happen instead
      if (e.altKey) return;
      e.stopPropagation();
      openTagPopup();
    });
    addOverlay.appendChild(button);
    
    box.appendChild(addOverlay);
    console.log('[Tags Overlay] Created and appended to box');
    
    // Show/hide overlay based on whether cell has tags
    const updateOverlay = () => {
      const actualPillCount = pills.querySelectorAll('.tag-pill').length;
      console.log('[Tags Overlay] updateOverlay called, actual pills:', actualPillCount);
      
      if (actualPillCount === 0) {
        addOverlay.classList.add('visible');
        console.log('[Tags Overlay] Visible (no pills)');
      } else {
        addOverlay.classList.remove('visible');
        console.log('[Tags Overlay] Hidden (has pills)');
      }
    };
    
    updateOverlay();

    // Deduplicate initialTagIds to prevent duplicate pills
    const uniqueTagIds = [...new Set(initialTagIds.filter(Boolean))];
    
    // Initial render
    value.value = uniqueTagIds.join(',');
    renderTags(uniqueTagIds).then(() => updateOverlay());
  },

  hydrateTagsBox(td, val) {
    const columnKey = td.dataset.key;
    
    // Migrate old comma-separated string format to tag IDs
    let tagIds = [];
    if (val && typeof val === 'string') {
      if (val.startsWith('tag_')) {
        tagIds = val.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        // Old format: migrate text labels to tag objects
        const labels = val.split(',').map(s => s.trim()).filter(Boolean);
        tagIds = labels.map(label => {
          const existing = this.findTagByLabel(label, columnKey);
          if (existing) return existing.id;
          return this.createTextTag(label, columnKey);
        });
        
        // Update stored value to use tag IDs
        const value = td.querySelector('.tags-value');
        if (value) value.value = tagIds.join(',');
      }
    }
    
    // Deduplicate tag IDs before setup
    tagIds = [...new Set(tagIds.filter(Boolean))];
    
    // Setup cell with persist callback (assume global persist function exists)
    if (typeof window.persist === 'function') {
      this.setupTagCell(td, columnKey, tagIds, window.persist);
    }
  },

  // ============================================================================
  // DATABASE UI
  // ============================================================================

  setupUI(retryCount = 0) {
    const addBtn = document.getElementById('addTagBtn');
    const exportBtn = document.getElementById('exportTagReport');
    const panel = document.getElementById('tagPanel');
    
    if (!addBtn || !exportBtn || !panel) {
      if (retryCount < 3) {
        console.warn('[TagManager] UI elements not found, retry', retryCount + 1);
        setTimeout(() => this.setupUI(retryCount + 1), 100);
      } else {
        console.error('[TagManager] UI elements not found after 3 retries');
      }
      return;
    }
    
    console.log('[TagManager] UI elements found, setting up...');
    
    addBtn.addEventListener('click', () => {
      console.log('[TagManager] Add Tag clicked');
      this.addTag();
    });
    
    exportBtn.addEventListener('click', () => {
      console.log('[TagManager] Export clicked');
      this.exportTagReport();
    });
    
    // Setup image size slider
    const sizeSlider = document.getElementById('tagImageSize');
    const sizeValue = document.getElementById('tagImageSizeValue');
    if (sizeSlider && sizeValue) {
      // Load saved size
      const savedSize = localStorage.getItem('tagImageSize') || '20';
      sizeSlider.value = savedSize;
      sizeValue.textContent = savedSize + 'px';
      document.documentElement.style.setProperty('--tag-image-size', savedSize + 'px');
      
      sizeSlider.addEventListener('input', (e) => {
        const size = e.target.value;
        sizeValue.textContent = size + 'px';
        document.documentElement.style.setProperty('--tag-image-size', size + 'px');
        localStorage.setItem('tagImageSize', size);
      });
    }
    
    // Render tags when panel is opened
    panel.addEventListener('toggle', () => {
      if (panel.open) {
        console.log('[TagManager] Panel opened, rendering tags');
        this.renderTagList();
      }
    });
    
    // Initial render if panel is already open
    if (panel.open) {
      this.renderTagList();
    }
  },

  // Modal functions removed - tags now render directly in panel


  async renderTagList() {
    const container = document.getElementById('tagManagerList');
    if (!container) {
      console.error('[TagManager] List container not found');
      return;
    }

    const tagArray = Object.values(this.tags);
    
    if (tagArray.length === 0) {
      container.innerHTML = '<div class="tag-empty">No tags yet. Click + Add Tag to create one.</div>';
      return;
    }

    console.log('[TagManager] Rendering', tagArray.length, 'tags');

    // Load vault images for tags that need them
    const tagPromises = tagArray.map(async tag => {
      let imageUrl = tag.imageUrl;
      
      if (!imageUrl && tag.vaultId && window.vaultGet) {
        try {
          const record = await window.vaultGet(tag.vaultId);
          if (record && record.data) {
            imageUrl = URL.createObjectURL(record.data);
          }
        } catch (e) {
          console.error('[TagManager] Failed to load vault image:', e);
        }
      }
      
      return { ...tag, _displayUrl: imageUrl };
    });
    
    const tagsWithUrls = await Promise.all(tagPromises);

    container.innerHTML = tagsWithUrls.map(tag => `
      <div class="tag-item ${tag.type === 'text' ? 'text-tag' : 'image-tag'}" draggable="true" data-tag-id="${tag.id}">
        <button class="tag-delete-x" onclick="TagManager.deleteTag('${tag.id}')" title="Delete tag">×</button>
        <div class="tag-preview" ${tag.color ? `style="background-color: ${tag.color};"` : ''}>
          ${tag._displayUrl ? `<img src="${tag._displayUrl}" />` : `<div class="tag-empty-preview">—</div>`}
        </div>
        <div class="tag-info">
          <div class="tag-name">${tag.label}</div>
          <div class="tag-meta">${tag._displayUrl ? `${tag.height}px` : 'Text'}</div>
        </div>
        <input type="color" class="tag-color-picker" value="${tag.color || '#6b7280'}" 
               onchange="TagManager.updateTagColor('${tag.id}', this.value)" 
               title="Change color">
        <div class="tag-btns">
          <button onclick="TagManager.editTag('${tag.id}')" class="tm-btn-sm">Edit</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('dragstart', (e) => this.handleDragStart(e));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });
  },

  addTag() {
    this.currentEditId = null;
    this.cropState = { x: 0.5, y: 0.5, radius: 0.3 };
    this.showEditor({ label: '', height: 80 });
  },

  editTag(tagId) {
    this.currentEditId = tagId;
    const tag = this.tags[tagId];
    if (!tag) return;
    
    this.cropState = {
      x: tag.cropX || 0.5,
      y: tag.cropY || 0.5,
      radius: tag.cropRadius || 0.3
    };
    
    console.log('[TagManager] editTag - Loading cropState:', this.cropState);
    console.log('[TagManager] editTag - From tag:', { cropX: tag.cropX, cropY: tag.cropY, cropRadius: tag.cropRadius });
    
    this.showEditor(tag);
  },

  showEditor(tag) {
    console.log('[TagManager] ===== showEditor START =====');
    const isEdit = !!this.currentEditId;
    const rules = tag.rules || {};
    const customAlerts = rules.customAlerts || [];
    
    console.log('[TagManager] showEditor - tag:', tag);
    console.log('[TagManager] showEditor - rules:', rules);
    console.log('[TagManager] showEditor - customAlerts:', customAlerts);

    const html = `
      <div class="tag-editor-overlay" onclick="TagManager.closeEditor(event)">
        <div class="tag-editor-modal tag-editor-modal-wide" onclick="event.stopPropagation()">
          <div class="tag-editor-header">
            <h3>${isEdit ? 'EDIT TAG' : 'ADD TAG'}</h3>
            <button class="close-btn" onclick="TagManager.closeEditor()">×</button>
          </div>
          
          <div class="tag-editor-body" style="padding: 16px;">
            <div style="display: grid; grid-template-columns: auto auto; gap: 16px; margin-bottom: 16px;">
              <!-- LEFT COLUMN: Basic Info -->
              <div>
                <h4 style="margin: 0 0 10px 0; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Basic Info</h4>
                
                <!-- Photo -->
                <div style="margin-bottom: 10px; display: flex; flex-direction: column; align-items: center; max-width: 100px;">
                  <div id="tagCropSection" style="display: ${(tag.imageUrl || tag.vaultId || this.uploadedFile) ? 'block' : 'none'}; width: 100px; height: 100px; background: #000; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
                    <canvas id="tagCropCanvas" width="100" height="100" style="display: block; width: 100%; height: 100%;"></canvas>
                  </div>
                  <label style="cursor: pointer;">
                    <input type="file" id="tagImageUpload" accept="image/*" style="display: none;">
                    <div style="display: inline-block; padding: 5px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; font-size: 10px; cursor: pointer; text-align: center;">
                      Choose File
                    </div>
                  </label>
                </div>
                
                <!-- Name -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 50px;">Name</span>
                  <input type="text" id="tagNameInput" value="${tag.label || ''}" placeholder="GIOVANNI" style="width: 120px; padding: 5px 8px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;">
                </div>
                
                <!-- Color -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                  <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 50px;">Color</span>
                  <input type="color" id="tagColorInput" value="${tag.color || '#6b7280'}" class="tag-color-picker" style="width: 45px; height: 28px; border: 1px solid var(--border); border-radius: 3px; cursor: pointer;">
                </div>
                
                <!-- Minor Performer -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 50px;">Minor</span>
                  <input type="checkbox" id="tagMinorCheckbox" ${tag.isMinor ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                </div>
                
                <!-- Minor fields -->
                <div id="tagMinorFields" style="display: ${tag.isMinor ? 'block' : 'none'};">
                  <!-- Age -->
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 50px;">Age</span>
                    <input type="number" id="tagMinorAge" value="${tag.minorAge || ''}" placeholder="10" min="0" max="17" style="width: 45px; padding: 4px 6px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;">
                  </div>
                  
                  <!-- Day Type Selectors -->
                  <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 70px;">This Day</span>
                      <select id="tagMinorDayType" style="flex: 1; padding: 4px 6px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;">
                        <option value="school" ${(!tag.minorDayType || tag.minorDayType === 'school') ? 'selected' : ''}>School Day</option>
                        <option value="non-school" ${tag.minorDayType === 'non-school' ? 'selected' : ''}>Non-School Day</option>
                      </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 70px;">Next Day</span>
                      <select id="tagMinorNextDayType" style="flex: 1; padding: 4px 6px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;">
                        <option value="school" ${(!tag.minorNextDayType || tag.minorNextDayType === 'school') ? 'selected' : ''}>School Day</option>
                        <option value="non-school" ${tag.minorNextDayType === 'non-school' ? 'selected' : ''}>Non-School Day</option>
                      </select>
                    </div>
                  </div>
                  
                  <!-- Time Restrictions -->
                  <div style="background: var(--bg-secondary, #f8f9fa); padding: 6px; border-radius: 3px; margin-bottom: 8px;">
                    <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">Time Restrictions</div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 9px; min-width: 90px;">Earliest start</span>
                        <span style="font-size: 9px; font-weight: 600;">5:00 AM</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 9px; min-width: 90px;">Latest end (→school)</span>
                        <span style="font-size: 9px; font-weight: 600;">10:00 PM</span>
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 9px; min-width: 90px;">Latest end (→non-sch)</span>
                        <span style="font-size: 9px; font-weight: 600;">12:30 AM</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Parameter Grid -->
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                      <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Work Hour Limits</span>
                      <button type="button" onclick="TagManager.toggleMinorGrid()" style="padding: 1px 5px; background: var(--bg); border: 1px solid var(--border); border-radius: 2px; cursor: pointer; font-size: 9px; line-height: 1;">▼</button>
                    </div>
                    
                    <div id="minorGridContainer" style="display: none; margin-top: 6px;">
                      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                        <thead>
                          <tr style="background: var(--bg-secondary, #f8f9fa);">
                            <th style="padding: 3px; border: 1px solid var(--border); text-align: left; font-weight: 600;">Age Range</th>
                            <th style="padding: 3px; border: 1px solid var(--border); text-align: center; font-weight: 600;">School On-Set</th>
                            <th style="padding: 3px; border: 1px solid var(--border); text-align: center; font-weight: 600;">School Work</th>
                            <th style="padding: 3px; border: 1px solid var(--border); text-align: center; font-weight: 600;">Non-Sch On-Set</th>
                            <th style="padding: 3px; border: 1px solid var(--border); text-align: center; font-weight: 600;">Non-Sch Work</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${this.renderMinorGridRows(tag)}
                        </tbody>
                      </table>
                      <div style="font-size: 8px; margin-top: 4px; color: var(--muted);">
                        Pre-filled with NY State defaults. Edit as needed for your jurisdiction.
                      </div>
                    </div>
                  </div>
                  
                  <div style="margin-left: 58px;">
                    <a href="https://dol.ny.gov/system/files/documents/2024/03/ls559_0.pdf" target="_blank" style="font-size: 11px; color: var(--primary, #3b82f6); text-decoration: none;">📄 Guidelines</a>
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN: Rules & Alerts -->
              <div>
                <h4 style="margin: 0 0 10px 0; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Rules & Alerts</h4>
                
                <!-- Max Hours -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 70px;">Max Hours</span>
                  <input type="number" id="rule-maxHours" value="${rules.maxHours || ''}" min="0" step="0.5" placeholder="8" style="width: 60px; padding: 5px 8px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;" />
                </div>
                
                <!-- Meal Break -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 70px;">Meal Break</span>
                  <input type="number" id="rule-mealBreak" value="${rules.mealBreak || ''}" min="0" step="0.5" placeholder="6" style="width: 60px; padding: 5px 8px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;" />
                </div>
                
                <!-- Hard Out -->
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; min-width: 70px;">Hard Out</span>
                  <input type="text" id="rule-hardOut" value="${this.formatHardOutForDisplay(rules.hardOut || '')}" placeholder="${this.getTimeFormat() === '12h' ? '3:00 PM' : '15:00'}" style="width: 75px; padding: 5px 8px; font-size: 10px; border: 1px solid var(--border); border-radius: 3px;" />
                </div>
                
                <!-- Custom Alerts Section -->
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Custom Alerts</h4>
                    <button onclick="TagManager.openLabelColumnSettings()" style="padding: 2px 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; cursor: pointer; font-size: 12px; line-height: 1;" title="Configure event label column">⚙️</button>
                  </div>
                  <div class="custom-alerts-list" id="custom-alerts-list">
                  ${customAlerts.map((alert, index) => `
                    <div class="custom-alert-row-compact" style="display: flex; flex-direction: column; gap: 6px; padding: 6px; margin-bottom: 8px; background: var(--bg-secondary, #f8f9fa); border: 1px solid var(--border); border-radius: 3px;">
                      <!-- Row 1: Natural sentence flow -->
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <!-- Label -->
                        <input type="text" 
                               class="custom-alert-desc" 
                               placeholder="CALL CAR" 
                               value="${alert.description || ''}" 
                               data-index="${index}" 
                               style="flex: 0 0 120px; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px; text-transform: uppercase; font-weight: 500;" />
                        
                        <!-- Time inputs -->
                        <input type="number" class="custom-alert-hours" placeholder="0" min="0" value="${alert.hours || ''}" data-index="${index}" style="width: 38px; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px; text-align: center;" />
                        <span style="font-size: 11px; font-weight: 500;">H</span>
                        <input type="number" class="custom-alert-minutes" placeholder="0" min="0" max="59" value="${alert.minutes || ''}" data-index="${index}" style="width: 38px; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px; text-align: center;" />
                        <span style="font-size: 11px; font-weight: 500;">M</span>
                        
                        <!-- Type: Before/After/Every/At -->
                        <select class="custom-alert-type" data-index="${index}" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
                          <option value="before" ${alert.type === 'before' ? 'selected' : ''}>Before</option>
                          <option value="after" ${alert.type === 'after' ? 'selected' : ''}>After</option>
                          <option value="every" ${alert.type === 'every' ? 'selected' : ''}>Every</option>
                          <option value="at" ${alert.type === 'at' ? 'selected' : ''}>At</option>
                        </select>
                        
                        <!-- Anchor Mode Toggle -->
                        <select class="custom-alert-anchor-mode" data-index="${index}" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
                          <option value="tag" ${!alert.anchorMode || alert.anchorMode === 'tag' ? 'selected' : ''}>Tag</option>
                          <option value="event" ${alert.anchorMode === 'event' ? 'selected' : ''}>Event</option>
                        </select>
                        
                        <!-- Tag-based anchor dropdown -->
                        <select class="custom-alert-anchor-tag" data-index="${index}" style="display: ${!alert.anchorMode || alert.anchorMode === 'tag' ? 'block' : 'none'}; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
                          <optgroup label="Schedule Points">
                            <option value="call" ${!alert.anchor || alert.anchor === 'call' ? 'selected' : ''}>Call</option>
                            <option value="lunch" ${alert.anchor === 'lunch' ? 'selected' : ''}>Lunch</option>
                            <option value="wrap" ${alert.anchor === 'wrap' ? 'selected' : ''}>Wrap</option>
                          </optgroup>
                          <optgroup label="Tag Occurrences">
                            <option value="1st" ${alert.anchor === '1st' ? 'selected' : ''}>1st</option>
                            <option value="2nd" ${alert.anchor === '2nd' ? 'selected' : ''}>2nd</option>
                            <option value="3rd" ${alert.anchor === '3rd' ? 'selected' : ''}>3rd</option>
                            <option value="4th" ${alert.anchor === '4th' ? 'selected' : ''}>4th</option>
                            <option value="5th" ${alert.anchor === '5th' ? 'selected' : ''}>5th</option>
                            <option value="last" ${alert.anchor === 'last' ? 'selected' : ''}>Last</option>
                          </optgroup>
                        </select>
                        
                        <!-- Event-based anchor dropdown (populated dynamically) -->
                        <select class="custom-alert-anchor-event" data-index="${index}" style="display: ${alert.anchorMode === 'event' ? 'block' : 'none'}; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
                          <option value="">Select event...</option>
                          ${this.getScheduleEventsOptions(alert.anchorEvent)}
                        </select>
                        
                        <button class="custom-alert-remove-compact" data-index="${index}" style="padding: 2px 6px; background: var(--primary, #3b82f6); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; line-height: 1;">×</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <button class="add-custom-alert-btn" id="add-custom-alert" style="padding: 6px; background: var(--primary, #3b82f6); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: 600; margin-top: 5px;">+ ADD</button>
                </div>
              </div>
            </div>
          </div>

          <div class="tag-editor-footer">
            <button onclick="TagManager.closeEditor()" class="tm-btn ghost">Cancel</button>
            <button onclick="TagManager.saveTag()" class="tm-btn">${isEdit ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    console.log('[TagManager] ===== HTML INSERTED =====');
    
    // Minor performer checkbox toggle
    const minorCheckbox = document.getElementById('tagMinorCheckbox');
    const minorFields = document.getElementById('tagMinorFields');
    if (minorCheckbox && minorFields) {
      minorCheckbox.addEventListener('change', (e) => {
        minorFields.style.display = e.target.checked ? 'block' : 'none';
      });
    }
    
    document.getElementById('tagImageUpload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadedFile = file;
        document.getElementById('tagCropSection').style.display = 'block';
        const blobUrl = URL.createObjectURL(file);
        this.setupCropCanvas(blobUrl);
      }
    });
    
    // Custom alerts event listeners
    const addAlertBtn = document.getElementById('add-custom-alert');
    console.log('[TagManager] Add alert button:', addAlertBtn);
    
    if (addAlertBtn) {
      addAlertBtn.addEventListener('click', (e) => {
        console.log('[TagManager] Add alert button clicked');
        e.preventDefault();
        e.stopPropagation();
        
        const list = document.getElementById('custom-alerts-list');
        if (!list) {
          console.error('[TagManager] Could not find custom-alerts-list');
          return;
        }
        
        const index = list.querySelectorAll('.custom-alert-row-compact').length;
        console.log('[TagManager] Adding alert at index:', index);
        
        const newRow = document.createElement('div');
        newRow.className = 'custom-alert-row-compact';
        newRow.style.cssText = 'display: flex; flex-direction: column; gap: 6px; padding: 6px; margin-bottom: 8px; background: var(--bg-secondary, #f8f9fa); border: 1px solid var(--border); border-radius: 3px;';
        newRow.innerHTML = `
          <!-- Row 1: Natural sentence flow -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <!-- Label -->
            <input type="text" class="custom-alert-desc" placeholder="CALL CAR" data-index="${index}" style="flex: 0 0 120px; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px; text-transform: uppercase; font-weight: 500;" />
            
            <!-- Time inputs -->
            <input type="number" class="custom-alert-hours" placeholder="0" min="0" data-index="${index}" style="width: 38px; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px; text-align: center;" />
            <span style="font-size: 11px; font-weight: 500;">H</span>
            <input type="number" class="custom-alert-minutes" placeholder="0" min="0" max="59" data-index="${index}" style="width: 38px; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px; text-align: center;" />
            <span style="font-size: 11px; font-weight: 500;">M</span>
            
            <!-- Type: Before/After/Every/At -->
            <select class="custom-alert-type" data-index="${index}" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
              <option value="before">Before</option>
              <option value="after" selected>After</option>
              <option value="every">Every</option>
              <option value="at">At</option>
            </select>
            
            <!-- Anchor Mode Toggle -->
            <select class="custom-alert-anchor-mode" data-index="${index}" style="padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
              <option value="tag" selected>Tag</option>
              <option value="event">Event</option>
            </select>
            
            <!-- Tag-based anchor -->
            <select class="custom-alert-anchor-tag" data-index="${index}" style="display: block; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
              <optgroup label="Schedule Points">
                <option value="call">Call</option>
                <option value="lunch">Lunch</option>
                <option value="wrap" selected>Wrap</option>
              </optgroup>
              <optgroup label="Tag Occurrences">
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="5th">5th</option>
                <option value="last">Last</option>
              </optgroup>
            </select>
            
            <!-- Event-based anchor -->
            <select class="custom-alert-anchor-event" data-index="${index}" style="display: none; padding: 4px 6px; font-size: 11px; border: 1px solid var(--border); border-radius: 3px;">
              <option value="">Select event...</option>
              ${this.getScheduleEventsOptions('')}
            </select>
            
            <button class="custom-alert-remove-compact" data-index="${index}" style="padding: 2px 6px; background: var(--primary, #3b82f6); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; line-height: 1;">×</button>
          </div>
        `;
        list.appendChild(newRow);
        this.attachCustomAlertListeners(newRow);
        console.log('[TagManager] Alert row added');
      });
    } else {
      console.error('[TagManager] Add alert button not found!');
    }
    
    // Attach listeners to existing alert rows
    document.querySelectorAll('.custom-alert-row-compact').forEach(row => {
      this.attachCustomAlertListeners(row);
    });
    
    // Hard Out time input validation
    const hardOutInput = document.getElementById('rule-hardOut');
    if (hardOutInput) {
      // Set up input validation based on current format
      hardOutInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (!val) return;
        
        const format = this.getTimeFormat();
        
        if (format === '12h') {
          // Allow typing: digits, colon, space, A, P, M
          e.target.value = val.replace(/[^0-9:APMapm\s]/g, '');
        } else {
          // 24h: only digits and colon
          e.target.value = val.replace(/[^0-9:]/g, '');
        }
      });
      
      // Validate on blur
      hardOutInput.addEventListener('blur', (e) => {
        const val = e.target.value.trim();
        if (!val) return;
        
        const format = this.getTimeFormat();
        
        if (format === '12h') {
          // Validate 12h format (e.g., "3:00 PM" or "3 PM")
          if (!/^\d{1,2}(:\d{2})?\s*(AM|PM|am|pm)$/i.test(val)) {
            e.target.setCustomValidity('Use format like "3:00 PM"');
            e.target.reportValidity();
            return;
          }
          e.target.setCustomValidity('');
        } else {
          // Validate 24h format (e.g., "15:00")
          if (!/^\d{1,2}:\d{2}$/.test(val)) {
            e.target.setCustomValidity('Use format like "15:00"');
            e.target.reportValidity();
            return;
          }
          const [h, m] = val.split(':').map(Number);
          if (h > 23 || m > 59) {
            e.target.setCustomValidity('Invalid time (hours 0-23, minutes 0-59)');
            e.target.reportValidity();
            return;
          }
          e.target.setCustomValidity('');
        }
      });
      
      // Listen for time format toggle changes
      const timeFormatToggle = document.getElementById('timeFormatToggle');
      if (timeFormatToggle) {
        timeFormatToggle.addEventListener('change', () => {
          const newFormat = timeFormatToggle.checked ? '24h' : '12h';
          hardOutInput.placeholder = newFormat === '12h' ? '3:00 PM' : '15:00';
        });
      }
    }
    
    // Load image for crop canvas
    if (this.uploadedFile) {
      // Image was just dropped - load it
      console.log('[TagManager] Loading dropped image into crop canvas');
      const blobUrl = URL.createObjectURL(this.uploadedFile);
      this.setupCropCanvas(blobUrl);
    } else if (tag.originalVaultId && window.vaultGet) {
      // Load ORIGINAL uncropped image for editing
      console.log('[TagManager] Loading original image from vault for editing');
      window.vaultGet(tag.originalVaultId).then(record => {
        if (record && record.data) {
          const url = URL.createObjectURL(record.data);
          this.setupCropCanvas(url);
        }
      }).catch(e => console.error('[TagManager] Failed to load original vault image:', e));
    } else if (tag.imageUrl) {
      this.setupCropCanvas(tag.imageUrl);
    } else if (tag.vaultId && window.vaultGet) {
      window.vaultGet(tag.vaultId).then(record => {
        if (record && record.data) {
          const url = URL.createObjectURL(record.data);
          this.setupCropCanvas(url);
        }
      }).catch(e => console.error('[TagManager] Failed to load vault image:', e));
    }
  },

  setupCropCanvas(url) {
    console.log('[TagManager] setupCropCanvas - cropState at setup:', this.cropState);
    this.cropCanvas = document.getElementById('tagCropCanvas');
    if (!this.cropCanvas) return;
    
    this.cropCtx = this.cropCanvas.getContext('2d');
    
    this.cropImage = new Image();
    this.cropImage.crossOrigin = 'anonymous';
    this.cropImage.onload = () => this.drawCropCanvas();
    this.cropImage.src = url;
    
    let isDraggingCenter = false;
    let isDraggingRadius = false;
    
    this.cropCanvas.onmousedown = (e) => {
      const rect = this.cropCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      const dx = x - this.cropState.x;
      const dy = y - this.cropState.y;
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
      
      if (distanceToCenter < 0.05) {
        isDraggingCenter = true;
      } else if (Math.abs(distanceToCenter - this.cropState.radius) < 0.05) {
        isDraggingRadius = true;
      }
    };
    
    this.cropCanvas.onmousemove = (e) => {
      if (!isDraggingCenter && !isDraggingRadius) return;
      
      const rect = this.cropCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      if (isDraggingCenter) {
        // Allow center to go anywhere (no constraints)
        this.cropState.x = x;
        this.cropState.y = y;
      } else if (isDraggingRadius) {
        const dx = x - this.cropState.x;
        const dy = y - this.cropState.y;
        const newRadius = Math.sqrt(dx * dx + dy * dy);
        
        // Only enforce minimum radius, no maximum
        this.cropState.radius = Math.max(0.1, newRadius);
      }
      
      this.drawCropCanvas();
    };
    
    this.cropCanvas.onmouseup = () => {
      isDraggingCenter = false;
      isDraggingRadius = false;
    };
    
    this.cropCanvas.onmouseleave = () => {
      isDraggingCenter = false;
      isDraggingRadius = false;
    };
  },

  attachCustomAlertListeners(row) {
    const removeBtn = row.querySelector('.custom-alert-remove-compact');
    const anchorModeSelect = row.querySelector('.custom-alert-anchor-mode');
    const tagAnchorSelect = row.querySelector('.custom-alert-anchor-tag');
    const eventAnchorSelect = row.querySelector('.custom-alert-anchor-event');
    
    // Handle anchor mode toggle
    if (anchorModeSelect && tagAnchorSelect && eventAnchorSelect) {
      anchorModeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (mode === 'tag') {
          tagAnchorSelect.style.display = 'block';
          eventAnchorSelect.style.display = 'none';
        } else {
          tagAnchorSelect.style.display = 'none';
          eventAnchorSelect.style.display = 'block';
        }
      });
    }
    
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        row.remove();
      });
    }
  },

  drawCropCanvas() {
    if (!this.cropCanvas || !this.cropImage || !this.cropCtx) return;
    
    console.log('[TagManager] drawCropCanvas - using cropState:', this.cropState);
    
    const canvas = this.cropCanvas;
    const ctx = this.cropCtx;
    const img = this.cropImage;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const imgAspect = img.width / img.height;
    const canvasAspect = canvas.width / canvas.height;
    
    let drawWidth, drawHeight, offsetX, offsetY;
    
    if (imgAspect > canvasAspect) {
      drawHeight = canvas.height;
      drawWidth = img.width * (canvas.height / img.height);
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = canvas.width;
      drawHeight = img.height * (canvas.width / img.width);
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    }
    
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = this.cropState.x * canvas.width;
    const centerY = this.cropState.y * canvas.height;
    const radius = this.cropState.radius * Math.min(canvas.width, canvas.height);
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + radius, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  },

  async createCroppedImage(file, cropState) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Calculate crop dimensions based on crop state
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          // Calculate the actual pixel positions
          const centerX = cropState.x * imgWidth;
          const centerY = cropState.y * imgHeight;
          const radius = cropState.radius * Math.min(imgWidth, imgHeight);
          
          // Create square canvas for the crop
          const size = radius * 2;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          // Create circular clip
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Draw the cropped portion of the image
          ctx.drawImage(
            img,
            centerX - radius,  // source x
            centerY - radius,  // source y
            size,              // source width
            size,              // source height
            0,                 // dest x
            0,                 // dest y
            size,              // dest width
            size               // dest height
          );
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              // Convert blob to File with proper name
              const croppedFile = new File([blob], file.name, { type: 'image/png' });
              resolve(croppedFile);
            } else {
              reject(new Error('Failed to create cropped image'));
            }
          }, 'image/png');
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  getDefaultMinorRules() {
    return [
      { ageMin: 0.041, ageMax: 0.417, label: '15 days-5 months', schoolOnSet: 2, schoolWork: 0.33, nonSchoolOnSet: 2, nonSchoolWork: 0.33 },
      { ageMin: 0.5, ageMax: 1, label: '6 months-1 year', schoolOnSet: 4, schoolWork: 2, nonSchoolOnSet: 4, nonSchoolWork: 2 },
      { ageMin: 2, ageMax: 5, label: '2-5 years', schoolOnSet: 6, schoolWork: 3, nonSchoolOnSet: 6, nonSchoolWork: 3 },
      { ageMin: 6, ageMax: 8, label: '6-8 years', schoolOnSet: 8, schoolWork: 4, nonSchoolOnSet: 8, nonSchoolWork: 6 },
      { ageMin: 9, ageMax: 15, label: '9-15 years', schoolOnSet: 9, schoolWork: 5, nonSchoolOnSet: 9, nonSchoolWork: 7 },
      { ageMin: 16, ageMax: 17, label: '16-17 years', schoolOnSet: 10, schoolWork: 6, nonSchoolOnSet: 10, nonSchoolWork: 9 }
    ];
  },

  renderMinorGridRows(tag) {
    const rules = tag.minorRules || this.getDefaultMinorRules();
    
    return rules.map((rule, index) => `
      <tr>
        <td style="padding: 3px; border: 1px solid var(--border); font-size: 9px; white-space: nowrap;">${rule.label}</td>
        <td style="padding: 2px; border: 1px solid var(--border); text-align: center;">
          <input type="number" class="minor-grid-input" data-index="${index}" data-field="schoolOnSet" value="${rule.schoolOnSet}" min="0" max="24" step="0.5" style="width: 40px; padding: 2px; font-size: 9px; text-align: center; border: 1px solid var(--border); border-radius: 2px;">
        </td>
        <td style="padding: 2px; border: 1px solid var(--border); text-align: center;">
          <input type="number" class="minor-grid-input" data-index="${index}" data-field="schoolWork" value="${rule.schoolWork}" min="0" max="24" step="0.5" style="width: 40px; padding: 2px; font-size: 9px; text-align: center; border: 1px solid var(--border); border-radius: 2px;">
        </td>
        <td style="padding: 2px; border: 1px solid var(--border); text-align: center;">
          <input type="number" class="minor-grid-input" data-index="${index}" data-field="nonSchoolOnSet" value="${rule.nonSchoolOnSet}" min="0" max="24" step="0.5" style="width: 40px; padding: 2px; font-size: 9px; text-align: center; border: 1px solid var(--border); border-radius: 2px;">
        </td>
        <td style="padding: 2px; border: 1px solid var(--border); text-align: center;">
          <input type="number" class="minor-grid-input" data-index="${index}" data-field="nonSchoolWork" value="${rule.nonSchoolWork}" min="0" max="24" step="0.5" style="width: 40px; padding: 2px; font-size: 9px; text-align: center; border: 1px solid var(--border); border-radius: 2px;">
        </td>
      </tr>
    `).join('');
  },

  toggleMinorGrid() {
    const container = document.getElementById('minorGridContainer');
    if (container) {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
  },

  async saveTag() {
    console.log('[TagManager] saveTag called');
    
    // Check values immediately
    const hardOutNow = document.getElementById('rule-hardOut');
    const maxHoursNow = document.getElementById('rule-maxHours');
    const mealBreakNow = document.getElementById('rule-mealBreak');
    console.log('[TagManager] Input elements at saveTag start:', {
      hardOut: hardOutNow,
      maxHours: maxHoursNow,
      mealBreak: mealBreakNow
    });
    console.log('[TagManager] Values at saveTag start:', {
      hardOut: hardOutNow?.value,
      maxHours: maxHoursNow?.value,
      mealBreak: mealBreakNow?.value
    });
    
    const label = document.getElementById('tagNameInput').value.trim();
    if (!label) {
      alert('Enter tag name');
      return;
    }

    console.log('[TagManager] Saving:', label);
    console.log('[TagManager] uploadedFile:', this.uploadedFile);
    
    let imageUrl = '';
    let vaultId = null;
    let originalVaultId = null;
    
    if (this.uploadedFile) {
      console.log('[TagManager] uploadedFile exists, storing original...');
      try {
        // Store the ORIGINAL image in vault first
        originalVaultId = await window.vaultPut(this.uploadedFile);
        console.log('[TagManager] ✓ Stored original image in vault:', originalVaultId);
        
        // Create cropped version of the image using canvas
        const croppedBlob = await this.createCroppedImage(this.uploadedFile, this.cropState);
        console.log('[TagManager] Created cropped image blob');
        
        // Store the CROPPED image in vault
        vaultId = await window.vaultPut(croppedBlob);
        console.log('[TagManager] ✓ Stored cropped image in vault:', vaultId);
        
        // Keep imageUrl for backward compatibility (will be null if not auth'd)
        if (window.SupabaseAPI?.auth?.isAuthenticated()) {
          try {
            const result = await window.SupabaseAPI.storage.uploadImage(croppedBlob, 'tags/');
            if (result.success) {
              imageUrl = result.url;
              console.log('[TagManager] ✓ Also uploaded to Supabase:', imageUrl);
            }
          } catch (err) {
            console.warn('[TagManager] Supabase upload failed (continuing with local):', err);
          }
        }
      } catch (err) {
        console.error('[TagManager] Image processing error:', err);
        alert('Failed to process image');
        return;
      }
    }
    
    // Preserve existing image data if editing and no new file uploaded
    const existingTag = this.currentEditId ? this.tags[this.currentEditId] : null;
    if (!this.uploadedFile && existingTag) {
      imageUrl = existingTag.imageUrl || '';
      vaultId = existingTag.vaultId || null;
      originalVaultId = existingTag.originalVaultId || null;
    }
    
    // Build tag data - preserve existing properties if editing
    const tagData = existingTag ? { ...existingTag } : {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created: Date.now()
    };
    
    // Update with new values
    tagData.label = label;
    tagData.type = (vaultId || imageUrl) ? 'image' : 'text';
    tagData.imageUrl = imageUrl;
    tagData.vaultId = vaultId;
    tagData.originalVaultId = originalVaultId;
    tagData.cropX = this.cropState.x;
    tagData.cropY = this.cropState.y;
    tagData.cropRadius = this.cropState.radius;
    tagData.height = 80; // Fixed height
    if (this.currentColumnKey) {
      tagData.columnKey = this.currentColumnKey;
    }
    
    // Add color for all tags
    const colorInput = document.getElementById('tagColorInput');
    tagData.color = colorInput ? colorInput.value : this.generateTagColor(label);
    
    // Collect minor performer data
    const minorCheckbox = document.getElementById('tagMinorCheckbox');
    const minorAge = document.getElementById('tagMinorAge');
    const minorDayType = document.getElementById('tagMinorDayType');
    const minorNextDayType = document.getElementById('tagMinorNextDayType');
    
    if (minorCheckbox?.checked) {
      tagData.isMinor = true;
      tagData.minorAge = minorAge?.value ? parseFloat(minorAge.value) : null;
      tagData.minorDayType = minorDayType?.value || 'school';
      tagData.minorNextDayType = minorNextDayType?.value || 'school';
      
      // Collect grid data
      const gridInputs = document.querySelectorAll('.minor-grid-input');
      const minorRules = this.getDefaultMinorRules(); // Start with defaults
      
      gridInputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        const field = input.dataset.field;
        const value = parseFloat(input.value);
        
        if (!isNaN(value) && minorRules[index]) {
          minorRules[index][field] = value;
        }
      });
      
      tagData.minorRules = minorRules;
    } else {
      tagData.isMinor = false;
      tagData.minorAge = null;
      tagData.minorDayType = 'school';
      tagData.minorNextDayType = 'school';
      tagData.minorRules = null;
    }
    
    // Collect rules
    const hardOutInput = document.getElementById('rule-hardOut');
    const maxHoursInput = document.getElementById('rule-maxHours');
    const mealBreakInput = document.getElementById('rule-mealBreak');
    
    console.log('[TagManager] Rule inputs found:', { 
      hardOut: !!hardOutInput, 
      maxHours: !!maxHoursInput, 
      mealBreak: !!mealBreakInput 
    });
    
    const hardOut = hardOutInput?.value;
    const maxHours = maxHoursInput?.value;
    const mealBreak = mealBreakInput?.value;
    
    console.log('[TagManager] Collected rule values:', { hardOut, maxHours, mealBreak });
    
    const customAlerts = [];
    document.querySelectorAll('.custom-alert-row-compact').forEach(row => {
      const desc = row.querySelector('.custom-alert-desc')?.value.trim();
      const type = row.querySelector('.custom-alert-type')?.value;
      const anchorMode = row.querySelector('.custom-alert-anchor-mode')?.value || 'tag';
      const hours = row.querySelector('.custom-alert-hours')?.value;
      const minutes = row.querySelector('.custom-alert-minutes')?.value;
      
      let anchor = null;
      let anchorEvent = null;
      
      if (anchorMode === 'tag') {
        anchor = row.querySelector('.custom-alert-anchor-tag')?.value || 'call';
      } else {
        anchorEvent = row.querySelector('.custom-alert-anchor-event')?.value;
      }
      
      if (desc && type) {
        const alert = {
          id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          description: desc,
          type: type,
          anchorMode: anchorMode
        };
        
        if (anchorMode === 'tag') {
          alert.anchor = anchor;
        } else {
          alert.anchorEvent = anchorEvent;
        }
        
        // Store hours and minutes
        if (hours || minutes) {
          alert.hours = hours ? parseInt(hours) : 0;
          alert.minutes = minutes ? parseInt(minutes) : 0;
          alert.totalMinutes = (alert.hours * 60) + alert.minutes;
        }
        
        customAlerts.push(alert);
      }
    });
    
    // Build rules object
    const rules = {};
    if (hardOut) rules.hardOut = hardOut;
    if (maxHours) rules.maxHours = parseFloat(maxHours);
    if (mealBreak) rules.mealBreak = parseFloat(mealBreak);
    if (customAlerts.length > 0) rules.customAlerts = customAlerts;
    
    if (Object.keys(rules).length > 0) {
      tagData.rules = rules;
      console.log('[TagManager] Saving rules:', rules);
    } else {
      console.log('[TagManager] No rules to save');
    }
    
    console.log('[TagManager] Final tagData:', tagData);
    
    if (this.currentEditId) {
      this.tags[this.currentEditId] = tagData;
    } else {
      this.tags[tagData.id] = tagData;
      
      // Add to column index if columnKey is set
      if (tagData.columnKey) {
        if (!this.columnTags[tagData.columnKey]) {
          this.columnTags[tagData.columnKey] = [];
        }
        this.columnTags[tagData.columnKey].push(tagData.id);
      }
    }
    
    this.saveTags();
    
    // If this tag was created from a drop into a cell, add it to that cell
    // DO THIS BEFORE closeEditor() which clears currentTargetBox!
    if (this.currentTargetBox && tagData.id) {
      console.log('[TagManager] Adding new tag to target cell');
      const tagsValue = this.currentTargetBox.querySelector('.tags-value');
      if (tagsValue) {
        const ids = tagsValue.value.split(',').filter(id => id.trim());
        console.log('[TagManager] Current cell IDs:', ids);
        ids.push(tagData.id);
        tagsValue.value = ids.join(',');
        console.log('[TagManager] Updated cell IDs:', ids);
        
        if (window.persist) {
          console.log('[TagManager] Calling persist');
          window.persist();
        }
        
        const td = this.currentTargetBox.closest('td');
        if (td) {
          console.log('[TagManager] Re-hydrating cell');
          this.hydrateTagsBox(td, tagsValue.value);
        }
      } else {
        console.error('[TagManager] No tags-value element found in target box');
      }
    } else {
      console.log('[TagManager] No target box (tag not from drop)');
    }
    
    this.closeEditor();
    this.renderTagList();
    
    // Clear temporary state (redundant since closeEditor does this, but being explicit)
    this.uploadedFile = null;
    this.currentColumnKey = null;
    this.currentTargetBox = null;
  },

  updateTagColor(tagId, color) {
    const tag = this.tags[tagId];
    if (!tag) return;
    
    tag.color = color;
    this.saveTags();
    
    // Re-render all cells that use this tag
    document.querySelectorAll(`[data-tag-id="${tagId}"]`).forEach(pill => {
      pill.style.backgroundColor = color;
      pill.style.color = this.getContrastColor(color);
      pill.style.borderColor = color;
    });
    
    // Update preview in tag list
    this.renderTagList();
  },

  deleteTag(tagId) {
    if (!confirm('Delete tag?')) return;
    
    const tag = this.tags[tagId];
    if (!tag) return;

    // Remove from column index
    if (this.columnTags[tag.columnKey]) {
      this.columnTags[tag.columnKey] = this.columnTags[tag.columnKey].filter(id => id !== tagId);
    }

    delete this.tags[tagId];
    this.saveTags();
    this.renderTagList();
  },

  closeEditor(event) {
    if (event && event.target.classList.contains('tag-editor-modal')) return;
    const overlay = document.querySelector('.tag-editor-overlay');
    if (overlay) overlay.remove();
    this.cropCanvas = null;
    this.cropCtx = null;
    this.cropImage = null;
    this.uploadedFile = null;
    this.currentColumnKey = null;
    this.currentTargetBox = null;
  },
  
  /**
   * Open settings modal for selecting event label column
   */
  openLabelColumnSettings() {
    // Get all custom columns from schedule
    const scheduleData = window.getScheduleData ? window.getScheduleData() : null;
    if (!scheduleData) {
      alert('No schedule loaded');
      return;
    }
    
    // Extract unique custom column keys
    const columnKeys = new Set();
    scheduleData.days?.forEach(day => {
      day.rows?.forEach(row => {
        if (row.custom) {
          Object.keys(row.custom).forEach(key => columnKeys.add(key));
        }
      });
    });
    
    if (columnKeys.size === 0) {
      alert('No custom columns found in schedule');
      return;
    }
    
    const currentSetting = localStorage.getItem('eventLabelColumn') || '';
    
    // Build options
    const options = Array.from(columnKeys).map(key => {
      const selected = key === currentSetting ? 'selected' : '';
      // Convert c_event to "EVENT", c_cast to "CAST", etc.
      const displayName = key.replace(/^c_/, '').toUpperCase();
      return `<option value="${key}" ${selected}>${displayName}</option>`;
    }).join('');
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'tag-editor-overlay';
    modal.innerHTML = `
      <div class="tag-editor-modal" style="max-width: 400px;">
        <div class="tag-editor-header">
          <h3>Event Label Settings</h3>
          <button class="close-btn" onclick="this.closest('.tag-editor-overlay').remove()">×</button>
        </div>
        <div class="tag-editor-body" style="padding: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: var(--text-secondary);">
            Select which column to use for event labels in alert anchors:
          </p>
          <select id="label-column-select" style="width: 100%; padding: 8px; font-size: 12px; border: 1px solid var(--border); border-radius: 4px;">
            <option value="">Auto (first non-empty)</option>
            ${options}
          </select>
          <div style="margin-top: 8px; padding: 8px; background: var(--bg-secondary); border-radius: 4px; font-size: 11px; color: var(--text-secondary);">
            <strong>Current format:</strong> #1 | SET UP
          </div>
        </div>
        <div class="tag-editor-footer">
          <button onclick="this.closest('.tag-editor-overlay').remove()" class="tm-btn ghost">Cancel</button>
          <button onclick="TagManager.saveLabelColumnSettings()" class="tm-btn">Save</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },
  
  /**
   * Save event label column setting
   */
  saveLabelColumnSettings() {
    const select = document.getElementById('label-column-select');
    const value = select.value;
    
    if (value) {
      localStorage.setItem('eventLabelColumn', value);
    } else {
      localStorage.removeItem('eventLabelColumn');
    }
    
    // Close modal
    document.querySelector('.tag-editor-overlay').remove();
    
    // Refresh tag editor if it's open to update event dropdowns
    if (this.currentEditId) {
      const tag = this.tags[this.currentEditId];
      if (tag) {
        this.openEditor(this.currentEditId);
      }
    }
  },

  handleDragStart(e) {
    const tagId = e.target.dataset.tagId;
    this.draggedTag = this.tags[tagId];
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/tag-id', tagId);
    e.target.style.opacity = '0.5';
  },

  handleDragEnd(e) {
    e.target.style.opacity = '1';
    this.draggedTag = null;
  },

  exportTagReport() {
    alert('Report feature coming');
  },

  attachEventListeners() {
    // Track when tag is being dragged to enable pointer events on empty cells
    document.addEventListener('dragstart', (e) => {
      console.log('[TagManager] Document dragstart, target:', e.target.className);
      // Check if target is a tag-pill or inside one
      const tagPill = e.target.classList.contains('tag-pill') ? e.target : e.target.closest('.tag-pill');
      console.log('[TagManager] Tag pill found:', !!tagPill);
      if (tagPill) {
        console.log('[TagManager] Adding dragging-tag class to body');
        document.body.classList.add('dragging-tag');
      }
    });
    
    document.addEventListener('dragend', (e) => {
      console.log('[TagManager] Document dragend - Removing dragging-tag class from body');
      document.body.classList.remove('dragging-tag');
      
      // Clean up all drag-over classes
      document.querySelectorAll('.tagsBox.drag-over').forEach(box => {
        box.classList.remove('drag-over');
      });
    });
    
    document.addEventListener('dragover', (e) => {
      console.log('[TagManager] Dragover event, target:', e.target.className);
      let tagsBox = e.target.closest('.tagsBox');
      
      // If target is a TD, look for tagsBox inside it
      if (!tagsBox && e.target.classList.contains('custom-cell')) {
        tagsBox = e.target.querySelector('.tagsBox');
      }
      
      console.log('[TagManager] Closest tagsBox:', !!tagsBox);
      if (tagsBox) {
        console.log('[TagManager] Dragover on tagsBox - adding drag-over class');
        e.preventDefault();
        
        // Remove drag-over from all other boxes first
        document.querySelectorAll('.tagsBox.drag-over').forEach(box => {
          if (box !== tagsBox) {
            box.classList.remove('drag-over');
          }
        });
        
        tagsBox.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      // Simplified - dragover handles cleanup, just remove from current target
      const tagsBox = e.target.closest('.tagsBox');
      if (tagsBox && e.target === tagsBox) {
        tagsBox.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', async (e) => {
      console.log('[TagManager] Document drop event, target:', e.target.className);
      let tagsBox = e.target.closest('.tagsBox');
      
      // If target is a TD, look for tagsBox inside it
      if (!tagsBox && e.target.classList.contains('custom-cell')) {
        tagsBox = e.target.querySelector('.tagsBox');
        console.log('[TagManager] Target is TD, found tagsBox inside:', !!tagsBox);
      }
      
      console.log('[TagManager] Closest tagsBox:', !!tagsBox);
      if (tagsBox) {
        e.preventDefault();
        e.stopPropagation();
        tagsBox.classList.remove('drag-over');
        
        console.log('[TagManager] Drop detected on tagsBox');
        
        // Get column key for this cell
        const td = tagsBox.closest('td');
        const columnKey = td ? td.dataset.key : null;
        
        if (!columnKey) {
          console.error('[TagManager] No column key found');
          return;
        }
        
        // Check if dropping a tag from database
        const tagId = e.dataTransfer.getData('text/tag-id');
        console.log('[TagManager] Tag ID from drag:', tagId);
        
        // Check if dropping image files
        const files = e.dataTransfer.files;
        console.log('[TagManager] Files in drop:', files.length);
        
        if (tagId && this.tags[tagId]) {
          // Handle existing tag drop
          const tagsValue = tagsBox.querySelector('.tags-value');
          if (tagsValue) {
            const ids = tagsValue.value.split(',').filter(id => id.trim());
            console.log('[TagManager] Current IDs:', ids);
            
            if (!ids.includes(tagId)) {
              ids.push(tagId);
              tagsValue.value = ids.join(',');
              console.log('[TagManager] Updated IDs:', ids);
              
              if (window.persist) {
                console.log('[TagManager] Calling window.persist()');
                window.persist();
              }
              
              if (td) {
                console.log('[TagManager] Re-hydrating box');
                this.hydrateTagsBox(td, tagsValue.value);
              }
            } else {
              console.log('[TagManager] Tag already in cell');
            }
          }
        } else if (files.length > 0 && files[0].type.startsWith('image/')) {
          // Handle image file drop - open crop editor
          console.log('[TagManager] Opening crop editor for dropped file:', files[0].name);
          
          const imageFile = files[0];
          
          // Store the file and column key for the editor
          this.uploadedFile = imageFile;
          this.currentColumnKey = columnKey;
          this.currentTargetBox = tagsBox;
          
          // Open editor with empty tag (will be populated on save)
          this.showEditor({ label: '', height: 80, columnKey: columnKey });
          
        } else {
          console.warn('[TagManager] No valid tag ID or image file in drop');
        }
      }
    });
  }
};

// Expose TagManager globally for copy/paste functionality
window.TagManager = TagManager;

console.log('[TagManager] Script loaded, calling init...');
TagManager.init();
