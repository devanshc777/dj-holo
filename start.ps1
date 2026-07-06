# ============================================================
# dj-holo — one-shot startup
# Run:  .\start.ps1        (or right-click → Run with PowerShell)
# Starts the dev server on http://localhost:5199 and opens it.
# ============================================================

Set-Location $PSScriptRoot

# First run only: install deps + generate demo tracks
if (-not (Test-Path "$PSScriptRoot\node_modules")) {
    Write-Host "first run: npm install..." -ForegroundColor Cyan
    npm install
}
if (-not (Test-Path "$PSScriptRoot\public\demo-tracks\neon-drive-120.wav")) {
    Write-Host "generating demo tracks..." -ForegroundColor Cyan
    npm run gen:demos
}

# ------------------------------------------------------------
# >>> PASTE YOUR CUSTOM STARTUP COMMAND(S) HERE <<<
# Anything you want to run alongside the app each time —
# e.g. open your music folder, start OBS, launch a MIDI bridge:
#
#   explorer "C:\Personal\inbox\music"
#   & "C:\path\to\something.exe"
#
# ------------------------------------------------------------

# Open the app in the default browser once the server is up
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5199"
} | Out-Null

# Dev server (Ctrl+C to stop)
npm run dev
