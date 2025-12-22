// env-migration.js - Migrate existing .env configuration to config.json

const fs = require('fs');
const path = require('path');
const { configManager } = require('./config-manager');

// Mapping from .env variables to config.json paths
const ENV_TO_CONFIG_MAP = {
  // Server settings
  'WEBSERVER_PORT': 'server.port',
  'BOT_PORT': 'server.botPort',
  'PUBLIC_DOMAIN': 'server.publicDomain',
  'TIMEZONE': 'server.timezone',
  
  // Authentication
  'ENABLE_AUTH': { path: 'admin.authEnabled', transform: v => v.toLowerCase() === 'true' },
  'WEBSERVER_PASSWORD': 'admin.tempPassword', // Will be hashed during migration
  
  // Discord
  'DISCORD_TOKEN': 'discord.token',
  'CLIENT_ID': 'discord.clientId',
  
  // Transcription
  'TRANSCRIPTION_MODE': 'transcription.mode',
  'TRANSCRIPTION_DEVICE': 'transcription.device',
  'WHISPER_MODEL': 'transcription.whisperModel',
  'FASTER_WHISPER_SERVER_URL': 'transcription.remoteUrl',
  'OPENAI_TRANSCRIPTION_MODEL': 'transcription.openaiModel',
  'ICAD_URL': 'transcription.icadUrl',
  'ICAD_API_KEY': 'transcription.icadApiKey',
  'ICAD_PROFILE': 'transcription.icadProfile',
  
  // Geocoding
  'LOCATIONIQ_API_KEY': 'geocoding.locationiqKey',
  'GOOGLE_MAPS_API_KEY': 'geocoding.googleMapsKey',
  'GEOCODING_CITY': 'geocoding.city',
  'GEOCODING_STATE': 'geocoding.state',
  'GEOCODING_COUNTRY': 'geocoding.country',
  'GEOCODING_TARGET_COUNTIES': { 
    path: 'geocoding.counties', 
    transform: v => v.split(',').map(c => c.trim()).filter(c => c)
  },
  
  // AI
  'AI_PROVIDER': 'ai.provider',
  'OLLAMA_URL': 'ai.ollamaUrl',
  'OLLAMA_MODEL': 'ai.ollamaModel',
  'OPENAI_API_KEY': 'ai.openaiKey',
  'OPENAI_MODEL': 'ai.openaiModel',
  'SUMMARY_LOOKBACK_HOURS': { path: 'ai.summaryLookbackHours', transform: v => parseFloat(v) || 1 },
  'ASK_AI_LOOKBACK_HOURS': { path: 'ai.askAiLookbackHours', transform: v => parseFloat(v) || 8 },
  
  // Storage
  'STORAGE_MODE': 'storage.mode',
  'S3_ENDPOINT': 'storage.s3Endpoint',
  'S3_BUCKET_NAME': 'storage.s3Bucket',
  'S3_ACCESS_KEY_ID': 'storage.s3AccessKey',
  'S3_SECRET_ACCESS_KEY': 'storage.s3SecretKey',
  
  // Two-tone detection
  'ENABLE_TWO_TONE_MODE': { path: 'toneDetection.enabled', transform: v => v.toLowerCase() === 'true' },
  'TWO_TONE_TALK_GROUPS': { 
    path: 'talkgroups.twoTone.talkgroups', 
    transform: v => v.split(',').map(id => id.trim()).filter(id => id)
  },
  'TWO_TONE_QUEUE_SIZE': { path: 'talkgroups.twoTone.queueSize', transform: v => parseInt(v, 10) || 1 },
  'TONE_DETECTION_TYPE': 'toneDetection.type',
  'TWO_TONE_MIN_TONE_LENGTH': { path: 'toneDetection.minToneLength', transform: v => parseFloat(v) },
  'TWO_TONE_MAX_TONE_LENGTH': { path: 'toneDetection.maxToneLength', transform: v => parseFloat(v) },
  'TONE_DETECTION_THRESHOLD': { path: 'toneDetection.threshold', transform: v => parseFloat(v) },
  'TONE_FREQUENCY_BAND': { 
    path: 'toneDetection.frequencyBand', 
    transform: v => v.split(',').map(n => parseInt(n.trim(), 10))
  },
  'TONE_TIME_RESOLUTION_MS': { path: 'toneDetection.timeResolutionMs', transform: v => parseInt(v, 10) },
  
  // Talkgroups
  'MAPPED_TALK_GROUPS': { 
    path: 'talkgroups.mapped', 
    transform: v => v.split(',').map(id => id.trim()).filter(id => id)
  },
};

/**
 * Parse a .env file into a key-value object
 */
function parseEnvFile(filePath) {
  const result = {};
  
  if (!fs.existsSync(filePath)) {
    return result;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Parse key=value
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Skip if empty or placeholder
    if (!value || value.includes('your_') || value.includes('_here')) continue;
    
    result[key] = value;
  }
  
  return result;
}

/**
 * Extract TALK_GROUP_XXXX mappings from env
 */
function extractTalkGroupDescriptions(envVars) {
  const descriptions = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    if (key.startsWith('TALK_GROUP_') && !key.includes('MAPPED') && !key.includes('TWO_TONE')) {
      const id = key.replace('TALK_GROUP_', '');
      descriptions[id] = value;
    }
  }
  
  return descriptions;
}

/**
 * Migrate from .env file to config.json
 */
async function migrateFromEnv(envPath = '.env') {
  const result = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // Check if .env exists
    if (!fs.existsSync(envPath)) {
      result.error = '.env file not found';
      return result;
    }
    
    // Parse .env file
    const envVars = parseEnvFile(envPath);
    
    if (Object.keys(envVars).length === 0) {
      result.error = 'No valid configuration found in .env file';
      return result;
    }
    
    // Initialize config manager
    configManager.init();
    
    // Map each env var to config
    for (const [envKey, mapping] of Object.entries(ENV_TO_CONFIG_MAP)) {
      if (envVars[envKey]) {
        try {
          let value = envVars[envKey];
          let configPath;
          
          if (typeof mapping === 'string') {
            configPath = mapping;
          } else {
            configPath = mapping.path;
            if (mapping.transform) {
              value = mapping.transform(value);
            }
          }
          
          configManager.set(configPath, value);
          result.imported++;
        } catch (err) {
          result.errors.push(`Error mapping ${envKey}: ${err.message}`);
          result.skipped++;
        }
      }
    }
    
    // Handle TALK_GROUP_XXXX descriptions
    const descriptions = extractTalkGroupDescriptions(envVars);
    if (Object.keys(descriptions).length > 0) {
      configManager.set('talkgroups.descriptions', descriptions);
      result.imported += Object.keys(descriptions).length;
    }
    
    // Handle admin password - hash it
    if (envVars['WEBSERVER_PASSWORD']) {
      const { hash, salt } = configManager.hashPassword(envVars['WEBSERVER_PASSWORD']);
      configManager.set('admin.passwordHash', hash);
      configManager.set('admin.salt', salt);
      configManager.set('admin.username', 'admin');
    }
    
    // Set geocoding provider based on which key is present
    if (envVars['LOCATIONIQ_API_KEY'] && !envVars['GOOGLE_MAPS_API_KEY']) {
      configManager.set('geocoding.provider', 'locationiq');
    } else if (envVars['GOOGLE_MAPS_API_KEY'] && !envVars['LOCATIONIQ_API_KEY']) {
      configManager.set('geocoding.provider', 'google');
    }
    
    // Enable Discord if token is present
    if (envVars['DISCORD_TOKEN']) {
      configManager.set('discord.enabled', true);
    }
    
    // Save configuration
    configManager.save();
    
    result.success = true;
    console.log(`[Migration] Successfully imported ${result.imported} settings from .env`);
    if (result.skipped > 0) {
      console.log(`[Migration] Skipped ${result.skipped} settings due to errors`);
    }
    
    return result;
  } catch (error) {
    result.error = error.message;
    console.error('[Migration] Error:', error.message);
    return result;
  }
}

/**
 * Check if migration is needed (has .env but no config.json)
 */
function shouldMigrate() {
  const hasEnv = fs.existsSync('.env');
  const hasConfig = fs.existsSync(path.join('data', 'config.json'));
  return hasEnv && !hasConfig;
}

module.exports = {
  migrateFromEnv,
  shouldMigrate,
  parseEnvFile,
  ENV_TO_CONFIG_MAP
};

