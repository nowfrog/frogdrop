const { app, BrowserWindow, ipcMain, dialog, nativeImage, session } = require('electron');
const path = require('path');
const pty = require('node-pty');
const Store = require('electron-store');
const fs = require('fs');

// Data storage: packaged exe uses %APPDATA%/FROGDROP, dev mode uses __dirname/appdata
const isPackaged = app.isPackaged;
const appRoot = isPackaged
  ? path.join(process.env.APPDATA || app.getPath('userData'), 'FROGDROP')
  : __dirname;
const portableDataDir = isPackaged ? appRoot : path.join(__dirname, 'appdata');
if (!fs.existsSync(portableDataDir)) fs.mkdirSync(portableDataDir, { recursive: true });
app.setPath('userData', portableDataDir);
app.setPath('sessionData', portableDataDir);

const AdmZip = require('adm-zip');
const { startOAuthFlow, getValidToken } = require('./ebay-auth');
const { createListing, uploadPhoto, getCategorySpecifics, getSellerList, getItem, getAllSellerListings, reviseListing, endItem, getAllProfiles } = require('./ebay-api');
const { startOAuthFlow: etsyStartOAuth, getValidToken: etsyGetValidToken } = require('./etsy-auth');
const etsyApi = require('./etsy-api');

const store = new Store({ cwd: appRoot });
let mainWindow;
let ptyProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    icon: path.join(__dirname, 'logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile('index.html');

  // Block the real Fullscreen API on the YouTube partition.
  // Renderer injects a shim so YouTube's fullscreen fills the webview area instead.
  session.fromPartition('persist:youtube').setPermissionRequestHandler((wc, permission, callback) => {
    if (permission === 'fullscreen') return callback(false);
    callback(true);
  });
}

function spawnTerminal() {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: appRoot,
    env: process.env
  });

  let trustHandled = false;
  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', data);
    }
    // Auto-confirm the workspace trust prompt
    if (!trustHandled && data.includes('Trust')) {
      trustHandled = true;
      setTimeout(() => {
        if (ptyProcess) ptyProcess.write('\r');
      }, 500);
    }
  });

  // Auto-launch Claude Code after shell is ready
  setTimeout(() => {
    if (ptyProcess) ptyProcess.write('claude\r');
  }, 1500);
}

// Terminal IPC
ipcMain.on('terminal-input', (_, data) => {
  if (ptyProcess) ptyProcess.write(data);
});

ipcMain.on('terminal-resize', (_, { cols, rows }) => {
  if (ptyProcess) ptyProcess.resize(cols, rows);
});

// Dependency check IPC
ipcMain.handle('check-system-node', async () => {
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('node', ['--version'], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ installed: false });
      resolve({ installed: true, version: (stdout || '').trim() });
    });
  });
});

ipcMain.handle('check-claude-code', async () => {
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('claude', ['--version'], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ installed: false });
      resolve({ installed: true, version: (stdout || '').trim() });
    });
  });
});

ipcMain.handle('install-claude-code', async () => {
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('npm', ['install', '-g', '@anthropic-ai/claude-code'], { timeout: 120000, shell: true }, (err, stdout, stderr) => {
      if (err) return resolve({ success: false, error: (stderr || err.message).substring(0, 200) });
      // Verify installation
      execFile('claude', ['--version'], { timeout: 5000 }, (err2, stdout2) => {
        if (err2) return resolve({ success: false, error: 'Installed but could not verify. Restart the app.' });
        resolve({ success: true, version: (stdout2 || '').trim() });
      });
    });
  });
});

// Settings IPC
ipcMain.handle('get-settings', () => {
  return store.get('settings', null);
});

ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
  return true;
});

// Theme IPC
ipcMain.handle('get-theme', () => {
  return store.get('theme', 'dark');
});

ipcMain.handle('save-theme', (_, theme) => {
  store.set('theme', theme);
  return true;
});

// Language IPC
ipcMain.handle('get-language', () => {
  return store.get('language', 'it');
});

ipcMain.handle('save-language', (_, language) => {
  store.set('language', language);
  return true;
});

// Per-store listing language IPC
ipcMain.handle('get-listing-language', (_, storeName) => {
  return store.get('listingLanguage-' + storeName, 'it');
});

ipcMain.handle('save-listing-language', (_, { storeName, language }) => {
  store.set('listingLanguage-' + storeName, language);
  return true;
});

// App path IPC
ipcMain.handle('get-app-path', () => appRoot);

// Prompt file IPC
ipcMain.handle('write-prompt-file', async (_, content) => {
  const promptPath = path.join(appRoot, '.prompt.md');
  fs.writeFileSync(promptPath, content, 'utf-8');
  return promptPath;
});

// Response file IPC
ipcMain.handle('read-response-file', async () => {
  const responsePath = path.join(appRoot, '.response.json');
  if (fs.existsSync(responsePath)) {
    return fs.readFileSync(responsePath, 'utf-8');
  }
  return null;
});

ipcMain.handle('delete-response-file', async () => {
  const responsePath = path.join(appRoot, '.response.json');
  if (fs.existsSync(responsePath)) fs.unlinkSync(responsePath);
  return true;
});

// Photo copy IPC — resize to max 1800px so Claude Code doesn't hit the 2000px multi-image limit
ipcMain.handle('copy-photo', async (_, { sourcePath, listingId }) => {
  const dir = path.join(appRoot, 'photos', String(listingId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const name = path.basename(sourcePath);
  const destPath = path.join(dir, name);

  const img = nativeImage.createFromPath(sourcePath);
  const size = img.getSize();
  const MAX_DIM = 1800;

  if (size.width > MAX_DIM || size.height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(size.width, size.height);
    const resized = img.resize({
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
      quality: 'best'
    });
    const ext = path.extname(name).toLowerCase();
    if (ext === '.png') {
      fs.writeFileSync(destPath, resized.toPNG());
    } else {
      fs.writeFileSync(destPath, resized.toJPEG(92));
    }
  } else {
    fs.copyFileSync(sourcePath, destPath);
  }

  const relativePath = path.join('photos', String(listingId), name);
  return { path: destPath, relativePath, name, sourcePath };
});

ipcMain.handle('rotate-photo', async (_, { filePath, degrees }) => {
  const img = nativeImage.createFromPath(filePath);
  const size = img.getSize();
  // nativeImage doesn't have rotate, so we use a canvas approach via bitmap
  // We'll re-encode with sharp-like logic using nativeImage's limited API
  // For 90/270, swap dimensions; nativeImage doesn't support rotation natively
  // so we'll use the bitmap buffer directly
  const bitmap = img.toBitmap();
  const w = size.width;
  const h = size.height;
  let newBitmap, newW, newH;

  if (degrees === 90 || degrees === -270) {
    newW = h; newH = w;
    newBitmap = Buffer.alloc(newW * newH * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstIdx = (x * newW + (h - 1 - y)) * 4;
        newBitmap[dstIdx] = bitmap[srcIdx];
        newBitmap[dstIdx + 1] = bitmap[srcIdx + 1];
        newBitmap[dstIdx + 2] = bitmap[srcIdx + 2];
        newBitmap[dstIdx + 3] = bitmap[srcIdx + 3];
      }
    }
  } else if (degrees === -90 || degrees === 270) {
    newW = h; newH = w;
    newBitmap = Buffer.alloc(newW * newH * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstIdx = ((w - 1 - x) * newW + y) * 4;
        newBitmap[dstIdx] = bitmap[srcIdx];
        newBitmap[dstIdx + 1] = bitmap[srcIdx + 1];
        newBitmap[dstIdx + 2] = bitmap[srcIdx + 2];
        newBitmap[dstIdx + 3] = bitmap[srcIdx + 3];
      }
    }
  } else if (degrees === 180 || degrees === -180) {
    newW = w; newH = h;
    newBitmap = Buffer.alloc(newW * newH * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        const dstIdx = ((h - 1 - y) * w + (w - 1 - x)) * 4;
        newBitmap[dstIdx] = bitmap[srcIdx];
        newBitmap[dstIdx + 1] = bitmap[srcIdx + 1];
        newBitmap[dstIdx + 2] = bitmap[srcIdx + 2];
        newBitmap[dstIdx + 3] = bitmap[srcIdx + 3];
      }
    }
  } else {
    return filePath; // no rotation needed
  }

  const rotated = nativeImage.createFromBitmap(newBitmap, { width: newW, height: newH });
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') {
    fs.writeFileSync(filePath, rotated.toPNG());
  } else {
    fs.writeFileSync(filePath, rotated.toJPEG(92));
  }
  return filePath;
});

ipcMain.handle('delete-photo', async (_, filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('delete-listing-photos', async (_, listingId) => {
  const dir = path.join(appRoot, 'photos', String(listingId));
  if (!fs.existsSync(dir)) return true;
  // Retry with delay to handle OneDrive/antivirus file locks
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (err) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 500));
      else console.error('Failed to delete photos dir:', err.message);
    }
  }
  return true;
});

ipcMain.handle('has-local-photos', async (_, listingId) => {
  const dir = path.join(appRoot, 'photos', String(listingId));
  if (!fs.existsSync(dir)) return false;
  const files = fs.readdirSync(dir);
  return files.length > 0;
});

ipcMain.handle('get-lego-render', async (_, listingId) => {
  const dir = path.join(appRoot, 'photos', String(listingId));
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const render = files.find(f => f.toLowerCase().startsWith('lego-render') || f.toLowerCase().startsWith('lego_render'));
  if (!render) return null;
  const fullPath = path.join(dir, render);
  return { path: fullPath, relativePath: path.join('photos', String(listingId), render), name: render };
});

ipcMain.handle('clean-orphan-photos', async () => {
  const photosDir = path.join(appRoot, 'photos');
  if (!fs.existsSync(photosDir)) return 0;
  const listings = store.get('listings', []);
  const vintedListings = store.get('vintedListings', []);
  const wallapopListings = store.get('wallapopListings', []);
  const listingIds = new Set([
    ...listings.map(l => String(l.id)),
    ...vintedListings.map(l => String(l.id)),
    ...wallapopListings.map(l => String(l.id))
  ]);
  const folders = fs.readdirSync(photosDir);
  let removed = 0;
  for (const folder of folders) {
    if (!listingIds.has(folder)) {
      fs.rmSync(path.join(photosDir, folder), { recursive: true, force: true });
      removed++;
    }
  }
  return removed;
});

// Listings CRUD IPC
ipcMain.handle('get-listings', () => store.get('listings', []));

ipcMain.handle('save-listing', (_, listing) => {
  const listings = store.get('listings', []);
  const idx = listings.findIndex(l => l.id === listing.id);
  if (idx >= 0) {
    listings[idx] = listing;
  } else {
    listings.push(listing);
  }
  store.set('listings', listings);
  return true;
});

ipcMain.handle('delete-listing', (_, listingId) => {
  const listings = store.get('listings', []);
  store.set('listings', listings.filter(l => String(l.id) !== String(listingId)));
  return true;
});

// Store selector IPC
ipcMain.handle('get-last-store', () => store.get('lastStore', null));
ipcMain.handle('save-last-store', (_, storeName) => store.set('lastStore', storeName));

// Vinted Listings CRUD IPC
ipcMain.handle('get-vinted-listings', () => store.get('vintedListings', []));

ipcMain.handle('save-vinted-listing', (_, listing) => {
  const listings = store.get('vintedListings', []);
  const idx = listings.findIndex(l => l.id === listing.id);
  if (idx >= 0) listings[idx] = listing;
  else listings.push(listing);
  store.set('vintedListings', listings);
  return listing;
});

ipcMain.handle('delete-vinted-listing', (_, listingId) => {
  const listings = store.get('vintedListings', []);
  store.set('vintedListings', listings.filter(l => String(l.id) !== String(listingId)));
  return true;
});

// Wallapop Listings CRUD IPC
ipcMain.handle('get-wallapop-listings', () => store.get('wallapopListings', []));

ipcMain.handle('save-wallapop-listing', (_, listing) => {
  const listings = store.get('wallapopListings', []);
  const idx = listings.findIndex(l => l.id === listing.id);
  if (idx >= 0) listings[idx] = listing;
  else listings.push(listing);
  store.set('wallapopListings', listings);
  return listing;
});

ipcMain.handle('delete-wallapop-listing', (_, listingId) => {
  const listings = store.get('wallapopListings', []);
  store.set('wallapopListings', listings.filter(l => String(l.id) !== String(listingId)));
  return true;
});

// Etsy Listings CRUD IPC
ipcMain.handle('get-etsy-listings', () => store.get('etsyListings', []));

ipcMain.handle('save-etsy-listing', (_, listing) => {
  const listings = store.get('etsyListings', []);
  const idx = listings.findIndex(l => l.id === listing.id);
  if (idx >= 0) listings[idx] = listing;
  else listings.push(listing);
  store.set('etsyListings', listings);
  return listing;
});

ipcMain.handle('delete-etsy-listing', (_, listingId) => {
  const listings = store.get('etsyListings', []);
  store.set('etsyListings', listings.filter(l => String(l.id) !== String(listingId)));
  return true;
});

// Etsy Auth
ipcMain.handle('etsy-check-auth', () => {
  const tokens = store.get('etsyTokens');
  return !!tokens;
});

ipcMain.handle('etsy-auth', async () => {
  const settings = store.get('settings');
  try {
    await etsyStartOAuth(settings);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Etsy Taxonomy
ipcMain.handle('etsy-get-taxonomy', async () => {
  const settings = store.get('settings');
  try {
    return await etsyApi.getTaxonomyNodes(settings.etsyApiKey);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('etsy-get-taxonomy-properties', async (_, taxonomyId) => {
  const settings = store.get('settings');
  try {
    return await etsyApi.getTaxonomyProperties(taxonomyId, settings.etsyApiKey);
  } catch (e) {
    return [];
  }
});

// Etsy Shipping Profiles & Return Policies
ipcMain.handle('etsy-get-shipping-profiles', async () => {
  const settings = store.get('settings');
  const token = await etsyGetValidToken(settings);
  try {
    const result = await etsyApi.getShippingProfiles(settings.etsyShopId, token, settings.etsyApiKey);
    return result.results || [];
  } catch (e) {
    return [];
  }
});

ipcMain.handle('etsy-get-return-policies', async () => {
  const settings = store.get('settings');
  const token = await etsyGetValidToken(settings);
  try {
    const result = await etsyApi.getReturnPolicies(settings.etsyShopId, token, settings.etsyApiKey);
    return result.results || [];
  } catch (e) {
    return [];
  }
});

// Etsy Publish
ipcMain.handle('etsy-publish', async (_, listing) => {
  const settings = store.get('settings');
  try {
    const result = await etsyApi.createListing(settings.etsyShopId, listing, settings);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('etsy-publish-all', async () => {
  const settings = store.get('settings');
  const listings = store.get('etsyListings', []);
  const ready = listings.filter(l => l.status === 'ready' && !l.etsyListingId);
  const total = ready.length;
  let published = 0, failed = 0;

  for (let i = 0; i < ready.length; i++) {
    const listing = ready[i];
    mainWindow.webContents.send('etsy-publish-all-progress', { current: i + 1, total, currentTitle: listing.data?.title || '' });
    try {
      const result = await etsyApi.createListing(settings.etsyShopId, listing, settings);
      if (result.success) {
        listing.status = 'published';
        listing.etsyListingId = result.listingId;
        listing.updatedAt = Date.now();
        published++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error(`Failed to publish etsy ${listing.id}:`, e.message);
      failed++;
    }
  }

  store.set('etsyListings', listings);
  return { published, failed, total };
});

// Etsy Revise
ipcMain.handle('etsy-revise', async (_, { etsyListingId, listing }) => {
  const settings = store.get('settings');
  try {
    const result = await etsyApi.reviseListing(etsyListingId, listing, settings);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('etsy-revise-all', async (_, filterIds) => {
  const settings = store.get('settings');
  const listings = store.get('etsyListings', []);
  let published = listings.filter(l => l.etsyListingId && l.status === 'published');
  if (filterIds && filterIds.length > 0) {
    published = published.filter(l => filterIds.includes(l.id));
  }
  const total = published.length;
  let updated = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < published.length; i++) {
    const listing = published[i];
    mainWindow.webContents.send('etsy-revise-all-progress', { current: i + 1, total, currentTitle: listing.data?.title || '' });
    try {
      await etsyApi.reviseListing(listing.etsyListingId, listing, settings);
      listing.syncedAt = Date.now();
      updated++;
    } catch (e) {
      failed++;
      errors.push(`${listing.etsyListingId}: ${e.message}`);
    }
    if (i < published.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  store.set('etsyListings', listings);
  return { updated, failed, errors };
});

// Etsy Deactivate
ipcMain.handle('etsy-deactivate', async (_, etsyListingId) => {
  const settings = store.get('settings');
  const token = await etsyGetValidToken(settings);
  try {
    await etsyApi.deactivateListing(etsyListingId, token, settings.etsyApiKey);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Etsy Sync
ipcMain.handle('etsy-sync-listings', async (_, forceRefresh) => {
  const settings = store.get('settings');
  const token = await etsyGetValidToken(settings);
  const apiKey = settings.etsyApiKey;
  const shopId = settings.etsyShopId;

  let added = 0, updated = 0, skipped = 0, failed = 0;
  const errors = [];

  mainWindow.webContents.send('etsy-sync-progress', { phase: 'fetching', current: 0, total: 0, currentTitle: 'Fetching listing list...' });
  const activeListings = await etsyApi.getAllActiveListings(shopId, token, apiKey);
  const total = activeListings.length;

  const listings = store.get('etsyListings', []);
  const byEtsyId = {};
  for (const l of listings) {
    if (l.etsyListingId) byEtsyId[l.etsyListingId] = l;
  }

  for (let i = 0; i < activeListings.length; i++) {
    const etsyListing = activeListings[i];
    mainWindow.webContents.send('etsy-sync-progress', { phase: 'syncing', current: i + 1, total, currentTitle: etsyListing.title });

    const existing = byEtsyId[etsyListing.listing_id];
    if (!forceRefresh && existing && existing.syncedAt && existing.data) {
      const sameTitle = existing.data.title === etsyListing.title;
      const etsyPrice = etsyListing.price ? etsyListing.price.amount / etsyListing.price.divisor : 0;
      const samePrice = String(existing.data.price) === String(etsyPrice);
      const sameQty = String(existing.data.quantity || 1) === String(etsyListing.quantity || 1);
      if (sameTitle && samePrice && sameQty) {
        skipped++;
        continue;
      }
    }

    try {
      const imagesResult = await etsyApi.getListingImages(etsyListing.listing_id, token, apiKey);
      const images = imagesResult.results || [];
      const mapped = etsyApi.mapEtsyListingToLocal(etsyListing, images, existing);

      const idx = listings.findIndex(l => l.id === mapped.id);
      if (idx >= 0) {
        listings[idx] = mapped;
        updated++;
      } else {
        listings.push(mapped);
        added++;
      }
    } catch (e) {
      failed++;
      errors.push(`${etsyListing.listing_id}: ${e.message}`);
    }

    if (i < activeListings.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const activeIds = new Set(activeListings.map(l => l.listing_id));
  let unlisted = 0;
  for (const l of listings) {
    if (l.etsyListingId && l.status === 'published' && !activeIds.has(l.etsyListingId)) {
      l.status = 'unlisted';
      l.updatedAt = Date.now();
      unlisted++;
    }
  }

  store.set('etsyListings', listings);
  mainWindow.webContents.send('etsy-sync-progress', { phase: 'done', current: total, total, currentTitle: '' });

  return { added, updated, skipped, failed, unlisted, errors };
});

// File dialog IPC
ipcMain.handle('show-open-dialog', async (_, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

// Photo base64 IPC
ipcMain.handle('get-photo-base64', async (_, filePath) => {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${buffer.toString('base64')}`;
});

ipcMain.handle('get-photo-thumbnail', async (_, filePath) => {
  const img = nativeImage.createFromPath(filePath);
  const resized = img.resize({ width: 150, height: 150, quality: 'good' });
  const jpeg = resized.toJPEG(70);
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
});

ipcMain.handle('read-directory', async (_, dirPath) => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: fullPath, type: 'folder' });
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (imageExts.includes(ext)) {
        results.push({ name: entry.name, path: fullPath, type: 'image' });
      }
    }
  }
  // Folders first, then images, both alphabetical
  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return results;
});

ipcMain.handle('open-ebay-page', (_, url) => {
  const win = new BrowserWindow({ width: 1100, height: 800, parent: mainWindow });
  win.loadURL(url);
  win.setMenuBarVisibility(false);
  return true;
});

ipcMain.handle('ebay-check-auth', () => {
  const tokens = store.get('ebayTokens');
  return !!(tokens && tokens.access_token);
});

ipcMain.handle('ebay-auth', async () => {
  const settings = store.get('settings');
  if (!settings) throw new Error('Settings not configured');
  try {
    const tokens = await startOAuthFlow(settings);
    return { success: true, tokens };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-categories-csv', () => {
  const csvPath = path.join(__dirname, 'CategoryIDs.csv');
  if (!fs.existsSync(csvPath)) return '';
  return fs.readFileSync(csvPath, 'utf-8');
});

// LEGO data: check if CSV files exist, download if missing
ipcMain.handle('ensure-lego-data', async () => {
  const legoDir = path.join(appRoot, 'lego-data');
  if (!fs.existsSync(legoDir)) fs.mkdirSync(legoDir, { recursive: true });

  const files = [
    { name: 'parts.csv', url: 'https://cdn.rebrickable.com/media/downloads/parts.csv.gz' },
    { name: 'part_categories.csv', url: 'https://cdn.rebrickable.com/media/downloads/part_categories.csv.gz' },
    { name: 'colors.csv', url: 'https://cdn.rebrickable.com/media/downloads/colors.csv.gz' }
  ];

  const zlib = require('zlib');
  const https = require('https');
  const results = [];

  for (const file of files) {
    const filePath = path.join(legoDir, file.name);
    if (fs.existsSync(filePath)) {
      results.push({ name: file.name, status: 'exists' });
      continue;
    }

    try {
      await new Promise((resolve, reject) => {
        https.get(file.url, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const compressed = Buffer.concat(chunks);
            const decompressed = zlib.gunzipSync(compressed);
            fs.writeFileSync(filePath, decompressed);
            resolve();
          });
          response.on('error', reject);
        }).on('error', reject);
      });
      results.push({ name: file.name, status: 'downloaded' });
    } catch (e) {
      results.push({ name: file.name, status: 'error', error: e.message });
    }
  }

  return results;
});

ipcMain.handle('ebay-get-seller-list', async () => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  return getSellerList(token, settings);
});

ipcMain.handle('ebay-get-item', async (_, itemId) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  return getItem(itemId, token, settings);
});

ipcMain.handle('ebay-get-category-specifics', async (_, categoryId) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  return getCategorySpecifics(categoryId, token, settings);
});

ipcMain.handle('ebay-get-all-profiles', async () => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  return getAllProfiles(token, settings);
});

ipcMain.handle('ebay-publish', async (_, listing) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);

  try {
    // Upload photos first
    const photoUrls = [];
    for (const photo of listing.photos) {
      const url = await uploadPhoto(photo.path, token);
      photoUrls.push(url);
    }

    // Create listing
    const result = await createListing(listing, photoUrls, settings);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ebay-publish-all', async () => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  const listings = store.get('listings', []);
  const ready = listings.filter(l => l.status === 'ready' && !l.ebayItemId);
  const total = ready.length;
  let published = 0, failed = 0;

  for (let i = 0; i < ready.length; i++) {
    const listing = ready[i];
    mainWindow.webContents.send('publish-all-progress', { current: i + 1, total, currentTitle: listing.data?.title || '' });
    try {
      const photoUrls = [];
      for (const photo of listing.photos) {
        if (photo.isRemote && photo.url) {
          photoUrls.push(photo.url);
        } else if (photo.path) {
          const url = await uploadPhoto(photo.path, token);
          photoUrls.push(url);
        }
      }
      const result = await createListing(listing, photoUrls, settings);
      if (result.success) {
        listing.status = 'published';
        listing.ebayItemId = result.itemId;
        listing.updatedAt = Date.now();
        published++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error(`Failed to publish ${listing.id}:`, e.message);
      failed++;
    }
  }

  store.set('listings', listings);
  return { published, failed, total };
});

ipcMain.handle('ebay-revise', async (_, { ebayItemId, listing }) => {
  const settings = store.get('settings');
  try {
    // For remote photos, use URLs directly; for local photos, upload first
    const photoUrls = [];
    const token = await getValidToken(settings);
    for (const photo of listing.photos) {
      if (photo.isRemote && photo.url) {
        photoUrls.push(photo.url);
      } else if (photo.path) {
        const url = await uploadPhoto(photo.path, token);
        photoUrls.push(url);
      }
    }
    const result = await reviseListing(ebayItemId, listing, photoUrls, settings);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ebay-end-item', async (_, itemId) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  try {
    const result = await endItem(itemId, token, settings);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ebay-revise-all', async (_, filterIds) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  const listings = store.get('listings', []);
  let published = listings.filter(l => l.ebayItemId && l.status === 'published');
  if (filterIds && filterIds.length > 0) {
    published = published.filter(l => filterIds.includes(l.id));
  }
  const total = published.length;
  let updated = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < published.length; i++) {
    const listing = published[i];
    const title = (listing.data && listing.data.title) || '';
    mainWindow.webContents.send('revise-all-progress', { current: i + 1, total, currentTitle: title });

    try {
      const photoUrls = [];
      for (const photo of (listing.photos || [])) {
        if (photo.isRemote && photo.url) {
          photoUrls.push(photo.url);
        } else if (photo.path) {
          const url = await uploadPhoto(photo.path, token);
          photoUrls.push(url);
        }
      }
      await reviseListing(listing.ebayItemId, listing, photoUrls, settings);
      listing.syncedAt = Date.now();
      updated++;
    } catch (e) {
      failed++;
      errors.push(`${listing.ebayItemId}: ${e.message}`);
    }

    if (i < published.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  store.set('listings', listings);
  return { updated, failed, errors };
});

// ============ SYNC FROM EBAY ============

const REVERSE_CONDITION_MAP = {
  1000: 'NEW',
  1500: 'NEW',
  2000: 'USED_EXCELLENT',
  2500: 'USED_EXCELLENT',
  3000: 'USED_EXCELLENT',
  4000: 'USED_GOOD',
  5000: 'USED_ACCEPTABLE',
  6000: 'USED_ACCEPTABLE',
  7000: 'FOR_PARTS'
};

function mapEbayItemToListing(ebayItem, existingListing, settings) {
  const s = settings || {};
  const photos = (ebayItem.photoUrls || []).map((url, i) => ({
    url,
    path: null,
    relativePath: null,
    name: `ebay-photo-${i + 1}.jpg`,
    isRemote: true
  }));

  const condition = REVERSE_CONDITION_MAP[ebayItem.conditionId] || 'USED_GOOD';

  return {
    id: existingListing ? existingListing.id : String(Date.now()) + '-' + ebayItem.itemId,
    photos,
    data: {
      title: ebayItem.title || '',
      description: ebayItem.description || '',
      category_id: ebayItem.categoryId || '',
      category_path: ebayItem.categoryName || '',
      item_specifics: ebayItem.specifics || {},
      condition,
      condition_description: ebayItem.condition || '',
      suggested_price: ebayItem.price || '',
      suggested_shipping: ebayItem.freeShipping ? '0' : (ebayItem.shippingCost || s.defaultShippingCost || ''),
      shipping_service: ebayItem.shippingService || s.defaultShippingService || '',
      shipping_type: ebayItem.shippingType || s.defaultShippingType || 'Flat',
      free_shipping: !!ebayItem.freeShipping,
      quantity: ebayItem.quantity || 1
    },
    status: 'published',
    createdAt: existingListing ? existingListing.createdAt : (ebayItem.startTime ? new Date(ebayItem.startTime).getTime() : Date.now()),
    updatedAt: Date.now(),
    syncedAt: Date.now(),
    ebayCreatedAt: ebayItem.startTime ? new Date(ebayItem.startTime).getTime() : null,
    ebayItemId: ebayItem.itemId
  };
}

ipcMain.handle('ebay-resync-items', async (_, ebayItemIds) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);
  const listings = store.get('listings', []);
  let updated = 0, failed = 0;

  for (const ebayItemId of ebayItemIds) {
    try {
      const existing = listings.find(l => l.ebayItemId === ebayItemId);
      const details = await getItem(ebayItemId, token, settings);
      const mapped = mapEbayItemToListing(details, existing, settings);
      const idx = listings.findIndex(l => l.ebayItemId === ebayItemId);
      if (idx >= 0) {
        listings[idx] = mapped;
      } else {
        listings.push(mapped);
      }
      updated++;
    } catch (e) {
      failed++;
    }
    if (ebayItemIds.indexOf(ebayItemId) < ebayItemIds.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  store.set('listings', listings);
  return { updated, failed };
});

ipcMain.handle('ebay-sync-listings', async (_, forceRefresh) => {
  const settings = store.get('settings');
  const token = await getValidToken(settings);

  let added = 0, updated = 0, skipped = 0, failed = 0;
  const errors = [];

  // Fetch all active listings
  mainWindow.webContents.send('sync-progress', { phase: 'fetching', current: 0, total: 0, currentTitle: 'Fetching listing list...' });
  const sellerItems = await getAllSellerListings(token, settings);
  const total = sellerItems.length;

  // Index existing local listings by ebayItemId
  const listings = store.get('listings', []);
  const byEbayId = {};
  for (const l of listings) {
    if (l.ebayItemId) byEbayId[l.ebayItemId] = l;
  }

  for (let i = 0; i < sellerItems.length; i++) {
    const item = sellerItems[i];
    mainWindow.webContents.send('sync-progress', { phase: 'syncing', current: i + 1, total, currentTitle: item.title });

    // Skip if already synced and unchanged (unless force refresh)
    const existing = byEbayId[item.itemId];
    if (!forceRefresh && existing && existing.syncedAt && existing.data) {
      const sameTitle = existing.data.title === item.title;
      const samePrice = String(existing.data.suggested_price) === String(item.price);
      const sameQty = String(existing.data.quantity || 1) === String(item.quantityAvailable || 1);
      if (sameTitle && samePrice && sameQty) {
        skipped++;
        continue;
      }
    }

    try {
      const details = await getItem(item.itemId, token, settings);
      const mapped = mapEbayItemToListing(details, existing, settings);

      // Upsert in listings array
      const idx = listings.findIndex(l => l.id === mapped.id);
      if (idx >= 0) {
        listings[idx] = mapped;
        updated++;
      } else {
        listings.push(mapped);
        added++;
      }
    } catch (e) {
      failed++;
      errors.push(`${item.itemId}: ${e.message}`);
    }

    // Delay between API calls
    if (i < sellerItems.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Mark local published listings as 'unlisted' if no longer active on eBay
  const activeEbayIds = new Set(sellerItems.map(i => i.itemId));
  let unlisted = 0;
  for (const l of listings) {
    if (l.ebayItemId && l.status === 'published' && !activeEbayIds.has(l.ebayItemId)) {
      l.status = 'unlisted';
      l.updatedAt = Date.now();
      unlisted++;
    }
  }

  store.set('listings', listings);
  mainWindow.webContents.send('sync-progress', { phase: 'done', current: total, total, currentTitle: '' });

  return { added, updated, skipped, failed, unlisted, errors };
});

// ============ NATIVE FILE DRAG ============

ipcMain.on('native-file-drag', (event, filePaths) => {
  const icon = nativeImage.createFromPath(filePaths[0]).resize({ width: 64, height: 64 });
  event.sender.startDrag({
    files: filePaths,
    icon
  });
});

// ============ BACKUP / IMPORT ============

ipcMain.handle('backup-listings', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup',
    defaultPath: `frogdrop-backup-${new Date().toISOString().slice(0, 10)}.zip`,
    filters: [{ name: 'ZIP', extensions: ['zip'] }]
  });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };

  const ebayListings = store.get('listings', []).filter(l => !l.ebayItemId);
  const vintedListings = store.get('vintedListings', []).filter(l => !l.isPublished);
  const wallapopListings = store.get('wallapopListings', []).filter(l => !l.isPublished);
  const etsyListings = store.get('etsyListings', []).filter(l => !l.etsyListingId);

  const allListings = [...ebayListings, ...vintedListings, ...wallapopListings, ...etsyListings];
  const total = allListings.length;

  const backup = {
    version: 1,
    date: new Date().toISOString(),
    ebayListings,
    vintedListings,
    wallapopListings,
    etsyListings
  };

  const zip = new AdmZip();
  zip.addFile('backup.json', Buffer.from(JSON.stringify(backup, null, 2), 'utf-8'));

  // Add photo folders with progress
  const photosDir = path.join(appRoot, 'photos');
  for (let i = 0; i < allListings.length; i++) {
    const listing = allListings[i];
    const title = (listing.data && (listing.data.title || listing.data.name)) || listing.id;
    mainWindow.webContents.send('backup-progress', { current: i + 1, total, title });
    const listingDir = path.join(photosDir, String(listing.id));
    if (fs.existsSync(listingDir)) {
      const files = fs.readdirSync(listingDir);
      for (const file of files) {
        const filePath = path.join(listingDir, file);
        if (fs.statSync(filePath).isFile()) {
          zip.addLocalFile(filePath, `photos/${listing.id}`);
        }
      }
    }
  }

  mainWindow.webContents.send('backup-progress', { current: total, total, title: '', writing: true });
  zip.writeZip(result.filePath);
  return { success: true, path: result.filePath, count: total };
});

ipcMain.handle('import-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Backup',
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

  const zip = new AdmZip(result.filePaths[0]);
  const jsonEntry = zip.getEntry('backup.json');
  if (!jsonEntry) return { success: false, error: 'backup.json not found in ZIP' };

  const backup = JSON.parse(jsonEntry.getData().toString('utf-8'));
  if (!backup.version) return { success: false, error: 'Invalid backup format' };

  let imported = 0;
  const allBackupListings = [
    ...(backup.ebayListings || []),
    ...(backup.vintedListings || []),
    ...(backup.wallapopListings || []),
    ...(backup.etsyListings || [])
  ];
  const total = allBackupListings.length;

  // Import eBay listings
  if (backup.ebayListings && backup.ebayListings.length) {
    const existing = store.get('listings', []);
    const existingIds = new Set(existing.map(l => String(l.id)));
    for (const listing of backup.ebayListings) {
      if (!existingIds.has(String(listing.id))) {
        if (listing.photos) {
          listing.photos = listing.photos.map(p => {
            if (p.relativePath) {
              p.path = path.join(appRoot, p.relativePath);
            }
            return p;
          });
        }
        existing.push(listing);
        imported++;
      }
      mainWindow.webContents.send('backup-progress', { current: imported, total, title: (listing.data && listing.data.title) || listing.id });
    }
    store.set('listings', existing);
  }

  // Import Vinted listings
  if (backup.vintedListings && backup.vintedListings.length) {
    const existing = store.get('vintedListings', []);
    const existingIds = new Set(existing.map(l => String(l.id)));
    for (const listing of backup.vintedListings) {
      if (!existingIds.has(String(listing.id))) {
        if (listing.photos) {
          listing.photos = listing.photos.map(p => {
            if (p.relativePath) {
              p.path = path.join(appRoot, p.relativePath);
            }
            return p;
          });
        }
        existing.push(listing);
        imported++;
      }
      mainWindow.webContents.send('backup-progress', { current: imported, total, title: (listing.data && listing.data.title) || listing.id });
    }
    store.set('vintedListings', existing);
  }

  // Import Wallapop listings
  if (backup.wallapopListings && backup.wallapopListings.length) {
    const existing = store.get('wallapopListings', []);
    const existingIds = new Set(existing.map(l => String(l.id)));
    for (const listing of backup.wallapopListings) {
      if (!existingIds.has(String(listing.id))) {
        if (listing.photos) {
          listing.photos = listing.photos.map(p => {
            if (p.relativePath) {
              p.path = path.join(appRoot, p.relativePath);
            }
            return p;
          });
        }
        existing.push(listing);
        imported++;
      }
      mainWindow.webContents.send('backup-progress', { current: imported, total, title: (listing.data && listing.data.title) || listing.id });
    }
    store.set('wallapopListings', existing);
  }

  // Import Etsy listings
  if (backup.etsyListings && backup.etsyListings.length) {
    const existing = store.get('etsyListings', []);
    const existingIds = new Set(existing.map(l => String(l.id)));
    for (const listing of backup.etsyListings) {
      if (!existingIds.has(String(listing.id))) {
        if (listing.photos) {
          listing.photos = listing.photos.map(p => {
            if (p.relativePath) {
              p.path = path.join(appRoot, p.relativePath);
            }
            return p;
          });
        }
        existing.push(listing);
        imported++;
      }
      mainWindow.webContents.send('backup-progress', { current: imported, total, title: (listing.data && listing.data.title) || listing.id });
    }
    store.set('etsyListings', existing);
  }

  // Extract photos
  const photoEntries = zip.getEntries().filter(e => e.entryName.startsWith('photos/') && !e.isDirectory);
  mainWindow.webContents.send('backup-progress', { current: total, total, title: '', writing: true });
  for (const entry of photoEntries) {
    const destPath = path.join(appRoot, entry.entryName);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(destPath)) {
      fs.writeFileSync(destPath, entry.getData());
    }
  }

  return { success: true, imported };
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  spawnTerminal();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (ptyProcess) ptyProcess.kill();
});
