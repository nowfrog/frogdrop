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
  document.getElementById('ui-container').innerHTML = '<div class="setup-wizard"><h2>Welcome to NOWFROG SHOP</h2><p>Setup will be implemented next.</p></div>';
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
