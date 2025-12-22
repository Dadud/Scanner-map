#!/bin/bash
# Scanner Map Launcher for Linux
# This script launches Scanner Map from any location

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "  Starting Scanner Map..."
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo ""
    echo "Please install Node.js from https://nodejs.org/ or using your package manager:"
    echo "  Ubuntu/Debian: sudo apt-get install nodejs npm"
    echo "  Fedora/RHEL:   sudo dnf install nodejs npm"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    echo "This may take a few minutes..."
    echo ""
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install dependencies"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo ""
    echo "Dependencies installed successfully!"
    echo ""
fi

# Start the application
echo "Starting Scanner Map..."
echo ""
npm start

# Keep terminal open if there was an error
if [ $? -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "  Scanner Map exited with an error"
    echo "========================================"
    echo ""
    read -p "Press Enter to exit..."
fi

