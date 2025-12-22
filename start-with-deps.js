#!/usr/bin/env node
// Helper script to ensure dependencies are installed before starting

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const nodeModulesPath = path.join(__dirname, 'node_modules');
const packageJsonPath = path.join(__dirname, 'package.json');

// Check if node_modules exists and package.json exists
const nodeModulesExists = fs.existsSync(nodeModulesPath);
const packageJsonExists = fs.existsSync(packageJsonPath);

if (!packageJsonExists) {
  console.error('ERROR: package.json not found!');
  process.exit(1);
}

// If node_modules doesn't exist, install dependencies
if (!nodeModulesExists) {
  console.log('Dependencies not found. Installing...');
  console.log('This may take a few minutes...');
  console.log('');
  
  const installProcess = spawn('npm', ['install', '--legacy-peer-deps'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });
  
  installProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('');
      console.error('ERROR: Failed to install dependencies');
      process.exit(1);
    }
    
    console.log('');
    console.log('Dependencies installed successfully!');
    console.log('');
    startApp();
  });
} else {
  startApp();
}

function startApp() {
  console.log('Starting Scanner Map...');
  console.log('');
  
  const appProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });
  
  appProcess.on('close', (code) => {
    process.exit(code || 0);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    appProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    appProcess.kill('SIGTERM');
  });
}

