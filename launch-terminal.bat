@echo off
setlocal enabledelayedexpansion
title Windows 11 Terminal - Standalone Launcher
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Windows 11 Terminal (PowerShell 7.6.9) Local Launcher
echo   Repository: rajghosh06-dev/Programming-Related
echo ====================================================================
echo.

:: Windows Version Detection
set WIN_VER=Windows 10
for /f "tokens=3" %%i in ('reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v CurrentBuildNumber 2^>nul') do (
    if %%i geq 22000 (
        set WIN_VER=Windows 11
    )
)
echo [INFO] Detected OS: %WIN_VER%

:: Windows Terminal [wt.exe] Verification & Auto-Baselining
where wt.exe >nul 2>&1
if errorlevel 1 (
    echo [INFO] Windows Terminal not found. Checking winget...
    where winget.exe >nul 2>&1
    if not errorlevel 1 (
        echo [*] Installing Windows Terminal via winget...
        winget install --id Microsoft.WindowsTerminal -e --silent --accept-source-agreements --accept-package-agreements
        where wt.exe >nul 2>&1
        if not errorlevel 1 (
            echo [OK] Windows Terminal installed and verified.
        ) else (
            echo [INFO] Windows Terminal installed. A terminal restart may be required to refresh PATH.
        )
    ) else (
        echo [INFO] Winget not found. Use '/install-winget' or '/install-wt' in terminal for installer scripts.
    )
) else (
    echo [OK] Windows Terminal [wt.exe] verified.
)

:: PowerShell 7 vs 5.1 Verification
where pwsh.exe >nul 2>&1
if not errorlevel 1 (
    echo [OK] Modern PowerShell 7 [pwsh.exe] verified.
    set PS_BIN=pwsh.exe
) else (
    echo [INFO] Modern PowerShell 7 not found. Using Windows PowerShell 5.1 fallback.
    set PS_BIN=powershell.exe
)

echo.
echo [*] Searching for available local port [8000-8010]...

:: Detect available port without killing unrelated processes
set PORT=
for /f "usebackq" %%p in (`powershell -NoProfile -Command "$port = 8000; while ($port -le 8010) { $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if (-not $conns) { Write-Output $port; break }; $port++ }"`) do set PORT=%%p

if not defined PORT (
    echo [ERR] Ports 8000 through 8010 are all occupied by active processes.
    echo [ERR] Please free a port or close conflicting applications before launching.
    pause
    exit /b 1
)

set HOST=127.0.0.1
set URL=http://%HOST%:%PORT%
echo [OK] Selected available port: %PORT%

echo [*] Initializing local HTTP server on port %PORT%...
set SERVER_PID=

:: Check Python runtime
where python >nul 2>&1
if not errorlevel 1 (
    echo [OK] Detected Python runtime. Starting server...
    for /f "usebackq" %%p in (`powershell -NoProfile -Command "$p = Start-Process -FilePath 'python' -ArgumentList @('-m', 'http.server', '%PORT%', '--bind', '%HOST%') -PassThru -WindowStyle Hidden; if ($p) { $p.Id }"`) do set SERVER_PID=%%p
    goto :server_started
)

:: Check Node.js / npx runtime
where npx.cmd >nul 2>&1
if not errorlevel 1 (
    echo [OK] Detected Node.js / npx runtime. Starting server...
    for /f "usebackq" %%p in (`powershell -NoProfile -Command "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npx', '--yes', 'serve', '-l', 'tcp://%HOST%:%PORT%', '.') -PassThru -WindowStyle Hidden; if ($p) { $p.Id }"`) do set SERVER_PID=%%p
    goto :server_started
)

:: Check PHP CLI runtime
where php.exe >nul 2>&1
if not errorlevel 1 (
    echo [OK] Detected PHP CLI runtime. Starting server...
    for /f "usebackq" %%p in (`powershell -NoProfile -Command "$p = Start-Process -FilePath 'php' -ArgumentList @('-S', '%HOST%:%PORT%') -PassThru -WindowStyle Hidden; if ($p) { $p.Id }"`) do set SERVER_PID=%%p
    goto :server_started
)

:: Fallback: Built-in Windows PowerShell HttpListener
echo [OK] Starting built-in Windows PowerShell HttpListener fallback server...
for /f "usebackq" %%p in (`powershell -NoProfile -Command "$cmd = '$port = %PORT%; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add(''http://%HOST%:'' + $port + ''/''); $listener.Start(); while ($listener.IsListening) { try { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $rel = $req.Url.LocalPath.TrimStart(''/''); if ([string]::IsNullOrEmpty($rel)) { $rel = ''index.html'' }; $filePath = Join-Path (Get-Location) $rel.Replace(''/'', ''\''); if (Test-Path $filePath -PathType Leaf) { $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $mime = switch ($ext) { ''.html'' { ''text/html; charset=utf-8'' } ''.css'' { ''text/css; charset=utf-8'' } ''.js'' { ''application/javascript; charset=utf-8'' } ''.json'' { ''application/json; charset=utf-8'' } ''.png'' { ''image/png'' } ''.jpg'' { ''image/jpeg'' } ''.svg'' { ''image/svg+xml'' } default { ''application/octet-stream'' } }; $res.ContentType = $mime; $bytes = [System.IO.File]::ReadAllBytes($filePath); $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length); } else { $res.StatusCode = 404; $msg = [System.Text.Encoding]::UTF8.GetBytes(''404 Not Found''); $res.OutputStream.Write($msg, 0, $msg.Length); }; $res.OutputStream.Close(); } catch {} }'; $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd) -PassThru -WindowStyle Hidden; if ($p) { $p.Id }"`) do set SERVER_PID=%%p

:server_started
if not defined SERVER_PID (
    echo [ERR] Failed to start local server process.
    pause
    exit /b 1
)
echo [OK] Server process spawned with PID %SERVER_PID%.

:: Bounded server readiness verification [up to 15 seconds]
echo [*] Verifying server readiness at %URL%...
set SERVER_READY=0
for /l %%i in (1,1,15) do (
    if "!SERVER_READY!"=="0" (
        powershell -NoProfile -Command "try { $req = [System.Net.HttpWebRequest]::Create('%URL%'); $req.Timeout = 2000; $res = $req.GetResponse(); if ([int]$res.StatusCode -eq 200) { $res.Close(); exit 0 } else { $res.Close(); exit 1 } } catch { exit 1 }" >nul 2>&1
        if not errorlevel 1 (
            set SERVER_READY=1
        ) else (
            timeout /t 1 /nobreak >nul
        )
    )
)

if not "%SERVER_READY%"=="1" (
    echo [ERR] Local server failed to respond at %URL% within 15 seconds.
    goto :cleanup
)
echo [OK] Local server confirmed responding at %URL%.

:: Desktop App Launch Hierarchy
echo [*] Launching desktop application...

:: Tier 1: Python pywebview
python -c "import webview" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Launching via pywebview desktop shell...
    python -c "import webview; webview.create_window('PowerShell 7.6.9', '%URL%', width=1100, height=680); webview.start()"
    goto :cleanup
)

:: Tier 2: Edge App Mode [Standalone window]
where msedge.exe >nul 2>&1
if not errorlevel 1 (
    echo [OK] Launching standalone Edge App Mode [1100x680]...
    start "" msedge.exe --app=%URL% --window-size=1100,680
    goto :await_exit
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo [OK] Launching standalone Edge App Mode [1100x680]...
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --window-size=1100,680
    goto :await_exit
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [OK] Launching standalone Edge App Mode [1100x680]...
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --window-size=1100,680
    goto :await_exit
)

:: Tier 3: Chrome App Mode fallback
where chrome.exe >nul 2>&1
if not errorlevel 1 (
    echo [OK] Launching Chrome App Mode [1100x680]...
    start "" chrome.exe --app=%URL% --window-size=1100,680
    goto :await_exit
)

:: Tier 4: Default Browser Fallback
echo [OK] Launching in default web browser...
start "" "%URL%"

:await_exit
echo.
echo ====================================================================
echo   [RUNNING] Windows 11 Terminal is active at %URL%
echo.
echo   Keep this launcher window open while using the application.
echo   To stop the server and exit:
echo     1. Close the terminal application window.
echo     2. Press any key in this console window.
echo ====================================================================
pause >nul
goto :cleanup

:cleanup
echo.
echo [*] Shutting down local server...
if defined SERVER_PID (
    echo [*] Terminating owned server process tree [PID: %SERVER_PID%]...
    taskkill /T /F /PID %SERVER_PID% >nul 2>&1
    powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq %SERVER_PID% } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Stop-Process -Id %SERVER_PID% -Force -ErrorAction SilentlyContinue" >nul 2>&1
)
if defined PORT (
    powershell -NoProfile -Command "$retry = 0; while ($retry -lt 10) { $conns = Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue; if (-not $conns) { break }; Start-Sleep -Milliseconds 200; $retry++ }" >nul 2>&1
)
echo [OK] Server terminated cleanly.
exit /b 0
