/**
 * Border Designer Module
 * Handles per-cell border controls independently of the main formatting popup
 */

const BorderDesigner = (function() {
    'use strict';

    // ============================================================================
    // PRIVATE STATE
    // ============================================================================
    
    let popup = null;
    let isOpen = false;
    let isDragging = false; // Track drag state to prevent close during drag
    let selectionManager = null; // Will be injected from main script
    let persistCallback = null; // Will be injected from main script

    // Current border settings (what user has selected in UI)
    let currentSettings = {
        activeEdges: [], // ['top', 'right', 'bottom', 'left']
        style: 'solid',
        width: '2px',
        color: '#000000'
    };

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    /**
     * Initialize the border designer
     * @param {Object} deps - Dependencies from main script
     * @param {Object} deps.selectionManager - SelectionManager reference
     * @param {Function} deps.persistCallback - Function to call after changes
     */
    function init(deps) {
        selectionManager = deps.selectionManager;
        persistCallback = deps.persistCallback;
        createPopup();
        attachEventListeners();
        makeDraggable();
    }

    /**
     * Make the popup draggable by its header
     */
    function makeDraggable() {
        if (!popup) return;
        
        const header = popup.querySelector('.border-designer-header');
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        
        header.addEventListener('mousedown', (e) => {
            // Don't start drag if clicking close button
            if (e.target.closest('.border-close-btn')) return;
            
            // Bring to front when dragging
            popup.style.zIndex = '10001';
            const formatPanel = document.querySelector('.format-designer-popup');
            if (formatPanel) formatPanel.style.zIndex = '10000';
            
            isDragging = true;
            initialX = e.clientX - popup.offsetLeft;
            initialY = e.clientY - popup.offsetTop;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            // Keep within viewport
            const maxX = window.innerWidth - popup.offsetWidth - 10;
            const maxY = window.innerHeight - popup.offsetHeight - 10;
            
            currentX = Math.max(10, Math.min(currentX, maxX));
            currentY = Math.max(10, Math.min(currentY, maxY));
            
            popup.style.left = currentX + 'px';
            popup.style.top = currentY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            // Small delay before clearing isDragging to prevent immediate close
            setTimeout(() => {
                isDragging = false;
            }, 10);
        });
    }

    /**
     * Open the border designer popup
     */
    function open(buttonElement) {
        if (!popup) {
            console.error('Border designer not initialized');
            return;
        }

        // Make visible
        popup.classList.add('visible');
        
        // If this is the first time opening (no position set), position near button
        if (!popup.style.left || popup.style.left === '0px') {
            const rect = buttonElement.getBoundingClientRect();
            const popupWidth = popup.offsetWidth;
            
            // Position below and to the left of the button
            let left = rect.right - popupWidth - 40;
            let top = rect.bottom + 9;
            
            // Keep within viewport
            left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - popup.offsetHeight - 10));
            
            popup.style.left = left + 'px';
            popup.style.top = top + 'px';
        }
        // Otherwise, keep the popup where the user last moved it
        
        isOpen = true;
        
        // Bring to front when opened
        popup.style.zIndex = '10001';
        const formatPanel = document.querySelector('.format-designer-popup');
        if (formatPanel) formatPanel.style.zIndex = '10000';

        // Load current formatting from first selected cell
        loadCurrentFormatting();
    }

    /**
     * Close the border designer popup
     */
    function close() {
        if (popup) {
            popup.classList.remove('visible');
            isOpen = false;
        }
    }

    /**
     * Apply borders to dataset and inline styles
     * Called by main script when restoring cell formatting
     * @param {HTMLElement} td - The table cell
     * @param {Object} formatting - Border formatting object
     */
    function applyBordersToCell(td, formatting) {
        console.log('[BorderDesigner] applyBordersToCell called:', td.dataset.key, formatting);
        const edges = ['top', 'right', 'bottom', 'left'];
        
        edges.forEach(edge => {
            const key = `border${capitalize(edge)}`;
            if (formatting[key] !== undefined) {
                if (formatting[key]) {
                    // Apply the border
                    td.dataset[key] = formatting[key];
                    td.style.setProperty(`border-${edge}`, formatting[key], 'important');
                    console.log(`  [BorderDesigner] Set ${edge}:`, formatting[key]);
                } else {
                    // Delete the dataset property and remove inline style
                    delete td.dataset[key];
                    td.style.removeProperty(`border-${edge}`);
                    console.log(`  [BorderDesigner] Cleared ${edge}`);
                }
            }
        });
    }

    /**
     * Extract border formatting from a cell
     * Called by main script when saving cell formatting
     * @param {HTMLElement} td - The table cell
     * @returns {Object} Border formatting object
     */
    function getBorderFormatting(td) {
        const formatting = {};
        
        // Only include border properties if they exist (are not undefined)
        if (td.dataset.borderTop !== undefined) {
            formatting.borderTop = td.dataset.borderTop;
        }
        if (td.dataset.borderRight !== undefined) {
            formatting.borderRight = td.dataset.borderRight;
        }
        if (td.dataset.borderBottom !== undefined) {
            formatting.borderBottom = td.dataset.borderBottom;
        }
        if (td.dataset.borderLeft !== undefined) {
            formatting.borderLeft = td.dataset.borderLeft;
        }
        
        console.log('[BorderDesigner] getBorderFormatting for', td.dataset.key, ':', formatting);
        return formatting;
    }

    /**
     * Convert border styles from px to pt for PDF generation
     * @param {string} borderString - e.g. "2px solid #ff0000"
     * @returns {string} - e.g. "1.5pt solid #ff0000"
     */
    function convertBorderToPt(borderString) {
        if (!borderString) return '';
        
        const parts = borderString.split(' ');
        if (parts.length < 2) return borderString;
        
        const widthPx = parseInt(parts[0]);
        if (isNaN(widthPx)) return borderString;
        
        const widthPt = (widthPx * 0.75).toFixed(1) + 'pt';
        parts[0] = widthPt;
        return parts.join(' ');
    }

    /**
     * Get all border styles for a cell in PDF format
     * @param {HTMLElement} td - The table cell
     * @returns {string} - CSS string for inline styles
     */
    /**
     * Get border styles for PDF output, respecting border-collapse model
     * @param {HTMLElement} td - The cell element
     * @param {Object} options - Optional context
     * @param {boolean} options.isFirstPrintedColumn - Whether this is the leftmost printed column
     * @param {boolean} options.isFirstRow - Whether this is the first row
     * @returns {string} CSS border styles
     */
    function getBorderStylesForPDF(td, options = {}) {
        let styles = '';
        const isSeparator = td.dataset.type === 'separator';
        const edges = ['top', 'right', 'bottom', 'left'];
        
        edges.forEach(edge => {
            // Skip left/right borders for separator columns
            if (isSeparator && (edge === 'left' || edge === 'right')) {
                return;
            }
            
            // Skip outer edge borders when wrapper has border
            if (options.hasOuterBorder) {
                if (edge === 'top' && options.isFirstRow) return;
                if (edge === 'left' && options.isFirstPrintedColumn) return;
                if (edge === 'right' && options.isLastPrintedColumn) return;
                if (edge === 'bottom' && options.isLastRow) return;
            }
            
            // First check if this cell owns the border
            const key = `border${capitalize(edge)}`;
            let value = td.dataset[key];
            
            // Check adjacent cells for inherited borders
            if (!value) {
                const row = td.closest('tr');
                
                if (row) {
                    const tdKey = td.dataset.key;
                    
                    switch(edge) {
                        case 'top':
                            // Always check cell above for its bottom border (this is our top)
                            const prevRow = row.previousElementSibling;
                            if (prevRow && !prevRow.classList.contains('row-separator')) {
                                const cellAbove = prevRow.querySelector(`[data-key="${tdKey}"]`);
                                if (cellAbove) {
                                    value = cellAbove.dataset.borderBottom;
                                }
                            }
                            break;
                        
                        case 'left':
                            // Only check cell to left if this is the first printed column
                            if (options.isFirstPrintedColumn) {
                                let prevCell = td.previousElementSibling;
                                // Skip drag column
                                while (prevCell && prevCell.dataset.key === 'drag') {
                                    prevCell = prevCell.previousElementSibling;
                                }
                                if (prevCell && prevCell.dataset.key) {
                                    value = prevCell.dataset.borderRight;
                                }
                            }
                            break;
                        
                        case 'right':
                            // Skip right border if this is the last printed column (outer edge)
                            if (options.isLastPrintedColumn) {
                                return; // Don't apply border on the right outer edge
                            }
                            break;
                        
                        // Bottom is always owned by this cell, no need to check adjacent
                    }
                }
            }
            
            if (value) {
                const ptValue = convertBorderToPt(value);
                styles += `border-${edge}: ${ptValue} !important; `;
            }
        });
        
        return styles;
    }

    // ============================================================================
    // PRIVATE FUNCTIONS - UI CREATION
    // ============================================================================

    /**
     * Create the border designer popup element
     */
    function createPopup() {
        popup = document.createElement('div');
        popup.className = 'border-designer-popup';
        popup.innerHTML = `
            <div class="border-designer-header">
                <h3>CELL BORDERS</h3>
                <button class="border-close-btn" title="Close">×</button>
            </div>
            
            <div class="border-designer-content">
                <!-- Outline Controls -->
                <div class="border-section">
                    <label class="border-label">OUTLINE</label>
                    <div class="border-outline-row">
                        <button class="border-outline-btn" data-action="outside" title="Outside borders only">⊡</button>
                        <button class="border-outline-btn" data-action="inside" title="Inside borders only">⊞</button>
                        <button class="border-outline-btn" data-action="all" title="All borders">⊟</button>
                    </div>
                </div>

                <!-- Edge Controls -->
                <div class="border-section">
                    <label class="border-label">EDGES</label>
                    <div class="border-edges-grid">
                        <button class="border-edge-apply-btn" data-action="top" title="Top edge">⎺</button>
                        <button class="border-edge-apply-btn" data-action="middle-h" title="Middle horizontal">☰</button>
                        <button class="border-edge-apply-btn" data-action="bottom" title="Bottom edge">⎽</button>
                        <button class="border-edge-apply-btn" data-action="left" title="Left edge">⎸</button>
                        <button class="border-edge-apply-btn" data-action="middle-v" title="Middle vertical">║</button>
                        <button class="border-edge-apply-btn" data-action="right" title="Right edge">⎹</button>
                    </div>
                </div>
                
                <!-- Clear Button -->
                <div class="border-section">
                    <button class="border-clear-all-btn" data-action="clear" title="Clear all borders">CLEAR</button>
                </div>

                <!-- Style Controls -->
                <div class="border-section">
                    <label class="border-label">STYLE</label>
                    <div class="border-style-row">
                        <select class="border-style-select">
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                        </select>
                        <select class="border-width-select">
                            <option value="1px">1px</option>
                            <option value="2px" selected>2px</option>
                            <option value="3px">3px</option>
                            <option value="4px">4px</option>
                            <option value="5px">5px</option>
                        </select>
                        <input type="color" class="border-color-input" value="#000000">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Bring to front when clicked
        popup.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            popup.style.zIndex = '10001';
            // Lower other designer panels
            const formatPanel = document.querySelector('.format-designer-popup');
            if (formatPanel) formatPanel.style.zIndex = '10000';
        });
        
        // Prevent clicks inside popup from clearing selection
        popup.addEventListener('click', (e) => e.stopPropagation());
    }

    /**
     * Attach all event listeners to popup elements
     */
    function attachEventListeners() {
        if (!popup) return;

        // Close button
        const closeBtn = popup.querySelector('.border-close-btn');
        closeBtn.addEventListener('click', close);

        // Close when clicking outside - DISABLED so panel stays open for multi-edit
        // document.addEventListener('click', handleOutsideClick);

        // Outline buttons (Outside, Inside, All)
        const outlineButtons = popup.querySelectorAll('.border-outline-btn');
        outlineButtons.forEach(btn => {
            btn.addEventListener('click', handleOutlineApply);
        });

        // Edge apply buttons (Top, Bottom, Left, Right, Mid-H, Mid-V)
        const edgeApplyButtons = popup.querySelectorAll('.border-edge-apply-btn');
        edgeApplyButtons.forEach(btn => {
            btn.addEventListener('click', handleEdgeApply);
        });
        
        // Clear all button
        const clearBtn = popup.querySelector('.border-clear-all-btn');
        clearBtn.addEventListener('click', handleClearAll);

        // Style/Width/Color controls
        const styleSelect = popup.querySelector('.border-style-select');
        const widthSelect = popup.querySelector('.border-width-select');
        const colorInput = popup.querySelector('.border-color-input');

        styleSelect.addEventListener('change', updateCurrentSettings);
        widthSelect.addEventListener('change', updateCurrentSettings);
        colorInput.addEventListener('change', updateCurrentSettings);
        
        // Prevent color picker clicks from deselecting cells
        colorInput.addEventListener('click', (e) => e.stopPropagation());
        colorInput.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    // ============================================================================
    // PRIVATE FUNCTIONS - EVENT HANDLERS
    // ============================================================================

    function handleOutsideClick(e) {
        if (!isOpen) return;
        if (isDragging) return; // Don't close while dragging
        if (!popup.contains(e.target) && !e.target.closest('.border-trigger-btn')) {
            close();
        }
    }

    function updateCurrentSettings() {
        const styleSelect = popup.querySelector('.border-style-select');
        const widthSelect = popup.querySelector('.border-width-select');
        const colorInput = popup.querySelector('.border-color-input');

        currentSettings.style = styleSelect.value;
        currentSettings.width = widthSelect.value;
        currentSettings.color = colorInput.value;
    }

    /**
     * Handle outline button clicks (Outside, Inside, All)
     */
    function handleOutlineApply(e) {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        console.log('[BorderDesigner] Outline Apply clicked:', action);
        
        if (!selectionManager) {
            console.error('SelectionManager not available');
            return;
        }

        const selectedCells = selectionManager.getSelectedCells();
        console.log('[BorderDesigner] Selected cells:', selectedCells.length);
        if (selectedCells.length === 0) {
            alert('Please select cells to apply borders');
            return;
        }

        updateCurrentSettings();
        const borderValue = `${currentSettings.width} ${currentSettings.style} ${currentSettings.color}`;
        console.log('[BorderDesigner] Border value:', borderValue);

        switch(action) {
            case 'outside':
                applyOutsideBorders(selectedCells, borderValue);
                break;
            case 'inside':
                applyInsideBorders(selectedCells, borderValue);
                break;
            case 'all':
                applyAllBorders(selectedCells, borderValue);
                break;
        }

        console.log('[BorderDesigner] Calling persistCallback');
        if (persistCallback) {
            persistCallback();
        }
        console.log('[BorderDesigner] Done');
    }

    /**
     * Handle edge button clicks (Top, Bottom, Left, Right, Mid-H, Mid-V)
     */
    function handleEdgeApply(e) {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        console.log('[BorderDesigner] Edge Apply clicked:', action);
        
        if (!selectionManager) {
            console.error('SelectionManager not available');
            return;
        }

        const selectedCells = selectionManager.getSelectedCells();
        if (selectedCells.length === 0) {
            alert('Please select cells to apply borders');
            return;
        }

        updateCurrentSettings();
        const borderValue = `${currentSettings.width} ${currentSettings.style} ${currentSettings.color}`;

        switch(action) {
            case 'top':
                applyTopBorder(selectedCells, borderValue);
                break;
            case 'bottom':
                applyBottomBorder(selectedCells, borderValue);
                break;
            case 'left':
                applyLeftBorder(selectedCells, borderValue);
                break;
            case 'right':
                applyRightBorder(selectedCells, borderValue);
                break;
            case 'middle-h':
                applyMiddleHorizontal(selectedCells, borderValue);
                break;
            case 'middle-v':
                applyMiddleVertical(selectedCells, borderValue);
                break;
        }

        if (persistCallback) {
            persistCallback();
        }
    }

    /**
     * Handle clear all button click
     */
    function handleClearAll(e) {
        e.stopPropagation();
        
        if (!selectionManager) {
            console.error('SelectionManager not available');
            return;
        }

        const selectedCells = selectionManager.getSelectedCells();
        if (selectedCells.length === 0) {
            alert('Please select cells to clear borders');
            return;
        }

        clearAllBorders(selectedCells);

        if (persistCallback) {
            persistCallback();
        }
    }

    // ============================================================================
    // SMART BORDER APPLICATION LOGIC - BORDER COLLAPSE MODEL
    // ============================================================================
    // Each border is owned by exactly ONE cell to prevent doubling:
    // - All cells own their RIGHT and BOTTOM borders
    // - Top row cells also own their TOP border
    // - Leftmost column cells also own their LEFT border
    
    /**
     * Get the cell that owns a specific border edge
     * @param {HTMLElement} cell - The cell where border should appear
     * @param {string} edge - 'top', 'right', 'bottom', or 'left'
     * @returns {Object} {cell: HTMLElement, edge: string} - The owning cell and which edge to update
     */
    function getBorderOwner(cell, edge) {
        const bounds = getSelectionBounds([cell]);
        if (!bounds) return {cell, edge};
        
        const row = cell.closest('tr');
        const container = row.parentElement;
        if (!container) return {cell, edge};
        
        const allRows = Array.from(container.querySelectorAll('tr'));
        const rowIndex = allRows.indexOf(row);
        const colKey = cell.dataset.key;
        const colIndex = bounds.colKeys.indexOf(colKey);
        
        switch(edge) {
            case 'top':
                // If this is the first row, it owns its top border
                // Otherwise, the cell above owns this border (as its bottom)
                if (rowIndex === 0) {
                    return {cell, edge: 'top'};
                } else {
                    const cellAbove = allRows[rowIndex - 1].querySelector(`[data-key="${colKey}"]`);
                    return cellAbove ? {cell: cellAbove, edge: 'bottom'} : {cell, edge};
                }
            
            case 'right':
                // All cells own their right border
                return {cell, edge: 'right'};
            
            case 'bottom':
                // All cells own their bottom border
                return {cell, edge: 'bottom'};
            
            case 'left':
                // If this is the leftmost column (excluding drag), it owns its left border
                // Otherwise, the cell to the left owns this border (as its right)
                const allCells = Array.from(row.querySelectorAll('[data-key]:not([data-key="drag"])'));
                const cellIndex = allCells.indexOf(cell);
                
                if (cellIndex === 0) {
                    return {cell, edge: 'left'};
                } else {
                    const cellLeft = allCells[cellIndex - 1];
                    return cellLeft ? {cell: cellLeft, edge: 'right'} : {cell, edge};
                }
        }
        
        return {cell, edge};
    }
    
    /**
     * Set or remove a border using the border-collapse model
     * @param {HTMLElement} cell - The cell where border should appear
     * @param {string} edge - 'top', 'right', 'bottom', or 'left'
     * @param {string|null} borderValue - Border value or null to remove
     */
    function setBorderCollapsed(cell, edge, borderValue) {
        const owner = getBorderOwner(cell, edge);
        const key = `border${capitalize(owner.edge)}`;
        
        if (borderValue) {
            owner.cell.dataset[key] = borderValue;
            owner.cell.style.setProperty(`border-${owner.edge}`, borderValue, 'important');
        } else {
            delete owner.cell.dataset[key];
            owner.cell.style.removeProperty(`border-${owner.edge}`);
        }
        
        // Also remove any duplicate border on the non-owning cell
        if (owner.cell !== cell || owner.edge !== edge) {
            const nonOwnerKey = `border${capitalize(edge)}`;
            delete cell.dataset[nonOwnerKey];
            cell.style.removeProperty(`border-${edge}`);
        }
        
        // Force style recalculation for immediate visual update
        void owner.cell.offsetHeight;
    }
    
    /**
     * Check if a border exists using the border-collapse model
     * @param {HTMLElement} cell - The cell to check
     * @param {string} edge - 'top', 'right', 'bottom', or 'left'
     * @returns {string|null} Border value or null
     */
    function getBorderCollapsed(cell, edge) {
        const owner = getBorderOwner(cell, edge);
        const key = `border${capitalize(owner.edge)}`;
        return owner.cell.dataset[key] || null;
    }

    // ============================================================================
    // BORDER APPLICATION FUNCTIONS - USING COLLAPSE MODEL
    // ============================================================================

    function applyOutsideBorders(cells, borderValue) {
        // Check if ALL perimeter cells already have borders - if so, remove them
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allPerimeterBordersExist = true;
        
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            // Check if this perimeter cell has all its perimeter borders using collapsed model
            if (rowIndex === bounds.minRow && !getBorderCollapsed(cell, 'top')) allPerimeterBordersExist = false;
            if (rowIndex === bounds.maxRow && !getBorderCollapsed(cell, 'bottom')) allPerimeterBordersExist = false;
            if (colIndex === 0 && !getBorderCollapsed(cell, 'left')) allPerimeterBordersExist = false;
            if (colIndex === bounds.colKeys.length - 1 && !getBorderCollapsed(cell, 'right')) allPerimeterBordersExist = false;
        });

        // Toggle: if all borders exist, remove them; otherwise apply them
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            const valueToSet = allPerimeterBordersExist ? null : borderValue;
            
            if (rowIndex === bounds.minRow) {
                setBorderCollapsed(cell, 'top', valueToSet);
            }
            if (rowIndex === bounds.maxRow) {
                setBorderCollapsed(cell, 'bottom', valueToSet);
            }
            if (colIndex === 0) {
                setBorderCollapsed(cell, 'left', valueToSet);
            }
            if (colIndex === bounds.colKeys.length - 1) {
                setBorderCollapsed(cell, 'right', valueToSet);
            }
        });

        console.log(allPerimeterBordersExist ? 'Removed outside borders' : 'Applied outside borders', 'to', cells.length, 'cells');
    }
    
    function applyInsideBorders(cells, borderValue) {
        // Check if ALL inside borders already exist - if so, remove them
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allInsideBordersExist = true;
        
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            // Check if inside borders exist using collapsed model
            if (colIndex < bounds.colKeys.length - 1 && !getBorderCollapsed(cell, 'right')) allInsideBordersExist = false;
            if (rowIndex < bounds.maxRow && !getBorderCollapsed(cell, 'bottom')) allInsideBordersExist = false;
        });

        // Toggle
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            const valueToSet = allInsideBordersExist ? null : borderValue;

            if (colIndex < bounds.colKeys.length - 1) {
                setBorderCollapsed(cell, 'right', valueToSet);
            }
            if (rowIndex < bounds.maxRow) {
                setBorderCollapsed(cell, 'bottom', valueToSet);
            }
        });

        console.log(allInsideBordersExist ? 'Removed inside borders' : 'Applied inside borders', 'to', cells.length, 'cells');
    }

    function applyAllBorders(cells, borderValue) {
        console.log('[BorderDesigner] applyAllBorders starting, borderValue:', borderValue, 'cells:', cells.length);
        
        // Check if ALL borders already exist - if so, remove them
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allBordersExist = true;
        
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            // Check if all relevant borders exist for this cell using collapsed model
            if (!getBorderCollapsed(cell, 'right')) allBordersExist = false;
            if (!getBorderCollapsed(cell, 'bottom')) allBordersExist = false;
            if (rowIndex === bounds.minRow && !getBorderCollapsed(cell, 'top')) allBordersExist = false;
            if (colIndex === 0 && !getBorderCollapsed(cell, 'left')) allBordersExist = false;
        });

        // Toggle
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            const valueToSet = allBordersExist ? null : borderValue;

            // Apply all borders using smart grid style
            setBorderCollapsed(cell, 'right', valueToSet);
            setBorderCollapsed(cell, 'bottom', valueToSet);

            if (rowIndex === bounds.minRow) {
                setBorderCollapsed(cell, 'top', valueToSet);
            }
            if (colIndex === 0) {
                setBorderCollapsed(cell, 'left', valueToSet);
            }
        });

        console.log(allBordersExist ? 'Removed all borders' : 'Applied all borders (smart grid)', 'to', cells.length, 'cells');
    }
    
    function applyTopBorder(cells, borderValue) {
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allTopBordersExist = true;
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);

            if (rowIndex === bounds.minRow && !getBorderCollapsed(cell, 'top')) {
                allTopBordersExist = false;
            }
        });

        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);

            if (rowIndex === bounds.minRow) {
                setBorderCollapsed(cell, 'top', allTopBordersExist ? null : borderValue);
            }
        });

        console.log(allTopBordersExist ? 'Removed top border' : 'Applied top border', 'to', cells.length, 'cells');
    }
    
    function applyBottomBorder(cells, borderValue) {
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allBottomBordersExist = true;
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);

            if (rowIndex === bounds.maxRow && !getBorderCollapsed(cell, 'bottom')) {
                allBottomBordersExist = false;
            }
        });

        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);

            if (rowIndex === bounds.maxRow) {
                setBorderCollapsed(cell, 'bottom', allBottomBordersExist ? null : borderValue);
            }
        });

        console.log(allBottomBordersExist ? 'Removed bottom border' : 'Applied bottom border', 'to', cells.length, 'cells');
    }
    
    function applyLeftBorder(cells, borderValue) {
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allLeftBordersExist = true;
        cells.forEach(cell => {
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            if (colIndex === 0 && !getBorderCollapsed(cell, 'left')) {
                allLeftBordersExist = false;
            }
        });

        cells.forEach(cell => {
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            if (colIndex === 0) {
                setBorderCollapsed(cell, 'left', allLeftBordersExist ? null : borderValue);
            }
        });

        console.log(allLeftBordersExist ? 'Removed left border' : 'Applied left border', 'to', cells.length, 'cells');
    }
    
    function applyRightBorder(cells, borderValue) {
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allRightBordersExist = true;
        cells.forEach(cell => {
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            if (colIndex === bounds.colKeys.length - 1 && !getBorderCollapsed(cell, 'right')) {
                allRightBordersExist = false;
            }
        });

        cells.forEach(cell => {
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            if (colIndex === bounds.colKeys.length - 1) {
                setBorderCollapsed(cell, 'right', allRightBordersExist ? null : borderValue);
            }
        });

        console.log(allRightBordersExist ? 'Removed right border' : 'Applied right border', 'to', cells.length, 'cells');
    }
    
    function applyMiddleHorizontal(cells, borderValue) {
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allMiddleHBordersExist = true;
        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);

            if (rowIndex < bounds.maxRow && !getBorderCollapsed(cell, 'bottom')) {
                allMiddleHBordersExist = false;
            }
        });

        cells.forEach(cell => {
            const row = cell.closest('tr');
            const container = row.parentElement;
            if (!container) return;
            
            const allRows = Array.from(container.querySelectorAll('tr'));
            const rowIndex = allRows.indexOf(row);

            if (rowIndex < bounds.maxRow) {
                setBorderCollapsed(cell, 'bottom', allMiddleHBordersExist ? null : borderValue);
            }
        });

        console.log(allMiddleHBordersExist ? 'Removed middle horizontal borders' : 'Applied middle horizontal borders', 'to', cells.length, 'cells');
    }
    
    function applyMiddleVertical(cells, borderValue) {
        const bounds = getSelectionBounds(cells);
        if (!bounds) return;

        let allMiddleVBordersExist = true;
        cells.forEach(cell => {
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            if (colIndex < bounds.colKeys.length - 1 && !getBorderCollapsed(cell, 'right')) {
                allMiddleVBordersExist = false;
            }
        });

        cells.forEach(cell => {
            const colKey = cell.dataset.key;
            const colIndex = bounds.colKeys.indexOf(colKey);

            if (colIndex < bounds.colKeys.length - 1) {
                setBorderCollapsed(cell, 'right', allMiddleVBordersExist ? null : borderValue);
            }
        });

        console.log(allMiddleVBordersExist ? 'Removed middle vertical borders' : 'Applied middle vertical borders', 'to', cells.length, 'cells');
    }

    function clearAllBorders(cells) {
        const edges = ['top', 'right', 'bottom', 'left'];
        cells.forEach(cell => {
            edges.forEach(edge => {
                const key = `border${capitalize(edge)}`;
                delete cell.dataset[key];  // DELETE instead of setting to ''
                cell.style.removeProperty(`border-${edge}`);  // REMOVE instead of setting to none
            });
        });

        console.log('Cleared borders from', cells.length, 'cells');
    }

    function getSelectionBounds(cells) {
        if (cells.length === 0) return null;

        const rows = new Set();
        const colKeys = new Set();

        cells.forEach(cell => {
            const row = cell.closest('tr');
            rows.add(row);
            colKeys.add(cell.dataset.key);
        });

        // Handle both header cells (in thead) and body cells (in tbody)
        const firstCell = cells[0];
        const isHeader = firstCell.tagName === 'TH';
        const container = isHeader ? firstCell.closest('thead') : firstCell.closest('tbody');
        
        if (!container) {
            console.warn('[BorderDesigner] Cannot find container for cells');
            return null;
        }
        
        const allRows = Array.from(container.querySelectorAll('tr'));
        const rowIndices = Array.from(rows).map(row => allRows.indexOf(row));

        return {
            minRow: Math.min(...rowIndices),
            maxRow: Math.max(...rowIndices),
            colKeys: Array.from(colKeys)
        };
    }

    // ============================================================================
    // PRIVATE FUNCTIONS - STATE MANAGEMENT
    // ============================================================================

    /**
     * Load current formatting from first selected cell
     * Updates UI to reflect existing borders
     */
    function loadCurrentFormatting() {
        if (!selectionManager) return;

        const cells = selectionManager.getSelectedCells();
        if (cells.length === 0) return;

        const firstCell = cells[0];
        
        // Look for any existing border on first cell to populate controls
        const edges = ['top', 'right', 'bottom', 'left'];
        for (const edge of edges) {
            const key = `border${capitalize(edge)}`;
            const value = firstCell.dataset[key];
            
            if (value) {
                // Parse the border value to populate controls
                // Format: "2px solid #000000"
                const parts = value.split(' ');
                if (parts.length >= 3) {
                    popup.querySelector('.border-width-select').value = parts[0];
                    popup.querySelector('.border-style-select').value = parts[1];
                    popup.querySelector('.border-color-input').value = parts[2];
                }
                break; // Found a border, stop looking
            }
        }

        updateCurrentSettings();
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ============================================================================
    // EXPORT PUBLIC API
    // ============================================================================

    return {
        init,
        open,
        close,
        applyBordersToCell,
        getBorderFormatting,
        getBorderStylesForPDF,
        convertBorderToPt,
        isDragging: () => isDragging
    };

})();
