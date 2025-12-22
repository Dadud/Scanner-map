// config-manager.js - Centralized configuration management with JSON storage
// Handles reading, writing, validating, and encrypting configuration

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration file paths
const CONFIG_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SECRET_FILE = path.join(CONFIG_DIR, '.secret');

// Default configuration structure
const DEFAULT_CONFIG = {
  version: 1,
  setupComplete: false,
  admin: {
    username: 'admin',
    passwordHash: null,
    salt: null,
    authEnabled: false
  },
  server: {
    port: 8080,
    publicDomain: 'localhost',
    timezone: 'America/New_York'
  },
  map: {
    center: [39.0, -76.9],
    zoom: 13,
    maxZoom: 18,
    minZoom: 6
  },
  apiKeys: {
    scanner: null, // Will be auto-generated
    scannerHash: null
  },
  transcription: {
    enabled: true,
    mode: 'local', // local, remote, openai, icad
    device: 'cpu', // cpu, cuda
    whisperModel: 'large-v3',
    remoteUrl: 'http://localhost:8000',
    openaiKey: null,
    openaiModel: 'whisper-1',
    icadUrl: 'http://127.0.0.1:8080',
    icadApiKey: null,
    icadProfile: 'tiny'
  },
  geocoding: {
    enabled: true,
    provider: 'nominatim', // nominatim, locationiq, google (nominatim is free, no API key required)
    locationiqKey: null,
    googleMapsKey: null,
    city: '',
    state: '',
    country: 'US',
    counties: [],
    towns: [] // List of town/city names for AI context
  },
  ai: {
    enabled: true,
    provider: 'ollama', // ollama, openai
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1:8b',
    openaiKey: null,
    openaiModel: 'gpt-4o-mini',
    summaryLookbackHours: 1,
    askAiLookbackHours: 8
  },
  discord: {
    enabled: false,
    token: null,
    clientId: null,
    channels: {},
    keywords: []
  },
  talkgroups: {
    mapped: [],
    descriptions: {},
    twoTone: {
      enabled: false,
      talkgroups: [],
      queueSize: 1
    }
  },
  storage: {
    mode: 'local', // local, s3
    s3Endpoint: null,
    s3Bucket: null,
    s3AccessKey: null,
    s3SecretKey: null
  },
  toneDetection: {
    enabled: false,
    type: 'auto',
    minToneLength: 0.7,
    maxToneLength: 3.0,
    bandwidthHz: 50,
    minPairSeparationHz: 100,
    threshold: 0.3,
    frequencyBand: [300, 1500],
    timeResolutionMs: 15
  }
};

// Encryption utilities
class ConfigEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secret = this._getOrCreateSecret();
  }

  _getOrCreateSecret() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      if (fs.existsSync(SECRET_FILE)) {
        return fs.readFileSync(SECRET_FILE, 'utf8').trim();
      }

      // Generate new secret
      const secret = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
      return secret;
    } catch (error) {
      console.error('Error managing encryption secret:', error.message);
      // Fallback to a derived key (less secure but allows operation)
      return crypto.createHash('sha256').update(process.cwd()).digest('hex');
    }
  }

  encrypt(text) {
    if (!text) return null;
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.secret, 'salt', 32);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      return `encrypted:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error.message);
      return null;
    }
  }

  decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.startsWith('encrypted:')) {
      return encryptedText; // Return as-is if not encrypted
    }
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 4) return null;
      
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];
      
      const key = crypto.scryptSync(this.secret, 'salt', 32);
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return null;
    }
  }
}

// Main ConfigManager class
class ConfigManager {
  constructor() {
    this.config = null;
    this.encryption = new ConfigEncryption();
    this.sensitiveFields = [
      'discord.token',
      'transcription.openaiKey',
      'transcription.icadApiKey',
      'geocoding.locationiqKey',
      'geocoding.googleMapsKey',
      'ai.openaiKey',
      'storage.s3AccessKey',
      'storage.s3SecretKey'
    ];
  }

  /**
   * Initialize the config manager - load or create config
   */
  init() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    if (fs.existsSync(CONFIG_FILE)) {
      this.load();
    } else {
      this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    return this;
  }

  /**
   * Check if this is a first-run (no config or setup incomplete)
   */
  isFirstRun() {
    return !fs.existsSync(CONFIG_FILE) || !this.config?.setupComplete;
  }

  /**
   * Load configuration from file
   */
  load() {
    try {
      const rawConfig = fs.readFileSync(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(rawConfig);
      
      // Decrypt sensitive fields
      this._decryptSensitiveFields();
      
      // Merge with defaults to ensure all fields exist
      this.config = this._mergeWithDefaults(this.config);
      
      return true;
    } catch (error) {
      console.error('Error loading config:', error.message);
      this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      return false;
    }
  }

  /**
   * Save configuration to file
   */
  save() {
    try {
      // Create a copy for saving with encrypted sensitive fields
      const configToSave = JSON.parse(JSON.stringify(this.config));
      this._encryptSensitiveFields(configToSave);
      
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving config:', error.message);
      return false;
    }
  }

  /**
   * Get a configuration value by path (e.g., 'server.port')
   */
  get(path, defaultValue = null) {
    if (!this.config) this.init();
    
    const parts = path.split('.');
    let value = this.config;
    
    for (const part of parts) {
      if (value === null || value === undefined) return defaultValue;
      value = value[part];
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a configuration value by path
   */
  set(path, value) {
    if (!this.config) this.init();
    
    const parts = path.split('.');
    let obj = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    
    obj[parts[parts.length - 1]] = value;
    return this;
  }

  /**
   * Update multiple configuration values at once
   */
  update(updates) {
    if (!this.config) this.init();
    
    for (const [path, value] of Object.entries(updates)) {
      this.set(path, value);
    }
    
    return this;
  }

  /**
   * Get the entire configuration object (decrypted)
   */
  getAll() {
    if (!this.config) this.init();
    return this.config;
  }

  /**
   * Validate the configuration
   * Returns { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];
    
    if (!this.config) {
      return { valid: false, errors: ['Configuration not loaded'] };
    }

    // Check required fields based on enabled features
    if (this.config.setupComplete) {
      // Admin password only required if authentication is enabled
      if (this.config.admin.authEnabled && !this.config.admin.passwordHash) {
        errors.push('Admin password is required when authentication is enabled');
      }

      // Transcription validation
      if (this.config.transcription.enabled) {
        switch (this.config.transcription.mode) {
          case 'openai':
            if (!this.config.transcription.openaiKey) {
              errors.push('OpenAI API key required for OpenAI transcription mode');
            }
            break;
          case 'remote':
            if (!this.config.transcription.remoteUrl) {
              errors.push('Remote server URL required for remote transcription mode');
            }
            break;
          case 'icad':
            if (!this.config.transcription.icadUrl) {
              errors.push('ICAD URL required for ICAD transcription mode');
            }
            break;
        }
      }

      // Geocoding validation
      if (this.config.geocoding.enabled) {
        if (this.config.geocoding.provider === 'locationiq' && !this.config.geocoding.locationiqKey) {
          errors.push('LocationIQ API key required');
        }
        if (this.config.geocoding.provider === 'google' && !this.config.geocoding.googleMapsKey) {
          errors.push('Google Maps API key required');
        }
      }

      // AI validation
      if (this.config.ai.enabled) {
        if (this.config.ai.provider === 'openai' && !this.config.ai.openaiKey) {
          errors.push('OpenAI API key required for AI features');
        }
        if (this.config.ai.provider === 'ollama' && !this.config.ai.ollamaUrl) {
          errors.push('Ollama URL required for AI features');
        }
      }

      // Discord validation
      if (this.config.discord.enabled && !this.config.discord.token) {
        errors.push('Discord bot token required when Discord is enabled');
      }

      // S3 validation
      if (this.config.storage.mode === 's3') {
        if (!this.config.storage.s3Endpoint) errors.push('S3 endpoint required');
        if (!this.config.storage.s3Bucket) errors.push('S3 bucket name required');
        if (!this.config.storage.s3AccessKey) errors.push('S3 access key required');
        if (!this.config.storage.s3SecretKey) errors.push('S3 secret key required');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate a temporary admin password for first-run setup
   */
  generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Generate an API key for scanner software
   */
  generateApiKey() {
    return crypto.randomBytes(24).toString('hex');
  }

  /**
   * Hash a password for storage
   */
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  /**
   * Verify a password against stored hash
   */
  verifyPassword(password, hash, salt) {
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === testHash;
  }

  /**
   * Export configuration to .env format (for compatibility)
   */
  exportToEnv() {
    if (!this.config) this.init();
    
    const lines = [
      '# Scanner Map Configuration (auto-generated from config.json)',
      '# Do not edit this file directly - use the web interface',
      '',
      '# Server Settings',
      `WEBSERVER_PORT=${this.config.server.port}`,
      `PUBLIC_DOMAIN=${this.config.server.publicDomain}`,
      `TIMEZONE=${this.config.server.timezone}`,
      `ENABLE_AUTH=${this.config.admin.authEnabled}`,
      '',
    ];

    if (this.config.discord.enabled && this.config.discord.token) {
      lines.push('# Discord Settings');
      lines.push(`DISCORD_TOKEN=${this.config.discord.token}`);
      lines.push('');
    }

    lines.push('# Transcription Settings');
    lines.push(`TRANSCRIPTION_MODE=${this.config.transcription.mode}`);
    lines.push(`TRANSCRIPTION_DEVICE=${this.config.transcription.device}`);
    lines.push(`WHISPER_MODEL=${this.config.transcription.whisperModel}`);
    
    // Enable auto-installation of Python packages for local transcription
    if (this.config.transcription.mode === 'local') {
      lines.push(`AUTO_UPDATE_PYTHON_PACKAGES=true`);
    }
    
    if (this.config.transcription.mode === 'openai' && this.config.transcription.openaiKey) {
      lines.push(`OPENAI_API_KEY=${this.config.transcription.openaiKey}`);
    }
    lines.push('');

    lines.push('# Geocoding Settings');
    if (this.config.geocoding.locationiqKey) {
      lines.push(`LOCATIONIQ_API_KEY=${this.config.geocoding.locationiqKey}`);
    }
    if (this.config.geocoding.googleMapsKey) {
      lines.push(`GOOGLE_MAPS_API_KEY=${this.config.geocoding.googleMapsKey}`);
    }
    lines.push(`GEOCODING_CITY="${this.config.geocoding.city}"`);
    lines.push(`GEOCODING_STATE=${this.config.geocoding.state}`);
    lines.push(`GEOCODING_COUNTRY=${this.config.geocoding.country}`);
    lines.push(`GEOCODING_TARGET_COUNTIES="${this.config.geocoding.counties.join(',')}"`);
    lines.push('');

    lines.push('# AI Settings');
    lines.push(`AI_PROVIDER=${this.config.ai.provider}`);
    lines.push(`OLLAMA_URL=${this.config.ai.ollamaUrl}`);
    lines.push(`OLLAMA_MODEL=${this.config.ai.ollamaModel}`);
    if (this.config.ai.openaiKey) {
      lines.push(`OPENAI_API_KEY=${this.config.ai.openaiKey}`);
      lines.push(`OPENAI_MODEL=${this.config.ai.openaiModel}`);
    }
    lines.push('');

    // Add talkgroup mappings
    lines.push('# Talkgroup Mappings');
    lines.push(`MAPPED_TALK_GROUPS=${this.config.talkgroups.mapped.join(',')}`);
    for (const [id, desc] of Object.entries(this.config.talkgroups.descriptions)) {
      lines.push(`TALK_GROUP_${id}=${desc}`);
    }

    return lines.join('\n');
  }

  /**
   * Get configuration suitable for frontend (without sensitive data)
   */
  getPublicConfig() {
    if (!this.config) this.init();
    
    return {
      setupComplete: this.config.setupComplete,
      server: {
        port: this.config.server.port,
        timezone: this.config.server.timezone
      },
      map: this.config.map,
      transcription: {
        enabled: this.config.transcription.enabled,
        mode: this.config.transcription.mode
      },
      geocoding: {
        enabled: this.config.geocoding.enabled,
        provider: this.config.geocoding.provider,
        hasLocationiqKey: !!this.config.geocoding.locationiqKey,
        hasGoogleKey: !!this.config.geocoding.googleMapsKey
      },
      ai: {
        enabled: this.config.ai.enabled,
        provider: this.config.ai.provider
      },
      discord: {
        enabled: this.config.discord.enabled
      },
      talkgroups: {
        mapped: this.config.talkgroups.mapped,
        count: Object.keys(this.config.talkgroups.descriptions).length
      }
    };
  }

  // Private methods

  _mergeWithDefaults(config) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    const deepMerge = (target, source) => {
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };

    return deepMerge(merged, config);
  }

  _encryptSensitiveFields(config) {
    for (const fieldPath of this.sensitiveFields) {
      const parts = fieldPath.split('.');
      let obj = config;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) break;
        obj = obj[parts[i]];
      }
      
      const lastKey = parts[parts.length - 1];
      if (obj && obj[lastKey] && !obj[lastKey].startsWith('encrypted:')) {
        obj[lastKey] = this.encryption.encrypt(obj[lastKey]);
      }
    }
  }

  _decryptSensitiveFields() {
    for (const fieldPath of this.sensitiveFields) {
      const parts = fieldPath.split('.');
      let obj = this.config;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) break;
        obj = obj[parts[i]];
      }
      
      const lastKey = parts[parts.length - 1];
      if (obj && obj[lastKey] && typeof obj[lastKey] === 'string' && obj[lastKey].startsWith('encrypted:')) {
        obj[lastKey] = this.encryption.decrypt(obj[lastKey]);
      }
    }
  }
}

// Export singleton instance and class
const configManager = new ConfigManager();

module.exports = {
  ConfigManager,
  configManager,
  DEFAULT_CONFIG
};

