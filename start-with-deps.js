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

// Function to install dependencies (following installer pattern)
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Dependencies missing or incomplete. Installing...');
    console.log('This may take a few minutes...');
    console.log('');
    
    // Step 1: Clear npm cache (like Windows installer does)
    console.log('Clearing npm cache...');
    const cacheProcess = spawn('npm', ['cache', 'clean', '--force'], {
      stdio: 'pipe',
      shell: true,
      cwd: __dirname
    });
    
    cacheProcess.on('close', () => {
      // Step 2: Try installing from package.json first (like installer does)
      console.log('Installing dependencies from package.json...');
      attemptInstallFromPackageJson()
        .then(() => {
          // Verify packages are installed
          const stillMissing = checkDependencies();
          if (stillMissing.length > 0) {
            console.log('');
            console.log('Some packages still missing, trying manual installation...');
            attemptManualInstall()
              .then(() => {
                const finalMissing = checkDependencies();
                if (finalMissing.length > 0) {
                  console.error('');
                  console.error('WARNING: Some packages may still be missing:', finalMissing.join(', '));
                  console.error('Try running: npm install --legacy-peer-deps');
                }
                resolve();
              })
              .catch((err) => {
                console.error('');
                console.error('ERROR: Manual installation also failed');
                reject(err);
              });
          } else {
            console.log('');
            console.log('Dependencies installed successfully!');
            console.log('');
            resolve();
          }
        })
        .catch((err) => {
          console.log('');
          console.log('Package.json install failed, trying manual installation...');
          attemptManualInstall()
            .then(() => {
              const finalMissing = checkDependencies();
              if (finalMissing.length > 0) {
                console.error('');
                console.error('WARNING: Some packages may still be missing:', finalMissing.join(', '));
                console.error('Try running: npm install --legacy-peer-deps');
              }
              resolve();
            })
            .catch((err) => {
              console.error('');
              console.error('ERROR: All installation attempts failed');
              reject(err);
            });
        });
    });
    
    cacheProcess.on('error', () => {
      // Continue even if cache clear fails
      attemptInstallFromPackageJson()
        .then(() => resolve())
        .catch(() => {
          attemptManualInstall()
            .then(() => resolve())
            .catch(reject);
        });
    });
  });
}

// Try installing from package.json (with --no-audit --no-fund like installer)
function attemptInstallFromPackageJson() {
  return new Promise((resolve, reject) => {
    const installProcess = spawn('npm', ['install', '--no-audit', '--no-fund'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('npm install from package.json failed'));
      }
    });
    
    installProcess.on('error', reject);
  });
}

// Fallback: Manual package installation (like installer does)
function attemptManualInstall() {
  return new Promise((resolve, reject) => {
    const packages = [
      'dotenv', 'express', 'sqlite3', 'bcrypt', 'uuid', 'busboy', 'winston',
      'moment-timezone', 'discord.js', '@discordjs/voice', 'prism-media',
      'node-fetch@2', 'socket.io', 'csv-parser', 'form-data', 'aws-sdk',
      'libsodium-wrappers', 'node-cache', 'openai', 'public-ip', 'axios',
      'multer', 'archiver'
    ];
    
    console.log('Installing packages manually...');
    const installProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', ...packages], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Try one more time (like installer does)
        console.log('First attempt failed, retrying...');
        const retryProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', ...packages], {
          stdio: 'inherit',
          shell: true,
          cwd: __dirname
        });
        
        retryProcess.on('close', (retryCode) => {
          if (retryCode === 0) {
            resolve();
          } else {
            reject(new Error('Manual installation failed after retry'));
          }
        });
        
        retryProcess.on('error', reject);
      }
    });
    
    installProcess.on('error', reject);
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

