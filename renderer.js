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

function renderMainView() {
  document.getElementById('ui-container').innerHTML = '<p>Main view coming soon.</p>';
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
