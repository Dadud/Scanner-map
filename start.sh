#!/bin/bash
# Scanner Map - Linux/Mac Startup Script
# This script installs dependencies and starts the application

echo "========================================"
echo "  Scanner Map - Starting Application"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/3] Checking Node.js version..."
node --version
echo ""

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "[2/3] Installing dependencies (this may take a few minutes)..."
    echo "Note: Using --legacy-peer-deps to handle Discord.js dependencies..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
    echo ""
else
    echo "[2/3] Dependencies already installed, skipping..."
    echo ""
fi

echo "[3/3] Starting Scanner Map..."
echo ""
echo "========================================"
echo "  Application is starting..."
echo "  Open your browser to http://localhost:8082"
echo "  Press Ctrl+C to stop the server"
echo "========================================"
echo ""

node index.js

# If we get here, the application exited
echo ""
echo "Application stopped."

