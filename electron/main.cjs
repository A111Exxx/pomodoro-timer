const { app, BrowserWindow, nativeImage, Tray, Menu, Notification, ipcMain, screen } = require('electron')
const path = require('path')

// 禁用 GPU 缓存警告
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
    skipTaskbar: true,  // 隐藏任务栏图标，仅托盘显示
    resizable: false,
    // Windows 上需要设置背景色透明
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
    // 生产环境：加载打包后的 dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html')
    console.log('[Main] Loading index.html from:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // 确保窗口显示：ready-to-show 事件 + 兜底定时器
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] ready-to-show fired, showing window')
    mainWindow?.show()
    console.log('[Main] Window shown, bounds:', mainWindow?.getBounds())
  })

  // 兜底：如果 ready-to-show 没触发（如 dev server 未就绪），3秒后强制显示
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('[Main] Fallback: showing window after timeout')
      mainWindow.show()
      console.log('[Main] Window shown via fallback, bounds:', mainWindow.getBounds())
    }
  }, 3000)

  // 监听加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Window failed to load:', errorCode, errorDescription)
    // 加载失败时也尝试显示窗口（可能显示错误页面）
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

  // 移除 blur 事件，防止点击其他窗口时自动隐藏
}

function getIconPath() {
  // 优先尝试多个可能的路径
  const candidates = [
    // 开发环境：public 文件夹
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../public/icon.svg'),
    // 生产环境：resources 目录（electron-builder 复制 public 到 resources）
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(process.resourcesPath, 'icon.svg'),
    // 生产环境：asar 内部的 dist 目录（vite 复制 public 到 dist）
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
      label: '显示/隐藏',
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
      label: '退出',
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

// IPC 通信
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