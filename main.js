const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const pty = require('node-pty');
const Store = require('electron-store');
const fs = require('fs');

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
