const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', title, body)
  },
  hideWindow: () => {
    ipcRenderer.send('hide-window')
  },
  quitApp: () => {
    ipcRenderer.send('quit-app')
  },
  setAlwaysOnTop: (flag) => {
    ipcRenderer.send('set-always-on-top', flag)
  },
})