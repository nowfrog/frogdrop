const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const pty = require('node-pty');
const Store = require('electron-store');
const fs = require('fs');

const { startOAuthFlow, getValidToken } = require('./ebay-auth');
const { createListing, uploadPhoto } = require('./ebay-api');

const store = new Store();
let mainWindow;
let ptyProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

function spawnTerminal() {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME || process.env.USERPROFILE,
    env: process.env
  });

  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', data);
    }
  });
}

// Terminal IPC
ipcMain.on('terminal-input', (_, data) => {
  if (ptyProcess) ptyProcess.write(data);
});

ipcMain.on('terminal-resize', (_, { cols, rows }) => {
  if (ptyProcess) ptyProcess.resize(cols, rows);
});

// Settings IPC
ipcMain.handle('get-settings', () => {
  return store.get('settings', null);
});

ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
  return true;
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
