/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly NODE_ENV: 'development' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    electronAPI: {
      showNotification: (title: string, body: string) => void
      hideWindow: () => void
      setAlwaysOnTop: (flag: boolean) => void
    }
  }
}