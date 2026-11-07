@echo off
setlocal enabledelayedexpansion
title Windows 11 Terminal - Standalone Launcher
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Windows 11 Terminal (PowerShell 7.6.9) Local Launcher
echo   Repository: rajghosh06-dev/Programming-Related
echo ====================================================================
echo.

set PORT=8000
set URL=http://localhost:%PORT%

:: Windows Version Detection
set WIN_VER=Windows 10
for /f "tokens=3" %%i in ('reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v CurrentBuildNumber 2^>nul') do (
    if %%i geq 22000 (
        set WIN_VER=Windows 11
    )
)
echo [INFO] Detected OS: %WIN_VER%

:: Windows Terminal (wt.exe) Verification & Auto-Baselining
where wt.exe >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Windows Terminal not found. Checking winget...
    where winget.exe >nul 2>nul
    if %errorlevel% equ 0 (
        echo [*] Installing Windows Terminal via winget...
        winget install --id Microsoft.WindowsTerminal -e --silent --accept-source-agreements --accept-package-agreements
    ) else (
        echo [INFO] Winget not found. Use '/install-winget' or '/install-wt' in terminal for installer scripts.
    )
) else (
    echo [OK] Windows Terminal (wt.exe) verified.
)

:: PowerShell 7 vs 5.1 Verification
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Modern PowerShell 7 (pwsh.exe) verified.
    set PS_BIN=pwsh.exe
) else (
    echo [INFO] Modern PowerShell 7 not found. Using Windows PowerShell 5.1 fallback.
    set PS_BIN=powershell.exe
)

echo.
echo [*] Initializing local HTTP server on port %PORT%...

:: Cleanup any existing process on port 8000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%PORT% ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)

set SERVER_STARTED=0

:: Check Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected Python runtime. Starting server...
    start "PWSH_SRV_8000" /min python -m http.server %PORT%
    set SERVER_STARTED=1
    goto :server_ready
)

:: Check Node.js / npx
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected Node.js / npx runtime. Starting server...
    start "PWSH_SRV_8000" /min npx --yes serve -l %PORT% .
    set SERVER_STARTED=1
    goto :server_ready
)

:: Check PHP
where php >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected PHP CLI runtime. Starting server...
    start "PWSH_SRV_8000" /min php -S localhost:%PORT%
    set SERVER_STARTED=1
    goto :server_ready
)

:: Fallback: Built-in PowerShell HttpListener
echo [OK] Starting built-in Windows PowerShell HttpListener fallback server...
start "PWSH_SRV_8000" /min powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = %PORT%; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:' + $port + '/'); $listener.Start(); while ($listener.IsListening) { try { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $rel = $req.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }; $filePath = Join-Path (Get-Location) $rel.Replace('/', '\'); if (Test-Path $filePath -PathType Leaf) { $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $mime = switch ($ext) { '.html' { 'text/html; charset=utf-8' } '.css' { 'text/css; charset=utf-8' } '.js' { 'application/javascript; charset=utf-8' } '.json' { 'application/json; charset=utf-8' } '.png' { 'image/png' } '.jpg' { 'image/jpeg' } '.svg' { 'image/svg+xml' } default { 'application/octet-stream' } }; $res.ContentType = $mime; $bytes = [System.IO.File]::ReadAllBytes($filePath); $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length); } else { $res.StatusCode = 404; $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found'); $res.OutputStream.Write($msg, 0, $msg.Length); }; $res.OutputStream.Close(); } catch {} }"
set SERVER_STARTED=1

:server_ready
timeout /t 2 /nobreak >nul

:: Desktop App Launch Hierarchy
echo [*] Launching desktop application...

:: Tier 1: Python pywebview
python -c "import webview" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching via pywebview desktop shell...
    python -c "import webview; webview.create_window('PowerShell 7.6.9', '%URL%', width=1100, height=680); webview.start()"
    goto :cleanup
)

:: Tier 2: Edge App Mode (Standalone window)
where msedge.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching standalone Edge App Mode (1100x680)...
    start /wait msedge.exe --app=%URL% --window-size=1100,680
    goto :cleanup
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo [OK] Launching standalone Edge App Mode (1100x680)...
    start /wait "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --window-size=1100,680
    goto :cleanup
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [OK] Launching standalone Edge App Mode (1100x680)...
    start /wait "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --window-size=1100,680
    goto :cleanup
)

:: Tier 3: Chrome App Mode fallback
where chrome.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching Chrome App Mode (1100x680)...
    start /wait chrome.exe --app=%URL% --window-size=1100,680
    goto :cleanup
)

:: Tier 4: Default Browser Fallback
echo [OK] Launching in default web browser...
start "" "%URL%"
echo.
echo ====================================================================
echo   Server is running at %URL%
echo   Press any key in this window to stop server and exit.
echo ====================================================================
pause >nul

:cleanup
echo.
echo [*] Shutting down local server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%PORT% ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)
taskkill /FI "WINDOWTITLE eq PWSH_SRV_8000*" /F >nul 2>nul
echo [OK] Server terminated cleanly.
exit /b 0
