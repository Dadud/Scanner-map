#!/usr/bin/env node
// Helper script to ensure dependencies are installed before starting

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const nodeModulesPath = path.join(__dirname, 'node_modules');
const packageJsonPath = path.join(__dirname, 'package.json');

// Critical packages that must be installed
const criticalPackages = ['express', 'discord.js', 'sqlite3', 'dotenv', 'winston'];

// Check if node_modules exists and package.json exists
const nodeModulesExists = fs.existsSync(nodeModulesPath);
const packageJsonExists = fs.existsSync(packageJsonPath);

if (!packageJsonExists) {
  console.error('ERROR: package.json not found!');
  process.exit(1);
}

// Function to check if a package is installed
function isPackageInstalled(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to check if all critical packages are installed
function checkDependencies() {
  const missingPackages = [];
  
  for (const pkg of criticalPackages) {
    if (!isPackageInstalled(pkg)) {
      missingPackages.push(pkg);
    }
  }
  
  return missingPackages;
}

// Function to install dependencies
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Dependencies missing or incomplete. Installing...');
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
        reject(new Error('npm install failed'));
        return;
      }
      
      console.log('');
      console.log('Dependencies installed successfully!');
      console.log('');
      
      // Verify critical packages are now installed
      const stillMissing = checkDependencies();
      if (stillMissing.length > 0) {
        console.error('WARNING: Some packages may still be missing:', stillMissing.join(', '));
        console.error('Try running: npm install --legacy-peer-deps');
      }
      
      resolve();
    });
    
    installProcess.on('error', (err) => {
      reject(err);
    });
  });
}

// Main check and install logic
async function ensureDependencies() {
  // If node_modules doesn't exist, definitely need to install
  if (!nodeModulesExists) {
    await installDependencies();
    return;
  }
  
  // Check if critical packages are installed
  const missingPackages = checkDependencies();
  
  if (missingPackages.length > 0) {
    console.log('Some dependencies are missing:', missingPackages.join(', '));
    await installDependencies();
  }
}

// Run dependency check
ensureDependencies()
  .then(() => {
    startApp();
  })
  .catch((error) => {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
  });

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

