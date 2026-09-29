import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  X,
  Minimize,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

type Mode = 'work' | 'break' | 'longBreak'

interface TimerConfig {
  work: number
  break: number
  longBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  sound: boolean
}

const DEFAULT_CONFIG: TimerConfig = {
  work: 25,
  break: 5,
  longBreak: 15,
  autoStartBreaks: false,
  autoStartWork: false,
  sound: true,
}

const MODE_LABELS: Record<Mode, string> = {
  work: 'Focus',
  break: 'Short Break',
  longBreak: 'Long Break',
}

const MODE_DURATIONS: Record<Mode, keyof TimerConfig> = {
  work: 'work',
  break: 'break',
  longBreak: 'longBreak',
}

const MODE_ORDER: Mode[] = ['work', 'break', 'longBreak']

export default function App() {
  const [mode, setMode] = useState<Mode>('work')
  const[config, setConfig] = useState<TimerConfig>(() => {
    const saved = localStorage.getItem('pomodoro-config')
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const[completedPomodoros, setCompletedPomodoros] = useState(() => {
    const saved = localStorage.getItem('pomodoro-count')
    return saved ? parseInt(saved, 10) : 0
  })
  const[totalFocusTime, setTotalFocusTime] = useState(() => {
    const saved = localStorage.getItem('pomodoro-total-focus')
    return saved ? parseInt(saved, 10) : 0
  })

  const[timeLeft, setTimeLeft] = useState(config.work * 60)
  const[isRunning, setIsRunning] = useState(false)
  const[progress, setProgress] = useState(0)

  const intervalRef = useRef<number | null>(null)
  const totalTimeRef = useRef(config.work * 60)
  const audioContextRef = useRef<AudioContext | null>(null)
  // Initialize the callback ref before assigning it in an effect.
  const handleTimerCompleteRef = useRef<((mode: Mode) => void) | null>(null)
  const startTimerRef = useRef<(() => void) | null>(null)
  const pauseTimerRef = useRef<(() => void) | null>(null)
  const resetTimerRef = useRef<(() => void) | null>(null)

  // Save settings
  useEffect(() => {
    localStorage.setItem('pomodoro-config', JSON.stringify(config))
  }, [config])

  // Save statistics
  useEffect(() => {
    localStorage.setItem('pomodoro-count', completedPomodoros.toString())
  }, [completedPomodoros])

  useEffect(() => {
    localStorage.setItem('pomodoro-total-focus', totalFocusTime.toString())
  }, [totalFocusTime])

  // Initialize the audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play the completion sound
  const playNotificationSound = useCallback((type: 'workEnd' | 'breakEnd') => {
    if (!config.sound) return

    const ctx = initAudio()
    if (ctx.state === 'suspended') ctx.resume()

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    if (type === 'workEnd') {
      // Work ended: two tones
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
    } else {
      // Break ended: one tone
      oscillator.frequency.setValueAtTime(523, ctx.currentTime)
    }

    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  }, [config.sound, initAudio])

  // Show a system notification
  const showNotification = useCallback((title: string, body: string) => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(title, body)
    } else if (Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }, [])

  // Timer tick
  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setIsRunning(false)
        // Use the current mode to avoid a stale closure.
        handleTimerCompleteRef.current?.(currentModeRef.current)
        return 0
      }
      return prev - 1
    })
  }, [])

  const handleTimerComplete = useCallback((completedMode: Mode) => {
    if (completedMode === 'work') {
      // Record the completed session and select the next mode.
      setCompletedPomodoros((c) => {
        const newCount = c + 1
        const nextMode: Mode = newCount >= 4 ? 'longBreak' : 'break'

        playNotificationSound('workEnd')
        showNotification('Focus session complete!', 'Time for a break.')

        // Start the break automatically
        if (config.autoStartBreaks) {
          setMode(nextMode)
          startTimerRef.current?.()
        } else {
          setMode(nextMode)
        }

        return newCount
      })
      setTotalFocusTime((t) => t + config.work)
    } else {
      // Return to focus mode without adding a completed session.
      playNotificationSound('breakEnd')
      showNotification('Break complete', 'Ready for another focus session?')

      // Start focus automatically
      if (config.autoStartWork) {
        setMode('work')
        startTimerRef.current?.()
      } else {
        setMode('work')
      }
    }
  }, [config, playNotificationSound, showNotification])

  // Keep the current mode available to the completion handler.
  const currentModeRef = useRef(mode)
  useEffect(() => {
    currentModeRef.current = mode
  }, [mode])

  // Update the completion callback ref after it is defined.
  useEffect(() => {
    handleTimerCompleteRef.current = handleTimerComplete
  }, [handleTimerComplete])

  const startTimer = useCallback(() => {
    if (intervalRef.current) return

    totalTimeRef.current = timeLeft || config[MODE_DURATIONS[mode]] * 60
    setIsRunning(true)
    intervalRef.current = window.setInterval(tick, 1000)
  }, [timeLeft, config, mode, tick])

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setIsRunning(false)
    }
  }, [])

  const resetTimer = useCallback(() => {
    pauseTimerRef.current?.()
    const newTime = config[MODE_DURATIONS[mode]] * 60
    setTimeLeft(newTime)
    totalTimeRef.current = newTime
    setProgress(0)
  }, [config, mode])

  // Update callback refs
  useEffect(() => {
    startTimerRef.current = startTimer
  }, [startTimer])
  useEffect(() => {
    pauseTimerRef.current = pauseTimer
  }, [pauseTimer])
  useEffect(() => {
    resetTimerRef.current = resetTimer
  }, [resetTimer])

  // Reset the timer when the mode changes
  useEffect(() => {
    resetTimerRef.current?.()
  }, [mode])

  // Update progress
  useEffect(() => {
    const total = config[MODE_DURATIONS[mode]] * 60
    const pct = ((total - timeLeft) / total) * 100
    setProgress(pct)
  }, [timeLeft, config, mode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showSettings) {
        e.preventDefault()
        isRunning ? pauseTimerRef.current?.() : startTimerRef.current?.()
      }
      if (e.code === 'KeyR' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        resetTimerRef.current?.()
      }
      if (e.code === 'Escape') {
        setShowSettings(false)
        if (window.electronAPI) window.electronAPI.hideWindow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning, showSettings])

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Handle quit confirmation
  const handleQuitConfirm = useCallback((confirmed: boolean) => {
    setShowQuitConfirm(false)
    if (confirmed && window.electronAPI) {
      window.electronAPI.quitApp()
    }
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleConfigChange = (key: keyof TimerConfig, value: number | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    if (key === 'work' && mode === 'work' && !isRunning) {
      setTimeLeft((value as number) * 60)
    } else if (key === 'break' && mode === 'break' && !isRunning) {
      setTimeLeft((value as number) * 60)
    } else if (key === 'longBreak' && mode === 'longBreak' && !isRunning) {
      setTimeLeft((value as number) * 60)
    }
  }

  const strokeDashoffset = 860 - (860 * progress) / 100
  const progressColor = mode === 'work' ? 'var(--work-color)' : mode === 'break' ? 'var(--break-color)' : 'var(--long-break-color)'
  const progressShadow = mode === 'work' ? 'var(--shadow-work)' : mode === 'break' ? 'var(--shadow-break)' : 'var(--shadow-long-break)'

  const currentModeIndex = MODE_ORDER.indexOf(mode)
  const nextMode = MODE_ORDER[(currentModeIndex + 1) % 3]

  return (
    <div className="app">
      {/* Main frosted glass card */}
      <div className="main-card">
        {/* Title Bar */}
        <div className="title-bar">
          <div className="title-bar-left">
            <div className="app-icon" style={{
              width: 28,
              height: 28,
              background: progressColor,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: progressShadow,
            }}>
              <CheckCircle size={16} strokeWidth={3} color="white" />
            </div>
            <span className="app-title">Pomodoro Timer</span>
          </div>
          <div className="title-bar-right">
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              <Settings size={20} />
            </button>
            <button className="icon-btn" onClick={() => window.electronAPI?.hideWindow()} aria-label="Hide to tray">
              <Minimize size={20} />
            </button>
            <button className="icon-btn" onClick={() => setShowQuitConfirm(true)} aria-label="Quit app">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mode Segmented Control */}
        <div className="mode-segmented" role="tablist" aria-label="Timer modes">
          {MODE_ORDER.map((m) => (
            <button
              key={m}
              className={`mode-tab ${m} ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
              role="tab"
              aria-selected={mode === m}
              aria-controls={`${m}-panel`}
            >
              <span>{MODE_LABELS[m]}</span>
            </button>
          ))}
        </div>

        {/* Timer Section */}
        <div className="timer-section">
          <div className="timer-circle">
            <svg className="timer-svg" viewBox="0 0 280 280" aria-hidden="true">
              <circle className="timer-bg-circle" cx="140" cy="140" r="137" />
              <circle
                className="timer-progress-circle"
                cx="140"
                cy="140"
                r="137"
                style={{
                  stroke: progressColor,
                  strokeDashoffset,
                }}
              />
            </svg>
            <div className="timer-content">
              <div className="timer-time" style={{ color: progressColor }}>
                {formatTime(timeLeft)}
              </div>
              <div className="timer-label">{MODE_LABELS[mode]}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <button
              className="control-btn secondary"
              onClick={resetTimer}
              aria-label="Reset timer"
            >
              <RotateCcw size={32} />
            </button>
            <button
              className="control-btn primary"
              onClick={isRunning ? pauseTimer : startTimer}
              aria-label={isRunning ? 'Pause timer' : 'Start timer'}
              style={{ boxShadow: progressShadow }}
            >
              {isRunning ? <Pause size={36} /> : <Play size={36} />}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-value">{completedPomodoros}</div>
            <div className="stat-label">Sessions completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m</div>
            <div className="stat-label">Total focus time</div>
          </div>
        </div>
      </div>

      {/* Settings Bottom Sheet */}
      {showSettings && (
        <>
          <div className="settings-overlay" onClick={() => setShowSettings(false)} />
          <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="settings-grabber" />
            <div className="settings-header">
              <span className="settings-title">Settings</span>
              <button className="settings-close" onClick={() => setShowSettings(false)} aria-label="Close settings">
                <X size={20} />
              </button>
            </div>
            <div className="settings-content">
              <div className="settings-section">
                <div className="settings-section-title">Timer durations (minutes)</div>
                <div className="setting-row">
                  <span className="setting-name">Focus</span>
                  <div className="time-input-group">
                    <input
                      type="number"
                      className="time-input"
                      value={config.work}
                      onChange={(e) => handleConfigChange('work', parseInt(e.target.value) || 1)}
                      min={1}
                      max={120}
                      aria-label="Focus duration in minutes"
                    />
                    <span className="time-unit">min</span>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-name">Short Break</span>
                  <div className="time-input-group">
                    <input
                      type="number"
                      className="time-input"
                      value={config.break}
                      onChange={(e) => handleConfigChange('break', parseInt(e.target.value) || 1)}
                      min={1}
                      max={60}
                      aria-label="Short break duration in minutes"
                    />
                    <span className="time-unit">min</span>
                  </div>
                </div>
                <div className="setting-row">
                  <span className="setting-name">Long Break</span>
                  <div className="time-input-group">
                    <input
                      type="number"
                      className="time-input"
                      value={config.longBreak}
                      onChange={(e) => handleConfigChange('longBreak', parseInt(e.target.value) || 1)}
                      min={1}
                      max={60}
                      aria-label="Long break duration in minutes"
                    />
                    <span className="time-unit">min</span>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">Preferences</div>
                <div className="setting-row">
                  <span className="setting-name">Auto-start breaks</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.autoStartBreaks}
                      onChange={(e) => handleConfigChange('autoStartBreaks', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="setting-row">
                  <span className="setting-name">Auto-start focus</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.autoStartWork}
                      onChange={(e) => handleConfigChange('autoStartWork', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div className="setting-row">
                  <span className="setting-name">Completion sound</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.sound}
                      onChange={(e) => handleConfigChange('sound', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quit Confirmation Dialog - Centered Modal */}
      {showQuitConfirm && (
        <>
          <div className="settings-overlay" onClick={() => handleQuitConfirm(false)} />
          <div
            className="main-card"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '320px',
              maxWidth: 'calc(100% - 32px)',
              maxHeight: 'none',
              margin: 0,
              padding: 'var(--space-6)',
              zIndex: 60,
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quit-dialog-title"
          >
            <div style={{ textAlign: 'center' }}>
              <div
                id="quit-dialog-title"
                style={{
                  fontSize: 'var(--text-headline)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Quit Pomodoro Timer?
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(255, 59, 48, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-4)',
              }}>
                <AlertCircle size={28} color="var(--accent)" />
              </div>
              <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                Are you sure you want to quit?
              </p>
              <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
                The timer will stop. Your stats are saved automatically.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button
                  className="control-btn secondary"
                  onClick={() => handleQuitConfirm(false)}
                  style={{ width: 'auto', padding: '0 var(--space-6)', height: 44 }}
                >
                  Cancel
                </button>
                <button
                  className="control-btn primary"
                  onClick={() => handleQuitConfirm(true)}
                  style={{ width: 'auto', padding: '0 var(--space-6)', height: 44 }}
                >
                  Quit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}