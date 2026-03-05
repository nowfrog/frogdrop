const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Terminal
  sendToTerminal: (data) => ipcRenderer.send('terminal-input', data),
  onTerminalOutput: (callback) => ipcRenderer.on('terminal-output', (_, data) => callback(data)),
  resizeTerminal: (cols, rows) => ipcRenderer.send('terminal-resize', { cols, rows }),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // eBay
  ebayAuth: () => ipcRenderer.invoke('ebay-auth'),
  ebayPublish: (listing) => ipcRenderer.invoke('ebay-publish', listing),
  ebayUploadPhotos: (photoPaths) => ipcRenderer.invoke('ebay-upload-photos', photoPaths),

  // Files
  getPhotoBase64: (filePath) => ipcRenderer.invoke('get-photo-base64', filePath),

  // Dialog
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
});
