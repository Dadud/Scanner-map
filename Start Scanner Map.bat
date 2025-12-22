@echo off
REM Scanner Map Launcher for Windows
REM This script launches Scanner Map from any location

cd /d "%~dp0"
echo.
echo ========================================
echo   Starting Scanner Map...
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Dependencies not found. Installing...
    echo This may take a few minutes...
    echo.
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

REM Start the application
echo Starting Scanner Map...
echo.
npm start

REM Keep window open if there was an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   Scanner Map exited with an error
    echo ========================================
    echo.
    pause
)

