const { Terminal } = require('@xterm/xterm');
const { t, setLanguage, getLanguage, getAvailableLanguages, getLanguageName } = require('./translations');
function tListings(n) { return n === 1 ? t('listings_count_singular') : t('listings_count_plural'); }
const { FitAddon } = require('@xterm/addon-fit');
const { ipcRenderer, webUtils } = require('electron');

// Prevent Electron from navigating when files are dropped outside drop zones
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ============ API (direct IPC since contextIsolation is off) ============

const api = {
  sendToTerminal: (data) => ipcRenderer.send('terminal-input', data),
  onTerminalOutput: (callback) => ipcRenderer.on('terminal-output', (_, data) => callback(data)),
  resizeTerminal: (cols, rows) => ipcRenderer.send('terminal-resize', { cols, rows }),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  ebayAuth: () => ipcRenderer.invoke('ebay-auth'),
  ebayCheckAuth: () => ipcRenderer.invoke('ebay-check-auth'),
  ebayPublish: (listing) => ipcRenderer.invoke('ebay-publish', listing),
  ebayRevise: (ebayItemId, listing) => ipcRenderer.invoke('ebay-revise', { ebayItemId, listing }),
  openEbayPage: (url) => ipcRenderer.invoke('open-ebay-page', url),
  ebayEndItem: (itemId) => ipcRenderer.invoke('ebay-end-item', itemId),
  ebayReviseAll: (filterIds) => ipcRenderer.invoke('ebay-revise-all', filterIds),
  onReviseAllProgress: (cb) => ipcRenderer.on('revise-all-progress', (_, data) => cb(data)),
  removeReviseAllProgressListener: () => ipcRenderer.removeAllListeners('revise-all-progress'),
  ebayResyncItems: (ebayItemIds) => ipcRenderer.invoke('ebay-resync-items', ebayItemIds),
  ebayPublishAll: () => ipcRenderer.invoke('ebay-publish-all'),
  onPublishAllProgress: (cb) => ipcRenderer.on('publish-all-progress', (_, data) => cb(data)),
  removePublishAllProgressListener: () => ipcRenderer.removeAllListeners('publish-all-progress'),
  getPhotoBase64: (filePath) => ipcRenderer.invoke('get-photo-base64', filePath),
  getPhotoThumbnail: (filePath) => ipcRenderer.invoke('get-photo-thumbnail', filePath),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  saveTheme: (theme) => ipcRenderer.invoke('save-theme', theme),
  writePromptFile: (content) => ipcRenderer.invoke('write-prompt-file', content),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  readResponseFile: () => ipcRenderer.invoke('read-response-file'),
  deleteResponseFile: () => ipcRenderer.invoke('delete-response-file'),
  copyPhoto: (sourcePath, listingId) => ipcRenderer.invoke('copy-photo', { sourcePath, listingId }),
  deletePhoto: (filePath) => ipcRenderer.invoke('delete-photo', filePath),
  rotatePhoto: (filePath, degrees) => ipcRenderer.invoke('rotate-photo', { filePath, degrees }),
  deleteListingPhotos: (listingId) => ipcRenderer.invoke('delete-listing-photos', listingId),
  hasLocalPhotos: (listingId) => ipcRenderer.invoke('has-local-photos', listingId),
  getListings: () => ipcRenderer.invoke('get-listings'),
  saveListing: (listing) => ipcRenderer.invoke('save-listing', listing),
  deleteListing: (listingId) => ipcRenderer.invoke('delete-listing', listingId),
  cleanOrphanPhotos: () => ipcRenderer.invoke('clean-orphan-photos'),
  getCategoriesCsv: () => ipcRenderer.invoke('get-categories-csv'),
  getCategorySpecifics: (categoryId) => ipcRenderer.invoke('ebay-get-category-specifics', categoryId),
  getAllProfiles: () => ipcRenderer.invoke('ebay-get-all-profiles'),
  getSellerList: () => ipcRenderer.invoke('ebay-get-seller-list'),
  getItem: (itemId) => ipcRenderer.invoke('ebay-get-item', itemId),
  syncListings: (forceRefresh) => ipcRenderer.invoke('ebay-sync-listings', forceRefresh),
  onSyncProgress: (cb) => ipcRenderer.on('sync-progress', (_, data) => cb(data)),
  removeSyncProgressListener: () => ipcRenderer.removeAllListeners('sync-progress'),
  // Store selector
  getLastStore: () => ipcRenderer.invoke('get-last-store'),
  saveLastStore: (name) => ipcRenderer.invoke('save-last-store', name),
  // LEGO
  ensureLegoData: () => ipcRenderer.invoke('ensure-lego-data'),
  getLegoRender: (listingId) => ipcRenderer.invoke('get-lego-render', listingId),
  // Vinted
  getVintedListings: () => ipcRenderer.invoke('get-vinted-listings'),
  saveVintedListing: (listing) => ipcRenderer.invoke('save-vinted-listing', listing),
  deleteVintedListing: (id) => ipcRenderer.invoke('delete-vinted-listing', id),
  // Wallapop
  getWallapopListings: () => ipcRenderer.invoke('get-wallapop-listings'),
  saveWallapopListing: (listing) => ipcRenderer.invoke('save-wallapop-listing', listing),
  deleteWallapopListing: (id) => ipcRenderer.invoke('delete-wallapop-listing', id),
  // Etsy
  getEtsyListings: () => ipcRenderer.invoke('get-etsy-listings'),
  saveEtsyListing: (listing) => ipcRenderer.invoke('save-etsy-listing', listing),
  deleteEtsyListing: (id) => ipcRenderer.invoke('delete-etsy-listing', id),
  etsyAuth: () => ipcRenderer.invoke('etsy-auth'),
  etsyCheckAuth: () => ipcRenderer.invoke('etsy-check-auth'),
  etsyPublish: (listing) => ipcRenderer.invoke('etsy-publish', listing),
  etsyRevise: (etsyListingId, listing) => ipcRenderer.invoke('etsy-revise', { etsyListingId, listing }),
  etsyDeactivate: (etsyListingId) => ipcRenderer.invoke('etsy-deactivate', etsyListingId),
  etsyReviseAll: (filterIds) => ipcRenderer.invoke('etsy-revise-all', filterIds),
  onEtsyReviseAllProgress: (cb) => ipcRenderer.on('etsy-revise-all-progress', (_, data) => cb(data)),
  removeEtsyReviseAllProgressListener: () => ipcRenderer.removeAllListeners('etsy-revise-all-progress'),
  etsyPublishAll: () => ipcRenderer.invoke('etsy-publish-all'),
  onEtsyPublishAllProgress: (cb) => ipcRenderer.on('etsy-publish-all-progress', (_, data) => cb(data)),
  removeEtsyPublishAllProgressListener: () => ipcRenderer.removeAllListeners('etsy-publish-all-progress'),
  etsySyncListings: (forceRefresh) => ipcRenderer.invoke('etsy-sync-listings', forceRefresh),
  onEtsySyncProgress: (cb) => ipcRenderer.on('etsy-sync-progress', (_, data) => cb(data)),
  removeEtsySyncProgressListener: () => ipcRenderer.removeAllListeners('etsy-sync-progress'),
  etsyGetTaxonomy: () => ipcRenderer.invoke('etsy-get-taxonomy'),
  etsyGetTaxonomyProperties: (taxonomyId) => ipcRenderer.invoke('etsy-get-taxonomy-properties', taxonomyId),
  etsyGetShippingProfiles: () => ipcRenderer.invoke('etsy-get-shipping-profiles'),
  etsyGetReturnPolicies: () => ipcRenderer.invoke('etsy-get-return-policies'),
  // Language
  getLanguage: () => ipcRenderer.invoke('get-language'),
  saveLanguage: (lang) => ipcRenderer.invoke('save-language', lang),
  getListingLanguage: (storeName) => ipcRenderer.invoke('get-listing-language', storeName),
  saveListingLanguage: (storeName, language) => ipcRenderer.invoke('save-listing-language', { storeName, language }),
  // Backup
  backupListings: () => ipcRenderer.invoke('backup-listings'),
  importBackup: () => ipcRenderer.invoke('import-backup')
};

// ============ TERMINAL ============

let term;
let fitAddon;

function initTerminal() {
  term = new Terminal({
    theme: {
      background: '#0d0d0d',
      foreground: '#f0f0f0',
      cursor: '#ffd700',
      selection: 'rgba(255, 215, 0, 0.3)'
    },
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    cursorBlink: true
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal-container'));

  term.onResize(({ cols, rows }) => {
    api.resizeTerminal(cols, rows);
  });

  fitAddon.fit();

  term.onData((data) => {
    api.sendToTerminal(data);
  });

  api.onTerminalOutput((data) => {
    term.write(data);
  });

  window.addEventListener('resize', () => fitAddon.fit());

  const resizeObserver = new ResizeObserver(() => fitAddon.fit());
  resizeObserver.observe(document.getElementById('terminal-container'));
}

// ============ RESIZE HANDLE ============

function initResizeHandle() {
  const handle = document.getElementById('resize-handle');
  const left = document.getElementById('panel-left');
  const right = document.getElementById('panel-right');
  const app = document.getElementById('app');
  let isResizing = false;
  let rafId = null;

  // Overlay blocks iframes/webviews from stealing mouse events during drag
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:col-resize;display:none;';
  document.body.appendChild(overlay);

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    overlay.style.display = 'block';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    if (rafId) return; // throttle to 1 per frame
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const containerWidth = app.offsetWidth;
      const percent = (e.clientX / containerWidth) * 100;
      if (percent > 20 && percent < 80) {
        left.style.width = `${percent}%`;
        right.style.width = `${100 - percent}%`;
      }
    });
  });

  function stopResize() {
    if (!isResizing) return;
    isResizing = false;
    overlay.style.display = 'none';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (fitAddon) fitAddon.fit();
  }

  document.addEventListener('mouseup', stopResize);
  // Also stop if mouse leaves the window
  document.addEventListener('mouseleave', stopResize);
}

function initExplorerResizeHandle() {
  const handle = document.getElementById('explorer-resize-handle');
  const termContainer = document.getElementById('terminal-container');
  const explorerPanel = document.getElementById('explorer-panel');
  const panelRight = document.getElementById('panel-right');
  let isResizing = false;
  let rafId = null;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:row-resize;display:none;';
  document.body.appendChild(overlay);

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    overlay.style.display = 'block';
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const rect = panelRight.getBoundingClientRect();
      const headerH = document.getElementById('terminal-header').offsetHeight;
      const handleH = handle.offsetHeight;
      const available = rect.height - headerH - handleH;
      const termH = e.clientY - rect.top - headerH;
      const percent = (termH / available) * 100;
      if (percent > 15 && percent < 85) {
        termContainer.style.flex = 'none';
        explorerPanel.style.flex = 'none';
        termContainer.style.height = `${percent}%`;
        explorerPanel.style.height = `${100 - percent}%`;
      }
    });
  });

  function stopResize() {
    if (!isResizing) return;
    isResizing = false;
    overlay.style.display = 'none';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (fitAddon) fitAddon.fit();
  }

  document.addEventListener('mouseup', stopResize);
  document.addEventListener('mouseleave', stopResize);
}

function initExplorerPanel() {
  initExplorerResizeHandle();

  const grid = document.getElementById('explorer-grid');
  const breadcrumb = document.getElementById('explorer-breadcrumb');
  const upBtn = document.getElementById('explorer-up-btn');
  let currentPath = '';
  const thumbCache = new Map();
  const selected = new Set(); // selected file paths
  let lastClickedItem = null; // for shift-click range select
  let imageItems = []; // ordered list of image items in current view

  function updateSelectionUI() {
    grid.querySelectorAll('.explorer-item').forEach(el => {
      el.classList.toggle('selected', selected.has(el.dataset.filePath));
    });
  }

  async function navigateTo(dirPath) {
    currentPath = dirPath;
    selected.clear();
    lastClickedItem = null;
    imageItems = [];
    grid.innerHTML = `<div style="padding: 20px; text-align: center;" class="text-secondary">${t('explorer_loading')}</div>`;

    const folderName = dirPath.split(/[/\\]/).pop() || dirPath;
    breadcrumb.textContent = folderName;
    breadcrumb.title = dirPath;

    try {
      const entries = await api.readDirectory(dirPath);
      grid.innerHTML = '';

      if (entries.length === 0) {
        grid.innerHTML = `<div style="padding: 20px; text-align: center;" class="text-secondary">${t('explorer_empty')}</div>`;
        return;
      }

      const observer = new IntersectionObserver((observed) => {
        for (const entry of observed) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const filePath = entry.target.dataset.filePath;
          if (!filePath) continue;
          const cached = thumbCache.get(filePath);
          if (cached) {
            entry.target.querySelector('.explorer-thumb-img').src = cached;
          } else {
            api.getPhotoThumbnail(filePath).then(thumb => {
              thumbCache.set(filePath, thumb);
              const img = entry.target.querySelector('.explorer-thumb-img');
              if (img) img.src = thumb;
            }).catch(() => {});
          }
        }
      }, { root: grid, rootMargin: '100px' });

      for (const entry of entries) {
        const item = document.createElement('div');
        item.className = 'explorer-item';

        if (entry.type === 'folder') {
          item.innerHTML = `
            <div class="explorer-thumb explorer-folder">&#128193;</div>
            <div class="explorer-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</div>
          `;
          item.addEventListener('dblclick', () => navigateTo(entry.path));
        } else {
          item.dataset.filePath = entry.path;
          item.setAttribute('draggable', 'true');
          item.innerHTML = `
            <div class="explorer-thumb"><img class="explorer-thumb-img" src="" alt="" /></div>
            <div class="explorer-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</div>
          `;
          imageItems.push(item);

          // Click to select
          item.addEventListener('click', (e) => {
            if (e.shiftKey && lastClickedItem) {
              // Range select
              const startIdx = imageItems.indexOf(lastClickedItem);
              const endIdx = imageItems.indexOf(item);
              const from = Math.min(startIdx, endIdx);
              const to = Math.max(startIdx, endIdx);
              if (!e.ctrlKey) selected.clear();
              for (let i = from; i <= to; i++) {
                selected.add(imageItems[i].dataset.filePath);
              }
            } else if (e.ctrlKey) {
              // Toggle single
              if (selected.has(entry.path)) selected.delete(entry.path);
              else selected.add(entry.path);
            } else {
              // Single select
              selected.clear();
              selected.add(entry.path);
            }
            lastClickedItem = item;
            updateSelectionUI();
            grid.focus();
          });

          // Drag — include all selected, or just this one if not selected
          item.addEventListener('dragstart', (e) => {
            let paths;
            if (selected.has(entry.path) && selected.size > 1) {
              paths = [...selected];
            } else {
              paths = [entry.path];
            }
            e.dataTransfer.setData('application/x-explorer-paths', JSON.stringify(paths));
            e.dataTransfer.setData('text/plain', paths.join('\n'));
            e.dataTransfer.effectAllowed = 'copy';
            const badge = document.createElement('div');
            badge.textContent = paths.length > 1 ? `📷 ${paths.length}` : '📷';
            badge.style.cssText = 'position:fixed;top:-100px;background:var(--bg-secondary);border:1px solid var(--border-color);padding:6px 10px;border-radius:8px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            document.body.appendChild(badge);
            e.dataTransfer.setDragImage(badge, 20, 20);
            setTimeout(() => badge.remove(), 0);
          });

          observer.observe(item);
        }

        grid.appendChild(item);
      }
    } catch (err) {
      grid.innerHTML = `<div style="padding: 20px; text-align: center;" class="text-secondary">${t('explorer_error')}${escapeHtml(err.message)}</div>`;
    }
  }

  // Click on empty area to deselect
  grid.addEventListener('click', (e) => {
    if (e.target === grid) {
      selected.clear();
      lastClickedItem = null;
      updateSelectionUI();
    }
  });

  // Make grid focusable for keyboard events
  grid.setAttribute('tabindex', '0');
  grid.style.outline = 'none';

  // Delete selected photos with Delete key
  grid.addEventListener('keydown', async (e) => {
    if (e.key !== 'Delete' || selected.size === 0) return;
    e.preventDefault();
    if (!confirm(`${t('explorer_delete_confirm')} ${selected.size}?`)) return;
    const paths = [...selected];
    for (const p of paths) {
      try { await api.deletePhoto(p); } catch {}
    }
    selected.clear();
    lastClickedItem = null;
    navigateTo(currentPath);
  });

  document.getElementById('explorer-refresh-btn').addEventListener('click', () => {
    if (currentPath) navigateTo(currentPath);
  });

  upBtn.addEventListener('click', () => {
    if (!currentPath) return;
    const parent = currentPath.replace(/[/\\][^/\\]+$/, '');
    if (parent && parent !== currentPath) navigateTo(parent);
  });

  window.refreshExplorer = () => {
    const p = (state.settings && state.settings.explorerPath) || '';
    if (p) {
      navigateTo(p);
    } else {
      grid.innerHTML = `<div style="padding: 20px; text-align: center;" class="text-secondary">${t('explorer_set_folder')}</div>`;
    }
  };

  window.refreshExplorer();
}

// ============ YOUTUBE PANEL ============

function initYouTubePanel() {
  const toggleBtn = document.getElementById('youtube-toggle-btn');
  const panel = document.getElementById('youtube-panel');
  const resizeHandle = document.getElementById('youtube-resize-handle');
  const urlInput = document.getElementById('youtube-url-input');
  const goBtn = document.getElementById('youtube-go-btn');
  const closeBtn = document.getElementById('youtube-close-btn');
  const wv = document.getElementById('youtube-webview');
  let youtubeHeight = 300;

  let ytLoaded = false;
  function openPanel() {
    panel.classList.add('open');
    panel.style.height = youtubeHeight + 'px';
    resizeHandle.style.display = '';
    toggleBtn.classList.add('active');
    // Load YouTube on first open
    if (!ytLoaded) {
      ytLoaded = true;
      wv.src = 'https://www.youtube.com';
    }
    if (fitAddon) fitAddon.fit();
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.style.height = '';
    resizeHandle.style.display = 'none';
    toggleBtn.classList.remove('active');
    if (fitAddon) fitAddon.fit();
  }

  toggleBtn.addEventListener('click', () => {
    if (panel.classList.contains('open')) closePanel();
    else openPanel();
  });

  closeBtn.addEventListener('click', closePanel);

  function navigateYT() {
    let val = urlInput.value.trim();
    if (!val) return;
    if (val.includes('youtube.com') || val.includes('youtu.be')) {
      wv.src = val;
    } else {
      wv.src = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(val);
    }
  }

  goBtn.addEventListener('click', navigateYT);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateYT();
  });

  wv.addEventListener('did-navigate', (e) => {
    urlInput.value = e.url;
  });
  wv.addEventListener('did-navigate-in-page', (e) => {
    if (e.isMainFrame) urlInput.value = e.url;
  });

  // Inject a fullscreen shim into YouTube so fullscreen fills the webview, not the OS screen.
  // The real Fullscreen API is blocked at the session level in main.js.
  wv.addEventListener('dom-ready', () => {
    wv.insertCSS(`
      .ytp-fullscreen .html5-video-player,
      .ytp-fullscreen .html5-video-container,
      .ytp-fullscreen video {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        z-index: 2147483647 !important;
        background: #000 !important;
      }
      .yt-fake-fs {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important;
        z-index: 2147483647 !important;
        background: #000 !important;
      }
      .yt-fake-fs video {
        width: 100% !important; height: 100% !important;
        object-fit: contain !important;
      }
    `);
    wv.executeJavaScript(`
      (function() {
        if (window.__ytFsShimInstalled) return;
        window.__ytFsShimInstalled = true;
        let fakeFullscreenEl = null;
        const origRequest = Element.prototype.requestFullscreen;
        Element.prototype.requestFullscreen = function(opts) {
          fakeFullscreenEl = this;
          this.classList.add('yt-fake-fs');
          Object.defineProperty(document, 'fullscreenElement', { get: () => fakeFullscreenEl, configurable: true });
          document.dispatchEvent(new Event('fullscreenchange'));
          return Promise.resolve();
        };
        // Also override webkit variant
        if (Element.prototype.webkitRequestFullscreen) {
          Element.prototype.webkitRequestFullscreen = Element.prototype.requestFullscreen;
        }
        if (Element.prototype.webkitRequestFullScreen) {
          Element.prototype.webkitRequestFullScreen = Element.prototype.requestFullscreen;
        }
        const origExit = document.exitFullscreen;
        document.exitFullscreen = function() {
          if (fakeFullscreenEl) {
            fakeFullscreenEl.classList.remove('yt-fake-fs');
            fakeFullscreenEl = null;
          }
          Object.defineProperty(document, 'fullscreenElement', { get: () => null, configurable: true });
          document.dispatchEvent(new Event('fullscreenchange'));
          return Promise.resolve();
        };
        if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen = document.exitFullscreen;
        }
        if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen = document.exitFullscreen;
        }
        Object.defineProperty(document, 'fullscreenEnabled', { get: () => true, configurable: true });
        Object.defineProperty(document, 'webkitFullscreenEnabled', { get: () => true, configurable: true });
        // ESC key to exit fake fullscreen
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && fakeFullscreenEl) {
            document.exitFullscreen();
          }
        });
      })();
    `);

    // --- YouTube Ad Blocker ---
    wv.executeJavaScript(`
      (function() {
        if (window.__ytAdBlockInstalled) return;
        window.__ytAdBlockInstalled = true;

        // 1. Click "Skip Ad" button whenever it appears
        // 2. Remove overlay ads
        // 3. Speed through unskippable video ads
        const observer = new MutationObserver(() => {
          // Skip button (all known variants)
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [id="skip-button:"] button, .ytp-ad-skip-button-slot button');
          if (skipBtn) { skipBtn.click(); return; }

          // "Skip ads" text button
          const skipText = document.querySelector('.ytp-ad-text.ytp-ad-skip-button-text');
          if (skipText) { skipText.click(); return; }

          // Overlay / banner ads — remove them
          document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-message-container, #player-ads, #masthead-ad, ytd-ad-slot-renderer, ytd-banner-promo-renderer, ytd-statement-banner-renderer, ytd-in-feed-ad-layout-renderer, tp-yt-paper-dialog.ytd-popup-container').forEach(el => el.remove());

          // Video ad playing — detect and fast-forward
          const player = document.querySelector('.html5-video-player');
          const video = document.querySelector('video');
          if (player && video) {
            const isAd = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
            if (isAd) {
              // Mute and speed through the ad
              video.muted = true;
              video.playbackRate = 16;
              // Try to skip to end
              if (video.duration && isFinite(video.duration)) {
                video.currentTime = video.duration - 0.1;
              }
            }
          }
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        // Also run periodically for ads that mutation observer might miss
        setInterval(() => {
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [id="skip-button:"] button, .ytp-ad-skip-button-slot button');
          if (skipBtn) { skipBtn.click(); return; }

          const player = document.querySelector('.html5-video-player');
          const video = document.querySelector('video');
          if (player && video && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'))) {
            video.muted = true;
            video.playbackRate = 16;
            if (video.duration && isFinite(video.duration)) {
              video.currentTime = video.duration - 0.1;
            }
          }
        }, 500);
      })();
    `);
  });

  // Resize handle for YouTube panel
  let isResizingYT = false;
  let ytRafId = null;

  const ytOverlay = document.createElement('div');
  ytOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:row-resize;display:none;';
  document.body.appendChild(ytOverlay);

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizingYT = true;
    ytOverlay.style.display = 'block';
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isResizingYT) return;
    if (ytRafId) return;
    ytRafId = requestAnimationFrame(() => {
      ytRafId = null;
      const panelRight = document.getElementById('panel-right');
      const rect = panelRight.getBoundingClientRect();
      const bottomY = rect.bottom;
      const newH = bottomY - e.clientY;
      if (newH > 100 && newH < rect.height * 0.7) {
        youtubeHeight = newH;
        panel.style.height = newH + 'px';
      }
    });
  });
  function stopYTResize() {
    if (!isResizingYT) return;
    isResizingYT = false;
    ytOverlay.style.display = 'none';
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (fitAddon) fitAddon.fit();
  }
  document.addEventListener('mouseup', stopYTResize);
  document.addEventListener('mouseleave', stopYTResize);
}

// ============ APP STATE ============

let appPath = '';
let categoriesCsv = ''; // raw CSV loaded once

const state = {
  activeStore: null,       // null | 'ebay' | 'vinted' | 'wallapop'
  mode: 'listings',       // 'listings' | 'new'
  settings: null,
  listings: [],
  theme: 'dark',
  editingListingId: null,
  syncing: false,
  syncProgress: null,
  listingFilter: 'all',    // 'all' | 'published' | 'ready' | 'pending' | 'unlisted'
  viewMode: 'grid',        // 'grid' | 'list'
  sortMode: 'newest',      // 'newest' | 'oldest' | 'az' | 'za' | 'price-asc' | 'price-desc'
  // Vinted state
  vintedListings: [],
  vintedMode: 'listings',  // 'listings' | 'new' | 'upload'
  vintedEditingId: null,
  // Wallapop state
  wallapopListings: [],
  wallapopMode: 'listings',  // 'listings' | 'new' | 'upload'
  wallapopEditingId: null,
  // Etsy state
  etsyListings: [],
  etsyMode: 'listings',
  etsyEditingId: null,
  etsyTaxonomy: [],
  etsyShippingProfiles: [],
  etsyReturnPolicies: [],
  // Language
  appLanguage: 'it',
  ebayListingLanguage: 'it',
  vintedListingLanguage: 'it',
  wallapopListingLanguage: 'it',
  etsyListingLanguage: 'it'
};

// ============ THEME ============

const TERMINAL_THEMES = {
  dark: {
    background: '#0d0d0d', foreground: '#f0f0f0', cursor: '#ffd700',
    selection: 'rgba(255, 215, 0, 0.3)'
  },
  light: {
    background: '#f5f5f5', foreground: '#1e1e1e', cursor: '#6366f1', cursorAccent: '#f5f5f5',
    selection: 'rgba(99, 102, 241, 0.25)',
    black: '#1e1e1e', red: '#dc2626', green: '#16a34a', yellow: '#ca8a04',
    blue: '#2563eb', magenta: '#9333ea', cyan: '#0891b2', white: '#f5f5f5',
    brightBlack: '#6b7280', brightRed: '#ef4444', brightGreen: '#22c55e', brightYellow: '#eab308',
    brightBlue: '#3b82f6', brightMagenta: '#a855f7', brightCyan: '#06b6d4', brightWhite: '#ffffff'
  },
  'high-contrast': {
    background: '#000000', foreground: '#ffffff', cursor: '#00ff00',
    selection: 'rgba(0, 255, 0, 0.3)',
    black: '#000000', red: '#ff0000', green: '#00ff00', yellow: '#ffff00',
    blue: '#0088ff', magenta: '#ff00ff', cyan: '#00ffff', white: '#ffffff',
    brightBlack: '#888888', brightRed: '#ff4444', brightGreen: '#44ff44', brightYellow: '#ffff44',
    brightBlue: '#4488ff', brightMagenta: '#ff44ff', brightCyan: '#44ffff', brightWhite: '#ffffff'
  },
  televideo: {
    background: '#0000aa', foreground: '#ffffff', cursor: '#00ff00',
    selection: 'rgba(255, 255, 0, 0.3)',
    black: '#000000', red: '#ff0000', green: '#00ff00', yellow: '#ffff00',
    blue: '#0000ff', magenta: '#ff00ff', cyan: '#00ffff', white: '#ffffff',
    brightBlack: '#555555', brightRed: '#ff5555', brightGreen: '#55ff55', brightYellow: '#ffff55',
    brightBlue: '#5555ff', brightMagenta: '#ff55ff', brightCyan: '#55ffff', brightWhite: '#ffffff'
  },
  gray: {
    background: '#2b2b2b', foreground: '#e8e8e8', cursor: '#8ab4f8',
    selection: 'rgba(138, 180, 248, 0.25)',
    black: '#1a1a1a', red: '#e57373', green: '#81c784', yellow: '#fff176',
    blue: '#64b5f6', magenta: '#ce93d8', cyan: '#4dd0e1', white: '#e0e0e0',
    brightBlack: '#757575', brightRed: '#ef9a9a', brightGreen: '#a5d6a7', brightYellow: '#fff59d',
    brightBlue: '#90caf9', brightMagenta: '#e1bee7', brightCyan: '#80deea', brightWhite: '#fafafa'
  }
};

function applyTheme(theme) {
  state.theme = theme;
  if (theme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  if (term) {
    term.options.theme = TERMINAL_THEMES[theme] || TERMINAL_THEMES.dark;
  }
}

// ============ SHIPPING DEFAULTS ============

function getShippingDefaults() {
  // Find the most common shipping values from existing listings
  const listings = (state.listings || []).filter(l => l.data && l.data.shipping_service);
  if (listings.length === 0) {
    return { service: 'IT_QuickPackage3', cost: '5.49', type: 'Flat' };
  }
  // Use the most recent listing's shipping as default
  const latest = listings[listings.length - 1].data;
  return {
    service: latest.shipping_service || 'IT_QuickPackage3',
    cost: latest.suggested_shipping || '5.49',
    type: latest.shipping_type || 'Flat'
  };
}

// ============ PERSISTENCE HELPERS ============

async function saveListing(listing) {
  listing.updatedAt = Date.now();
  await api.saveListing(listing);
  // Update local state
  const idx = state.listings.findIndex(l => l.id === listing.id);
  if (idx >= 0) {
    state.listings[idx] = listing;
  } else {
    state.listings.push(listing);
  }
}

function fixPhotosPaths(listings) {
  return listings.map(listing => {
    if (listing.photos) {
      listing.photos = listing.photos.map(photo => {
        if (photo.isRemote) return photo;
        if (photo.relativePath) {
          photo.path = appPath + '/' + photo.relativePath.replace(/\\/g, '/');
          photo.path = photo.path.replace(/\//g, require('path').sep);
        }
        return photo;
      });
    }
    return listing;
  });
}


function routeToStore(storeName) {
  state.activeStore = storeName;
  if (storeName === 'ebay') {
    if (!state.settings || !state.settings.ebayAppId) {
      renderSetupWizard();
    } else {
      renderMainView();
    }
  } else if (storeName === 'vinted') {
    renderVintedView();
  } else if (storeName === 'wallapop') {
    renderWallapopView();
  } else if (storeName === 'etsy') {
    if (!state.settings || !state.settings.etsyApiKey) {
      renderEtsySetupWizard();
    } else {
      renderEtsyView();
    }
  } else {
    renderStoreSelector();
  }
}

// ============ INIT ============

async function init() {
  const checksDiv = document.getElementById('splash-checks');
  const splashMsg = document.getElementById('splash-message');
  const enterBtn = document.getElementById('splash-enter-btn');

  // Apply theme early
  const savedTheme = await api.getTheme();
  applyTheme(savedTheme || 'dark');

  const savedLang = await api.getLanguage();
  state.appLanguage = savedLang || 'en';
  setLanguage(state.appLanguage);

  // Helper: add a check row to the splash
  function addCheck(label, status, detail) {
    const icon = status === 'ok' ? '&#10003;' : status === 'warn' ? '&#9888;' : '&#10060;';
    const color = status === 'ok' ? 'var(--notification-success)' : status === 'warn' ? '#f0ad4e' : 'var(--notification-error)';
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 13px;';
    row.innerHTML = `<span style="color: ${color}; font-size: 16px; line-height: 1;">${icon}</span><div><span style="color: var(--text-primary);">${label}</span>${detail ? `<div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">${detail}</div>` : ''}</div>`;
    checksDiv.appendChild(row);
  }

  if (splashMsg) splashMsg.textContent = 'Checking dependencies...';

  // Check 1: Node.js in system PATH (needed for Claude Code / npm)
  let systemNodeFound = false;
  try {
    const nodeResult = await ipcRenderer.invoke('check-system-node');
    if (nodeResult.installed) {
      systemNodeFound = true;
      addCheck('Node.js', 'ok', nodeResult.version);
    } else {
      addCheck('Node.js', 'warn',
        'Not found in system PATH — needed to install Claude Code.<br>' +
        'Download: <span style="color: var(--accent);">nodejs.org</span>'
      );
    }
  } catch {
    addCheck('Node.js', 'ok', process.version);
    systemNodeFound = true;
  }

  // Check 2: Claude Code
  let claudeInstalled = false;
  async function checkClaude() {
    try {
      const result = await ipcRenderer.invoke('check-claude-code');
      return result.installed ? result : { installed: false };
    } catch { return { installed: false }; }
  }

  const claudeResult = await checkClaude();
  if (claudeResult.installed) {
    claudeInstalled = true;
    addCheck('Claude Code', 'ok', claudeResult.version);
  } else {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; font-size: 13px;';
    row.innerHTML = `
      <span style="color: #f0ad4e; font-size: 16px; line-height: 1;">&#9888;</span>
      <div>
        <span style="color: var(--text-primary);">Claude Code</span>
        <div style="color: var(--text-secondary); font-size: 11px; margin-top: 2px;">
          Not installed — AI listing generation won't work without it.
        </div>
        <button id="splash-install-claude" class="btn btn-primary" style="margin-top: 6px; padding: 4px 14px; font-size: 12px;" ${systemNodeFound ? '' : 'disabled title="Install Node.js first"'}>
          Install Claude Code
        </button>
        ${!systemNodeFound ? '<div style="color: var(--notification-error); font-size: 10px; margin-top: 2px;">Requires Node.js installed on your system</div>' : ''}
        <span id="splash-claude-status" style="display: none; color: var(--text-secondary); font-size: 11px; margin-left: 8px;"></span>
      </div>
    `;
    checksDiv.appendChild(row);

    // Install button handler
    document.getElementById('splash-install-claude').addEventListener('click', async function() {
      const btn = this;
      const statusEl = document.getElementById('splash-claude-status');
      btn.disabled = true;
      btn.textContent = 'Installing...';
      statusEl.style.display = 'inline';
      statusEl.textContent = 'This may take a minute...';

      try {
        const installResult = await ipcRenderer.invoke('install-claude-code');
        if (installResult.success) {
          btn.style.display = 'none';
          statusEl.style.color = 'var(--notification-success)';
          statusEl.textContent = '✓ Installed! ' + (installResult.version || '');
          claudeInstalled = true;
          if (splashMsg) splashMsg.textContent = 'Ready!';
        } else {
          btn.disabled = false;
          btn.textContent = 'Retry';
          statusEl.style.color = 'var(--notification-error)';
          statusEl.textContent = installResult.error || 'Installation failed. Try manually: npm install -g @anthropic-ai/claude-code';
        }
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Retry';
        statusEl.style.color = 'var(--notification-error)';
        statusEl.textContent = 'Error. Try manually: npm install -g @anthropic-ai/claude-code';
      }
    });
  }

  if (splashMsg) splashMsg.textContent = 'Loading data...';

  // Load all data in background while user sees the checks
  initTerminal();
  initResizeHandle();

  // Load per-store listing languages
  state.ebayListingLanguage = await api.getListingLanguage('ebay') || 'en';
  state.vintedListingLanguage = await api.getListingLanguage('vinted') || 'en';
  state.wallapopListingLanguage = await api.getListingLanguage('wallapop') || 'en';
  state.etsyListingLanguage = await api.getListingLanguage('etsy') || 'en';

  appPath = await api.getAppPath();
  state.settings = await api.getSettings();
  categoriesCsv = await api.getCategoriesCsv();
  initExplorerPanel();
  initYouTubePanel();

  // Load persisted listings and fix photo paths
  const savedListings = await api.getListings();
  state.listings = fixPhotosPaths(savedListings);

  const savedVintedListings = await api.getVintedListings();
  state.vintedListings = fixPhotosPaths(savedVintedListings);

  const savedWallapopListings = await api.getWallapopListings();
  state.wallapopListings = fixPhotosPaths(savedWallapopListings);

  const savedEtsyListings = await api.getEtsyListings();
  state.etsyListings = fixPhotosPaths(savedEtsyListings);

  await api.cleanOrphanPhotos();

  renderStoreSelector();

  // Show summary and Enter button
  const totalListings = state.listings.length + state.vintedListings.length + state.wallapopListings.length + state.etsyListings.length;
  if (totalListings > 0) {
    addCheck(`${totalListings} listings loaded`, 'ok');
  }

  if (splashMsg) splashMsg.textContent = claudeInstalled ? 'Ready!' : 'Ready (some features limited)';

  // Show Enter button
  enterBtn.style.display = '';
  enterBtn.addEventListener('click', () => {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 600);
    }
    if (app) app.style.display = 'flex';
    if (fitAddon) fitAddon.fit();
  });
}

// ============ GENERAL SETTINGS ============

function renderGeneralSettings() {
  const container = document.getElementById('ui-container');
  const langOptions = getAvailableLanguages().map(l =>
    `<option value="${l.code}" ${state.appLanguage === l.code ? 'selected' : ''}>${l.name}</option>`
  ).join('');

  container.innerHTML = `
    <div class="setup-wizard">
      <h2>${t('settings_general')}</h2>

      <div class="form-group">
        <label for="shopName">${t('settings_shop_name')}</label>
        <input type="text" id="shopName" value="${escapeAttr((state.settings && state.settings.shopName) || '')}" placeholder="${t('settings_shop_name_placeholder')}" />
      </div>

      <div class="form-group">
        <label for="appLanguage">${t('settings_language')}</label>
        <select id="appLanguage">${langOptions}</select>
      </div>

      <div class="form-group">
        <label for="appTheme">${t('settings_theme')}</label>
        <select id="appTheme">
          <option value="dark" ${(state.theme || 'dark') === 'dark' ? 'selected' : ''}>${t('settings_theme_dark')}</option>
          <option value="light" ${state.theme === 'light' ? 'selected' : ''}>${t('settings_theme_light')}</option>
          <option value="gray" ${state.theme === 'gray' ? 'selected' : ''}>${t('settings_theme_gray')}</option>
          <option value="high-contrast" ${state.theme === 'high-contrast' ? 'selected' : ''}>${t('settings_theme_high_contrast')}</option>
          <option value="televideo" ${state.theme === 'televideo' ? 'selected' : ''}>${t('settings_theme_televideo')}</option>
        </select>
      </div>

      <div class="form-group">
        <label for="explorerPath">${t('settings_explorer_path')}</label>
        <div class="flex-row" style="align-items: center;">
          <input type="text" id="explorerPath" value="${escapeAttr((state.settings && state.settings.explorerPath) || '')}" placeholder="${t('settings_explorer_placeholder')}" style="flex: 1;" />
          <button class="btn btn-secondary" id="browseExplorerPath" style="white-space: nowrap; padding: 10px 16px;">${t('settings_browse')}</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="generalBackBtn" class="btn btn-secondary">&larr; ${t('settings_back')}</button>
        <button id="generalSaveBtn" class="btn btn-primary">${t('settings_save')}</button>
      </div>
    </div>
  `;

  document.getElementById('appLanguage').addEventListener('change', (e) => {
    state.appLanguage = e.target.value;
    setLanguage(e.target.value);
    api.saveLanguage(e.target.value);
    renderGeneralSettings(); // re-render with new language
  });

  document.getElementById('appTheme').addEventListener('change', (e) => {
    applyTheme(e.target.value);
    api.saveTheme(e.target.value);
  });

  document.getElementById('browseExplorerPath').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('show-open-dialog', { properties: ['openDirectory'] });
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      document.getElementById('explorerPath').value = result.filePaths[0];
    }
  });

  document.getElementById('generalBackBtn').addEventListener('click', () => {
    if (state.activeStore) {
      routeToStore(state.activeStore);
    } else {
      renderStoreSelector();
    }
  });

  document.getElementById('generalSaveBtn').addEventListener('click', async () => {
    const explorerPath = document.getElementById('explorerPath').value.trim();
    const shopName = document.getElementById('shopName').value.trim();
    const settings = state.settings || {};
    settings.explorerPath = explorerPath;
    settings.shopName = shopName;
    await api.saveSettings(settings);
    state.settings = settings;
    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(t('settings_saved'));
  });
}

// ============ SETUP WIZARD ============

function renderSetupWizard() {
  const container = document.getElementById('ui-container');
  const s = state.settings || {};
  container.innerHTML = `
    <div class="setup-wizard">
      <h2>${t('ebay_welcome')}</h2>
      <p>${t('ebay_setup_intro')}
        <strong>developer.ebay.com</strong>.</p>
      <div class="form-group">
        <label for="ebayAppId">${t('ebay_app_id')}</label>
        <input type="text" id="ebayAppId" value="${escapeAttr(s.ebayAppId || '')}" placeholder="${t('ebay_enter_app_id')}" />
      </div>
      <div class="form-group">
        <label for="ebayDevId">${t('ebay_dev_id')}</label>
        <input type="text" id="ebayDevId" value="${escapeAttr(s.ebayDevId || '')}" placeholder="${t('ebay_enter_dev_id')}" />
      </div>
      <div class="form-group">
        <label for="ebayCertId">${t('ebay_cert_id')}</label>
        <input type="password" id="ebayCertId" value="${escapeAttr(s.ebayCertId || '')}" placeholder="${t('ebay_enter_cert_id')}" />
      </div>
      <div class="form-group">
        <label for="redirectUriName">${t('ebay_redirect_uri')}</label>
        <input type="text" id="redirectUriName" value="${escapeAttr(s.redirectUriName || '')}" placeholder="${t('ebay_enter_redirect_uri')}" />
      </div>
      <div class="form-group">
        <label for="location">${t('ebay_location')}</label>
        <input type="text" id="location" value="${escapeAttr(s.location || '')}" placeholder="${t('ebay_location_placeholder')}" />
      </div>

      <h3 style="margin-top: 20px;">${t('ebay_shipping_defaults')}</h3>
      <p class="text-secondary text-small" style="margin-bottom: 12px;">${t('ebay_shipping_defaults_desc')}</p>
      <div class="form-group">
        <label for="defaultShippingCost">${t('ebay_shipping_cost')}</label>
        <input type="number" step="0.01" id="defaultShippingCost" value="${s.defaultShippingCost || '5.49'}" placeholder="5.49" />
      </div>
      <div class="form-group">
        <label for="defaultShippingService">${t('ebay_shipping_service')}</label>
        <input type="text" id="defaultShippingService" value="${escapeAttr(s.defaultShippingService || 'IT_QuickPackage3')}" placeholder="es. IT_QuickPackage3" />
      </div>
      <div class="form-group">
        <label for="defaultShippingType">${t('ebay_shipping_type')}</label>
        <select id="defaultShippingType">
          <option value="Flat" ${(s.defaultShippingType || 'Flat') === 'Flat' ? 'selected' : ''}>${t('ebay_shipping_flat')}</option>
          <option value="FreeShipping" ${(s.defaultShippingType || '') === 'FreeShipping' ? 'selected' : ''}>${t('ebay_shipping_free')}</option>
        </select>
      </div>

      <h3 style="margin-top: 20px;">${t('ebay_listing_language')}</h3>
      <p class="text-secondary text-small" style="margin-bottom: 12px;">${t('ebay_listing_language_desc')}</p>
      <div class="form-group">
        <select id="ebayListingLanguage">
          ${getAvailableLanguages().map(l =>
            `<option value="${l.code}" ${state.ebayListingLanguage === l.code ? 'selected' : ''}>${l.name}</option>`
          ).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="backBtn" class="btn btn-secondary">&larr; ${t('settings_back')}</button>
        <button id="saveBtn" class="btn btn-secondary">${t('settings_save')}</button>
        <button id="saveConnectBtn" class="btn btn-primary">${t('ebay_save_connect')}</button>
      </div>
      <div id="setupError" class="error-text" style="display:none; margin-top:12px;"></div>
    </div>
  `;

  function gatherSettings() {
    const existing = state.settings || {};
    return {
      ebayAppId: document.getElementById('ebayAppId').value.trim(),
      ebayDevId: document.getElementById('ebayDevId').value.trim(),
      ebayCertId: document.getElementById('ebayCertId').value.trim(),
      redirectUriName: document.getElementById('redirectUriName').value.trim(),
      location: document.getElementById('location').value.trim(),
      explorerPath: existing.explorerPath || '',
      defaultShippingCost: document.getElementById('defaultShippingCost').value.trim(),
      defaultShippingService: document.getElementById('defaultShippingService').value.trim(),
      defaultShippingType: document.getElementById('defaultShippingType').value
    };
  }

  function saveListingLang() {
    const listingLang = document.getElementById('ebayListingLanguage').value;
    state.ebayListingLanguage = listingLang;
    api.saveListingLanguage('ebay', listingLang);
  }

  // Back button — go to store selector (or main view if already configured)
  document.getElementById('backBtn').addEventListener('click', () => {
    if (state.settings && state.settings.ebayAppId) {
      renderMainView();
    } else {
      renderStoreSelector();
    }
  });

  // Save only (no eBay auth)
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const settings = gatherSettings();
    await api.saveSettings(settings);
    state.settings = settings;
    saveListingLang();
    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(t('settings_saved'));
  });

  // Save & connect
  document.getElementById('saveConnectBtn').addEventListener('click', async () => {
    const settings = gatherSettings();
    if (!settings.ebayAppId || !settings.ebayDevId || !settings.ebayCertId || !settings.redirectUriName) {
      const errorEl = document.getElementById('setupError');
      errorEl.textContent = t('ebay_api_required');
      errorEl.style.display = 'block';
      return;
    }

    await api.saveSettings(settings);
    state.settings = settings;
    saveListingLang();
    if (window.refreshExplorer) window.refreshExplorer();

    const result = await api.ebayAuth();
    if (result && result.success) {
      showNotification(t('ebay_connected'));
      renderMainView();
    } else {
      const errorEl = document.getElementById('setupError');
      const errorMsg = (result && result.error) ? result.error : 'Authentication failed';
      errorEl.innerHTML = `<p>${errorMsg}</p><button id="skipBtn" class="btn">${t('ebay_skip')}</button>`;
      errorEl.style.display = 'block';
      document.getElementById('skipBtn').addEventListener('click', () => {
        renderMainView();
      });
    }
  });
}

// ============ MAIN VIEW ============

// ============ STORE SELECTOR ============

function renderStoreSelector() {
  state.activeStore = null;
  const container = document.getElementById('ui-container');
  const ebayCount = state.listings.length;
  const vintedCount = state.vintedListings.length;
  const wallapopCount = state.wallapopListings.length;
  const etsyCount = state.etsyListings.length;

  container.innerHTML = `
    <div class="store-selector">
      <div class="store-selector-header">
        <h1 class="store-selector-title">${escapeHtml((state.settings && state.settings.shopName) || 'My Shop')}</h1>
        <p class="text-secondary">${t('store_choose')}</p>
        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-secondary" id="general-settings-btn" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            ${t('settings_general')}
          </button>
          <button class="btn btn-secondary" id="backup-btn" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${t('backup_export')}
          </button>
          <button class="btn btn-secondary" id="import-backup-btn" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            ${t('backup_import')}
          </button>
        </div>
      </div>
      <div class="store-cards">
        <div class="store-card" data-store="ebay">
          <div class="store-card-icon store-card-ebay">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M2 7h20"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>
          </div>
          <h3>eBay</h3>
          <p class="text-secondary text-small">${ebayCount} ${tListings(ebayCount)}</p>
        </div>
        <div class="store-card" data-store="vinted">
          <div class="store-card-icon store-card-vinted">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.38 3.46L16.05 21.3a1 1 0 01-1 .7H8.88a1 1 0 01-1-.7L3.62 3.46a1 1 0 011-1.26h14.76a1 1 0 011 1.26z"/><path d="M8 10h8"/></svg>
          </div>
          <h3>Vinted</h3>
          <p class="text-secondary text-small">${vintedCount} ${tListings(vintedCount)}</p>
        </div>
        <div class="store-card" data-store="wallapop">
          <div class="store-card-icon store-card-wallapop">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
          </div>
          <h3>Wallapop</h3>
          <p class="text-secondary text-small">${wallapopCount} ${tListings(wallapopCount)}</p>
        </div>
        <div class="store-card store-card-disabled" data-store="etsy">
          <div class="store-card-icon store-card-etsy">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 8h5.5c.83 0 1.5.67 1.5 1.5S14.33 11 13.5 11H9v3h4.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H8V8z"/></svg>
          </div>
          <h3>Etsy</h3>
          <span class="coming-soon-badge">Work in Progress</span>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.store-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('store-card-disabled')) return;
      const store = card.dataset.store;
      state.activeStore = store;
      api.saveLastStore(store);
      routeToStore(store);
    });
  });

  document.getElementById('general-settings-btn').addEventListener('click', () => {
    renderGeneralSettings();
  });

  document.getElementById('backup-btn').addEventListener('click', async () => {
    const onProgress = (_, data) => {
      // Show modal on first progress event
      if (!document.getElementById('backup-modal-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sync-modal-overlay';
        overlay.id = 'backup-modal-overlay';
        overlay.innerHTML = `
          <div class="sync-modal">
            <h3>${t('backup_export')}</h3>
            <p id="backup-status" class="text-secondary">${t('backup_preparing')}</p>
            <div class="sync-progress-bar-container">
              <div class="sync-progress-bar" id="backup-progress-bar"></div>
            </div>
            <p id="backup-counter" class="text-secondary text-small">0 / 0</p>
            <p id="backup-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
          </div>
        `;
        document.body.appendChild(overlay);
      }
      const bar = document.getElementById('backup-progress-bar');
      const counter = document.getElementById('backup-counter');
      const titleEl = document.getElementById('backup-title');
      const statusEl = document.getElementById('backup-status');
      if (!bar) return;
      const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
      bar.style.width = pct + '%';
      counter.textContent = `${data.current} / ${data.total}`;
      titleEl.textContent = data.title || '';
      if (data.writing) statusEl.textContent = t('backup_writing');
    };
    ipcRenderer.on('backup-progress', onProgress);

    const result = await api.backupListings();
    ipcRenderer.removeListener('backup-progress', onProgress);
    const modal = document.getElementById('backup-modal-overlay');
    if (modal) modal.remove();

    if (result.canceled) return;
    if (result.success) {
      showNotification(`${t('backup_done')} (${result.count} ${tListings(result.count)})`);
    } else {
      showNotification(t('backup_error') + (result.error || ''), 'error');
    }
  });

  document.getElementById('import-backup-btn').addEventListener('click', async () => {
    const onProgress = (_, data) => {
      if (!document.getElementById('backup-modal-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sync-modal-overlay';
        overlay.id = 'backup-modal-overlay';
        overlay.innerHTML = `
          <div class="sync-modal">
            <h3>${t('backup_import')}</h3>
            <p id="backup-status" class="text-secondary">${t('backup_preparing')}</p>
            <div class="sync-progress-bar-container">
              <div class="sync-progress-bar" id="backup-progress-bar"></div>
            </div>
            <p id="backup-counter" class="text-secondary text-small">0 / 0</p>
            <p id="backup-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
          </div>
        `;
        document.body.appendChild(overlay);
      }
      const bar = document.getElementById('backup-progress-bar');
      const counter = document.getElementById('backup-counter');
      const titleEl = document.getElementById('backup-title');
      const statusEl = document.getElementById('backup-status');
      if (!bar) return;
      const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
      bar.style.width = pct + '%';
      counter.textContent = `${data.current} / ${data.total}`;
      titleEl.textContent = data.title || '';
      if (data.writing) statusEl.textContent = t('backup_writing');
    };
    ipcRenderer.on('backup-progress', onProgress);

    const result = await api.importBackup();
    ipcRenderer.removeListener('backup-progress', onProgress);
    const modal = document.getElementById('backup-modal-overlay');
    if (modal) modal.remove();

    if (result.canceled) return;
    if (result.success) {
      state.listings = fixPhotosPaths(await api.getListings());
      state.vintedListings = fixPhotosPaths(await api.getVintedListings());
      state.wallapopListings = fixPhotosPaths(await api.getWallapopListings());
      state.etsyListings = fixPhotosPaths(await api.getEtsyListings());
      renderStoreSelector();
      showNotification(`${t('backup_imported')} (${result.imported} ${tListings(result.imported)})`);
    } else {
      showNotification(t('backup_error') + (result.error || ''), 'error');
    }
  });
}

// ============ EBAY ============

async function renderMainView() {
  const isAuthenticated = await api.ebayCheckAuth();
  const container = document.getElementById('ui-container');

  // If editing a listing, render that view
  if (state.editingListingId) {
    renderEditListing(state.editingListingId);
    return;
  }

  container.innerHTML = `
    ${!isAuthenticated ? `
    <div class="auth-banner">
      <span>${t('ebay_not_connected')} ${t('ebay_go_settings')}</span>
      <button class="btn" id="go-settings-btn">${t('tab_settings')}</button>
    </div>
    ` : ''}
    <div class="tabs">
      <button class="store-back-btn" id="back-to-stores" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab ${state.mode === 'listings' ? 'active' : ''}" data-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab ${state.mode === 'new' ? 'active' : ''}" data-mode="new">${t('tab_new_listing')}</div>
      ${state.mode === 'listings' ? (() => {
        const total = state.listings
          .filter(l => l.status === 'published' && l.data && l.data.suggested_price)
          .reduce((sum, l) => sum + parseFloat(l.data.suggested_price || 0), 0);
        return `<span class="revenue-badge" title="Ricavo potenziale totale (listing pubblicati)">&euro;${formatPrice(total)}</span>`;
      })() : ''}
      ${state.mode === 'listings' ? `<div class="sync-btn-group">
        <button class="sync-btn" id="sync-ebay-btn" ${!isAuthenticated || state.syncing ? 'disabled' : ''}>${t('btn_import_ebay')}</button>
        <button class="sync-btn" id="force-sync-btn" ${!isAuthenticated || state.syncing ? 'disabled' : ''}>${t('btn_force_refresh')}</button>
        <button class="sync-btn" id="update-all-btn" ${!isAuthenticated ? 'disabled' : ''}>${t('btn_update_ebay')}</button>
        <button class="sync-btn" id="publish-all-btn" ${!isAuthenticated ? 'disabled' : ''}>${t('btn_publish_ready')}</button>
        <button class="sync-btn" id="clear-all-photos-btn">${t('btn_clean_photos')}</button>
        <button class="sync-btn" id="bulk-mode-btn">${t('btn_bulk_edit')}</button>
      </div>` : ''}
      <div class="tab" data-mode="settings" style="margin-left: auto;">${t('tab_settings')} ${isAuthenticated ? '\u2713' : ''}</div>
    </div>
    <div id="mode-content"></div>
  `;

  document.getElementById('back-to-stores').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });

  const goSettingsBtn = document.getElementById('go-settings-btn');
  if (goSettingsBtn) {
    goSettingsBtn.addEventListener('click', () => renderSetupWizard());
  }

  if (state.mode === 'listings') {
    document.getElementById('sync-ebay-btn').addEventListener('click', () => startSync(false));
    document.getElementById('force-sync-btn').addEventListener('click', () => startSync(true));
    document.getElementById('update-all-btn').addEventListener('click', () => startUpdateAll());
    document.getElementById('publish-all-btn').addEventListener('click', () => startPublishAll());
    document.getElementById('clear-all-photos-btn').addEventListener('click', () => clearAllLocalPhotos());
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      if (mode === 'settings') {
        renderSetupWizard();
        return;
      }
      state.mode = mode;
      state.editingListingId = null;
      renderMainView();
    });
  });

  if (state.mode === 'listings') {
    renderListingsView();
  } else {
    renderNewListing();
  }
}

// ============ MY LISTINGS VIEW ============

function renderListingsView() {
  const content = document.getElementById('mode-content');

  if (state.listings.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <p class="text-secondary" style="font-size: 16px; margin-bottom: 16px;">${t('listings_empty')}</p>
        <button class="btn btn-primary" id="go-new-btn">${t('listings_empty_hint')}</button>
      </div>
    `;
    document.getElementById('go-new-btn').addEventListener('click', () => {
      state.mode = 'new';
      renderMainView();
    });
    return;
  }

  // Count by status
  const counts = { all: state.listings.length, published: 0, ready: 0, pending: 0, unlisted: 0 };
  for (const l of state.listings) {
    if (counts[l.status] !== undefined) counts[l.status]++;
  }

  const filters = [
    { key: 'all', label: t('filter_all') },
    { key: 'published', label: t('filter_published') },
    { key: 'ready', label: t('filter_ready') },
    { key: 'pending', label: t('filter_drafts') },
    { key: 'unlisted', label: t('filter_unlisted') }
  ];

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div class="listing-filters" id="listing-filters" style="margin-bottom: 0;">
        ${filters.map(f => `<button class="filter-btn ${state.listingFilter === f.key ? 'active' : ''}" data-filter="${f.key}">${f.label} <span class="filter-count">${counts[f.key] || 0}</span></button>`).join('')}
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <select id="sort-select" class="sort-select">
          <option value="newest" ${state.sortMode === 'newest' ? 'selected' : ''}>${t('sort_newest')}</option>
          <option value="oldest" ${state.sortMode === 'oldest' ? 'selected' : ''}>${t('sort_oldest')}</option>
          <option value="modified-new" ${state.sortMode === 'modified-new' ? 'selected' : ''}>${t('sort_modified_new')}</option>
          <option value="modified-old" ${state.sortMode === 'modified-old' ? 'selected' : ''}>${t('sort_modified_old')}</option>
          <option value="az" ${state.sortMode === 'az' ? 'selected' : ''}>A-Z</option>
          <option value="za" ${state.sortMode === 'za' ? 'selected' : ''}>Z-A</option>
          <option value="price-asc" ${state.sortMode === 'price-asc' ? 'selected' : ''}>${t('sort_price_asc')}</option>
          <option value="price-desc" ${state.sortMode === 'price-desc' ? 'selected' : ''}>${t('sort_price_desc')}</option>
        </select>
        <div class="view-toggle">
          <button class="view-toggle-btn ${state.viewMode === 'grid' ? 'active' : ''}" data-view-mode="grid" title="${t('view_grid')}">&#9638;</button>
          <button class="view-toggle-btn ${state.viewMode === 'list' ? 'active' : ''}" data-view-mode="list" title="${t('view_list')}">&#9776;</button>
        </div>
      </div>
    </div>
    <div id="bulk-bar" class="bulk-bar" style="display:none;">
      <span id="bulk-count">0 ${t('listings_selected')}</span>
      <button class="btn btn-secondary" id="bulk-select-all">${t('bulk_select_all')}</button>
      <button class="btn btn-primary" id="bulk-edit-btn">${t('bulk_edit_selected')}</button>
      <button class="btn btn-primary" id="bulk-publish-btn" style="display:none;">${t('bulk_publish_ebay')}</button>
      <button class="btn btn-secondary" id="bulk-resync-btn" style="display:none;">${t('bulk_resync_ebay')}</button>
      <button class="btn btn-secondary" id="bulk-delete-btn" style="color: var(--error-color);">${t('bulk_delete_selected')}</button>
      <button class="btn btn-secondary" id="bulk-deselect" style="margin-left: auto;">${t('bulk_deselect')}</button>
    </div>
    <div class="${state.viewMode === 'grid' ? 'listings-grid' : 'listings-list'}" id="listings-container"></div>
  `;

  // Filter click handlers
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.listingFilter = btn.dataset.filter;
      renderListingsView();
    });
  });

  // Sort select
  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sortMode = e.target.value;
    renderListingsView();
  });

  // View mode toggle
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.viewMode = btn.dataset.viewMode;
      renderListingsView();
    });
  });

  const grid = document.getElementById('listings-container');
  const filtered = (state.listingFilter === 'all' ? [...state.listings] : state.listings.filter(l => l.status === state.listingFilter)).sort((a, b) => {
    const titleA = (a.data && a.data.title || '').toLowerCase();
    const titleB = (b.data && b.data.title || '').toLowerCase();
    const priceA = parseFloat(a.data && a.data.suggested_price || 0);
    const priceB = parseFloat(b.data && b.data.suggested_price || 0);
    switch (state.sortMode) {
      case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
      case 'modified-new': return (b.updatedAt || 0) - (a.updatedAt || 0);
      case 'modified-old': return (a.updatedAt || 0) - (b.updatedAt || 0);
      case 'az': return titleA.localeCompare(titleB);
      case 'za': return titleB.localeCompare(titleA);
      case 'price-asc': return priceA - priceB;
      case 'price-desc': return priceB - priceA;
      default: return (b.createdAt || 0) - (a.createdAt || 0); // newest
    }
  });

  // Lazy thumbnail observer — only loads images when card scrolls into view
  const thumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      thumbObserver.unobserve(card);
      const listingId = card.dataset.listingId;
      const listing = filtered.find(l => l.id === listingId);
      if (!listing) continue;
      const thumbPhoto = listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;
      if (!thumbPhoto) continue;
      const thumbEl = card.querySelector('.listing-thumb');
      if (!thumbEl) continue;
      if (thumbPhoto.isRemote && thumbPhoto.url) {
        thumbEl.innerHTML = `<img src="${thumbPhoto.url}" alt="thumb">`;
      } else if (thumbPhoto.path) {
        api.getPhotoThumbnail(thumbPhoto.path).then(thumb => {
          thumbEl.innerHTML = `<img src="${thumb}" alt="thumb">`;
        }).catch(() => {});
      }
      // Clear photos button
      if (listing.ebayItemId && listing.status === 'published') {
        api.hasLocalPhotos(listing.id).then(has => {
          if (!has) return;
          const slot = card.querySelector('.clear-photos-slot');
          if (!slot || slot.hasChildNodes()) return;
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary clear-photos-btn';
          btn.title = t('btn_clean_photos');
          btn.innerHTML = '&#128247;';
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(t('clean_confirm_single'))) {
              await api.deleteListingPhotos(listing.id);
              listing.photos = (listing.photos || []).filter(p => p.isRemote);
              await saveListing(listing);
              btn.remove();
              showNotification(t('clean_done_single'));
            }
          });
          slot.appendChild(btn);
        });
      }
    }
  }, { root: document.getElementById('panel-left'), rootMargin: '200px' });

  // Render cards in batches to avoid blocking the UI
  function createCard(listing) {
    const statusClass = `status-${listing.status}`;
    const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);
    const title = (listing.data && listing.data.title) ? listing.data.title : t('listings_no_title');
    const price = (listing.data && listing.data.suggested_price) ? `\u20AC${formatPrice(listing.data.suggested_price)}` : '';
    const hasThumb = listing.photos && listing.photos.length > 0;

    const card = document.createElement('div');
    card.dataset.listingId = listing.id;

    if (state.viewMode === 'list') {
      card.className = 'listing-row';
      card.innerHTML = `
        <input type="checkbox" class="bulk-checkbox" data-bulk-id="${listing.id}">
        <div class="listing-row-thumb listing-thumb">
          ${hasThumb ? '' : `<span class="text-secondary text-small">${t('listings_no_photo')}</span>`}
        </div>
        <div class="listing-row-info">
          <div class="listing-row-title">${escapeHtml(title)}</div>
          <div class="listing-row-meta">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            <span class="text-secondary text-small">${listing.photos ? listing.photos.length : 0} foto${listing.data && listing.data.free_shipping ? ` &middot; ${t('preview_free_shipping')}` : (listing.data && listing.data.suggested_shipping && listing.data.suggested_shipping !== '0' ? ` &middot; ${t('preview_shipping')} &euro;${formatPrice(listing.data.suggested_shipping)}` : '')}</span>
          </div>
        </div>
        ${price ? `<div class="listing-row-price">${price}</div>` : '<div class="listing-row-price"></div>'}
        <div class="listing-row-actions">
          <button class="btn btn-secondary btn-card-action" data-view="${listing.id}">${t('btn_view')}</button>
          <button class="btn btn-primary btn-card-action" data-edit="${listing.id}">${t('btn_edit')}</button>
          ${listing.status === 'ready' && !listing.ebayItemId ? `<button class="btn btn-primary btn-card-action" data-publish="${listing.id}">${t('btn_publish')}</button>` : ''}
          <span class="clear-photos-slot"></span>
          <button class="btn btn-secondary btn-delete-icon" data-delete="${listing.id}" title="${t('delete_confirm_btn')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      `;
    } else {
      card.className = 'listing-item';
      card.innerHTML = `
        <input type="checkbox" class="bulk-checkbox" data-bulk-id="${listing.id}">
        <div class="listing-item-thumb listing-thumb">
          ${hasThumb ? '' : `<span class="text-secondary">${t('listings_no_photo')}</span>`}
        </div>
        <div class="listing-item-body">
          <div class="listing-item-header">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            ${price ? `<span class="listing-item-price">${price}</span>` : ''}
          </div>
          <div class="listing-item-title">${escapeHtml(title)}</div>
          <div class="listing-item-meta">${listing.photos ? listing.photos.length : 0} foto${listing.data && listing.data.free_shipping ? ` &middot; ${t('preview_free_shipping')}` : (listing.data && listing.data.suggested_shipping && listing.data.suggested_shipping !== '0' ? ` &middot; ${t('preview_shipping')} &euro;${formatPrice(listing.data.suggested_shipping)}` : '')}</div>
          <div class="listing-item-actions">
            <button class="btn btn-secondary btn-card-action" data-view="${listing.id}">${t('btn_view')}</button>
            <button class="btn btn-primary btn-card-action" data-edit="${listing.id}">${t('btn_edit')}</button>
            ${listing.status === 'ready' && !listing.ebayItemId ? `<button class="btn btn-primary btn-card-action" data-publish="${listing.id}">${t('btn_publish')}</button>` : ''}
            <span class="clear-photos-slot"></span>
            <button class="btn btn-secondary btn-delete-icon" data-delete="${listing.id}" title="${t('delete_confirm_btn')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          </div>
        </div>
      `;
    }
    return card;
  }

  // Render in batches of 30 using requestAnimationFrame
  const BATCH_SIZE = 30;
  let batchIndex = 0;
  function renderBatch() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(batchIndex + BATCH_SIZE, filtered.length);
    for (let i = batchIndex; i < end; i++) {
      const card = createCard(filtered[i]);
      fragment.appendChild(card);
      thumbObserver.observe(card);
    }
    grid.appendChild(fragment);
    batchIndex = end;
    if (batchIndex < filtered.length) {
      requestAnimationFrame(renderBatch);
    }
  }
  renderBatch();

  // Event delegation on grid — single listener instead of one per button
  grid.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      e.stopPropagation();
      const listing = state.listings.find(l => l.id === viewBtn.dataset.view);
      if (!listing) return;
      if (listing.ebayItemId && listing.status === 'published') {
        api.openEbayPage('https://www.ebay.it/itm/' + listing.ebayItemId);
      } else {
        renderPreviewModal(listing);
      }
      return;
    }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      e.stopPropagation();
      state.editingListingId = editBtn.dataset.edit;
      renderMainView();
      return;
    }
    const publishBtn = e.target.closest('[data-publish]');
    if (publishBtn) {
      e.stopPropagation();
      const listing = state.listings.find(l => l.id === publishBtn.dataset.publish);
      if (listing) {
        publishBtn.disabled = true;
        publishBtn.textContent = t('publish_all_publishing');
        publishListingInline(listing).then(() => renderListingsView());
      }
      return;
    }
    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      e.stopPropagation();
      const listing = state.listings.find(l => l.id === deleteBtn.dataset.delete);
      if (listing) confirmDelete(listing);
    }
  });

  // Bulk selection logic
  const bulkBar = document.getElementById('bulk-bar');
  const bulkCount = document.getElementById('bulk-count');
  const bulkSelected = new Set();

  function updateBulkBar() {
    const count = bulkSelected.size;
    bulkBar.style.display = count > 0 ? 'flex' : 'none';
    bulkCount.textContent = `${count} ${count === 1 ? t('listings_selected_singular') : t('listings_selected')}`;
    // Show bulk publish only if there are ready unpublished listings selected
    const bulkPublishBtn = document.getElementById('bulk-publish-btn');
    if (bulkPublishBtn) {
      const readyCount = state.listings.filter(l => bulkSelected.has(String(l.id)) && l.status === 'ready' && !l.ebayItemId).length;
      bulkPublishBtn.style.display = readyCount > 0 ? '' : 'none';
      bulkPublishBtn.textContent = readyCount > 1 ? `${t('bulk_publish_ebay')} (${readyCount})` : t('bulk_publish_ebay');
    }
    // Show resync only if there are published listings selected
    const bulkResyncBtn = document.getElementById('bulk-resync-btn');
    if (bulkResyncBtn) {
      const publishedCount = state.listings.filter(l => bulkSelected.has(String(l.id)) && l.ebayItemId).length;
      bulkResyncBtn.style.display = publishedCount > 0 ? '' : 'none';
      bulkResyncBtn.textContent = publishedCount > 1 ? `${t('bulk_resync_ebay')} (${publishedCount})` : t('bulk_resync_ebay');
    }
  }

  grid.addEventListener('change', (e) => {
    if (!e.target.classList.contains('bulk-checkbox')) return;
    const id = e.target.dataset.bulkId;
    if (e.target.checked) bulkSelected.add(id);
    else bulkSelected.delete(id);
    updateBulkBar();
  });

  document.getElementById('bulk-select-all').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.checked = true;
      bulkSelected.add(cb.dataset.bulkId);
    });
    updateBulkBar();
  });

  document.getElementById('bulk-deselect').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    bulkSelected.clear();
    updateBulkBar();
  });

  document.getElementById('bulk-edit-btn').addEventListener('click', () => {
    const listings = state.listings.filter(l => bulkSelected.has(l.id));
    if (listings.length === 0) return;
    showBulkEditModal(listings);
  });

  document.getElementById('bulk-delete-btn').addEventListener('click', async () => {
    const ids = [...bulkSelected];
    if (ids.length === 0) return;
    if (!confirm(`${t('bulk_delete_confirm')} ${ids.length} ${tListings(ids.length)}?`)) return;
    for (const id of ids) {
      await api.deleteListingPhotos(id);
      await api.deleteListing(id);
    }
    state.listings = state.listings.filter(l => !bulkSelected.has(l.id));
    bulkSelected.clear();
    updateBulkBar();
    renderListingsView();
    showNotification(`${ids.length} ${tListings(ids.length)} ${t('bulk_deleted')}.`);
  });

  document.getElementById('bulk-publish-btn').addEventListener('click', async () => {
    const ready = state.listings.filter(l => bulkSelected.has(String(l.id)) && l.status === 'ready' && !l.ebayItemId);
    if (ready.length === 0) return;
    if (!confirm(`${t('bulk_publish_confirm')} ${ready.length} ${tListings(ready.length)}?`)) return;

    const btn = document.getElementById('bulk-publish-btn');
    btn.disabled = true;
    btn.textContent = t('publish_all_publishing');

    let published = 0, failed = 0;
    for (const listing of ready) {
      try {
        const result = await api.ebayPublish({
          photos: listing.photos,
          data: listing.data
        });
        if (result.success) {
          listing.ebayItemId = result.itemId;
          listing.status = 'published';
          await saveListing(listing);
          published++;
        } else {
          failed++;
        }
      } catch (e) {
        console.error('Bulk publish error:', e);
        failed++;
      }
      btn.textContent = `${t('publish_all_publishing')} ${published + failed}/${ready.length}`;
    }

    bulkSelected.clear();
    updateBulkBar();
    renderListingsView();
    showNotification(`${t('bulk_published')}: ${published}${failed ? `, ${t('bulk_failed')}: ${failed}` : ''}`);
  });

  document.getElementById('bulk-resync-btn').addEventListener('click', async () => {
    const selected = state.listings.filter(l => bulkSelected.has(String(l.id)) && l.ebayItemId);
    if (selected.length === 0) return;
    if (!confirm(`${t('bulk_resync_confirm')} ${selected.length} ${tListings(selected.length)}?`)) return;

    const btn = document.getElementById('bulk-resync-btn');
    btn.disabled = true;
    btn.textContent = t('bulk_resyncing');

    try {
      const ebayItemIds = selected.map(l => l.ebayItemId);
      const result = await api.ebayResyncItems(ebayItemIds);

      // Reload listings from store
      const savedListings = await api.getListings();
      state.listings = savedListings.map(listing => {
        if (listing.photos) {
          listing.photos = listing.photos.map(photo => {
            if (photo.relativePath) {
              photo.path = appPath + '/' + photo.relativePath.replace(/\\/g, '/');
              photo.path = photo.path.replace(/\//g, require('path').sep);
            }
            return photo;
          });
        }
        return listing;
      });

      bulkSelected.clear();
      updateBulkBar();
      renderListingsView();
      showNotification(`${t('bulk_resynced')}: ${result.updated}${result.failed ? `, ${t('bulk_failed')}: ${result.failed}` : ''}`);
    } catch (e) {
      showNotification(t('error_prefix') + e.message, 'error');
      btn.disabled = false;
      btn.textContent = t('bulk_resync_ebay');
    }
  });

  // Bulk mode toggle
  const bulkModeBtn = document.getElementById('bulk-mode-btn');
  if (bulkModeBtn) {
    bulkModeBtn.addEventListener('click', () => {
      grid.classList.toggle('bulk-mode');
      const active = grid.classList.contains('bulk-mode');
      bulkModeBtn.textContent = active ? t('btn_exit_bulk') : t('btn_bulk_edit');
      if (!active) {
        grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
        bulkSelected.clear();
        updateBulkBar();
      }
    });
  }
}

function showBulkEditModal(listings) {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal" style="max-width: 550px; max-height: 80vh; overflow-y: auto;">
      <h3>${t('bulk_edit_title')} (${listings.length})</h3>
      <p class="text-secondary text-small" style="margin-bottom: 16px;">${t('bulk_edit_desc')}</p>

      <div class="form-group">
        <label>${t('bulk_condition')}</label>
        <select id="bulk-condition">
          <option value="">${t('bulk_no_change')}</option>
          <option value="NEW">${t('edit_condition_new')}</option>
          <option value="USED_EXCELLENT">${t('edit_condition_excellent')}</option>
          <option value="USED_GOOD">${t('edit_condition_good')}</option>
          <option value="USED_ACCEPTABLE">${t('edit_condition_acceptable')}</option>
          <option value="FOR_PARTS">${t('edit_condition_parts')}</option>
        </select>
      </div>

      <div class="form-group">
        <label>${t('bulk_price_edit')}</label>
        <div class="flex-row" style="gap: 8px;">
          <select id="bulk-price-mode" style="width: auto;">
            <option value="">${t('bulk_no_change')}</option>
            <option value="set">${t('bulk_price_set')}</option>
            <option value="increase_pct">${t('bulk_price_increase_pct')}</option>
            <option value="decrease_pct">${t('bulk_price_decrease_pct')}</option>
            <option value="increase_abs">${t('bulk_price_increase_abs')}</option>
            <option value="decrease_abs">${t('bulk_price_decrease_abs')}</option>
          </select>
          <input type="number" step="0.01" id="bulk-price-value" placeholder="${t('bulk_value')}" style="width: 120px;">
        </div>
      </div>

      <h4 style="margin-top: 16px;">${t('bulk_shipping')}</h4>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="bulk-free-shipping-toggle" style="width: auto;">
          ${t('bulk_change_free_shipping')}
        </label>
        <div id="bulk-free-shipping-row" style="display: none; margin-top: 8px;">
          <select id="bulk-free-shipping">
            <option value="true">${t('bulk_free_yes')}</option>
            <option value="false">${t('bulk_free_no')}</option>
          </select>
        </div>
      </div>
      <div class="flex-row" style="gap: 8px;">
        <div class="form-group flex-1">
          <label>${t('ebay_shipping_cost')}</label>
          <input type="number" step="0.01" id="bulk-shipping-cost" placeholder="${t('bulk_no_change_placeholder')}">
        </div>
        <div class="form-group flex-1">
          <label>${t('ebay_shipping_service')}</label>
          <input type="text" id="bulk-shipping-service" placeholder="${t('bulk_no_change_placeholder')}">
        </div>
      </div>
      <div class="form-group">
        <label>${t('ebay_shipping_type')}</label>
        <select id="bulk-shipping-type">
          <option value="">${t('bulk_no_change')}</option>
          <option value="Flat">${t('ebay_shipping_flat')}</option>
          <option value="FreeShipping">${t('ebay_shipping_free')}</option>
          <option value="Calculated">${t('ebay_shipping_calculated')}</option>
        </select>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 20px;">
        <button class="btn btn-primary" id="bulk-apply">${t('bulk_apply')} (${listings.length})</button>
        <button class="btn btn-secondary" id="bulk-cancel">${t('bulk_cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('bulk-free-shipping-toggle').addEventListener('change', (e) => {
    document.getElementById('bulk-free-shipping-row').style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('bulk-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('bulk-apply').addEventListener('click', async () => {
    const condition = document.getElementById('bulk-condition').value;
    const priceMode = document.getElementById('bulk-price-mode').value;
    const priceValue = parseFloat(document.getElementById('bulk-price-value').value);
    const freeShippingToggle = document.getElementById('bulk-free-shipping-toggle').checked;
    const freeShipping = document.getElementById('bulk-free-shipping').value === 'true';
    const shippingCost = document.getElementById('bulk-shipping-cost').value.trim();
    const shippingService = document.getElementById('bulk-shipping-service').value.trim();
    const shippingType = document.getElementById('bulk-shipping-type').value;

    let changed = 0;
    for (const listing of listings) {
      if (!listing.data) continue;
      let modified = false;

      if (condition) {
        listing.data.condition = condition;
        modified = true;
      }

      if (priceMode && !isNaN(priceValue)) {
        const current = parseFloat(listing.data.suggested_price || 0);
        switch (priceMode) {
          case 'set': listing.data.suggested_price = priceValue.toFixed(2); break;
          case 'increase_pct': listing.data.suggested_price = (current * (1 + priceValue / 100)).toFixed(2); break;
          case 'decrease_pct': listing.data.suggested_price = (current * (1 - priceValue / 100)).toFixed(2); break;
          case 'increase_abs': listing.data.suggested_price = (current + priceValue).toFixed(2); break;
          case 'decrease_abs': listing.data.suggested_price = Math.max(0, current - priceValue).toFixed(2); break;
        }
        modified = true;
      }

      if (freeShippingToggle) {
        listing.data.free_shipping = freeShipping;
        if (freeShipping) listing.data.shipping_type = 'FreeShipping';
        modified = true;
      }

      if (shippingCost) { listing.data.suggested_shipping = shippingCost; modified = true; }
      if (shippingService) { listing.data.shipping_service = shippingService; modified = true; }
      if (shippingType) { listing.data.shipping_type = shippingType; modified = true; }

      if (modified) {
        await saveListing(listing);
        changed++;
      }
    }

    overlay.remove();
    showNotification(`${changed} ${tListings(changed)} ${t('bulk_modified')}.`);
    renderMainView();
  });
}

// ============ NEW LISTING (BATCH) ============

function renderNewListing() {
  const content = document.getElementById('mode-content');
  const articles = []; // Each: { id, photos[], draft }
  // Initial shell — rendered once
  content.innerHTML = `
    <div class="listing-card">
      <h3>${t('new_listing_title')}</h3>
      <p class="text-secondary" style="margin-bottom: 16px;">${t('new_listing_desc')}</p>
      <div id="batch-articles"></div>
    </div>
    <div class="flex-row" style="margin-top: 16px; gap: 8px;">
      <button class="btn btn-primary" id="batch-generate-btn" disabled>
        ${t('new_generate')}
      </button>
      <button class="btn btn-secondary" id="batch-import-btn" disabled>
        ${t('new_import_json')}
      </button>
      <button class="btn btn-secondary" id="batch-manual-btn" disabled>
        ${t('new_create_manual')}
      </button>
    </div>
  `;

  document.getElementById('batch-generate-btn').addEventListener('click', () => batchGenerate());
  document.getElementById('batch-import-btn').addEventListener('click', () => batchImport());
  document.getElementById('batch-manual-btn').addEventListener('click', () => batchManual());

  function updateButtons() {
    const genBtn = document.getElementById('batch-generate-btn');
    const impBtn = document.getElementById('batch-import-btn');
    const manBtn = document.getElementById('batch-manual-btn');
    const withPhotos = articles.filter(a => a.photos.length > 0).length;
    if (genBtn) {
      genBtn.disabled = withPhotos === 0;
      genBtn.textContent = withPhotos > 1
        ? `${t('new_generate')} (${withPhotos})`
        : t('new_generate');
    }
    if (impBtn) impBtn.disabled = withPhotos === 0;
    if (manBtn) manBtn.disabled = withPhotos === 0;
  }

  function appendArticleCard() {
    const id = String(Date.now()) + '-' + articles.length;
    const draft = {
      id,
      photos: [],
      data: null,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ebayItemId: null
    };
    const article = { id, photos: [], draft };
    articles.push(article);
    const idx = articles.length - 1;

    const card = document.createElement('div');
    card.className = 'batch-article-card';
    card.dataset.articleIdx = idx;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong>${t('new_article')} ${idx + 1}</strong>
        <button class="btn btn-secondary batch-remove-btn" style="padding: 2px 8px; font-size: 12px;">${t('new_remove')}</button>
      </div>
      <div class="drop-zone batch-drop-zone">
        <p>${t('new_drop_photos')}</p>
        <p class="text-secondary text-small" style="margin-top: 4px;">${t('new_or_browse')}</p>
        <div class="drop-zone-photos"></div>
      </div>
    `;

    const container = document.getElementById('batch-articles');
    container.appendChild(card);

    const dropZone = card.querySelector('.batch-drop-zone');
    const photosContainer = card.querySelector('.drop-zone-photos');

    // Click to browse
    dropZone.addEventListener('click', async (e) => {
      if (e.target.closest('.drop-zone-photo-remove')) return;
      const result = await api.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
      });
      if (!result.canceled && result.filePaths.length) {
        const newPhotos = [];
        for (const fp of result.filePaths) {
          newPhotos.push(await api.copyPhoto(fp, article.id));
        }
        article.photos.push(...newPhotos);
        article.draft.photos = article.photos;
        saveBatchDraft(article);
        appendPhotoThumbs(photosContainer, article, newPhotos);
        ensureEmptyArticle();
      }
    });

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      const newPhotos = [];
      // Support drag from built-in explorer (path string)
      const explorerData = e.dataTransfer.getData('application/x-explorer-paths');
      if (explorerData) {
        const paths = JSON.parse(explorerData);
        for (const p of paths) {
          newPhotos.push(await api.copyPhoto(p, article.id));
        }
      } else {
        // Support drag from OS file explorer
        const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
        const files = Array.from(e.dataTransfer.files).filter(f =>
          f.type.startsWith('image/') || imageExts.some(ext => f.name.toLowerCase().endsWith(ext))
        );
        for (const file of files) {
          newPhotos.push(await api.copyPhoto(webUtils.getPathForFile(file), article.id));
        }
      }
      if (newPhotos.length === 0) return;
      article.photos.push(...newPhotos);
      article.draft.photos = article.photos;
      saveBatchDraft(article);
      appendPhotoThumbs(photosContainer, article, newPhotos);
      ensureEmptyArticle();
    });

    // Remove button
    card.querySelector('.batch-remove-btn').addEventListener('click', async () => {
      await api.deleteListingPhotos(article.id);
      await api.deleteListing(article.id);
      articles.splice(articles.indexOf(article), 1);
      card.remove();
      // Re-number remaining cards
      document.querySelectorAll('.batch-article-card').forEach((c, i) => {
        c.querySelector('strong').textContent = `${t('new_article')} ${i + 1}`;
      });
      ensureEmptyArticle();
      updateButtons();
    });

    updateButtons();
  }

  function ensureEmptyArticle() {
    const last = articles[articles.length - 1];
    if (!last || last.photos.length > 0) {
      appendArticleCard();
    }
  }

  function appendPhotoThumbs(container, article, newPhotos) {
    for (const photo of newPhotos) {
      const item = document.createElement('div');
      item.className = 'batch-photo-item';
      const fileName = photo.name || photo.path.split(/[/\\]/).pop();
      item.innerHTML = `
        <span class="batch-photo-name" title="${photo.path}">📷 ${escapeHtml(fileName)}</span>
        <button class="batch-photo-remove">&times;</button>
      `;
      item.querySelector('.batch-photo-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await api.deletePhoto(photo.path);
        article.photos = article.photos.filter(p => p.path !== photo.path);
        article.draft.photos = article.photos;
        item.remove();
        saveBatchDraft(article);
      });
      container.appendChild(item);
    }
  }

  async function saveBatchDraft(article) {
    await saveListing(article.draft);
  }

  async function batchGenerate() {
    const validArticles = articles.filter(a => a.photos.length > 0);
    if (validArticles.length === 0) {
      showNotification(t('generate_add_photos'), 'error');
      return;
    }

    const prompt = buildBatchListingPrompt(validArticles);
    await api.writePromptFile(prompt);
    await api.deleteResponseFile();

    // Clear Claude context and send prompt
    api.sendToTerminal('/clear\r');
    await new Promise(r => setTimeout(r, 1000));
    const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
    const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
    api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

    for (const a of validArticles) {
      a.draft.status = 'waiting_import';
      await saveBatchDraft(a);
    }

    showNotification(`${t('generate_prompt_sent')} (${validArticles.length}). ${t('new_import_json')}...`);
  }

  async function batchImport() {
    const content = await api.readResponseFile();
    if (!content) {
      showNotification(t('import_not_found'), 'error');
      return;
    }

    let results;
    try {
      let cleaned = content.replace(/^\uFEFF/, '').trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const start = cleaned.indexOf('[') !== -1 && cleaned.indexOf('[') < cleaned.indexOf('{') ? cleaned.indexOf('[') : cleaned.indexOf('{');
      const parsed = JSON.parse(cleaned.substring(start));
      results = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      try {
        const parsed = parseResponseFile(content);
        results = parsed ? [parsed] : null;
      } catch { results = null; }
    }

    if (!results || results.length === 0) {
      showNotification(t('import_invalid_json'), 'error');
      return;
    }

    const validArticles = articles.filter(a => a.photos.length > 0);
    const total = Math.min(results.length, validArticles.length);
    const s = state.settings || {};
    const shippingDefaults = getShippingDefaults();

    // Show progress modal
    const overlay = document.createElement('div');
    overlay.className = 'sync-modal-overlay';
    overlay.innerHTML = `
      <div class="sync-modal" style="max-width: 400px;">
        <h3>${t('import_title')}</h3>
        <p id="import-progress-text">Listing 0 / ${total}</p>
        <div style="background: var(--bg-tertiary); border-radius: 8px; height: 12px; overflow: hidden; margin-top: 12px;">
          <div id="import-progress-bar" style="height: 100%; width: 0%; background: var(--accent); transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const progressText = document.getElementById('import-progress-text');
    const progressBar = document.getElementById('import-progress-bar');

    let imported = 0;
    for (let i = 0; i < total; i++) {
      const article = validArticles[i];
      const data = results[i];
      if (!data || !data.title) continue;

      article.draft.data = data;
      article.draft.status = 'ready';

      // Apply shipping defaults
      if (!data.suggested_shipping) data.suggested_shipping = s.defaultShippingCost || shippingDefaults.cost;
      if (!data.shipping_service) data.shipping_service = s.defaultShippingService || shippingDefaults.service;
      if (!data.shipping_type) data.shipping_type = s.defaultShippingType || shippingDefaults.type;
      data.free_shipping = (data.shipping_type || s.defaultShippingType || shippingDefaults.type) === 'FreeShipping';

      // Fetch category specifics
      if (data.category_id) {
        try {
          const specifics = await api.getCategorySpecifics(data.category_id);
          article.draft.categorySpecifics = specifics;
          if (!data.item_specifics) data.item_specifics = {};
          for (const spec of specifics) {
            if (!data.item_specifics[spec.name]) data.item_specifics[spec.name] = '';
          }
        } catch (e) {
          console.error('Failed to fetch category specifics:', e);
        }
      }

      await saveBatchDraft(article);
      imported++;
      progressText.textContent = `Listing ${imported} / ${total}`;
      progressBar.style.width = `${Math.round((imported / total) * 100)}%`;
    }

    // Delete original source photos
    progressText.textContent = t('import_cleaning');
    for (const article of validArticles) {
      for (const photo of article.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
    }

    overlay.remove();
    await api.deleteResponseFile();
    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(`${imported} ${tListings(imported)} ${t('notif_imported')}!`);

    // Go to listings view
    state.editingListingId = null;
    state.mode = 'listings';
    renderMainView();
  }

  async function batchManual() {
    const validArticles = articles.filter(a => a.photos.length > 0);
    if (validArticles.length === 0) {
      showNotification(t('generate_add_photos'), 'error');
      return;
    }

    const s = state.settings || {};
    const shippingDefaults = getShippingDefaults();

    for (const article of validArticles) {
      article.draft.data = {
        title: '',
        description: '',
        category_id: '',
        item_specifics: {},
        condition: 'USED_GOOD',
        condition_description: '',
        suggested_price: '',
        suggested_shipping: s.defaultShippingCost || shippingDefaults.cost,
        shipping_service: s.defaultShippingService || shippingDefaults.service,
        shipping_type: s.defaultShippingType || shippingDefaults.type,
        free_shipping: (s.defaultShippingType || shippingDefaults.type) === 'FreeShipping'
      };
      article.draft.status = 'ready';
      await saveBatchDraft(article);
    }

    // Delete original source photos
    for (const article of validArticles) {
      for (const photo of article.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
    }

    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(`${validArticles.length} ${tListings(validArticles.length)} ${t('notif_created_manual')}.`);

    state.editingListingId = null;
    state.mode = 'listings';
    renderMainView();
  }

  // Start with one article
  appendArticleCard();
}

function buildBatchListingPrompt(articles) {
  const singleArticlePrompt = (photoPaths, index, total) => {
    const photoList = photoPaths.map((p, i) => `  ${i + 1}. ${p}`).join('\n');
    return `\n--- ARTICLE ${index + 1} of ${total} ---\nPhotos:\n${photoList}`;
  };

  const articleSections = articles.map((a, i) =>
    singleArticlePrompt(a.photos.map(p => p.path), i, articles.length)
  ).join('\n');

  const listingLang = getLanguageName(state.ebayListingLanguage) || 'Italian';
  return `Analyze the following product photos and create ${articles.length > 1 ? articles.length + ' complete eBay.it listings' : 'a complete eBay.it listing'} in ${listingLang}.
${articles.length > 1 ? '\nEach article has its own set of photos. Generate a SEPARATE listing for each article.\n' : ''}
${articleSections}

CATEGORY LIST (pick the most appropriate CategoryID from this list):
${categoriesCsv}

DESCRIPTION STYLE GUIDE - Follow this structure EXACTLY:
1. Opening paragraph: A narrative sentence describing the product with an engaging, collector-like tone.

2. Bullet list with bold labels for key specs. Use this exact HTML pattern:
   <ul>
     <li><p><b>Brand/Modello:</b> ...</p></li>
     <li><p><b>Design:</b> ...</p></li>
     <li><p><b>Condizioni:</b> ...</p></li>
   </ul>
   Adapt the labels to the product.

3. Closing: A final narrative paragraph with condition notes, followed by "Per maggiori informazioni contattatemi."

IMPORTANT - RESEARCH ONLINE:
Before generating each listing, search the web to:
1. Identify the EXACT specific product (brand, model, year, variant, edition, issue number, serial) based on what you see in the photos
2. Search for the SPECIFIC item's current market value — NOT the generic product line. For example: search for the exact comic book issue number of that specific edition, the exact model variant of that device, the specific year/pressing of that vinyl record. Different editions, issues, or variants of the same product can have wildly different values.
3. Gather detailed technical specifications to enrich the description and item_specifics
4. Check the product's original retail price for reference
Use the WebSearch and WebFetch tools to do this research.

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no explanation).
${articles.length > 1 ? 'Respond with a JSON ARRAY of objects, one per article, in the same order as the articles above.' : 'Respond with a single JSON object.'}
Each object must have this exact format:
{
  "title": "eBay listing title in ${listingLang} (max 80 chars)",
  "description": "HTML description following the style guide above. Use <p>, <ul>, <li>, <b> tags. NO inline styles, NO data attributes.",
  "category_id": "CategoryID number from the CATEGORY LIST above - MUST be a valid ID",
  "category_path": "The full Category Path from the list above",
  "item_specifics": {
    "Marca": "Brand if visible",
    "Modello": "Model if visible",
    "Colore": "Color",
    "Materiale": "Material if identifiable"
  },
  "condition": "NEW|USED_EXCELLENT|USED_GOOD|USED_ACCEPTABLE|FOR_PARTS",
  "condition_description": "Brief condition notes in Italian",
  "suggested_price": "Suggested price in EUR as number (must end in .90 or .99)"
}

NOTE: Do NOT include shipping info — shipping cost, service and type are applied automatically from the seller's default settings.

IMPORTANT:
- The category_id MUST be a valid CategoryID from the CATEGORY LIST above
- The title MUST be in ${listingLang}, optimized for eBay search (include brand, model, key features)
- The description MUST follow the 3-part structure: narrative opening → bold-label bullet list → narrative closing
- Look carefully at ALL photos to identify the product
- Be specific about what you see - brand names, model numbers, sizes, colors`;
}

async function renderNewPhotos(container, photos) {
  if (!container) return;
  container.innerHTML = '';
  for (const photo of photos) {
    const base64 = await api.getPhotoBase64(photo.path);
    const wrapper = document.createElement('div');
    wrapper.className = 'drop-zone-photo-wrapper';
    wrapper.innerHTML = `
      <img src="${base64}" class="drop-zone-photo" title="${photo.name}">
      <button class="drop-zone-photo-remove">&times;</button>
    `;
    wrapper.querySelector('.drop-zone-photo-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      await api.deletePhoto(photo.path);
      const idx = photos.indexOf(photo);
      if (idx >= 0) photos.splice(idx, 1);
      wrapper.remove();
      const btn = document.getElementById('create-listing-btn');
      if (btn) btn.disabled = photos.length === 0;
    });
    container.appendChild(wrapper);
  }
}

// ============ EDIT LISTING ============

async function renderEditListing(listingId) {
  const container = document.getElementById('ui-container');
  const listing = state.listings.find(l => l.id === listingId || l.id === Number(listingId));

  if (!listing) {
    state.editingListingId = null;
    renderMainView();
    return;
  }

  const isAuthenticated = await api.ebayCheckAuth();

  container.innerHTML = `
    <div class="tabs">
      <div class="tab" data-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab" data-mode="new">${t('tab_new_listing')}</div>
      <div class="tab" data-mode="settings" style="margin-left: auto;">${t('tab_settings')} ${isAuthenticated ? '\u2713' : ''}</div>
    </div>

    <button class="btn btn-secondary" id="back-btn" style="margin-bottom: 16px;">&larr; ${t('back_to_listings')}</button>

    <div class="listing-card">
      <h3>${t('edit_photos')}</h3>
      <div class="drop-zone" id="edit-drop-zone">
        <p>${t('new_drop_photos')}</p>
        <p class="text-secondary text-small" style="margin-top: 8px;">${t('new_or_browse')}</p>
        <div class="drop-zone-photos" id="edit-photos"></div>
      </div>
    </div>

    <div class="flex-row" style="margin-bottom: 16px; gap: 8px;">
      <button class="btn btn-primary" id="generate-btn" ${listing.photos.length === 0 ? 'disabled' : ''}>
        ${t('new_generate')}
      </button>
      <button class="btn btn-secondary" id="import-json-btn">
        ${t('new_import_json')}
      </button>
    </div>

    <div id="listing-form-container"></div>
  `;

  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      if (mode === 'settings') {
        state.editingListingId = null;
        renderSetupWizard();
        return;
      }
      state.mode = mode;
      state.editingListingId = null;
      renderMainView();
    });
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    state.editingListingId = null;
    state.mode = 'listings';
    renderMainView();
  });

  // Setup drop zone for editing
  setupEditDropZone(listing);

  document.getElementById('generate-btn').addEventListener('click', () => generateListing(listing));
  document.getElementById('import-json-btn').addEventListener('click', () => importResponseJson(listing));

  if (listing.data) {
    renderListingForm(listing, 'listing-form-container');
  }
}

async function setupEditDropZone(listing) {
  const dropZone = document.getElementById('edit-drop-zone');
  const photosContainer = document.getElementById('edit-photos');
  if (!dropZone) return;

  await renderEditPhotos(photosContainer, listing);

  dropZone.addEventListener('click', async (e) => {
    if (e.target.closest('.drop-zone-photo-remove')) return;
    const result = await api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
    });
    if (!result.canceled && result.filePaths.length) {
      for (const fp of result.filePaths) {
        const copied = await api.copyPhoto(fp, listing.id);
        listing.photos.push(copied);
      }
      await saveListing(listing);
      await renderEditPhotos(photosContainer, listing);
      const genBtn = document.getElementById('generate-btn');
      if (genBtn) genBtn.disabled = listing.photos.length === 0;
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
    // Support drag from built-in explorer
    const explorerData = e.dataTransfer.getData('application/x-explorer-paths');
    if (explorerData) {
      const paths = JSON.parse(explorerData);
      for (const p of paths) {
        const copied = await api.copyPhoto(p, listing.id);
        listing.photos.push(copied);
      }
    } else {
      const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
      const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('image/') || imageExts.some(ext => f.name.toLowerCase().endsWith(ext))
      );
      for (const file of files) {
        const copied = await api.copyPhoto(webUtils.getPathForFile(file), listing.id);
        listing.photos.push(copied);
      }
    }
    await saveListing(listing);
    await renderEditPhotos(photosContainer, listing);
    const genBtn = document.getElementById('generate-btn');
    if (genBtn) genBtn.disabled = listing.photos.length === 0;
  });
}

async function renderEditPhotos(container, listing, saveFn) {
  if (!saveFn) saveFn = saveListing;
  if (!container) return;
  container.innerHTML = '';

  let dragSrcIndex = null;

  for (let i = 0; i < listing.photos.length; i++) {
    const photo = listing.photos[i];
    let src;
    if (photo.isRemote && photo.url) {
      src = photo.url;
    } else if (photo.path) {
      try {
        src = await api.getPhotoBase64(photo.path);
      } catch {
        continue;
      }
    } else {
      continue;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'drop-zone-photo-wrapper';
    wrapper.draggable = true;
    wrapper.dataset.photoIndex = i;
    wrapper.innerHTML = `
      <img src="${src}" class="drop-zone-photo" title="${photo.name}">
      <div class="photo-overlay-actions">
        <button class="photo-action-btn photo-rotate-btn" title="Ruota 90°"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M3.5 12a9 9 0 0 1 15-6.7L21.5 8"/><path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 6.7-3"/></svg></button>
        <button class="photo-action-btn photo-remove-btn" title="${t('new_remove')}">&times;</button>
      </div>
      ${i === 0 ? '<span class="photo-main-badge">1</span>' : `<span class="photo-index-badge">${i + 1}</span>`}
    `;

    // Drag events for reordering
    wrapper.addEventListener('dragstart', (e) => {
      dragSrcIndex = parseInt(wrapper.dataset.photoIndex);
      wrapper.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    wrapper.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
      container.querySelectorAll('.drop-zone-photo-wrapper').forEach(el => el.classList.remove('drag-over'));
    });
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      wrapper.classList.add('drag-over');
    });
    wrapper.addEventListener('dragleave', () => {
      wrapper.classList.remove('drag-over');
    });
    wrapper.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.remove('drag-over');
      const dropIndex = parseInt(wrapper.dataset.photoIndex);
      if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;
      const [moved] = listing.photos.splice(dragSrcIndex, 1);
      listing.photos.splice(dropIndex, 0, moved);
      await saveFn(listing);
      await renderEditPhotos(container, listing, saveFn);
    });

    // Rotate button
    wrapper.querySelector('.photo-rotate-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (photo.isRemote) {
        showNotification(t('notif_cant_rotate_remote'), 'error');
        return;
      }
      const img = wrapper.querySelector('.drop-zone-photo');
      img.style.opacity = '0.5';
      await api.rotatePhoto(photo.path, 90);
      await saveFn(listing);
      await renderEditPhotos(container, listing, saveFn);
    });

    // Remove button
    wrapper.querySelector('.photo-remove-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!photo.isRemote && photo.path) {
        await api.deletePhoto(photo.path);
      }
      listing.photos = listing.photos.filter(p => p !== photo);
      await saveFn(listing);
      wrapper.remove();
      const genBtn = document.getElementById('generate-btn');
      if (genBtn) genBtn.disabled = listing.photos.length === 0;
      await renderEditPhotos(container, listing, saveFn);
    });

    container.appendChild(wrapper);
  }
}

// ============ PROMPT BUILDER ============

function buildListingPrompt(photoPaths) {
  const photoList = photoPaths.map((p, i) => `  ${i + 1}. ${p}`).join('\n');
  const listingLang = getLanguageName(state.ebayListingLanguage) || 'Italian';

  return `Analyze the following product photos and create a complete eBay.it listing in ${listingLang}.

Photos to analyze:
${photoList}

CATEGORY LIST (pick the most appropriate CategoryID from this list):
${categoriesCsv}

DESCRIPTION STYLE GUIDE - Follow this structure EXACTLY:
1. Opening paragraph: A narrative sentence describing the product with an engaging, collector-like tone. Example:
   "<p>Un classico affidabile di casa Huawei, il P10 Lite è ideale come primo smartphone o come telefono di riserva.</p>"
   "<p>Volume d'epoca appartenente alla storica collana "I Romanzi della Rosa", un classico della narrativa sentimentale.</p>"

2. Bullet list with bold labels for key specs. Use this exact HTML pattern:
   <ul>
     <li><p><b>Brand/Modello:</b> ...</p></li>
     <li><p><b>Design:</b> ...</p></li>
     <li><p><b>Condizioni:</b> ...</p></li>
   </ul>
   Adapt the labels to the product (Autore/Titolo/Editore for books, Tipologia/Brand/Connettività for electronics, etc.)

3. Closing: A final narrative paragraph with condition notes or special observations about the item, followed by "Per maggiori informazioni contattatemi."

REAL EXAMPLES from the seller's account:
- Smartphone: Opening narrative → bullet list (Tipologia, Brand/Modello, Design, Connettività, Accessori Inclusi, Condizioni) → closing note about defects
- Vintage book: Opening narrative → bullet list (Autore, Titolo, Editore, Collana, Genere, Condizioni with detail about pages/cover) → closing invitation
- Electronics: Opening narrative about history/significance → nested bullet list (Brand, Modello, Tecnologia, Connettività, Design) → technical note → closing

IMPORTANT - RESEARCH ONLINE:
Before generating the listing, search the web to:
1. Identify the EXACT specific product (brand, model, year, variant, edition, issue number, serial) based on what you see in the photos
2. Search for the SPECIFIC item's current market value — NOT the generic product line. For example: search for the exact comic book issue number of that specific edition, the exact model variant of that device, the specific year/pressing of that vinyl record. Different editions, issues, or variants of the same product can have wildly different values.
3. Gather detailed technical specifications (dimensions, weight, materials, features) to enrich the description and item_specifics
4. Check the product's original retail price for reference
Use the WebSearch and WebFetch tools to do this research. The more accurate the product identification and pricing, the better.

You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, no explanation) in this exact format:
{
  "title": "eBay listing title in ${listingLang} (max 80 chars)",
  "description": "HTML description following the style guide above. Use <p>, <ul>, <li>, <b> tags. NO inline styles, NO data attributes. Keep it clean.",
  "category_id": "CategoryID number from the CATEGORY LIST above - MUST be a valid ID",
  "category_path": "The full Category Path from the list above",
  "item_specifics": {
    "Marca": "Brand if visible",
    "Modello": "Model if visible",
    "Colore": "Color",
    "Materiale": "Material if identifiable"
  },
  "condition": "NEW|USED_EXCELLENT|USED_GOOD|USED_ACCEPTABLE|FOR_PARTS",
  "condition_description": "Brief condition notes in Italian",
  "suggested_price": "Suggested price in EUR as number (must end in .90 or .99)",
  "suggested_shipping": "5.49"
}

IMPORTANT:
- The category_id MUST be a valid CategoryID from the CATEGORY LIST above
- The title MUST be in ${listingLang}, optimized for eBay search (include brand, model, key features)
- The description MUST follow the 3-part structure: narrative opening → bold-label bullet list → narrative closing
- Look carefully at ALL photos to identify the product
- Be specific about what you see - brand names, model numbers, sizes, colors
- Respond with ONLY the JSON, nothing else`;
}

// ============ GENERATE LISTING ============

async function generateListing(listing) {
  listing.status = 'generating';
  await saveListing(listing);

  const photoPaths = listing.photos.map(p => p.path);
  const prompt = buildListingPrompt(photoPaths);

  // Write prompt to .prompt.md
  await api.writePromptFile(prompt);
  await api.deleteResponseFile();

  // Clear Claude's context to avoid mixing with other projects, then send the prompt
  api.sendToTerminal('/clear\r');
  await new Promise(r => setTimeout(r, 1000));
  const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
  const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
  api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

  listing.status = 'waiting_import';
  await saveListing(listing);
  showNotification(t('generate_prompt_sent'));

  // Re-render to show the import button
  if (state.editingListingId) {
    renderEditListing(state.editingListingId);
  }
}

async function importResponseJson(listing) {
  const content = await api.readResponseFile();
  if (!content) {
    showNotification(t('import_not_found'), 'error');
    return;
  }

  const parsed = parseResponseFile(content);
  if (!parsed) {
    showNotification(t('import_invalid_json'), 'error');
    return;
  }

  listing.data = parsed;
  listing.status = 'ready';

  // Apply default shipping
  const s = state.settings || {};
  const shippingDefaults = getShippingDefaults();
  if (!listing.data.suggested_shipping) {
    listing.data.suggested_shipping = s.defaultShippingCost || shippingDefaults.cost;
  }
  if (!listing.data.shipping_service) {
    listing.data.shipping_service = s.defaultShippingService || shippingDefaults.service;
  }
  if (!listing.data.shipping_type) {
    listing.data.shipping_type = s.defaultShippingType || shippingDefaults.type;
  }
  const effectiveShippingType = listing.data.shipping_type || s.defaultShippingType || shippingDefaults.type;
  listing.data.free_shipping = effectiveShippingType === 'FreeShipping';

  // Auto-fetch category specifics
  if (parsed.category_id) {
    try {
      showNotification(t('edit_category_loading'));
      const specifics = await api.getCategorySpecifics(parsed.category_id);
      listing.categorySpecifics = specifics;

      if (!listing.data.item_specifics) listing.data.item_specifics = {};
      for (const spec of specifics) {
        if (!listing.data.item_specifics[spec.name]) {
          listing.data.item_specifics[spec.name] = '';
        }
      }
    } catch (e) {
      console.error('Failed to fetch category specifics:', e);
    }
  }

  await api.deleteResponseFile();
  await saveListing(listing);
  showNotification(t('notif_listing_saved'));

  if (state.editingListingId) {
    renderEditListing(state.editingListingId);
  }
}

function parseResponseFile(content) {
  try {
    // Strip BOM
    let cleaned = content.replace(/^\uFEFF/, '').trim();

    // Strip markdown code fences if present
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    cleaned = cleaned.trim();

    // Try direct parse
    try {
      const data = JSON.parse(cleaned);
      if (data.title && data.description) return data;
    } catch {}

    // Try to find JSON object in content
    const jsonMatch = cleaned.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.title && data.description) return data;
    }

    // Aggressive: first { to last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const data = JSON.parse(cleaned.substring(start, end + 1));
      if (data.title && data.description) return data;
    }
  } catch (e) {
    console.error('Failed to parse response file:', e);
  }
  return null;
}

// ============ LISTING FORM ============

function renderListingForm(listing, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !listing.data) return;

  // Apply shipping defaults if not set
  const s = state.settings || {};
  const shipDef = getShippingDefaults();
  if (!listing.data.shipping_service) listing.data.shipping_service = s.defaultShippingService || shipDef.service;
  if (!listing.data.suggested_shipping) listing.data.suggested_shipping = s.defaultShippingCost || shipDef.cost;
  if (!listing.data.shipping_type) listing.data.shipping_type = s.defaultShippingType || shipDef.type;
  if (listing.data.free_shipping === undefined) listing.data.free_shipping = listing.data.shipping_type === 'FreeShipping';

  const d = listing.data;

  container.innerHTML = `
    <div class="listing-card">
      <h3>${t('edit_details')}</h3>

      <div class="form-group">
        <label>${t('edit_title')}</label>
        <input type="text" maxlength="80" value="${escapeAttr(d.title)}" data-field="title">
        <span class="text-secondary text-small" id="title-count-${listing.id}">${(d.title || '').length}/80</span>
      </div>

      <div class="form-group">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <label style="margin-bottom: 0;">${t('edit_description')}</label>
          <button class="btn btn-secondary" id="toggle-desc-${listing.id}" style="padding: 4px 10px; font-size: 12px;">${t('edit_preview')}</button>
        </div>
        <textarea rows="8" data-field="description" id="desc-textarea-${listing.id}">${escapeHtml(d.description)}</textarea>
        <div class="desc-preview" id="desc-preview-${listing.id}" style="display:none;"></div>
      </div>

      <div class="form-group">
        <label>${t('edit_category')}</label>
        <div style="margin-bottom: 8px;">
          <span class="text-secondary text-small">${t('edit_category_selected')}: </span>
          <strong>${d.category_id ? `${escapeHtml(d.category_path || '')} (${d.category_id})` : t('edit_category_none')}</strong>
        </div>
        <div class="flex-row" style="align-items: center;">
          <input type="text" id="cat-search-${listing.id}" placeholder="${t('edit_category_search')}" style="flex:1;">
          <button class="btn btn-secondary" id="cat-search-btn-${listing.id}" style="padding: 10px 16px; white-space: nowrap;">${t('edit_category_change')}</button>
        </div>
        <div id="cat-results-${listing.id}" style="margin-top: 8px; max-height: 200px; overflow-y: auto;"></div>
      </div>

      <div class="form-group">
        <label>${t('edit_condition')}</label>
        <select data-field="condition">
          <option value="NEW" ${d.condition === 'NEW' ? 'selected' : ''}>${t('edit_condition_new')}</option>
          <option value="USED_EXCELLENT" ${d.condition === 'USED_EXCELLENT' ? 'selected' : ''}>${t('edit_condition_excellent')}</option>
          <option value="USED_GOOD" ${d.condition === 'USED_GOOD' ? 'selected' : ''}>${t('edit_condition_good')}</option>
          <option value="USED_ACCEPTABLE" ${d.condition === 'USED_ACCEPTABLE' ? 'selected' : ''}>${t('edit_condition_acceptable')}</option>
          <option value="FOR_PARTS" ${d.condition === 'FOR_PARTS' ? 'selected' : ''}>${t('edit_condition_parts')}</option>
        </select>
      </div>

      <div class="form-group">
        <label>${t('edit_condition_desc')}</label>
        <input type="text" value="${escapeAttr(d.condition_description || '')}" data-field="condition_description">
      </div>

      <div class="flex-row">
        <div class="form-group flex-1">
          <label>${t('edit_price')}</label>
          <input type="number" step="0.01" value="${d.suggested_price || ''}" data-field="suggested_price">
        </div>
        <div class="form-group flex-1">
          <label>${t('edit_quantity')}</label>
          <input type="number" min="1" value="${d.quantity || 1}" data-field="quantity">
        </div>
      </div>

      <h3 style="margin-top: 16px;">${t('bulk_shipping')}</h3>
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="free-shipping-${listing.id}" ${d.free_shipping ? 'checked' : ''} style="width: auto;">
          ${t('edit_free_shipping')}
        </label>
      </div>
      <div class="flex-row" id="shipping-details-${listing.id}" ${d.free_shipping ? 'style="display:none;"' : ''}>
        <div class="form-group flex-1">
          <label>${t('ebay_shipping_cost')}</label>
          <input type="number" step="0.01" value="${d.suggested_shipping || ''}" data-field="suggested_shipping">
        </div>
        <div class="form-group flex-1">
          <label>${t('ebay_shipping_service')}</label>
          <input type="text" value="${escapeAttr(d.shipping_service || '')}" data-field="shipping_service" placeholder="es. IT_Raccomandata1">
        </div>
      </div>
      <div class="form-group">
        <label>${t('ebay_shipping_type')}</label>
        <select data-field="shipping_type">
          <option value="Flat" ${(d.shipping_type || '') === 'Flat' ? 'selected' : ''}>${t('ebay_shipping_flat')}</option>
          <option value="FreeShipping" ${(d.shipping_type || '') === 'FreeShipping' ? 'selected' : ''}>${t('ebay_shipping_free')}</option>
          <option value="Calculated" ${(d.shipping_type || '') === 'Calculated' ? 'selected' : ''}>${t('ebay_shipping_calculated')}</option>
        </select>
      </div>

      <h3 style="margin-top: 16px;">${t('edit_shipping_profiles')}</h3>
      <div class="flex-row">
        <div class="form-group flex-1">
          <label>${t('edit_shipping_profile')}</label>
          <select id="shipping-profile-${listing.id}" data-field="shipping_profile_id">
            <option value="">${t('edit_profile_none')}</option>
          </select>
        </div>
        <div class="form-group flex-1">
          <label>${t('edit_return_profile')}</label>
          <select id="return-profile-${listing.id}" data-field="return_profile_id">
            <option value="">${t('edit_profile_none_short')}</option>
          </select>
        </div>
        <div class="form-group flex-1">
          <label>${t('edit_payment_profile')}</label>
          <select id="payment-profile-${listing.id}" data-field="payment_profile_id">
            <option value="">${t('edit_profile_none_short')}</option>
          </select>
        </div>
      </div>

      <h3 style="margin-top: 16px;">${t('edit_item_specifics')}</h3>
      <div id="item-specifics-${listing.id}"></div>
      <button class="btn btn-secondary" style="margin-top: 8px; font-size: 12px;" id="add-specific-${listing.id}">${t('edit_add_specific')}</button>

      <div class="flex-row" style="margin-top: 20px;">
        ${listing.ebayItemId ? `<button class="btn btn-primary" id="update-btn-${listing.id}">${t('edit_update')}</button>` : `<button class="btn btn-primary" id="publish-btn-${listing.id}">${t('edit_publish')}</button>`}
        <button class="btn btn-secondary" id="regenerate-btn-${listing.id}">${t('edit_regenerate')}</button>
      </div>

      <p id="publish-status-${listing.id}" class="text-secondary" style="margin-top: 8px; font-size: 13px;"></p>
    </div>
  `;

  // Load business profiles from eBay
  (async () => {
    try {
      const profiles = await api.getAllProfiles();
      const fillSelect = (selectId, items, currentValue) => {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        for (const p of items) {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.name}${p.isDefault ? ' (default)' : ''}`;
          if (p.id === currentValue || (!currentValue && p.isDefault)) opt.selected = true;
          sel.appendChild(opt);
        }
        // If a default was auto-selected, save it
        if (!currentValue && sel.value) {
          listing.data[sel.dataset.field] = sel.value;
          saveListing(listing);
        }
      };
      fillSelect(`shipping-profile-${listing.id}`, profiles.shipping, d.shipping_profile_id);
      fillSelect(`return-profile-${listing.id}`, profiles.returnPolicy, d.return_profile_id);
      fillSelect(`payment-profile-${listing.id}`, profiles.payment, d.payment_profile_id);
    } catch (e) {
      console.error('Failed to load profiles:', e);
    }
  })();

  // Item specifics - use eBay category metadata when available
  const specificsContainer = document.getElementById(`item-specifics-${listing.id}`);
  const catSpecifics = listing.categorySpecifics || [];
  const currentSpecifics = d.item_specifics || {};

  if (catSpecifics.length > 0) {
    // Render eBay-defined specifics with dropdowns
    const renderedNames = new Set();
    for (const spec of catSpecifics) {
      const currentValue = currentSpecifics[spec.name] || '';
      addSpecificRowWithOptions(specificsContainer, spec.name, currentValue, spec.values, spec.required, listing);
      renderedNames.add(spec.name);
    }
    // Also render any custom specifics from Claude that aren't in eBay's list
    for (const [key, value] of Object.entries(currentSpecifics)) {
      if (!renderedNames.has(key)) {
        addSpecificRow(specificsContainer, key, value, listing);
      }
    }
  } else {
    // Fallback: plain text rows
    Object.entries(currentSpecifics).forEach(([key, value]) => {
      addSpecificRow(specificsContainer, key, value, listing);
    });
  }

  document.getElementById(`add-specific-${listing.id}`).addEventListener('click', () => {
    addSpecificRow(specificsContainer, '', '', listing);
  });

  // Category search (local CSV)
  const catSearchBtn = document.getElementById(`cat-search-btn-${listing.id}`);
  const catSearchInput = document.getElementById(`cat-search-${listing.id}`);
  const catResultsDiv = document.getElementById(`cat-results-${listing.id}`);

  async function selectCategory(catId, catPath) {
    listing.data.category_id = catId;
    listing.data.category_path = catPath;
    catResultsDiv.innerHTML = `<p class="text-secondary text-small">${t('edit_category_loading')}</p>`;

    const specifics = await api.getCategorySpecifics(catId);
    listing.categorySpecifics = specifics;

    if (!listing.data.item_specifics) listing.data.item_specifics = {};
    for (const spec of specifics) {
      if (!listing.data.item_specifics[spec.name]) {
        listing.data.item_specifics[spec.name] = '';
      }
    }

    await saveListing(listing);

    // Re-render the entire form to reflect new category + specifics
    renderListingForm(listing, containerId);
    showNotification(`Categoria: ${catPath}`);
  }

  catSearchBtn.addEventListener('click', () => {
    const query = catSearchInput.value.trim().toLowerCase();
    if (!query) return;

    const lines = categoriesCsv.split('\n').slice(1); // skip header
    const results = [];
    const terms = query.split(/\s+/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const lower = line.toLowerCase();
      if (terms.every(t => lower.includes(t))) {
        const match = line.match(/^(\d+),\s*"?(.+?)"?\s*$/);
        if (match) results.push({ id: match[1], path: match[2] });
        if (results.length >= 15) break;
      }
    }

    if (results.length === 0) {
      catResultsDiv.innerHTML = `<p class="text-secondary text-small">${t('edit_category_no_results')}</p>`;
      return;
    }

    catResultsDiv.innerHTML = '';
    for (const cat of results) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary cat-result-btn';
      btn.style.cssText = 'display:block; width:100%; text-align:left; margin-bottom:4px; padding:8px 12px; font-size:13px;';
      btn.innerHTML = `<strong>${escapeHtml(cat.path)}</strong> <span class="text-secondary">(${cat.id})</span>`;
      btn.addEventListener('click', () => selectCategory(cat.id, cat.path));
      catResultsDiv.appendChild(btn);
    }
  });

  catSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') catSearchBtn.click();
  });

  // Title char counter
  const titleInput = container.querySelector('[data-field="title"]');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const countEl = document.getElementById(`title-count-${listing.id}`);
      if (countEl) countEl.textContent = `${titleInput.value.length}/80`;
    });
  }

  // Description HTML toggle
  const descToggle = document.getElementById(`toggle-desc-${listing.id}`);
  const descTextarea = document.getElementById(`desc-textarea-${listing.id}`);
  const descPreview = document.getElementById(`desc-preview-${listing.id}`);
  if (descToggle && descTextarea && descPreview) {
    let showingPreview = false;
    descToggle.addEventListener('click', () => {
      showingPreview = !showingPreview;
      if (showingPreview) {
        descPreview.innerHTML = descTextarea.value;
        descPreview.style.display = 'block';
        descTextarea.style.display = 'none';
        descToggle.textContent = t('edit_html_code');
      } else {
        descPreview.style.display = 'none';
        descTextarea.style.display = '';
        descToggle.textContent = t('edit_preview');
      }
    });
  }

  // Save on change
  container.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('change', async () => {
      const field = el.dataset.field;
      if (field) {
        listing.data[field] = el.value;
        await saveListing(listing);
      }
    });
  });

  // Free shipping toggle
  const freeShipCb = document.getElementById(`free-shipping-${listing.id}`);
  if (freeShipCb) {
    freeShipCb.addEventListener('change', async () => {
      listing.data.free_shipping = freeShipCb.checked;
      if (freeShipCb.checked) {
        listing.data.suggested_shipping = '0';
        listing.data.shipping_type = 'FreeShipping';
      }
      await saveListing(listing);
      const details = document.getElementById(`shipping-details-${listing.id}`);
      if (details) details.style.display = freeShipCb.checked ? 'none' : '';
    });
  }

  // Publish or Update button
  const publishBtn = document.getElementById(`publish-btn-${listing.id}`);
  if (publishBtn) {
    publishBtn.addEventListener('click', () => publishListing(listing));
  }
  const updateBtn = document.getElementById(`update-btn-${listing.id}`);
  if (updateBtn) {
    updateBtn.addEventListener('click', () => updateListing(listing));
  }

  // Regenerate button
  document.getElementById(`regenerate-btn-${listing.id}`).addEventListener('click', () => {
    listing.data = null;
    listing.status = 'pending';
    saveListing(listing);
    renderEditListing(listing.id);
    generateListing(listing);
  });
}

function addSpecificRow(container, key, value, listing) {
  const row = document.createElement('div');
  row.className = 'specific-row';
  row.innerHTML = `
    <input type="text" placeholder="Name" value="${escapeAttr(key)}" class="specific-key">
    <input type="text" placeholder="Value" value="${escapeAttr(value)}" class="specific-value">
    <button class="btn btn-secondary" style="padding: 4px 10px;">&times;</button>
  `;

  const updateSpecifics = async () => {
    listing.data.item_specifics = {};
    container.querySelectorAll('div').forEach(r => {
      const k = r.querySelector('.specific-key');
      const v = r.querySelector('.specific-value');
      if (k && k.value) listing.data.item_specifics[k.value] = v ? v.value : '';
    });
    await saveListing(listing);
  };

  row.querySelectorAll('input').forEach(i => i.addEventListener('change', updateSpecifics));
  row.querySelector('button').addEventListener('click', () => {
    row.remove();
    updateSpecifics();
  });

  container.appendChild(row);
}

function addSpecificRowWithOptions(container, name, currentValue, recommendedValues, required, listing) {
  const row = document.createElement('div');
  row.className = 'specific-row';

  const label = document.createElement('label');
  label.className = 'specific-label';
  label.textContent = name + (required ? ' *' : '');
  if (required) label.style.color = 'var(--accent)';
  label.style.minWidth = '140px';
  label.style.fontSize = '13px';
  label.style.fontWeight = '500';
  label.style.alignSelf = 'center';

  let input;
  if (recommendedValues && recommendedValues.length > 0) {
    // Combo: datalist for suggestions but allows free text
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'specific-value';
    input.value = currentValue;
    input.placeholder = required ? t('edit_required') : t('edit_optional');
    const listId = `dl-${name.replace(/[^a-zA-Z0-9]/g, '')}-${listing.id}`;
    input.setAttribute('list', listId);
    const datalist = document.createElement('datalist');
    datalist.id = listId;
    for (const v of recommendedValues) {
      const opt = document.createElement('option');
      opt.value = v;
      datalist.appendChild(opt);
    }
    row.appendChild(datalist);
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'specific-value';
    input.value = currentValue;
    input.placeholder = required ? t('edit_required') : t('edit_optional');
  }

  // Hidden key input for updateSpecifics compatibility
  const hiddenKey = document.createElement('input');
  hiddenKey.type = 'hidden';
  hiddenKey.className = 'specific-key';
  hiddenKey.value = name;

  row.appendChild(hiddenKey);
  row.appendChild(label);
  row.appendChild(input);

  const updateSpecifics = async () => {
    listing.data.item_specifics = {};
    container.querySelectorAll('.specific-row, div').forEach(r => {
      const k = r.querySelector('.specific-key');
      const v = r.querySelector('.specific-value');
      if (k && k.value) listing.data.item_specifics[k.value] = v ? v.value : '';
    });
    await saveListing(listing);
  };

  input.addEventListener('change', updateSpecifics);
  container.appendChild(row);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatPrice(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  return n.toFixed(2);
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function publishListingInline(listing) {
  try {
    const result = await api.ebayPublish({
      photos: listing.photos,
      data: listing.data
    });
    if (result.success) {
      listing.status = 'published';
      listing.ebayItemId = result.itemId;
      await saveListing(listing);
      showNotification(`${t('publish_success')} ${result.itemId}`, 'success');
    } else {
      showNotification(`${t('publish_failed')} ${result.error}`, 'error');
    }
  } catch (e) {
    showNotification(`${t('error_prefix')}${e.message}`, 'error');
  }
}

async function publishListing(listing) {
  const statusEl = document.getElementById(`publish-status-${listing.id}`);
  if (statusEl) statusEl.textContent = t('publish_uploading');

  try {
    const result = await api.ebayPublish({
      photos: listing.photos,
      data: listing.data
    });

    if (result.success) {
      listing.status = 'published';
      listing.ebayItemId = result.itemId;
      await saveListing(listing);
      showNotification(`${t('publish_success')} ${result.itemId}`, 'success');
    } else {
      showNotification(`${t('publish_failed')} ${result.error}`, 'error');
    }
  } catch (e) {
    showNotification(`${t('error_prefix')}${e.message}`, 'error');
  }

  if (state.editingListingId) {
    renderEditListing(state.editingListingId);
  }
}

async function updateListing(listing) {
  const statusEl = document.getElementById(`publish-status-${listing.id}`);
  if (statusEl) statusEl.textContent = t('update_updating');

  const updateBtn = document.getElementById(`update-btn-${listing.id}`);
  if (updateBtn) { updateBtn.disabled = true; updateBtn.textContent = t('update_updating'); }

  try {
    const result = await api.ebayRevise(listing.ebayItemId, {
      photos: listing.photos,
      data: listing.data
    });

    if (result.success) {
      listing.updatedAt = Date.now();
      listing.syncedAt = Date.now();
      await saveListing(listing);
      showNotification(`${t('update_success')} ${result.itemId}`, 'success');
    } else {
      showNotification(`${t('update_failed')} ${result.error}`, 'error');
    }
  } catch (e) {
    showNotification(`${t('error_prefix')}${e.message}`, 'error');
  }

  if (state.editingListingId) {
    renderEditListing(state.editingListingId);
  }
}

// ============ SYNC FROM EBAY ============

async function startSync(forceRefresh = false) {
  state.syncing = true;
  renderSyncModal(forceRefresh);

  api.onSyncProgress((progress) => {
    state.syncProgress = progress;
    updateSyncModal(progress);
  });

  try {
    const result = await api.syncListings(forceRefresh);
    // Reload listings from store
    const savedListings = await api.getListings();
    state.listings = savedListings.map(listing => {
      if (listing.photos) {
        listing.photos = listing.photos.map(photo => {
          if (photo.relativePath) {
            photo.path = appPath + '/' + photo.relativePath.replace(/\\/g, '/');
            photo.path = photo.path.replace(/\//g, require('path').sep);
          }
          return photo;
        });
      }
      return listing;
    });
    showNotification(`Sync complete! Added: ${result.added}, Updated: ${result.updated}${result.skipped ? `, Skipped: ${result.skipped}` : ''}${result.unlisted ? `, Unlisted: ${result.unlisted}` : ''}${result.failed ? `, Failed: ${result.failed}` : ''}`);
  } catch (e) {
    showNotification(`Sync error: ${e.message}`, 'error');
  }

  state.syncing = false;
  state.syncProgress = null;
  api.removeSyncProgressListener();
  closeSyncModal();
  renderMainView();
}

function renderSyncModal(forceRefresh = false) {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.id = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${forceRefresh ? t('sync_force_title') : t('sync_title')}</h3>
      <p id="sync-modal-status" class="text-secondary">${t('sync_fetching')}</p>
      <div class="sync-progress-bar-container">
        <div class="sync-progress-bar" id="sync-progress-bar"></div>
      </div>
      <p id="sync-modal-counter" class="text-secondary text-small">0 / 0</p>
      <p id="sync-modal-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
      <button class="btn btn-secondary" id="sync-cancel-btn" style="margin-top: 16px;">${t('sync_cancel')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('sync-cancel-btn').addEventListener('click', () => {
    api.removeSyncProgressListener();
    closeSyncModal();
    state.syncing = false;
  });
}

function updateSyncModal(progress) {
  const bar = document.getElementById('sync-progress-bar');
  const counter = document.getElementById('sync-modal-counter');
  const title = document.getElementById('sync-modal-title');
  const status = document.getElementById('sync-modal-status');
  if (!bar) return;

  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  bar.style.width = pct + '%';
  counter.textContent = `${progress.current} / ${progress.total}`;
  title.textContent = progress.currentTitle || '';

  if (progress.phase === 'fetching') {
    status.textContent = t('sync_fetching');
  } else if (progress.phase === 'syncing') {
    status.textContent = t('sync_importing');
  } else if (progress.phase === 'done') {
    status.textContent = t('sync_done');
  }
}

function closeSyncModal() {
  const overlay = document.getElementById('sync-modal-overlay');
  if (overlay) overlay.remove();
}

// ============ CONFIRM DELETE ============

function confirmDelete(listing) {
  const title = (listing.data && listing.data.title) ? listing.data.title : t('listings_no_title');
  const isPublished = listing.ebayItemId;

  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.id = 'confirm-delete-overlay';
  overlay.innerHTML = `
    <div class="confirm-modal">
      <h3>${t('delete_title')}</h3>
      <p>${t('delete_confirm')} "<strong>${escapeHtml(title)}</strong>"?</p>
      ${isPublished ? `<p style="color: var(--error-color); font-weight: 600;">${t('delete_ebay_warning')}</p>` : ''}
      <div class="confirm-actions">
        <button class="btn btn-secondary" id="confirm-cancel">${t('delete_cancel')}</button>
        <button class="btn btn-danger" id="confirm-delete">${t('delete_confirm_btn')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('confirm-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('confirm-delete').addEventListener('click', async () => {
    const deleteBtn = document.getElementById('confirm-delete');
    deleteBtn.disabled = true;
    deleteBtn.textContent = t('delete_deleting');

    try {
      if (isPublished) {
        const result = await api.ebayEndItem(listing.ebayItemId);
        if (result && !result.success) {
          showNotification(t('error_prefix') + (result.error || ''), 'error');
        }
      }
      if (!listing.photos || !listing.photos.every(p => p.isRemote)) {
        await api.deleteListingPhotos(listing.id);
      }
      await api.deleteListing(listing.id);
      state.listings = state.listings.filter(l => l.id !== listing.id);
      showNotification(t('delete_done'));
    } catch (e) {
      showNotification(t('error_prefix') + e.message, 'error');
    }

    overlay.remove();
    renderMainView();
  });
}

// ============ PREVIEW MODAL ============

function renderPreviewModal(listing) {
  const d = listing.data || {};
  const photos = listing.photos || [];
  const conditionLabels = {
    'NEW': t('edit_condition_new'),
    'USED_EXCELLENT': t('edit_condition_excellent'),
    'USED_GOOD': t('edit_condition_good'),
    'USED_ACCEPTABLE': t('edit_condition_acceptable'),
    'FOR_PARTS': t('edit_condition_parts')
  };

  const firstPhotoSrc = photos.length > 0 ? (photos[0].isRemote ? photos[0].url : '') : '';

  const specificsHtml = d.item_specifics ? Object.entries(d.item_specifics)
    .filter(([k, v]) => v)
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join('') : '';

  const shippingText = d.free_shipping ? t('preview_free_shipping')
    : (d.suggested_shipping ? `${t('preview_shipping')} \u20AC${formatPrice(d.suggested_shipping)}` : t('preview_no_shipping'));

  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.id = 'preview-modal-overlay';
  overlay.innerHTML = `
    <div class="preview-modal">
      <div class="preview-gallery">
        <img class="preview-main-img" id="preview-main-img" src="${firstPhotoSrc}" alt="">
        <div class="preview-thumbs" id="preview-thumbs">
          ${photos.map((p, i) => `<img src="${p.isRemote ? p.url : ''}" data-idx="${i}" class="${i === 0 ? 'active' : ''}">`).join('')}
        </div>
      </div>
      <div class="preview-section">
        <h2>${escapeHtml(d.title || t('listings_no_title'))}</h2>
        <div class="preview-price">\u20AC${formatPrice(d.suggested_price || '0')}</div>
        <span class="preview-condition">${conditionLabels[d.condition] || d.condition || ''}</span>
      </div>
      <div class="preview-description">${d.description || ''}</div>
      ${specificsHtml ? `
      <div class="preview-section">
        <h3 style="margin-bottom: 8px;">${t('preview_features')}</h3>
        <table class="preview-specifics-table">${specificsHtml}</table>
      </div>
      ` : ''}
      <div class="preview-shipping">${shippingText}</div>
      <div style="text-align: center; margin-top: 20px;">
        <button class="btn btn-secondary" id="preview-close">${t('preview_close')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Thumbnail click to swap main image
  overlay.querySelectorAll('.preview-thumbs img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const mainImg = document.getElementById('preview-main-img');
      if (mainImg) mainImg.src = thumb.src;
      overlay.querySelectorAll('.preview-thumbs img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // Load local photos if needed
  photos.forEach(async (p, i) => {
    if (!p.isRemote && p.path) {
      try {
        const base64 = await api.getPhotoBase64(p.path);
        const thumbImg = overlay.querySelector(`.preview-thumbs img[data-idx="${i}"]`);
        if (thumbImg) thumbImg.src = base64;
        if (i === 0) {
          const mainImg = document.getElementById('preview-main-img');
          if (mainImg) mainImg.src = base64;
        }
      } catch {}
    }
  });

  document.getElementById('preview-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============ UPDATE ALL ============

async function startUpdateAll() {
  const published = state.listings.filter(l => l.ebayItemId && l.status === 'published');
  if (published.length === 0) {
    showNotification(t('notif_no_published'), 'error');
    return;
  }

  const modified = published.filter(l => !l.syncedAt || (l.updatedAt && l.updatedAt > l.syncedAt));

  // Ask user what to update
  const choiceOverlay = document.createElement('div');
  choiceOverlay.className = 'sync-modal-overlay';
  choiceOverlay.innerHTML = `
    <div class="sync-modal" style="max-width: 420px;">
      <h3>${t('update_all_title')}</h3>
      <p class="text-secondary" style="margin-bottom: 16px;">${t('update_all_what')}</p>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn btn-primary" id="update-modified-btn" ${modified.length === 0 ? 'disabled' : ''}>
          ${t('update_all_modified')} (${modified.length})
        </button>
        <button class="btn btn-secondary" id="update-all-btn-confirm">
          ${t('update_all_all')} (${published.length})
        </button>
        <button class="btn btn-secondary" id="update-cancel-btn">${t('bulk_cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(choiceOverlay);

  const choice = await new Promise(resolve => {
    document.getElementById('update-modified-btn').addEventListener('click', () => resolve('modified'));
    document.getElementById('update-all-btn-confirm').addEventListener('click', () => resolve('all'));
    document.getElementById('update-cancel-btn').addEventListener('click', () => resolve(null));
    choiceOverlay.addEventListener('click', (e) => { if (e.target === choiceOverlay) resolve(null); });
  });
  choiceOverlay.remove();

  if (!choice) return;

  const filterIds = choice === 'modified' ? modified.map(l => l.id) : null;
  const targetCount = choice === 'modified' ? modified.length : published.length;

  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.id = 'update-all-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${t('update_all_title')}</h3>
      <p id="update-all-status" class="text-secondary">${t('update_all_updating')}</p>
      <div class="sync-progress-bar-container">
        <div class="sync-progress-bar" id="update-all-bar"></div>
      </div>
      <p id="update-all-counter" class="text-secondary text-small">0 / ${targetCount}</p>
      <p id="update-all-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
    </div>
  `;
  document.body.appendChild(overlay);

  api.onReviseAllProgress((progress) => {
    const bar = document.getElementById('update-all-bar');
    const counter = document.getElementById('update-all-counter');
    const title = document.getElementById('update-all-title');
    if (!bar) return;
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    bar.style.width = pct + '%';
    counter.textContent = `${progress.current} / ${progress.total}`;
    title.textContent = progress.currentTitle || '';
  });

  try {
    const result = await api.ebayReviseAll(filterIds);
    showNotification(`${t('update_all_done')} ${result.updated}${result.failed ? `, ${t('bulk_failed')}: ${result.failed}` : ''}`);
  } catch (e) {
    showNotification(t('error_prefix') + e.message, 'error');
  }

  api.removeReviseAllProgressListener();
  overlay.remove();
}

// ============ CLEAR ALL LOCAL PHOTOS ============

async function clearAllLocalPhotos() {
  const published = state.listings.filter(l => l.ebayItemId && l.status === 'published');
  // Check which ones actually have local photos
  const withPhotos = [];
  for (const listing of published) {
    const has = await api.hasLocalPhotos(listing.id);
    if (has) withPhotos.push(listing);
  }

  if (withPhotos.length === 0) {
    showNotification(t('clean_no_photos'), 'error');
    return;
  }

  if (!confirm(`${t('clean_confirm')} ${withPhotos.length} ${tListings(withPhotos.length)}?`)) return;

  for (const listing of withPhotos) {
    await api.deleteListingPhotos(listing.id);
    listing.photos = (listing.photos || []).filter(p => p.isRemote);
    await saveListing(listing);
  }

  showNotification(`${t('clean_done')} ${withPhotos.length} ${tListings(withPhotos.length)}.`);
  renderMainView();
}

// ============ PUBLISH ALL ============

async function startPublishAll() {
  const ready = state.listings.filter(l => l.status === 'ready' && !l.ebayItemId);
  if (ready.length === 0) {
    showNotification(t('publish_all_none'), 'error');
    return;
  }

  if (!confirm(`${t('bulk_publish_confirm')} ${ready.length} ${tListings(ready.length)}?`)) return;

  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.id = 'publish-all-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${t('publish_all_title')}</h3>
      <p id="publish-all-status" class="text-secondary">${t('publish_all_publishing')}</p>
      <div class="sync-progress-bar-container">
        <div class="sync-progress-bar" id="publish-all-bar"></div>
      </div>
      <p id="publish-all-counter" class="text-secondary text-small">0 / ${ready.length}</p>
      <p id="publish-all-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
    </div>
  `;
  document.body.appendChild(overlay);

  api.onPublishAllProgress((progress) => {
    const bar = document.getElementById('publish-all-bar');
    const counter = document.getElementById('publish-all-counter');
    const title = document.getElementById('publish-all-title');
    if (!bar) return;
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    bar.style.width = pct + '%';
    counter.textContent = `${progress.current} / ${progress.total}`;
    title.textContent = progress.currentTitle || '';
  });

  try {
    const result = await api.ebayPublishAll();
    // Refresh listings from store
    const allListings = await api.getListings();
    state.listings = allListings;
    showNotification(`${t('publish_all_done')} ${result.published}${result.failed ? `, ${t('bulk_failed')}: ${result.failed}` : ''}`);
  } catch (e) {
    showNotification(t('error_prefix') + e.message, 'error');
  }

  api.removePublishAllProgressListener();
  overlay.remove();
  renderMainView();
}

// ============ HELPERS ============

function showNotification(message, type = 'success') {
  const notif = document.createElement('div');
  notif.className = `notification notification-${type}`;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ============ VINTED ============

async function saveVintedListing(listing) {
  listing.updatedAt = Date.now();
  await api.saveVintedListing(listing);
  const idx = state.vintedListings.findIndex(l => l.id === listing.id);
  if (idx >= 0) state.vintedListings[idx] = listing;
  else state.vintedListings.push(listing);
}

function renderVintedView() {

  if (state.vintedMode === 'upload') {
    renderVintedUpload();
    return;
  }
  if (state.vintedEditingId) {
    renderVintedEditListing(state.vintedEditingId);
    return;
  }

  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="vinted-back-to-stores" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab ${state.vintedMode === 'listings' ? 'active' : ''}" data-vinted-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab ${state.vintedMode === 'new' ? 'active' : ''}" data-vinted-mode="new">${t('tab_new_listing')}</div>
      <div class="tab" data-vinted-mode="upload" style="margin-left: auto;">${t('vinted_upload')}</div>
      <div class="tab ${state.vintedMode === 'settings' ? 'active' : ''}" data-vinted-mode="settings">${t('tab_settings')}</div>
    </div>
    <div id="vinted-content"></div>
  `;

  document.getElementById('vinted-back-to-stores').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });

  document.querySelectorAll('[data-vinted-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.vintedMode = tab.dataset.vintedMode;
      state.vintedEditingId = null;
      renderVintedView();
    });
  });

  if (state.vintedMode === 'listings') {
    renderVintedListings();
  } else if (state.vintedMode === 'new') {
    renderVintedNewListing();
  } else if (state.vintedMode === 'settings') {
    renderVintedSettings();
  }
}

function renderVintedSettings() {
  const content = document.getElementById('vinted-content');
  const langOptions = getAvailableLanguages().map(l =>
    `<option value="${l.code}" ${state.vintedListingLanguage === l.code ? 'selected' : ''}>${l.name}</option>`
  ).join('');

  content.innerHTML = `
    <div class="setup-wizard" style="margin-top: 16px;">
      <h2>${t('store_settings')}</h2>
      <h3 style="margin-top: 20px;">${t('vinted_listing_language')}</h3>
      <p class="text-secondary text-small" style="margin-bottom: 12px;">${t('vinted_listing_language_desc')}</p>
      <div class="form-group">
        <select id="vintedListingLanguage">${langOptions}</select>
      </div>
      <button class="btn btn-primary" id="vinted-settings-save">${t('settings_save')}</button>
    </div>
  `;

  document.getElementById('vintedListingLanguage').addEventListener('change', (e) => {
    state.vintedListingLanguage = e.target.value;
    api.saveListingLanguage('vinted', e.target.value);
  });

  document.getElementById('vinted-settings-save').addEventListener('click', () => {
    showNotification(t('settings_saved'));
  });
}

function renderVintedListings() {
  const content = document.getElementById('vinted-content');
  const allListings = state.vintedListings;

  if (allListings.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h3 class="text-secondary">${t('vinted_no_listings')}</h3>
        <p class="text-secondary" style="margin-bottom: 20px;">${t('vinted_create_first')}</p>
      </div>
    `;
    return;
  }

  const legoCount = allListings.filter(l => l.data && l.data.lego_part_num).length;
  const publishedCount = allListings.filter(l => l.status === 'published').length;
  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      ${publishedCount > 0 ? `<button class="btn btn-secondary" id="vinted-delete-published-listings">${t('vinted_delete_uploaded')} (${publishedCount})</button>` : ''}
      ${legoCount > 0 ? `<button class="btn btn-secondary" id="vinted-filter-lego" title="${t('lego_filter')}">🧱 LEGO (${legoCount})</button>` : ''}
      ${legoCount > 0 ? `<button class="btn btn-secondary" id="vinted-refresh-renders">🧱 Refresh Renders</button>` : ''}
      <button class="btn btn-secondary" id="vinted-bulk-mode-btn" style="margin-left: auto;">${t('btn_bulk_edit')}</button>
    </div>
    <div id="vinted-bulk-bar" class="bulk-bar" style="display:none;">
      <span id="vinted-bulk-count">0 ${t('listings_selected')}</span>
      <button class="btn btn-secondary" id="vinted-bulk-select-all">${t('bulk_select_all')}</button>
      <button class="btn btn-primary" id="vinted-bulk-edit-btn">${t('bulk_edit_selected')}</button>
      <button class="btn btn-secondary" id="vinted-bulk-delete-btn" style="color: var(--error-color);">${t('bulk_delete_selected')}</button>
      <button class="btn btn-secondary" id="vinted-bulk-deselect" style="margin-left: auto;">${t('bulk_deselect')}</button>
    </div>
    <div class="listings-grid" id="vinted-grid"></div>
  `;

  // LEGO filter
  let legoFilterActive = false;
  const legoFilterBtn = document.getElementById('vinted-filter-lego');
  if (legoFilterBtn) {
    legoFilterBtn.addEventListener('click', () => {
      legoFilterActive = !legoFilterActive;
      legoFilterBtn.classList.toggle('btn-primary', legoFilterActive);
      legoFilterBtn.classList.toggle('btn-secondary', !legoFilterActive);
      renderCards();
    });
  }

  // Refresh LEGO renders button
  const refreshRendersBtn = document.getElementById('vinted-refresh-renders');
  if (refreshRendersBtn) {
    refreshRendersBtn.addEventListener('click', async () => {
      refreshRendersBtn.disabled = true;
      refreshRendersBtn.textContent = 'Refreshing...';
      let updated = 0;
      const legoListings = state.vintedListings.filter(l => l.data && l.data.lego_part_num);
      for (const listing of legoListings) {
        const render = await api.getLegoRender(listing.id);
        if (!render) continue;
        // Remove old lego-render from photos
        const oldIdx = listing.photos.findIndex(p =>
          p.name && (p.name.toLowerCase().startsWith('lego-render') || p.name.toLowerCase().startsWith('lego_render'))
        );
        if (oldIdx >= 0) listing.photos.splice(oldIdx, 1);
        // Add fresh render reference
        listing.photos.push(render);
        listing.updatedAt = Date.now();
        await saveVintedListing(listing);
        updated++;
      }
      showNotification(`Render aggiornati: ${updated} listing`);
      renderVintedListings();
    });
  }

  if (publishedCount > 0) {
    document.getElementById('vinted-delete-published-listings').addEventListener('click', async () => {
      if (!confirm(`${t('vinted_delete_confirm')} ${publishedCount} ${tListings(publishedCount)}?`)) return;
      const published = state.vintedListings.filter(l => l.status === 'published');
      for (const listing of published) {
        await api.deleteListingPhotos(listing.id);
        await api.deleteVintedListing(listing.id);
      }
      state.vintedListings = state.vintedListings.filter(l => l.status !== 'published');
      renderVintedListings();
    });
  }

  const grid = document.getElementById('vinted-grid');
  const bulkSelected = new Set();
  const bulkBar = document.getElementById('vinted-bulk-bar');
  const bulkCount = document.getElementById('vinted-bulk-count');

  function updateVintedBulkBar() {
    const count = bulkSelected.size;
    bulkBar.style.display = count > 0 ? 'flex' : 'none';
    bulkCount.textContent = `${count} ${count === 1 ? t('listings_selected_singular') : t('listings_selected')}`;
  }

  function getFilteredListings() {
    if (legoFilterActive) return allListings.filter(l => l.data && l.data.lego_part_num);
    return allListings;
  }

  // Lazy thumbnail observer
  const vintedThumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      vintedThumbObserver.unobserve(card);
      const listingId = card.dataset.listingId;
      const listing = allListings.find(l => l.id === listingId);
      if (!listing || !listing.photos || listing.photos.length === 0) continue;
      const thumbPhoto = listing.photos[0];
      const thumbEl = card.querySelector('.listing-thumb');
      if (!thumbEl) continue;
      if (thumbPhoto.isRemote && thumbPhoto.url) {
        thumbEl.innerHTML = `<img src="${thumbPhoto.url}" alt="thumb">`;
      } else if (thumbPhoto.path) {
        api.getPhotoThumbnail(thumbPhoto.path).then(thumb => {
          thumbEl.innerHTML = `<img src="${thumb}" alt="thumb">`;
        }).catch(() => {});
      }
    }
  }, { root: document.getElementById('panel-left'), rootMargin: '200px' });

  function createVintedCard(listing) {
    const title = (listing.data && listing.data.title) ? listing.data.title : t('listings_no_title');
    const price = (listing.data && listing.data.price) ? `\u20AC${formatPrice(listing.data.price)}` : '';
    const hasThumb = listing.photos && listing.photos.length > 0;
    const statusClass = `status-${listing.status}`;
    const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);
    const isLego = listing.data && listing.data.lego_part_num;

    const card = document.createElement('div');
    card.className = 'listing-item';
    card.dataset.listingId = listing.id;
    card.innerHTML = `
      <input type="checkbox" class="bulk-checkbox" data-bulk-id="${listing.id}">
      <div class="listing-item-thumb listing-thumb">
        ${hasThumb ? '' : `<span class="text-secondary">${t('listings_no_photo')}</span>`}
      </div>
      <div class="listing-item-body">
        <div class="listing-item-header">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          ${isLego ? '<span class="status-badge" style="background: #d97706; color: #fff;">🧱 LEGO</span>' : ''}
          ${price ? `<span class="listing-item-price">${price}</span>` : ''}
        </div>
        <div class="listing-item-title">${escapeHtml(title)}</div>
        <div class="listing-item-meta">${listing.photos ? listing.photos.length : 0} ${t('listings_photos')}${isLego ? ` · #${escapeHtml(listing.data.lego_part_num)}` : ''}</div>
        <div class="listing-item-actions">
          <button class="btn btn-secondary btn-card-action" data-vinted-preview="${listing.id}" title="${t('btn_view')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn btn-primary btn-card-action" data-vinted-edit="${listing.id}">${t('btn_edit')}</button>
          <button class="btn btn-secondary btn-delete-icon" data-vinted-delete="${listing.id}" title="${t('delete_confirm_btn')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </div>
    `;
    return card;
  }

  function renderCards() {
    grid.innerHTML = '';
    const listings = getFilteredListings();
    // Render in batches of 30
    let idx = 0;
    function batch() {
      const fragment = document.createDocumentFragment();
      const end = Math.min(idx + 30, listings.length);
      for (let i = idx; i < end; i++) {
        const card = createVintedCard(listings[i]);
        fragment.appendChild(card);
        vintedThumbObserver.observe(card);
      }
      grid.appendChild(fragment);
      idx = end;
      if (idx < listings.length) requestAnimationFrame(batch);
    }
    batch();
  }

  // Initial render
  renderCards();

  // Bulk checkbox handling
  grid.addEventListener('change', (e) => {
    if (!e.target.classList.contains('bulk-checkbox')) return;
    const id = e.target.dataset.bulkId;
    if (e.target.checked) bulkSelected.add(id);
    else bulkSelected.delete(id);
    updateVintedBulkBar();
  });

  // Bulk mode toggle
  document.getElementById('vinted-bulk-mode-btn').addEventListener('click', () => {
    grid.classList.toggle('bulk-mode');
    const active = grid.classList.contains('bulk-mode');
    document.getElementById('vinted-bulk-mode-btn').textContent = active ? t('btn_exit_bulk') : t('btn_bulk_edit');
    if (!active) {
      grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
      bulkSelected.clear();
      updateVintedBulkBar();
    }
  });

  // Bulk select all
  document.getElementById('vinted-bulk-select-all').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.checked = true;
      bulkSelected.add(cb.dataset.bulkId);
    });
    updateVintedBulkBar();
  });

  // Bulk deselect
  document.getElementById('vinted-bulk-deselect').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    bulkSelected.clear();
    updateVintedBulkBar();
  });

  // Bulk edit
  document.getElementById('vinted-bulk-edit-btn').addEventListener('click', () => {
    const selected = state.vintedListings.filter(l => bulkSelected.has(l.id));
    if (selected.length === 0) return;
    showVintedBulkEditModal(selected, () => {
      bulkSelected.clear();
      updateVintedBulkBar();
      renderVintedListings();
    });
  });

  // Bulk delete
  document.getElementById('vinted-bulk-delete-btn').addEventListener('click', async () => {
    const ids = [...bulkSelected];
    if (ids.length === 0) return;
    if (!confirm(`${t('bulk_delete_confirm')} ${ids.length} ${tListings(ids.length)}?`)) return;
    for (const id of ids) {
      await api.deleteListingPhotos(id);
      await api.deleteVintedListing(id);
    }
    state.vintedListings = state.vintedListings.filter(l => !bulkSelected.has(l.id));
    bulkSelected.clear();
    updateVintedBulkBar();
    renderVintedListings();
    showNotification(`${ids.length} ${tListings(ids.length)} ${t('bulk_deleted')}.`);
  });

  // Event delegation
  grid.addEventListener('click', async (e) => {
    const previewBtn = e.target.closest('[data-vinted-preview]');
    if (previewBtn) {
      e.stopPropagation();
      const listing = state.vintedListings.find(l => l.id === previewBtn.dataset.vintedPreview);
      if (listing) renderVintedPreviewModal(listing);
      return;
    }
    const editBtn = e.target.closest('[data-vinted-edit]');
    if (editBtn) {
      e.stopPropagation();
      state.vintedEditingId = editBtn.dataset.vintedEdit;
      renderVintedView();
      return;
    }
    const deleteBtn = e.target.closest('[data-vinted-delete]');
    if (deleteBtn) {
      e.stopPropagation();
      const listing = state.vintedListings.find(l => l.id === deleteBtn.dataset.vintedDelete);
      if (listing && confirm(t('vinted_delete_single'))) {
        await api.deleteListingPhotos(listing.id);
        await api.deleteVintedListing(listing.id);
        state.vintedListings = state.vintedListings.filter(l => l.id !== listing.id);
        renderVintedListings();
      }
    }
  });
}

function renderVintedPreviewModal(listing) {
  const d = listing.data || {};
  const photos = listing.photos || [];
  const firstPhotoSrc = photos.length > 0 ? (photos[0].isRemote ? photos[0].url : '') : '';

  const conditionLabels = {
    'Nuovo con cartellino': t('vinted_condition_new_tag'),
    'Nuovo senza cartellino': t('vinted_condition_new_notag'),
    'Ottime': t('vinted_condition_excellent'),
    'Buone': t('vinted_condition_good'),
    'Discrete': t('vinted_condition_fair')
  };

  const legoInfoHtml = d.lego_part_num ? `
    <div style="margin-top: 12px; padding: 10px; border-radius: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color);">
      <span style="font-size: 16px;">🧱</span> <strong>LEGO</strong> #${escapeHtml(d.lego_part_num)}${d.lego_color ? ` · ${escapeHtml(d.lego_color)}` : ''}
    </div>
  ` : '';

  const colorsHtml = Array.isArray(d.colors) && d.colors.length > 0
    ? `<div style="margin-top: 8px;">${d.colors.map(c => `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:var(--bg-tertiary);margin:2px;font-size:13px;">${escapeHtml(c)}</span>`).join('')}</div>`
    : '';

  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.id = 'preview-modal-overlay';
  overlay.innerHTML = `
    <div class="preview-modal">
      <div class="preview-gallery">
        <img class="preview-main-img" id="preview-main-img" src="${firstPhotoSrc}" alt="">
        <div class="preview-thumbs" id="preview-thumbs">
          ${photos.map((p, i) => `<img src="${p.isRemote ? p.url : ''}" data-idx="${i}" class="${i === 0 ? 'active' : ''}">`).join('')}
        </div>
      </div>
      <div class="preview-section">
        <h2>${escapeHtml(d.title || t('listings_no_title'))}</h2>
        <div class="preview-price">\u20AC${formatPrice(d.price || '0')}</div>
        <span class="preview-condition">${conditionLabels[d.condition] || d.condition || ''}</span>
        ${d.brand ? `<span style="margin-left: 8px; opacity: 0.7;">${escapeHtml(d.brand)}</span>` : ''}
        ${d.size ? `<span style="margin-left: 8px; opacity: 0.7;">${t('vinted_size')}: ${escapeHtml(d.size)}</span>` : ''}
      </div>
      ${colorsHtml}
      <div class="preview-description">${escapeHtml(d.description || '')}</div>
      ${d.category_suggestion ? `<div style="margin-top: 8px; font-size: 13px; opacity: 0.6;">${escapeHtml(d.category_suggestion)}</div>` : ''}
      ${legoInfoHtml}
      <div style="text-align: center; margin-top: 20px;">
        <button class="btn btn-secondary" id="preview-close">${t('preview_close')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Thumbnail click to swap main image
  overlay.querySelectorAll('.preview-thumbs img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const mainImg = document.getElementById('preview-main-img');
      if (mainImg) mainImg.src = thumb.src;
      overlay.querySelectorAll('.preview-thumbs img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // Load local photos
  photos.forEach(async (p, i) => {
    if (!p.isRemote && p.path) {
      try {
        const base64 = await api.getPhotoBase64(p.path);
        const thumbImg = overlay.querySelector(`.preview-thumbs img[data-idx="${i}"]`);
        if (thumbImg) thumbImg.src = base64;
        if (i === 0) {
          const mainImg = document.getElementById('preview-main-img');
          if (mainImg) mainImg.src = base64;
        }
      } catch {}
    }
  });

  document.getElementById('preview-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showVintedBulkEditModal(listings, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal" style="max-width: 550px; max-height: 80vh; overflow-y: auto;">
      <h3>${t('bulk_edit_title')} (${listings.length})</h3>
      <p class="text-secondary text-small" style="margin-bottom: 16px;">${t('bulk_edit_desc')}</p>

      <div class="form-group">
        <label>${t('vinted_condition')}</label>
        <select id="vbulk-condition">
          <option value="">${t('bulk_no_change')}</option>
          <option value="Nuovo con cartellino">${t('vinted_condition_new_tag')}</option>
          <option value="Nuovo senza cartellino">${t('vinted_condition_new_notag')}</option>
          <option value="Ottime">${t('vinted_condition_excellent')}</option>
          <option value="Buone">${t('vinted_condition_good')}</option>
          <option value="Discrete">${t('vinted_condition_fair')}</option>
        </select>
      </div>

      <div class="form-group">
        <label>${t('bulk_price_edit')}</label>
        <div class="flex-row" style="gap: 8px;">
          <select id="vbulk-price-mode" style="width: auto;">
            <option value="">${t('bulk_no_change')}</option>
            <option value="set">${t('bulk_price_set')}</option>
            <option value="increase_pct">${t('bulk_price_increase_pct')}</option>
            <option value="decrease_pct">${t('bulk_price_decrease_pct')}</option>
            <option value="increase_abs">${t('bulk_price_increase_abs')}</option>
            <option value="decrease_abs">${t('bulk_price_decrease_abs')}</option>
          </select>
          <input type="number" step="0.01" id="vbulk-price-value" placeholder="${t('bulk_value')}" style="width: 120px;">
        </div>
      </div>

      <div class="form-group">
        <label>${t('vinted_brand')}</label>
        <input type="text" id="vbulk-brand" placeholder="${t('bulk_no_change_placeholder')}">
      </div>

      <div class="flex-row" style="gap: 12px;">
        <div class="form-group flex-1">
          <label>${t('vinted_size')}</label>
          <input type="text" id="vbulk-size" placeholder="${t('bulk_no_change_placeholder')}">
        </div>
        <div class="form-group flex-1">
          <label>${t('vinted_colors')}</label>
          <input type="text" id="vbulk-colors" placeholder="${t('bulk_no_change_placeholder')}">
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 20px;">
        <button class="btn btn-primary" id="vbulk-apply">${t('bulk_apply')} (${listings.length})</button>
        <button class="btn btn-secondary" id="vbulk-cancel">${t('bulk_cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('vbulk-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('vbulk-apply').addEventListener('click', async () => {
    const condition = document.getElementById('vbulk-condition').value;
    const priceMode = document.getElementById('vbulk-price-mode').value;
    const priceValue = parseFloat(document.getElementById('vbulk-price-value').value);
    const brand = document.getElementById('vbulk-brand').value.trim();
    const size = document.getElementById('vbulk-size').value.trim();
    const colors = document.getElementById('vbulk-colors').value.trim();

    let changed = 0;
    for (const listing of listings) {
      if (!listing.data) continue;
      let modified = false;

      if (condition) {
        listing.data.condition = condition;
        modified = true;
      }

      if (priceMode && !isNaN(priceValue)) {
        const current = parseFloat(listing.data.price || 0);
        switch (priceMode) {
          case 'set': listing.data.price = priceValue.toFixed(2); break;
          case 'increase_pct': listing.data.price = (current * (1 + priceValue / 100)).toFixed(2); break;
          case 'decrease_pct': listing.data.price = (current * (1 - priceValue / 100)).toFixed(2); break;
          case 'increase_abs': listing.data.price = (current + priceValue).toFixed(2); break;
          case 'decrease_abs': listing.data.price = Math.max(0, current - priceValue).toFixed(2); break;
        }
        modified = true;
      }

      if (brand) { listing.data.brand = brand; modified = true; }
      if (size) { listing.data.size = size; modified = true; }
      if (colors) {
        listing.data.colors = colors.split(',').map(c => c.trim()).filter(Boolean);
        modified = true;
      }

      if (modified) {
        await saveVintedListing(listing);
        changed++;
      }
    }

    overlay.remove();
    showNotification(`${changed} ${tListings(changed)} ${t('bulk_modified')}.`);
    if (onDone) onDone();
  });
}

function renderVintedNewListing() {
  const content = document.getElementById('vinted-content');
  const articles = [];

  content.innerHTML = `
    <div class="listing-card" style="margin-top: 16px;">
      <h3>${t('vinted_batch_title')}</h3>
      <p class="text-secondary" style="margin-bottom: 16px;">${t('new_listing_desc')}</p>
      <div id="vinted-batch-articles"></div>
    </div>
    <div class="flex-row" style="margin-top: 16px; gap: 8px;">
      <button class="btn btn-primary" id="vinted-generate-btn" disabled>${t('new_generate')}</button>
      <button class="btn btn-secondary" id="vinted-import-btn" disabled>${t('new_import_json')}</button>
      <button class="btn btn-secondary" id="vinted-manual-btn" disabled>${t('new_create_manual')}</button>
      <button class="btn btn-secondary" id="vinted-lego-all-btn" style="margin-left: auto;" title="${t('lego_all_btn')}">🧱 ${t('lego_all_btn')}</button>
    </div>
  `;

  document.getElementById('vinted-generate-btn').addEventListener('click', () => vintedBatchGenerate());
  document.getElementById('vinted-import-btn').addEventListener('click', () => vintedBatchImport());
  document.getElementById('vinted-manual-btn').addEventListener('click', () => vintedBatchManual());

  // LEGO: "All LEGO" toggle button
  let allLegoMode = false;
  const legoAllBtn = document.getElementById('vinted-lego-all-btn');
  legoAllBtn.addEventListener('click', () => {
    allLegoMode = !allLegoMode;
    articles.forEach(a => { a.isLego = allLegoMode; });
    document.querySelectorAll('.lego-toggle-cb').forEach(cb => { cb.checked = allLegoMode; });
    legoAllBtn.textContent = allLegoMode ? `🧱 ${t('lego_all_off_btn')}` : `🧱 ${t('lego_all_btn')}`;
    showNotification(allLegoMode ? t('lego_all_enabled') : t('lego_all_disabled'));
  });

  function updateButtons() {
    const genBtn = document.getElementById('vinted-generate-btn');
    const impBtn = document.getElementById('vinted-import-btn');
    const manBtn = document.getElementById('vinted-manual-btn');
    const withPhotos = articles.filter(a => a.photos.length > 0).length;
    if (genBtn) {
      genBtn.disabled = withPhotos === 0;
      genBtn.textContent = withPhotos > 1
        ? `${t('new_generate')} (${withPhotos})`
        : t('new_generate');
    }
    if (impBtn) impBtn.disabled = withPhotos === 0;
    if (manBtn) manBtn.disabled = withPhotos === 0;
  }

  function appendArticleCard() {
    const id = 'v-' + String(Date.now()) + '-' + articles.length;
    const article = { id, photos: [], isLego: allLegoMode };
    articles.push(article);
    const idx = articles.length - 1;

    const card = document.createElement('div');
    card.className = 'batch-article-card';
    card.dataset.articleIdx = idx;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong>${t('new_article')} ${idx + 1}</strong>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label class="lego-toggle" style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; user-select: none;">
            <input type="checkbox" class="lego-toggle-cb" ${allLegoMode ? 'checked' : ''} style="cursor: pointer;">
            🧱 ${t('lego_mode')}
          </label>
          <button class="btn btn-secondary batch-remove-btn" style="padding: 2px 8px; font-size: 12px;">${t('new_remove')}</button>
        </div>
      </div>
      <div class="drop-zone batch-drop-zone">
        <p>${t('new_drop_photos')}</p>
        <p class="text-secondary text-small" style="margin-top: 4px;">${t('new_or_browse')}</p>
        <div class="drop-zone-photos"></div>
      </div>
    `;

    const container = document.getElementById('vinted-batch-articles');
    container.appendChild(card);

    const dropZone = card.querySelector('.batch-drop-zone');
    const photosContainer = card.querySelector('.drop-zone-photos');

    // Click to browse
    dropZone.addEventListener('click', async (e) => {
      if (e.target.closest('.batch-photo-remove')) return;
      const result = await api.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
      });
      if (!result.canceled && result.filePaths.length) {
        const newPhotos = [];
        for (const fp of result.filePaths) {
          newPhotos.push(await api.copyPhoto(fp, article.id));
        }
        article.photos.push(...newPhotos);
        appendPhotoNames(photosContainer, article, newPhotos);
        ensureEmptyArticle();
      }
    });

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      const newPhotos = [];
      const explorerData = e.dataTransfer.getData('application/x-explorer-paths');
      if (explorerData) {
        const paths = JSON.parse(explorerData);
        for (const p of paths) {
          newPhotos.push(await api.copyPhoto(p, article.id));
        }
      } else {
        const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
        const files = Array.from(e.dataTransfer.files).filter(f =>
          f.type.startsWith('image/') || imageExts.some(ext => f.name.toLowerCase().endsWith(ext))
        );
        for (const file of files) {
          newPhotos.push(await api.copyPhoto(webUtils.getPathForFile(file), article.id));
        }
      }
      if (newPhotos.length === 0) return;
      article.photos.push(...newPhotos);
      appendPhotoNames(photosContainer, article, newPhotos);
      ensureEmptyArticle();
    });

    // LEGO toggle
    card.querySelector('.lego-toggle-cb').addEventListener('change', (e) => {
      article.isLego = e.target.checked;
    });

    // Remove button
    card.querySelector('.batch-remove-btn').addEventListener('click', async () => {
      for (const photo of article.photos) {
        try { await api.deletePhoto(photo.path); } catch {}
      }
      articles.splice(articles.indexOf(article), 1);
      card.remove();
      document.querySelectorAll('#vinted-batch-articles .batch-article-card').forEach((c, i) => {
        c.querySelector('strong').textContent = `${t('new_article')} ${i + 1}`;
      });
      ensureEmptyArticle();
      updateButtons();
    });

    updateButtons();
  }

  function ensureEmptyArticle() {
    const last = articles[articles.length - 1];
    if (!last || last.photos.length > 0) {
      appendArticleCard();
    }
    updateButtons();
  }

  function appendPhotoNames(container, article, newPhotos) {
    for (const photo of newPhotos) {
      const item = document.createElement('div');
      item.className = 'batch-photo-item';
      const fileName = photo.name || photo.path.split(/[/\\]/).pop();
      item.innerHTML = `
        <span class="batch-photo-name" title="${escapeAttr(photo.path)}">📷 ${escapeHtml(fileName)}</span>
        <button class="batch-photo-remove">&times;</button>
      `;
      item.querySelector('.batch-photo-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await api.deletePhoto(photo.path);
        article.photos = article.photos.filter(p => p.path !== photo.path);
        item.remove();
        updateButtons();
      });
      container.appendChild(item);
    }
  }

  async function vintedBatchGenerate() {
    const validArticles = articles.filter(a => a.photos.length > 0);
    if (validArticles.length === 0) {
      showNotification(t('generate_add_photos'), 'error');
      return;
    }

    // Ensure LEGO data is downloaded if any article is marked as LEGO
    if (validArticles.some(a => a.isLego)) {
      try {
        await api.ensureLegoData();
      } catch (e) {
        console.error('Failed to ensure LEGO data:', e);
      }
    }

    const prompt = buildVintedBatchPrompt(validArticles);
    await api.writePromptFile(prompt);
    await api.deleteResponseFile();

    api.sendToTerminal('/clear\r');
    await new Promise(r => setTimeout(r, 1000));
    const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
    const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
    api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

    showNotification(`${t('generate_prompt_sent')} (${validArticles.length}).`);
  }

  async function vintedBatchImport() {
    const raw = await api.readResponseFile();
    if (!raw) {
      showNotification(t('import_not_found'), 'error');
      return;
    }

    let results;
    try {
      let cleaned = raw.replace(/^\uFEFF/, '').trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const start = cleaned.indexOf('[') !== -1 && cleaned.indexOf('[') < cleaned.indexOf('{') ? cleaned.indexOf('[') : cleaned.indexOf('{');
      const parsed = JSON.parse(cleaned.substring(start));
      results = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      showNotification(t('import_invalid_json') + ': ' + e.message, 'error');
      return;
    }

    const validArticles = articles.filter(a => a.photos.length > 0);
    const total = Math.min(results.length, validArticles.length);
    const vintedClosing = '\n\nPer maggiori informazioni non esitate a contattarmi.';

    // Show progress modal
    const overlay = document.createElement('div');
    overlay.className = 'sync-modal-overlay';
    overlay.innerHTML = `
      <div class="sync-modal" style="max-width: 400px;">
        <h3>${t('import_title')}</h3>
        <p id="vinted-import-progress-text">Listing 0 / ${total}</p>
        <div style="background: var(--bg-tertiary); border-radius: 8px; height: 12px; overflow: hidden; margin-top: 12px;">
          <div id="vinted-import-progress-bar" style="height: 100%; width: 0%; background: var(--accent); transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const progressText = document.getElementById('vinted-import-progress-text');
    const progressBar = document.getElementById('vinted-import-progress-bar');

    let imported = 0;
    for (let i = 0; i < total; i++) {
      const article = validArticles[i];
      const data = results[i];
      if (!data || !data.title) continue;

      // Append default closing to description
      if (data.description && !data.description.includes('Per maggiori informazioni non esitate a contattarmi')) {
        data.description = data.description.trimEnd() + vintedClosing;
      }

      // Check for LEGO render in photo folder and append it
      const photos = [...article.photos];
      const legoRender = await api.getLegoRender(article.id);
      if (legoRender && !photos.some(p => p.path === legoRender.path)) {
        photos.push(legoRender);
      }

      const listing = {
        id: article.id,
        photos,
        data: data,
        status: 'ready',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: 'vinted'
      };
      await saveVintedListing(listing);
      imported++;
      progressText.textContent = `Listing ${imported} / ${total}`;
      progressBar.style.width = `${Math.round((imported / total) * 100)}%`;
    }

    // Delete original source photos
    progressText.textContent = t('import_cleaning');
    for (const article of validArticles) {
      for (const photo of article.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
    }

    overlay.remove();
    await api.deleteResponseFile();
    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(`${imported} ${tListings(imported)} Vinted ${t('notif_imported')}!`);

    state.vintedEditingId = null;
    state.vintedMode = 'listings';
    renderVintedView();
  }

  async function vintedBatchManual() {
    const validArticles = articles.filter(a => a.photos.length > 0);
    if (validArticles.length === 0) {
      showNotification(t('generate_add_photos'), 'error');
      return;
    }

    const vintedClosing = '\n\nPer maggiori informazioni non esitate a contattarmi.';

    for (const article of validArticles) {
      const listing = {
        id: article.id,
        photos: [...article.photos],
        data: {
          title: '',
          description: vintedClosing.trim(),
          price: '',
          brand: '',
          condition: 'Buone',
          colors: [],
          category_suggestion: '',
          size: ''
        },
        status: 'ready',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: 'vinted'
      };
      await saveVintedListing(listing);
    }

    // Delete original source photos
    for (const article of validArticles) {
      for (const photo of article.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
    }

    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(`${validArticles.length} ${tListings(validArticles.length)} ${t('notif_created_manual')}.`);

    state.vintedEditingId = null;
    state.vintedMode = 'listings';
    renderVintedView();
  }

  // Start with one empty article
  appendArticleCard();
}

function buildVintedBatchPrompt(articles) {
  const hasLegoArticles = articles.some(a => a.isLego);
  const articleSections = articles.map((a, i) => {
    const photoList = a.photos.map((p, j) => `  ${j + 1}. ${p.path}`).join('\n');
    const legoTag = a.isLego ? '\n  [LEGO PIECE — use LEGO recognition instructions below]' : '';
    return `\n--- ARTICLE ${i + 1} of ${articles.length} ---${legoTag}\nPhotos:\n${photoList}`;
  }).join('\n');

  const listingLang = getLanguageName(state.vintedListingLanguage) || 'Italian';

  const legoInstructions = hasLegoArticles ? `
LEGO PIECE RECOGNITION:
For articles marked as [LEGO PIECE], follow this special procedure:

1. IDENTIFY THE PIECE: Analyze the photo carefully. Look at:
   - Shape (brick, plate, tile, slope, technic beam, connector, minifig part, etc.)
   - Dimensions (count the studs: e.g. 2x4, 1x6, 2x2)
   - Color
   - Special features (clips, pins, holes, printed patterns, slopes, curves)

2. SEARCH THE LEGO DATABASE: The LEGO parts database is at ${appPath.replace(/\\/g, '/')}/lego-data/parts.csv (CSV: part_num, name, part_cat_id, part_material — 61,000+ rows).
   Categories are at ${appPath.replace(/\\/g, '/')}/lego-data/part_categories.csv (CSV: id, name).
   Colors are at ${appPath.replace(/\\/g, '/')}/lego-data/colors.csv (CSV: id, name, rgb, is_trans).
   DO NOT read the entire parts.csv — it's too large. Instead use the Grep tool to search for keywords.
   Example: search for "Brick 2 x 4" or "Slope" or "Plate 1 x" to find matching parts.
   Combine multiple keyword searches to narrow down the exact part.

3. VERIFY WITH RENDER: Once you identify a candidate part number, fetch the 3D render from:
   https://cdn.rebrickable.com/media/parts/ldraw/{color_id}/{part_num}.png
   Common color IDs: 0=Black, 1=Blue, 2=Green, 4=Red, 7=Light Gray, 8=Dark Gray, 14=Yellow, 15=White, 19=Tan, 25=Orange, 70=Reddish Brown, 71=Light Bluish Gray, 72=Dark Bluish Gray
   Use WebFetch to download the render image, then compare it visually with the user's photo to confirm or reject your identification.
   If the render doesn't match, try other candidate part numbers.

4. DOWNLOAD RENDER FOR LISTING: Once confirmed, download the render PNG and save it to the article's photo folder:
   ${appPath.replace(/\\/g, '/')}/photos/{article_id}/lego-render.png
   (where {article_id} is taken from the article's photo paths)
   This render will be automatically added as the last photo in the listing.

5. GENERATE LISTING: For LEGO pieces, use:
   - title: "LEGO [Part Name] [Part Number] [Color]" — optimized for search
   - brand: "LEGO"
   - description: Include part number, official name, color, dimensions, category, and any special features
   - category_suggestion: Use an appropriate LEGO-related category
   - condition: Assess from the photo
   - Add a "lego_part_num" field with the identified part number
   - Add a "lego_color" field with the color name
   - Add a "lego_render_url" field with the render URL used for verification

` : '';

  return `Analyze the following product photos and create ${articles.length > 1 ? articles.length + ' complete Vinted.it listings' : 'a complete Vinted.it listing'} in ${listingLang}.
${articles.length > 1 ? '\nEach article has its own set of photos. Generate a SEPARATE listing for each article.\n' : ''}
${articleSections}

VINTED CONDITION OPTIONS (use exactly one):
- "Nuovo con cartellino" (new with tags)
- "Nuovo senza cartellino" (new without tags)
- "Ottime" (excellent used)
- "Buone" (good used)
- "Discrete" (fair used)

VINTED COLOR OPTIONS: Nero, Marrone, Grigio, Beige, Rosa, Viola, Rosso, Giallo, Blu, Verde, Arancione, Bianco, Argento, Oro, Cachi, Turchese, Panna, Albicocca, Corallo, Borgogna, Lilla, Azzurro, Blu marino, Verde scuro, Senape, Menta
${legoInstructions}
IMPORTANT - RESEARCH ONLINE:
Before generating each listing, search the web to:
1. Identify the EXACT specific product (brand, model, year, variant, edition) based on what you see in the photos
2. Search for the SPECIFIC item's current market value on Vinted, eBay, or other marketplaces — NOT the generic product line
3. Gather detailed specifications to enrich the description
Use the WebSearch and WebFetch tools to do this research.

DESCRIPTION STYLE:
Write a clear, concise description in ${listingLang} (max 500 chars). Include:
- What the item is (type, brand, model)
- Key features and condition details
- Any defects visible in photos
Do NOT use HTML tags. Plain text only.
Do NOT include closing phrases like "contact me for info" — just describe the product.

You MUST respond with ONLY valid JSON (no markdown, no code blocks).
${articles.length > 1 ? 'Respond with a JSON ARRAY of objects, one per article.' : 'Respond with a single JSON object.'}

Each object must have this format:
{
  "title": "Vinted listing title in ${listingLang} (max 100 chars, include brand and key features)",
  "description": "Plain text description in ${listingLang} (max 500 chars)",
  "price": "Suggested price in EUR as number (must end in .90 or .99)",
  "brand": "Brand name or empty string if unknown",
  "condition": "One of the condition options above",
  "colors": ["One or more color names from the list above"],
  "category_suggestion": "Suggested Vinted category path in Italian (e.g. Donna > Abbigliamento > Magliette)",
  "size": "Size if applicable (e.g. M, 42, etc.) or empty string"${hasLegoArticles ? `,
  "lego_part_num": "LEGO part number if identified (e.g. 3001) or empty string",
  "lego_color": "LEGO color name if identified or empty string",
  "lego_render_url": "URL of the render used for verification or empty string"` : ''}
}

IMPORTANT:
- The title MUST be in ${listingLang}, optimized for search
- Be specific about what you see in the photos
- Respond with ONLY the JSON, nothing else`;
}

function buildVintedListingPrompt(photoPaths) {
  return buildVintedBatchPrompt([{ photos: photoPaths.map(p => ({ path: p })) }]);
}

async function generateVintedListing(listing) {
  listing.status = 'generating';
  await saveVintedListing(listing);

  const photoPaths = listing.photos.map(p => p.path);
  const prompt = buildVintedListingPrompt(photoPaths);

  await api.writePromptFile(prompt);
  await api.deleteResponseFile();

  api.sendToTerminal('/clear\r');
  await new Promise(r => setTimeout(r, 1000));
  const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
  const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
  api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

  listing.status = 'waiting_import';
  await saveVintedListing(listing);
  showNotification(t('generate_prompt_sent'));

  state.vintedEditingId = listing.id;
  renderVintedView();
}

async function renderVintedEditListing(listingId) {
  const container = document.getElementById('ui-container');
  const listing = state.vintedListings.find(l => l.id === listingId || l.id === String(listingId));

  if (!listing) {
    state.vintedEditingId = null;
    renderVintedView();
    return;
  }

  const isAuthenticated = await api.ebayCheckAuth().catch(() => false);
  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="vinted-back-to-stores" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab" data-vinted-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab" data-vinted-mode="new">${t('tab_new_listing')}</div>
      <div class="tab" data-vinted-mode="upload" style="margin-left: auto;">${t('vinted_upload')}</div>
      <div class="tab" data-vinted-mode="settings">${t('tab_settings')}</div>
    </div>

    <button class="btn btn-secondary" id="vinted-back-btn" style="margin-bottom: 16px;">&larr; ${t('back_to_listings')}</button>

    <div class="listing-card">
      <h3>${t('edit_photos')}</h3>
      <div class="drop-zone" id="vinted-edit-drop-zone">
        <p>${t('new_drop_photos')}</p>
        <div class="drop-zone-photos" id="vinted-edit-photos"></div>
      </div>
    </div>

    <div class="flex-row" style="margin-bottom: 16px; gap: 8px;">
      <button class="btn btn-primary" id="vinted-gen-btn" ${listing.photos.length === 0 ? 'disabled' : ''}>${t('new_generate')}</button>
      <button class="btn btn-secondary" id="vinted-import-btn">${t('new_import_json')}</button>
    </div>

    <div id="vinted-form-container"></div>
  `;

  // Navigation
  document.getElementById('vinted-back-to-stores').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });
  document.querySelectorAll('[data-vinted-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.vintedMode = tab.dataset.vintedMode;
      state.vintedEditingId = null;
      renderVintedView();
    });
  });
  document.getElementById('vinted-back-btn').addEventListener('click', () => {
    state.vintedEditingId = null;
    state.vintedMode = 'listings';
    renderVintedView();
  });

  // Photos
  const dropZone = document.getElementById('vinted-edit-drop-zone');
  const photosContainer = document.getElementById('vinted-edit-photos');
  await renderEditPhotos(photosContainer, listing, saveVintedListing);

  dropZone.addEventListener('click', async (e) => {
    if (e.target.closest('.photo-action-btn')) return;
    const result = await api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
    });
    if (!result.canceled && result.filePaths.length) {
      for (const fp of result.filePaths) {
        const copied = await api.copyPhoto(fp, listing.id);
        listing.photos.push(copied);
      }
      await saveVintedListing(listing);
      await renderEditPhotos(photosContainer, listing, saveVintedListing);
    }
  });

  // Generate
  document.getElementById('vinted-gen-btn').addEventListener('click', () => generateVintedListing(listing));

  // Import JSON
  document.getElementById('vinted-import-btn').addEventListener('click', async () => {
    const raw = await api.readResponseFile();
    if (!raw) {
      showNotification(t('import_not_found'), 'error');
      return;
    }
    try {
      let cleaned = raw.replace(/^\uFEFF/, '').trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const start = cleaned.indexOf('{');
      const parsed = JSON.parse(cleaned.substring(start >= 0 ? start : 0));
      const data = Array.isArray(parsed) ? parsed[0] : parsed;

      // Append default closing to description
      if (data.description && !data.description.includes('Per maggiori informazioni non esitate a contattarmi')) {
        data.description = data.description.trimEnd() + '\n\nPer maggiori informazioni non esitate a contattarmi.';
      }

      listing.data = data;
      listing.status = 'ready';
      await saveVintedListing(listing);

      // Delete original source photos (like eBay batch does)
      for (const photo of listing.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
      if (window.refreshExplorer) window.refreshExplorer();

      renderVintedEditListing(listing.id);
      showNotification(t('vinted_data_imported'));
    } catch (e) {
      showNotification(t('vinted_json_error') + e.message, 'error');
    }
  });

  // Render form if data exists
  if (listing.data) {
    renderVintedForm(listing);
  }
}

function renderVintedForm(listing) {
  const container = document.getElementById('vinted-form-container');
  const d = listing.data;

  container.innerHTML = `
    <div class="listing-card" style="margin-top: 16px;">
      <div class="form-group">
        <label>${t('vinted_title')}</label>
        <input type="text" id="vf-title" value="${escapeAttr(d.title || '')}" maxlength="100" />
      </div>
      <div class="form-group">
        <label>${t('vinted_description')}</label>
        <textarea id="vf-description" rows="4" maxlength="500" style="resize: vertical;">${escapeHtml(d.description || '')}</textarea>
      </div>
      <div class="flex-row" style="gap: 12px;">
        <div class="form-group" style="flex:1;">
          <label>${t('vinted_price')}</label>
          <input type="number" step="0.01" id="vf-price" value="${d.price || ''}" />
        </div>
        <div class="form-group" style="flex:1;">
          <label>${t('vinted_brand')}</label>
          <input type="text" id="vf-brand" value="${escapeAttr(d.brand || '')}" />
        </div>
      </div>
      <div class="flex-row" style="gap: 12px;">
        <div class="form-group" style="flex:1;">
          <label>${t('vinted_condition')}</label>
          <select id="vf-condition">
            <option value="Nuovo con cartellino" ${d.condition === 'Nuovo con cartellino' ? 'selected' : ''}>${t('vinted_condition_new_tag')}</option>
            <option value="Nuovo senza cartellino" ${d.condition === 'Nuovo senza cartellino' ? 'selected' : ''}>${t('vinted_condition_new_notag')}</option>
            <option value="Ottime" ${d.condition === 'Ottime' ? 'selected' : ''}>${t('vinted_condition_excellent')}</option>
            <option value="Buone" ${d.condition === 'Buone' ? 'selected' : ''}>${t('vinted_condition_good')}</option>
            <option value="Discrete" ${d.condition === 'Discrete' ? 'selected' : ''}>${t('vinted_condition_fair')}</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label>${t('vinted_size')}</label>
          <input type="text" id="vf-size" value="${escapeAttr(d.size || '')}" placeholder="${t('vinted_size_placeholder')}" />
        </div>
      </div>
      <div class="form-group">
        <label>${t('vinted_colors')}</label>
        <input type="text" id="vf-colors" value="${escapeAttr(Array.isArray(d.colors) ? d.colors.join(', ') : (d.colors || ''))}" placeholder="${t('vinted_colors_placeholder')}" />
      </div>
      <div class="form-group">
        <label>${t('vinted_category')}</label>
        <input type="text" id="vf-category" value="${escapeAttr(d.category_suggestion || '')}" readonly />
      </div>

      ${d.lego_part_num ? `
      <div style="margin-top: 12px; padding: 12px; border-radius: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 18px;">🧱</span>
          <strong>LEGO Part Info</strong>
        </div>
        <div class="flex-row" style="gap: 12px;">
          <div class="form-group" style="flex:1;">
            <label>Part Number</label>
            <input type="text" id="vf-lego-part" value="${escapeAttr(d.lego_part_num || '')}" />
          </div>
          <div class="form-group" style="flex:1;">
            <label>Color</label>
            <input type="text" id="vf-lego-color" value="${escapeAttr(d.lego_color || '')}" />
          </div>
        </div>
        ${d.lego_render_url ? `<div style="margin-top: 8px;"><img src="${escapeAttr(d.lego_render_url)}" style="max-height: 120px; border-radius: 4px;" alt="LEGO Render"></div>` : ''}
      </div>
      ` : ''}

      <div class="flex-row" style="margin-top: 16px;">
        <button class="btn btn-primary" id="vf-save">${t('vinted_save')}</button>
      </div>
    </div>
  `;

  // Auto-save on field changes
  const saveFields = () => {
    listing.data.title = document.getElementById('vf-title').value;
    listing.data.description = document.getElementById('vf-description').value;
    listing.data.price = document.getElementById('vf-price').value;
    listing.data.brand = document.getElementById('vf-brand').value;
    listing.data.condition = document.getElementById('vf-condition').value;
    listing.data.size = document.getElementById('vf-size').value;
    listing.data.colors = document.getElementById('vf-colors').value.split(',').map(c => c.trim()).filter(Boolean);
    const legoPartEl = document.getElementById('vf-lego-part');
    if (legoPartEl) listing.data.lego_part_num = legoPartEl.value;
    const legoColorEl = document.getElementById('vf-lego-color');
    if (legoColorEl) listing.data.lego_color = legoColorEl.value;
    listing.status = 'ready';
  };

  document.getElementById('vf-save').addEventListener('click', async () => {
    saveFields();
    await saveVintedListing(listing);
    showNotification(t('notif_listing_saved'));
  });
}

// ============ VINTED UPLOAD VIEW ============

function renderVintedUpload() {
  const container = document.getElementById('ui-container');
  const readyListings = state.vintedListings.filter(l => l.status === 'ready' || l.status === 'published');
  const publishedCount = readyListings.filter(l => l.status === 'published').length;

  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="vinted-upload-back" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab" data-vinted-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab" data-vinted-mode="new">${t('tab_new_listing')}</div>
      <div class="tab active" data-vinted-mode="upload" style="margin-left: auto;">${t('vinted_upload')}</div>
      <div class="tab" data-vinted-mode="settings">${t('tab_settings')}</div>
    </div>
    <div class="vinted-upload-split">
      <div class="vinted-upload-left">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3>${t('vinted_ready_listings')} (${readyListings.length})</h3>
          ${publishedCount > 0 ? `<button class="btn btn-secondary btn-card-action" id="vinted-delete-published" title="${t('vinted_delete_uploaded')}">${t('vinted_delete_uploaded')} (${publishedCount})</button>` : ''}
        </div>
        <div id="vinted-upload-list"></div>
      </div>
      <div class="vinted-upload-right">
        <div class="vinted-webview-toolbar">
          <button class="btn btn-secondary btn-card-action" id="vinted-wv-back">&larr;</button>
          <button class="btn btn-secondary btn-card-action" id="vinted-wv-forward">&rarr;</button>
          <button class="btn btn-secondary btn-card-action" id="vinted-wv-reload">&#8635;</button>
          <span class="vinted-wv-url" id="vinted-wv-url">vinted.it</span>
        </div>
        <webview id="vinted-webview" src="https://www.vinted.it/items/new" partition="persist:vinted" useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" style="width:100%; height:100%;"></webview>
      </div>
    </div>
  `;

  // Navigation
  document.getElementById('vinted-upload-back').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });
  document.querySelectorAll('[data-vinted-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.vintedMode = tab.dataset.vintedMode;
      state.vintedEditingId = null;
      renderVintedView();
    });
  });

  // Webview controls
  const wv = document.getElementById('vinted-webview');
  const urlBar = document.getElementById('vinted-wv-url');

  // Fix keyboard input: focus webview on click and when DOM is ready
  wv.addEventListener('dom-ready', () => wv.focus());
  wv.addEventListener('click', () => wv.focus());
  wv.addEventListener('focus', () => wv.focus());

  wv.addEventListener('did-navigate', (e) => {
    try { urlBar.textContent = new URL(e.url).hostname + new URL(e.url).pathname; } catch { urlBar.textContent = e.url; }
  });
  wv.addEventListener('did-navigate-in-page', (e) => {
    try { urlBar.textContent = new URL(e.url).hostname + new URL(e.url).pathname; } catch {}
  });

  document.getElementById('vinted-wv-back').addEventListener('click', () => { if (wv.canGoBack()) wv.goBack(); });
  document.getElementById('vinted-wv-forward').addEventListener('click', () => { if (wv.canGoForward()) wv.goForward(); });
  document.getElementById('vinted-wv-reload').addEventListener('click', () => wv.reload());

  // Delete all published listings
  const delPublishedBtn = document.getElementById('vinted-delete-published');
  if (delPublishedBtn) {
    delPublishedBtn.addEventListener('click', async () => {
      const published = state.vintedListings.filter(l => l.status === 'published');
      if (!confirm(`${t('vinted_delete_confirm')} ${published.length} ${tListings(published.length)}?`)) return;
      for (const listing of published) {
        await api.deleteListingPhotos(listing.id);
        await api.deleteVintedListing(listing.id);
      }
      state.vintedListings = state.vintedListings.filter(l => l.status !== 'published');
      renderVintedUpload();
    });
  }

  // Render listing cards on the left
  const listContainer = document.getElementById('vinted-upload-list');

  if (readyListings.length === 0) {
    listContainer.innerHTML = `<p class="text-secondary">${t('vinted_no_ready')}</p>`;
    return;
  }

  // Lazy-load photos only when card scrolls into view
  const uploadCardObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      uploadCardObserver.unobserve(card);
      const listingId = card.dataset.listingId;
      const listing = readyListings.find(l => l.id === listingId);
      if (!listing || listing.photos.length === 0) continue;
      const photosDiv = card.querySelector('.upload-card-photos-slot');
      if (!photosDiv) continue;
      photosDiv.innerHTML = listing.photos.map((p, i) =>
        `<img src="file://${p.path.replace(/\\/g, '/')}" class="vinted-upload-card-photo" draggable="true" data-photo-path="${escapeAttr(p.path)}" data-photo-index="${i}" title="${t('vinted_upload')}" />`
      ).join('');
      // Attach photo drag/select handlers
      const selectedPhotos = card._selectedPhotos || (card._selectedPhotos = new Set());
      photosDiv.querySelectorAll('.vinted-upload-card-photo').forEach(img => {
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          const path = img.dataset.photoPath;
          if (selectedPhotos.has(path)) { selectedPhotos.delete(path); img.classList.remove('vinted-photo-selected'); }
          else { selectedPhotos.add(path); img.classList.add('vinted-photo-selected'); }
        });
        img.addEventListener('dragstart', (e) => {
          const thisPath = img.dataset.photoPath;
          const paths = (selectedPhotos.size > 0 && selectedPhotos.has(thisPath)) ? [...selectedPhotos] : [thisPath];
          e.preventDefault();
          ipcRenderer.send('native-file-drag', paths);
        });
      });
    }
  }, { root: document.querySelector('.vinted-upload-left'), rootMargin: '200px' });

  // Use event delegation on listContainer for button clicks
  listContainer.addEventListener('click', (e) => {
    const copyTitleBtn = e.target.closest('[data-copy-title]');
    if (copyTitleBtn) { navigator.clipboard.writeText(copyTitleBtn.dataset.copyTitle); showNotification(t('notif_copied_title')); return; }
    const copyDescBtn = e.target.closest('[data-copy-desc]');
    if (copyDescBtn) {
      const lid = copyDescBtn.closest('.vinted-upload-card').dataset.listingId;
      const l = readyListings.find(x => x.id === lid);
      if (l) { navigator.clipboard.writeText(l.data?.description || ''); showNotification(t('notif_copied_desc')); }
      return;
    }
    const copyPriceBtn = e.target.closest('[data-copy-price]');
    if (copyPriceBtn) { navigator.clipboard.writeText(copyPriceBtn.dataset.copyPrice); showNotification(t('notif_copied_price')); return; }
    const markBtn = e.target.closest('[data-mark-published]');
    if (markBtn) {
      const lid = markBtn.dataset.markPublished;
      const l = state.vintedListings.find(x => x.id === lid);
      if (l) {
        l.status = l.status === 'published' ? 'ready' : 'published';
        saveVintedListing(l).then(() => renderVintedUpload());
      }
    }
  });

  // Render cards in batches
  let ucIdx = 0;
  function uploadCardBatch() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(ucIdx + 20, readyListings.length);
    for (let i = ucIdx; i < end; i++) {
      const listing = readyListings[i];
      const d = listing.data || {};
      const isPublished = listing.status === 'published';
      const card = document.createElement('div');
      card.className = 'vinted-upload-card' + (isPublished ? ' vinted-upload-card-published' : '');
      card.dataset.listingId = listing.id;
      card.innerHTML = `
        <div class="vinted-upload-card-header">
          <strong>${isPublished ? '&#10003; ' : ''}${escapeHtml(d.title || t('listings_no_title'))}</strong>
          <span>&euro;${formatPrice(d.price || 0)}</span>
        </div>
        ${listing.photos.length > 0 ? '<div class="vinted-upload-card-photos upload-card-photos-slot"></div>' : ''}
        <div class="vinted-upload-card-body">
          <div class="text-small"><b>${t('vinted_brand')}:</b> ${escapeHtml(d.brand || '-')}</div>
          <div class="text-small"><b>${t('vinted_size')}:</b> ${escapeHtml(d.size || '-')}</div>
          <div class="text-small"><b>${t('vinted_condition')}:</b> ${escapeHtml(d.condition || '-')}</div>
          <div class="text-small"><b>${t('vinted_colors')}:</b> ${escapeHtml(Array.isArray(d.colors) ? d.colors.join(', ') : '-')}</div>
          <div class="text-small" style="margin-top: 6px;">${escapeHtml(d.description || '').substring(0, 120)}${(d.description || '').length > 120 ? '...' : ''}</div>
        </div>
        <div class="vinted-upload-card-actions">
          <button class="btn btn-secondary btn-card-action" data-copy-title="${escapeAttr(d.title || '')}">${t('vinted_copy_title')}</button>
          <button class="btn btn-secondary btn-card-action" data-copy-desc>${t('vinted_copy_desc')}</button>
          <button class="btn btn-secondary btn-card-action" data-copy-price="${d.price || ''}">${t('vinted_copy_price')}</button>
          <button class="btn ${isPublished ? 'btn-primary' : 'btn-secondary'} btn-card-action vinted-mark-published-btn" data-mark-published="${listing.id}" title="${isPublished ? t('vinted_already_published') : t('vinted_mark_published')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      `;
      fragment.appendChild(card);
      uploadCardObserver.observe(card);
    }
    listContainer.appendChild(fragment);
    ucIdx = end;
    if (ucIdx < readyListings.length) requestAnimationFrame(uploadCardBatch);
  }
  uploadCardBatch();
}

// ============ WALLAPOP ============

async function saveWallapopListing(listing) {
  listing.updatedAt = Date.now();
  await api.saveWallapopListing(listing);
  const idx = state.wallapopListings.findIndex(l => l.id === listing.id);
  if (idx >= 0) state.wallapopListings[idx] = listing;
  else state.wallapopListings.push(listing);
}

function renderWallapopView() {
  if (state.wallapopMode === 'upload') {
    renderWallapopUpload();
    return;
  }
  if (state.wallapopEditingId) {
    renderWallapopEditListing(state.wallapopEditingId);
    return;
  }

  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="wallapop-back-to-stores" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab ${state.wallapopMode === 'listings' ? 'active' : ''}" data-wallapop-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab ${state.wallapopMode === 'new' ? 'active' : ''}" data-wallapop-mode="new">${t('tab_new_listing')}</div>
      <div class="tab" data-wallapop-mode="upload" style="margin-left: auto;">${t('wallapop_upload')}</div>
      <div class="tab ${state.wallapopMode === 'settings' ? 'active' : ''}" data-wallapop-mode="settings">${t('tab_settings')}</div>
    </div>
    <div id="wallapop-content"></div>
  `;

  document.getElementById('wallapop-back-to-stores').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });

  document.querySelectorAll('[data-wallapop-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.wallapopMode = tab.dataset.wallapopMode;
      state.wallapopEditingId = null;
      renderWallapopView();
    });
  });

  if (state.wallapopMode === 'listings') {
    renderWallapopListings();
  } else if (state.wallapopMode === 'new') {
    renderWallapopNewListing();
  } else if (state.wallapopMode === 'settings') {
    renderWallapopSettings();
  }
}

function renderWallapopSettings() {
  const content = document.getElementById('wallapop-content');
  const langOptions = getAvailableLanguages().map(l =>
    `<option value="${l.code}" ${state.wallapopListingLanguage === l.code ? 'selected' : ''}>${l.name}</option>`
  ).join('');

  content.innerHTML = `
    <div class="setup-wizard" style="margin-top: 16px;">
      <h2>${t('store_settings')}</h2>
      <h3 style="margin-top: 20px;">${t('wallapop_listing_language')}</h3>
      <p class="text-secondary text-small" style="margin-bottom: 12px;">${t('wallapop_listing_language_desc')}</p>
      <div class="form-group">
        <select id="wallapopListingLanguage">${langOptions}</select>
      </div>
      <button class="btn btn-primary" id="wallapop-settings-save">${t('settings_save')}</button>
    </div>
  `;

  document.getElementById('wallapopListingLanguage').addEventListener('change', (e) => {
    state.wallapopListingLanguage = e.target.value;
    api.saveListingLanguage('wallapop', e.target.value);
  });

  document.getElementById('wallapop-settings-save').addEventListener('click', () => {
    showNotification(t('settings_saved'));
  });
}

function renderWallapopListings() {
  const content = document.getElementById('wallapop-content');
  const listings = state.wallapopListings;

  if (listings.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h3 class="text-secondary">${t('wallapop_no_listings')}</h3>
        <p class="text-secondary" style="margin-bottom: 20px;">${t('wallapop_create_first')}</p>
      </div>
    `;
    return;
  }

  const publishedCount = listings.filter(l => l.status === 'published').length;
  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      ${publishedCount > 0 ? `<button class="btn btn-secondary" id="wallapop-delete-published-listings">${t('wallapop_delete_uploaded')} (${publishedCount})</button>` : ''}
      <button class="btn btn-secondary" id="wallapop-bulk-mode-btn" style="margin-left: auto;">${t('btn_bulk_edit')}</button>
    </div>
    <div id="wallapop-bulk-bar" class="bulk-bar" style="display:none;">
      <span id="wallapop-bulk-count">0 ${t('listings_selected')}</span>
      <button class="btn btn-secondary" id="wallapop-bulk-select-all">${t('bulk_select_all')}</button>
      <button class="btn btn-primary" id="wallapop-bulk-edit-btn">${t('bulk_edit_selected')}</button>
      <button class="btn btn-secondary" id="wallapop-bulk-delete-btn" style="color: var(--error-color);">${t('bulk_delete_selected')}</button>
      <button class="btn btn-secondary" id="wallapop-bulk-deselect" style="margin-left: auto;">${t('bulk_deselect')}</button>
    </div>
    <div class="listings-grid" id="wallapop-grid"></div>
  `;

  if (publishedCount > 0) {
    document.getElementById('wallapop-delete-published-listings').addEventListener('click', async () => {
      if (!confirm(`${t('wallapop_delete_confirm')} ${publishedCount} ${tListings(publishedCount)}?`)) return;
      const published = state.wallapopListings.filter(l => l.status === 'published');
      for (const listing of published) {
        await api.deleteListingPhotos(listing.id);
        await api.deleteWallapopListing(listing.id);
      }
      state.wallapopListings = state.wallapopListings.filter(l => l.status !== 'published');
      renderWallapopListings();
    });
  }

  const grid = document.getElementById('wallapop-grid');
  const bulkSelected = new Set();
  const bulkBar = document.getElementById('wallapop-bulk-bar');
  const bulkCount = document.getElementById('wallapop-bulk-count');

  function updateWallapopBulkBar() {
    const count = bulkSelected.size;
    bulkBar.style.display = count > 0 ? 'flex' : 'none';
    bulkCount.textContent = `${count} ${count === 1 ? t('listings_selected_singular') : t('listings_selected')}`;
  }

  // Lazy thumbnail observer for Wallapop
  const wallapopThumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      wallapopThumbObserver.unobserve(card);
      const listingId = card.dataset.listingId;
      const listing = listings.find(l => l.id === listingId);
      if (!listing || !listing.photos || listing.photos.length === 0) continue;
      const thumbPhoto = listing.photos[0];
      const thumbEl = card.querySelector('.listing-thumb');
      if (!thumbEl) continue;
      if (thumbPhoto.isRemote && thumbPhoto.url) {
        thumbEl.innerHTML = `<img src="${thumbPhoto.url}" alt="thumb">`;
      } else if (thumbPhoto.path) {
        api.getPhotoThumbnail(thumbPhoto.path).then(thumb => {
          thumbEl.innerHTML = `<img src="${thumb}" alt="thumb">`;
        }).catch(() => {});
      }
    }
  }, { root: document.getElementById('panel-left'), rootMargin: '200px' });

  // Render in batches
  let wIdx = 0;
  function wallapopBatch() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(wIdx + 30, listings.length);
    for (let i = wIdx; i < end; i++) {
      const listing = listings[i];
      const title = (listing.data && listing.data.title) ? listing.data.title : t('listings_no_title');
      const price = (listing.data && listing.data.price) ? `\u20AC${formatPrice(listing.data.price)}` : '';
      const hasThumb = listing.photos && listing.photos.length > 0;
      const statusClass = `status-${listing.status}`;
      const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);

      const card = document.createElement('div');
      card.className = 'listing-item';
      card.dataset.listingId = listing.id;
      card.innerHTML = `
        <input type="checkbox" class="bulk-checkbox" data-bulk-id="${listing.id}">
        <div class="listing-item-thumb listing-thumb">
          ${hasThumb ? '' : `<span class="text-secondary">${t('listings_no_photo')}</span>`}
        </div>
        <div class="listing-item-body">
          <div class="listing-item-header">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            ${price ? `<span class="listing-item-price">${price}</span>` : ''}
          </div>
          <div class="listing-item-title">${escapeHtml(title)}</div>
          <div class="listing-item-meta">${listing.photos ? listing.photos.length : 0} ${t('listings_photos')}</div>
          <div class="listing-item-actions">
            <button class="btn btn-primary btn-card-action" data-wallapop-edit="${listing.id}">Edit</button>
            <button class="btn btn-secondary btn-delete-icon" data-wallapop-delete="${listing.id}" title="${t('delete_confirm_btn')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          </div>
        </div>
      `;
      fragment.appendChild(card);
      wallapopThumbObserver.observe(card);
    }
    grid.appendChild(fragment);
    wIdx = end;
    if (wIdx < listings.length) requestAnimationFrame(wallapopBatch);
  }
  wallapopBatch();

  // Bulk checkbox handling
  grid.addEventListener('change', (e) => {
    if (!e.target.classList.contains('bulk-checkbox')) return;
    const id = e.target.dataset.bulkId;
    if (e.target.checked) bulkSelected.add(id);
    else bulkSelected.delete(id);
    updateWallapopBulkBar();
  });

  // Bulk mode toggle
  document.getElementById('wallapop-bulk-mode-btn').addEventListener('click', () => {
    grid.classList.toggle('bulk-mode');
    const active = grid.classList.contains('bulk-mode');
    document.getElementById('wallapop-bulk-mode-btn').textContent = active ? t('btn_exit_bulk') : t('btn_bulk_edit');
    if (!active) {
      grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
      bulkSelected.clear();
      updateWallapopBulkBar();
    }
  });

  document.getElementById('wallapop-bulk-select-all').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.checked = true;
      bulkSelected.add(cb.dataset.bulkId);
    });
    updateWallapopBulkBar();
  });

  document.getElementById('wallapop-bulk-deselect').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    bulkSelected.clear();
    updateWallapopBulkBar();
  });

  document.getElementById('wallapop-bulk-edit-btn').addEventListener('click', () => {
    const selected = state.wallapopListings.filter(l => bulkSelected.has(l.id));
    if (selected.length === 0) return;
    showWallapopBulkEditModal(selected, () => {
      bulkSelected.clear();
      updateWallapopBulkBar();
      renderWallapopListings();
    });
  });

  document.getElementById('wallapop-bulk-delete-btn').addEventListener('click', async () => {
    const ids = [...bulkSelected];
    if (ids.length === 0) return;
    if (!confirm(`${t('bulk_delete_confirm')} ${ids.length} ${tListings(ids.length)}?`)) return;
    for (const id of ids) {
      await api.deleteListingPhotos(id);
      await api.deleteWallapopListing(id);
    }
    state.wallapopListings = state.wallapopListings.filter(l => !bulkSelected.has(l.id));
    bulkSelected.clear();
    updateWallapopBulkBar();
    renderWallapopListings();
    showNotification(`${ids.length} ${tListings(ids.length)} ${t('bulk_deleted')}.`);
  });

  // Event delegation
  grid.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-wallapop-edit]');
    if (editBtn) {
      e.stopPropagation();
      state.wallapopEditingId = editBtn.dataset.wallapopEdit;
      renderWallapopView();
      return;
    }
    const deleteBtn = e.target.closest('[data-wallapop-delete]');
    if (deleteBtn) {
      e.stopPropagation();
      const listing = state.wallapopListings.find(l => l.id === deleteBtn.dataset.wallapopDelete);
      if (listing && confirm(t('wallapop_delete_single'))) {
        await api.deleteListingPhotos(listing.id);
        await api.deleteWallapopListing(listing.id);
        state.wallapopListings = state.wallapopListings.filter(l => l.id !== listing.id);
        renderWallapopListings();
      }
    }
  });
}

function showWallapopBulkEditModal(listings, onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal" style="max-width: 550px; max-height: 80vh; overflow-y: auto;">
      <h3>${t('bulk_edit_title')} (${listings.length})</h3>
      <p class="text-secondary text-small" style="margin-bottom: 16px;">${t('bulk_edit_desc')}</p>

      <div class="form-group">
        <label>${t('wallapop_condition')}</label>
        <select id="wbulk-condition">
          <option value="">${t('bulk_no_change')}</option>
          <option value="Nuevo">${t('wallapop_condition_new')}</option>
          <option value="Como nuevo">${t('wallapop_condition_like_new')}</option>
          <option value="En buen estado">${t('wallapop_condition_good')}</option>
          <option value="Con desperfectos">${t('wallapop_condition_damaged')}</option>
        </select>
      </div>

      <div class="form-group">
        <label>${t('bulk_price_edit')}</label>
        <div class="flex-row" style="gap: 8px;">
          <select id="wbulk-price-mode" style="width: auto;">
            <option value="">${t('bulk_no_change')}</option>
            <option value="set">${t('bulk_price_set')}</option>
            <option value="increase_pct">${t('bulk_price_increase_pct')}</option>
            <option value="decrease_pct">${t('bulk_price_decrease_pct')}</option>
            <option value="increase_abs">${t('bulk_price_increase_abs')}</option>
            <option value="decrease_abs">${t('bulk_price_decrease_abs')}</option>
          </select>
          <input type="number" step="0.01" id="wbulk-price-value" placeholder="${t('bulk_value')}" style="width: 120px;">
        </div>
      </div>

      <div class="form-group">
        <label>${t('wallapop_brand')}</label>
        <input type="text" id="wbulk-brand" placeholder="${t('bulk_no_change_placeholder')}">
      </div>

      <div class="flex-row" style="gap: 12px;">
        <div class="form-group flex-1">
          <label>${t('wallapop_size')}</label>
          <input type="text" id="wbulk-size" placeholder="${t('bulk_no_change_placeholder')}">
        </div>
        <div class="form-group flex-1">
          <label>${t('wallapop_weight')}</label>
          <input type="number" step="0.1" id="wbulk-weight" placeholder="${t('bulk_no_change_placeholder')}">
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 20px;">
        <button class="btn btn-primary" id="wbulk-apply">${t('bulk_apply')} (${listings.length})</button>
        <button class="btn btn-secondary" id="wbulk-cancel">${t('bulk_cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('wbulk-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('wbulk-apply').addEventListener('click', async () => {
    const condition = document.getElementById('wbulk-condition').value;
    const priceMode = document.getElementById('wbulk-price-mode').value;
    const priceValue = parseFloat(document.getElementById('wbulk-price-value').value);
    const brand = document.getElementById('wbulk-brand').value.trim();
    const size = document.getElementById('wbulk-size').value.trim();
    const weight = document.getElementById('wbulk-weight').value.trim();

    let changed = 0;
    for (const listing of listings) {
      if (!listing.data) continue;
      let modified = false;

      if (condition) { listing.data.condition = condition; modified = true; }

      if (priceMode && !isNaN(priceValue)) {
        const current = parseFloat(listing.data.price || 0);
        switch (priceMode) {
          case 'set': listing.data.price = priceValue.toFixed(2); break;
          case 'increase_pct': listing.data.price = (current * (1 + priceValue / 100)).toFixed(2); break;
          case 'decrease_pct': listing.data.price = (current * (1 - priceValue / 100)).toFixed(2); break;
          case 'increase_abs': listing.data.price = (current + priceValue).toFixed(2); break;
          case 'decrease_abs': listing.data.price = Math.max(0, current - priceValue).toFixed(2); break;
        }
        modified = true;
      }

      if (brand) { listing.data.brand = brand; modified = true; }
      if (size) { listing.data.size = size; modified = true; }
      if (weight) { listing.data.weight = weight; modified = true; }

      if (modified) {
        await saveWallapopListing(listing);
        changed++;
      }
    }

    overlay.remove();
    showNotification(`${changed} ${tListings(changed)} ${t('bulk_modified')}.`);
    if (onDone) onDone();
  });
}

function renderWallapopNewListing() {
  const content = document.getElementById('wallapop-content');
  const articles = [];

  content.innerHTML = `
    <div class="listing-card" style="margin-top: 16px;">
      <h3>${t('wallapop_batch_title')}</h3>
      <p class="text-secondary" style="margin-bottom: 16px;">${t('new_listing_desc')}</p>
      <div id="wallapop-batch-articles"></div>
    </div>
    <div class="flex-row" style="margin-top: 16px; gap: 8px;">
      <button class="btn btn-primary" id="wallapop-generate-btn" disabled>${t('new_generate')}</button>
      <button class="btn btn-secondary" id="wallapop-import-btn" disabled>${t('new_import_json')}</button>
      <button class="btn btn-secondary" id="wallapop-manual-btn" disabled>${t('new_create_manual')}</button>
    </div>
  `;

  document.getElementById('wallapop-generate-btn').addEventListener('click', () => wallapopBatchGenerate());
  document.getElementById('wallapop-import-btn').addEventListener('click', () => wallapopBatchImport());
  document.getElementById('wallapop-manual-btn').addEventListener('click', () => wallapopBatchManual());

  function updateButtons() {
    const genBtn = document.getElementById('wallapop-generate-btn');
    const impBtn = document.getElementById('wallapop-import-btn');
    const manBtn = document.getElementById('wallapop-manual-btn');
    const withPhotos = articles.filter(a => a.photos.length > 0).length;
    if (genBtn) {
      genBtn.disabled = withPhotos === 0;
      genBtn.textContent = withPhotos > 1
        ? `${t('new_generate')} (${withPhotos})`
        : t('new_generate');
    }
    if (impBtn) impBtn.disabled = withPhotos === 0;
    if (manBtn) manBtn.disabled = withPhotos === 0;
  }

  function appendArticleCard() {
    const id = 'w-' + String(Date.now()) + '-' + articles.length;
    const article = { id, photos: [] };
    articles.push(article);
    const idx = articles.length - 1;

    const card = document.createElement('div');
    card.className = 'batch-article-card';
    card.dataset.articleIdx = idx;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong>${t('new_article')} ${idx + 1}</strong>
        <button class="btn btn-secondary batch-remove-btn" style="padding: 2px 8px; font-size: 12px;">${t('new_remove')}</button>
      </div>
      <div class="drop-zone batch-drop-zone">
        <p>${t('new_drop_photos')}</p>
        <p class="text-secondary text-small" style="margin-top: 4px;">${t('new_or_browse')}</p>
        <div class="drop-zone-photos"></div>
      </div>
    `;

    const container = document.getElementById('wallapop-batch-articles');
    container.appendChild(card);

    const dropZone = card.querySelector('.batch-drop-zone');
    const photosContainer = card.querySelector('.drop-zone-photos');

    dropZone.addEventListener('click', async (e) => {
      if (e.target.closest('.batch-photo-remove')) return;
      const result = await api.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
      });
      if (!result.canceled && result.filePaths.length) {
        const newPhotos = [];
        for (const fp of result.filePaths) {
          newPhotos.push(await api.copyPhoto(fp, article.id));
        }
        article.photos.push(...newPhotos);
        appendPhotoNames(photosContainer, article, newPhotos);
        ensureEmptyArticle();
      }
    });

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      const newPhotos = [];
      const explorerData = e.dataTransfer.getData('application/x-explorer-paths');
      if (explorerData) {
        const paths = JSON.parse(explorerData);
        for (const p of paths) {
          newPhotos.push(await api.copyPhoto(p, article.id));
        }
      } else {
        const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
        const files = Array.from(e.dataTransfer.files).filter(f =>
          f.type.startsWith('image/') || imageExts.some(ext => f.name.toLowerCase().endsWith(ext))
        );
        for (const file of files) {
          newPhotos.push(await api.copyPhoto(webUtils.getPathForFile(file), article.id));
        }
      }
      if (newPhotos.length === 0) return;
      article.photos.push(...newPhotos);
      appendPhotoNames(photosContainer, article, newPhotos);
      ensureEmptyArticle();
    });

    card.querySelector('.batch-remove-btn').addEventListener('click', async () => {
      for (const photo of article.photos) {
        try { await api.deletePhoto(photo.path); } catch {}
      }
      articles.splice(articles.indexOf(article), 1);
      card.remove();
      document.querySelectorAll('#wallapop-batch-articles .batch-article-card').forEach((c, i) => {
        c.querySelector('strong').textContent = `${t('new_article')} ${i + 1}`;
      });
      ensureEmptyArticle();
      updateButtons();
    });

    updateButtons();
  }

  function ensureEmptyArticle() {
    const last = articles[articles.length - 1];
    if (!last || last.photos.length > 0) {
      appendArticleCard();
    }
    updateButtons();
  }

  function appendPhotoNames(container, article, newPhotos) {
    for (const photo of newPhotos) {
      const item = document.createElement('div');
      item.className = 'batch-photo-item';
      const fileName = photo.name || photo.path.split(/[/\\]/).pop();
      item.innerHTML = `
        <span class="batch-photo-name" title="${escapeAttr(photo.path)}">📷 ${escapeHtml(fileName)}</span>
        <button class="batch-photo-remove">&times;</button>
      `;
      item.querySelector('.batch-photo-remove').addEventListener('click', async (e) => {
        e.stopPropagation();
        await api.deletePhoto(photo.path);
        article.photos = article.photos.filter(p => p.path !== photo.path);
        item.remove();
        updateButtons();
      });
      container.appendChild(item);
    }
  }

  async function wallapopBatchGenerate() {
    const validArticles = articles.filter(a => a.photos.length > 0);
    if (validArticles.length === 0) {
      showNotification(t('generate_add_photos'), 'error');
      return;
    }

    const prompt = buildWallapopBatchPrompt(validArticles);
    await api.writePromptFile(prompt);
    await api.deleteResponseFile();

    api.sendToTerminal('/clear\r');
    await new Promise(r => setTimeout(r, 1000));
    const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
    const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
    api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

    showNotification(`${t('generate_prompt_sent')} (${validArticles.length}).`);
  }

  async function wallapopBatchImport() {
    const raw = await api.readResponseFile();
    if (!raw) {
      showNotification(t('import_not_found'), 'error');
      return;
    }

    let results;
    try {
      let cleaned = raw.replace(/^\uFEFF/, '').trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const start = cleaned.indexOf('[') !== -1 && cleaned.indexOf('[') < cleaned.indexOf('{') ? cleaned.indexOf('[') : cleaned.indexOf('{');
      const parsed = JSON.parse(cleaned.substring(start));
      results = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      showNotification(t('import_invalid_json') + ': ' + e.message, 'error');
      return;
    }

    const validArticles = articles.filter(a => a.photos.length > 0);
    const total = Math.min(results.length, validArticles.length);

    const overlay = document.createElement('div');
    overlay.className = 'sync-modal-overlay';
    overlay.innerHTML = `
      <div class="sync-modal" style="max-width: 400px;">
        <h3>${t('import_title')}</h3>
        <p id="wallapop-import-progress-text">Listing 0 / ${total}</p>
        <div style="background: var(--bg-tertiary); border-radius: 8px; height: 12px; overflow: hidden; margin-top: 12px;">
          <div id="wallapop-import-progress-bar" style="height: 100%; width: 0%; background: var(--accent); transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const progressText = document.getElementById('wallapop-import-progress-text');
    const progressBar = document.getElementById('wallapop-import-progress-bar');

    let imported = 0;
    for (let i = 0; i < total; i++) {
      const article = validArticles[i];
      const data = results[i];
      if (!data || !data.title) continue;

      const listing = {
        id: article.id,
        photos: [...article.photos],
        data: data,
        status: 'ready',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: 'wallapop'
      };
      await saveWallapopListing(listing);
      imported++;
      progressText.textContent = `Listing ${imported} / ${total}`;
      progressBar.style.width = `${Math.round((imported / total) * 100)}%`;
    }

    progressText.textContent = t('import_cleaning');
    for (const article of validArticles) {
      for (const photo of article.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
    }

    overlay.remove();
    await api.deleteResponseFile();
    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(`${imported} ${tListings(imported)} Wallapop ${t('notif_imported')}!`);

    state.wallapopEditingId = null;
    state.wallapopMode = 'listings';
    renderWallapopView();
  }

  async function wallapopBatchManual() {
    const validArticles = articles.filter(a => a.photos.length > 0);
    if (validArticles.length === 0) {
      showNotification(t('generate_add_photos'), 'error');
      return;
    }

    for (const article of validArticles) {
      const listing = {
        id: article.id,
        photos: [...article.photos],
        data: {
          title: '',
          description: '',
          price: '',
          brand: '',
          condition: 'En buen estado',
          category_suggestion: '',
          size: '',
          weight: ''
        },
        status: 'ready',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: 'wallapop'
      };
      await saveWallapopListing(listing);
    }

    for (const article of validArticles) {
      for (const photo of article.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
    }

    if (window.refreshExplorer) window.refreshExplorer();
    showNotification(`${validArticles.length} ${tListings(validArticles.length)} ${t('notif_created_manual')}.`);

    state.wallapopEditingId = null;
    state.wallapopMode = 'listings';
    renderWallapopView();
  }

  ensureEmptyArticle();
}

function buildWallapopBatchPrompt(articles) {
  const articleSections = articles.map((a, i) => {
    const photoList = a.photos.map((p, j) => `  ${j + 1}. ${p.path}`).join('\n');
    return `\n--- ARTICLE ${i + 1} of ${articles.length} ---\nPhotos:\n${photoList}`;
  }).join('\n');

  const listingLang = getLanguageName(state.wallapopListingLanguage) || 'Italian';
  return `Analyze the following product photos and create ${articles.length > 1 ? articles.length + ' complete Wallapop listings' : 'a complete Wallapop listing'} in ${listingLang}.
${articles.length > 1 ? '\nEach article has its own set of photos. Generate a SEPARATE listing for each article.\n' : ''}
${articleSections}

WALLAPOP CONDITION OPTIONS (use exactly one, in Spanish):
- "Nuevo" (brand new, sealed/unused)
- "Como nuevo" (like new, barely used)
- "En buen estado" (good condition, normal wear)
- "Con desperfectos" (damaged, needs repair)

WALLAPOP CATEGORIES (main categories):
- Hogar y jardín (Home & garden)
- Películas, libros y música (Movies, books & music)
- Tecnología y electrónica (Technology & electronics)
- Deportes y ocio (Sports & leisure)
- Bicicletas (Bikes)
- Moda y accesorios (Fashion & accessories)
- Electrodomésticos (Appliances)
- Bebé y niño (Baby & child)
- Coleccionismo y arte (Collectibles & art)
- Teléfonos y accesorios (Phones & accessories)
- Informática y electrónica (Computers & electronics)
- Juegos y consolas (Games & consoles)
- TV, audio y cámaras (TV, audio & cameras)
- Otro (Other)

IMPORTANT - RESEARCH ONLINE:
Before generating each listing, search the web to:
1. Identify the EXACT specific product (brand, model, year, variant, edition) based on what you see in the photos
2. Search for the SPECIFIC item's current market value on Wallapop, eBay, or other marketplaces — NOT the generic product line
3. Gather detailed specifications to enrich the description
Use the WebSearch and WebFetch tools to do this research.

DESCRIPTION STYLE:
Write a clear, concise description in ${listingLang} (max 640 chars). Include:
- What the item is (type, brand, model)
- Key features and condition details
- Any defects visible in photos
Do NOT use HTML tags. Plain text only.

You MUST respond with ONLY valid JSON (no markdown, no code blocks).
${articles.length > 1 ? 'Respond with a JSON ARRAY of objects, one per article.' : 'Respond with a single JSON object.'}

Each object must have this format:
{
  "title": "Wallapop listing title in ${listingLang} (max 40 chars, include brand and key features)",
  "description": "Plain text description in ${listingLang} (max 640 chars)",
  "price": "Suggested price in EUR as number (integer, min 1, max 2500)",
  "brand": "Brand name or empty string if unknown",
  "condition": "One of the condition options above (in Spanish)",
  "category_suggestion": "Suggested Wallapop category from the list above (in Spanish)",
  "size": "Size if applicable (e.g. M, 42, etc.) or empty string",
  "weight": "Estimated weight in kg (e.g. 0.5) for shipping calculation, or empty string"
}

IMPORTANT:
- The title MUST be in ${listingLang}, max 40 characters, optimized for search
- Wallapop prices must be integers (no decimals), minimum 1 EUR, maximum 2500 EUR
- Be specific about what you see in the photos
- Respond with ONLY the JSON, nothing else`;
}

function buildWallapopListingPrompt(photoPaths) {
  return buildWallapopBatchPrompt([{ photos: photoPaths.map(p => ({ path: p })) }]);
}

async function generateWallapopListing(listing) {
  listing.status = 'generating';
  await saveWallapopListing(listing);

  const photoPaths = listing.photos.map(p => p.path);
  const prompt = buildWallapopListingPrompt(photoPaths);

  await api.writePromptFile(prompt);
  await api.deleteResponseFile();

  api.sendToTerminal('/clear\r');
  await new Promise(r => setTimeout(r, 1000));
  const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
  const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
  api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

  listing.status = 'waiting_import';
  await saveWallapopListing(listing);
  showNotification(t('generate_prompt_sent'));

  state.wallapopEditingId = listing.id;
  renderWallapopView();
}

async function renderWallapopEditListing(listingId) {
  const container = document.getElementById('ui-container');
  const listing = state.wallapopListings.find(l => l.id === listingId || l.id === String(listingId));

  if (!listing) {
    state.wallapopEditingId = null;
    renderWallapopView();
    return;
  }

  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="wallapop-back-to-stores" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab" data-wallapop-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab" data-wallapop-mode="new">${t('tab_new_listing')}</div>
      <div class="tab" data-wallapop-mode="upload" style="margin-left: auto;">${t('wallapop_upload')}</div>
      <div class="tab" data-wallapop-mode="settings">${t('tab_settings')}</div>
    </div>

    <button class="btn btn-secondary" id="wallapop-back-btn" style="margin-bottom: 16px;">&larr; ${t('back_to_listings')}</button>

    <div class="listing-card">
      <h3>${t('edit_photos')}</h3>
      <div class="drop-zone" id="wallapop-edit-drop-zone">
        <p>${t('new_drop_photos')}</p>
        <div class="drop-zone-photos" id="wallapop-edit-photos"></div>
      </div>
    </div>

    <div class="flex-row" style="margin-bottom: 16px; gap: 8px;">
      <button class="btn btn-primary" id="wallapop-gen-btn" ${listing.photos.length === 0 ? 'disabled' : ''}>${t('new_generate')}</button>
      <button class="btn btn-secondary" id="wallapop-import-btn">${t('new_import_json')}</button>
    </div>

    <div id="wallapop-form-container"></div>
  `;

  // Navigation
  document.getElementById('wallapop-back-to-stores').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });
  document.querySelectorAll('[data-wallapop-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.wallapopMode = tab.dataset.wallapopMode;
      state.wallapopEditingId = null;
      renderWallapopView();
    });
  });
  document.getElementById('wallapop-back-btn').addEventListener('click', () => {
    state.wallapopEditingId = null;
    state.wallapopMode = 'listings';
    renderWallapopView();
  });

  // Photos
  const dropZone = document.getElementById('wallapop-edit-drop-zone');
  const photosContainer = document.getElementById('wallapop-edit-photos');
  await renderEditPhotos(photosContainer, listing, saveWallapopListing);

  dropZone.addEventListener('click', async (e) => {
    if (e.target.closest('.photo-action-btn')) return;
    const result = await api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
    });
    if (!result.canceled && result.filePaths.length) {
      for (const fp of result.filePaths) {
        const copied = await api.copyPhoto(fp, listing.id);
        listing.photos.push(copied);
      }
      await saveWallapopListing(listing);
      await renderEditPhotos(photosContainer, listing, saveWallapopListing);
    }
  });

  // Generate
  document.getElementById('wallapop-gen-btn').addEventListener('click', () => generateWallapopListing(listing));

  // Import JSON
  document.getElementById('wallapop-import-btn').addEventListener('click', async () => {
    const raw = await api.readResponseFile();
    if (!raw) {
      showNotification(t('import_not_found'), 'error');
      return;
    }
    try {
      let cleaned = raw.replace(/^\uFEFF/, '').trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const start = cleaned.indexOf('{');
      const parsed = JSON.parse(cleaned.substring(start >= 0 ? start : 0));
      const data = Array.isArray(parsed) ? parsed[0] : parsed;

      listing.data = data;
      listing.status = 'ready';
      await saveWallapopListing(listing);

      for (const photo of listing.photos) {
        if (photo.sourcePath) {
          try { await api.deletePhoto(photo.sourcePath); } catch {}
        }
      }
      if (window.refreshExplorer) window.refreshExplorer();

      renderWallapopEditListing(listing.id);
      showNotification(t('wallapop_data_imported'));
    } catch (e) {
      showNotification(t('wallapop_json_error') + e.message, 'error');
    }
  });

  if (listing.data) {
    renderWallapopForm(listing);
  }
}

function renderWallapopForm(listing) {
  const container = document.getElementById('wallapop-form-container');
  const d = listing.data;

  container.innerHTML = `
    <div class="listing-card" style="margin-top: 16px;">
      <div class="form-group">
        <label>${t('wallapop_title')}</label>
        <input type="text" id="wf-title" value="${escapeAttr(d.title || '')}" maxlength="40" />
      </div>
      <div class="form-group">
        <label>${t('wallapop_description')}</label>
        <textarea id="wf-description" rows="4" maxlength="640" style="resize: vertical;">${escapeHtml(d.description || '')}</textarea>
      </div>
      <div class="flex-row" style="gap: 12px;">
        <div class="form-group" style="flex:1;">
          <label>${t('wallapop_price')}</label>
          <input type="number" step="1" min="1" max="2500" id="wf-price" value="${d.price || ''}" />
        </div>
        <div class="form-group" style="flex:1;">
          <label>${t('wallapop_brand')}</label>
          <input type="text" id="wf-brand" value="${escapeAttr(d.brand || '')}" />
        </div>
      </div>
      <div class="flex-row" style="gap: 12px;">
        <div class="form-group" style="flex:1;">
          <label>${t('wallapop_condition')}</label>
          <select id="wf-condition">
            <option value="Nuevo" ${d.condition === 'Nuevo' ? 'selected' : ''}>${t('wallapop_condition_new')}</option>
            <option value="Como nuevo" ${d.condition === 'Como nuevo' ? 'selected' : ''}>${t('wallapop_condition_like_new')}</option>
            <option value="En buen estado" ${d.condition === 'En buen estado' ? 'selected' : ''}>${t('wallapop_condition_good')}</option>
            <option value="Con desperfectos" ${d.condition === 'Con desperfectos' ? 'selected' : ''}>${t('wallapop_condition_damaged')}</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label>${t('wallapop_size')}</label>
          <input type="text" id="wf-size" value="${escapeAttr(d.size || '')}" placeholder="${t('wallapop_size_placeholder')}" />
        </div>
      </div>
      <div class="flex-row" style="gap: 12px;">
        <div class="form-group" style="flex:1;">
          <label>${t('wallapop_weight')}</label>
          <input type="number" step="0.1" id="wf-weight" value="${d.weight || ''}" placeholder="${t('wallapop_weight_placeholder')}" />
        </div>
        <div class="form-group" style="flex:1;">
          <label>${t('wallapop_category')}</label>
          <input type="text" id="wf-category" value="${escapeAttr(d.category_suggestion || '')}" readonly />
        </div>
      </div>

      <div class="flex-row" style="margin-top: 16px;">
        <button class="btn btn-primary" id="wf-save">${t('wallapop_save')}</button>
      </div>
    </div>
  `;

  const saveFields = () => {
    listing.data.title = document.getElementById('wf-title').value;
    listing.data.description = document.getElementById('wf-description').value;
    listing.data.price = document.getElementById('wf-price').value;
    listing.data.brand = document.getElementById('wf-brand').value;
    listing.data.condition = document.getElementById('wf-condition').value;
    listing.data.size = document.getElementById('wf-size').value;
    listing.data.weight = document.getElementById('wf-weight').value;
    listing.status = 'ready';
  };

  document.getElementById('wf-save').addEventListener('click', async () => {
    saveFields();
    await saveWallapopListing(listing);
    showNotification(t('notif_listing_saved'));
  });
}

// ============ WALLAPOP UPLOAD VIEW ============

function renderWallapopUpload() {
  const container = document.getElementById('ui-container');
  const readyListings = state.wallapopListings.filter(l => l.status === 'ready' || l.status === 'published');
  const publishedCount = readyListings.filter(l => l.status === 'published').length;

  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="wallapop-upload-back" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab" data-wallapop-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab" data-wallapop-mode="new">${t('tab_new_listing')}</div>
      <div class="tab active" data-wallapop-mode="upload" style="margin-left: auto;">${t('wallapop_upload')}</div>
      <div class="tab" data-wallapop-mode="settings">${t('tab_settings')}</div>
    </div>
    <div class="vinted-upload-split">
      <div class="vinted-upload-left">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3>${t('wallapop_ready_listings')} (${readyListings.length})</h3>
          ${publishedCount > 0 ? `<button class="btn btn-secondary btn-card-action" id="wallapop-delete-published" title="${t('wallapop_delete_uploaded')}">${t('wallapop_delete_uploaded')} (${publishedCount})</button>` : ''}
        </div>
        <div id="wallapop-upload-list"></div>
      </div>
      <div class="vinted-upload-right">
        <div class="vinted-webview-toolbar">
          <button class="btn btn-secondary btn-card-action" id="wallapop-wv-back">&larr;</button>
          <button class="btn btn-secondary btn-card-action" id="wallapop-wv-forward">&rarr;</button>
          <button class="btn btn-secondary btn-card-action" id="wallapop-wv-reload">&#8635;</button>
          <button class="btn btn-secondary btn-card-action" id="wallapop-wv-new">+ ${t('tab_new_listing')}</button>
          <button class="btn btn-secondary btn-card-action" id="wallapop-wv-catalog">${t('wallapop_catalog')}</button>
          <span class="vinted-wv-url" id="wallapop-wv-url">wallapop.com</span>
        </div>
        <webview id="wallapop-webview" src="https://it.wallapop.com/app/catalog/upload" partition="persist:wallapop" useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" style="width:100%; height:100%;"></webview>
      </div>
    </div>
  `;

  // Navigation
  document.getElementById('wallapop-upload-back').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });
  document.querySelectorAll('[data-wallapop-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.wallapopMode = tab.dataset.wallapopMode;
      state.wallapopEditingId = null;
      renderWallapopView();
    });
  });

  // Webview controls
  const wv = document.getElementById('wallapop-webview');
  const urlBar = document.getElementById('wallapop-wv-url');

  // Focus handling: ensure keyboard works inside Wallapop webview
  wv.addEventListener('dom-ready', () => {
    wv.focus();
    // Inject a fix for Wallapop's input fields — ensure they receive proper focus/click events
    wv.executeJavaScript(`
      document.addEventListener('click', (e) => {
        const input = e.target.closest('input, textarea, [contenteditable]');
        if (input) { input.focus(); }
      }, true);
    `);
  });
  // Re-focus webview when user clicks on it (e.g. after interacting with the left panel)
  wv.addEventListener('ipc-message', () => wv.focus());
  const wvContainer = wv.parentElement;
  if (wvContainer) {
    wvContainer.addEventListener('mousedown', () => {
      // Small delay to let the click reach the webview first
      setTimeout(() => wv.focus(), 0);
    });
  }

  wv.addEventListener('did-navigate', (e) => {
    try { urlBar.textContent = new URL(e.url).hostname + new URL(e.url).pathname; } catch { urlBar.textContent = e.url; }
  });
  wv.addEventListener('did-navigate-in-page', (e) => {
    try { urlBar.textContent = new URL(e.url).hostname + new URL(e.url).pathname; } catch {}
  });

  document.getElementById('wallapop-wv-back').addEventListener('click', () => { if (wv.canGoBack()) wv.goBack(); });
  document.getElementById('wallapop-wv-forward').addEventListener('click', () => { if (wv.canGoForward()) wv.goForward(); });
  document.getElementById('wallapop-wv-reload').addEventListener('click', () => wv.reload());
  document.getElementById('wallapop-wv-new').addEventListener('click', () => { wv.loadURL('https://it.wallapop.com/app/catalog/upload'); });
  document.getElementById('wallapop-wv-catalog').addEventListener('click', () => { wv.loadURL('https://it.wallapop.com/app/catalog/list'); });

  // Delete all published listings
  const delPublishedBtn = document.getElementById('wallapop-delete-published');
  if (delPublishedBtn) {
    delPublishedBtn.addEventListener('click', async () => {
      const published = state.wallapopListings.filter(l => l.status === 'published');
      if (!confirm(`${t('wallapop_delete_confirm')} ${published.length} ${tListings(published.length)}?`)) return;
      for (const listing of published) {
        await api.deleteListingPhotos(listing.id);
        await api.deleteWallapopListing(listing.id);
      }
      state.wallapopListings = state.wallapopListings.filter(l => l.status !== 'published');
      renderWallapopUpload();
    });
  }

  // Render listing cards on the left
  const listContainer = document.getElementById('wallapop-upload-list');

  if (readyListings.length === 0) {
    listContainer.innerHTML = `<p class="text-secondary">${t('wallapop_no_ready')}</p>`;
    return;
  }

  // Lazy-load photos only when card scrolls into view
  const wUploadObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const card = entry.target;
      wUploadObserver.unobserve(card);
      const listingId = card.dataset.listingId;
      const listing = readyListings.find(l => l.id === listingId);
      if (!listing || listing.photos.length === 0) continue;
      const photosDiv = card.querySelector('.upload-card-photos-slot');
      if (!photosDiv) continue;
      photosDiv.innerHTML = listing.photos.map((p, i) =>
        `<img src="file://${p.path.replace(/\\/g, '/')}" class="vinted-upload-card-photo" draggable="true" data-photo-path="${escapeAttr(p.path)}" data-photo-index="${i}" title="${t('wallapop_upload')}" />`
      ).join('');
      const selectedPhotos = card._selectedPhotos || (card._selectedPhotos = new Set());
      photosDiv.querySelectorAll('.vinted-upload-card-photo').forEach(img => {
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          const path = img.dataset.photoPath;
          if (selectedPhotos.has(path)) { selectedPhotos.delete(path); img.classList.remove('vinted-photo-selected'); }
          else { selectedPhotos.add(path); img.classList.add('vinted-photo-selected'); }
        });
        img.addEventListener('dragstart', (e) => {
          const thisPath = img.dataset.photoPath;
          const paths = (selectedPhotos.size > 0 && selectedPhotos.has(thisPath)) ? [...selectedPhotos] : [thisPath];
          e.preventDefault();
          ipcRenderer.send('native-file-drag', paths);
        });
      });
    }
  }, { root: document.querySelector('.vinted-upload-left'), rootMargin: '200px' });

  // Event delegation for buttons
  listContainer.addEventListener('click', (e) => {
    const copyTitleBtn = e.target.closest('[data-copy-title]');
    if (copyTitleBtn) { navigator.clipboard.writeText(copyTitleBtn.dataset.copyTitle); showNotification(t('notif_copied_title')); return; }
    const copyDescBtn = e.target.closest('[data-copy-desc]');
    if (copyDescBtn) {
      const lid = copyDescBtn.closest('.vinted-upload-card').dataset.listingId;
      const l = readyListings.find(x => x.id === lid);
      if (l) { navigator.clipboard.writeText(l.data?.description || ''); showNotification(t('notif_copied_desc')); }
      return;
    }
    const copyPriceBtn = e.target.closest('[data-copy-price]');
    if (copyPriceBtn) { navigator.clipboard.writeText(copyPriceBtn.dataset.copyPrice); showNotification(t('notif_copied_price')); return; }
    const markBtn = e.target.closest('[data-mark-published]');
    if (markBtn) {
      const lid = markBtn.dataset.markPublished;
      const l = state.wallapopListings.find(x => x.id === lid);
      if (l) {
        l.status = l.status === 'published' ? 'ready' : 'published';
        saveWallapopListing(l).then(() => renderWallapopUpload());
      }
    }
  });

  // Render cards in batches
  let wuIdx = 0;
  function wUploadBatch() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(wuIdx + 20, readyListings.length);
    for (let i = wuIdx; i < end; i++) {
      const listing = readyListings[i];
      const d = listing.data || {};
      const isPublished = listing.status === 'published';
      const card = document.createElement('div');
      card.className = 'vinted-upload-card' + (isPublished ? ' vinted-upload-card-published' : '');
      card.dataset.listingId = listing.id;
      card.innerHTML = `
        <div class="vinted-upload-card-header">
          <strong>${isPublished ? '&#10003; ' : ''}${escapeHtml(d.title || t('listings_no_title'))}</strong>
          <span>&euro;${formatPrice(d.price || 0)}</span>
        </div>
        ${listing.photos.length > 0 ? '<div class="vinted-upload-card-photos upload-card-photos-slot"></div>' : ''}
        <div class="vinted-upload-card-body">
          <div class="text-small"><b>${t('vinted_brand')}:</b> ${escapeHtml(d.brand || '-')}</div>
          <div class="text-small"><b>${t('wallapop_size')}:</b> ${escapeHtml(d.size || '-')}</div>
          <div class="text-small"><b>${t('wallapop_condition')}:</b> ${escapeHtml(d.condition || '-')}</div>
          <div class="text-small"><b>${t('wallapop_weight')}:</b> ${d.weight ? d.weight + ' kg' : '-'}</div>
          <div class="text-small" style="margin-top: 6px;">${escapeHtml(d.description || '').substring(0, 120)}${(d.description || '').length > 120 ? '...' : ''}</div>
        </div>
        <div class="vinted-upload-card-actions">
          <button class="btn btn-secondary btn-card-action" data-copy-title="${escapeAttr(d.title || '')}">${t('wallapop_copy_title')}</button>
          <button class="btn btn-secondary btn-card-action" data-copy-desc>${t('wallapop_copy_desc')}</button>
          <button class="btn btn-secondary btn-card-action" data-copy-price="${d.price || ''}">${t('wallapop_copy_price')}</button>
          <button class="btn ${isPublished ? 'btn-primary' : 'btn-secondary'} btn-card-action vinted-mark-published-btn" data-mark-published="${listing.id}" title="${isPublished ? t('wallapop_already_published') : t('wallapop_mark_published')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      `;
      fragment.appendChild(card);
      wUploadObserver.observe(card);
    }
    listContainer.appendChild(fragment);
    wuIdx = end;
    if (wuIdx < readyListings.length) requestAnimationFrame(wUploadBatch);
  }
  wUploadBatch();
}

// ============ ETSY ============

const ETSY_WHO_MADE_OPTIONS = [
  { value: 'i_did', label: 'I did' },
  { value: 'someone_else', label: 'Someone else' },
  { value: 'collective', label: 'A member of my shop' }
];

const ETSY_WHEN_MADE_OPTIONS = [
  { value: 'made_to_order', label: 'Made to order' },
  { value: '2020_2025', label: '2020-2025' },
  { value: '2010_2019', label: '2010-2019' },
  { value: '2000_2009', label: '2000-2009' },
  { value: 'before_2000', label: 'Before 2000' },
  { value: '1990s', label: '1990s' },
  { value: '1980s', label: '1980s' },
  { value: '1970s', label: '1970s' },
  { value: '1960s', label: '1960s' },
  { value: '1950s', label: '1950s' },
  { value: '1940s', label: '1940s' },
  { value: '1930s', label: '1930s' },
  { value: '1920s', label: '1920s' },
  { value: '1910s', label: '1910s' },
  { value: '1900s', label: '1900-1909' }
];

function renderEtsySetupWizard() {
  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="setup-wizard">
      <button class="store-back-btn" id="etsy-setup-back" style="position:absolute;top:16px;left:16px;">&larr;</button>
      <h2>${t('etsy_setup_title') || 'Etsy Setup'}</h2>
      <p class="text-secondary">${t('etsy_setup_desc') || 'Enter your Etsy API credentials'}</p>
      <div class="form-group" style="margin-top: 20px;">
        <label>${t('etsy_api_key') || 'Etsy API Key (Keystring)'}</label>
        <input type="text" id="etsy-api-key" value="${(state.settings && state.settings.etsyApiKey) || ''}" placeholder="your-api-keystring">
      </div>
      <div class="form-group">
        <label>${t('etsy_shop_id') || 'Shop ID'}</label>
        <input type="text" id="etsy-shop-id" value="${(state.settings && state.settings.etsyShopId) || ''}" placeholder="12345678">
      </div>
      <button class="btn btn-primary" id="etsy-setup-save" style="margin-top: 16px;">${t('settings_save') || 'Save'}</button>
    </div>
  `;

  document.getElementById('etsy-setup-back').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });

  document.getElementById('etsy-setup-save').addEventListener('click', async () => {
    const apiKey = document.getElementById('etsy-api-key').value.trim();
    const shopId = document.getElementById('etsy-shop-id').value.trim();
    if (!apiKey || !shopId) {
      showNotification('API Key and Shop ID are required', 'error');
      return;
    }
    state.settings = state.settings || {};
    state.settings.etsyApiKey = apiKey;
    state.settings.etsyShopId = shopId;
    await api.saveSettings(state.settings);
    showNotification(t('settings_saved'));
    renderEtsyView();
  });
}

function renderEtsyView() {
  if (state.etsyMode === 'upload') {
    renderEtsyUpload();
    return;
  }
  if (state.etsyEditingId) {
    renderEtsyEditListing(state.etsyEditingId);
    return;
  }

  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="etsy-back-to-stores" title="${t('back_to_stores')}">&larr;</button>
      <div class="tab ${state.etsyMode === 'listings' ? 'active' : ''}" data-etsy-mode="listings">${t('tab_my_listings')}</div>
      <div class="tab ${state.etsyMode === 'new' ? 'active' : ''}" data-etsy-mode="new">${t('tab_new_listing')}</div>
      <div class="tab" data-etsy-mode="upload" style="margin-left: auto;">${t('etsy_upload') || 'Upload to Etsy'}</div>
      <div class="tab ${state.etsyMode === 'settings' ? 'active' : ''}" data-etsy-mode="settings">${t('tab_settings')}</div>
    </div>
    <div id="etsy-content"></div>
  `;

  document.getElementById('etsy-back-to-stores').addEventListener('click', () => {
    api.saveLastStore(null);
    renderStoreSelector();
  });

  document.querySelectorAll('[data-etsy-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.etsyMode = tab.dataset.etsyMode;
      state.etsyEditingId = null;
      renderEtsyView();
    });
  });

  if (state.etsyMode === 'listings') {
    renderEtsyListings();
  } else if (state.etsyMode === 'new') {
    renderEtsyNewListing();
  } else if (state.etsyMode === 'settings') {
    renderEtsySettings();
  }
}

async function renderEtsySettings() {
  const content = document.getElementById('etsy-content');
  const langOptions = getAvailableLanguages().map(l =>
    `<option value="${l.code}" ${state.etsyListingLanguage === l.code ? 'selected' : ''}>${l.name}</option>`
  ).join('');

  // Check auth status
  const isAuthed = await api.etsyCheckAuth();

  content.innerHTML = `
    <div class="setup-wizard" style="margin-top: 16px;">
      <h2>${t('store_settings')}</h2>

      <h3 style="margin-top: 20px;">${t('etsy_api_key') || 'Etsy API Key'}</h3>
      <div class="form-group">
        <input type="text" id="etsy-settings-api-key" value="${state.settings.etsyApiKey || ''}" placeholder="API Keystring">
      </div>

      <h3>${t('etsy_shop_id') || 'Shop ID'}</h3>
      <div class="form-group">
        <input type="text" id="etsy-settings-shop-id" value="${state.settings.etsyShopId || ''}" placeholder="12345678">
      </div>

      <h3 style="margin-top: 20px;">${t('etsy_authenticate') || 'Authentication'}</h3>
      <p class="text-secondary text-small" style="margin-bottom: 8px;">Status: ${isAuthed ? '<span style="color: var(--success-color);">Connected</span>' : '<span style="color: var(--error-color);">Not connected</span>'}</p>
      <button class="btn btn-secondary" id="etsy-auth-btn">${t('etsy_authenticate') || 'Authenticate with Etsy'}</button>

      <h3 style="margin-top: 20px;">${t('etsy_default_shipping') || 'Default Shipping Profile'}</h3>
      <div class="form-group">
        <select id="etsy-default-shipping-profile"><option value="">Loading...</option></select>
      </div>

      <h3>${t('etsy_default_return') || 'Default Return Policy'}</h3>
      <div class="form-group">
        <select id="etsy-default-return-policy"><option value="">Loading...</option></select>
      </div>

      <h3 style="margin-top: 20px;">${t('etsy_listing_language') || 'Listing Language'}</h3>
      <p class="text-secondary text-small" style="margin-bottom: 12px;">${t('etsy_listing_language_desc') || 'Language for generated Etsy listing content'}</p>
      <div class="form-group">
        <select id="etsyListingLanguage">${langOptions}</select>
      </div>

      <button class="btn btn-primary" id="etsy-settings-save" style="margin-top: 16px;">${t('settings_save')}</button>
    </div>
  `;

  // Load shipping profiles and return policies
  if (isAuthed) {
    loadEtsyProfileSelectors();
  }

  document.getElementById('etsy-auth-btn').addEventListener('click', async () => {
    showNotification('Opening Etsy authentication...');
    const result = await api.etsyAuth();
    if (result.success) {
      showNotification(t('etsy_auth_success') || 'Etsy authentication successful');
      renderEtsySettings();
    } else {
      showNotification('Auth failed: ' + (result.error || ''), 'error');
    }
  });

  document.getElementById('etsyListingLanguage').addEventListener('change', (e) => {
    state.etsyListingLanguage = e.target.value;
    api.saveListingLanguage('etsy', e.target.value);
  });

  document.getElementById('etsy-settings-save').addEventListener('click', async () => {
    state.settings.etsyApiKey = document.getElementById('etsy-settings-api-key').value.trim();
    state.settings.etsyShopId = document.getElementById('etsy-settings-shop-id').value.trim();
    const shippingSel = document.getElementById('etsy-default-shipping-profile');
    const returnSel = document.getElementById('etsy-default-return-policy');
    if (shippingSel.value) state.settings.etsyDefaultShippingProfileId = parseInt(shippingSel.value);
    if (returnSel.value) state.settings.etsyDefaultReturnPolicyId = parseInt(returnSel.value);
    await api.saveSettings(state.settings);
    showNotification(t('settings_saved'));
  });
}

async function loadEtsyProfileSelectors() {
  try {
    const profiles = await api.etsyGetShippingProfiles();
    state.etsyShippingProfiles = profiles;
    const shippingSel = document.getElementById('etsy-default-shipping-profile');
    if (shippingSel) {
      shippingSel.innerHTML = '<option value="">' + (t('select') || '-- Select --') + '</option>' +
        profiles.map(p => `<option value="${p.shipping_profile_id}" ${state.settings.etsyDefaultShippingProfileId == p.shipping_profile_id ? 'selected' : ''}>${p.title}</option>`).join('');
    }
  } catch (e) { console.error('Failed to load shipping profiles:', e); }

  try {
    const policies = await api.etsyGetReturnPolicies();
    state.etsyReturnPolicies = policies;
    const returnSel = document.getElementById('etsy-default-return-policy');
    if (returnSel) {
      returnSel.innerHTML = '<option value="">' + (t('select') || '-- Select --') + '</option>' +
        policies.map(p => `<option value="${p.return_policy_id}" ${state.settings.etsyDefaultReturnPolicyId == p.return_policy_id ? 'selected' : ''}>${p.accepts_returns ? 'Returns accepted' : 'No returns'} - ${p.accepts_exchanges ? 'Exchanges' : 'No exchanges'}</option>`).join('');
    }
  } catch (e) { console.error('Failed to load return policies:', e); }
}

async function saveEtsyListing(listing) {
  listing.updatedAt = Date.now();
  await api.saveEtsyListing(listing);
  const idx = state.etsyListings.findIndex(l => l.id === listing.id);
  if (idx >= 0) {
    state.etsyListings[idx] = listing;
  } else {
    state.etsyListings.push(listing);
  }
}

function renderEtsyListings() {
  const content = document.getElementById('etsy-content');
  const listings = state.etsyListings;

  // Toolbar with sync, publish all, update all
  const publishedCount = listings.filter(l => l.status === 'published').length;
  const readyCount = listings.filter(l => l.status === 'ready').length;

  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
      <button class="btn btn-secondary" id="etsy-sync-btn">${t('btn_sync') || 'Import from Etsy'}</button>
      <button class="btn btn-secondary" id="etsy-force-sync-btn">${t('btn_force_sync') || 'Force Refresh'}</button>
      ${readyCount > 0 ? `<button class="btn btn-primary" id="etsy-publish-all-btn">${t('btn_publish_all') || 'Publish All'} (${readyCount})</button>` : ''}
      ${publishedCount > 0 ? `<button class="btn btn-secondary" id="etsy-update-all-btn">${t('btn_update_all') || 'Update All'} (${publishedCount})</button>` : ''}
      <button class="btn btn-secondary" id="etsy-bulk-mode-btn" style="margin-left: auto;">${t('btn_bulk_edit')}</button>
    </div>
    <div id="etsy-bulk-bar" class="bulk-bar" style="display:none;">
      <span id="etsy-bulk-count">0 ${t('listings_selected')}</span>
      <button class="btn btn-secondary" id="etsy-bulk-select-all">${t('bulk_select_all')}</button>
      <button class="btn btn-primary" id="etsy-bulk-edit-btn">${t('bulk_edit_selected')}</button>
      <button class="btn btn-secondary" id="etsy-bulk-delete-btn" style="color: var(--error-color);">${t('bulk_delete_selected')}</button>
      <button class="btn btn-secondary" id="etsy-bulk-deselect" style="margin-left: auto;">${t('bulk_deselect')}</button>
    </div>
    <div class="listings-grid" id="etsy-grid"></div>
  `;

  if (listings.length === 0) {
    document.getElementById('etsy-grid').innerHTML = `
      <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
        <h3 class="text-secondary">${t('etsy_no_listings') || 'No Etsy listings yet'}</h3>
        <p class="text-secondary" style="margin-bottom: 20px;">${t('etsy_create_first') || 'Create your first Etsy listing or sync from your shop'}</p>
      </div>
    `;
  }

  // Sync buttons
  document.getElementById('etsy-sync-btn').addEventListener('click', () => startEtsySync(false));
  document.getElementById('etsy-force-sync-btn').addEventListener('click', () => startEtsySync(true));

  if (readyCount > 0) {
    document.getElementById('etsy-publish-all-btn').addEventListener('click', startEtsyPublishAll);
  }
  if (publishedCount > 0) {
    document.getElementById('etsy-update-all-btn').addEventListener('click', startEtsyUpdateAll);
  }

  const grid = document.getElementById('etsy-grid');
  const bulkSelected = new Set();
  const bulkBar = document.getElementById('etsy-bulk-bar');
  const bulkCount = document.getElementById('etsy-bulk-count');

  function updateEtsyBulkBar() {
    const count = bulkSelected.size;
    bulkBar.style.display = count > 0 ? 'flex' : 'none';
    bulkCount.textContent = `${count} ${count === 1 ? t('listings_selected_singular') : t('listings_selected')}`;
  }

  listings.forEach(listing => {
    const title = (listing.data && listing.data.title) ? listing.data.title : t('listings_no_title');
    const price = (listing.data && listing.data.price) ? `\u20AC${formatPrice(listing.data.price)}` : '';
    const hasThumb = listing.photos && listing.photos.length > 0;
    const statusClass = `status-${listing.status}`;
    const statusLabel = listing.status.charAt(0).toUpperCase() + listing.status.slice(1);

    const card = document.createElement('div');
    card.className = 'listing-item';
    card.innerHTML = `
      <input type="checkbox" class="bulk-checkbox" data-bulk-id="${listing.id}">
      <div class="listing-item-thumb listing-thumb">
        ${hasThumb ? '' : `<span class="text-secondary">${t('listings_no_photo')}</span>`}
      </div>
      <div class="listing-item-body">
        <div class="listing-item-header">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          ${price ? `<span class="listing-item-price">${price}</span>` : ''}
        </div>
        <div class="listing-item-title">${escapeHtml(title)}</div>
        <div class="listing-item-meta">${listing.photos ? listing.photos.length : 0} ${t('listings_photos')}</div>
        <div class="listing-item-actions">
          <button class="btn btn-primary btn-card-action" data-etsy-edit="${listing.id}">Edit</button>
          ${listing.etsyListingId ? `<button class="btn btn-secondary btn-card-action" data-etsy-open="${listing.etsyListingId}" title="Open on Etsy">Etsy</button>` : ''}
          <button class="btn btn-secondary btn-delete-icon" data-etsy-delete="${listing.id}" title="${t('delete_confirm_btn')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    // Lazy load thumbnail
    if (hasThumb) {
      const thumbPhoto = listing.photos[0];
      const thumbEl = card.querySelector('.listing-thumb');
      if (thumbPhoto.isRemote && thumbPhoto.url) {
        thumbEl.innerHTML = `<img src="${thumbPhoto.url}" alt="thumb">`;
      } else if (thumbPhoto.path) {
        api.getPhotoThumbnail(thumbPhoto.path).then(thumb => {
          thumbEl.innerHTML = `<img src="${thumb}" alt="thumb">`;
        }).catch(() => {});
      }
    }
  });

  // Event delegation for grid
  grid.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-etsy-edit]');
    if (editBtn) {
      state.etsyEditingId = editBtn.dataset.etsyEdit;
      renderEtsyView();
      return;
    }
    const openBtn = e.target.closest('[data-etsy-open]');
    if (openBtn) {
      const url = `https://www.etsy.com/listing/${openBtn.dataset.etsyOpen}`;
      require('electron').shell.openExternal(url);
      return;
    }
    const deleteBtn = e.target.closest('[data-etsy-delete]');
    if (deleteBtn) {
      if (!confirm(t('delete_confirm') || 'Delete this listing?')) return;
      const id = deleteBtn.dataset.etsyDelete;
      await api.deleteListingPhotos(id);
      await api.deleteEtsyListing(id);
      state.etsyListings = state.etsyListings.filter(l => l.id !== id);
      renderEtsyListings();
    }
  });

  // Bulk checkbox handling
  grid.addEventListener('change', (e) => {
    if (!e.target.classList.contains('bulk-checkbox')) return;
    const id = e.target.dataset.bulkId;
    if (e.target.checked) bulkSelected.add(id);
    else bulkSelected.delete(id);
    updateEtsyBulkBar();
  });

  document.getElementById('etsy-bulk-mode-btn').addEventListener('click', () => {
    grid.classList.toggle('bulk-mode');
    const active = grid.classList.contains('bulk-mode');
    document.getElementById('etsy-bulk-mode-btn').textContent = active ? t('btn_exit_bulk') : t('btn_bulk_edit');
    if (!active) {
      grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
      bulkSelected.clear();
      updateEtsyBulkBar();
    }
  });

  document.getElementById('etsy-bulk-select-all').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => {
      cb.checked = true;
      bulkSelected.add(cb.dataset.bulkId);
    });
    updateEtsyBulkBar();
  });

  document.getElementById('etsy-bulk-deselect').addEventListener('click', () => {
    grid.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    bulkSelected.clear();
    updateEtsyBulkBar();
  });

  document.getElementById('etsy-bulk-delete-btn').addEventListener('click', async () => {
    if (bulkSelected.size === 0) return;
    if (!confirm(`Delete ${bulkSelected.size} listings?`)) return;
    for (const id of bulkSelected) {
      await api.deleteListingPhotos(id);
      await api.deleteEtsyListing(id);
    }
    state.etsyListings = state.etsyListings.filter(l => !bulkSelected.has(l.id));
    renderEtsyListings();
  });
}

// ============ ETSY SYNC ============

async function startEtsySync(forceRefresh) {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${t('sync_title') || 'Syncing from Etsy'}</h3>
      <p id="etsy-sync-status" class="text-secondary">${t('sync_fetching') || 'Fetching listings...'}</p>
      <div class="sync-progress-bar-container">
        <div class="sync-progress-bar" id="etsy-sync-bar"></div>
      </div>
      <p id="etsy-sync-counter" class="text-secondary text-small">0 / 0</p>
      <p id="etsy-sync-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
    </div>
  `;
  document.body.appendChild(overlay);

  const onProgress = (data) => {
    const bar = document.getElementById('etsy-sync-bar');
    const counter = document.getElementById('etsy-sync-counter');
    const titleEl = document.getElementById('etsy-sync-title');
    const statusEl = document.getElementById('etsy-sync-status');
    if (!bar) return;
    if (data.phase === 'fetching') {
      statusEl.textContent = t('sync_fetching') || 'Fetching listings...';
    } else if (data.phase === 'syncing') {
      statusEl.textContent = t('sync_syncing') || 'Syncing details...';
      const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
      bar.style.width = pct + '%';
      counter.textContent = `${data.current} / ${data.total}`;
      titleEl.textContent = data.currentTitle || '';
    }
  };

  api.onEtsySyncProgress(onProgress);

  try {
    const result = await api.etsySyncListings(forceRefresh);
    state.etsyListings = fixPhotosPaths(await api.getEtsyListings());
    overlay.remove();
    api.removeEtsySyncProgressListener();
    const msg = `Sync: +${result.added} added, ${result.updated} updated, ${result.skipped} skipped, ${result.unlisted || 0} unlisted`;
    showNotification(msg);
    renderEtsyListings();
  } catch (e) {
    overlay.remove();
    api.removeEtsySyncProgressListener();
    showNotification('Sync failed: ' + e.message, 'error');
  }
}

// ============ ETSY PUBLISH ALL ============

async function startEtsyPublishAll() {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${t('publish_all_title') || 'Publishing to Etsy'}</h3>
      <p id="etsy-pub-status" class="text-secondary">${t('publish_all_progress') || 'Publishing...'}</p>
      <div class="sync-progress-bar-container">
        <div class="sync-progress-bar" id="etsy-pub-bar"></div>
      </div>
      <p id="etsy-pub-counter" class="text-secondary text-small">0 / 0</p>
      <p id="etsy-pub-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
    </div>
  `;
  document.body.appendChild(overlay);

  api.onEtsyPublishAllProgress((data) => {
    const bar = document.getElementById('etsy-pub-bar');
    const counter = document.getElementById('etsy-pub-counter');
    const titleEl = document.getElementById('etsy-pub-title');
    if (!bar) return;
    const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
    bar.style.width = pct + '%';
    counter.textContent = `${data.current} / ${data.total}`;
    titleEl.textContent = data.currentTitle || '';
  });

  try {
    const result = await api.etsyPublishAll();
    state.etsyListings = fixPhotosPaths(await api.getEtsyListings());
    overlay.remove();
    api.removeEtsyPublishAllProgressListener();
    showNotification(`Published: ${result.published}, Failed: ${result.failed}`);
    renderEtsyListings();
  } catch (e) {
    overlay.remove();
    api.removeEtsyPublishAllProgressListener();
    showNotification('Publish failed: ' + e.message, 'error');
  }
}

// ============ ETSY UPDATE ALL ============

async function startEtsyUpdateAll() {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${t('update_all_title') || 'Updating on Etsy'}</h3>
      <p id="etsy-upd-status" class="text-secondary">${t('update_all_progress') || 'Updating...'}</p>
      <div class="sync-progress-bar-container">
        <div class="sync-progress-bar" id="etsy-upd-bar"></div>
      </div>
      <p id="etsy-upd-counter" class="text-secondary text-small">0 / 0</p>
      <p id="etsy-upd-title" class="text-small" style="margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&nbsp;</p>
    </div>
  `;
  document.body.appendChild(overlay);

  api.onEtsyReviseAllProgress((data) => {
    const bar = document.getElementById('etsy-upd-bar');
    const counter = document.getElementById('etsy-upd-counter');
    const titleEl = document.getElementById('etsy-upd-title');
    if (!bar) return;
    const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
    bar.style.width = pct + '%';
    counter.textContent = `${data.current} / ${data.total}`;
    titleEl.textContent = data.currentTitle || '';
  });

  try {
    const result = await api.etsyReviseAll();
    state.etsyListings = fixPhotosPaths(await api.getEtsyListings());
    overlay.remove();
    api.removeEtsyReviseAllProgressListener();
    showNotification(`Updated: ${result.updated}, Failed: ${result.failed}`);
    renderEtsyListings();
  } catch (e) {
    overlay.remove();
    api.removeEtsyReviseAllProgressListener();
    showNotification('Update failed: ' + e.message, 'error');
  }
}

// ============ ETSY NEW LISTING (BATCH - 3 COLUMNS) ============

function renderEtsyNewListing() {
  const content = document.getElementById('etsy-content');
  content.innerHTML = `
    <div class="batch-container">
      <!-- Column 1: Photos -->
      <div class="batch-column">
        <h3 style="margin-bottom: 12px;">${t('photos') || 'Photos'}</h3>
        <div id="etsy-batch-dropzone" class="drop-zone" style="min-height: 150px; border: 2px dashed var(--border-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 12px;">
          <p class="text-secondary">${t('drop_photos') || 'Drop photos here or click to browse'}</p>
        </div>
        <div id="etsy-batch-photos" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>

      <!-- Column 2: Generate -->
      <div class="batch-column" style="display: flex; flex-direction: column;">
        <h3 style="margin-bottom: 12px;">${t('generate') || 'Generate with Claude'}</h3>
        <p class="text-secondary text-small" style="margin-bottom: 12px;">${t('generate_desc') || 'Add photos, then generate listing data using Claude Code'}</p>
        <button class="btn btn-primary" id="etsy-batch-generate" style="margin-bottom: 12px;" disabled>${t('generate_btn') || 'Generate Listing'}</button>
        <button class="btn btn-secondary" id="etsy-batch-import" style="margin-bottom: 12px;" disabled>${t('import_btn') || 'Import Response'}</button>
        <div id="etsy-batch-status" class="text-secondary text-small"></div>
      </div>

      <!-- Column 3: Preview -->
      <div class="batch-column">
        <h3 style="margin-bottom: 12px;">${t('preview') || 'Preview'}</h3>
        <div id="etsy-batch-preview" class="text-secondary">${t('preview_empty') || 'Generated listing will appear here'}</div>
      </div>
    </div>
  `;

  let batchPhotos = [];
  let batchListing = null;

  const dropzone = document.getElementById('etsy-batch-dropzone');
  const photosContainer = document.getElementById('etsy-batch-photos');
  const generateBtn = document.getElementById('etsy-batch-generate');
  const importBtn = document.getElementById('etsy-batch-import');
  const previewDiv = document.getElementById('etsy-batch-preview');
  const statusDiv = document.getElementById('etsy-batch-status');

  function updateButtons() {
    generateBtn.disabled = batchPhotos.length === 0;
    importBtn.disabled = !batchListing || batchListing.status !== 'waiting_import';
  }

  function renderBatchPhotos() {
    photosContainer.innerHTML = '';
    batchPhotos.forEach((photo, idx) => {
      const thumb = document.createElement('div');
      thumb.style.cssText = 'width: 80px; height: 80px; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid var(--border-color);';
      thumb.innerHTML = '<div style="width:100%;height:100%;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;"><span class="text-secondary text-small">...</span></div>';

      api.getPhotoThumbnail(photo.path).then(src => {
        thumb.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">
          <button data-remove-photo="${idx}" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:11px;line-height:18px;text-align:center;">&times;</button>`;
      }).catch(() => {});

      photosContainer.appendChild(thumb);
    });
    updateButtons();
  }

  // Drop zone events
  dropzone.addEventListener('click', async () => {
    const result = await api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      for (const fp of result.filePaths) {
        batchPhotos.push({ path: fp, name: require('path').basename(fp) });
      }
      renderBatchPhotos();
    }
  });

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent-color)'; });
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border-color)'; });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(jpe?g|png|gif)$/i.test(f.name));
    for (const f of files) {
      const filePath = webUtils.getPathForFile(f);
      batchPhotos.push({ path: filePath, name: f.name });
    }
    renderBatchPhotos();
  });

  photosContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove-photo]');
    if (removeBtn) {
      batchPhotos.splice(parseInt(removeBtn.dataset.removePhoto), 1);
      renderBatchPhotos();
    }
  });

  // Generate
  generateBtn.addEventListener('click', async () => {
    if (batchPhotos.length === 0) return;

    // Create a temporary listing
    const listingId = String(Date.now());
    batchListing = {
      id: listingId,
      photos: [],
      data: {},
      status: 'generating',
      platform: 'etsy'
    };

    // Copy photos to listing folder
    for (const photo of batchPhotos) {
      const copied = await api.copyPhoto(photo.path, listingId);
      batchListing.photos.push(copied);
    }

    await saveEtsyListing(batchListing);

    // Build and send prompt
    const photoPaths = batchListing.photos.map(p => p.path);
    const prompt = buildEtsyBatchPrompt([{ photos: batchListing.photos }]);

    await api.writePromptFile(prompt);
    await api.deleteResponseFile();

    api.sendToTerminal('/clear\r');
    await new Promise(r => setTimeout(r, 1000));
    const promptFullPath = appPath.replace(/\\/g, '/') + '/.prompt.md';
    const responseFullPath = appPath.replace(/\\/g, '/') + '/.response.json';
    api.sendToTerminal(`Read the file ${promptFullPath} and follow its instructions. Write the JSON result to ${responseFullPath} using the Write tool.\r`);

    batchListing.status = 'waiting_import';
    await saveEtsyListing(batchListing);
    statusDiv.textContent = t('generate_prompt_sent') || 'Prompt sent to Claude Code. Wait for response, then click Import.';
    updateButtons();
  });

  // Import
  importBtn.addEventListener('click', async () => {
    if (!batchListing) return;
    const content = await api.readResponseFile();
    if (!content) {
      showNotification(t('import_not_found') || 'Response file not found', 'error');
      return;
    }

    const parsed = parseEtsyResponseFile(content);
    if (!parsed) {
      showNotification(t('import_invalid_json') || 'Invalid JSON in response', 'error');
      return;
    }

    batchListing.data = parsed;
    batchListing.status = 'ready';
    await api.deleteResponseFile();
    await saveEtsyListing(batchListing);

    // Show preview
    previewDiv.innerHTML = `
      <div style="margin-bottom: 8px;"><strong>${t('title') || 'Title'}:</strong> ${escapeHtml(parsed.title || '')}</div>
      <div style="margin-bottom: 8px;"><strong>${t('price') || 'Price'}:</strong> \u20AC${parsed.price || ''}</div>
      <div style="margin-bottom: 8px;"><strong>Tags:</strong> ${(parsed.tags || []).join(', ')}</div>
      <div style="margin-bottom: 8px;"><strong>Who Made:</strong> ${parsed.who_made || ''}</div>
      <div style="margin-bottom: 8px;"><strong>When Made:</strong> ${parsed.when_made || ''}</div>
      <div style="margin-bottom: 8px;"><strong>${t('description') || 'Description'}:</strong></div>
      <div style="white-space: pre-wrap; font-size: 0.85em; max-height: 300px; overflow-y: auto; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">${escapeHtml(parsed.description || '')}</div>
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button class="btn btn-primary" id="etsy-batch-edit">Edit Listing</button>
        <button class="btn btn-primary" id="etsy-batch-publish">Publish to Etsy</button>
      </div>
    `;

    document.getElementById('etsy-batch-edit').addEventListener('click', () => {
      state.etsyEditingId = batchListing.id;
      state.etsyMode = 'listings';
      renderEtsyView();
    });

    document.getElementById('etsy-batch-publish').addEventListener('click', () => {
      publishEtsyListingInline(batchListing);
    });

    showNotification(t('notif_listing_saved') || 'Listing imported successfully');
    updateButtons();
  });
}

function parseEtsyResponseFile(content) {
  try {
    let cleaned = content.replace(/^\uFEFF/, '').trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    cleaned = cleaned.trim();

    // Try direct parse
    try {
      const data = JSON.parse(cleaned);
      // Handle array (batch) - take first item
      if (Array.isArray(data) && data.length > 0) {
        if (data[0].title) return data[0];
      }
      if (data.title) return data;
    } catch {}

    // Try to find JSON in content
    const jsonMatch = cleaned.match(/[\[{][\s\S]*"title"[\s\S]*[\]}]/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (Array.isArray(data) && data.length > 0 && data[0].title) return data[0];
      if (data.title) return data;
    }

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const data = JSON.parse(cleaned.substring(start, end + 1));
      if (data.title) return data;
    }
  } catch (e) {
    console.error('Failed to parse Etsy response file:', e);
  }
  return null;
}

function buildEtsyBatchPrompt(articles) {
  const listingLang = getLanguageName(state.etsyListingLanguage) || 'Italian';
  const photoSections = articles.map((art, idx) => {
    const paths = art.photos.map((p, i) => `  ${i + 1}. ${p.path}`).join('\n');
    return `Article ${idx + 1}:\n${paths}`;
  }).join('\n\n');

  return `Analyze the following product photos and create Etsy listings in ${listingLang}.

Photos:
${photoSections}

You MUST respond with ONLY a valid JSON array (no markdown, no code blocks) where each element has this exact format:
{
  "title": "Etsy listing title in ${listingLang} (max 140 chars, descriptive with keywords)",
  "description": "Plain text description (NO HTML). Engaging, detailed, max 500 words. Include key features, dimensions, materials, condition notes. End with: Per maggiori informazioni non esitate a contattarmi.",
  "price": 9.99,
  "taxonomy_id": 0,
  "who_made": "i_did",
  "when_made": "2020_2025",
  "tags": ["tag1", "tag2", "tag3"],
  "materials": ["material1", "material2"],
  "is_supply": false,
  "quantity": 1
}

IMPORTANT - RESEARCH ONLINE:
Before generating each listing, search the web to:
1. Identify the EXACT product from the photos (brand, model, year, variant)
2. Research current market value for accurate pricing
3. Gather detailed specs for description and tags

ETSY-SPECIFIC RULES:
- title: max 140 chars, keyword-rich for Etsy search, in ${listingLang}
- description: PLAIN TEXT only, no HTML tags. Natural, engaging tone.
- tags: max 13 tags, each max 20 chars, relevant search terms
- who_made: "i_did" | "someone_else" | "collective"
- when_made: "made_to_order" | "2020_2025" | "2010_2019" | "2000_2009" | "before_2000" | "1990s" | "1980s" | "1970s" | "1960s" | "1950s" | "1940s" | "1930s" | "1920s" | "1910s" | "1900s"
- materials: list of materials visible in the product
- is_supply: true only if it's a craft supply
- price: in EUR, reasonable market value (end in .90 or .99)
- taxonomy_id: set to 0 (will be assigned manually)

Respond with ONLY the JSON array, nothing else.`;
}

// ============ ETSY EDIT LISTING ============

async function renderEtsyEditListing(listingId) {
  const listing = state.etsyListings.find(l => l.id === listingId);
  if (!listing) {
    state.etsyEditingId = null;
    renderEtsyView();
    return;
  }

  const container = document.getElementById('ui-container');
  const d = listing.data || {};
  const isPublished = listing.status === 'published' && listing.etsyListingId;

  // Load shipping profiles and return policies if not cached
  if (state.etsyShippingProfiles.length === 0) {
    try { state.etsyShippingProfiles = await api.etsyGetShippingProfiles(); } catch (e) {}
  }
  if (state.etsyReturnPolicies.length === 0) {
    try { state.etsyReturnPolicies = await api.etsyGetReturnPolicies(); } catch (e) {}
  }

  const whoMadeOptions = ETSY_WHO_MADE_OPTIONS.map(o =>
    `<option value="${o.value}" ${d.who_made === o.value ? 'selected' : ''}>${o.label}</option>`
  ).join('');

  const whenMadeOptions = ETSY_WHEN_MADE_OPTIONS.map(o =>
    `<option value="${o.value}" ${d.when_made === o.value ? 'selected' : ''}>${o.label}</option>`
  ).join('');

  const shippingOptions = '<option value="">' + (t('select') || '-- Select --') + '</option>' +
    state.etsyShippingProfiles.map(p =>
      `<option value="${p.shipping_profile_id}" ${d.shipping_profile_id == p.shipping_profile_id ? 'selected' : ''}>${p.title}</option>`
    ).join('');

  const returnOptions = '<option value="">' + (t('select') || '-- Select --') + '</option>' +
    state.etsyReturnPolicies.map(p =>
      `<option value="${p.return_policy_id}" ${d.return_policy_id == p.return_policy_id ? 'selected' : ''}>${p.accepts_returns ? 'Returns accepted' : 'No returns'}</option>`
    ).join('');

  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="etsy-edit-back">&larr;</button>
      <div class="tab active">${escapeHtml(d.title || t('listings_no_title'))}</div>
    </div>
    <div style="padding: 16px; overflow-y: auto; max-height: calc(100vh - 80px);">
      <!-- Photos -->
      <h3>${t('photos') || 'Photos'}</h3>
      <div id="etsy-edit-dropzone" class="drop-zone" style="min-height: 80px; border: 2px dashed var(--border-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 12px;">
        <p class="text-secondary text-small">${t('drop_photos') || 'Drop photos or click to add'}</p>
      </div>
      <div id="etsy-edit-photos" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;"></div>

      <!-- Title -->
      <div class="form-group">
        <label>${t('title') || 'Title'} <span class="text-secondary text-small">(max 140)</span></label>
        <input type="text" id="etsy-edit-title" value="${escapeHtml(d.title || '')}" maxlength="140">
      </div>

      <!-- Description -->
      <div class="form-group">
        <label>${t('description') || 'Description'} <span class="text-secondary text-small">(plain text)</span></label>
        <textarea id="etsy-edit-desc" rows="8" style="font-family: inherit;">${escapeHtml(d.description || '')}</textarea>
      </div>

      <!-- Price & Quantity -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label>${t('price') || 'Price'} (EUR)</label>
          <input type="number" id="etsy-edit-price" value="${d.price || ''}" step="0.01" min="0.20">
        </div>
        <div class="form-group">
          <label>${t('quantity') || 'Quantity'}</label>
          <input type="number" id="etsy-edit-qty" value="${d.quantity || 1}" min="1">
        </div>
      </div>

      <!-- Who Made / When Made -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label>${t('etsy_who_made') || 'Who Made'}</label>
          <select id="etsy-edit-who-made">${whoMadeOptions}</select>
        </div>
        <div class="form-group">
          <label>${t('etsy_when_made') || 'When Made'}</label>
          <select id="etsy-edit-when-made">${whenMadeOptions}</select>
        </div>
      </div>

      <!-- Taxonomy -->
      <div class="form-group">
        <label>${t('etsy_taxonomy') || 'Category'} (Taxonomy ID)</label>
        <input type="number" id="etsy-edit-taxonomy" value="${d.taxonomy_id || ''}" placeholder="e.g. 69150467">
        <p class="text-secondary text-small" style="margin-top: 4px;">Enter Etsy taxonomy ID or use the browse button</p>
        <button class="btn btn-secondary" id="etsy-browse-taxonomy" style="margin-top: 4px;">Browse Categories</button>
      </div>

      <!-- Tags -->
      <div class="form-group">
        <label>${t('etsy_tags') || 'Tags'} <span class="text-secondary text-small">(max 13, comma separated)</span></label>
        <input type="text" id="etsy-edit-tags" value="${(d.tags || []).join(', ')}" placeholder="tag1, tag2, tag3">
      </div>

      <!-- Materials -->
      <div class="form-group">
        <label>${t('etsy_materials') || 'Materials'} <span class="text-secondary text-small">(comma separated)</span></label>
        <input type="text" id="etsy-edit-materials" value="${(d.materials || []).join(', ')}" placeholder="wood, metal, glass">
      </div>

      <!-- Shipping Profile / Return Policy -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label>${t('etsy_shipping_profile') || 'Shipping Profile'}</label>
          <select id="etsy-edit-shipping">${shippingOptions}</select>
        </div>
        <div class="form-group">
          <label>${t('etsy_return_policy') || 'Return Policy'}</label>
          <select id="etsy-edit-return">${returnOptions}</select>
        </div>
      </div>

      <!-- Is Supply -->
      <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="etsy-edit-is-supply" ${d.is_supply ? 'checked' : ''}>
        <label for="etsy-edit-is-supply" style="margin: 0;">${t('etsy_is_supply') || 'Is this a craft supply?'}</label>
      </div>

      <!-- Dimensions -->
      <h3 style="margin-top: 16px;">${t('etsy_dimensions') || 'Dimensions'} <span class="text-secondary text-small">(optional)</span></h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label>Weight (g)</label>
          <input type="number" id="etsy-edit-weight" value="${d.item_weight || ''}" step="0.1" min="0">
        </div>
        <div class="form-group">
          <label>Length (cm)</label>
          <input type="number" id="etsy-edit-length" value="${d.item_length || ''}" step="0.1" min="0">
        </div>
        <div class="form-group">
          <label>Width (cm)</label>
          <input type="number" id="etsy-edit-width" value="${d.item_width || ''}" step="0.1" min="0">
        </div>
        <div class="form-group">
          <label>Height (cm)</label>
          <input type="number" id="etsy-edit-height" value="${d.item_height || ''}" step="0.1" min="0">
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; gap: 8px; margin-top: 20px; padding-bottom: 20px;">
        <button class="btn btn-primary" id="etsy-edit-save">${t('settings_save') || 'Save'}</button>
        ${!isPublished ? `<button class="btn btn-primary" id="etsy-edit-publish" style="background: var(--success-color);">${t('btn_publish') || 'Publish to Etsy'}</button>` : ''}
        ${isPublished ? `<button class="btn btn-primary" id="etsy-edit-update">${t('btn_update') || 'Update on Etsy'}</button>` : ''}
        ${isPublished ? `<button class="btn btn-secondary" id="etsy-edit-deactivate" style="color: var(--error-color);">${t('btn_deactivate') || 'Deactivate'}</button>` : ''}
        ${listing.status === 'waiting_import' ? `<button class="btn btn-secondary" id="etsy-edit-import">${t('import_btn') || 'Import Response'}</button>` : ''}
      </div>
    </div>
  `;

  // Back button
  document.getElementById('etsy-edit-back').addEventListener('click', () => {
    state.etsyEditingId = null;
    state.etsyMode = 'listings';
    renderEtsyView();
  });

  // Render photos
  renderEtsyEditPhotos(listing);

  // Photo drop zone
  const dropzone = document.getElementById('etsy-edit-dropzone');
  dropzone.addEventListener('click', async () => {
    const result = await api.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      for (const fp of result.filePaths) {
        const copied = await api.copyPhoto(fp, listing.id);
        listing.photos.push(copied);
      }
      await saveEtsyListing(listing);
      renderEtsyEditPhotos(listing);
    }
  });

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent-color)'; });
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border-color)'; });
  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-color)';
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(jpe?g|png|gif)$/i.test(f.name));
    for (const f of files) {
      const filePath = webUtils.getPathForFile(f);
      const copied = await api.copyPhoto(filePath, listing.id);
      listing.photos.push(copied);
    }
    await saveEtsyListing(listing);
    renderEtsyEditPhotos(listing);
  });

  // Browse taxonomy
  document.getElementById('etsy-browse-taxonomy').addEventListener('click', async () => {
    await showEtsyTaxonomyBrowser(document.getElementById('etsy-edit-taxonomy'));
  });

  // Save
  document.getElementById('etsy-edit-save').addEventListener('click', async () => {
    collectEtsyFormData(listing);
    await saveEtsyListing(listing);
    showNotification(t('notif_listing_saved') || 'Listing saved');
  });

  // Publish
  const publishBtn = document.getElementById('etsy-edit-publish');
  if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
      collectEtsyFormData(listing);
      await saveEtsyListing(listing);
      await publishEtsyListingInline(listing);
    });
  }

  // Update
  const updateBtn = document.getElementById('etsy-edit-update');
  if (updateBtn) {
    updateBtn.addEventListener('click', async () => {
      collectEtsyFormData(listing);
      await saveEtsyListing(listing);
      showNotification('Updating on Etsy...');
      const result = await api.etsyRevise(listing.etsyListingId, listing);
      if (result.success) {
        listing.syncedAt = Date.now();
        await saveEtsyListing(listing);
        showNotification('Updated on Etsy');
      } else {
        showNotification('Update failed: ' + (result.error || ''), 'error');
      }
    });
  }

  // Deactivate
  const deactivateBtn = document.getElementById('etsy-edit-deactivate');
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', async () => {
      if (!confirm('Deactivate this listing on Etsy?')) return;
      const result = await api.etsyDeactivate(listing.etsyListingId);
      if (result.success) {
        listing.status = 'unlisted';
        await saveEtsyListing(listing);
        showNotification('Listing deactivated');
        renderEtsyEditListing(listingId);
      } else {
        showNotification('Failed: ' + (result.error || ''), 'error');
      }
    });
  }

  // Import response
  const importBtn = document.getElementById('etsy-edit-import');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const content = await api.readResponseFile();
      if (!content) {
        showNotification(t('import_not_found') || 'Response file not found', 'error');
        return;
      }
      const parsed = parseEtsyResponseFile(content);
      if (!parsed) {
        showNotification(t('import_invalid_json') || 'Invalid JSON', 'error');
        return;
      }
      listing.data = parsed;
      listing.status = 'ready';
      await api.deleteResponseFile();
      await saveEtsyListing(listing);
      showNotification(t('notif_listing_saved'));
      renderEtsyEditListing(listingId);
    });
  }
}

function collectEtsyFormData(listing) {
  listing.data = listing.data || {};
  listing.data.title = document.getElementById('etsy-edit-title').value.trim();
  listing.data.description = document.getElementById('etsy-edit-desc').value.trim();
  listing.data.price = parseFloat(document.getElementById('etsy-edit-price').value) || 0;
  listing.data.quantity = parseInt(document.getElementById('etsy-edit-qty').value) || 1;
  listing.data.who_made = document.getElementById('etsy-edit-who-made').value;
  listing.data.when_made = document.getElementById('etsy-edit-when-made').value;
  listing.data.taxonomy_id = parseInt(document.getElementById('etsy-edit-taxonomy').value) || 0;

  const tagsStr = document.getElementById('etsy-edit-tags').value.trim();
  listing.data.tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean).slice(0, 13) : [];

  const matsStr = document.getElementById('etsy-edit-materials').value.trim();
  listing.data.materials = matsStr ? matsStr.split(',').map(m => m.trim()).filter(Boolean) : [];

  const shippingVal = document.getElementById('etsy-edit-shipping').value;
  listing.data.shipping_profile_id = shippingVal ? parseInt(shippingVal) : (state.settings.etsyDefaultShippingProfileId || null);

  const returnVal = document.getElementById('etsy-edit-return').value;
  listing.data.return_policy_id = returnVal ? parseInt(returnVal) : (state.settings.etsyDefaultReturnPolicyId || null);

  listing.data.is_supply = document.getElementById('etsy-edit-is-supply').checked;

  const weight = parseFloat(document.getElementById('etsy-edit-weight').value);
  const length = parseFloat(document.getElementById('etsy-edit-length').value);
  const width = parseFloat(document.getElementById('etsy-edit-width').value);
  const height = parseFloat(document.getElementById('etsy-edit-height').value);
  if (weight > 0) listing.data.item_weight = weight; else delete listing.data.item_weight;
  if (length > 0) listing.data.item_length = length; else delete listing.data.item_length;
  if (width > 0) listing.data.item_width = width; else delete listing.data.item_width;
  if (height > 0) listing.data.item_height = height; else delete listing.data.item_height;

  if (listing.status === 'draft' || listing.status === 'generating' || listing.status === 'waiting_import') {
    if (listing.data.title && listing.data.description && listing.data.price > 0) {
      listing.status = 'ready';
    }
  }
}

function renderEtsyEditPhotos(listing) {
  const container = document.getElementById('etsy-edit-photos');
  if (!container) return;
  container.innerHTML = '';

  (listing.photos || []).forEach((photo, idx) => {
    const thumb = document.createElement('div');
    thumb.style.cssText = 'width: 80px; height: 80px; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid var(--border-color);';
    thumb.innerHTML = '<div style="width:100%;height:100%;background:var(--bg-secondary);"></div>';

    if (photo.isRemote && photo.url) {
      thumb.innerHTML = `<img src="${photo.url}" style="width:100%;height:100%;object-fit:cover;">
        <button data-remove-edit-photo="${idx}" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:11px;line-height:18px;text-align:center;">&times;</button>`;
    } else if (photo.path) {
      api.getPhotoThumbnail(photo.path).then(src => {
        thumb.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;">
          <button data-remove-edit-photo="${idx}" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:11px;line-height:18px;text-align:center;">&times;</button>`;
      }).catch(() => {});
    }

    container.appendChild(thumb);
  });

  container.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('[data-remove-edit-photo]');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.removeEditPhoto);
      const photo = listing.photos[idx];
      if (photo && photo.path && !photo.isRemote) {
        await api.deletePhoto(photo.path);
      }
      listing.photos.splice(idx, 1);
      await saveEtsyListing(listing);
      renderEtsyEditPhotos(listing);
    }
  });
}

// ============ ETSY TAXONOMY BROWSER ============

async function showEtsyTaxonomyBrowser(targetInput) {
  // Load taxonomy if not cached
  if (state.etsyTaxonomy.length === 0) {
    showNotification('Loading Etsy categories...');
    state.etsyTaxonomy = await api.etsyGetTaxonomy();
  }

  // Flatten taxonomy for search
  const flat = [];
  function flattenNode(node, pathParts) {
    const currentPath = [...pathParts, node.name];
    flat.push({ id: node.id, name: node.name, path: currentPath.join(' > '), level: node.level || currentPath.length });
    if (node.children) {
      for (const child of node.children) {
        flattenNode(child, currentPath);
      }
    }
  }
  for (const node of state.etsyTaxonomy) {
    flattenNode(node, []);
  }

  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal" style="max-width: 600px; max-height: 80vh; display: flex; flex-direction: column;">
      <h3>Browse Etsy Categories</h3>
      <input type="text" id="etsy-tax-search" placeholder="Search categories..." style="margin-bottom: 12px; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
      <div id="etsy-tax-results" style="overflow-y: auto; flex: 1; max-height: 400px;"></div>
      <button class="btn btn-secondary" id="etsy-tax-close" style="margin-top: 12px;">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const searchInput = document.getElementById('etsy-tax-search');
  const resultsDiv = document.getElementById('etsy-tax-results');

  function renderResults(query) {
    const filtered = query
      ? flat.filter(n => n.path.toLowerCase().includes(query.toLowerCase())).slice(0, 100)
      : flat.filter(n => n.level <= 1).slice(0, 100);

    resultsDiv.innerHTML = filtered.map(n =>
      `<div class="etsy-tax-item" data-tax-id="${n.id}" style="padding: 6px 8px; cursor: pointer; border-bottom: 1px solid var(--border-color); font-size: 0.85em;" title="${escapeHtml(n.path)}">
        <strong>${n.id}</strong> - ${escapeHtml(n.path)}
      </div>`
    ).join('') || '<p class="text-secondary">No results</p>';
  }

  renderResults('');

  searchInput.addEventListener('input', () => {
    renderResults(searchInput.value.trim());
  });

  resultsDiv.addEventListener('click', (e) => {
    const item = e.target.closest('[data-tax-id]');
    if (item) {
      targetInput.value = item.dataset.taxId;
      overlay.remove();
    }
  });

  document.getElementById('etsy-tax-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// ============ ETSY PUBLISH SINGLE ============

async function publishEtsyListingInline(listing) {
  const overlay = document.createElement('div');
  overlay.className = 'sync-modal-overlay';
  overlay.innerHTML = `
    <div class="sync-modal">
      <h3>${t('publish_title') || 'Publishing to Etsy'}</h3>
      <p class="text-secondary">${t('publish_progress') || 'Creating listing...'}</p>
    </div>
  `;
  document.body.appendChild(overlay);

  try {
    const result = await api.etsyPublish(listing);
    overlay.remove();

    if (result.success) {
      listing.status = 'published';
      listing.etsyListingId = result.listingId;
      listing.updatedAt = Date.now();
      await saveEtsyListing(listing);
      showNotification('Published to Etsy! Listing ID: ' + result.listingId);
      if (state.etsyEditingId) {
        renderEtsyEditListing(listing.id);
      } else {
        renderEtsyListings();
      }
    } else {
      showNotification('Publish failed: ' + (result.error || ''), 'error');
    }
  } catch (e) {
    overlay.remove();
    showNotification('Publish error: ' + e.message, 'error');
  }
}

// ============ ETSY UPLOAD VIEW ============

function renderEtsyUpload() {
  const container = document.getElementById('ui-container');
  container.innerHTML = `
    <div class="tabs">
      <button class="store-back-btn" id="etsy-upload-back">&larr;</button>
      <div class="tab active">${t('etsy_upload') || 'Upload to Etsy'}</div>
    </div>
    <div style="padding: 16px;">
      <p class="text-secondary" style="margin-bottom: 16px;">Listings ready to publish or recently published on Etsy.</p>
      <div id="etsy-upload-list"></div>
    </div>
  `;

  document.getElementById('etsy-upload-back').addEventListener('click', () => {
    state.etsyMode = 'listings';
    renderEtsyView();
  });

  const listContainer = document.getElementById('etsy-upload-list');
  const readyListings = state.etsyListings.filter(l => l.status === 'ready' || l.status === 'published');

  if (readyListings.length === 0) {
    listContainer.innerHTML = '<p class="text-secondary">No listings ready for upload.</p>';
    return;
  }

  readyListings.forEach(listing => {
    const d = listing.data || {};
    const card = document.createElement('div');
    card.style.cssText = 'border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; gap: 12px; align-items: center;';

    const statusColor = listing.status === 'published' ? 'var(--success-color)' : 'var(--warning-color)';
    card.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 600;">${escapeHtml(d.title || 'Untitled')}</div>
        <div class="text-secondary text-small">\u20AC${formatPrice(d.price)} - ${listing.photos ? listing.photos.length : 0} photos</div>
        <span class="status-badge status-${listing.status}" style="margin-top: 4px;">${listing.status}</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary" data-copy-title="${listing.id}">Copy Title</button>
        <button class="btn btn-secondary" data-copy-desc="${listing.id}">Copy Desc</button>
        <button class="btn btn-secondary" data-copy-price="${listing.id}">Copy Price</button>
        ${listing.status === 'ready' ? `<button class="btn btn-primary" data-etsy-publish-single="${listing.id}">Publish</button>` : ''}
      </div>
    `;

    card.querySelector('[data-copy-title]')?.addEventListener('click', () => {
      navigator.clipboard.writeText(d.title || '');
      showNotification(t('notif_copied_title') || 'Title copied');
    });
    card.querySelector('[data-copy-desc]')?.addEventListener('click', () => {
      navigator.clipboard.writeText(d.description || '');
      showNotification(t('notif_copied_desc') || 'Description copied');
    });
    card.querySelector('[data-copy-price]')?.addEventListener('click', () => {
      navigator.clipboard.writeText(String(d.price || ''));
      showNotification(t('notif_copied_price') || 'Price copied');
    });
    const pubBtn = card.querySelector('[data-etsy-publish-single]');
    if (pubBtn) {
      pubBtn.addEventListener('click', () => publishEtsyListingInline(listing));
    }

    listContainer.appendChild(card);
  });
}

// ============ START ============

document.addEventListener('DOMContentLoaded', init);
