/**
 * Sharpie Manager - Simple State Tracking for Row Completion
 * 
 * Manages which rows are marked as complete.
 * CSS handles the visual line rendering via ::after pseudo-element.
 */

(function() {
  'use strict';
  
  const SharpieManager = {
    // Single source of truth - which rows are marked complete
    markedRows: new Set(),
    
    /**
     * Mark a row as complete
     */
    mark(rowId) {
      console.log('[Sharpie] mark() called, rowId:', rowId);
      this.markedRows.add(rowId);
      console.log('[Sharpie] Added to Set, now has:', this.markedRows.size, 'items');
      
      console.log('[Sharpie] Looking for TR with ID:', rowId);
      const tr = document.getElementById(rowId);
      console.log('[Sharpie] Found TR?', tr ? 'YES' : 'NO', tr);
      
      if (tr) {
        console.log('[Sharpie] Adding row-complete class to TR');
        tr.classList.add('row-complete');
        tr.dataset.completed = 'true';
        tr.dataset.completedAt = Date.now();
        console.log('[Sharpie] TR classes now:', Array.from(tr.classList));
        
        // Update button state
        const btn = tr.querySelector('.sharpie');
        console.log('[Sharpie] Found button?', btn ? 'YES' : 'NO');
        if (btn) {
          btn.classList.add('active');
          console.log('[Sharpie] Button classes now:', Array.from(btn.classList));
        }
        
        // Add actual line DIV for reliable positioning (tables break ::after)
        this.addLineElement(tr);
      } else {
        console.error('[Sharpie] ERROR: Could not find TR element with ID:', rowId);
      }
      
      console.log('[Sharpie] Calling notifyChange()');
      this.notifyChange();
      console.log('[Sharpie] mark() complete');
    },
    
    /**
     * Remove completion mark from a row
     */
    unmark(rowId) {
      console.log('[Sharpie] unmark() called, rowId:', rowId);
      this.markedRows.delete(rowId);
      console.log('[Sharpie] Removed from Set, now has:', this.markedRows.size, 'items');
      
      console.log('[Sharpie] Looking for TR with ID:', rowId);
      const tr = document.getElementById(rowId);
      console.log('[Sharpie] Found TR?', tr ? 'YES' : 'NO', tr);
      
      if (tr) {
        console.log('[Sharpie] Removing row-complete class from TR');
        tr.classList.remove('row-complete');
        tr.dataset.completed = 'false';
        delete tr.dataset.completedAt;
        console.log('[Sharpie] TR classes now:', Array.from(tr.classList));
        
        // Update button state
        const btn = tr.querySelector('.sharpie');
        console.log('[Sharpie] Found button?', btn ? 'YES' : 'NO');
        if (btn) {
          btn.classList.remove('active');
          console.log('[Sharpie] Button classes now:', Array.from(btn.classList));
        }
        
        // Remove line DIV
        this.removeLineElement(tr);
      } else {
        console.error('[Sharpie] ERROR: Could not find TR element with ID:', rowId);
      }
      
      console.log('[Sharpie] Calling notifyChange()');
      this.notifyChange();
      console.log('[Sharpie] unmark() complete');
    },
    
    /**
     * Add line element to a row (DIV-based, more reliable than ::after on tables)
     */
    addLineElement(tr) {
      console.log('[Sharpie] addLineElement() called for TR:', tr.id);
      
      // Remove any existing line first
      this.removeLineElement(tr);
      
      const rowId = tr.id;
      
      const createLine = () => {
        // Find the TR (it might have been rebuilt)
        const targetRow = document.getElementById(rowId);
        if (!targetRow) {
          console.error('[Sharpie] Row not found:', rowId);
          return null;
        }
        
        // Find the table and scroll container
        const table = targetRow.closest('table');
        if (!table) {
          console.error('[Sharpie] No table found for row');
          return null;
        }
        
        const scrollContainer = table.closest('.schedule-scroll');
        if (!scrollContainer) {
          console.error('[Sharpie] No schedule-scroll container found');
          return null;
        }
        
        // Remove old line if exists
        if (targetRow._sharpieLineElement) {
          targetRow._sharpieLineElement.remove();
        }
        
        // Ensure schedule-scroll is positioned
        if (getComputedStyle(scrollContainer).position === 'static') {
          scrollContainer.style.position = 'relative';
        }
        
        // Create line element
        const line = document.createElement('div');
        line.className = 'sharpie-line-element';
        line.dataset.rowId = rowId;
        line.style.cssText = `
          position: absolute;
          height: 4px;
          background: #f44336;
          pointer-events: none;
          z-index: 500;
        `;
        
        // Apply current visibility state
        if (document.body.classList.contains('sharpie-lines-hidden')) {
          line.style.display = 'none';
        }
        
        // Append to schedule-scroll (participates in zoom)
        scrollContainer.appendChild(line);
        targetRow._sharpieLineElement = line;
        
        // Update position function
        const updateLinePosition = () => {
          if (!document.body.contains(targetRow)) {
            window.removeEventListener('scroll', updateLinePosition, true);
            if (targetRow._resizeObserver) {
              targetRow._resizeObserver.disconnect();
              delete targetRow._resizeObserver;
            }
            line.remove();
            return;
          }
          
          // Get scroll container position
          const containerRect = scrollContainer.getBoundingClientRect();
          const tableRect = table.getBoundingClientRect();
          const rowRect = targetRow.getBoundingClientRect();
          
          // Calculate position relative to scroll container
          // Since line is absolute inside scrollContainer, we use offsets relative to it
          const padding = 6; // px of padding on each side
          line.style.left = `${tableRect.left - containerRect.left + scrollContainer.scrollLeft + padding}px`;
          line.style.top = `${rowRect.top - containerRect.top + scrollContainer.scrollTop + (rowRect.height / 2) - 2}px`;
          line.style.width = `${tableRect.width - (padding * 2)}px`;
          
          console.log('[Sharpie] Table width:', tableRect.width, 'Line top:', (rowRect.top - containerRect.top));
        };
        
        // Initial position
        updateLinePosition();
        
        // Add scroll listener
        window.addEventListener('scroll', updateLinePosition, true);
        line._scrollHandler = updateLinePosition;
        
        // Add ResizeObserver to update on table/row size changes
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(updateLinePosition);
          observer.observe(targetRow);
          observer.observe(table);
          if (scrollContainer) observer.observe(scrollContainer);
          // Also observe schedule-scroll for zoom changes
          const scheduleScroll = table.closest('.schedule-scroll');
          if (scheduleScroll) observer.observe(scheduleScroll);
          targetRow._resizeObserver = observer;
        }
        
        console.log('[Sharpie] Line created and positioned');
        return line;
      };
      
      // Create line with more aggressive retries to handle async rendering
      createLine();
      setTimeout(() => createLine(), 10);
      setTimeout(() => createLine(), 50);
      setTimeout(() => createLine(), 100);
      setTimeout(() => createLine(), 200);
      setTimeout(() => createLine(), 400);
    },
    
    /**
     * Remove line element from a row
     */
    removeLineElement(tr) {
      // Check TR for line reference
      if (tr._sharpieLineElement) {
        const line = tr._sharpieLineElement;
        
        // Remove scroll handler
        if (line._scrollHandler) {
          window.removeEventListener('scroll', line._scrollHandler, true);
        }
        
        // Disconnect ResizeObserver
        if (tr._resizeObserver) {
          tr._resizeObserver.disconnect();
          delete tr._resizeObserver;
        }
        
        // Remove line from body
        line.remove();
        
        console.log('[Sharpie] Removing line element from body');
        delete tr._sharpieLineElement;
      }
    },
    
    /**
     * Toggle a row's completion state
     */
    toggle(rowId) {
      console.log('[Sharpie] toggle() called for rowId:', rowId);
      console.log('[Sharpie] Currently marked:', Array.from(this.markedRows));
      if (this.markedRows.has(rowId)) {
        console.log('[Sharpie] Row is marked, unmarking');
        this.unmark(rowId);
      } else {
        console.log('[Sharpie] Row is not marked, marking');
        this.mark(rowId);
      }
    },
    
    /**
     * Check if a row is marked
     */
    isMarked(rowId) {
      return this.markedRows.has(rowId);
    },
    
    /**
     * Hide all sharpie lines (master toggle)
     */
    hideAll() {
      document.body.classList.add('sharpie-lines-hidden');
      localStorage.setItem('sharpie-lines-hidden', 'true');
      
      // Directly hide all line elements
      const lineElements = document.querySelectorAll('.sharpie-line-element');
      lineElements.forEach(line => {
        line.style.display = 'none';
      });
      
      console.log('[Sharpie] Lines hidden - body class added:', document.body.classList.contains('sharpie-lines-hidden'), '- line elements hidden:', lineElements.length);
    },
    
    /**
     * Show all sharpie lines (master toggle)
     */
    showAll() {
      document.body.classList.remove('sharpie-lines-hidden');
      localStorage.setItem('sharpie-lines-hidden', 'false');
      
      // Directly show all line elements
      const lineElements = document.querySelectorAll('.sharpie-line-element');
      lineElements.forEach(line => {
        line.style.display = '';
      });
      
      console.log('[Sharpie] Lines shown - body class removed:', !document.body.classList.contains('sharpie-lines-hidden'), '- line elements shown:', lineElements.length);
    },
    
    /**
     * Toggle visibility of all lines
     */
    toggleVisibility() {
      if (document.body.classList.contains('sharpie-lines-hidden')) {
        this.showAll();
      } else {
        this.hideAll();
      }
    },
    
    /**
     * Check if lines are hidden
     */
    areLinesHidden() {
      return document.body.classList.contains('sharpie-lines-hidden');
    },
    
    /**
     * Load marked rows from saved data
     */
    loadState(rows) {
      this.markedRows.clear();
      
      if (!Array.isArray(rows)) return;
      
      rows.forEach(row => {
        if (row.completed && row.id) {
          this.markedRows.add(row.id);
        }
        
        // Check children for sub-schedules
        if (row.children && Array.isArray(row.children)) {
          row.children.forEach(child => {
            if (child.completed && child.id) {
              this.markedRows.add(child.id);
            }
          });
        }
      });
      
      console.log('[Sharpie] Loaded', this.markedRows.size, 'marked rows');
    },
    
    /**
     * Apply loaded state to DOM after rows are built
     */
    applyState() {
      console.log('[Sharpie] applyState() starting, markedRows:', Array.from(this.markedRows));
      let successCount = 0;
      let failCount = 0;
      let buttonCount = 0;
      
      this.markedRows.forEach(rowId => {
        console.log('[Sharpie] Looking for row:', rowId);
        const tr = document.getElementById(rowId);
        if (tr) {
          console.log('[Sharpie] Found TR:', tr, 'Adding class and line');
          tr.classList.add('row-complete');
          tr.dataset.completed = 'true';
          
          const btn = tr.querySelector('.sharpie');
          if (btn) {
            btn.classList.add('active');
            buttonCount++;
            console.log('[Sharpie] Button marked active, classes:', Array.from(btn.classList));
          } else {
            console.warn('[Sharpie] No button found in row');
          }
          
          // Remove old line and create new one (handles zoom changes)
          this.removeLineElement(tr);
          this.addLineElement(tr);
          
          successCount++;
        } else {
          console.error('[Sharpie] Could not find TR with ID:', rowId);
          failCount++;
        }
      });
      console.log('[Sharpie] Applied state to', successCount, 'rows,', buttonCount, 'buttons marked,', failCount, 'failed');
    },
    
    /**
     * Get current state for saving
     */
    getState() {
      return Array.from(this.markedRows);
    },
    
    /**
     * Clear all marks
     */
    clear() {
      // Remove class from all marked rows and clean up lines
      this.markedRows.forEach(rowId => {
        const tr = document.getElementById(rowId);
        if (tr) {
          tr.classList.remove('row-complete');
          tr.dataset.completed = 'false';
          
          const btn = tr.querySelector('.sharpie');
          if (btn) btn.classList.remove('active');
          
          // Remove line element
          this.removeLineElement(tr);
        }
      });
      
      this.markedRows.clear();
      this.notifyChange();
      console.log('[Sharpie] Cleared all marks');
    },
    
    /**
     * Notify that state changed (for persistence)
     */
    notifyChange() {
      if (typeof window.persist === 'function') {
        window.persist();
      }
    },
    
    /**
     * Initialize the sharpie manager
     */
    init() {
      console.log('[Sharpie] Initializing SharpieManager (CSS-based rendering)');
      
      // Restore visibility state from localStorage
      const isHidden = localStorage.getItem('sharpie-lines-hidden') === 'true';
      if (isHidden) {
        document.body.classList.add('sharpie-lines-hidden');
        console.log('[Sharpie] Restored hidden state from localStorage');
      } else {
        document.body.classList.remove('sharpie-lines-hidden');
        console.log('[Sharpie] Restored shown state from localStorage');
      }
    }
  };
  
  // Make globally available
  window.SharpieManager = SharpieManager;
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SharpieManager.init());
  } else {
    SharpieManager.init();
  }
})();
