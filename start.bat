@echo off
REM Scanner Map - Windows Startup Script
REM This script installs dependencies and starts the application

REM Keep window open on errors and enable delayed expansion
setlocal enabledelayedexpansion

REM Change to script directory (in case run from different location)
cd /d "%~dp0"

echo ========================================
echo   Scanner Map - Starting Application
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking Node.js version...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to run Node.js
    echo.
    pause
    exit /b 1
)
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo [2/3] Installing dependencies (this may take a few minutes)...
    echo Note: Using --legacy-peer-deps to handle Discord.js dependencies...
    echo.
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies
        echo Please check the error messages above
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
) else (
    echo [2/3] Dependencies already installed, skipping...
    echo.
)

echo [3/3] Starting Scanner Map...
echo.
echo ========================================
echo   Application is starting...
echo   Open your browser to http://localhost:8082
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

REM Run the application
node index.js
set EXIT_CODE=%ERRORLEVEL%

REM If we get here, the application exited
echo.
echo ========================================
if %EXIT_CODE% EQU 0 (
    echo Application stopped normally.
) else (
    echo Application exited with error code: %EXIT_CODE%
    echo Check the error messages above for details.
)
echo ========================================
echo.
pause
exit /b %EXIT_CODE%

