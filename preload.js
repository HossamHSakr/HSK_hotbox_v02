// Electron preload script: exposes secure APIs to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hotboxAPI', {
  exec: (action, target, options) => ipcRenderer.invoke('hotbox-exec', action, target, options),
  showHotbox: (x, y) => ipcRenderer.send('hotbox-show', x, y),
  hideHotbox: () => ipcRenderer.send('hotbox-hide'),
  getConfig: () => ipcRenderer.invoke('hotbox-get-config'),
  saveConfig: (config) => ipcRenderer.invoke('hotbox-save-config', config),
  getUIStyle: () => ipcRenderer.invoke('hotbox-get-ui-style'),
  saveUIStyle: (uiStyle) => ipcRenderer.invoke('hotbox-save-ui-style', uiStyle),
  onVisibleChanged: (callback) => {
    const handler = (_event, visible) => callback(visible);
    ipcRenderer.on('hotbox-visible', handler);
    return () => ipcRenderer.removeListener('hotbox-visible', handler);
  },
});
