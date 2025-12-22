#!/usr/bin/env node
// Helper script to ensure dependencies are installed before starting

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const nodeModulesPath = path.join(__dirname, 'node_modules');
const packageJsonPath = path.join(__dirname, 'package.json');

// Critical packages that must be installed (core functionality)
const criticalPackages = ['express', 'sqlite3', 'dotenv', 'winston'];

// Optional packages (only needed for specific features)
// discord.js and @discordjs/opus are only needed if Discord is enabled
// We'll check these separately
const optionalPackages = {
  discord: ['discord.js', '@discordjs/voice']
};

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
      cwd: __dirname
    });
    
    cacheProcess.on('close', () => {
      // Step 2: Try installing from package.json first (like installer does)
      console.log('Installing dependencies from package.json...');
      attemptInstallFromPackageJson()
        .then(() => {
          // Verify critical packages are installed
          const stillMissing = checkDependencies();
          if (stillMissing.length > 0) {
            console.log('');
            console.log('Some critical packages still missing, trying manual installation...');
            attemptManualInstall()
              .then(() => {
                const finalMissing = checkDependencies();
                if (finalMissing.length > 0) {
                  console.error('');
                  console.error('WARNING: Some critical packages may still be missing:', finalMissing.join(', '));
                  console.error('Try running: npm install --legacy-peer-deps');
                  console.error('');
                  console.error('NOTE: @discordjs/opus may fail if Visual Studio build tools are missing.');
                  console.error('This is OK if you are not using Discord features.');
                  console.error('To install build tools: https://visualstudio.microsoft.com/downloads/');
                }
                // Check optional packages and warn
                checkOptionalPackages();
                resolve();
              })
              .catch((err) => {
                console.error('');
                console.error('ERROR: Manual installation also failed');
                reject(err);
              });
          } else {
            console.log('');
            console.log('Critical dependencies installed successfully!');
            // Check optional packages and warn
            checkOptionalPackages();
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
                console.error('WARNING: Some critical packages may still be missing:', finalMissing.join(', '));
                console.error('Try running: npm install --legacy-peer-deps');
              }
              // Check optional packages and warn
              checkOptionalPackages();
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
        .then(() => {
          checkOptionalPackages();
          resolve();
        })
        .catch(() => {
          attemptManualInstall()
            .then(() => {
              checkOptionalPackages();
              resolve();
            })
            .catch(reject);
        });
    });
  });
}

// Check optional packages and warn if missing
function checkOptionalPackages() {
  // Check Discord packages (only warn, don't fail)
  const discordMissing = [];
  for (const pkg of optionalPackages.discord) {
    if (!isPackageInstalled(pkg)) {
      discordMissing.push(pkg);
    }
  }
  
  if (discordMissing.length > 0) {
    console.log('');
    console.log('NOTE: Discord packages are missing:', discordMissing.join(', '));
    console.log('This is OK if you are not using Discord features.');
    if (discordMissing.includes('@discordjs/opus')) {
      console.log('@discordjs/opus requires Visual Studio build tools to compile.');
      console.log('Install: https://visualstudio.microsoft.com/downloads/');
      console.log('Or use: npm install --build-from-source @discordjs/opus');
    }
  }
}

// Try installing from package.json (with --no-audit --no-fund like installer)
function attemptInstallFromPackageJson() {
  return new Promise((resolve, reject) => {
    // Use --legacy-peer-deps to handle Discord.js conflicts
    // Use --ignore-scripts to skip problematic native builds (like opus)
    // We'll install opus separately if needed
    const installProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    installProcess.on('close', (code) => {
      // Even if exit code is non-zero, check if critical packages are installed
      // Some packages like @discordjs/opus may fail but core packages might be OK
      const criticalMissing = checkDependencies();
      if (criticalMissing.length === 0) {
        // Critical packages are installed, that's good enough
        resolve();
      } else if (code === 0) {
        // Exit code was 0 but packages are missing - something is wrong
        reject(new Error(`Critical packages still missing: ${criticalMissing.join(', ')}`));
      } else {
        // Exit code non-zero, but let's see if we can recover with manual install
        reject(new Error('npm install from package.json failed'));
      }
    });
    
    installProcess.on('error', reject);
  });
}

// Fallback: Manual package installation (like installer does)
// Install core packages first, then optional Discord packages separately
function attemptManualInstall() {
  return new Promise((resolve, reject) => {
    // Core packages (required for basic functionality)
    const corePackages = [
      'dotenv', 'express', 'sqlite3', 'bcrypt', 'uuid', 'busboy', 'winston',
      'moment-timezone', 'prism-media', 'node-fetch@2', 'socket.io',
      'csv-parser', 'form-data', 'aws-sdk', 'libsodium-wrappers', 'node-cache',
      'openai', 'public-ip', 'axios', 'multer', 'archiver'
    ];
    
    // Discord packages (optional, may fail on Windows without build tools)
    const discordPackages = ['discord.js', '@discordjs/voice'];
    
    console.log('Installing core packages manually...');
    const installProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', ...corePackages], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    installProcess.on('close', (code) => {
      if (code === 0) {
        // Core packages installed, try Discord packages separately
        console.log('');
        console.log('Installing Discord packages (optional)...');
        const discordProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', ...discordPackages], {
          stdio: 'inherit',
          cwd: __dirname
        });
        
        discordProcess.on('close', (discordCode) => {
          if (discordCode === 0) {
            resolve();
          } else {
            console.log('');
            console.log('WARNING: Discord packages failed to install (this is OK if not using Discord)');
            console.log('If you need Discord features, install Visual Studio build tools:');
            console.log('https://visualstudio.microsoft.com/downloads/');
            // Still resolve - core packages are installed
            resolve();
          }
        });
        
        discordProcess.on('error', () => {
          // Continue even if Discord install fails
          resolve();
        });
      } else {
        // Try one more time (like installer does)
        console.log('First attempt failed, retrying...');
        const retryProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', ...corePackages], {
          stdio: 'inherit',
          cwd: __dirname
        });
        
        retryProcess.on('close', (retryCode) => {
          if (retryCode === 0) {
            // Try Discord packages
            const discordProcess = spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund', ...discordPackages], {
              stdio: 'inherit',
              cwd: __dirname
            });
            discordProcess.on('close', () => resolve());
            discordProcess.on('error', () => resolve());
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

