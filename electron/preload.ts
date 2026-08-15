import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', title, body)
  },
  hideWindow: () => {
    ipcRenderer.send('hide-window')
  },
  setAlwaysOnTop: (flag: boolean) => {
    ipcRenderer.send('set-always-on-top', flag)
  },
})

declare global {
  interface Window {
    electronAPI: {
      showNotification: (title: string, body: string) => void
      hideWindow: () => void
      setAlwaysOnTop: (flag: boolean) => void
    }
  }
}