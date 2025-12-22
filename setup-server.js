// setup-server.js - Minimal Express server for the setup wizard
// Runs when config.json doesn't exist or setup is incomplete

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fetch = require('node-fetch');
const { configManager } = require('./config-manager');

const app = express();
const DEFAULT_PORT = 8080;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for CSV upload
const upload = multer({ 
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Session storage for setup (simple in-memory for setup wizard only)
let setupSession = {
  tempPassword: null,
  authenticated: false,
  currentStep: 1
};

// Generate and store temp password
function generateTempPassword() {
  const generated = configManager.generateTempPassword();
  setupSession.tempPassword = generated;
  return setupSession.tempPassword;
}

// Auth middleware for setup routes (disabled for initial setup - no password required)
function requireSetupAuth(req, res, next) {
  // No authentication required during initial setup
  // Setup wizard is only accessible before setupComplete is true
  next();
}

// Serve static files for setup wizard
app.use('/setup', express.static(path.join(__dirname, 'public', 'setup')));

// Redirect root to setup
app.get('/', (req, res) => {
  res.redirect('/setup');
});

// ============================================
// Setup API Routes
// ============================================

// Login endpoint (no longer needed, but kept for compatibility)
app.post('/api/setup/login', (req, res) => {
  // Always succeed - no password required during setup
  setupSession.authenticated = true;
  res.json({ success: true, token: 'setup-mode' });
});

// Get current setup status
app.get('/api/setup/status', (req, res) => {
  try {
    const config = configManager.init().getAll();
    const setupComplete = config.setupComplete === true; // Explicitly check for true
    
    console.log('[Setup] Status check - setupComplete:', setupComplete, 'raw value:', config.setupComplete);
    
    res.json({
      setupComplete: setupComplete,
      currentStep: setupSession.currentStep,
      hasExistingEnv: fs.existsSync('.env'),
      passwordSet: !!setupSession.tempPassword
    });
  } catch (error) {
    console.error('[Setup] Error getting status:', error);
    res.json({
      setupComplete: false,
      currentStep: 1,
      hasExistingEnv: fs.existsSync('.env'),
      passwordSet: false
    });
  }
});

// ============================================
// Detection Endpoints
// ============================================

// Detect location from IP
app.get('/api/setup/detect-location', async (req, res) => {
  try {
    const { detectLocation } = require('./setup-detection');
    const result = await detectLocation();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detect GPU
app.get('/api/setup/detect-gpu', async (req, res) => {
  try {
    const { detectGPU } = require('./setup-detection');
    const result = await detectGPU();
    res.json(result);
  } catch (error) {
    res.json({ available: false, error: error.message });
  }
});

// Detect system information
app.get('/api/setup/system-info', (req, res) => {
  try {
    const { detectSystemInfo } = require('./setup-detection');
    const result = detectSystemInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detect public IP
app.get('/api/setup/detect-public-ip', async (req, res) => {
  try {
    const { detectPublicIP } = require('./setup-detection');
    const result = await detectPublicIP();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detect local IPs
app.get('/api/setup/local-ips', (req, res) => {
  try {
    const { detectLocalIPs } = require('./setup-detection');
    const ips = detectLocalIPs();
    res.json({ ips });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detect Ollama
app.get('/api/setup/detect-ollama', async (req, res) => {
  try {
    const { detectOllama } = require('./setup-detection');
    const url = req.query.url || 'http://localhost:11434';
    const result = await detectOllama(url);
    res.json(result);
  } catch (error) {
    res.json({ available: false, error: error.message });
  }
});

// Detect remote transcription server
app.post('/api/setup/detect-remote-transcription', async (req, res) => {
  try {
    const { detectRemoteTranscription } = require('./setup-detection');
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    const result = await detectRemoteTranscription(url);
    res.json(result);
  } catch (error) {
    res.json({ available: false, error: error.message });
  }
});

// Get counties for a state
app.get('/api/setup/counties/:state', (req, res) => {
  try {
    const stateCode = req.params.state.toUpperCase();
    const countiesPath = path.join(__dirname, 'data', 'us-counties.json');
    
    if (!fs.existsSync(countiesPath)) {
      return res.status(404).json({ error: 'Counties data not found' });
    }
    
    const countiesData = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));
    const counties = countiesData[stateCode] || [];
    
    res.json({ state: stateCode, counties });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find counties within 20 miles of a location
app.post('/api/setup/counties-within-radius', async (req, res) => {
  try {
    const { lat, lng, stateCode, geocodingProvider, locationiqKey: reqLocationiqKey, googleMapsKey: reqGoogleMapsKey } = req.body;
    
    if (!lat || !lng || !stateCode) {
      return res.status(400).json({ error: 'lat, lng, and stateCode are required' });
    }
    
    const countiesPath = path.join(__dirname, 'data', 'us-counties.json');
    if (!fs.existsSync(countiesPath)) {
      return res.status(404).json({ error: 'Counties data not found' });
    }
    
    const countiesData = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));
    const counties = countiesData[stateCode.toUpperCase()] || [];
    
    if (counties.length === 0) {
      return res.json({ counties: [], centerCounty: null });
    }
    
    // Calculate distance using Haversine formula
    function distance(lat1, lon1, lat2, lon2) {
      const R = 3959; // Earth radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
    
    const radiusMiles = 20;
    const selectedCounties = [];
    const countyCoordinates = new Map(); // Cache county coordinates
    
    // Get geocoding API keys and provider preference from request (during setup) or config (after setup)
    const config = configManager.init().getAll();
    const geocodingConfig = config.geocoding || {};
    
    // Use values from request if provided (during setup), otherwise fall back to config
    const locationiqKey = reqLocationiqKey || geocodingConfig.locationiqKey;
    const googleMapsKey = reqGoogleMapsKey || geocodingConfig.googleMapsKey;
    const provider = geocodingProvider || geocodingConfig.provider || 'nominatim';
    
    // Determine which provider to use (priority: LocationIQ > Google Maps > Nominatim)
    let useLocationIQ = false;
    let useGoogleMaps = false;
    let providerName = 'Nominatim';
    
    if (provider === 'locationiq' && locationiqKey) {
      useLocationIQ = true;
      providerName = 'LocationIQ';
    } else if (provider === 'google' && googleMapsKey) {
      useGoogleMaps = true;
      providerName = 'Google Maps';
    } else if (locationiqKey) {
      // Auto-detect: if LocationIQ key exists, prefer it
      useLocationIQ = true;
      providerName = 'LocationIQ';
    } else if (googleMapsKey) {
      // Auto-detect: if Google Maps key exists, use it
      useGoogleMaps = true;
      providerName = 'Google Maps';
    }
    
    // First, use reverse geocoding to find the county at the user's location
    const { reverseGeocode } = require('./setup-detection');
    const reverseResult = await reverseGeocode(lat, lng, locationiqKey);
    let centerCounty = null;
    
    if (reverseResult.success && reverseResult.city) {
      // Try to match the reverse geocoded location to a county name
      // Nominatim sometimes returns county in the address
      const addressParts = reverseResult.fullAddress?.toLowerCase() || '';
      for (const county of counties) {
        if (addressParts.includes(county.toLowerCase())) {
          centerCounty = county;
          break;
        }
      }
    }
    
    // Geocode each county and calculate distances
    // Priority: LocationIQ > Google Maps > Nominatim
    // Limit to reasonable number to avoid rate limits
    const maxCountiesToCheck = Math.min(counties.length, 50);
    const countiesToCheck = counties.slice(0, maxCountiesToCheck);
    
    console.log(`[Setup] Checking ${countiesToCheck.length} counties for location (${lat}, ${lng}) using ${providerName} (provider: ${provider})`);
    
    // Helper function to geocode with retry logic
    const geocodeWithRetry = async (county, query, maxRetries = 3) => {
      const fetch = require('node-fetch');
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          let response;
          
          if (useLocationIQ) {
            // Use LocationIQ API
            const params = new URLSearchParams({
              key: locationiqKey,
              q: query,
              format: 'json',
              addressdetails: '1',
              limit: '1'
            });
            
            response = await fetch(`https://us1.locationiq.com/v1/search?${params.toString()}`, {
              timeout: 10000
            });
          } else if (useGoogleMaps) {
            // Use Google Maps Geocoding API
            const params = new URLSearchParams({
              address: query,
              key: googleMapsKey
            });
            
            response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
              timeout: 10000
            });
          } else {
            // Use Nominatim (free but strict rate limits: 1 req/sec)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Scanner-Map-Setup/1.0'
              }
            });
            
            clearTimeout(timeoutId);
          }
          
          // Handle rate limiting (429) with exponential backoff
          if (response.status === 429) {
            const errorText = await response.text().catch(() => '');
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
            console.warn(`[Setup] Rate limited for ${county} (attempt ${attempt + 1}/${maxRetries}), waiting ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue; // Retry
          }
          
          if (response.ok) {
            const data = await response.json();
            
            // Parse response based on provider
            if (useGoogleMaps) {
              if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return [parseFloat(location.lat), parseFloat(location.lng)];
              }
              return null;
            } else {
              // LocationIQ and Nominatim return array directly
              if (data && data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              }
              return null;
            }
          } else {
            const errorText = await response.text().catch(() => '');
            console.warn(`[Setup] Geocoding API error for ${county}: ${response.status} ${response.statusText} - ${errorText}`);
            return null;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.warn(`[Setup] Timeout geocoding county ${county} (attempt ${attempt + 1}/${maxRetries})`);
          } else {
            console.warn(`[Setup] Error geocoding county ${county} (attempt ${attempt + 1}/${maxRetries}):`, error.message);
          }
          
          // On last attempt, return null
          if (attempt === maxRetries - 1) {
            return null;
          }
          
          // Wait before retry
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      return null;
    };
    
    // Rate limiting delays based on provider (conservative values)
    const getRateLimitDelay = () => {
      if (useLocationIQ) {
        // LocationIQ free tier: 1 req/sec, paid tiers: 2-5 req/sec
        // Use 1200ms delay to be safe (slightly more than 1 req/sec)
        return 1200;
      } else if (useGoogleMaps) {
        // Google Maps allows up to 50 requests per second
        return 200;
      } else {
        // Nominatim: 1 request per second (strict)
        return 1100;
      }
    };
    
    const rateLimitDelay = getRateLimitDelay();
    
    for (const county of countiesToCheck) {
      try {
        // Check cache first
        let countyLat, countyLng;
        if (countyCoordinates.has(county)) {
          [countyLat, countyLng] = countyCoordinates.get(county);
        } else {
          // Geocode county to get its coordinates
          const query = `${county} County, ${stateCode}, USA`;
          const coords = await geocodeWithRetry(county, query);
          
          if (coords) {
            [countyLat, countyLng] = coords;
            countyCoordinates.set(county, coords);
          } else {
            // Skip this county if geocoding failed after retries
            continue;
          }
          
          // Always apply rate limiting delay after each request (success or failure)
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }
        
        // Calculate distance from user location to county
        if (countyLat && countyLng) {
          const dist = distance(lat, lng, countyLat, countyLng);
          if (dist <= radiusMiles) {
            selectedCounties.push({ county, distance: dist });
          }
        }
      } catch (error) {
        // Skip county on error, continue with next
        console.warn(`[Setup] Unexpected error processing county ${county}:`, error.message);
        // Still apply rate limit delay even on error
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
      }
    }
    
    // Sort by distance and extract county names
    selectedCounties.sort((a, b) => a.distance - b.distance);
    const countyNames = selectedCounties.map(item => item.county);
    
    // If we found a center county from reverse geocoding, ensure it's included
    if (centerCounty && !countyNames.includes(centerCounty)) {
      countyNames.unshift(centerCounty);
    }
    
    // If no counties found, try a broader search or return the center county
    if (countyNames.length === 0) {
      if (centerCounty) {
        countyNames.push(centerCounty);
      } else {
        // Fallback: return closest counties by name matching (less accurate)
        console.warn('[Setup] No counties found within radius, using fallback');
      }
    }
    
    res.json({ 
      counties: countyNames,
      centerCounty: centerCounty || countyNames[0] || null,
      radius: radiusMiles
    });
  } catch (error) {
    console.error('[Setup] Error finding counties within radius:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test API key (generic)
app.post('/api/setup/test-api-key', async (req, res) => {
  const { type, key, config: keyConfig } = req.body;
  
  try {
    let result = { success: false, message: 'Unknown API key type' };
    
    switch (type) {
      case 'locationiq':
        const liqRes = await fetch(
          `https://us1.locationiq.com/v1/search?key=${key}&q=test&format=json`,
          { timeout: 5000 }
        );
        if (liqRes.ok || liqRes.status === 400) {
          result = { success: true, message: 'LocationIQ API key is valid' };
        } else {
          const errorData = await liqRes.json().catch(() => ({}));
          result = { success: false, message: errorData.error || 'Invalid LocationIQ API key' };
        }
        break;
        
      case 'google':
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${key}`,
          { timeout: 5000 }
        );
        const geoData = await geoRes.json();
        if (geoData.status !== 'REQUEST_DENIED') {
          result = { success: true, message: 'Google Maps API key is valid' };
        } else {
          result = { success: false, message: 'Invalid Google Maps API key' };
        }
        break;
        
      case 'openai':
        const openaiRes = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
          timeout: 5000
        });
        if (openaiRes.ok) {
          result = { success: true, message: 'OpenAI API key is valid' };
        } else {
          const errorData = await openaiRes.json().catch(() => ({}));
          result = { success: false, message: errorData.error?.message || 'Invalid OpenAI API key' };
        }
        break;
        
      case 'discord':
        const discordRes = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { 'Authorization': `Bot ${key}` },
          timeout: 5000
        });
        if (discordRes.ok) {
          const botInfo = await discordRes.json();
          result = { success: true, message: `Connected as ${botInfo.username}` };
        } else {
          result = { success: false, message: 'Invalid Discord bot token' };
        }
        break;
    }
    
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Get configuration for a specific step
app.get('/api/setup/config/:section', requireSetupAuth, (req, res) => {
  const { section } = req.params;
  const config = configManager.getAll();
  
  if (config[section]) {
    // Don't send sensitive data back
    const sanitized = { ...config[section] };
    const sensitiveKeys = ['passwordHash', 'salt', 'token', 'apiKey', 'secretKey'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = sanitized[key] ? '••••••••' : null;
      }
    }
    res.json(sanitized);
  } else {
    res.json({});
  }
});

// Save configuration for a step
app.post('/api/setup/config/:section', requireSetupAuth, (req, res) => {
  const { section } = req.params;
  const data = req.body;
  
  try {
    // Handle special cases
    if (section === 'admin' && data.password) {
      // Hash the password
      const { hash, salt } = configManager.hashPassword(data.password);
      data.passwordHash = hash;
      data.salt = salt;
      delete data.password;
    }
    
    // Update config
    for (const [key, value] of Object.entries(data)) {
      configManager.set(`${section}.${key}`, value);
    }
    
    configManager.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate API key for scanner software
app.post('/api/setup/generate-api-key', requireSetupAuth, (req, res) => {
  const apiKey = configManager.generateApiKey();
  const { hash, salt } = configManager.hashPassword(apiKey);
  
  configManager.set('apiKeys.scanner', apiKey);
  configManager.set('apiKeys.scannerHash', hash);
  configManager.set('apiKeys.scannerSalt', salt);
  configManager.save();
  
  res.json({ apiKey });
});

// Test API connections
app.post('/api/setup/test-connection', requireSetupAuth, async (req, res) => {
  const { type, config } = req.body;
  
  try {
    switch (type) {
      case 'ollama':
        const ollamaRes = await fetch(`${config.url}/api/version`, { timeout: 5000 });
        if (ollamaRes.ok) {
          res.json({ success: true, message: 'Ollama is running' });
        } else {
          res.json({ success: false, message: 'Ollama not responding correctly' });
        }
        break;
        
      case 'openai':
        const openaiRes = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
          timeout: 5000
        });
        if (openaiRes.ok) {
          res.json({ success: true, message: 'OpenAI API key is valid' });
        } else {
          res.json({ success: false, message: 'Invalid OpenAI API key' });
        }
        break;
        
      case 'locationiq':
        const liqRes = await fetch(
          `https://us1.locationiq.com/v1/search?key=${config.apiKey}&q=test&format=json`,
          { timeout: 5000 }
        );
        if (liqRes.ok || liqRes.status === 400) { // 400 means key is valid but query is bad
          res.json({ success: true, message: 'LocationIQ API key is valid' });
        } else {
          res.json({ success: false, message: 'Invalid LocationIQ API key' });
        }
        break;
        
      case 'google':
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${config.apiKey}`,
          { timeout: 5000 }
        );
        const geoData = await geoRes.json();
        if (geoData.status !== 'REQUEST_DENIED') {
          res.json({ success: true, message: 'Google Maps API key is valid' });
        } else {
          res.json({ success: false, message: 'Invalid Google Maps API key' });
        }
        break;
        
      case 'discord':
        const discordRes = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { 'Authorization': `Bot ${config.token}` },
          timeout: 5000
        });
        if (discordRes.ok) {
          const botInfo = await discordRes.json();
          res.json({ success: true, message: `Connected as ${botInfo.username}` });
        } else {
          res.json({ success: false, message: 'Invalid Discord bot token' });
        }
        break;
        
      default:
        res.json({ success: false, message: 'Unknown connection type' });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// Upload and parse RadioReference CSV
app.post('/api/setup/upload-radioreference', requireSetupAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const { parseRadioReferenceCSV, convertToScannerMapFormat } = require('./radioreference-importer');
    
    // Read CSV content
    const csvContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Parse RadioReference CSV
    const talkgroups = parseRadioReferenceCSV(csvContent);
    
    if (talkgroups.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No valid talkgroups found in CSV' });
    }
    
    // Extract system info from first talkgroup if available
    const systemName = talkgroups[0]?.systemName || null;
    const systemId = talkgroups[0]?.systemId || null;
    
    // Convert to Scanner Map format
    const scannerMapTalkgroups = convertToScannerMapFormat(talkgroups);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Store talkgroups temporarily in session
    setupSession.talkgroups = scannerMapTalkgroups;
    
    res.json({ 
      success: true, 
      count: scannerMapTalkgroups.length,
      preview: scannerMapTalkgroups.slice(0, 10),
      systemName,
      systemId
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload and parse talkgroups CSV
app.post('/api/setup/upload-talkgroups', requireSetupAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const talkgroups = [];
  
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({
          headers: ['DEC', 'HEX', 'Alpha Tag', 'Mode', 'Description', 'Tag', 'County'],
          skipLines: 0
        }))
        .on('data', (row) => {
          const id = parseInt(row['DEC'], 10);
          if (!isNaN(id)) {
            talkgroups.push({
              id,
              hex: row['HEX'],
              alphaTag: row['Alpha Tag'],
              mode: row['Mode'],
              description: row['Description'],
              tag: row['Tag'],
              county: row['County']
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Store talkgroups temporarily in session for preview
    setupSession.talkgroups = talkgroups;
    
    res.json({ 
      success: true, 
      count: talkgroups.length,
      preview: talkgroups.slice(0, 10) // First 10 for preview
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Import talkgroups to database
app.post('/api/setup/import-talkgroups', requireSetupAuth, async (req, res) => {
  const { talkgroups, mapped, descriptions } = req.body;
  const tgData = talkgroups || setupSession.talkgroups;
  
  if (!tgData || tgData.length === 0) {
    return res.status(400).json({ error: 'No talkgroups to import' });
  }
  
  try {
    // Initialize database
    const db = new sqlite3.Database('./botdata.db');
    
    await new Promise((resolve, reject) => {
      db.run(`CREATE TABLE IF NOT EXISTS talk_groups (
        id INTEGER PRIMARY KEY,
        hex TEXT,
        alpha_tag TEXT,
        mode TEXT,
        description TEXT,
        tag TEXT,
        county TEXT,
        frequency REAL,
        type TEXT
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Import each talkgroup
    for (const tg of tgData) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO talk_groups (id, hex, alpha_tag, mode, description, tag, county, frequency, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tg.id, 
            tg.hex || `0x${tg.id.toString(16).toUpperCase()}`, 
            tg.alphaTag || tg.alpha_tag || '', 
            tg.mode || 'D', 
            tg.description || '', 
            tg.tag || '', 
            tg.county || '',
            tg.frequency || null,
            tg.type || 'digital'
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
    
    db.close();
    
    // Save mapped talkgroups and descriptions to config
    if (mapped) {
      configManager.set('talkgroups.mapped', mapped);
    }
    if (descriptions) {
      configManager.set('talkgroups.descriptions', descriptions);
    }
    configManager.save();
    
    // Clear session talkgroups
    delete setupSession.talkgroups;
    
    res.json({ success: true, imported: tgData.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of talkgroups from database
app.get('/api/setup/talkgroups', requireSetupAuth, async (req, res) => {
  try {
    const dbPath = './botdata.db';
    if (!fs.existsSync(dbPath)) {
      return res.json({ talkgroups: [] });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    const talkgroups = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM talk_groups ORDER BY alpha_tag', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    db.close();
    res.json({ talkgroups });
  } catch (error) {
    res.json({ talkgroups: [] });
  }
});

// Detect GPU availability
app.get('/api/setup/detect-gpu', requireSetupAuth, async (req, res) => {
  try {
    const { spawn } = require('child_process');
    
    // Try to detect NVIDIA GPU
    const result = await new Promise((resolve) => {
      const proc = spawn('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader'], {
        timeout: 5000
      });
      
      let output = '';
      proc.stdout.on('data', (data) => { output += data; });
      proc.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve({ available: true, name: output.trim().split('\n')[0] });
        } else {
          resolve({ available: false });
        }
      });
      proc.on('error', () => {
        resolve({ available: false });
      });
    });
    
    res.json(result);
  } catch (error) {
    res.json({ available: false });
  }
});

// Fetch towns/cities within selected counties
app.post('/api/setup/fetch-towns', async (req, res) => {
  try {
    const { counties, stateCode, apiKey } = req.body;
    
    if (!counties || counties.length === 0) {
      return res.status(400).json({ error: 'Counties are required' });
    }
    
    if (!stateCode) {
      return res.status(400).json({ error: 'State code is required' });
    }
    
    // Try to get LocationIQ key from config if available (optional, for better results)
    const config = configManager.init().getAll();
    const locationiqKey = apiKey || config.geocoding?.locationiqKey;
    
    const { fetchTownsInCounties } = require('./setup-detection');
    const result = await fetchTownsInCounties(counties, stateCode, locationiqKey);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error || 'Failed to fetch towns' });
    }
  } catch (error) {
    console.error('[Setup] Fetch towns error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reverse geocode coordinates to find nearest city
app.post('/api/setup/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng, apiKey } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    
    // Use API key from request if provided (during setup), otherwise try config
    const config = configManager.init().getAll();
    const locationiqKey = apiKey || config.geocoding?.locationiqKey;
    
    const { reverseGeocode } = require('./setup-detection');
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng), locationiqKey);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error || 'Reverse geocoding failed' });
    }
  } catch (error) {
    console.error('[Setup] Reverse geocoding error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete setup
app.post('/api/setup/complete', requireSetupAuth, async (req, res) => {
  try {
    // Validate configuration
    const validation = configManager.validate();
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Configuration incomplete', 
        details: validation.errors 
      });
    }
    
    // Mark setup as complete
    configManager.set('setupComplete', true);
    configManager.save();
    
    res.json({ 
      success: true, 
      message: 'Setup complete! Restarting services...' 
    });
    
    // Signal the parent process to restart in normal mode
    setTimeout(() => {
      process.emit('setup-complete');
    }, 1000);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate scanner configuration files
app.post('/api/setup/generate-configs', requireSetupAuth, async (req, res) => {
  try {
    const { generateAllConfigs } = require('./radioreference-importer');
    const { generateRdio, generateSdrtrunk, generateTrunkrecorder, systemName, systemId } = req.body;
    
    // Get talkgroups from database
    const dbPath = './botdata.db';
    if (!fs.existsSync(dbPath)) {
      return res.status(400).json({ error: 'No talkgroups imported yet' });
    }
    
    const db = new sqlite3.Database(dbPath);
    const talkgroups = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM talk_groups', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          id: row.id,
          hex: row.hex,
          alphaTag: row.alpha_tag,
          mode: row.mode,
          description: row.description,
          tag: row.tag,
          county: row.county
        })));
      });
    });
    db.close();
    
    if (talkgroups.length === 0) {
      return res.status(400).json({ error: 'No talkgroups found in database' });
    }
    
    // Create configs directory
    const configsDir = path.join(__dirname, 'configs');
    if (!fs.existsSync(configsDir)) {
      fs.mkdirSync(configsDir, { recursive: true });
    }
    
    const files = {};
    
    // Generate requested configs
    if (generateRdio) {
      const { generateRDIOScannerConfig, saveConfigFile } = require('./radioreference-importer');
      const config = generateRDIOScannerConfig(talkgroups, systemName || 'Imported System');
      files.rdioScanner = saveConfigFile(config, 'rdio-scanner-config.json', configsDir);
    }
    
    if (generateSdrtrunk) {
      const { generateSDRTrunkConfig, saveConfigFile } = require('./radioreference-importer');
      const config = generateSDRTrunkConfig(talkgroups, systemName || 'Imported System', systemId);
      files.sdrtrunk = saveConfigFile(config, 'sdrtrunk-config.json', configsDir);
    }
    
    if (generateTrunkrecorder) {
      const { generateTrunkRecorderConfig, saveConfigFile } = require('./radioreference-importer');
      const config = generateTrunkRecorderConfig(talkgroups, systemName || 'Imported System', systemId);
      files.trunkRecorder = saveConfigFile(config, 'trunkrecorder-config.json', configsDir);
    }
    
    res.json({ 
      success: true, 
      files: Object.fromEntries(
        Object.entries(files).map(([key, path]) => [key, path.replace(__dirname + path.sep, '')])
      )
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download configuration files as ZIP
app.get('/api/setup/download-configs', requireSetupAuth, async (req, res) => {
  try {
    let archiver;
    try {
      archiver = require('archiver');
    } catch (e) {
      return res.status(500).json({ 
        error: 'archiver package not installed. Run: npm install archiver' 
      });
    }
    
    const configsDir = path.join(__dirname, 'configs');
    
    if (!fs.existsSync(configsDir)) {
      return res.status(404).json({ error: 'No configuration files found' });
    }
    
    const files = fs.readdirSync(configsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return res.status(404).json({ error: 'No configuration files found' });
    }
    
    res.attachment('scanner-configs.zip');
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    
    // Add all JSON config files
    files.forEach(file => {
      archive.file(path.join(configsDir, file), { name: file });
    });
    
    await archive.finalize();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import existing .env file
app.post('/api/setup/import-env', requireSetupAuth, async (req, res) => {
  try {
    const { migrateFromEnv } = require('./env-migration');
    const result = await migrateFromEnv();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Imported ${result.imported} settings from .env`,
        imported: result.imported,
        skipped: result.skipped
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Start Server
// ============================================

function startSetupServer(port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    try {
      // Initialize config manager
      configManager.init();
    } catch (error) {
      reject(error);
      return;
    }
    
    const server = app.listen(port, () => {
      console.log('');
      console.log('═'.repeat(60));
      console.log('  SCANNER MAP - FIRST TIME SETUP');
      console.log('═'.repeat(60));
      console.log('');
      console.log('  Open your browser to:');
      console.log(`  \x1b[36mhttp://localhost:${port}/setup\x1b[0m`);
      console.log('');
      console.log('  \x1b[32m✓ No password required - setup wizard is open\x1b[0m');
      console.log('');
      console.log('═'.repeat(60));
      console.log('');
      
      resolve({ server });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        startSetupServer(port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { startSetupServer, app };

// If run directly
if (require.main === module) {
  startSetupServer().catch(console.error);
}

