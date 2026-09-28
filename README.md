# Pomodoro Timer

A lightweight, elegant desktop Pomodoro timer built with Electron, React, TypeScript, and Vite. It combines an iOS-inspired frosted-glass interface with practical desktop features such as system-tray access, native notifications, configurable work cycles, and persistent statistics.

## Features

- **Three timer modes** — Focus, short break, and long break
- **Classic Pomodoro workflow** — Four completed focus sessions automatically lead to a long break
- **Configurable durations** — Customize focus, short-break, and long-break lengths
- **Automatic transitions** — Optionally start breaks after focus sessions and focus sessions after breaks
- **Session statistics** — Track completed Pomodoros and total focus time
- **Persistent local data** — Settings and statistics are saved in `localStorage` and restored on launch
- **Native desktop notifications** — Get notified when a focus or break session ends
- **Completion sounds** — Different audio cues for focus and break completion, with a mute option
- **System tray integration** — Hide the window to the tray, restore it with a double-click, or quit from the tray menu
- **Always-on-top window** — Keep the timer visible while working in other applications
- **Keyboard shortcuts** — Start, pause, reset, or hide the timer without reaching for the mouse
- **Light and dark appearance** — Uses the operating system's preferred color scheme
- **Frameless, draggable window** — Compact desktop layout positioned near the top-right of the primary display

## Screenshots

_Add screenshots here when available._

## Requirements

- [Node.js](https://nodejs.org/) 18 or later recommended
- npm
- A supported Electron desktop platform: Windows, macOS, or Linux

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development app

This starts the Vite development server and launches Electron with hot reload:

```bash
npm run electron:dev
```

To start only the Vite renderer during frontend development:

```bash
npm run dev
```

### 3. Build and run locally

Build the production renderer bundle:

```bash
npm run build
```

Then launch the built Electron application:

```bash
npm start
```

On Windows, `run.bat` can also be used after building the renderer.

## Packaging

The project uses [electron-builder](https://www.electron.build/) to create distributable applications.

### Unpacked directory build

```bash
npm run build:dir
```

This creates an unpacked application in the `release/` directory and is useful for local testing or when an installer is not required.

### Installer/distributable build

```bash
npm run electron:build
```

The configured targets are:

- **Windows** — x64 NSIS installer and unpacked directory
- **macOS** — DMG
- **Linux** — AppImage

Build artifacts are written to `release/`.

> **Windows note:** If `electron-builder` encounters a `winCodeSign` cache or signing-related problem, use `npm run build:dir` for an unpacked build or run the already-built application with `npm start`.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Start or pause the timer when Settings is closed |
| `Ctrl + R` / `Cmd + R` | Reset the current timer |
| `Escape` | Close Settings and hide the window to the system tray |

## Timer Settings

Open Settings from the gear icon to configure:

- **Focus duration** — 1–120 minutes; default: 25
- **Short-break duration** — 1–60 minutes; default: 5
- **Long-break duration** — 1–60 minutes; default: 15
- **Automatically start breaks** — Start the next break when a focus session ends
- **Automatically start focus sessions** — Start the next focus session when a break ends
- **Completion sound** — Enable or disable timer-end audio cues

A mode's duration can be changed safely while that mode is paused. The current paused timer updates to the new duration immediately.

## Data and Privacy

The application stores configuration and statistics locally in the browser `localStorage` used by the Electron renderer. The current keys are:

- `pomodoro-config`
- `pomodoro-count`
- `pomodoro-total-focus`

No account or remote database is required for normal use. Desktop notifications are delivered through Electron in the packaged app, with the Web Notification API used as a fallback outside Electron.

## Technology Stack

- [Electron 28](https://www.electronjs.org/) — desktop runtime
- [React 18](https://react.dev/) — user interface
- [TypeScript](https://www.typescriptlang.org/) — typed application code
- [Vite 5](https://vitejs.dev/) — development server and build tool
- [lucide-react](https://lucide.dev/) — interface icons
- CSS custom properties — responsive light/dark design system
- Web Audio API — completion sounds

## Project Structure

```text
pomodoro-timer/
├── electron/
│   ├── main.cjs        # Electron main process, window, tray, and IPC handlers
│   ├── main.ts         # Main-process TypeScript source
│   ├── preload.cjs     # Packaged preload entry
│   └── preload.ts      # Secure context-bridge API
├── public/
│   ├── icon.ico        # Windows application icon
│   └── icon.svg        # Source/application icon
├── src/
│   ├── App.tsx         # Timer logic, settings, persistence, and UI
│   ├── index.css       # iOS-inspired design system and themes
│   └── main.tsx        # React entry point
├── index.html          # Renderer HTML template
├── package.json        # Scripts, dependencies, and electron-builder config
├── vite.config.ts      # Vite configuration
└── run.bat             # Windows helper script
```

## Architecture Notes

- The **main process** creates the frameless, transparent, always-on-top window, manages the tray icon, and handles native notifications and window-control IPC.
- The **preload bridge** exposes a small, isolated `electronAPI` to the renderer through `contextBridge`.
- The **renderer** keeps timer state, mode transitions, settings, statistics, and persistence in the main React application component.
- Electron runs with `contextIsolation` enabled, `nodeIntegration` disabled, and sandboxing enabled in the renderer window.

## Development Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run electron:dev` | Run Vite and Electron together in development mode |
| `npm run build` | Build the production renderer bundle into `dist/` |
| `npm run build:dir` | Build and package an unpacked app into `release/` |
| `npm run electron:build` | Build distributable installers/images |
| `npm run preview` | Preview the Vite production build |
| `npm start` | Launch the Electron app using the built renderer |

## License

This project is released under the MIT License.
