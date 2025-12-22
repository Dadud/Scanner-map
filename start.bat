@echo off
REM Scanner Map - Windows Startup Script
REM This script installs dependencies and starts the application

echo ========================================
echo   Scanner Map - Starting Application
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Checking Node.js version...
node --version
echo.

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo [2/3] Installing dependencies (this may take a few minutes)...
    echo Note: Using --legacy-peer-deps to handle Discord.js dependencies...
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
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

node index.js

REM If we get here, the application exited
echo.
echo Application stopped.
pause

