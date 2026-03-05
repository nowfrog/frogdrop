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

// ============ STUBS (implemented in later tasks) ============

function generateListing(listing) {
  showNotification('Generate listing - coming soon', 'error');
}

function generateAllListings() {
  showNotification('Generate all - coming soon', 'error');
}

function publishAllListings() {
  showNotification('Publish all - coming soon', 'error');
}

function renderListingForm(listing, containerId) {
  // stub - implemented in Task 7
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
