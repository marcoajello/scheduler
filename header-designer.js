/* ====================================================
   VISUAL HEADER DESIGNER
   Drag-and-drop header layout editor with justification
   ==================================================== */

(function() {
  'use strict';
  
  const GRID_SIZE = 10;
  
  let selectedElement = null;
  let isDragging = false;
  let isResizing = false;
  let startX = 0, startY = 0;
  let startPos = { x: 0, y: 0 };
  let startSize = { w: 0, h: 0 };
  let canvasWidth = 0;
  let canvasHeight = 150; // Default, will be updated from saved layout
  
  // Clipboard for copy/paste
  let clipboard = null;
  
  // Get current header layout from storage
  function getHeaderLayout() {
    try {
      const state = JSON.parse(localStorage.getItem('__SCHEDULER_STATE__') || '{}');
      return state.headerLayout || { elements: [], canvasWidth: 800, canvasHeight: 150 };
    } catch (e) {
      return { elements: [], canvasWidth: 800, canvasHeight: 150 };
    }
  }
  
  // Save header layout
  function saveHeaderLayout(layout) {
    try {
      const state = JSON.parse(localStorage.getItem('__SCHEDULER_STATE__') || '{}');
      state.headerLayout = layout;
      localStorage.setItem('__SCHEDULER_STATE__', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save header layout:', e);
    }
  }
  
  // Initialize the header designer
  function initHeaderDesigner() {
    const metaSection = document.getElementById('metaSection');
    if (!metaSection) return;
    
    // Remove old meta display row
    const oldDisplay = metaSection.querySelector('.meta-display-row');
    if (oldDisplay) oldDisplay.remove();
    
    // Create header designer UI
    const designerHTML = `
      <details class="card header-designer-panel">
        <summary>Header Designer</summary>
        <div class="header-designer">
          <div class="header-designer-toolbar">
            <button class="hd-btn" id="hdAddText">Text</button>
            <label class="hd-btn" style="color: white;">
              Media
              <input type="file" id="hdAddImage" accept="image/*">
            </label>
            <button class="hd-btn" id="hdAddCallTimes">Call Times</button>
            <div style="display: flex; gap: 4px; margin-left: 8px;">
              <button class="hd-btn hd-align-btn" data-align="left" title="Align Left">←</button>
              <button class="hd-btn hd-align-btn" data-align="center" title="Align Center">↔</button>
              <button class="hd-btn hd-align-btn" data-align="right" title="Align Right">→</button>
              <button class="hd-btn hd-align-btn" id="hdCenterVertical" title="Center Vertical">↕</button>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-left: auto; margin-right: 8px;">
              <label style="font-size: 12px; color: var(--muted);">Width:</label>
              <input type="number" id="hdCanvasWidth" value="800" min="400" max="2000" step="50" style="width: 70px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);">
              <span style="font-size: 11px; color: var(--muted);">px</span>
              
              <label style="font-size: 12px; color: var(--muted); margin-left: 8px;">Height:</label>
              <input type="number" id="hdCanvasHeight" value="150" min="50" max="500" step="10" style="width: 70px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);">
              <span style="font-size: 11px; color: var(--muted);">px</span>
              
              <div style="width: 1px; height: 20px; background: var(--border); margin: 0 4px;"></div>
              
              <label style="font-size: 12px; color: var(--muted);">BG:</label>
              <input type="color" id="hdCanvasBg" value="#ffffff" title="Canvas Background Color" style="width: 36px; height: 28px; padding: 2px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); cursor: pointer;">
              <button class="hd-btn ghost" id="hdResetBg" title="Reset to transparent" style="padding: 4px 8px; font-size: 11px;">✕</button>
              
              <div style="width: 1px; height: 20px; background: var(--border); margin: 0 4px;"></div>
              
              <label style="font-size: 12px; color: var(--muted);">Border:</label>
              <input type="number" id="hdCanvasBorderWidth" value="0" min="0" max="20" title="Border Width" style="width: 50px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);">
              <input type="color" id="hdCanvasBorderColor" value="#000000" title="Border Color" style="width: 36px; height: 28px; padding: 2px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); cursor: pointer;">
              <input type="number" id="hdCanvasBorderRadius" value="0" min="0" max="50" title="Border Radius" style="width: 50px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);" placeholder="↗">
            </div>
            <button class="hd-btn ghost" id="hdClear">Clear</button>
          </div>
          
          <div class="header-designer-canvas-wrapper">
            <div class="header-designer-canvas" id="headerCanvas">
              <div class="hd-grid"></div>
              <div class="hd-empty-hint" id="hdEmptyHint">
                <div>Drop images here or use buttons above</div>
                <small>Drag images from your computer • Use Cmd/Ctrl+C/V to copy/paste elements</small>
              </div>
            </div>
          </div>
          
          <div class="header-designer-properties" id="hdProperties">
            <div class="hd-prop-empty">Select an element to edit</div>
          </div>
        </div>
      </details>
    `;
    
    const colPanel = document.getElementById('colPanel');
    if (colPanel) {
      colPanel.insertAdjacentHTML('beforebegin', designerHTML);
    } else {
      metaSection.insertAdjacentHTML('beforeend', designerHTML);
    }
    
    // Restore panel open state from localStorage
    const designerPanel = document.querySelector('.header-designer-panel');
    const wasOpen = localStorage.getItem('__HD_PANEL_OPEN__') === 'true';
    if (designerPanel && wasOpen) {
      designerPanel.open = true;
    }
    
    // Save panel state when it changes
    if (designerPanel) {
      designerPanel.addEventListener('toggle', () => {
        localStorage.setItem('__HD_PANEL_OPEN__', designerPanel.open ? 'true' : 'false');
      });
    }
    
    attachDesignerListeners();
    renderHeaderElements();
    
    // Update canvas width and justifications when canvas resizes
    const canvas = document.getElementById('headerCanvas');
    
    // Use ResizeObserver on canvas for accurate detection
    if (canvas && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        handleCanvasResize();
      });
      resizeObserver.observe(canvas);
    }
    
    // ALSO use window resize as backup
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleCanvasResize, 50);
    });
    
    // Initial canvas width
    updateCanvasWidth();
    
    // Load and apply saved canvas width
    const layout = getHeaderLayout();
    const savedWidth = layout.canvasWidth || 800;
    const savedHeight = layout.canvasHeight || 150;
    const widthInput = document.getElementById('hdCanvasWidth');
    const heightInput = document.getElementById('hdCanvasHeight');
    
    if (widthInput) {
      widthInput.value = savedWidth;
      
      // Apply width to canvas
      if (canvas) {
        canvas.style.width = savedWidth + 'px';
        canvas.style.minWidth = savedWidth + 'px';
      }
      
      // Listen for width changes
      widthInput.addEventListener('input', () => {
        const newWidth = parseInt(widthInput.value) || 800;
        if (canvas) {
          canvas.style.width = newWidth + 'px';
          canvas.style.minWidth = newWidth + 'px';
        }
        
        // Save to layout
        const currentLayout = getHeaderLayout();
        currentLayout.canvasWidth = newWidth;
        saveHeaderLayout(currentLayout);
        
        // Update stored canvas width for justification calculations
        canvasWidth = newWidth;
        
        // Re-render all elements to update drag boundaries
        renderHeaderElements();
      });
    }
    
    if (heightInput) {
      heightInput.value = savedHeight;
      
      // Apply height to canvas
      if (canvas) {
        canvas.style.height = savedHeight + 'px';
      }
      
      // Update stored canvas height
      canvasHeight = savedHeight;
      
      // Listen for height changes
      heightInput.addEventListener('input', () => {
        const newHeight = parseInt(heightInput.value) || 150;
        if (canvas) {
          canvas.style.height = newHeight + 'px';
        }
        
        // Save to layout
        const currentLayout = getHeaderLayout();
        currentLayout.canvasHeight = newHeight;
        saveHeaderLayout(currentLayout);
        
        // Update stored canvas height for drag boundaries
        canvasHeight = newHeight;
        
        // Re-render all elements to update drag boundaries
        renderHeaderElements();
      });
    }
    
    // Load and apply saved canvas background color
    const savedBgColor = layout.canvasBgColor || '';
    const bgColorInput = document.getElementById('hdCanvasBg');
    const resetBgBtn = document.getElementById('hdResetBg');
    
    if (bgColorInput) {
      if (savedBgColor) {
        bgColorInput.value = savedBgColor;
        if (canvas) {
          canvas.style.backgroundColor = savedBgColor;
        }
      }
      
      // Listen for bg color changes
      bgColorInput.addEventListener('input', () => {
        const newColor = bgColorInput.value;
        if (canvas) {
          canvas.style.backgroundColor = newColor;
        }
        
        // Save to layout
        const currentLayout = getHeaderLayout();
        currentLayout.canvasBgColor = newColor;
        saveHeaderLayout(currentLayout);
      });
    }
    
    // Reset background color button
    if (resetBgBtn) {
      resetBgBtn.addEventListener('click', () => {
        if (canvas) {
          canvas.style.backgroundColor = '';
        }
        if (bgColorInput) {
          bgColorInput.value = '#ffffff';
        }
        
        // Save to layout
        const currentLayout = getHeaderLayout();
        currentLayout.canvasBgColor = '';
        saveHeaderLayout(currentLayout);
      });
    }
    
    // Canvas border controls
    const borderWidthInput = document.getElementById('hdCanvasBorderWidth');
    const borderColorInput = document.getElementById('hdCanvasBorderColor');
    const borderRadiusInput = document.getElementById('hdCanvasBorderRadius');
    
    // Load and apply saved canvas border settings
    if (layout.canvasBorderWidth) {
      if (borderWidthInput) borderWidthInput.value = layout.canvasBorderWidth;
      if (canvas) {
        canvas.style.borderWidth = layout.canvasBorderWidth + 'px';
        canvas.style.borderStyle = 'solid';
      }
    }
    if (layout.canvasBorderColor) {
      if (borderColorInput) borderColorInput.value = layout.canvasBorderColor;
      if (canvas) canvas.style.borderColor = layout.canvasBorderColor;
    }
    if (layout.canvasBorderRadius) {
      if (borderRadiusInput) borderRadiusInput.value = layout.canvasBorderRadius;
      if (canvas) canvas.style.borderRadius = layout.canvasBorderRadius + 'px';
    }
    
    // Border width handler
    if (borderWidthInput) {
      borderWidthInput.addEventListener('input', () => {
        const width = parseInt(borderWidthInput.value, 10) || 0;
        if (canvas) {
          if (width > 0) {
            canvas.style.borderWidth = width + 'px';
            canvas.style.borderStyle = 'solid';
            if (!canvas.style.borderColor) {
              canvas.style.borderColor = borderColorInput ? borderColorInput.value : '#000000';
            }
          } else {
            canvas.style.borderWidth = '';
            canvas.style.borderStyle = '';
          }
        }
        const currentLayout = getHeaderLayout();
        currentLayout.canvasBorderWidth = width;
        saveHeaderLayout(currentLayout);
      });
    }
    
    // Border color handler
    if (borderColorInput) {
      borderColorInput.addEventListener('input', () => {
        const color = borderColorInput.value;
        if (canvas) {
          canvas.style.borderColor = color;
        }
        const currentLayout = getHeaderLayout();
        currentLayout.canvasBorderColor = color;
        saveHeaderLayout(currentLayout);
      });
    }
    
    // Border radius handler
    if (borderRadiusInput) {
      borderRadiusInput.addEventListener('input', () => {
        const radius = parseInt(borderRadiusInput.value, 10) || 0;
        if (canvas) {
          canvas.style.borderRadius = radius + 'px';
        }
        const currentLayout = getHeaderLayout();
        currentLayout.canvasBorderRadius = radius;
        saveHeaderLayout(currentLayout);
      });
    }
    
    // Listen to metadata field changes and update header elements
    const metaFields = ['metaTitle', 'metaVersion', 'metaDate', 'metaDow', 'metaX', 'metaY'];
    metaFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', () => {
          updateMetadataElements();
        });
        field.addEventListener('change', () => {
          updateMetadataElements();
        });
      }
    });
    
    // Listen for schedule changes to update call times elements
    // Hook into the recalc function by observing schedule table changes
    const scheduleTable = document.getElementById('scheduleTable');
    if (scheduleTable && window.MutationObserver) {
      let updateTimeout;
      const observer = new MutationObserver(() => {
        // Debounce updates to avoid excessive re-renders
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          // Update all call times elements when schedule changes
          const layout = getHeaderLayout();
          layout.elements.forEach(element => {
            if (element.type === 'calltimes' && element.showDynamic) {
              updateCallTimesElementPreview(element);
            }
          });
        }, 150); // Wait 150ms after last change
      });
      observer.observe(scheduleTable, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true // Also watch for attribute changes
      });
    }
    
    // Also listen to input events directly for immediate updates
    document.addEventListener('input', (e) => {
      // If editing schedule fields, update call times
      if (e.target.closest('#scheduleTable')) {
        setTimeout(() => {
          const layout = getHeaderLayout();
          layout.elements.forEach(element => {
            if (element.type === 'calltimes' && element.showDynamic) {
              updateCallTimesElementPreview(element);
            }
          });
        }, 100);
      }
    });
  }
  
  // Update all metadata-bound elements when metadata changes
  function updateMetadataElements() {
    const layout = getHeaderLayout();
    console.log('[updateMetadataElements] Updating', layout.elements.length, 'elements');
    
    layout.elements.forEach(element => {
      if (element.metaTemplate) {
        console.log('[updateMetadataElements] Element has template:', element.metaTemplate);
        const el = document.querySelector(`[data-id="${element.id}"]`);
        const textarea = el?.querySelector('.hd-text-editable');
        if (textarea) {
          const renderedText = renderMetaTemplate(element.metaTemplate);
          console.log('[updateMetadataElements] Rendered text:', renderedText);
          textarea.value = renderedText;
          
          // Auto-size textarea
          const temp = document.createElement('span');
          temp.style.font = window.getComputedStyle(textarea).font;
          temp.style.visibility = 'hidden';
          temp.style.position = 'absolute';
          temp.style.whiteSpace = 'pre';
          temp.textContent = renderedText || 'New Text';
          document.body.appendChild(temp);
          const width = temp.offsetWidth;
          document.body.removeChild(temp);
          textarea.style.width = Math.max(60, width + 4) + 'px';
        }
      }
    });
  }
  
  // Update canvas width
  function updateCanvasWidth() {
    const canvas = document.getElementById('headerCanvas');
    if (canvas) {
      canvasWidth = canvas.clientWidth;
    }
  }
  
  // Handle canvas resize - DISABLED (using fixed width)
  function handleCanvasResize() {
    updateCanvasWidth(); // Just update the stored width, don't reposition anything
  }
  
  // Attach event listeners
  function attachDesignerListeners() {
    const canvas = document.getElementById('headerCanvas');
    
    document.getElementById('hdAddText')?.addEventListener('click', () => addElement('text'));
    document.getElementById('hdAddImage')?.addEventListener('change', handleImageUpload);
    document.getElementById('hdAddCallTimes')?.addEventListener('click', () => addElement('calltimes'));
    document.getElementById('hdCenterVertical')?.addEventListener('click', centerSelectedVertical);
    document.getElementById('hdClear')?.addEventListener('click', clearAllElements);
    
    // Alignment buttons
    document.querySelectorAll('.hd-align-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const align = btn.dataset.align;
        if (align && selectedElement) {
          selectedElement.justify = align;
          applyJustification(selectedElement);
          const el = document.querySelector(`[data-id="${selectedElement.id}"]`);
          if (el) {
            el.style.left = Math.round(selectedElement.x) + 'px';
            void el.offsetHeight;
          }
          
          // Update element in layout before saving
          const layout = getHeaderLayout();
          const idx = layout.elements.findIndex(el => el.id === selectedElement.id);
          if (idx !== -1) {
            layout.elements[idx] = selectedElement;
          }
          saveHeaderLayout(layout);
          
          showProperties(selectedElement);
        }
      });
    });
    
    canvas?.addEventListener('click', (e) => {
      if (e.target === canvas || e.target.classList.contains('hd-grid')) {
        deselectAll();
      }
    });
    
    // Keyboard shortcuts for copy/paste/cut/delete
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Canvas-level drag and drop for images
    if (canvas) {
      canvas.addEventListener('dragover', handleCanvasDragOver);
      canvas.addEventListener('drop', handleCanvasDrop);
      canvas.addEventListener('dragleave', handleCanvasDragLeave);
    }
  }
  
  // Keyboard shortcuts handler
  function handleKeyboardShortcuts(e) {
    // Allow shortcuts in textareas if:
    // 1. Textarea is readonly (metadata template), OR
    // 2. No text is currently selected in the textarea
    const isTextarea = e.target.tagName === 'TEXTAREA';
    const isInput = e.target.tagName === 'INPUT';
    const isSelect = e.target.tagName === 'SELECT';
    
    if (isTextarea) {
      const textarea = e.target;
      const isReadonly = textarea.hasAttribute('readonly');
      
      // If textarea is editable, always let browser handle copy/paste/cut
      if (!isReadonly) {
        return;
      }
      // If readonly, allow our shortcuts to work (for copying header elements)
    } else if (isInput || isSelect) {
      // For regular inputs and selects, don't intercept
      return;
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // Copy: Ctrl/Cmd + C
    if (cmdOrCtrl && e.key === 'c') {
      e.preventDefault();
      copyElement();
    }
    
    // Cut: Ctrl/Cmd + X
    if (cmdOrCtrl && e.key === 'x') {
      e.preventDefault();
      cutElement();
    }
    
    // Paste: Ctrl/Cmd + V
    if (cmdOrCtrl && e.key === 'v') {
      e.preventDefault();
      pasteElement();
    }
    
    // Delete: Delete or Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
      e.preventDefault();
      deleteElement(selectedElement.id);
    }
    
    // Duplicate: Ctrl/Cmd + D
    if (cmdOrCtrl && e.key === 'd') {
      e.preventDefault();
      duplicateElement();
    }
  }
  
  // Copy selected element to clipboard
  function copyElement() {
    if (!selectedElement) {
      console.log('No element selected to copy');
      return;
    }
    
    clipboard = JSON.parse(JSON.stringify(selectedElement));
    console.log('Copied element:', clipboard.type);
    
    // Visual feedback
    showToast('Copied!');
  }
  
  // Cut selected element to clipboard
  function cutElement() {
    if (!selectedElement) {
      console.log('No element selected to cut');
      return;
    }
    
    clipboard = JSON.parse(JSON.stringify(selectedElement));
    deleteElement(selectedElement.id);
    console.log('Cut element:', clipboard.type);
    
    // Visual feedback
    showToast('Cut!');
  }
  
  // Paste element from clipboard
  function pasteElement() {
    if (!clipboard) {
      console.log('Nothing in clipboard to paste');
      return;
    }
    
    const layout = getHeaderLayout();
    
    // Create new element with unique ID and offset position
    const newElement = JSON.parse(JSON.stringify(clipboard));
    newElement.id = 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Offset position so it doesn't paste exactly on top
    newElement.x += 20;
    newElement.y += 20;
    
    // Snap to grid
    newElement.x = Math.round(newElement.x / GRID_SIZE) * GRID_SIZE;
    newElement.y = Math.round(newElement.y / GRID_SIZE) * GRID_SIZE;
    
    // Keep within canvas bounds
    const canvas = document.getElementById('headerCanvas');
    if (canvas) {
      const maxX = canvas.clientWidth - newElement.width;
      const maxY = canvasHeight - newElement.height;
      if (newElement.x > maxX) newElement.x = 20;
      if (newElement.y > maxY) newElement.y = 20;
    }
    
    // Reset justification since position changed
    newElement.justify = 'none';
    newElement.justifyOffset = 0;
    
    layout.elements.push(newElement);
    saveHeaderLayout(layout);
    renderHeaderElements();
    
    setTimeout(() => selectElement(newElement), 10);
    
    console.log('Pasted element at', newElement.x, newElement.y);
    showToast('Pasted!');
  }
  
  // Duplicate selected element (shortcut: Cmd/Ctrl + D)
  function duplicateElement() {
    if (!selectedElement) {
      console.log('No element selected to duplicate');
      return;
    }
    
    copyElement();
    pasteElement();
  }
  
  // Canvas-level drag over handler
  function handleCanvasDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dragging a file
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      
      const canvas = document.getElementById('headerCanvas');
      if (canvas) {
        canvas.classList.add('drag-over');
      }
    }
  }
  
  // Canvas-level drag leave handler
  function handleCanvasDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = document.getElementById('headerCanvas');
    if (canvas && !canvas.contains(e.relatedTarget)) {
      canvas.classList.remove('drag-over');
    }
  }
  
  // Canvas-level drop handler for images
  function handleCanvasDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = document.getElementById('headerCanvas');
    if (canvas) {
      canvas.classList.remove('drag-over');
    }
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      console.log('Not an image file');
      return;
    }
    
    // Calculate position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Read image and create element
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Create image element at drop position
        const layout = getHeaderLayout();
        
        // Calculate size (maintain aspect ratio, max 200px wide)
        const maxWidth = 200;
        const aspectRatio = img.height / img.width;
        const width = Math.min(maxWidth, img.width);
        const height = width * aspectRatio;
        
        const newElement = {
          id: 'el_' + Date.now(),
          type: 'image',
          x: Math.round((x - width/2) / GRID_SIZE) * GRID_SIZE,
          y: Math.round((y - height/2) / GRID_SIZE) * GRID_SIZE,
          width: width,
          height: height,
          content: '',
          metaTemplate: '',
          imageData: ev.target.result,
          fontSize: 16,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          fontFamily: "'Century Gothic', 'AppleGothic', sans-serif",
          color: '#000000',
          bgColor: 'transparent',
          textAlign: 'center',
          verticalAlign: 'center',
          justify: 'none',
          justifyOffset: 0
        };
        
        // Keep within bounds
        if (newElement.x < 0) newElement.x = 0;
        if (newElement.y < 0) newElement.y = 0;
        if (newElement.x + newElement.width > canvas.clientWidth) {
          newElement.x = canvas.clientWidth - newElement.width;
        }
        if (newElement.y + newElement.height > canvasHeight) {
          newElement.y = canvasHeight - newElement.height;
        }
        
        layout.elements.push(newElement);
        saveHeaderLayout(layout);
        renderHeaderElements();
        
        setTimeout(() => selectElement(newElement), 10);
        console.log('Dropped image at', newElement.x, newElement.y);
        showToast('Image added!');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  // Show toast notification
  function showToast(message) {
    // Create or reuse toast element
    let toast = document.getElementById('hdToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hdToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--accent);
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 1500);
  }
  
  // Handle image file upload
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      addElement('image', ev.target.result);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = '';
  }
  
  // Add a new element
  function addElement(type, imageData = null) {
    const layout = getHeaderLayout();
    
    const newElement = {
      id: 'el_' + Date.now(),
      type: type,
      x: 20,
      y: 20,
      width: type === 'image' ? 80 : type === 'calltimes' ? 400 : 200,
      height: type === 'image' ? 80 : type === 'calltimes' ? 80 : 40,
      content: type === 'text' ? 'New Text' : '',
      metaTemplate: '', // e.g., "{title} v.{version}" for combined fields
      imageData: imageData || '',
      fontSize: type === 'calltimes' ? 11 : 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      fontFamily: "'Century Gothic', 'AppleGothic', sans-serif",
      color: '#000000',
      bgColor: 'transparent',
      textAlign: 'center',
      verticalAlign: 'center',
      justify: 'none',
      justifyOffset: 0,
      // Call times specific properties
      showDynamic: type === 'calltimes' ? true : undefined,
      columns: type === 'calltimes' ? 2 : undefined,
      ctSortDirection: type === 'calltimes' ? 'column' : undefined,
      textAlign: type === 'calltimes' ? 'center' : undefined,
      manualEntries: type === 'calltimes' ? [] : undefined
    };
    
    layout.elements.push(newElement);
    saveHeaderLayout(layout);
    renderHeaderElements();
    
    setTimeout(() => selectElement(newElement), 10);
  }
  
  // Clear all elements
  function clearAllElements() {
    if (!confirm('Clear all header elements?')) return;
    saveHeaderLayout({ elements: [] });
    renderHeaderElements();
  }
  
  // Center selected element vertically
  function centerSelectedVertical() {
    if (!selectedElement) {
      alert('Please select an element first');
      return;
    }
    
    selectedElement.y = (canvasHeight - selectedElement.height) / 2;
    selectedElement.y = Math.round(selectedElement.y / GRID_SIZE) * GRID_SIZE;
    
    const el = document.querySelector(`[data-id="${selectedElement.id}"]`);
    if (el) {
      el.style.top = selectedElement.y + 'px';
    }
    
    // Update properties panel
    const yInput = document.querySelector('[data-prop="y"]');
    if (yInput) yInput.value = selectedElement.y;
    
    // Save
    const layout = getHeaderLayout();
    const idx = layout.elements.findIndex(el => el.id === selectedElement.id);
    if (idx !== -1) {
      layout.elements[idx] = selectedElement;
    }
    saveHeaderLayout(layout);
  }
  
  // Render all header elements
  function renderHeaderElements() {
    const canvas = document.getElementById('headerCanvas');
    if (!canvas) return;
    
    canvas.querySelectorAll('.hd-element').forEach(el => el.remove());
    
    const layout = getHeaderLayout();
    const hint = document.getElementById('hdEmptyHint');
    
    // Show hint if no elements, hide if elements exist
    if (hint) {
      hint.style.display = layout.elements.length === 0 ? 'flex' : 'none';
    }
    
    console.log('[renderHeaderElements] Loading', layout.elements.length, 'elements');
    layout.elements.forEach((element, idx) => {
      console.log(`  [${idx}] ${element.type} at x:${element.x}, y:${element.y}, justify:${element.justify}`);
      createElementDOM(element);
    });
  }
  
  // Apply justification to element position
  function applyJustification(element) {
    updateCanvasWidth(); // Ensure we have current width
    
    console.log('[applyJustification] Canvas width:', canvasWidth, 'Element width:', element.width, 'Justify:', element.justify, 'Offset:', element.justifyOffset);
    
    if (element.justify === 'left') {
      element.x = element.justifyOffset;
    } else if (element.justify === 'center') {
      element.x = (canvasWidth - element.width) / 2 + element.justifyOffset;
    } else if (element.justify === 'right') {
      element.x = canvasWidth - element.width - element.justifyOffset;
    }
    
    console.log('[applyJustification] New X:', element.x);
    // 'none' = manual positioning, don't change x
  }
  
  // Create DOM for an element
  function createElementDOM(element) {
    const canvas = document.getElementById('headerCanvas');
    if (!canvas) return;
    
    // Don't modify positions on render - use saved values exactly
    // Justification only applies when user clicks alignment buttons
    
    const el = document.createElement('div');
    el.className = 'hd-element hd-element-' + element.type;
    el.dataset.id = element.id;
    updateElementStyle(el, element);
    
    let content = '';
    const textContent = element.metaTemplate ? renderMetaTemplate(element.metaTemplate) : element.content;
    
    if (element.type === 'text') {
      const vAlign = element.verticalAlign === 'top' ? 'flex-start' : element.verticalAlign === 'bottom' ? 'flex-end' : 'center';
      const fontStyle = element.fontStyle || 'normal';
      const textDecoration = element.textDecoration || 'none';
      
      content = `<div class="hd-text" style="font-size:${element.fontSize}px;font-weight:${element.fontWeight};font-style:${fontStyle};text-decoration:${textDecoration};font-family:${element.fontFamily};color:${element.color};text-align:${element.textAlign};justify-content:${element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start'};align-items:${vAlign};">
        <textarea class="hd-text-editable" style="text-align:${element.textAlign};font-weight:${element.fontWeight};font-style:${fontStyle};text-decoration:${textDecoration};font-family:${element.fontFamily};color:${element.color};" rows="1">${textContent}</textarea>
      </div>`;
    } else if (element.type === 'image') {
      if (element.imageData) {
        content = `<div class="hd-image-container"><img src="${element.imageData}"></div>`;
      } else {
        content = '<div class="hd-image-drop-zone">Drop image or click to upload</div>';
      }
    } else if (element.type === 'calltimes') {
      // Show preview of call times block
      const previewEntries = getCallTimesPreview(element);
      content = `<div class="hd-calltimes" style="font-size:${element.fontSize}px;font-family:${element.fontFamily};color:${element.color};padding:8px;overflow:hidden;">
        ${previewEntries}
      </div>`;
    }
    
    el.innerHTML = `
      ${content}
      <div class="hd-resize-handle"></div>
      <button class="hd-delete" title="Delete">×</button>
    `;
    
    canvas.appendChild(el);
    attachElementListeners(el, element);
  }
  
  // Update element style without recreating DOM
  function updateElementStyle(el, element) {
    el.style.left = element.x + 'px';
    el.style.top = element.y + 'px';
    el.style.width = element.width + 'px';
    el.style.height = element.height + 'px';
    
    // Apply background color for text and call times elements
    if ((element.type === 'text' || element.type === 'calltimes') && element.bgColor && element.bgColor !== 'transparent') {
      el.style.backgroundColor = element.bgColor;
    } else {
      el.style.backgroundColor = '';
    }
    
    // Apply border styling
    if (element.borderWidth && element.borderWidth > 0) {
      el.style.border = `${element.borderWidth}px solid ${element.borderColor || '#000000'}`;
    } else {
      el.style.border = '';
    }
    
    if (element.borderRadius) {
      el.style.borderRadius = element.borderRadius + 'px';
      el.style.overflow = 'hidden'; // Clip content to rounded corners
    } else {
      el.style.borderRadius = '';
      el.style.overflow = '';
    }
  }
  
  // Attach listeners to an element
  function attachElementListeners(el, element) {
    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('hd-delete')) {
        deleteElement(element.id);
        return;
      }
      
      if (e.target.classList.contains('hd-text-editable')) {
        selectElement(element);
        return;
      }
      
      if (e.target.classList.contains('hd-resize-handle')) {
        startResize(e, el, element);
      } else if (!e.target.classList.contains('hd-image-drop-zone')) {
        startDrag(e, el, element);
      }
    });
    
    // Image drag and drop
    const dropZone = el.querySelector('.hd-image-drop-zone');
    if (dropZone) {
      dropZone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = (ev) => {
            element.imageData = ev.target.result;
            
            // Update element in layout before saving
            const layout = getHeaderLayout();
            const idx = layout.elements.findIndex(el => el.id === element.id);
            if (idx !== -1) {
              layout.elements[idx] = element;
            }
            saveHeaderLayout(layout);
            
            updateElementContent(el, element);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
      
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });
      
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
          element.imageData = ev.target.result;
          
          // Update element in layout before saving
          const layout = getHeaderLayout();
          const idx = layout.elements.findIndex(el => el.id === element.id);
          if (idx !== -1) {
            layout.elements[idx] = element;
          }
          saveHeaderLayout(layout);
          
          // Replace image content live
          const container = el.querySelector('.hd-image-container, .hd-image-drop-zone');
          if (container) {
            container.outerHTML = `<div class="hd-image-container"><img src="${ev.target.result}"></div>`;
          }
        };
        reader.readAsDataURL(file);
      });
    }
    
    // Text editing
    const textarea = el.querySelector('.hd-text-editable');
    if (textarea) {
      // Make read-only if using metadata template
      if (element.metaTemplate) {
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.cursor = 'default';
        textarea.setAttribute('title', 'Using metadata template - edit in properties panel');
      }
      
      // Don't set explicit width/height - let CSS handle it (width: 100%, height: 100%)
      // Textarea will automatically fill the element box
      
      textarea.addEventListener('input', (e) => {
        // Only allow editing if not using metadata template
        if (element.metaTemplate) {
          e.preventDefault();
          return;
        }
        
        element.content = e.target.value;
        
        // Save to layout
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
      });
      
      textarea.addEventListener('focus', () => {
        selectElement(element);
      });
    }
  }
  
  // Start dragging
  function startDrag(e, el, element) {
    e.preventDefault();
    e.stopPropagation();
    
    selectElement(element);
    
    // If justified, switch to manual on drag
    if (element.justify !== 'none') {
      element.justify = 'none';
    }
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startPos = { x: element.x, y: element.y };
    
    const onMove = (ev) => {
      if (!isDragging) return;
      
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      
      element.x = Math.max(0, Math.min(canvasWidth - element.width, startPos.x + dx));
      element.y = Math.max(0, Math.min(canvasHeight - element.height, startPos.y + dy));
      
      element.x = Math.round(element.x / GRID_SIZE) * GRID_SIZE;
      element.y = Math.round(element.y / GRID_SIZE) * GRID_SIZE;
      
      updateElementStyle(el, element);
    };
    
    const onUp = () => {
      if (isDragging) {
        isDragging = false;
        
        // Update element in layout before saving
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
        
        showProperties(element); // Update properties panel
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  
  // Start resizing
  function startResize(e, el, element) {
    e.preventDefault();
    e.stopPropagation();
    
    selectElement(element);
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startSize = { w: element.width, h: element.height };
    
    const onMove = (ev) => {
      if (!isResizing) return;
      
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      
      element.width = Math.max(40, startSize.w + dx);
      element.height = Math.max(20, startSize.h + dy);
      
      element.width = Math.round(element.width / GRID_SIZE) * GRID_SIZE;
      element.height = Math.round(element.height / GRID_SIZE) * GRID_SIZE;
      
      updateElementStyle(el, element);
    };
    
    const onUp = () => {
      if (isResizing) {
        isResizing = false;
        
        // Update element in layout before saving
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
        
        showProperties(element); // Update properties panel
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
  
  // Select an element
  function selectElement(element) {
    selectedElement = element;
    
    document.querySelectorAll('.hd-element').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === element.id);
    });
    
    showProperties(element);
  }
  
  // Deselect all
  function deselectAll() {
    selectedElement = null;
    document.querySelectorAll('.hd-element').forEach(el => {
      el.classList.remove('selected');
    });
    
    const props = document.getElementById('hdProperties');
    if (props) {
      props.innerHTML = '<div class="hd-prop-empty">Select an element to edit</div>';
    }
  }
  
  // Get call times preview for canvas
  function getCallTimesPreview(element) {
    const entries = [];
    
    // Get dynamic call times from schedule if enabled
    if (element.showDynamic) {
      const dynamicEntries = getScheduleCallTimes();
      entries.push(...dynamicEntries);
    }
    
    // Add manual entries - calculate anchor-based times
    if (element.manualEntries && element.manualEntries.length > 0) {
      element.manualEntries.forEach(manualEntry => {
        let time = manualEntry.time;
        
        // If using anchor mode, calculate time based on anchor + offset
        if (manualEntry.isAnchor && manualEntry.anchorLabel) {
          const anchorEntry = entries.find(e => e.label === manualEntry.anchorLabel);
          if (anchorEntry) {
            time = calculateOffsetTime(anchorEntry.time, manualEntry.offsetMinutes || 0);
          } else {
            time = '—'; // Anchor not found
          }
        }
        
        entries.push({
          time: time,
          label: manualEntry.label,
          isManual: true
        });
      });
    }
    
    // Sort chronologically
    entries.sort((a, b) => {
      const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return 0;
        
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3];
        
        // Convert to 24-hour format
        if (meridiem) {
          const isPM = meridiem.toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        return hours * 60 + minutes; // Total minutes since midnight
      };
      
      return parseTime(a.time) - parseTime(b.time);
    });
    
    if (entries.length === 0) {
      return '<div style="color:var(--muted);font-style:italic;text-align:center;padding:20px;">No call times<br><small>Add manual entries or enable schedule sync</small></div>';
    }
    
    // Generate preview with selected sort direction
    const sortDirection = element.ctSortDirection || 'column';
    const cols = element.columns || 2;
    const spacingY = element.ctSpacingY !== undefined ? element.ctSpacingY : (element.ctSpacing !== undefined ? element.ctSpacing : 4);
    const spacingX = element.ctSpacingX !== undefined ? element.ctSpacingX : (element.ctSpacing !== undefined ? element.ctSpacing : 8);
    const textAlign = element.textAlign || 'center';
    
    let html = '';
    
    if (sortDirection === 'row') {
      // Row-first: fill left-to-right, then down
      html = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);row-gap:${spacingY}px;column-gap:${spacingX}px;font-size:${element.fontSize}px;">`;
      entries.forEach(entry => {
        html += `<div style="display:flex;gap:8px;white-space:nowrap;overflow:hidden;text-align:${textAlign};justify-content:${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};">
          <span style="font-weight:bold;">${entry.time}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;">${entry.label}</span>
        </div>`;
      });
    } else {
      // Column-first: fill top-to-bottom, then right
      const rows = Math.ceil(entries.length / cols);
      html = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},auto);grid-auto-flow:column;row-gap:${spacingY}px;column-gap:${spacingX}px;font-size:${element.fontSize}px;">`;
      entries.forEach(entry => {
        html += `<div style="display:flex;gap:8px;white-space:nowrap;overflow:hidden;text-align:${textAlign};justify-content:${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};">
          <span style="font-weight:bold;">${entry.time}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;">${entry.label}</span>
        </div>`;
      });
    }
    
    html += '</div>';
    return html;
  }
  
  // Calculate time with offset in minutes
  function calculateOffsetTime(timeStr, offsetMinutes) {
    // Parse time string like "08:00 AM" or "14:30"
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    const meridiem = match[3];
    
    // Convert to 24-hour if needed
    if (meridiem) {
      if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    
    // Add offset
    minutes += offsetMinutes;
    
    // Handle overflow/underflow
    while (minutes >= 60) {
      minutes -= 60;
      hours += 1;
    }
    while (minutes < 0) {
      minutes += 60;
      hours -= 1;
    }
    
    // Wrap hours
    if (hours >= 24) hours -= 24;
    if (hours < 0) hours += 24;
    
    // Format back to original style
    if (meridiem) {
      // Convert back to 12-hour
      const pm = hours >= 12;
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      return `${hours}:${minutes.toString().padStart(2, '0')} ${pm ? 'PM' : 'AM'}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  // Get call times from schedule
  function getScheduleCallTimes() {
    const entries = [];
    
    // Access schedule rows
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      if (tr.dataset.type === 'CALL TIME') {
        const endCell = tr.querySelector('td[data-key="end"]');
        const titleInput = tr.querySelector('.title');
        
        if (endCell && titleInput) {
          const time = endCell.textContent.trim();
          const label = titleInput.value || 'Call Time';
          
          if (time && time !== '—') {
            entries.push({ time, label, isDynamic: true });
          }
        }
      }
    });
    
    return entries;
  }
  
  // Render manual call times list for properties panel
  function renderManualCallTimesList(element) {
    if (!element.manualEntries || element.manualEntries.length === 0) {
      return '<div style="color:var(--muted);font-style:italic;padding:8px;text-align:center;font-size:11px;">No manual entries</div>';
    }
    
    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    element.manualEntries.forEach(entry => {
      const isAnchor = entry.isAnchor || false;
      html += `<div style="display:flex;flex-direction:column;gap:6px;padding:8px;background:var(--bg);border-radius:4px;border:1px solid var(--border);">
        <div style="display:flex;gap:6px;align-items:center;">`;
      
      if (isAnchor) {
        // Anchor mode: show anchor selector and offset
        html += `
          <select class="hd-prop-input hd-ct-anchor" data-entry-id="${entry.id}" style="flex:1;font-size:11px;">
            <option value="">Select anchor...</option>
            ${getAnchorOptions(element, entry.anchorLabel || '')}
          </select>
          <input type="number" class="hd-prop-input hd-ct-offset" data-entry-id="${entry.id}" value="${entry.offsetMinutes || 0}" style="width:50px;font-size:11px;" placeholder="0" title="Minutes offset">
          <span style="font-size:10px;color:var(--muted);">min</span>`;
      } else {
        // Fixed time mode: show time input
        html += `
          <input type="text" class="hd-prop-input hd-ct-time" data-entry-id="${entry.id}" value="${entry.time}" style="width:80px;font-size:11px;" placeholder="08:00 AM">`;
      }
      
      html += `
          <input type="text" class="hd-prop-input hd-ct-label" data-entry-id="${entry.id}" value="${entry.label}" style="flex:1;font-size:11px;" placeholder="Label">
          <button class="hd-btn ghost hd-ct-toggle" data-entry-id="${entry.id}" style="font-size:10px;padding:2px 6px;" title="Toggle anchor mode">ANCHOR</button>
          <button class="hd-btn ghost hd-ct-delete" data-entry-id="${entry.id}" style="font-size:14px;padding:2px 6px;" title="Delete">×</button>
        </div>
      </div>`;
    });
    html += '</div>';
    return html;
  }
  
  // Get anchor options for manual call time dropdown
  function getAnchorOptions(element, selectedLabel) {
    let html = '';
    
    // Get all dynamic call times from schedule
    if (element.showDynamic) {
      const dynamicEntries = getScheduleCallTimes();
      dynamicEntries.forEach(entry => {
        const selected = entry.label === selectedLabel ? 'selected' : '';
        html += `<option value="${entry.label}" ${selected}>${entry.label} (${entry.time})</option>`;
      });
    }
    
    return html;
  }
  
  // Update call times element preview in canvas
  function updateCallTimesElementPreview(element) {
    const el = document.querySelector(`[data-id="${element.id}"]`);
    if (!el) return;
    
    const container = el.querySelector('.hd-calltimes');
    if (container) {
      container.innerHTML = getCallTimesPreview(element);
    }
  }
  
  // Show properties panel
  function showProperties(element) {
    const props = document.getElementById('hdProperties');
    if (!props) return;
    
    let html = '';
    
    // CALL TIMES ELEMENTS - Ultra-compact horizontal layout
    if (element.type === 'calltimes') {
      html = `<div class="hd-prop-compact">`;
      
      // Position & Size
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Position & Size</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Pos</span>
            <input type="number" class="hd-prop-input" data-prop="x" value="${Math.round(element.x)}" min="0" step="${GRID_SIZE}" style="width: 50px;">
            <span style="font-size: 10px; color: var(--muted);">×</span>
            <input type="number" class="hd-prop-input" data-prop="y" value="${Math.round(element.y)}" min="0" step="${GRID_SIZE}" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Size</span>
            <input type="number" class="hd-prop-input" data-prop="width" value="${element.width}" min="40" step="${GRID_SIZE}" style="width: 50px;">
            <span style="font-size: 10px; color: var(--muted);">×</span>
            <input type="number" class="hd-prop-input" data-prop="height" value="${element.height}" min="20" step="${GRID_SIZE}" style="width: 50px;">
          </div>
        </div>
      `;
      
      // Layout
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Layout</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Font</span>
            <input type="number" class="hd-prop-input" data-prop="fontSize" value="${element.fontSize}" min="8" max="24" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Sort</span>
            <select class="hd-prop-input" data-prop="ctSortDirection" style="width: 85px;">
              <option value="row" ${element.ctSortDirection === 'row' ? 'selected' : ''}>→ Then ↓</option>
              <option value="column" ${!element.ctSortDirection || element.ctSortDirection === 'column' ? 'selected' : ''}>↓ Then →</option>
            </select>
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Align</span>
            <select class="hd-prop-input" data-prop="textAlign" style="width: 85px;">
              <option value="left" ${element.textAlign === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${!element.textAlign || element.textAlign === 'center' ? 'selected' : ''}>Center</option>
              <option value="right" ${element.textAlign === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Cols</span>
            <select class="hd-prop-input" data-prop="columns" style="width: 50px;">
              <option value="1" ${parseInt(element.columns) === 1 ? 'selected' : ''}>1</option>
              <option value="2" ${!element.columns || parseInt(element.columns) === 2 ? 'selected' : ''}>2</option>
              <option value="3" ${parseInt(element.columns) === 3 ? 'selected' : ''}>3</option>
              <option value="4" ${parseInt(element.columns) === 4 ? 'selected' : ''}>4</option>
              <option value="5" ${parseInt(element.columns) === 5 ? 'selected' : ''}>5</option>
              <option value="6" ${parseInt(element.columns) === 6 ? 'selected' : ''}>6</option>
            </select>
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">H-Gap</span>
            <input type="number" class="hd-prop-input" data-prop="ctSpacingX" value="${element.ctSpacingX !== undefined ? element.ctSpacingX : (element.ctSpacing !== undefined ? element.ctSpacing : 8)}" min="0" max="40" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">V-Gap</span>
            <input type="number" class="hd-prop-input" data-prop="ctSpacingY" value="${element.ctSpacingY !== undefined ? element.ctSpacingY : (element.ctSpacing !== undefined ? element.ctSpacing : 4)}" min="0" max="40" style="width: 50px;">
          </div>
        </div>
      `;
      
      // Style
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Style</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Color</span>
            <input type="color" class="hd-prop-input" data-prop="color" value="${element.color}" style="width: 40px; height: 24px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">BG</span>
            <input type="color" class="hd-prop-input" data-prop="bgColor" value="${element.bgColor || '#ffffff'}" style="width: 40px; height: 24px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Bord</span>
            <input type="number" class="hd-prop-input" data-prop="borderWidth" value="${element.borderWidth || 0}" min="0" max="20" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Rad</span>
            <input type="number" class="hd-prop-input" data-prop="borderRadius" value="${element.borderRadius || 0}" min="0" max="50" style="width: 50px;">
          </div>
        </div>
      `;
      
      // Sources (no border-right, flexible width)
      html += `
        <div class="hd-prop-section" style="border-right: none; flex: 1; min-width: 200px;">
          <div class="hd-prop-section-header">Sources</div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <label style="display: flex; flex-direction: column; gap: 4px;">
              <input type="checkbox" id="hdShowDynamic" ${element.showDynamic ? 'checked' : ''} style="align-self: flex-start;">
              <span style="font-size: 11px; font-weight: 600;">From schedule</span>
            </label>
            <div style="width: 1px; height: 30px; background: var(--border);"></div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <label style="font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase;">Manual</label>
              <button class="hd-btn" id="hdAddManualCallTime" style="font-size: 10px; padding: 3px 8px;">+ Add</button>
            </div>
          </div>
          <div id="hdManualCallTimesList" style="max-height: 100px; overflow-y: auto; font-size: 11px;">
            ${renderManualCallTimesList(element)}
          </div>
        </div>
      `;
      
      html += `</div>`;
    }
    
    // TEXT ELEMENTS - Ultra-compact horizontal layout
    else if (element.type === 'text') {
      const hasTemplate = element.metaTemplate && element.metaTemplate.length > 0;
      
      html = `<div class="hd-prop-compact">`;
      
      // Position & Size
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Position & Size</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Pos</span>
            <input type="number" class="hd-prop-input" data-prop="x" value="${Math.round(element.x)}" min="0" step="${GRID_SIZE}" style="width: 50px;">
            <span style="font-size: 10px; color: var(--muted);">×</span>
            <input type="number" class="hd-prop-input" data-prop="y" value="${Math.round(element.y)}" min="0" step="${GRID_SIZE}" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Size</span>
            <input type="number" class="hd-prop-input" data-prop="width" value="${element.width}" min="40" step="${GRID_SIZE}" style="width: 50px;">
            <span style="font-size: 10px; color: var(--muted);">×</span>
            <input type="number" class="hd-prop-input" data-prop="height" value="${element.height}" min="20" step="${GRID_SIZE}" style="width: 50px;">
          </div>
        </div>
      `;
      
      // Font
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Font</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Size</span>
            <input type="number" class="hd-prop-input" data-prop="fontSize" value="${element.fontSize}" min="8" max="72" style="width: 50px;">
          </div>
          <div class="hd-prop-field" style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="checkbox" class="hd-prop-checkbox" data-prop="fontWeight" ${element.fontWeight === 'bold' ? 'checked' : ''}>
              <span class="hd-prop-label" style="margin: 0;">Bold</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="checkbox" class="hd-prop-checkbox" data-prop="fontStyle" ${element.fontStyle === 'italic' ? 'checked' : ''}>
              <span class="hd-prop-label" style="margin: 0;">Italic</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="checkbox" class="hd-prop-checkbox" data-prop="textDecoration" ${element.textDecoration === 'underline' ? 'checked' : ''}>
              <span class="hd-prop-label" style="margin: 0;">Under</span>
            </label>
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Fam</span>
            <select class="hd-prop-input" data-prop="fontFamily" style="width: 100px;">
              <option value="'Century Gothic', 'AppleGothic', sans-serif" ${!element.fontFamily || element.fontFamily === "'Century Gothic', 'AppleGothic', sans-serif" ? 'selected' : ''}>Cent</option>
              <option value="Arial, sans-serif" ${element.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
              <option value="'Courier New', monospace" ${element.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Cour</option>
              <option value="Georgia, serif" ${element.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georg</option>
              <option value="'Times New Roman', serif" ${element.fontFamily === "'Times New Roman', serif" ? 'selected' : ''}>Times</option>
              <option value="Verdana, sans-serif" ${element.fontFamily === 'Verdana, sans-serif' ? 'selected' : ''}>Verd</option>
              <option value="'Trebuchet MS', sans-serif" ${element.fontFamily === "'Trebuchet MS', sans-serif" ? 'selected' : ''}>Treb</option>
              <option value="'Comic Sans MS', cursive" ${element.fontFamily === "'Comic Sans MS', cursive" ? 'selected' : ''}>Comic</option>
              <option value="Impact, sans-serif" ${element.fontFamily === 'Impact, sans-serif' ? 'selected' : ''}>Impact</option>
              <option value="inherit" ${element.fontFamily === 'inherit' ? 'selected' : ''}>System</option>
            </select>
          </div>
        </div>
      `;
      
      // Colors
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Colors</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Text</span>
            <input type="color" class="hd-prop-input" data-prop="color" value="${element.color}" style="width: 40px; height: 24px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">BG</span>
            <input type="color" class="hd-prop-input" data-prop="bgColor" value="${element.bgColor || '#ffffff'}" style="width: 40px; height: 24px;">
          </div>
        </div>
      `;
      
      // Alignment
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Alignment</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Horiz</span>
            <select class="hd-prop-input" data-prop="textAlign" style="width: 60px;">
              <option value="left" ${element.textAlign === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${element.textAlign === 'center' ? 'selected' : ''}>Ctr</option>
              <option value="right" ${element.textAlign === 'right' ? 'selected' : ''}>Right</option>
            </select>
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Vert</span>
            <select class="hd-prop-input" data-prop="verticalAlign" style="width: 60px;">
              <option value="top" ${element.verticalAlign === 'top' ? 'selected' : ''}>Top</option>
              <option value="center" ${!element.verticalAlign || element.verticalAlign === 'center' ? 'selected' : ''}>Ctr</option>
              <option value="bottom" ${element.verticalAlign === 'bottom' ? 'selected' : ''}>Btm</option>
            </select>
          </div>
        </div>
      `;
      
      // Border
      html += `
        <div class="hd-prop-section" style="border-right: none;">
          <div class="hd-prop-section-header">Border</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Width</span>
            <input type="number" class="hd-prop-input" data-prop="borderWidth" value="${element.borderWidth || 0}" min="0" max="20" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Rad</span>
            <input type="number" class="hd-prop-input" data-prop="borderRadius" value="${element.borderRadius || 0}" min="0" max="50" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Color</span>
            <input type="color" class="hd-prop-input" data-prop="borderColor" value="${element.borderColor || '#000000'}" style="width: 40px; height: 24px;">
          </div>
        </div>
      `;
      
      html += `</div>`;
      
      // Metadata template section - ultra compact single line
      html += `
        <div style="margin-top: 8px; padding: 6px 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 6px; margin: 0; white-space: nowrap;">
              <input type="checkbox" id="hdUseMetadata" ${hasTemplate ? 'checked' : ''}>
              <span style="font-size: 11px; font-weight: 600;">Use metadata fields</span>
            </label>
      `;
      
      if (hasTemplate) {
        html += `
            <input type="text" class="hd-prop-input" id="hdMetaTemplate" value="${element.metaTemplate}" style="flex: 1; font-family: monospace; font-size: 11px; min-width: 150px;" placeholder="{title} | {version}">
            <div style="display: flex; gap: 3px;">
              <button class="hd-meta-btn" data-insert="{title}">TITLE</button>
              <button class="hd-meta-btn" data-insert="{version}">VER</button>
              <button class="hd-meta-btn" data-insert="{date}">DATE</button>
              <button class="hd-meta-btn" data-insert="{dateFormatted}">FMT DATE</button>
              <button class="hd-meta-btn" data-insert="{dow}">DOW</button>
              <button class="hd-meta-btn" data-insert="{x}">DAY #</button>
              <button class="hd-meta-btn" data-insert="{y}">TOTAL</button>
            </div>
          </div>
          <div style="padding: 4px 6px; background: var(--bg); border-radius: 3px; font-size: 10px; margin-top: 6px;">
            <span style="color: var(--muted);">Preview:</span> <span style="color: var(--accent); font-weight: 600;">${renderMetaTemplate(element.metaTemplate)}</span>
          </div>
        `;
      } else {
        html += `</div>`;
      }
      
      html += `</div>`;
    }
    
    // IMAGE ELEMENTS - Ultra-compact horizontal layout
    else if (element.type === 'image') {
      html = `<div class="hd-prop-compact">`;
      
      // Position & Size
      html += `
        <div class="hd-prop-section">
          <div class="hd-prop-section-header">Position & Size</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Pos</span>
            <input type="number" class="hd-prop-input" data-prop="x" value="${Math.round(element.x)}" min="0" step="${GRID_SIZE}" style="width: 50px;">
            <span style="font-size: 10px; color: var(--muted);">×</span>
            <input type="number" class="hd-prop-input" data-prop="y" value="${Math.round(element.y)}" min="0" step="${GRID_SIZE}" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Size</span>
            <input type="number" class="hd-prop-input" data-prop="width" value="${element.width}" min="40" step="${GRID_SIZE}" style="width: 50px;">
            <span style="font-size: 10px; color: var(--muted);">×</span>
            <input type="number" class="hd-prop-input" data-prop="height" value="${element.height}" min="20" step="${GRID_SIZE}" style="width: 50px;">
          </div>
        </div>
      `;
      
      // Border
      html += `
        <div class="hd-prop-section" style="border-right: none;">
          <div class="hd-prop-section-header">Border</div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Width</span>
            <input type="number" class="hd-prop-input" data-prop="borderWidth" value="${element.borderWidth || 0}" min="0" max="20" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Rad</span>
            <input type="number" class="hd-prop-input" data-prop="borderRadius" value="${element.borderRadius || 0}" min="0" max="50" style="width: 50px;">
          </div>
          <div class="hd-prop-field">
            <span class="hd-prop-label">Color</span>
            <input type="color" class="hd-prop-input" data-prop="borderColor" value="${element.borderColor || '#000000'}" style="width: 40px; height: 24px;">
          </div>
        </div>
      `;
      
      html += `</div>`;
    }
    
    props.innerHTML = html;
    
    // Call times - Show dynamic checkbox handler
    const showDynamicCheckbox = document.getElementById('hdShowDynamic');
    if (showDynamicCheckbox) {
      showDynamicCheckbox.addEventListener('change', (e) => {
        element.showDynamic = e.target.checked;
        
        // Update element in layout before saving
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
        
        updateCallTimesElementPreview(element);
      });
    }
    
    // Call times - Add manual entry button
    const addManualBtn = document.getElementById('hdAddManualCallTime');
    if (addManualBtn) {
      addManualBtn.addEventListener('click', () => {
        if (!element.manualEntries) element.manualEntries = [];
        element.manualEntries.push({
          id: 'manual_' + Date.now(),
          time: '08:00 AM',
          label: 'New Call Time',
          isAnchor: false,  // true if using anchor + offset
          anchorLabel: '',  // e.g., "Actor 1" - the call time to anchor to
          offsetMinutes: 0  // e.g., -30 for 30 mins before, +15 for 15 mins after
        });
        
        // Update element in layout before saving
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
        
        showProperties(element);
        updateCallTimesElementPreview(element);
      });
    }
    
    // Call times - Manual entries event delegation
    const manualList = document.getElementById('hdManualCallTimesList');
    if (manualList) {
      manualList.addEventListener('click', (e) => {
        if (e.target.classList.contains('hd-ct-delete')) {
          const entryId = e.target.dataset.entryId;
          element.manualEntries = element.manualEntries.filter(entry => entry.id !== entryId);
          
          // Update element in layout before saving
          const layout = getHeaderLayout();
          const idx = layout.elements.findIndex(el => el.id === element.id);
          if (idx !== -1) {
            layout.elements[idx] = element;
          }
          saveHeaderLayout(layout);
          
          showProperties(element);
          updateCallTimesElementPreview(element);
        } else if (e.target.classList.contains('hd-ct-toggle')) {
          // Toggle between anchor mode and fixed time mode
          const entryId = e.target.dataset.entryId;
          const entry = element.manualEntries.find(e => e.id === entryId);
          if (entry) {
            entry.isAnchor = !entry.isAnchor;
            
            // Update element in layout before saving
            const layout = getHeaderLayout();
            const idx = layout.elements.findIndex(el => el.id === element.id);
            if (idx !== -1) {
              layout.elements[idx] = element;
            }
            saveHeaderLayout(layout);
            
            showProperties(element);
            updateCallTimesElementPreview(element);
          }
        }
      });
      
      manualList.addEventListener('input', (e) => {
        if (e.target.classList.contains('hd-ct-time') || e.target.classList.contains('hd-ct-label') || 
            e.target.classList.contains('hd-ct-offset')) {
          const entryId = e.target.dataset.entryId;
          const entry = element.manualEntries.find(e => e.id === entryId);
          if (entry) {
            if (e.target.classList.contains('hd-ct-time')) {
              entry.time = e.target.value;
              updateCallTimesElementPreview(element);
              saveHeaderLayout(layout);
            } else if (e.target.classList.contains('hd-ct-label')) {
              entry.label = e.target.value;
              updateCallTimesElementPreview(element);
              saveHeaderLayout(layout);
            } else if (e.target.classList.contains('hd-ct-offset')) {
              entry.offsetMinutes = parseInt(e.target.value, 10) || 0;
              updateCallTimesElementPreview(element);
              saveHeaderLayout(layout);
            }
          }
        }
      });
      
      manualList.addEventListener('change', (e) => {
        if (e.target.classList.contains('hd-ct-anchor')) {
          const entryId = e.target.dataset.entryId;
          const entry = element.manualEntries.find(e => e.id === entryId);
          if (entry) {
            entry.anchorLabel = e.target.value;
            updateCallTimesElementPreview(element);
            saveHeaderLayout(layout);
          }
        }
      });
    }
    
    
    // Metadata checkbox handler
    const metaCheckbox = document.getElementById('hdUseMetadata');
    if (metaCheckbox) {
      metaCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          // Enable metadata - set default template if empty
          element.metaTemplate = element.metaTemplate || '{title}';
          element.content = '';
        } else {
          // Disable metadata - move template to content
          element.content = element.metaTemplate || element.content;
          element.metaTemplate = '';
        }
        
        // Update textarea
        const el = document.querySelector(`[data-id="${element.id}"]`);
        const textarea = el?.querySelector('.hd-text-editable');
        if (textarea) {
          const displayText = element.metaTemplate ? renderMetaTemplate(element.metaTemplate) : element.content;
          textarea.value = displayText;
        }
        
        // Update element in layout before saving
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
        
        showProperties(element);
      });
    }
    
    // Metadata template input handler
    const templateInput = document.getElementById('hdMetaTemplate');
    if (templateInput) {
      templateInput.addEventListener('input', (e) => {
        element.metaTemplate = e.target.value;
        
        // Update textarea live
        const el = document.querySelector(`[data-id="${element.id}"]`);
        const textarea = el?.querySelector('.hd-text-editable');
        if (textarea) {
          const renderedText = renderMetaTemplate(element.metaTemplate);
          textarea.value = renderedText;
          
          // Auto-size textarea
          const temp = document.createElement('span');
          temp.style.font = window.getComputedStyle(textarea).font;
          temp.style.visibility = 'hidden';
          temp.style.position = 'absolute';
          temp.style.whiteSpace = 'pre';
          temp.textContent = renderedText || 'New Text';
          document.body.appendChild(temp);
          const width = temp.offsetWidth;
          document.body.removeChild(temp);
          textarea.style.width = Math.max(60, width + 4) + 'px';
        }
        
        // Save
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
        
        // Update preview in properties
        const previewDiv = props.querySelector('div[style*="background: var(--panel)"] small:last-child');
        if (previewDiv) {
          previewDiv.textContent = renderMetaTemplate(element.metaTemplate);
        }
      });
    }
    
    // Quick-insert metadata buttons
    props.querySelectorAll('.hd-meta-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const codeToInsert = btn.dataset.insert;
        const templateInput = document.getElementById('hdMetaTemplate');
        
        if (templateInput) {
          // Insert at cursor position or end
          const cursorPos = templateInput.selectionStart;
          const currentValue = templateInput.value;
          const newValue = currentValue.substring(0, cursorPos) + codeToInsert + currentValue.substring(cursorPos);
          
          templateInput.value = newValue;
          templateInput.focus();
          templateInput.selectionStart = templateInput.selectionEnd = cursorPos + codeToInsert.length;
          
          // Trigger input event to update everything
          templateInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    
    // Property change listeners - UPDATE LIVE, NO RE-RENDER
    props.querySelectorAll('.hd-prop-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const prop = e.target.dataset.prop;
        let value = e.target.value;
        
        if (['x', 'y', 'width', 'height', 'fontSize', 'borderWidth', 'borderRadius', 'ctSpacingX', 'ctSpacingY', 'columns'].includes(prop)) {
          value = parseInt(value, 10) || 0;
        }
        
        element[prop] = value;
        
        const el = document.querySelector(`[data-id="${element.id}"]`);
        if (!el) return;
        
        // Apply changes LIVE to the DOM
        if (prop === 'x' || prop === 'y') {
          el.style.left = element.x + 'px';
          el.style.top = element.y + 'px';
        } else if (prop === 'width' || prop === 'height') {
          el.style.width = element.width + 'px';
          el.style.height = element.height + 'px';
        } else if (prop === 'fontSize') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.fontSize = value + 'px';
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.fontSize = value + 'px';
          }
          // Also update call times preview
          if (element.type === 'calltimes') {
            updateCallTimesElementPreview(element);
          }
        } else if (prop === 'columns' && element.type === 'calltimes') {
          // Update call times columns
          updateCallTimesElementPreview(element);
        } else if (prop === 'ctSortDirection' && element.type === 'calltimes') {
          // Update call times sort direction
          updateCallTimesElementPreview(element);
        } else if (prop === 'textAlign' && element.type === 'calltimes') {
          // Update call times text alignment
          updateCallTimesElementPreview(element);
        } else if ((prop === 'ctSpacing' || prop === 'ctSpacingX' || prop === 'ctSpacingY') && element.type === 'calltimes') {
          // Update call times spacing
          updateCallTimesElementPreview(element);
        } else if (prop === 'color' && element.type === 'calltimes') {
          // Update call times color
          const callTimesDiv = el.querySelector('.hd-calltimes');
          if (callTimesDiv) {
            callTimesDiv.style.color = value;
          }
        } else if (prop === 'textStyle') {
          // Parse combined style value: "weight-style-decoration"
          const [weight, style, decoration] = value.split('-');
          element.fontWeight = weight;
          element.fontStyle = style;
          element.textDecoration = decoration;
          
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.fontWeight = weight;
            textDiv.style.fontStyle = style;
            textDiv.style.textDecoration = decoration;
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) {
              textarea.style.fontWeight = weight;
              textarea.style.fontStyle = style;
              textarea.style.textDecoration = decoration;
            }
          }
        } else if (prop === 'fontWeight') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.fontWeight = value;
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.fontWeight = value;
          }
        } else if (prop === 'fontStyle') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.fontStyle = value;
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.fontStyle = value;
          }
        } else if (prop === 'textDecoration') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.textDecoration = value;
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.textDecoration = value;
          }
        } else if (prop === 'fontFamily') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.fontFamily = value;
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.fontFamily = value;
          }
        } else if (prop === 'color') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.color = value;
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.color = value;
          }
        } else if (prop === 'bgColor') {
          // Apply background color to outer element
          if (value === 'transparent' || !value) {
            el.style.backgroundColor = '';
          } else {
            el.style.backgroundColor = value;
          }
        } else if (prop === 'textAlign') {
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            textDiv.style.textAlign = value;
            textDiv.style.justifyContent = value === 'center' ? 'center' : value === 'right' ? 'flex-end' : 'flex-start';
            const textarea = textDiv.querySelector('.hd-text-editable');
            if (textarea) textarea.style.textAlign = value;
          }
        } else if (prop === 'verticalAlign') {
          console.log('[verticalAlign] Changing to:', value, 'for element:', element.id);
          const textDiv = el.querySelector('.hd-text, .hd-meta');
          if (textDiv) {
            const alignItemsValue = value === 'top' ? 'flex-start' : value === 'bottom' ? 'flex-end' : 'center';
            console.log('[verticalAlign] Setting alignItems to:', alignItemsValue);
            textDiv.style.alignItems = alignItemsValue;
          } else {
            console.warn('[verticalAlign] No text div found for element:', element.id);
          }
        } else if (prop === 'borderWidth') {
          if (value && value > 0) {
            el.style.border = `${value}px solid ${element.borderColor || '#000000'}`;
          } else {
            el.style.border = '';
          }
        } else if (prop === 'borderRadius') {
          el.style.borderRadius = value ? value + 'px' : '';
        } else if (prop === 'borderColor') {
          if (element.borderWidth && element.borderWidth > 0) {
            el.style.borderColor = value;
          }
        }
      });
      
      // Save immediately for dropdowns, on blur for text inputs
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', () => {
          console.log('[Property Save] SELECT changed, saving. Element justify:', element.justify);
          // Get current layout, find our element, and save
          const layout = getHeaderLayout();
          const idx = layout.elements.findIndex(el => el.id === element.id);
          if (idx !== -1) {
            layout.elements[idx] = element;
          }
          saveHeaderLayout(layout);
        });
      } else {
        input.addEventListener('blur', () => {
          console.log('[Property Save] INPUT blurred, saving. Element justify:', element.justify);
          // Get current layout, find our element, and save
          const layout = getHeaderLayout();
          const idx = layout.elements.findIndex(el => el.id === element.id);
          if (idx !== -1) {
            layout.elements[idx] = element;
          }
          saveHeaderLayout(layout);
        });
      }
    });
    
    // Checkbox listeners for Bold, Italic, Underline
    props.querySelectorAll('.hd-prop-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const prop = e.target.dataset.prop;
        const isChecked = e.target.checked;
        
        let value;
        if (prop === 'fontWeight') {
          value = isChecked ? 'bold' : 'normal';
        } else if (prop === 'fontStyle') {
          value = isChecked ? 'italic' : 'normal';
        } else if (prop === 'textDecoration') {
          value = isChecked ? 'underline' : 'none';
        }
        
        element[prop] = value;
        
        const el = document.querySelector(`[data-id="${element.id}"]`);
        if (!el) return;
        
        const textDiv = el.querySelector('.hd-text, .hd-meta');
        if (textDiv) {
          textDiv.style[prop] = value;
          const textarea = textDiv.querySelector('.hd-text-editable');
          if (textarea) textarea.style[prop] = value;
        }
        
        // Save immediately
        const layout = getHeaderLayout();
        const idx = layout.elements.findIndex(el => el.id === element.id);
        if (idx !== -1) {
          layout.elements[idx] = element;
        }
        saveHeaderLayout(layout);
      });
    });
  }
  
  // Delete an element
  function deleteElement(id) {
    const layout = getHeaderLayout();
    layout.elements = layout.elements.filter(el => el.id !== id);
    saveHeaderLayout(layout);
    renderHeaderElements();
    deselectAll();
  }
  
  // Render metadata template
  function renderMetaTemplate(template) {
    const getValue = (id) => document.getElementById(id)?.value || '';
    
    // Format date as MONTH DAY YEAR
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString + 'T00:00:00'); // Parse as local date
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };
    
    const title = getValue('metaTitle') || 'Untitled';
    const version = getValue('metaVersion') || '1.0';
    const date = getValue('metaDate');
    const dow = getValue('metaDow') || '';
    const x = getValue('metaX') || '1';
    const y = getValue('metaY') || '1';
    
    console.log('[renderMetaTemplate] Values:', { title, version, date, dow, x, y });
    
    return template
      .replace(/{title}/g, title)
      .replace(/{version}/g, version)
      .replace(/{date}/g, date)  // Use raw date format
      .replace(/{dateFormatted}/g, formatDate(date))  // Optional formatted version
      .replace(/{dow}/g, dow)
      .replace(/{x}/g, x)  // Support short form
      .replace(/{y}/g, y)  // Support short form
      .replace(/{dayX}/g, x)  // Support long form for backwards compatibility
      .replace(/{dayY}/g, y); // Support long form for backwards compatibility
  }
  
  // Get metadata value
  function getMetadataValue(field) {
    const getValue = (id) => document.getElementById(id)?.value || '';
    
    switch (field) {
      case 'title': return getValue('metaTitle') || 'Untitled';
      case 'version': return getValue('metaVersion') || '1.0';
      case 'date': return getValue('metaDate') || '';
      case 'dow': return getValue('metaDow') || '';
      case 'dayX': return getValue('metaX') || '1';
      case 'dayY': return getValue('metaY') || '1';
      default: return field;
    }
  }
  
  // Generate call times print HTML
  function generateCallTimesPrintHTML(printElement, element) {
    const entries = [];
    
    // Get dynamic call times from schedule if enabled
    if (element.showDynamic) {
      const dynamicEntries = getScheduleCallTimes();
      entries.push(...dynamicEntries);
    }
    
    // Add manual entries
    if (element.manualEntries && element.manualEntries.length > 0) {
      entries.push(...element.manualEntries.map(e => ({
        time: e.time,
        label: e.label,
        isManual: true
      })));
    }
    
    // Sort chronologically
    entries.sort((a, b) => {
      // Convert times to comparable format (remove AM/PM, pad numbers)
      const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return 0;
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3]?.toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      return parseTime(a.time) - parseTime(b.time);
    });
    
    if (entries.length === 0) {
      return '';  // Don't render empty call times block
    }
    
    // Generate grid HTML
    const cols = element.columns || 2;
    const spacingY = element.ctSpacingY !== undefined ? element.ctSpacingY : (element.ctSpacing !== undefined ? element.ctSpacing : 4);
    const spacingX = element.ctSpacingX !== undefined ? element.ctSpacingX : (element.ctSpacing !== undefined ? element.ctSpacing : 8);
    const style = `position:absolute;left:${printElement.x}px;top:${printElement.y}px;width:${printElement.width}px;min-height:${printElement.height}px;`;
    
    let html = `<div style="${style}">
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);row-gap:${spacingY}px;column-gap:${spacingX}px;font-size:${element.fontSize}px;font-family:${element.fontFamily};color:${element.color};">`;
    
    entries.forEach(entry => {
      html += `<div style="display:flex;gap:8px;align-items:baseline;">
        <span style="font-weight:bold;min-width:70px;">${entry.time}</span>
        <span>${entry.label}</span>
      </div>`;
    });
    
    html += `</div></div>`;
    return html;
  }
  
  // =============================================================================
  // PRINT & EXPORT SYSTEM (PDF-Ready)
  // =============================================================================
  
  /**
   * Get structured print data for header
   * This returns data in a format that can be used by both HTML rendering and PDF generation
   * 
   * @param {number} targetWidth - Target canvas width for justification calculations (default: 800)
   * @returns {Object} Structured print data
   */
  function getHeaderPrintData(targetWidth = 800) {
    const layout = getHeaderLayout();
    if (layout.elements.length === 0) return null;
    
    const printData = {
      canvasWidth: targetWidth,
      canvasHeight: layout.canvasHeight || 150,
      targetWidth: targetWidth,
      elements: []
    };
    
    layout.elements.forEach(element => {
      // Clone element and apply justification for print
      const printElement = { ...element };
      
      if (printElement.justify !== 'none') {
        if (printElement.justify === 'left') {
          printElement.x = printElement.justifyOffset;
        } else if (printElement.justify === 'center') {
          printElement.x = (targetWidth - printElement.width) / 2 + printElement.justifyOffset;
        } else if (printElement.justify === 'right') {
          printElement.x = targetWidth - printElement.width - printElement.justifyOffset;
        }
      }
      
      // Prepare content based on type
      let contentData = null;
      
      if (element.type === 'text') {
        contentData = {
          text: element.metaTemplate ? renderMetaTemplate(element.metaTemplate) : element.content,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontFamily: element.fontFamily,
          color: element.color,
          bgColor: element.bgColor,
          textAlign: element.textAlign,
          verticalAlign: element.verticalAlign
        };
      } else if (element.type === 'image' && element.imageData) {
        contentData = {
          imageData: element.imageData,
          objectFit: 'contain'
        };
      } else if (element.type === 'calltimes') {
        // Get call times data for rendering
        const entries = element.showDynamic ? getDynamicCallTimes() : element.manualEntries || [];
        contentData = {
          entries: entries,
          columns: element.columns || 2,
          spacingY: element.ctSpacingY !== undefined ? element.ctSpacingY : (element.ctSpacing !== undefined ? element.ctSpacing : 4),
          spacingX: element.ctSpacingX !== undefined ? element.ctSpacingX : (element.ctSpacing !== undefined ? element.ctSpacing : 8),
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          color: element.color
        };
      }
      
      printData.elements.push({
        type: element.type,
        x: printElement.x,
        y: printElement.y,
        width: printElement.width,
        height: printElement.height,
        borderWidth: element.borderWidth,
        borderColor: element.borderColor,
        borderRadius: element.borderRadius,
        content: contentData
      });
    });
    
    return printData;
  }
  
  /**
   * Render print data to HTML
   * This takes the structured print data and converts it to HTML for browser printing
   * 
   * @param {Object} printData - Structured print data from getHeaderPrintData()
   * @returns {string} HTML string
   */
  function renderPrintDataToHTML(printData) {
    if (!printData) return '';
    
    let html = `<div class="print-header" style="position:relative;height:${printData.canvasHeight}px;margin-bottom:16px;">`;
    
    printData.elements.forEach(element => {
      let borderStyle = '';
      if (element.borderWidth && element.borderWidth > 0) {
        borderStyle = `border:${element.borderWidth}px solid ${element.borderColor || '#000000'};`;
      }
      if (element.borderRadius) {
        borderStyle += `border-radius:${element.borderRadius}px;`;
      }
      const baseStyle = `position:absolute;left:${element.x}px;top:${element.y}px;width:${element.width}px;height:${element.height}px;${borderStyle}`;
      
      if (element.type === 'text' && element.content) {
        const c = element.content;
        const flexStyle = `display:flex;align-items:center;justify-content:${c.textAlign === 'center' ? 'center' : c.textAlign === 'right' ? 'flex-end' : 'flex-start'};`;
        const bgStyle = c.bgColor && c.bgColor !== 'transparent' ? `background-color:${c.bgColor};padding:4px 8px;border-radius:4px;` : '';
        const textStyle = `font-size:${c.fontSize}px;font-weight:${c.fontWeight};font-family:${c.fontFamily};color:${c.color};${bgStyle}`;
        html += `<div style="${baseStyle}${flexStyle}"><span style="${textStyle}">${c.text}</span></div>`;
        
      } else if (element.type === 'image' && element.content) {
        html += `<img src="${element.content.imageData}" style="${baseStyle}object-fit:${element.content.objectFit};">`;
        
      } else if (element.type === 'calltimes' && element.content) {
        const c = element.content;
        const spacingY = c.spacingY !== undefined ? c.spacingY : (c.spacing !== undefined ? c.spacing : 4);
        const spacingX = c.spacingX !== undefined ? c.spacingX : (c.spacing !== undefined ? c.spacing : 8);
        const gridStyle = `display:grid;grid-template-columns:repeat(${c.columns}, 1fr);row-gap:${spacingY}px;column-gap:${spacingX}px;font-size:${c.fontSize}px;font-family:${c.fontFamily};color:${c.color};padding:8px;`;
        let entriesHTML = '';
        c.entries.forEach(entry => {
          entriesHTML += `<div><strong>${entry.label}:</strong> ${entry.time}</div>`;
        });
        html += `<div style="${baseStyle}${gridStyle}">${entriesHTML}</div>`;
      }
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Export header to PDF (stub for future implementation)
   * 
   * When implementing PDF export:
   * 1. Include jsPDF library: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
   * 2. Use getHeaderPrintData() to get structured data
   * 3. Render elements using jsPDF's API (text, images, shapes)
   * 
   * Example structure:
   * 
   * async function exportHeaderToPDF() {
   *   const { jsPDF } = window.jspdf;
   *   const doc = new jsPDF();
   *   const printData = getHeaderPrintData();
   *   
   *   printData.elements.forEach(element => {
   *     if (element.type === 'text') {
   *       doc.setFontSize(element.content.fontSize);
   *       doc.text(element.content.text, element.x, element.y);
   *     } else if (element.type === 'image') {
   *       doc.addImage(element.content.imageData, 'PNG', element.x, element.y, element.width, element.height);
   *     }
   *   });
   *   
   *   return doc;
   * }
   * 
   * @returns {Promise} Future implementation will return PDF blob
   */
  window.exportHeaderToPDF = async function() {
    console.warn('PDF export not yet implemented. Include jsPDF library and implement rendering.');
    console.log('Header data structure:', getHeaderPrintData());
    
    // Future: Generate PDF using jsPDF
    // const printData = getHeaderPrintData();
    // ... render to PDF ...
    // return pdfBlob;
    
    return null;
  };
  
  // Export function to render header to canvas for railroad printing
  window.renderHeaderToCanvas = async function(targetWidth) {
    const headerCanvas = document.getElementById('headerCanvas');
    if (!headerCanvas) {
      console.log('No headerCanvas element found');
      return null;
    }
    
    const layout = getHeaderLayout();
    if (!layout || !layout.elements || layout.elements.length === 0) {
      console.log('No header elements in layout');
      return null;
    }
    
    console.log('Rendering', layout.elements.length, 'elements to canvas');
    
    const originalWidth = layout.canvasWidth || 800;
    const originalHeight = layout.canvasHeight || 150;
    
    // If targetWidth provided, scale canvas to match
    const scale = targetWidth ? targetWidth / originalWidth : 1;
    const canvasWidth = targetWidth || originalWidth;
    const canvasHeight = originalHeight * scale;
    
    console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight, `(scale: ${scale.toFixed(2)})`);
    
    // Create offscreen canvas at actual target size
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // DON'T scale the context - render at actual size
    // Instead, we'll scale positions and sizes when drawing
    
    // Fill background - default to white if no color set
    ctx.fillStyle = layout.canvasBgColor || '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    console.log('Canvas background:', layout.canvasBgColor || '#ffffff (default)');
    
    // Draw border if set (scale border width and dimensions)
    if (layout.canvasBorderWidth && layout.canvasBorderWidth > 0) {
      ctx.strokeStyle = layout.canvasBorderColor || '#000000';
      ctx.lineWidth = layout.canvasBorderWidth * scale;
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // Draw each element
    for (const elem of layout.elements) {
      try {
        console.log('Drawing element:', elem.type, 'at', elem.x, elem.y);
        console.log('Element type exact value:', JSON.stringify(elem.type), 'length:', elem.type.length);
        console.log('Type comparison calltimes:', elem.type === 'calltimes');
        console.log('Type comparison callTimes:', elem.type === 'callTimes');
        
        if (elem.type === 'text') {
          // Draw background box if set (with border-radius support) - scale all dimensions
          if (elem.bgColor && elem.bgColor !== 'transparent') {
            ctx.fillStyle = elem.bgColor;
            
            // Scale all dimensions
            const x = elem.x * scale;
            const y = elem.y * scale;
            const w = elem.width * scale;
            const h = elem.height * scale;
            
            // Handle border radius for background if set
            if (elem.borderRadius && elem.borderRadius > 0) {
              const r = Math.min(elem.borderRadius * scale, w / 2, h / 2);
              
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.fillRect(x, y, w, h);
            }
          }
          
          // Draw border if set - scale all dimensions
          if (elem.borderWidth && elem.borderWidth > 0) {
            ctx.strokeStyle = elem.borderColor || '#000000';
            ctx.lineWidth = elem.borderWidth * scale;
            
            // Scale all dimensions
            const x = elem.x * scale;
            const y = elem.y * scale;
            const w = elem.width * scale;
            const h = elem.height * scale;
            
            // Handle border radius if set
            if (elem.borderRadius && elem.borderRadius > 0) {
              const r = Math.min(elem.borderRadius * scale, w / 2, h / 2);
              
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
          
          // Draw text with padding - scale font size and padding
          const padding = 8 * scale;
          
          // Get text content - use metaTemplate if available, otherwise content
          let textToRender = '';
          if (elem.metaTemplate) {
            textToRender = renderMetaTemplate(elem.metaTemplate);
          } else {
            textToRender = elem.content || '';
          }
          
          ctx.fillStyle = elem.color || '#000000';
          // CRITICAL: Scale font size by scale factor
          const scaledFontSize = elem.fontSize * scale;
          const fontWeight = elem.fontWeight || 'normal';
          const fontStyle = elem.fontStyle || 'normal';
          ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${elem.fontFamily || 'Arial'}`;
          
          // Set text alignment
          const textAlign = elem.textAlign || 'left';
          ctx.textAlign = textAlign;
          
          // Set vertical alignment - scale positions
          const vertAlign = elem.verticalAlign || 'top';
          let textY = elem.y * scale + padding;
          
          console.log('[Canvas] Drawing text with verticalAlign:', vertAlign, 'element:', elem.id || 'unknown');
          
          if (vertAlign === 'center') {
            ctx.textBaseline = 'middle';
            textY = elem.y * scale + (elem.height * scale) / 2;
          } else if (vertAlign === 'bottom') {
            ctx.textBaseline = 'bottom';
            textY = elem.y * scale + (elem.height * scale) - padding;
          } else {
            ctx.textBaseline = 'top';
            textY = elem.y * scale + padding;
          }
          
          console.log('[Canvas] textBaseline:', ctx.textBaseline, 'textY:', textY, 'scaled elem.y:', elem.y * scale, 'scaled elem.height:', elem.height * scale);
          
          // Calculate X position based on alignment - scale positions
          let textX = elem.x * scale + padding;
          if (textAlign === 'center') {
            textX = elem.x * scale + (elem.width * scale) / 2;
          } else if (textAlign === 'right') {
            textX = elem.x * scale + (elem.width * scale) - padding;
          }
          
          ctx.fillText(textToRender, textX, textY);
          
          // Draw underline if textDecoration is underline
          if (elem.textDecoration === 'underline') {
            const metrics = ctx.measureText(textToRender);
            
            // Calculate underline Y based on textBaseline
            let underlineY;
            if (ctx.textBaseline === 'middle') {
              underlineY = textY + scaledFontSize * 0.4; // Below middle
            } else if (ctx.textBaseline === 'top') {
              underlineY = textY + scaledFontSize * 0.9; // Below top
            } else {
              underlineY = textY + scaledFontSize * 0.1; // Below alphabetic baseline
            }
            
            let underlineX = textX;
            if (textAlign === 'center') {
              underlineX = textX - metrics.width / 2;
            } else if (textAlign === 'right') {
              underlineX = textX - metrics.width;
            }
            
            ctx.beginPath();
            ctx.moveTo(underlineX, underlineY);
            ctx.lineTo(underlineX + metrics.width, underlineY);
            ctx.lineWidth = Math.max(1, scaledFontSize * 0.05);
            ctx.strokeStyle = elem.color || '#000000';
            ctx.stroke();
          }
          
          console.log('✓ Text drawn:', textToRender.substring(0, 50), 'at scaled fontSize:', scaledFontSize);
        } 
        else if (elem.type === 'image' && elem.imageData) {
          const img = new Image();
          
          // Add timeout to prevent stalling
          const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = elem.imageData;
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Image load timeout')), 3000)
          );
          
          try {
            await Promise.race([loadPromise, timeoutPromise]);
            
            // Scale element dimensions
            const scaledX = elem.x * scale;
            const scaledY = elem.y * scale;
            const scaledWidth = elem.width * scale;
            const scaledHeight = elem.height * scale;
            
            // Calculate dimensions to maintain aspect ratio (object-fit: contain)
            const imgAspect = img.width / img.height;
            const boxAspect = scaledWidth / scaledHeight;
            
            let drawWidth = scaledWidth;
            let drawHeight = scaledHeight;
            let offsetX = 0;
            let offsetY = 0;
            
            if (imgAspect > boxAspect) {
              // Image is wider - fit to width
              drawHeight = scaledWidth / imgAspect;
              offsetY = (scaledHeight - drawHeight) / 2;
            } else {
              // Image is taller - fit to height
              drawWidth = scaledHeight * imgAspect;
              offsetX = (scaledWidth - drawWidth) / 2;
            }
            
            ctx.drawImage(img, scaledX + offsetX, scaledY + offsetY, drawWidth, drawHeight);
            console.log('✓ Image drawn at scale:', scale);
          } catch (imgError) {
            console.warn('✗ Skipping image element:', imgError.message);
          }
        }
        else if (elem.type === 'calltimes') {
          console.log('Call times element found:', elem);
          
          // Collect all call time entries (dynamic + manual)
          const entries = [];
          
          // Get dynamic call times from schedule if enabled
          if (elem.showDynamic && window.getDynamicCallTimes) {
            const dynamicEntries = window.getDynamicCallTimes();
            entries.push(...dynamicEntries);
          }
          
          // Add manual entries
          if (elem.manualEntries && elem.manualEntries.length > 0) {
            elem.manualEntries.forEach(manualEntry => {
              let time = manualEntry.time;
              
              // If using anchor mode, calculate time based on anchor + offset
              if (manualEntry.isAnchor && manualEntry.anchorLabel) {
                const anchorEntry = entries.find(e => e.label === manualEntry.anchorLabel);
                if (anchorEntry) {
                  // Calculate offset time
                  const match = anchorEntry.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                  if (match) {
                    let hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);
                    const meridiem = match[3];
                    
                    if (meridiem) {
                      const isPM = meridiem.toUpperCase() === 'PM';
                      if (isPM && hours !== 12) hours += 12;
                      if (!isPM && hours === 12) hours = 0;
                    }
                    
                    let totalMinutes = hours * 60 + minutes + (manualEntry.offsetMinutes || 0);
                    hours = Math.floor(totalMinutes / 60) % 24;
                    const mins = totalMinutes % 60;
                    
                    const isPM = hours >= 12;
                    const displayHours = hours % 12 || 12;
                    time = `${displayHours}:${String(mins).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
                  }
                } else {
                  time = '—';
                }
              }
              
              entries.push({
                time: time,
                label: manualEntry.label,
                isManual: true
              });
            });
          }
          
          console.log('getDynamicCallTimes available:', !!window.getDynamicCallTimes);
          console.log('Call times data:', entries);
          
          // Sort chronologically
          entries.sort((a, b) => {
            const parseTime = (timeStr) => {
              const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
              if (!match) return 0;
              let hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              const meridiem = match[3];
              if (meridiem) {
                const isPM = meridiem.toUpperCase() === 'PM';
                if (isPM && hours !== 12) hours += 12;
                if (!isPM && hours === 12) hours = 0;
              }
              return hours * 60 + minutes;
            };
            return parseTime(a.time) - parseTime(b.time);
          });
          
          // Draw background box if set (with border-radius support) - scale all dimensions
          if (elem.bgColor && elem.bgColor !== 'transparent') {
            ctx.fillStyle = elem.bgColor;
            
            const x = elem.x * scale;
            const y = elem.y * scale;
            const w = elem.width * scale;
            const h = elem.height * scale;
            
            // Handle border radius for background if set
            if (elem.borderRadius && elem.borderRadius > 0) {
              const r = Math.min(elem.borderRadius * scale, w / 2, h / 2);
              
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.fillRect(x, y, w, h);
            }
            console.log('Call times background drawn');
          }
          
          // Draw border if set - scale all dimensions
          if (elem.borderWidth && elem.borderWidth > 0) {
            ctx.strokeStyle = elem.borderColor || '#000000';
            ctx.lineWidth = elem.borderWidth * scale;
            
            const x = elem.x * scale;
            const y = elem.y * scale;
            const w = elem.width * scale;
            const h = elem.height * scale;
            
            // Handle border radius if set
            if (elem.borderRadius && elem.borderRadius > 0) {
              const r = Math.min(elem.borderRadius * scale, w / 2, h / 2);
              
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
          
          // Set up text rendering - scale font size
          const scaledFontSize = elem.fontSize * scale;
          const fontWeight = elem.fontWeight || 'normal';
          const fontStyle = elem.fontStyle || 'normal';
          ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${elem.fontFamily || 'Arial'}`;
          ctx.fillStyle = elem.color || '#000000';
          
          // Use alphabetic baseline for consistent text positioning
          ctx.textBaseline = 'alphabetic';
          
          // Set text alignment (default to center for call times)
          const textAlign = elem.textAlign || 'center';
          ctx.textAlign = textAlign;
          
          // Handle column layout - scale all dimensions
          const cols = elem.columns || 2;
          const sortDirection = elem.ctSortDirection || 'column';
          const padding = 8 * scale;
          const lineHeight = scaledFontSize * 1.3; // Better line spacing
          const colWidth = (elem.width * scale) / cols;
          
          if (sortDirection === 'column') {
            // Column-first: distribute entries across columns vertically
            const rowsPerCol = Math.ceil(entries.length / cols);
            entries.forEach((call, index) => {
              const col = Math.floor(index / rowsPerCol);
              const row = index % rowsPerCol;
              
              // Calculate X position based on alignment - scale positions
              let x;
              if (textAlign === 'center') {
                x = (elem.x * scale) + (col * colWidth) + (colWidth / 2);
              } else if (textAlign === 'right') {
                x = (elem.x * scale) + (col * colWidth) + colWidth - padding;
              } else {
                x = (elem.x * scale) + (col * colWidth) + padding;
              }
              
              const y = (elem.y * scale) + padding + scaledFontSize + (row * lineHeight);
              const text = `${call.time} ${call.label}`;
              ctx.fillText(text, x, y);
            });
          } else {
            // Row-first: fill rows left to right
            entries.forEach((call, index) => {
              const row = Math.floor(index / cols);
              const col = index % cols;
              
              // Calculate X position based on alignment - scale positions
              let x;
              if (textAlign === 'center') {
                x = (elem.x * scale) + (col * colWidth) + (colWidth / 2);
              } else if (textAlign === 'right') {
                x = (elem.x * scale) + (col * colWidth) + colWidth - padding;
              } else {
                x = (elem.x * scale) + (col * colWidth) + padding;
              }
              
              const y = (elem.y * scale) + padding + scaledFontSize + (row * lineHeight);
              const text = `${call.time} ${call.label}`;
              ctx.fillText(text, x, y);
            });
          }
          
          console.log('✓ Call times drawn:', entries.length, 'entries at scaled fontSize:', scaledFontSize);
        }
      } catch (elemError) {
        console.warn('✗ Error drawing element:', elemError);
      }
    }
    
    console.log('Canvas rendering complete');
    return canvas;
  };
  
  // Export function to get header HTML for printing (legacy compatibility)
  window.getHeaderHTML = function() {
    const printData = getHeaderPrintData();
    return renderPrintDataToHTML(printData);
  };
  
  // Export function to get structured print data (for PDF generation)
  window.getHeaderPrintData = getHeaderPrintData;
  
  // Export function to update header metadata elements (for day switching)
  window.updateHeaderMetadata = updateMetadataElements;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderDesigner);
  } else {
    initHeaderDesigner();
  }
  
})();
