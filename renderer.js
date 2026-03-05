const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');

// ============ TERMINAL ============

let term;
let fitAddon;
let terminalBuffer = '';

function initTerminal() {
  // Load xterm CSS dynamically
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './node_modules/@xterm/xterm/css/xterm.css';
  document.head.appendChild(link);

  term = new Terminal({
    theme: {
      background: '#1a1a2e',
      foreground: '#e0e0e0',
      cursor: '#e94560',
      selection: 'rgba(233, 69, 96, 0.3)'
    },
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    cursorBlink: true
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal-container'));
  fitAddon.fit();

  term.onData((data) => {
    window.api.sendToTerminal(data);
  });

  window.api.onTerminalOutput((data) => {
    term.write(data);
    terminalBuffer += data;
  });

  window.addEventListener('resize', () => fitAddon.fit());

  const resizeObserver = new ResizeObserver(() => fitAddon.fit());
  resizeObserver.observe(document.getElementById('terminal-container'));
}

// ============ APP STATE ============

const state = {
  mode: 'single',       // 'single' | 'batch'
  settings: null,
  listings: [],          // { id, photos: [File], data: {title, description, ...}, status }
  currentView: 'main'   // 'main' | 'setup' | 'edit'
};

// ============ INIT ============

async function init() {
  initTerminal();
  state.settings = await window.api.getSettings();

  if (!state.settings || !state.settings.ebayAppId) {
    renderSetupWizard();
  } else {
    renderMainView();
  }
}

// ============ VIEWS (stubs - implemented in later tasks) ============

function renderSetupWizard() {
  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="setup-wizard">
      <h2>Welcome to NOWFROG SHOP</h2>
      <p>To get started, enter your eBay API credentials. You can obtain these from
        <strong>developer.ebay.com</strong>.</p>
      <div class="form-group">
        <label for="ebayAppId">App ID (Client ID)</label>
        <input type="text" id="ebayAppId" placeholder="Enter your App ID" />
      </div>
      <div class="form-group">
        <label for="ebayDevId">Dev ID</label>
        <input type="text" id="ebayDevId" placeholder="Enter your Dev ID" />
      </div>
      <div class="form-group">
        <label for="ebayCertId">Cert ID (Client Secret)</label>
        <input type="password" id="ebayCertId" placeholder="Enter your Cert ID" />
      </div>
      <div class="form-group">
        <label for="redirectUriName">Redirect URI Name (RuName)</label>
        <input type="text" id="redirectUriName" value="NOWFROG_SHOP" placeholder="NOWFROG_SHOP" />
      </div>
      <button id="saveConnectBtn" class="btn btn-primary">Save &amp; Connect to eBay</button>
      <div id="setupError" style="display:none; color:#e94560; margin-top:12px;"></div>
    </div>
  `;

  document.getElementById('saveConnectBtn').addEventListener('click', async () => {
    const ebayAppId = document.getElementById('ebayAppId').value.trim();
    const ebayDevId = document.getElementById('ebayDevId').value.trim();
    const ebayCertId = document.getElementById('ebayCertId').value.trim();
    const redirectUriName = document.getElementById('redirectUriName').value.trim();

    if (!ebayAppId || !ebayDevId || !ebayCertId || !redirectUriName) {
      const errorEl = document.getElementById('setupError');
      errorEl.textContent = 'All fields are required.';
      errorEl.style.display = 'block';
      return;
    }

    const settings = { ebayAppId, ebayDevId, ebayCertId, redirectUriName };
    await window.api.saveSettings(settings);
    state.settings = settings;

    const result = await window.api.ebayAuth();
    if (result && result.success) {
      showNotification('Successfully connected to eBay!');
      renderMainView();
    } else {
      const errorEl = document.getElementById('setupError');
      const errorMsg = (result && result.error) ? result.error : 'Authentication failed';
      errorEl.innerHTML = `<p>${errorMsg}</p><button id="skipBtn" class="btn">Skip for now</button>`;
      errorEl.style.display = 'block';
      document.getElementById('skipBtn').addEventListener('click', () => {
        renderMainView();
      });
    }
  });
}

// ============ MAIN VIEW ============

function renderMainView() {
  state.currentView = 'main';
  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="tabs">
      <div class="tab ${state.mode === 'single' ? 'active' : ''}" data-mode="single">Single Listing</div>
      <div class="tab ${state.mode === 'batch' ? 'active' : ''}" data-mode="batch">Batch Mode</div>
      <div class="tab" data-mode="settings" style="margin-left: auto;">Settings</div>
    </div>
    <div id="mode-content"></div>
  `;

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      if (mode === 'settings') {
        renderSetupWizard();
        return;
      }
      state.mode = mode;
      renderMainView();
    });
  });

  if (state.mode === 'single') {
    renderSingleMode();
  } else {
    renderBatchMode();
  }
}

// ============ SINGLE MODE ============

function renderSingleMode() {
  const content = document.getElementById('mode-content');

  if (!state.listings.length || state.listings[0].mode !== 'single') {
    state.listings = [{ id: Date.now(), photos: [], data: null, status: 'pending', mode: 'single' }];
  }

  const listing = state.listings[0];

  content.innerHTML = `
    <div class="listing-card">
      <h3>Item Photos</h3>
      <div class="drop-zone" id="single-drop-zone">
        <p>Drag & drop photos here</p>
        <p style="font-size: 12px; margin-top: 8px;">or click to browse</p>
        <div class="drop-zone-photos" id="single-photos"></div>
      </div>
    </div>

    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <button class="btn btn-primary" id="generate-btn" ${listing.photos.length === 0 ? 'disabled' : ''}>
        Generate Listing with Claude
      </button>
      <button class="btn btn-secondary" id="clear-btn">Clear Photos</button>
    </div>

    <div id="listing-form-container"></div>
  `;

  setupDropZone('single-drop-zone', 'single-photos', listing);

  document.getElementById('generate-btn').addEventListener('click', () => generateListing(listing));
  document.getElementById('clear-btn').addEventListener('click', () => {
    listing.photos = [];
    listing.data = null;
    listing.status = 'pending';
    renderSingleMode();
  });

  if (listing.data) {
    renderListingForm(listing, 'listing-form-container');
  }
}

// ============ BATCH MODE ============

function renderBatchMode() {
  const content = document.getElementById('mode-content');

  if (state.listings.length === 1 && state.listings[0].mode === 'single') {
    state.listings = [];
  }

  content.innerHTML = `
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <button class="btn btn-primary" id="add-slot-btn">+ Add Item Slot</button>
      <button class="btn btn-primary" id="generate-all-btn" ${state.listings.filter(l => l.photos.length > 0 && l.status === 'pending').length === 0 ? 'disabled' : ''}>
        Generate All
      </button>
      <button class="btn btn-primary" id="publish-all-btn" ${state.listings.filter(l => l.status === 'ready').length === 0 ? 'disabled' : ''}>
        Publish All
      </button>
    </div>
    <div class="batch-slots" id="batch-slots"></div>
  `;

  renderBatchSlots();

  document.getElementById('add-slot-btn').addEventListener('click', () => {
    state.listings.push({ id: Date.now(), photos: [], data: null, status: 'pending', mode: 'batch' });
    renderBatchSlots();
  });

  document.getElementById('generate-all-btn').addEventListener('click', generateAllListings);
  document.getElementById('publish-all-btn').addEventListener('click', publishAllListings);
}

function renderBatchSlots() {
  const container = document.getElementById('batch-slots');
  if (!container) return;
  container.innerHTML = '';

  state.listings.forEach((listing, index) => {
    const statusClass = `status-${listing.status}`;
    const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);

    const slot = document.createElement('div');
    slot.className = 'batch-slot';
    slot.innerHTML = `
      <div class="batch-slot-header">
        <h3>Item ${index + 1}${listing.data ? ': ' + listing.data.title.substring(0, 40) + '...' : ''}</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" data-remove="${index}">Remove</button>
        </div>
      </div>
      <div class="drop-zone" id="batch-drop-${listing.id}" style="min-height: 100px; padding: 20px;">
        <p style="font-size: 13px;">Drop photos for this item</p>
        <div class="drop-zone-photos" id="batch-photos-${listing.id}"></div>
      </div>
      ${listing.data ? `<div id="batch-form-${listing.id}" style="margin-top: 12px;"></div>` : ''}
    `;

    container.appendChild(slot);
    setupDropZone(`batch-drop-${listing.id}`, `batch-photos-${listing.id}`, listing);

    if (listing.data) {
      renderListingForm(listing, `batch-form-${listing.id}`);
    }
  });

  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.remove);
      state.listings.splice(idx, 1);
      renderBatchSlots();
    });
  });
}

// ============ DROP ZONE ============

function setupDropZone(dropZoneId, photosContainerId, listing) {
  const dropZone = document.getElementById(dropZoneId);
  const photosContainer = document.getElementById(photosContainerId);

  if (!dropZone) return;

  renderPhotos(photosContainer, listing);

  dropZone.addEventListener('click', async (e) => {
    if (e.target.closest('.drop-zone-photo-remove')) return;
    const result = await window.api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
    });
    if (!result.canceled && result.filePaths.length) {
      for (const fp of result.filePaths) {
        listing.photos.push({ path: fp, name: fp.split(/[/\\]/).pop() });
      }
      renderPhotos(photosContainer, listing);
      updateGenerateButtons();
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      listing.photos.push({ path: file.path, name: file.name });
    }
    renderPhotos(photosContainer, listing);
    updateGenerateButtons();
  });
}

async function renderPhotos(container, listing) {
  if (!container) return;
  container.innerHTML = '';
  for (const photo of listing.photos) {
    const base64 = await window.api.getPhotoBase64(photo.path);
    const wrapper = document.createElement('div');
    wrapper.className = 'drop-zone-photo-wrapper';
    wrapper.innerHTML = `
      <img src="${base64}" class="drop-zone-photo" title="${photo.name}">
      <button class="drop-zone-photo-remove">&times;</button>
    `;
    wrapper.querySelector('.drop-zone-photo-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      listing.photos = listing.photos.filter(p => p.path !== photo.path);
      wrapper.remove();
      updateGenerateButtons();
    });
    container.appendChild(wrapper);
  }
}

function updateGenerateButtons() {
  const genBtn = document.getElementById('generate-btn');
  if (genBtn) {
    genBtn.disabled = state.listings.length === 0 || state.listings[0].photos.length === 0;
  }
  const genAllBtn = document.getElementById('generate-all-btn');
  if (genAllBtn) {
    genAllBtn.disabled = state.listings.filter(l => l.photos.length > 0 && l.status === 'pending').length === 0;
  }
}

// ============ PROMPT BUILDER ============

function buildListingPrompt(photoPaths) {
  const photoList = photoPaths.map((p, i) => `  ${i + 1}. ${p}`).join('\n');

  return `Analyze the following product photos and create a complete eBay.it listing in Italian.

Photos to analyze:
${photoList}

You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, no explanation) in this exact format:
{
  "title": "eBay listing title in Italian (max 80 chars)",
  "description": "Detailed HTML description in Italian for eBay listing. Include product details, condition notes, measurements if visible, and any relevant features you can identify from the photos.",
  "category_suggestion": "Suggested eBay category name in Italian",
  "category_id": "eBay category ID number if you know it, otherwise empty string",
  "item_specifics": {
    "Marca": "Brand if visible",
    "Modello": "Model if visible",
    "Colore": "Color",
    "Materiale": "Material if identifiable"
  },
  "condition": "NEW|USED_EXCELLENT|USED_GOOD|USED_ACCEPTABLE|FOR_PARTS",
  "condition_description": "Brief condition notes in Italian",
  "suggested_price": "Suggested price in EUR as number",
  "suggested_shipping": "Standard shipping cost in EUR as number"
}

IMPORTANT:
- The title MUST be in Italian and optimized for eBay search (include brand, model, key features)
- The description MUST be in Italian, detailed, and in HTML format
- Look carefully at ALL photos to identify the product
- Be specific about what you see - brand names, model numbers, sizes, colors
- If you can't identify something, describe what you see
- Respond with ONLY the JSON, nothing else`;
}

// ============ GENERATE LISTING ============

async function generateListing(listing) {
  listing.status = 'generating';
  updateUI();

  const photoPaths = listing.photos.map(p => p.path);
  const prompt = buildListingPrompt(photoPaths);

  // Clear terminal buffer for this generation
  terminalBuffer = '';

  // Send the prompt to Claude Code via terminal
  // Escape the prompt for shell and pipe to claude
  const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/"/g, '\\"');
  const command = `echo "${escapedPrompt}" | claude --no-input\r`;

  window.api.sendToTerminal(command);

  // Wait for Claude Code to respond and parse the output
  await waitForClaudeResponse(listing);
}

function waitForClaudeResponse(listing) {
  return new Promise((resolve) => {
    let checkInterval;
    let lastBufferLength = 0;
    let stableCount = 0;

    checkInterval = setInterval(() => {
      if (terminalBuffer.length === lastBufferLength) {
        stableCount++;
      } else {
        stableCount = 0;
        lastBufferLength = terminalBuffer.length;
      }

      // After 3 seconds of no new output, try to parse
      if (stableCount >= 3) {
        clearInterval(checkInterval);
        const parsed = parseClaudeOutput(terminalBuffer);
        if (parsed) {
          listing.data = parsed;
          listing.status = 'ready';
        } else {
          listing.status = 'pending';
          showNotification('Could not parse Claude output. Try again.', 'error');
        }
        terminalBuffer = '';
        updateUI();
        resolve();
      }
    }, 1000);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      if (listing.status === 'generating') {
        listing.status = 'pending';
        showNotification('Generation timed out. Try again.', 'error');
        updateUI();
        resolve();
      }
    }, 120000);
  });
}

function parseClaudeOutput(output) {
  try {
    // Clean ANSI escape codes
    let cleaned = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    // Try to find JSON block
    const jsonMatch = cleaned.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.title && data.description) {
        return data;
      }
    }
  } catch (e) {
    // Try more aggressive cleaning
    try {
      let cleaned = output.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const json = cleaned.substring(start, end + 1);
        const data = JSON.parse(json);
        if (data.title && data.description) {
          return data;
        }
      }
    } catch (e2) {
      console.error('Failed to parse Claude output:', e2);
    }
  }
  return null;
}

async function generateAllListings() {
  const pendingListings = state.listings.filter(l => l.photos.length > 0 && l.status === 'pending');
  for (const listing of pendingListings) {
    await generateListing(listing);
  }
}

// ============ UI HELPER ============

function updateUI() {
  if (state.mode === 'single') {
    renderSingleMode();
  } else {
    renderBatchMode();
  }
}

// ============ STUBS (implemented in later tasks) ============

async function publishAllListings() {
  const readyListings = state.listings.filter(l => l.status === 'ready');
  for (const listing of readyListings) {
    await publishListing(listing);
  }
}

// ============ LISTING FORM ============

function renderListingForm(listing, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !listing.data) return;

  const d = listing.data;

  container.innerHTML = `
    <div class="listing-card">
      <h3>Listing Details</h3>

      <div class="form-group">
        <label>Title (max 80 chars)</label>
        <input type="text" maxlength="80" value="${escapeHtml(d.title)}" data-field="title">
        <span style="font-size: 11px; color: #a0a0b0;" id="title-count-${listing.id}">${(d.title || '').length}/80</span>
      </div>

      <div class="form-group">
        <label>Description (HTML)</label>
        <textarea rows="8" data-field="description">${escapeHtml(d.description)}</textarea>
      </div>

      <div class="form-group">
        <label>Category</label>
        <input type="text" value="${escapeHtml(d.category_suggestion || '')}" data-field="category_suggestion">
      </div>

      <div class="form-group">
        <label>Category ID</label>
        <input type="text" value="${escapeHtml(d.category_id || '')}" data-field="category_id">
      </div>

      <div class="form-group">
        <label>Condition</label>
        <select data-field="condition">
          <option value="NEW" ${d.condition === 'NEW' ? 'selected' : ''}>Nuovo</option>
          <option value="USED_EXCELLENT" ${d.condition === 'USED_EXCELLENT' ? 'selected' : ''}>Usato - Come nuovo</option>
          <option value="USED_GOOD" ${d.condition === 'USED_GOOD' ? 'selected' : ''}>Usato - Buono</option>
          <option value="USED_ACCEPTABLE" ${d.condition === 'USED_ACCEPTABLE' ? 'selected' : ''}>Usato - Accettabile</option>
          <option value="FOR_PARTS" ${d.condition === 'FOR_PARTS' ? 'selected' : ''}>Per ricambi</option>
        </select>
      </div>

      <div class="form-group">
        <label>Condition Description</label>
        <input type="text" value="${escapeHtml(d.condition_description || '')}" data-field="condition_description">
      </div>

      <div style="display: flex; gap: 12px;">
        <div class="form-group" style="flex: 1;">
          <label>Price (EUR)</label>
          <input type="number" step="0.01" value="${d.suggested_price || ''}" data-field="suggested_price">
        </div>
        <div class="form-group" style="flex: 1;">
          <label>Shipping (EUR)</label>
          <input type="number" step="0.01" value="${d.suggested_shipping || ''}" data-field="suggested_shipping">
        </div>
      </div>

      <div class="form-group">
        <label>Quantity</label>
        <input type="number" min="1" value="${d.quantity || 1}" data-field="quantity">
      </div>

      <h3 style="margin-top: 16px;">Item Specifics</h3>
      <div id="item-specifics-${listing.id}"></div>
      <button class="btn btn-secondary" style="margin-top: 8px; font-size: 12px;" id="add-specific-${listing.id}">+ Add Specific</button>

      <div style="margin-top: 20px; display: flex; gap: 12px;">
        <button class="btn btn-primary" id="publish-btn-${listing.id}">Publish to eBay</button>
        <button class="btn btn-secondary" id="regenerate-btn-${listing.id}">Regenerate</button>
      </div>

      <p id="publish-status-${listing.id}" style="margin-top: 8px; font-size: 13px; color: #a0a0b0;"></p>
    </div>
  `;

  // Item specifics
  const specificsContainer = document.getElementById(`item-specifics-${listing.id}`);
  const specifics = d.item_specifics || {};
  Object.entries(specifics).forEach(([key, value]) => {
    addSpecificRow(specificsContainer, key, value, listing);
  });

  document.getElementById(`add-specific-${listing.id}`).addEventListener('click', () => {
    addSpecificRow(specificsContainer, '', '', listing);
  });

  // Title char counter
  const titleInput = container.querySelector('[data-field="title"]');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const countEl = document.getElementById(`title-count-${listing.id}`);
      if (countEl) countEl.textContent = `${titleInput.value.length}/80`;
    });
  }

  // Save on change
  container.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('change', () => {
      const field = el.dataset.field;
      if (field) {
        listing.data[field] = el.value;
      }
    });
  });

  // Publish button
  document.getElementById(`publish-btn-${listing.id}`).addEventListener('click', () => publishListing(listing));

  // Regenerate button
  document.getElementById(`regenerate-btn-${listing.id}`).addEventListener('click', () => {
    listing.data = null;
    listing.status = 'pending';
    updateUI();
    generateListing(listing);
  });
}

function addSpecificRow(container, key, value, listing) {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
  row.innerHTML = `
    <input type="text" placeholder="Name" value="${escapeHtml(key)}" style="flex: 1; padding: 8px; background: #16213e; border: 1px solid #0f3460; border-radius: 6px; color: #e0e0e0;" class="specific-key">
    <input type="text" placeholder="Value" value="${escapeHtml(value)}" style="flex: 1; padding: 8px; background: #16213e; border: 1px solid #0f3460; border-radius: 6px; color: #e0e0e0;" class="specific-value">
    <button class="btn btn-secondary" style="padding: 4px 10px;">&times;</button>
  `;

  const updateSpecifics = () => {
    listing.data.item_specifics = {};
    container.querySelectorAll('div').forEach(r => {
      const k = r.querySelector('.specific-key');
      const v = r.querySelector('.specific-value');
      if (k && k.value) listing.data.item_specifics[k.value] = v ? v.value : '';
    });
  };

  row.querySelectorAll('input').forEach(i => i.addEventListener('change', updateSpecifics));
  row.querySelector('button').addEventListener('click', () => {
    row.remove();
    updateSpecifics();
  });

  container.appendChild(row);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function publishListing(listing) {
  const statusEl = document.getElementById(`publish-status-${listing.id}`);
  if (statusEl) statusEl.textContent = 'Uploading photos and creating listing...';

  try {
    const result = await window.api.ebayPublish({
      photos: listing.photos,
      data: listing.data
    });

    if (result.success) {
      listing.status = 'published';
      showNotification(`Published! Item ID: ${result.itemId}`, 'success');
    } else {
      showNotification(`Publish failed: ${result.error}`, 'error');
    }
  } catch (e) {
    showNotification(`Error: ${e.message}`, 'error');
  }

  updateUI();
}

// ============ HELPERS ============

function showNotification(message, type = 'success') {
  const notif = document.createElement('div');
  notif.className = `notification notification-${type}`;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ============ START ============

document.addEventListener('DOMContentLoaded', init);
