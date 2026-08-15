# Pomodoro Timer - 桌面番茄钟

一个美观、轻量的桌面番茄钟应用，基于 Electron + React + Vite 构建。

## ✨ 功能特性

- 🍅 **经典番茄钟** - 25 分钟专注 + 5 分钟短休息
- ⏱️ **三种模式** - 专注工作 / 短暂休息 / 长时间休息
- 🔔 **系统通知** - 时间到自动弹出系统原生通知
- 🔊 **提示音** - 工作/休息结束播放不同音效
- ⚙️ **自定义时长** - 可调整工作、短休息、长休息时长
- 🔄 **自动循环** - 可设置工作结束自动开始休息，休息结束自动开始工作
- 📊 **统计面板** - 记录完成番茄钟数、累计专注时长
- 💾 **数据持久化** - 配置和统计自动保存到本地
- 🎯 **系统托盘** - 关闭窗口最小化到托盘，双击托盘图标显示/隐藏
- ⌨️ **快捷键支持** - 空格键开始/暂停，Ctrl+R 重置，ESC 隐藏窗口
- 🌙 **现代深色主题** - 护眼配色，流畅动画

## 🚀 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发环境（热重载）
npm run electron:dev
```

### 生产版本

```bash
# 构建前端资源
npm run build

# 直接运行（无需打包）
npm start
# 或双击 run.bat
```

## 📦 打包发布

```bash
# 打包为便携版（解决 winCodeSign 缓存问题）
npm run build:dir

# 打包为 NSIS 安装包（需管理员权限）
npm run electron:build
```

> **注意**：Windows 上 `electron-builder` 可能遇到 winCodeSign 缓存问题，建议使用 `npm run build:dir` 生成便携版，或直接用 `npm start` 运行。

## 🛠️ 技术栈

- **Electron 28** - 跨平台桌面应用框架
- **React 18** - UI 框架
- **Vite 5** - 极速构建工具
- **TypeScript** - 类型安全
- **Lucide React** - 精美图标库
- **CSS Variables** - 主题系统

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 开始/暂停计时 |
| `Ctrl + R` | 重置计时器 |
| `ESC` | 隐藏窗口到托盘 |

## 📁 项目结构

```
pomodoro-timer/
├── electron/
│   ├── main.cjs      # Electron 主进程
│   └── preload.cjs   # 预加载脚本
├── src/
│   ├── App.tsx       # 主组件
│   ├── main.tsx      # 入口文件
│   └── index.css     # 样式文件
├── public/
│   └── icon.svg      # 应用图标
├── package.json
├── vite.config.ts
└── run.bat           # Windows 启动脚本
```

## 🎨 自定义配置

在设置面板（齿轮图标）中可调整：

- **专注时长** (1-120 分钟，默认 25)
- **短休息时长** (1-60 分钟，默认 5)
- **长休息时长** (1-60 分钟，默认 15)
- **工作结束自动开始休息**
- **休息结束自动开始工作**
- **启用提示音**

数据自动保存在 `localStorage` 中，重启应用保持不变。

## 📄 许可证

MIT License