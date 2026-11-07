@echo off
title Cloning for Local Text Indexing
cd /d "%~dp0"
echo [*] Creating local directory tmp\txt-idx...
if not exist "tmp\txt-idx" mkdir "tmp\txt-idx"
echo [*] Cloning repository into tmp\txt-idx...
git clone --depth 1 https://github.com/rajghosh06-dev/Programming-Related.git "tmp\txt-idx"
if %ERRORLEVEL% equ 0 (
    echo [OK] Clone complete. Local files ready in tmp\txt-idx.
) else (
    echo [!] Clone failed. Ensure Git is installed and available in PATH.
)
pause
