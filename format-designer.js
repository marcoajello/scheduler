/**
 * Format Designer Module
 * Handles per-cell formatting controls independently
 */

const FormatDesigner = (function() {
    'use strict';

    // ============================================================================
    // PRIVATE STATE
    // ============================================================================
    
    let popup = null;
    let isOpen = false;
    let isDragging = false;
    let selectionManager = null;
    let persistCallback = null;
    let formatType = 'row'; // 'row' or 'column'
    let triggerButton = null;

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    /**
     * Initialize the format designer
     */
    function init(deps) {
        selectionManager = deps.selectionManager;
        persistCallback = deps.persistCallback;
    }

    /**
     * Open the format designer popup
     */
    function open(buttonElement, type = 'row') {
        formatType = type;
        triggerButton = buttonElement;
        
        // Remove any existing popup
        if (popup) {
            popup.remove();
        }
        
        createPopup();
        positionPopup();
        makeDraggable();
        attachEventListeners();
        
        // Make visible
        popup.classList.add('visible');
        isOpen = true;
        
        // Bring to front when opened
        popup.style.zIndex = '10001';
        const borderPanel = document.querySelector('.border-designer-popup');
        if (borderPanel) borderPanel.style.zIndex = '10000';
    }

    /**
     * Close the format designer popup
     */
    function close() {
        if (popup) {
            popup.classList.remove('visible');
            isOpen = false;
            // Remove after animation
            setTimeout(() => {
                if (popup) popup.remove();
                popup = null;
            }, 200);
        }
    }

    // ============================================================================
    // PRIVATE FUNCTIONS - UI CREATION
    // ============================================================================

    function createPopup() {
        popup = document.createElement('div');
        popup.className = 'format-designer-popup';
        
        const current = getCurrentFormat();
        const selectedCount = selectionManager.selectedCells.size;
        
        const popupHTML = formatType === 'column' ? `
            <div class="format-designer-header">
                <h3>COLUMN ALIGNMENT</h3>
                <button class="format-close-btn" title="Close">×</button>
            </div>
            
            <div class="format-designer-content">
                <div class="format-section">
                    <div class="format-align-grid">
                        <button class="format-style-btn fmt-align-left ${current.align === 'left' ? 'active' : ''}" title="Align Left">←</button>
                        <button class="format-style-btn fmt-align-center ${current.align === 'center' ? 'active' : ''}" title="Align Center">↔</button>
                        <button class="format-style-btn fmt-align-right ${current.align === 'right' ? 'active' : ''}" title="Align Right">→</button>
                    </div>
                </div>
            </div>
        ` : `
            <div class="format-designer-header">
                <h3>FORMAT</h3>
                <button class="format-close-btn" title="Close">×</button>
            </div>
            
            <div class="format-designer-content">
                <!-- Font & Size -->
                <div class="format-section">
                    <div class="format-font-row">
                        <select class="format-font-select fmt-font">
                            <option value="">Font</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Avenir', 'Century Gothic', sans-serif">Avenir</option>
                            <option value="'Brush Script MT', cursive">Brush Script</option>
                            <option value="'Century Gothic', 'AppleGothic', sans-serif">Century Gothic</option>
                            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                            <option value="'Consolas', 'Monaco', monospace">Consolas</option>
                            <option value="'Courier New', monospace">Courier New</option>
                            <option value="'Franklin Gothic Medium', sans-serif">Franklin Gothic</option>
                            <option value="'Futura', 'Trebuchet MS', sans-serif">Futura</option>
                            <option value="Garamond, serif">Garamond</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="'Gill Sans', 'Gill Sans MT', sans-serif">Gill Sans</option>
                            <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                            <option value="Impact, sans-serif">Impact</option>
                            <option value="'Times New Roman', serif">Times New Roman</option>
                            <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                            <option value="Verdana, sans-serif">Verdana</option>
                        </select>
                        <select class="format-size-select fmt-size">
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
                </div>

                <!-- Text Styles -->
                <div class="format-section">
                    <label class="format-label">STYLE</label>
                    <div class="format-style-grid">
                        <button class="format-style-btn fmt-bold ${current.bold ? 'active' : ''}" title="Bold" style="font-weight:bold;">B</button>
                        <button class="format-style-btn fmt-italic ${current.italic ? 'active' : ''}" title="Italic" style="font-style:italic;">I</button>
                        <button class="format-style-btn fmt-underline ${current.underline ? 'active' : ''}" title="Underline" style="text-decoration:underline;">U</button>
                    </div>
                </div>

                <!-- Colors -->
                <div class="format-section">
                    <label class="format-label">COLORS</label>
                    <div class="format-color-row">
                        <div class="format-color-group">
                            <span class="format-color-label-text">Text</span>
                            <input type="color" class="format-color-input fmt-fg" value="${(current.fgColor && current.fgColor !== 'transparent') ? current.fgColor : '#000000'}">
                        </div>
                        <div class="format-color-group">
                            <span class="format-color-label-text">BG</span>
                            <input type="color" class="format-color-input fmt-bg" value="${(current.bgColor && current.bgColor !== 'transparent') ? current.bgColor : '#ffffff'}">
                        </div>
                    </div>
                </div>

                <!-- Alignment -->
                <div class="format-section format-align-section">
                    <label class="format-label">ALIGNMENT</label>
                    <div class="format-align-grid" style="margin-bottom: 6px;">
                        <button class="format-style-btn fmt-align-left ${current.align === 'left' ? 'active' : ''}" title="Left">⬅</button>
                        <button class="format-style-btn fmt-align-center ${current.align === 'center' ? 'active' : ''}" title="Center">↔</button>
                        <button class="format-style-btn fmt-align-right ${current.align === 'right' ? 'active' : ''}" title="Right">➡</button>
                    </div>
                    <div class="format-align-grid">
                        <button class="format-style-btn fmt-valign-top ${current.valign === 'top' ? 'active' : ''}" title="Top">⬆</button>
                        <button class="format-style-btn fmt-valign-middle ${current.valign === 'middle' ? 'active' : ''}" title="Middle">↕</button>
                        <button class="format-style-btn fmt-valign-bottom ${current.valign === 'bottom' ? 'active' : ''}" title="Bottom">⬇</button>
                    </div>
                </div>
            </div>
        `;
        
        popup.innerHTML = popupHTML;
        document.body.appendChild(popup);
        
        // Bring to front when clicked
        popup.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            popup.style.zIndex = '10001';
            // Lower other designer panels
            const borderPanel = document.querySelector('.border-designer-popup');
            if (borderPanel) borderPanel.style.zIndex = '10000';
        });
        
        // Prevent clicks inside popup from bubbling
        popup.addEventListener('click', (e) => e.stopPropagation());
    }

    function positionPopup() {
        if (!triggerButton || !popup) return;
        
        const btnRect = triggerButton.getBoundingClientRect();
        const popupWidth = popup.offsetWidth || 280;
        const popupHeight = formatType === 'column' ? 150 : 450;
        
        // Position below and to the left of the button (matching Border Designer)
        let left = btnRect.right - popupWidth - 40;
        let top = btnRect.bottom + 9;
        
        // Keep within viewport bounds
        left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - popupHeight - 10));
        
        popup.style.position = 'fixed';
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    function makeDraggable() {
        if (!popup) return;
        
        const header = popup.querySelector('.format-designer-header');
        let currentX, currentY, initialX, initialY;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.format-close-btn')) return;
            
            // Bring to front when dragging
            popup.style.zIndex = '10001';
            const borderPanel = document.querySelector('.border-designer-popup');
            if (borderPanel) borderPanel.style.zIndex = '10000';
            
            isDragging = true;
            initialX = e.clientX - popup.offsetLeft;
            initialY = e.clientY - popup.offsetTop;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            e.stopPropagation();
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
            setTimeout(() => {
                isDragging = false;
            }, 10);
        });
    }

    function attachEventListeners() {
        if (!popup) return;
        
        const closeBtn = popup.querySelector('.format-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', close);
        
        // Close when clicking outside - DISABLED so panel stays open for multi-edit
        // document.addEventListener('click', handleOutsideClick);
        
        // Attach format control listeners based on type
        if (formatType === 'column') {
            attachColumnFormatListeners();
        } else {
            attachRowFormatListeners();
        }
    }

    function handleOutsideClick(e) {
        if (!isOpen) return;
        if (isDragging) return;
        if (!popup.contains(e.target) && e.target !== triggerButton) {
            close();
        }
    }

    function attachColumnFormatListeners() {
        const leftBtn = popup.querySelector('.fmt-align-left');
        const centerBtn = popup.querySelector('.fmt-align-center');
        const rightBtn = popup.querySelector('.fmt-align-right');
        
        const applyAlignment = (align) => {
            leftBtn.classList.remove('active');
            centerBtn.classList.remove('active');
            rightBtn.classList.remove('active');
            
            if (align === 'left') leftBtn.classList.add('active');
            if (align === 'center') centerBtn.classList.add('active');
            if (align === 'right') rightBtn.classList.add('active');
            
            // This needs to be provided by the main script
            if (window.setColFormat) {
                const key = triggerButton.dataset.key;
                window.setColFormat(key, { align });
            }
        };
        
        leftBtn.addEventListener('click', () => applyAlignment('left'));
        centerBtn.addEventListener('click', () => applyAlignment('center'));
        rightBtn.addEventListener('click', () => applyAlignment('right'));
    }

    function attachRowFormatListeners() {
        // Get all format controls
        const fontSelect = popup.querySelector('.fmt-font');
        const sizeSelect = popup.querySelector('.fmt-size');
        const boldBtn = popup.querySelector('.fmt-bold');
        const italicBtn = popup.querySelector('.fmt-italic');
        const underlineBtn = popup.querySelector('.fmt-underline');
        const leftBtn = popup.querySelector('.fmt-align-left');
        const centerBtn = popup.querySelector('.fmt-align-center');
        const rightBtn = popup.querySelector('.fmt-align-right');
        const topBtn = popup.querySelector('.fmt-valign-top');
        const middleBtn = popup.querySelector('.fmt-valign-middle');
        const bottomBtn = popup.querySelector('.fmt-valign-bottom');
        const fgInput = popup.querySelector('.fmt-fg');
        const bgInput = popup.querySelector('.fmt-bg');
        
        const applyFormat = () => {
            if (!window.applyCellFormat) return;
            
            const format = {};
            if (fontSelect.value) format.fontFamily = fontSelect.value;
            if (sizeSelect.value) format.fontSize = sizeSelect.value;
            
            // Toggle buttons - explicitly set true or false
            format.bold = boldBtn.classList.contains('active');
            format.italic = italicBtn.classList.contains('active');
            format.underline = underlineBtn.classList.contains('active');
            
            if (leftBtn.classList.contains('active')) format.align = 'left';
            if (centerBtn.classList.contains('active')) format.align = 'center';
            if (rightBtn.classList.contains('active')) format.align = 'right';
            
            if (topBtn.classList.contains('active')) format.valign = 'top';
            if (middleBtn.classList.contains('active')) format.valign = 'middle';
            if (bottomBtn.classList.contains('active')) format.valign = 'bottom';
            
            if (fgInput.value) format.fgColor = fgInput.value;
            if (bgInput.value) format.bgColor = bgInput.value;
            
            selectionManager.selectedCells.forEach(cell => {
                window.applyCellFormat(cell, format);
            });
            
            if (persistCallback) persistCallback();
        };
        
        // Font and size - only apply the specific property
        fontSelect.addEventListener('change', () => {
            if (fontSelect.value) {
                const format = { fontFamily: fontSelect.value };
                selectionManager.selectedCells.forEach(cell => {
                    window.applyCellFormat(cell, format);
                });
                if (persistCallback) persistCallback();
            }
        });
        
        sizeSelect.addEventListener('change', () => {
            if (sizeSelect.value) {
                const format = { fontSize: sizeSelect.value };
                selectionManager.selectedCells.forEach(cell => {
                    window.applyCellFormat(cell, format);
                });
                if (persistCallback) persistCallback();
            }
        });
        
        // Toggle buttons - only apply the specific property being toggled
        const toggleBtn = (btn, property) => {
            btn.classList.toggle('active');
            const format = {};
            format[property] = btn.classList.contains('active');
            selectionManager.selectedCells.forEach(cell => {
                window.applyCellFormat(cell, format);
            });
            if (persistCallback) persistCallback();
        };
        
        boldBtn.addEventListener('click', () => toggleBtn(boldBtn, 'bold'));
        italicBtn.addEventListener('click', () => toggleBtn(italicBtn, 'italic'));
        underlineBtn.addEventListener('click', () => toggleBtn(underlineBtn, 'underline'));
        
        // Alignment buttons - only apply alignment
        const setAlign = (align) => {
            leftBtn.classList.remove('active');
            centerBtn.classList.remove('active');
            rightBtn.classList.remove('active');
            if (align === 'left') leftBtn.classList.add('active');
            if (align === 'center') centerBtn.classList.add('active');
            if (align === 'right') rightBtn.classList.add('active');
            
            // Only apply alignment property
            const format = { align };
            selectionManager.selectedCells.forEach(cell => {
                window.applyCellFormat(cell, format);
            });
            if (persistCallback) persistCallback();
        };
        
        leftBtn.addEventListener('click', () => setAlign('left'));
        centerBtn.addEventListener('click', () => setAlign('center'));
        rightBtn.addEventListener('click', () => setAlign('right'));
        
        // Vertical alignment - only apply valign
        const setValign = (valign) => {
            topBtn.classList.remove('active');
            middleBtn.classList.remove('active');
            bottomBtn.classList.remove('active');
            if (valign === 'top') topBtn.classList.add('active');
            if (valign === 'middle') middleBtn.classList.add('active');
            if (valign === 'bottom') bottomBtn.classList.add('active');
            
            // Only apply valign property
            const format = { valign };
            selectionManager.selectedCells.forEach(cell => {
                window.applyCellFormat(cell, format);
            });
            if (persistCallback) persistCallback();
        };
        
        topBtn.addEventListener('click', () => setValign('top'));
        middleBtn.addEventListener('click', () => setValign('middle'));
        bottomBtn.addEventListener('click', () => setValign('bottom'));
        
        // Colors - only apply the specific color property
        fgInput.addEventListener('change', () => {
            if (fgInput.value) {
                const format = { fgColor: fgInput.value };
                selectionManager.selectedCells.forEach(cell => {
                    window.applyCellFormat(cell, format);
                });
                if (persistCallback) persistCallback();
            }
        });
        
        bgInput.addEventListener('change', () => {
            if (bgInput.value) {
                const format = { bgColor: bgInput.value };
                selectionManager.selectedCells.forEach(cell => {
                    window.applyCellFormat(cell, format);
                });
                if (persistCallback) persistCallback();
            }
        });
    }

    function getCurrentFormat() {
        if (formatType === 'column') {
            // Get column format from window function
            if (window.getColAlignment && triggerButton) {
                const key = triggerButton.dataset.key;
                return { align: window.getColAlignment(key) || 'left' };
            }
            return { align: 'left' };
        } else {
            // Get format from first selected cell
            if (selectionManager.selectedCells.size > 0) {
                const firstCell = Array.from(selectionManager.selectedCells)[0];
                return {
                    fontFamily: firstCell.dataset.fontFamily || '',
                    fontSize: firstCell.dataset.fontSize || '',
                    bold: firstCell.dataset.bold === 'true',
                    italic: firstCell.dataset.italic === 'true',
                    underline: firstCell.dataset.underline === 'true',
                    align: firstCell.dataset.align || 'left',
                    valign: firstCell.dataset.valign || 'middle',
                    fgColor: firstCell.dataset.cellFg || '',  // Fixed: was fgColor
                    bgColor: firstCell.dataset.cellBg || ''   // Fixed: was bgColor
                };
            }
            return {};
        }
    }

    // ============================================================================
    // RETURN PUBLIC API
    // ============================================================================

    return {
        init: init,
        open: open,
        close: close,
        isDragging: () => isDragging
    };
})();
