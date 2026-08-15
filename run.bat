@echo off
chcp 65001 >nul
echo 启动 Pomodoro Timer...
start "" "node_modules\electron\dist\electron.exe" electron/main.cjs