#!/usr/bin/env node
// index.js - Main entry point for Scanner Map
// Handles setup detection and mode switching

const fs = require('fs');
const path = require('path');

// Banner
console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           SCANNER MAP - Real-time Radio Mapping           ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// Configuration paths
const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');
const ENV_PATH = path.join(__dirname, '.env');

/**
 * Check if this is a first-run or setup is incomplete
 */
function isSetupNeeded() {
  // Check if config.json exists
  if (!fs.existsSync(CONFIG_PATH)) {
    return true;
  }
  
  // Check if setup is complete
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return !config.setupComplete;
  } catch (error) {
    return true;
  }
}

/**
 * Check if there's an existing .env that can be migrated
 */
function hasExistingEnv() {
  return fs.existsSync(ENV_PATH);
}

/**
 * Load config.json and inject values into process.env for backwards compatibility
 */
function loadConfigToEnv() {
  const { configManager } = require('./config-manager');
  configManager.init();
  
  const config = configManager.getAll();
  
  // Map config to environment variables for backwards compatibility with bot.js
  const envMapping = {
    // Server
    'BOT_PORT': config.server.botPort || '3306',
    'WEBSERVER_PORT': String(config.server.port || 8080),
    'PUBLIC_DOMAIN': config.server.publicDomain || 'localhost',
    'TIMEZONE': config.server.timezone || 'America/New_York',
    
    // Auth
    'ENABLE_AUTH': String(config.admin.authEnabled || false),
    'WEBSERVER_PASSWORD': config.admin.tempPassword || '',
    
    // Discord
    'DISCORD_ENABLED': String(config.discord.enabled || false),
    'DISCORD_TOKEN': config.discord.token || '',
    'CLIENT_ID': config.discord.clientId || '',
    
    // Transcription
    'TRANSCRIPTION_MODE': config.transcription.mode || 'local',
    'TRANSCRIPTION_DEVICE': config.transcription.device || 'cpu',
    'WHISPER_MODEL': config.transcription.whisperModel || 'large-v3',
    'FASTER_WHISPER_SERVER_URL': config.transcription.remoteUrl || '',
    'OPENAI_TRANSCRIPTION_MODEL': config.transcription.openaiModel || 'whisper-1',
    'ICAD_URL': config.transcription.icadUrl || '',
    'ICAD_API_KEY': config.transcription.icadApiKey || '',
    'ICAD_PROFILE': config.transcription.icadProfile || 'tiny',
    // Auto-install Python packages for local transcription
    'AUTO_UPDATE_PYTHON_PACKAGES': config.transcription.mode === 'local' ? 'true' : 'false',
    
    // Geocoding
    'GEOCODING_PROVIDER': config.geocoding.provider || 'nominatim',
    'LOCATIONIQ_API_KEY': config.geocoding.locationiqKey || '',
    'GOOGLE_MAPS_API_KEY': config.geocoding.googleMapsKey || '',
    'GEOCODING_CITY': config.geocoding.city || '',
    'GEOCODING_STATE': config.geocoding.state || '',
    'GEOCODING_COUNTRY': config.geocoding.country || 'US',
    'GEOCODING_TARGET_COUNTIES': (config.geocoding.counties || []).join(','),
    'TARGET_CITIES_LIST': (config.geocoding.towns || []).join(','),
    
    // AI
    'AI_PROVIDER': config.ai.provider || 'ollama',
    'OLLAMA_URL': config.ai.ollamaUrl || 'http://localhost:11434',
    'OLLAMA_MODEL': config.ai.ollamaModel || 'llama3.1:8b',
    'OPENAI_API_KEY': config.ai.openaiKey || config.transcription.openaiKey || '',
    'OPENAI_MODEL': config.ai.openaiModel || 'gpt-4o-mini',
    'SUMMARY_LOOKBACK_HOURS': String(config.ai.summaryLookbackHours || 1),
    'ASK_AI_LOOKBACK_HOURS': String(config.ai.askAiLookbackHours || 8),
    
    // Storage
    'STORAGE_MODE': config.storage.mode || 'local',
    'S3_ENDPOINT': config.storage.s3Endpoint || '',
    'S3_BUCKET_NAME': config.storage.s3Bucket || '',
    'S3_ACCESS_KEY_ID': config.storage.s3AccessKey || '',
    'S3_SECRET_ACCESS_KEY': config.storage.s3SecretKey || '',
    
    // Talkgroups
    'MAPPED_TALK_GROUPS': (config.talkgroups.mapped || []).join(','),
    'ENABLE_MAPPED_TALK_GROUPS': 'true',
    
    // Two-tone
    'ENABLE_TWO_TONE_MODE': String(config.toneDetection.enabled || false),
    'TWO_TONE_TALK_GROUPS': (config.talkgroups.twoTone?.talkgroups || []).join(','),
    'TWO_TONE_QUEUE_SIZE': String(config.talkgroups.twoTone?.queueSize || 1),
    'TONE_DETECTION_TYPE': config.toneDetection.type || 'auto',
    'TWO_TONE_MIN_TONE_LENGTH': String(config.toneDetection.minToneLength || 0.7),
    'TWO_TONE_MAX_TONE_LENGTH': String(config.toneDetection.maxToneLength || 3.0),
    'TWO_TONE_BW_HZ': '50',
    'TWO_TONE_MIN_PAIR_SEPARATION_HZ': '100',
    'PULSED_MIN_CYCLES': '3',
    'PULSED_MIN_ON_MS': '50',
    'PULSED_MAX_ON_MS': '500',
    'PULSED_MIN_OFF_MS': '25',
    'PULSED_MAX_OFF_MS': '800',
    'PULSED_BANDWIDTH_HZ': '50',
    'LONG_TONE_MIN_LENGTH': '0.5',
    'LONG_TONE_BANDWIDTH_HZ': '75',
    'TONE_DETECTION_THRESHOLD': String(config.toneDetection.threshold || 0.3),
    'TONE_FREQUENCY_BAND': (config.toneDetection.frequencyBand || [300, 1500]).join(','),
    'TONE_TIME_RESOLUTION_MS': String(config.toneDetection.timeResolutionMs || 15),
    
    // API Key file path
    'API_KEY_FILE': 'data/apikeys.json',
  };
  
  // Add talk group descriptions
  for (const [id, desc] of Object.entries(config.talkgroups.descriptions || {})) {
    envMapping[`TALK_GROUP_${id}`] = desc;
  }
  
  // Inject into process.env (only if not already set, env vars take precedence)
  for (const [key, value] of Object.entries(envMapping)) {
    if (!process.env[key] && value) {
      process.env[key] = value;
    }
  }
  
  return config;
}

/**
 * Start in setup mode
 */
async function startSetupMode() {
  try {
    const { startSetupServer } = require('./setup-server');
    const { server } = await startSetupServer();
    
    // Listen for setup completion
    process.on('setup-complete', () => {
      console.log('\n[Setup] Configuration complete! Restarting in normal mode...\n');
      server.close(() => {
        // Restart in normal mode
        startNormalMode();
      });
    });
  } catch (error) {
    console.error('[Startup] Error starting setup server:', error.message);
    throw error;
  }
}

/**
 * Start in normal mode (full bot functionality)
 */
async function startNormalMode() {
  console.log('[Startup] Loading configuration...');
  
  // Load config into environment variables
  const config = loadConfigToEnv();
  
  console.log('[Startup] Configuration loaded successfully');
  console.log(`[Startup] Mode: ${config.transcription.mode} transcription, ${config.ai.provider} AI`);
  
  if (config.discord.enabled) {
    console.log('[Startup] Discord integration: Enabled');
  }
  
  console.log('');
  console.log('[Startup] Starting Scanner Map services...');
  console.log('');
  
  // Now require and run bot.js
  // The environment variables are already set, so bot.js will work
  try {
    require('./bot.js');
  } catch (error) {
    console.error('[Startup] Error starting bot:', error.message);
    console.error('');
    console.error('If this is a configuration issue, you can reset setup by deleting:');
    console.error('  data/config.json');
    console.error('');
    console.error('Then run `node index.js` again to go through setup.');
    process.exit(1);
  }
}

/**
 * Fallback: Manual package installation (like installer does)
 */
function attemptManualNpmInstall() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const packages = [
      'dotenv', 'express', 'sqlite3', 'bcrypt', 'uuid', 'busboy', 'winston',
      'moment-timezone', 'discord.js', '@discordjs/voice', 'prism-media',
      'node-fetch@2', 'socket.io', 'csv-parser', 'form-data', 'aws-sdk',
      'libsodium-wrappers', 'node-cache', 'openai', 'public-ip', 'axios',
      'multer', 'archiver'
    ];
    
    console.log('[Startup] Installing packages manually...');
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
        console.log('[Startup] First attempt failed, retrying...');
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

/**
 * Check and install npm dependencies if needed (following installer pattern)
 */
async function ensureNpmDependencies() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  const criticalPackages = ['express', 'discord.js', 'sqlite3', 'dotenv', 'winston'];
  
  // Function to check if a package is installed
  function isPackageInstalled(packageName) {
    try {
      require.resolve(packageName);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Check if critical packages are installed
  const missingPackages = [];
  for (const pkg of criticalPackages) {
    if (!isPackageInstalled(pkg)) {
      missingPackages.push(pkg);
    }
  }
  
  // If node_modules doesn't exist or packages are missing, install
  if (!fs.existsSync(nodeModulesPath) || missingPackages.length > 0) {
    console.log('[Startup] Checking npm dependencies...');
    
    if (missingPackages.length > 0) {
      console.log(`[Startup] Missing packages detected: ${missingPackages.join(', ')}`);
    } else {
      console.log('[Startup] node_modules not found');
    }
    
    console.log('[Startup] Installing dependencies (this may take a few minutes)...');
    console.log('');
    
    const { spawn } = require('child_process');
    
    // Step 1: Clear npm cache (like installer does)
    console.log('[Startup] Clearing npm cache...');
    await new Promise((resolve) => {
      const cacheProcess = spawn('npm', ['cache', 'clean', '--force'], {
        stdio: 'pipe',
        shell: true,
        cwd: __dirname
      });
      cacheProcess.on('close', resolve);
      cacheProcess.on('error', resolve); // Continue even if cache clear fails
    });
    
    // Step 2: Try installing from package.json first (with --no-audit --no-fund like installer)
    return new Promise((resolve, reject) => {
      console.log('[Startup] Installing from package.json...');
      const installProcess = spawn('npm', ['install', '--no-audit', '--no-fund'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          // Verify packages are installed
          const stillMissing = [];
          for (const pkg of criticalPackages) {
            if (!isPackageInstalled(pkg)) {
              stillMissing.push(pkg);
            }
          }
          
          if (stillMissing.length > 0) {
            console.log('');
            console.log('[Startup] Some packages still missing, trying manual installation...');
            attemptManualNpmInstall()
              .then(() => {
                const finalMissing = [];
                for (const pkg of criticalPackages) {
                  if (!isPackageInstalled(pkg)) {
                    finalMissing.push(pkg);
                  }
                }
                if (finalMissing.length > 0) {
                  console.error('[Startup] WARNING: Some packages may still be missing:', finalMissing.join(', '));
                  console.error('[Startup] Try running: npm install --legacy-peer-deps');
                }
                console.log('');
                console.log('[Startup] Dependencies installation completed!');
                console.log('');
                resolve();
              })
              .catch(reject);
          } else {
            console.log('');
            console.log('[Startup] Dependencies installed successfully!');
            console.log('');
            resolve();
          }
        } else {
          // Package.json install failed, try manual installation
          console.log('');
          console.log('[Startup] Package.json install failed, trying manual installation...');
          attemptManualNpmInstall()
            .then(() => {
              const finalMissing = [];
              for (const pkg of criticalPackages) {
                if (!isPackageInstalled(pkg)) {
                  finalMissing.push(pkg);
                }
              }
              if (finalMissing.length > 0) {
                console.error('[Startup] WARNING: Some packages may still be missing:', finalMissing.join(', '));
                console.error('[Startup] Try running: npm install --legacy-peer-deps');
              }
              console.log('');
              console.log('[Startup] Dependencies installation completed!');
              console.log('');
              resolve();
            })
            .catch(reject);
        }
      });
      
      installProcess.on('error', (err) => {
        console.log('[Startup] Error with package.json install, trying manual installation...');
        attemptManualNpmInstall()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Check and install npm dependencies first
    await ensureNpmDependencies();
    
    // Check if setup is needed
    const needsSetup = isSetupNeeded();
    
    if (needsSetup) {
      console.log('[Startup] Setup wizard required');
      console.log('[Startup] Starting setup server...');
      console.log('');
      
      // Check if we should offer to migrate from .env
      if (hasExistingEnv()) {
        console.log('[Startup] Found existing .env file');
        console.log('[Startup] You can import these settings during setup');
        console.log('');
      }
      
      await startSetupMode();
    } else {
      console.log('[Startup] Setup already complete');
      console.log('[Startup] Starting in normal mode...');
      console.log('');
      await startNormalMode();
    }
  } catch (error) {
    console.error('[Startup] Fatal error:', error.message);
    console.error('');
    console.error('If setup is stuck, you can reset by deleting:');
    console.error('  data/config.json');
    console.error('');
    process.exit(1);
  }
}

// Run
main();

