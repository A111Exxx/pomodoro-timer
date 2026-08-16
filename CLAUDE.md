# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pomodoro Timer** — An iOS-style desktop Pomodoro timer built with Electron + React + TypeScript + Vite. Features a frosted-glass UI, system tray integration, native notifications, and keyboard shortcuts.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run electron:dev` | Run Electron + Vite concurrently (dev mode) |
| `npm run build` | Build production bundle to `dist/` |
| `npm run build:dir` | Build + package as unpacked directory (`release/`) |
| `npm run electron:build` | Build + package distributables (NSIS/dmg/AppImage) |
| `npm run preview` | Preview production build |
| `npm run start` | Run built Electron app |

## Architecture

### Process Model
- **Main Process** (`electron/main.cjs`): Creates frameless, transparent, always-on-top window; manages system tray; handles IPC for notifications/window control
- **Preload Script** (`electron/preload.ts`): Exposes safe `electronAPI` via `contextBridge` (showNotification, hideWindow, setAlwaysOnTop)
- **Renderer** (`src/App.tsx`): Single React component with all timer logic, settings, and iOS-style UI

### Key Files
```
electron/
  main.cjs      # Main process: window, tray, IPC handlers
  preload.ts    # Secure IPC bridge (contextBridge)
src/
  App.tsx       # Timer logic, UI, settings, persistence
  index.css     # iOS design system (CSS variables, light/dark)
  main.tsx      # React entry point
index.html      # HTML template (loads JetBrains Mono + Inter fonts)
vite.config.ts  # Vite config (React plugin, alias @, base: './')
```

### Data Flow
- Timer state (`mode`, `timeLeft`, `isRunning`, `config`) in React `useState`
- Config & stats persisted to `localStorage` (keys: `pomodoro-config`, `pomodoro-count`, `pomodoro-total-focus`)
- IPC from renderer → main: `show-notification`, `hide-window`, `quit-app`, `set-always-on-top`
- No external state management (Redux/Zustand) — single component is sufficient

## Technology Stack

| Layer | Tech |
|-------|------|
| Framework | Electron 28, React 18, TypeScript 5 |
| Build | Vite 5, electron-builder 24 |
| Styling | Pure CSS (CSS variables, no CSS-in-JS) |
| Icons | lucide-react |
| Fonts | JetBrains Mono (timer), Inter (UI) — loaded via Google Fonts |

## Design System (CSS Variables)

All styling in `src/index.css` uses CSS custom properties defined on `:root` with dark mode support via `@media (prefers-color-scheme: dark)`.

Key categories:
- **Colors**: `--bg-*`, `--text-*`, `--accent*`, `--work-color`, `--break-color`, `--long-break-color`, `--border*`, `--shadow*`
- **Spacing**: 4pt base (`--space-1` = 4px … `--space-12` = 48px)
- **Radius**: `--radius-sm` … `--radius-2xl`, `--radius-full`
- **Typography**: `--font-system` (SF Pro / system), `--font-mono` (JetBrains Mono), `--text-*` sizes, `--weight-*`
- **Transitions**: `--transition-fast`, `--transition-base`, `--transition-spring`

## Timer Logic (App.tsx)

- **Modes**: `work` (25m), `break` (5m), `longBreak` (15m) — configurable
- **Auto-transitions**: After 4 work sessions → long break; configurable auto-start breaks/work
- **Keyboard shortcuts**:
  - `Space` — Start/pause (when settings closed)
  - `Ctrl/Cmd+R` — Reset
  - `Escape` — Close settings / hide to tray
- **Notifications**: Web Notification API (fallback) + Electron native (via IPC)
- **Sound**: Web Audio API (sine wave oscillators, different patterns for work/break end)

## Window Behavior (main.cjs)

- Frameless, transparent, always-on-top, skipTaskbar (tray-only)
- Positioned top-right of primary display
- Click-to-drag via `-webkit-app-region: drag` on title bar
- Close button hides window (to tray) unless `isQuitting`
- Tray: double-click toggles visibility; context menu: show/hide, quit

## Build Output

- `dist/` — Vite build output (renderer)
- `release/` — electron-builder output (NSIS installer, unpacked dir, dmg, AppImage)
- `electron-builder` config in `package.json > build` (appId, icons, targets)

## TypeScript Config

- `tsconfig.json` — Renderer (React, strict, path alias `@/*`)
- `tsconfig.node.json` — Electron main/preload (ESNext, composite)

## Common Tasks

### Add a new timer mode
1. Update `Mode` type in `App.tsx`
2. Add label to `MODE_LABELS`, duration key to `MODE_DURATIONS`, entry to `MODE_ORDER`
3. Add color variables (`--new-mode-color`, `--shadow-new-mode`) in `index.css`
4. Update `progressColor`/`progressShadow` logic in `App.tsx`

### Modify tray/menu behavior
Edit `createTray()` and `Menu.buildFromTemplate` in `electron/main.cjs`

### Add IPC channel
1. Main: `ipcMain.on('channel-name', handler)` in `main.cjs`
2. Preload: Expose via `contextBridge` in `preload.ts`
3. Renderer: Call `window.electronAPI.channelName()`

### Adjust window size/position
Modify `BrowserWindow` options in `createWindow()` (`electron/main.cjs`)

## Notes for Future Work

- No test framework configured — consider adding Vitest/Playwright if needed
- No linting configured — consider ESLint + Prettier
- Single React component; if app grows, split into components/hooks
- Icons in `public/` (icon.ico, icon.svg) — update for branding
- `sharp` in devDependencies for electron-builder icon processing