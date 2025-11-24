// TAG MANAGER - Simplified, working version
// Storage: localStorage for metadata, Supabase for images

const TagManager = {
  tags: {},
  columnTags: {},
  currentEditId: null,
  cropCanvas: null,
  cropCtx: null,
  cropState: { x: 0.5, y: 0.5, radius: 0.3 },
  draggedTag: null,
  uploadedFile: null,
  cropImage: null,
  
  STORAGE_KEY: 'tagObjects_v1',

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

  loadTags() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.tags = data.tags || {};
        this.columnTags = data.columnTags || {};
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
      console.log('[TagManager] Saved');
    } catch (e) {
      console.error('[TagManager] Save error:', e);
    }
  },

  setupUI() {
    const columnManager = document.querySelector('.colpanel');
    if (!columnManager) {
      setTimeout(() => this.setupUI(), 100);
      return;
    }

    if (document.querySelector('.tagpanel')) {
      this.renderTagList();
      return;
    }

    const html = `
      <details class="card tagpanel">
        <summary>Tag Manager</summary>
        <div class="tag-manager-wrap">
          <div class="tag-manager-actions">
            <button onclick="TagManager.openAddTag()" class="tm-btn">+ Add</button>
            <button onclick="TagManager.exportTagReport()" class="tm-btn ghost">Report</button>
            <button onclick="TagManager.refreshTags()" class="tm-btn ghost">↻</button>
          </div>
          <div class="tag-manager-list" id="tagManagerList"></div>
        </div>
      </details>
    `;

    columnManager.insertAdjacentHTML('afterend', html);
    this.renderTagList();
  },

  refreshTags() {
    this.loadTags();
    this.renderTagList();
  },

  async renderTagList() {
    const container = document.getElementById('tagManagerList');
    if (!container) return;

    const tagArray = Object.values(this.tags);
    
    if (tagArray.length === 0) {
      container.innerHTML = '<div class="tag-empty">No tags</div>';
      return;
    }

    // Load vault images for tags that need them
    const tagPromises = tagArray.map(async tag => {
      let imageUrl = tag.imageUrl;
      
      // If no imageUrl but has vaultId, load from vault
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
      <div class="tag-item" draggable="true" data-tag-id="${tag.id}">
        <div class="tag-preview">
          ${tag._displayUrl ? `<img src="${tag._displayUrl}" />` : `<div class="tag-empty-preview">—</div>`}
        </div>
        <div class="tag-info">
          <div class="tag-name">${tag.label}</div>
          <div class="tag-meta">${tag._displayUrl ? `${tag.height}px` : 'Text'}</div>
        </div>
        <div class="tag-btns">
          <button onclick="TagManager.editTag('${tag.id}')" class="tm-btn-sm">Edit</button>
          <button onclick="TagManager.deleteTag('${tag.id}')" class="tm-btn-sm danger">Del</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('dragstart', (e) => this.handleDragStart(e));
      item.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });
  },

  openAddTag() {
    this.currentEditId = null;
    this.showTagEditor();
  },

  editTag(tagId) {
    this.currentEditId = tagId;
    this.showTagEditor(this.tags[tagId]);
  },

  showTagEditor(tag = {}) {
    const isEdit = !!this.currentEditId;
    tag = tag || {};
    
    this.cropState = {
      x: tag.cropX || 0.5,
      y: tag.cropY || 0.5,
      radius: tag.cropRadius || 0.3
    };

    const html = `
      <div class="tag-editor-overlay" onclick="TagManager.closeEditor(event)">
        <div class="tag-editor-modal" onclick="event.stopPropagation()">
          <div class="tag-editor-header">
            <h3>${isEdit ? 'EDIT TAG' : 'ADD TAG'}</h3>
            <button class="close-btn" onclick="TagManager.closeEditor()">×</button>
          </div>
          
          <div class="tag-editor-body">
            <label>
              NAME
              <input type="text" id="tagNameInput" value="${tag.label || ''}" placeholder="TAG NAME">
            </label>

            <label>
              IMAGE (OPTIONAL)
              <input type="file" id="tagImageUpload" accept="image/*">
            </label>

            <div id="tagCropSection" style="display: ${(tag.imageUrl || tag.vaultId) ? 'block' : 'none'};">
              <label>CROP CIRCLE</label>
              <div class="tag-crop-container">
                <canvas id="tagCropCanvas" width="400" height="400"></canvas>
              </div>
              
              <label>
                HEIGHT
                <div class="height-control">
                  <input type="number" id="tagHeightInput" value="${tag.height || 80}" min="20" max="200" step="5">
                  <span>PX</span>
                </div>
              </label>
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
    
    document.getElementById('tagImageUpload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadedFile = file;
        document.getElementById('tagCropSection').style.display = 'block';
        const blobUrl = URL.createObjectURL(file);
        this.setupCropCanvas(blobUrl);
      }
    });
    
    // Load image for crop canvas
    if (tag.imageUrl) {
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
    this.cropCanvas = document.getElementById('tagCropCanvas');
    if (!this.cropCanvas) return;
    
    this.cropCtx = this.cropCanvas.getContext('2d');
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      this.cropImage = img;
      this.drawCropCanvas();
      this.attachCropListeners();
    };
    
    img.src = url;
  },

  drawCropCanvas() {
    if (!this.cropCanvas || !this.cropImage) return;
    
    const ctx = this.cropCtx;
    const canvas = this.cropCanvas;
    const img = this.cropImage;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const scaledW = img.width * scale;
    const scaledH = img.height * scale;
    const offsetX = (canvas.width - scaledW) / 2;
    const offsetY = (canvas.height - scaledH) / 2;
    
    ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = this.cropState.x * scaledW + offsetX;
    const centerY = this.cropState.y * scaledH + offsetY;
    const radius = this.cropState.radius * Math.min(scaledW, scaledH);
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + radius, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
  },

  attachCropListeners() {
    if (!this.cropCanvas) return;
    
    let isDraggingCenter = false;
    let isDraggingRadius = false;
    
    const getMousePos = (e) => {
      const rect = this.cropCanvas.getBoundingClientRect();
      const scale = Math.min(this.cropCanvas.width / this.cropImage.width, this.cropCanvas.height / this.cropImage.height);
      const scaledW = this.cropImage.width * scale;
      const scaledH = this.cropImage.height * scale;
      const offsetX = (this.cropCanvas.width - scaledW) / 2;
      const offsetY = (this.cropCanvas.height - scaledH) / 2;
      
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        scaledW, scaledH, offsetX, offsetY
      };
    };
    
    this.cropCanvas.onmousedown = (e) => {
      const pos = getMousePos(e);
      const centerX = this.cropState.x * pos.scaledW + pos.offsetX;
      const centerY = this.cropState.y * pos.scaledH + pos.offsetY;
      const radius = this.cropState.radius * Math.min(pos.scaledW, pos.scaledH);
      
      const distToCenter = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2));
      const distToRadius = Math.sqrt(Math.pow(pos.x - (centerX + radius), 2) + Math.pow(pos.y - centerY, 2));
      
      if (distToCenter < 12) isDraggingCenter = true;
      else if (distToRadius < 12) isDraggingRadius = true;
    };
    
    this.cropCanvas.onmousemove = (e) => {
      if (!isDraggingCenter && !isDraggingRadius) return;
      
      const pos = getMousePos(e);
      
      if (isDraggingCenter) {
        this.cropState.x = Math.max(0, Math.min(1, (pos.x - pos.offsetX) / pos.scaledW));
        this.cropState.y = Math.max(0, Math.min(1, (pos.y - pos.offsetY) / pos.scaledH));
      } else if (isDraggingRadius) {
        const centerX = this.cropState.x * pos.scaledW + pos.offsetX;
        const centerY = this.cropState.y * pos.scaledH + pos.offsetY;
        const dist = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2));
        this.cropState.radius = Math.max(0.1, Math.min(0.5, dist / Math.min(pos.scaledW, pos.scaledH)));
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

  async saveTag() {
    const label = document.getElementById('tagNameInput').value.trim();
    if (!label) {
      alert('Enter tag name');
      return;
    }

    console.log('[TagManager] Saving:', label);
    
    let imageUrl = '';
    let vaultId = null;
    
    if (this.uploadedFile) {
      try {
        // Store locally first, upload to cloud if authenticated
        vaultId = await window.vaultPut(this.uploadedFile);
        console.log('[TagManager] ✓ Stored in vault:', vaultId);
        
        // Keep imageUrl for backward compatibility (will be null if not auth'd)
        if (window.SupabaseAPI?.auth?.isAuthenticated()) {
          try {
            const result = await window.SupabaseAPI.storage.uploadImage(this.uploadedFile, 'tags/');
            if (result.success) {
              imageUrl = result.url;
              console.log('[TagManager] ✓ Also uploaded to Supabase:', imageUrl);
            }
          } catch (err) {
            console.warn('[TagManager] Supabase upload failed (continuing with local):', err);
          }
        }
      } catch (err) {
        console.error('[TagManager] Vault storage error:', err);
        alert('Failed to store image');
        return;
      }
    }
    
    const tagData = {
      id: this.currentEditId || `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: label,
      type: (vaultId || imageUrl) ? 'image' : 'text',
      imageUrl: imageUrl,
      vaultId: vaultId,
      cropX: this.cropState.x,
      cropY: this.cropState.y,
      cropRadius: this.cropState.radius,
      height: parseInt(document.getElementById('tagHeightInput').value) || 80,
      created: Date.now()
    };
    
    if (this.currentEditId) {
      this.tags[this.currentEditId] = tagData;
    } else {
      this.tags[tagData.id] = tagData;
    }
    
    this.saveTags();
    this.renderTagList();
    this.closeEditor();
    
    this.uploadedFile = null;
  },

  deleteTag(tagId) {
    if (!confirm('Delete tag?')) return;
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
  },

  handleDragStart(e) {
    const tagId = e.target.dataset.tagId;
    this.draggedTag = this.tags[tagId];
    e.dataTransfer.effectAllowed = 'copy';
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
    document.addEventListener('dragover', (e) => {
      if (!this.draggedTag) return;
      const tagsBox = e.target.closest('.tagsBox');
      if (tagsBox) {
        e.preventDefault();
        tagsBox.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      const tagsBox = e.target.closest('.tagsBox');
      if (tagsBox) tagsBox.classList.remove('drag-over');
    });
    
    document.addEventListener('drop', (e) => {
      if (!this.draggedTag) return;
      const tagsBox = e.target.closest('.tagsBox');
      if (tagsBox) {
        e.preventDefault();
        tagsBox.classList.remove('drag-over');
        const tagsValue = tagsBox.querySelector('.tags-value');
        if (tagsValue) {
          const ids = tagsValue.value.split(',').filter(id => id.trim());
          if (!ids.includes(this.draggedTag.id)) {
            ids.push(this.draggedTag.id);
            tagsValue.value = ids.join(',');
            if (typeof TagSystem !== 'undefined') TagSystem.hydrateTagsBox(tagsBox);
          }
        }
      }
    });
  }
};

TagManager.init();
