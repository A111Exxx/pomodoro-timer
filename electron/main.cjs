const { app, BrowserWindow, nativeImage, Tray, Menu, Notification, ipcMain, screen } = require('electron')
const path = require('path')

// Disable GPU cache warnings
app.commandLine.appendSwitch('disable-gpu-cache')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-software-rasterizer')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow = null
let tray = null
let isQuitting = false

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const windowWidth = 400
  const windowHeight = 680
  const x = Math.max(0, width - windowWidth - 20)
  const y = 50

  console.log('[Main] Screen size:', { width, height })
  console.log('[Main] Window position:', { x, y, windowWidth, windowHeight })

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,  // Show only in the tray, not the taskbar
    resizable: false,
    // Use a transparent background on Windows
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Load the packaged renderer in production
    const indexPath = path.join(__dirname, '../dist/index.html')
    console.log('[Main] Loading index.html from:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // Show the window when ready, with a fallback timer.
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] ready-to-show fired, showing window')
    mainWindow?.show()
    console.log('[Main] Window shown, bounds:', mainWindow?.getBounds())
  })

  // Show after three seconds if ready-to-show has not fired.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('[Main] Fallback: showing window after timeout')
      mainWindow.show()
      console.log('[Main] Window shown via fallback, bounds:', mainWindow.getBounds())
    }
  }, 3000)

  // Log load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Window failed to load:', errorCode, errorDescription)
    // Show the window even if loading fails.
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // Keep the window visible when it loses focus.
}

function getIconPath() {
  // Try each possible icon location.
  const candidates = [
    // Development: public folder
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../public/icon.svg'),
    // Production: resources directory
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'icon.svg'),
    // Production: dist directory inside the app archive
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../dist/icon.svg'),
  ]

  for (const candidate of candidates) {
    const icon = nativeImage.createFromPath(candidate)
    if (!icon.isEmpty()) {
      console.log('[Main] Found icon at:', candidate)
      return icon
    }
  }

  console.warn('[Main] No icon found, using empty image')
  return nativeImage.createEmpty()
}

function createTray() {
  const icon = getIconPath()
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow?.show()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Pomodoro Timer')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

// IPC handlers
ipcMain.on('show-notification', (_, title, body) => {
  new Notification({ title, body }).show()
})

ipcMain.on('hide-window', () => {
  mainWindow?.hide()
})

ipcMain.on('quit-app', () => {
  isQuitting = true
  app.quit()
})

ipcMain.on('set-always-on-top', (_, flag) => {
  mainWindow?.setAlwaysOnTop(flag)
})