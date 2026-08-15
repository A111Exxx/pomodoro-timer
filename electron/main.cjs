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

  mainWindow = new BrowserWindow({
    width: 400,
    height: 680,  // 增加高度防止底部截断
    x: width - 420,
    y: 50,
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // 移除 blur 事件，防止点击其他窗口时自动隐藏
}

function createTray() {
  // Windows 托盘需要 .ico 格式，生产环境用构建后的图标
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon.ico')
    : path.join(process.resourcesPath, 'icon.ico')

  let icon = nativeImage.createFromPath(iconPath)
  // 如果 ico 不存在，回退到 svg
  if (icon.isEmpty()) {
    const svgPath = isDev
      ? path.join(__dirname, '../public/icon.svg')
      : path.join(process.resourcesPath, 'icon.svg')
    icon = nativeImage.createFromPath(svgPath)
  }
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