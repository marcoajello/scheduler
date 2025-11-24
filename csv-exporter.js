/**
 * CSV Export Module
 * Add this to your app to export schedules to CSV/Excel
 */

const CSVExporter = {
  
  // Export current schedule to CSV
  exportToCSV() {
    console.log('📊 Exporting to CSV...');
    
    try {
      const tbody = document.getElementById('tbody');
      const headerRow = document.getElementById('headerRow');
      
      if (!tbody || !headerRow) {
        alert('No schedule data to export');
        return;
      }
      
      // Get all columns
      const columns = [];
      headerRow.querySelectorAll('th').forEach(th => {
        const key = th.dataset.key;
        const label = th.textContent.trim();
        if (key && label) {
          columns.push({ key, label });
        }
      });
      
      // Build CSV header
      const csvRows = [];
      csvRows.push(columns.map(col => this.escapeCSV(col.label)).join(','));
      
      // Get all rows (excluding sub-children)
      const rows = Array.from(tbody.querySelectorAll('tr:not(.subchild)'));
      
      // Extract data for each row
      for (const tr of rows) {
        const rowData = [];
        
        for (const col of columns) {
          const cell = tr.querySelector(`td[data-key="${col.key}"]`);
          if (!cell) {
            rowData.push('');
            continue;
          }
          
          // Extract clean value
          let cellValue = this.extractCellValue(cell, col.key, tr);
          rowData.push(this.escapeCSV(cellValue));
        }
        
        csvRows.push(rowData.join(','));
      }
      
      // Create CSV string
      const csvContent = csvRows.join('\n');
      
      // Download the file
      const meta = this.getMetadata();
      const filename = `${meta.title || 'Schedule'}_${meta.date || 'export'}.csv`;
      this.downloadFile(csvContent, filename, 'text/csv');
      
      console.log('✅ CSV exported successfully');
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Error exporting CSV: ' + error.message);
    }
  },
  
  // Extract clean value from a cell
  extractCellValue(cell, key, tr) {
    // Built-in columns: idx, start, end, duration
    if (['idx', 'start', 'end', 'duration'].includes(key)) {
      return cell.textContent.trim();
    }
    
    // Custom columns (data-key starts with "c_")
    if (key.startsWith('c_')) {
      // Find the FIRST input/textarea (the main value field)
      const mainInput = cell.querySelector('input[type="text"]:not([readonly]), textarea:not([readonly])');
      if (mainInput) {
        return mainInput.value.trim();
      }
      
      // Try any input as fallback
      const anyInput = cell.querySelector('input, textarea');
      if (anyInput) {
        return anyInput.value.trim();
      }
      
      // Last resort: clone and remove UI
      const clone = cell.cloneNode(true);
      clone.querySelectorAll('button, select, label, .anchor-label, .upload-btn, .cell-actions').forEach(el => el.remove());
      return clone.textContent.trim();
    }
    
    // Type column (dropdown)
    if (key === 'type') {
      const select = cell.querySelector('select');
      if (select) {
        return select.options[select.selectedIndex]?.text.trim() || '';
      }
    }
    
    // Other columns: try input first
    const input = cell.querySelector('input, textarea');
    if (input) {
      return input.value.trim();
    }
    
    // Otherwise, clone and remove UI elements
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('button, select, label, .upload-btn, .cell-actions, .media-actions').forEach(el => el.remove());
    
    let text = clone.textContent.trim();
    // Clean up multiple spaces and newlines
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  },
  
  // Escape CSV value (handle commas, quotes, newlines)
  escapeCSV(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      value = '"' + value.replace(/"/g, '""') + '"';
    }
    
    return value;
  },
  
  // Download file to user's computer
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  
  // Get metadata for filename
  getMetadata() {
    const el = (id) => document.getElementById(id);
    return {
      title: el('metaTitle') ? el('metaTitle').value : '',
      version: el('metaVersion') ? el('metaVersion').value : '',
      date: el('metaDate') ? el('metaDate').value : '',
      dayNumber: el('metaX') ? el('metaX').value : '',
      totalDays: el('metaY') ? el('metaY').value : ''
    };
  },
  
  // Add export button to the UI
  addExportButton() {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    
    // Check if button already exists
    if (document.getElementById('csvExportBtn')) return;
    
    const button = document.createElement('button');
    button.id = 'csvExportBtn';
    button.textContent = 'Export CSV';
    button.title = 'Export schedule to CSV/Excel format';
    button.onclick = () => this.exportToCSV();
    
    // Add after the Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn && printBtn.parentNode) {
      printBtn.parentNode.insertBefore(button, printBtn.nextSibling);
    } else {
      controls.appendChild(button);
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // CSVExporter.addExportButton(); // Commented out - button now in File Manager
    console.log('✅ CSV Exporter ready');
  });
} else {
  // CSVExporter.addExportButton(); // Commented out - button now in File Manager
  console.log('✅ CSV Exporter ready');
}

// Make it globally accessible
window.CSVExporter = CSVExporter;
