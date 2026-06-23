const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content, defaultPath) =>
    ipcRenderer.invoke('save-file', { content, defaultPath }),
  loadFile: () =>
    ipcRenderer.invoke('load-file'),
  saveMetadata: (tableName, data) =>
    ipcRenderer.invoke('save-metadata', { tableName, data }),
  loadMetadata: () =>
    ipcRenderer.invoke('load-metadata'),
  deleteMetadata: (tableName) =>
    ipcRenderer.invoke('delete-metadata', { tableName }),
  saveConfig: (config) =>
    ipcRenderer.invoke('save-config', { config }),
  loadConfig: () =>
    ipcRenderer.invoke('load-config'),
  getLogPath: () =>
    ipcRenderer.invoke('get-log-path'),
  openLogDir: () =>
    ipcRenderer.invoke('open-log-dir'),
});
