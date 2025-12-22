// Scanner Map Setup Wizard - Frontend JavaScript

// State
let authToken = null;
let currentStep = 0;
let config = {};
let talkgroups = [];
let map = null;
let marker = null;
let mapCenterLocation = null; // Store map center for county selection

// Step definitions
const steps = [
  { id: 'welcome', title: 'Welcome', icon: '👋' },
  { id: 'admin', title: 'Admin Account', icon: '🔐' },
  { id: 'map', title: 'Map Settings', icon: '🗺️' },
  { id: 'apikey', title: 'API Key', icon: '🔑' },
  { id: 'talkgroups', title: 'Talkgroups', icon: '📻' },
  { id: 'transcription', title: 'Transcription', icon: '🎤' },
  { id: 'geocoding', title: 'Geocoding', icon: '📍' },
  { id: 'ai', title: 'AI Features', icon: '🤖' },
  { id: 'discord', title: 'Discord', icon: '💬' },
  { id: 'review', title: 'Review', icon: '✅' }
];

// DOM Elements
const wizardScreen = document.getElementById('wizard-screen');
const completeScreen = document.getElementById('complete-screen');
const wizardContent = document.getElementById('wizard-content');
const progressFill = document.getElementById('progress-fill');
const stepIndicators = document.getElementById('step-indicators');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Auto-authenticate for setup (no password required)
  authToken = 'setup-mode';
  setupSession = { authenticated: true };
  
  // Check setup status
  try {
    const response = await fetch('/api/setup/status');
    const status = await response.json();
    
    console.log('[Setup] Status check:', status);
    
    // If setup is already complete, show completion screen
    if (status.setupComplete === true) {
      console.log('[Setup] Setup already complete, showing completion screen');
      wizardScreen.classList.remove('active');
      wizardScreen.style.display = 'none';
      completeScreen.classList.add('active');
      completeScreen.style.display = 'flex';
      return;
    }
    
    // Ensure wizard screen is active and completion screen is hidden
    console.log('[Setup] Setup incomplete, showing wizard');
    wizardScreen.classList.add('active');
    completeScreen.classList.remove('active');
    completeScreen.style.display = 'none';
    
    // Try to restore progress
    const restored = restoreProgress();
    if (restored && currentStep > 0) {
      // Show resume message
      showToast(`Resuming from step ${currentStep + 1} of ${steps.length}`, 'info');
    }
    
    if (status.hasExistingEnv) {
      // Show import notice if env exists
      const notice = document.getElementById('env-import-notice');
      if (notice) notice.style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking status:', error);
    // On error, assume setup is needed and show wizard
    wizardScreen.classList.add('active');
    completeScreen.classList.remove('active');
    completeScreen.style.display = 'none';
    
    // Try to restore progress even on error
    restoreProgress();
  }
  
  // Setup event listeners (skip login form)
  if (btnPrev) btnPrev.addEventListener('click', () => goToStep(currentStep - 1));
  if (btnNext) btnNext.addEventListener('click', handleNext);
  
  // Build step indicators
  buildStepIndicators();
  
  // Start with restored step or first step
  renderStep(currentStep);
});

// Build step indicators
function buildStepIndicators() {
  stepIndicators.innerHTML = steps.map((step, index) => `
    <div class="step-indicator" data-step="${index}">
      ${step.title}
    </div>
  `).join('');
}

// Update progress
function updateProgress() {
  const progress = ((currentStep + 1) / steps.length) * 100;
  progressFill.style.width = `${progress}%`;
  
  document.querySelectorAll('.step-indicator').forEach((el, index) => {
    el.classList.remove('active', 'completed');
    if (index === currentStep) {
      el.classList.add('active');
    } else if (index < currentStep) {
      el.classList.add('completed');
    }
  });
}

// Login function removed - no password required during setup

// API helper (no auth required during setup)
async function api(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(endpoint, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Progress Persistence Functions (Phase 1)
function saveProgress() {
  try {
    const progressData = {
      currentStep: currentStep,
      config: config,
      timestamp: Date.now()
    };
    localStorage.setItem('scanner-map-setup-progress', JSON.stringify(progressData));
    console.log('[Setup] Progress saved to localStorage');
  } catch (error) {
    console.warn('[Setup] Failed to save progress to localStorage:', error);
  }
}

function restoreProgress() {
  try {
    const saved = localStorage.getItem('scanner-map-setup-progress');
    if (saved) {
      const progressData = JSON.parse(saved);
      // Only restore if progress is less than 7 days old
      const age = Date.now() - progressData.timestamp;
      if (age < 7 * 24 * 60 * 60 * 1000) {
        currentStep = progressData.currentStep || 0;
        config = progressData.config || {};
        console.log('[Setup] Progress restored from localStorage, resuming from step', currentStep);
        return true;
      } else {
        // Clear stale progress
        localStorage.removeItem('scanner-map-setup-progress');
      }
    }
  } catch (error) {
    console.warn('[Setup] Failed to restore progress from localStorage:', error);
  }
  return false;
}

function clearProgress() {
  try {
    localStorage.removeItem('scanner-map-setup-progress');
    console.log('[Setup] Progress cleared from localStorage');
  } catch (error) {
    console.warn('[Setup] Failed to clear progress from localStorage:', error);
  }
}

// Inline Validation Functions (Phase 4)
function validateField(fieldId, fieldType, value) {
  const field = document.getElementById(fieldId);
  if (!field) return { valid: true, message: '' };
  
  // Remove existing error styling
  field.classList.remove('field-error');
  const existingError = field.parentElement.querySelector('.field-error-message');
  if (existingError) existingError.remove();
  
  let valid = true;
  let message = '';
  
  switch (fieldType) {
    case 'latitude':
      const lat = parseFloat(value);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        valid = false;
        message = 'Latitude must be between -90 and 90';
      }
      break;
      
    case 'longitude':
      const lng = parseFloat(value);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        valid = false;
        message = 'Longitude must be between -180 and 180';
      }
      break;
      
    case 'url':
      if (value && value.trim()) {
        try {
          new URL(value);
        } catch (e) {
          valid = false;
          message = 'Please enter a valid URL (e.g., http://localhost:8000)';
        }
      }
      break;
      
    case 'api-key':
      if (value && value.trim().length < 10) {
        valid = false;
        message = 'API key appears to be too short';
      }
      break;
      
    case 'password':
      if (value && value.length > 0 && value.length < 8) {
        valid = false;
        message = 'Password must be at least 8 characters';
      }
      break;
  }
  
  if (!valid) {
    field.classList.add('field-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.style.color = 'var(--error, #ff4444)';
    errorDiv.style.fontSize = '0.85em';
    errorDiv.style.marginTop = '4px';
    errorDiv.textContent = message;
    field.parentElement.appendChild(errorDiv);
  }
  
  return { valid, message };
}

function validateStep(stepId) {
  let isValid = true;
  
  switch (stepId) {
    case 'map': {
      const latValid = validateField('map-lat', 'latitude', document.getElementById('map-lat')?.value);
      const lngValid = validateField('map-lng', 'longitude', document.getElementById('map-lng')?.value);
      isValid = latValid.valid && lngValid.valid;
      break;
    }
    case 'admin': {
      const authEnabled = document.getElementById('auth-enabled')?.checked;
      if (authEnabled) {
        const password = document.getElementById('admin-password')?.value;
        const passwordValid = validateField('admin-password', 'password', password);
        isValid = passwordValid.valid;
      }
      break;
    }
    case 'transcription': {
      const mode = document.querySelector('input[name="transcription-mode"]:checked')?.value;
      if (mode === 'remote') {
        const urlValid = validateField('remote-url', 'url', document.getElementById('remote-url')?.value);
        isValid = urlValid.valid;
      } else if (mode === 'openai') {
        const keyValid = validateField('openai-transcription-key', 'api-key', document.getElementById('openai-transcription-key')?.value);
        isValid = keyValid.valid;
      }
      break;
    }
    case 'geocoding': {
      const provider = document.querySelector('input[name="geocoding-provider"]:checked')?.value;
      if (provider === 'locationiq') {
        const keyValid = validateField('locationiq-key', 'api-key', document.getElementById('locationiq-key')?.value);
        isValid = keyValid.valid;
      } else if (provider === 'google') {
        const keyValid = validateField('google-maps-key', 'api-key', document.getElementById('google-maps-key')?.value);
        isValid = keyValid.valid;
      }
      break;
    }
    case 'ai': {
      const provider = document.querySelector('input[name="ai-provider"]:checked')?.value;
      if (provider === 'openai') {
        const keyValid = validateField('openai-ai-key', 'api-key', document.getElementById('openai-ai-key')?.value);
        isValid = keyValid.valid;
      } else if (provider === 'ollama') {
        const urlValid = validateField('ollama-url', 'url', document.getElementById('ollama-url')?.value);
        isValid = urlValid.valid;
      }
      break;
    }
    case 'discord': {
      const enabled = document.getElementById('discord-enabled')?.checked;
      if (enabled) {
        const tokenValid = validateField('discord-token', 'api-key', document.getElementById('discord-token')?.value);
        isValid = tokenValid.valid;
      }
      break;
    }
  }
  
  // Update Next button state
  if (btnNext) {
    btnNext.disabled = !isValid;
  }
  
  return isValid;
}

// Expose validation functions globally for inline handlers
window.validateField = validateField;
window.validateStep = validateStep;

// Go to step
function goToStep(step) {
  if (step < 0 || step >= steps.length) return;
  currentStep = step;
  renderStep(currentStep);
}

// Handle next button
async function handleNext() {
  // Validate and save current step
  const valid = await validateAndSaveStep();
  if (!valid) return;
  
  // Save progress after successful step validation
  saveProgress();
  
  if (currentStep === steps.length - 1) {
    // Complete setup
    await completeSetup();
  } else {
    goToStep(currentStep + 1);
  }
}

// Validate and save current step
async function validateAndSaveStep() {
  const step = steps[currentStep];
  
  switch (step.id) {
    case 'welcome':
      return true;
      
    case 'admin': {
      const username = document.getElementById('admin-username').value;
      const password = document.getElementById('admin-password').value;
      const confirmPassword = document.getElementById('admin-confirm-password').value;
      const authEnabled = document.getElementById('auth-enabled').checked;
      
      // Admin account is optional - only validate if user wants to enable auth
      if (authEnabled) {
        // If auth is enabled, require username and password
        if (!username || !password) {
          showToast('Please fill in username and password to enable authentication', 'error');
          return false;
        }
        
        if (password !== confirmPassword) {
          showToast('Passwords do not match', 'error');
          return false;
        }
        
        if (password.length < 8) {
          showToast('Password must be at least 8 characters', 'error');
          return false;
        }
        
        await api('/api/setup/config/admin', 'POST', {
          username,
          password,
          authEnabled: true
        });
        config.admin = { username, authEnabled: true };
      } else {
        // Auth disabled - save with empty credentials
        await api('/api/setup/config/admin', 'POST', {
          username: username || 'admin',
          password: '',
          authEnabled: false
        });
        config.admin = { username: username || 'admin', authEnabled: false };
      }
      return true;
    }
    
    case 'map': {
      const lat = parseFloat(document.getElementById('map-lat').value);
      const lng = parseFloat(document.getElementById('map-lng').value);
      const zoom = parseInt(document.getElementById('map-zoom').value);
      const timezone = document.getElementById('map-timezone').value;
      
      if (isNaN(lat) || isNaN(lng)) {
        showToast('Please set a valid map center', 'error');
        return false;
      }
      
      // Store map center location for county selection
      mapCenterLocation = { lat, lng };
      
      await api('/api/setup/config/map', 'POST', {
        center: [lat, lng],
        zoom: zoom || 13
      });
      
      await api('/api/setup/config/server', 'POST', { timezone });
      
      config.map = { center: [lat, lng], zoom };
      config.server = { timezone };
      return true;
    }
    
    case 'apikey':
      // API key is auto-generated, just continue
      return true;
      
    case 'talkgroups': {
      const mapped = [];
      const descriptions = {};
      
      document.querySelectorAll('.tg-checkbox:checked').forEach(cb => {
        const id = cb.dataset.id;
        mapped.push(id);
        
        const descInput = document.querySelector(`.tg-desc[data-id="${id}"]`);
        if (descInput && descInput.value) {
          descriptions[id] = descInput.value;
        }
      });
      
      await api('/api/setup/config/talkgroups', 'POST', { mapped, descriptions });
      config.talkgroups = { mapped, descriptions };
      return true;
    }
    
    case 'transcription': {
      const mode = document.querySelector('input[name="transcription-mode"]:checked')?.value;
      if (!mode) {
        showToast('Please select a transcription mode', 'error');
        return false;
      }
      
      const transcriptionConfig = { mode, enabled: true };
      
      if (mode === 'local') {
        transcriptionConfig.device = document.getElementById('transcription-device').value;
        transcriptionConfig.whisperModel = document.getElementById('whisper-model').value;
      } else if (mode === 'remote') {
        transcriptionConfig.remoteUrl = document.getElementById('remote-url').value;
        if (!transcriptionConfig.remoteUrl) {
          showToast('Please enter the remote server URL', 'error');
          return false;
        }
      } else if (mode === 'openai') {
        transcriptionConfig.openaiKey = document.getElementById('openai-transcription-key').value;
        if (!transcriptionConfig.openaiKey) {
          showToast('Please enter your OpenAI API key', 'error');
          return false;
        }
      } else if (mode === 'icad') {
        transcriptionConfig.icadUrl = document.getElementById('icad-url').value;
        transcriptionConfig.icadProfile = document.getElementById('icad-profile').value;
        if (!transcriptionConfig.icadUrl) {
          showToast('Please enter the ICAD server URL', 'error');
          return false;
        }
      }
      
      await api('/api/setup/config/transcription', 'POST', transcriptionConfig);
      config.transcription = transcriptionConfig;
      return true;
    }
    
    case 'geocoding': {
      const provider = document.querySelector('input[name="geocoding-provider"]:checked')?.value;
      if (!provider) {
        showToast('Please select a geocoding provider', 'error');
        return false;
      }
      
      const geocodingConfig = { provider, enabled: true };
      
      if (provider === 'nominatim') {
        // Nominatim doesn't require an API key - no validation needed
        geocodingConfig.locationiqKey = null;
        geocodingConfig.googleMapsKey = null;
      } else if (provider === 'locationiq') {
        geocodingConfig.locationiqKey = document.getElementById('locationiq-key').value;
        if (!geocodingConfig.locationiqKey) {
          showToast('Please enter your LocationIQ API key', 'error');
          return false;
        }
      } else if (provider === 'google') {
        geocodingConfig.googleMapsKey = document.getElementById('google-maps-key').value;
        if (!geocodingConfig.googleMapsKey) {
          showToast('Please enter your Google Maps API key', 'error');
          return false;
        }
      }
      
      geocodingConfig.city = document.getElementById('geo-city').value;
      geocodingConfig.state = document.getElementById('geo-state').value;
      geocodingConfig.country = document.getElementById('geo-country').value;
      // Get counties from selectedCounties Set
      geocodingConfig.counties = Array.from(selectedCounties);
      // Get towns from the towns list
      const townsTextarea = document.getElementById('geo-towns');
      if (townsTextarea) {
        const townsText = townsTextarea.value.trim();
        geocodingConfig.towns = townsText ? townsText.split('\n').map(t => t.trim()).filter(t => t.length > 0) : [];
      }
      
      await api('/api/setup/config/geocoding', 'POST', geocodingConfig);
      config.geocoding = geocodingConfig;
      return true;
    }
    
    case 'ai': {
      const enabled = document.getElementById('ai-enabled').checked;
      
      const aiConfig = { enabled };
      
      if (enabled) {
        const provider = document.querySelector('input[name="ai-provider"]:checked')?.value;
        if (!provider) {
          showToast('Please select an AI provider', 'error');
          return false;
        }
        
        aiConfig.provider = provider;
        
        if (provider === 'ollama') {
          aiConfig.ollamaUrl = document.getElementById('ollama-url').value || 'http://localhost:11434';
          aiConfig.ollamaModel = document.getElementById('ollama-model').value || 'llama3.1:8b';
        } else if (provider === 'openai') {
          aiConfig.openaiKey = document.getElementById('openai-ai-key').value;
          aiConfig.openaiModel = document.getElementById('openai-model').value || 'gpt-4o-mini';
          if (!aiConfig.openaiKey) {
            showToast('Please enter your OpenAI API key', 'error');
            return false;
          }
        }
      }
      
      await api('/api/setup/config/ai', 'POST', aiConfig);
      config.ai = aiConfig;
      return true;
    }
    
    case 'discord': {
      const enabled = document.getElementById('discord-enabled').checked;
      
      const discordConfig = { enabled };
      
      if (enabled) {
        discordConfig.token = document.getElementById('discord-token').value;
        if (!discordConfig.token) {
          showToast('Please enter your Discord bot token', 'error');
          return false;
        }
      }
      
      await api('/api/setup/config/discord', 'POST', discordConfig);
      config.discord = discordConfig;
      return true;
    }
    
    case 'review':
      return true;
      
    default:
      return true;
  }
}

// Render step content
async function renderStep(step) {
  const stepDef = steps[step];
  updateProgress();
  
  // Update navigation buttons
  btnPrev.disabled = step === 0;
  btnNext.textContent = step === steps.length - 1 ? 'Complete Setup' : 'Next →';
  
  // Render step content
  switch (stepDef.id) {
    case 'welcome':
      renderWelcomeStep();
      break;
    case 'admin':
      renderAdminStep();
      setTimeout(() => validateStep('admin'), 100); // Validate after DOM is ready
      break;
    case 'map':
      renderMapStep();
      setTimeout(() => validateStep('map'), 100); // Validate after DOM is ready
      break;
    case 'apikey':
      await renderApiKeyStep();
      break;
    case 'talkgroups':
      await renderTalkgroupsStep();
      break;
    case 'transcription':
      await renderTranscriptionStep();
      setTimeout(() => validateStep('transcription'), 100); // Validate after DOM is ready
      break;
    case 'geocoding':
      await renderGeocodingStep();
      setTimeout(() => validateStep('geocoding'), 100); // Validate after DOM is ready
      break;
    case 'ai':
      renderAiStep();
      setTimeout(() => validateStep('ai'), 100); // Validate after DOM is ready
      break;
    case 'discord':
      renderDiscordStep();
      setTimeout(() => validateStep('discord'), 100); // Validate after DOM is ready
      break;
    case 'review':
      renderReviewStep();
      break;
  }
}

// Step Renderers

// Store detected location globally
let detectedLocation = null;

function renderWelcomeStep() {
  wizardContent.innerHTML = `
    <h2><span class="step-icon">👋</span> Welcome to Scanner Map</h2>
    <p>This wizard will guide you through the initial configuration.</p>
    
    <div id="location-detection" style="margin-top: 24px; padding: 20px; background: var(--surface-light); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span class="spinner" id="location-spinner" style="display: none;"></span>
        <span id="location-status">Detecting your location...</span>
      </div>
      <div id="location-result" style="display: none;">
        <div style="color: var(--success); font-weight: 600; margin-bottom: 8px;">
          ✓ Detected: <span id="detected-location-text"></span>
        </div>
        <button class="btn btn-secondary btn-small" onclick="detectLocationAgain()">Detect Again</button>
      </div>
    </div>
    
    <div style="margin-top: 32px;">
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="setup-type" value="fresh" checked>
          <div class="item-content">
            <div class="item-title">Fresh Installation</div>
            <div class="item-desc">Start with a clean configuration</div>
          </div>
        </label>
        <label class="radio-item" id="import-option" style="display: none;">
          <input type="radio" name="setup-type" value="import">
          <div class="item-content">
            <div class="item-title">Import from .env</div>
            <div class="item-desc">Import settings from existing .env file</div>
          </div>
        </label>
      </div>
    </div>
    
    <div style="margin-top: 32px; padding: 20px; background: var(--surface-light); border-radius: 8px;">
      <h3 style="margin-bottom: 12px;">What you'll configure:</h3>
      <ul style="list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <li>✓ Admin account</li>
        <li>✓ Map center & timezone</li>
        <li>✓ Scanner software connection</li>
        <li>✓ Talkgroup mappings</li>
        <li>✓ Audio transcription</li>
        <li>✓ Address geocoding</li>
        <li>✓ AI features</li>
        <li>✓ Discord integration</li>
      </ul>
    </div>
  `;
  
  // Auto-detect location
  detectLocation();
  
  // Check if .env import is available
  fetch('/api/setup/status')
    .then(r => r.json())
    .then(status => {
      if (status.hasExistingEnv) {
        document.getElementById('import-option').style.display = 'flex';
      }
    });
}

// Detect location function
async function detectLocation() {
  const spinner = document.getElementById('location-spinner');
  const status = document.getElementById('location-status');
  const result = document.getElementById('location-result');
  
  if (spinner) spinner.style.display = 'inline-block';
  if (status) status.textContent = 'Detecting your location...';
  
  try {
    const response = await fetch('/api/setup/detect-location');
    const data = await response.json();
    
    if (data.success) {
      detectedLocation = data;
      
      // Apply smart defaults immediately (Phase 2)
      applySmartDefaults(data);
      
      if (status) status.textContent = '';
      if (spinner) spinner.style.display = 'none';
      if (result) {
        result.style.display = 'block';
        document.getElementById('detected-location-text').textContent = 
          `${data.city}, ${data.stateCode || data.region}, ${data.country}`;
      }
    } else {
      if (status) status.textContent = 'Could not detect location - you can set it manually';
      if (spinner) spinner.style.display = 'none';
    }
  } catch (error) {
    if (status) status.textContent = 'Location detection unavailable - you can set it manually';
    if (spinner) spinner.style.display = 'none';
  }
}

// Apply smart defaults based on detected location (Phase 2)
function applySmartDefaults(locationData) {
  if (!locationData || !locationData.success) return;
  
  // Apply map center coordinates
  if (!config.map) config.map = {};
  if (locationData.lat && locationData.lng) {
    config.map.center = [locationData.lat, locationData.lng];
  }
  
  // Apply timezone
  if (!config.server) config.server = {};
  if (locationData.timezone) {
    config.server.timezone = locationData.timezone;
  }
  
  // Apply geocoding state
  if (!config.geocoding) config.geocoding = {};
  if (locationData.stateCode) {
    config.geocoding.state = locationData.stateCode;
  } else if (locationData.region) {
    // Try to extract state code from region name if needed
    config.geocoding.state = locationData.region;
  }
  if (locationData.country) {
    config.geocoding.country = locationData.country;
  }
  
  console.log('[Setup] Smart defaults applied from detected location:', {
    center: config.map.center,
    timezone: config.server.timezone,
    state: config.geocoding.state
  });
}

window.detectLocationAgain = detectLocation;

window.refreshOllamaModels = async function() {
  const url = document.getElementById('ollama-url')?.value || 'http://localhost:11434';
  const result = await api(`/api/setup/detect-ollama?url=${encodeURIComponent(url)}`).catch(() => ({ available: false }));
  
  if (result.available && result.models) {
    window.ollamaResult = result;
    const provider = document.querySelector('input[name="ai-provider"]:checked')?.value;
    if (provider === 'ollama') {
      renderAiProviderOptions('ollama');
    }
  }
};

function renderAdminStep() {
  wizardContent.innerHTML = `
    <h2><span class="step-icon">🔐</span> Admin Account <span class="optional-badge">Optional</span></h2>
    <p>Set up administrator credentials to protect your settings. You can skip this and configure it later.</p>
    
    <div style="margin-top: 16px; padding: 12px; background: rgba(0, 170, 255, 0.1); border: 1px solid var(--secondary); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span>ℹ️</span>
        <strong>Authentication is optional</strong>
      </div>
      <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">
        If you don't enable authentication, the map interface will be publicly accessible. You can always enable it later in the admin settings.
      </p>
    </div>
    
    <hr class="section-divider">
    
    <div class="checkbox-group" style="margin-top: 24px;">
      <label class="checkbox-item">
        <input type="checkbox" id="auth-enabled" onchange="toggleAdminFields()">
        <div class="item-content">
          <div class="item-title">Enable Authentication</div>
          <div class="item-desc">Require login to access the map interface and settings</div>
        </div>
      </label>
    </div>
    
    <div id="admin-fields" style="display: none; margin-top: 24px;">
      <div class="two-columns">
        <div class="form-group">
          <label for="admin-username">Username</label>
          <input type="text" id="admin-username" value="admin" placeholder="admin">
        </div>
        <div></div>
      </div>
      
      <div class="two-columns">
        <div class="form-group">
          <label for="admin-password">Password</label>
          <input type="password" id="admin-password" placeholder="Enter a secure password" onblur="validateField('admin-password', 'password', this.value); validateStep('admin');">
          <div class="help-text">Minimum 8 characters</div>
        </div>
        <div class="form-group">
          <label for="admin-confirm-password">Confirm Password</label>
          <input type="password" id="admin-confirm-password" placeholder="Confirm password">
        </div>
      </div>
    </div>
    
    <div style="margin-top: 24px; padding: 12px; background: var(--surface-light); border-radius: 8px;">
      <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">
        <strong>Note:</strong> You can skip this step by leaving authentication disabled and clicking "Next". You can always set up an admin account later from the settings page.
      </p>
    </div>
  `;
  
  // Add toggle function
  window.toggleAdminFields = function() {
    const authEnabled = document.getElementById('auth-enabled').checked;
    const adminFields = document.getElementById('admin-fields');
    if (adminFields) {
      adminFields.style.display = authEnabled ? 'block' : 'none';
    }
  };
}

function renderMapStep() {
  // Use detected location or defaults
  const defaultLat = detectedLocation?.lat || 39.0;
  const defaultLng = detectedLocation?.lng || -76.9;
  const defaultTimezone = detectedLocation?.timezone || 'America/New_York';
  
  wizardContent.innerHTML = `
    <h2><span class="step-icon">🗺️</span> Map Settings</h2>
    <p>Set the default map center and timezone for your coverage area.</p>
    
    ${detectedLocation ? `
    <div style="margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--success); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>✓</span>
        <span>Using detected location: ${detectedLocation.city}, ${detectedLocation.stateCode || detectedLocation.region}</span>
        <button class="btn btn-secondary btn-small" onclick="resetToDetected()" style="margin-left: auto;">Reset to Detected</button>
      </div>
    </div>
    ` : ''}
    
    <div class="map-container" id="setup-map"></div>
    <div id="map-radius-info" style="display: none; margin-top: 8px;"></div>
    <p class="map-hint">Click on the map to set the center point. Counties within a 20-mile radius will be auto-selected in the Geocoding step.</p>
    
    <div class="two-columns" style="margin-top: 16px;">
      <div class="form-group">
        <label for="map-lat">Latitude</label>
        <input type="number" id="map-lat" step="0.000001" value="${defaultLat}" placeholder="39.0" onblur="validateField('map-lat', 'latitude', this.value); validateStep('map');">
      </div>
      <div class="form-group">
        <label for="map-lng">Longitude</label>
        <input type="number" id="map-lng" step="0.000001" value="${defaultLng}" placeholder="-76.9" onblur="validateField('map-lng', 'longitude', this.value); validateStep('map');">
      </div>
    </div>
    
    <div class="two-columns">
      <div class="form-group">
        <label for="map-zoom">Default Zoom Level</label>
        <input type="range" id="map-zoom" min="8" max="18" value="13">
        <div class="help-text">Zoom: <span id="zoom-value">13</span></div>
      </div>
      <div class="form-group">
        <label for="map-timezone">Timezone</label>
        <select id="map-timezone">
          <option value="America/New_York" ${defaultTimezone.includes('New_York') ? 'selected' : ''}>Eastern (America/New_York)</option>
          <option value="America/Chicago" ${defaultTimezone.includes('Chicago') ? 'selected' : ''}>Central (America/Chicago)</option>
          <option value="America/Denver" ${defaultTimezone.includes('Denver') ? 'selected' : ''}>Mountain (America/Denver)</option>
          <option value="America/Los_Angeles" ${defaultTimezone.includes('Los_Angeles') ? 'selected' : ''}>Pacific (America/Los_Angeles)</option>
          <option value="America/Detroit" ${defaultTimezone.includes('Detroit') ? 'selected' : ''}>Eastern - Michigan (America/Detroit)</option>
          <option value="America/Indiana/Indianapolis" ${defaultTimezone.includes('Indianapolis') ? 'selected' : ''}>Eastern - Indiana (America/Indiana/Indianapolis)</option>
          <option value="America/Phoenix" ${defaultTimezone.includes('Phoenix') ? 'selected' : ''}>Mountain - Arizona (America/Phoenix)</option>
          <option value="America/Anchorage" ${defaultTimezone.includes('Anchorage') ? 'selected' : ''}>Alaska (America/Anchorage)</option>
          <option value="Pacific/Honolulu" ${defaultTimezone.includes('Honolulu') ? 'selected' : ''}>Hawaii (Pacific/Honolulu)</option>
          <option value="UTC">UTC</option>
        </select>
        ${detectedLocation?.timezone ? `<div class="help-text">Auto-detected: ${detectedLocation.timezone}</div>` : ''}
      </div>
    </div>
  `;
  
  // Initialize map
  setTimeout(() => {
    map = L.map('setup-map').setView([defaultLat, defaultLng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
    
    // Handle map click
    map.on('click', async (e) => {
      marker.setLatLng(e.latlng);
      document.getElementById('map-lat').value = e.latlng.lat.toFixed(6);
      document.getElementById('map-lng').value = e.latlng.lng.toFixed(6);
      
      // Store location for county selection
      mapCenterLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
      
      // Show info about 20-mile radius
      showMapRadiusInfo(e.latlng.lat, e.latlng.lng);
      
      // Reverse geocode to find nearest city
      await updateCityFromCoordinates(e.latlng.lat, e.latlng.lng);
      
      // Auto-detect counties if on geocoding step
      await autoDetectCountiesFromMapLocation(e.latlng.lat, e.latlng.lng);
    });
    
    // Handle marker drag
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      document.getElementById('map-lat').value = pos.lat.toFixed(6);
      document.getElementById('map-lng').value = pos.lng.toFixed(6);
      
      // Store location for county selection
      mapCenterLocation = { lat: pos.lat, lng: pos.lng };
      
      // Show info about 20-mile radius
      showMapRadiusInfo(pos.lat, pos.lng);
      
      // Reverse geocode to find nearest city
      await updateCityFromCoordinates(pos.lat, pos.lng);
      
      // Auto-detect counties if on geocoding step
      await autoDetectCountiesFromMapLocation(pos.lat, pos.lng);
    });
    
    // Handle coordinate input
    document.getElementById('map-lat').addEventListener('change', async () => {
      updateMarker();
      const lat = parseFloat(document.getElementById('map-lat').value);
      const lng = parseFloat(document.getElementById('map-lng').value);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapCenterLocation = { lat, lng };
        showMapRadiusInfo(lat, lng);
        await updateCityFromCoordinates(lat, lng);
        await autoDetectCountiesFromMapLocation(lat, lng);
      }
    });
    document.getElementById('map-lng').addEventListener('change', async () => {
      updateMarker();
      const lat = parseFloat(document.getElementById('map-lat').value);
      const lng = parseFloat(document.getElementById('map-lng').value);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapCenterLocation = { lat, lng };
        showMapRadiusInfo(lat, lng);
        await updateCityFromCoordinates(lat, lng);
        await autoDetectCountiesFromMapLocation(lat, lng);
      }
    });
    
    // Show radius circle on initial load
    if (defaultLat && defaultLng) {
      mapCenterLocation = { lat: defaultLat, lng: defaultLng };
      setTimeout(() => {
        showMapRadiusInfo(defaultLat, defaultLng);
      }, 500);
    }
    
    // Handle zoom slider
    document.getElementById('map-zoom').addEventListener('input', (e) => {
      document.getElementById('zoom-value').textContent = e.target.value;
      map.setZoom(parseInt(e.target.value));
    });
  }, 100);
}

window.resetToDetected = function() {
  if (detectedLocation) {
    document.getElementById('map-lat').value = detectedLocation.lat.toFixed(6);
    document.getElementById('map-lng').value = detectedLocation.lng.toFixed(6);
    mapCenterLocation = { lat: detectedLocation.lat, lng: detectedLocation.lng };
    updateMarker();
    map.setView([detectedLocation.lat, detectedLocation.lng], 10);
    showMapRadiusInfo(detectedLocation.lat, detectedLocation.lng);
  }
};

// Update city field from coordinates using reverse geocoding
async function updateCityFromCoordinates(lat, lng) {
  try {
    const cityInput = document.getElementById('geo-city');
    if (!cityInput) return; // Geocoding step not rendered yet
    
    // Show loading state
    const originalValue = cityInput.value;
    cityInput.placeholder = 'Looking up city...';
    
    const result = await api('/api/setup/reverse-geocode', 'POST', { lat, lng });
    
    if (result.success && result.city) {
      cityInput.value = result.city;
      cityInput.placeholder = 'Baltimore';
      // Also update state if available
      const stateSelect = document.getElementById('geo-state');
      if (stateSelect && result.state) {
        // Try to match state name or code
        const stateOption = Array.from(stateSelect.options).find(opt => 
          opt.value === result.state || opt.text.includes(result.state)
        );
        if (stateOption) {
          stateSelect.value = stateOption.value;
        }
      }
    } else {
      cityInput.placeholder = 'Baltimore';
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    const cityInput = document.getElementById('geo-city');
    if (cityInput) {
      cityInput.placeholder = 'Baltimore';
    }
  }
}

// Show 20-mile radius circle and info
function showMapRadiusInfo(lat, lng) {
  // Remove existing radius circle if any
  if (window.radiusCircle) {
    map.removeLayer(window.radiusCircle);
  }
  
  // Add 20-mile radius circle (approximately 0.29 degrees at this latitude)
  const radiusMeters = 20 * 1609.34; // Convert miles to meters
  window.radiusCircle = L.circle([lat, lng], {
    radius: radiusMeters,
    color: '#00ff88',
    fillColor: '#00ff88',
    fillOpacity: 0.1,
    weight: 2,
    dashArray: '5, 5'
  }).addTo(map);
  
  // Show info message
  const infoDiv = document.getElementById('map-radius-info');
  if (infoDiv) {
    infoDiv.style.display = 'block';
    infoDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0, 255, 136, 0.1); border-radius: 4px;">
        <span>📡</span>
        <span>20-mile radio range selected. Counties within this radius will be auto-selected in the Geocoding step.</span>
      </div>
    `;
  }
}

function updateMarker() {
  const lat = parseFloat(document.getElementById('map-lat').value);
  const lng = parseFloat(document.getElementById('map-lng').value);
  if (!isNaN(lat) && !isNaN(lng)) {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng]);
  }
}

async function renderApiKeyStep() {
  wizardContent.innerHTML = `
    <h2><span class="step-icon">🔑</span> Scanner Software Connection</h2>
    <p>Use this API key to connect SDRTrunk or TrunkRecorder to Scanner Map.</p>
    
    <div class="api-key-display">
      <div class="api-key-value" id="api-key-value">Generating...</div>
      <div class="copy-buttons">
        <button class="btn btn-secondary btn-small" onclick="copyApiKey()">📋 Copy API Key</button>
        <button class="btn btn-secondary btn-small" onclick="regenerateApiKey()">🔄 Regenerate</button>
      </div>
    </div>
    
    <hr class="section-divider">
    
    <h3>Connection Instructions</h3>
    
    <div style="margin-top: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px;">
      <h4 style="margin-bottom: 8px;">SDRTrunk</h4>
      <ol style="padding-left: 20px; color: var(--text-muted);">
        <li>Go to Streaming → Add Rdio Scanner</li>
        <li>Enter the URL: <code style="color: var(--secondary);">http://YOUR_IP:8080/api/call-upload</code></li>
        <li>Enter the API key shown above</li>
      </ol>
    </div>
    
    <div style="margin-top: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px;">
      <h4 style="margin-bottom: 8px;">TrunkRecorder</h4>
      <ol style="padding-left: 20px; color: var(--text-muted);">
        <li>Edit your config.json</li>
        <li>Add an uploadServer entry</li>
        <li>Set the URL and API key</li>
      </ol>
    </div>
  `;
  
  // Generate API key
  const result = await api('/api/setup/generate-api-key', 'POST');
  document.getElementById('api-key-value').textContent = result.apiKey;
  config.apiKey = result.apiKey;
}

window.copyApiKey = function() {
  navigator.clipboard.writeText(config.apiKey);
  showToast('API key copied to clipboard', 'success');
};

window.regenerateApiKey = async function() {
  const result = await api('/api/setup/generate-api-key', 'POST');
  document.getElementById('api-key-value').textContent = result.apiKey;
  config.apiKey = result.apiKey;
  showToast('New API key generated', 'success');
};

async function renderTalkgroupsStep() {
  wizardContent.innerHTML = `
    <h2><span class="step-icon">📻</span> Talkgroups</h2>
    <p>Import talkgroups from RadioReference and generate configurations for your scanner software.</p>
    
    <div class="radio-group" style="margin-top: 24px;" id="import-method-selector">
      <label class="radio-item">
        <input type="radio" name="import-method" value="radioreference" checked>
        <div class="item-content">
          <div class="item-title">RadioReference Import</div>
          <div class="item-desc">Import from RadioReference CSV export (recommended)</div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="import-method" value="csv">
        <div class="item-content">
          <div class="item-title">CSV Upload</div>
          <div class="item-desc">Upload a talkgroups.csv file</div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="import-method" value="manual">
        <div class="item-content">
          <div class="item-title">Manual Entry</div>
          <div class="item-desc">Manually enter digital talkgroups or analog frequencies</div>
        </div>
      </label>
    </div>
    
    <div id="radioreference-import" style="margin-top: 24px;">
      <div style="padding: 16px; background: var(--surface-light); border-radius: 8px; margin-bottom: 16px;">
        <h4 style="margin-bottom: 12px;">📡 RadioReference Import</h4>
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9em;">
          Export your talkgroups from RadioReference as CSV, then upload here. We'll automatically generate configurations for RDIO Scanner, SDRTrunk, and TrunkRecorder.
        </p>
        
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px;">How to export from RadioReference:</div>
          <ol style="margin-left: 20px; line-height: 1.8; font-size: 0.9em;">
            <li>Go to your system's page on <a href="https://www.radioreference.com" target="_blank" style="color: var(--secondary);">RadioReference.com</a></li>
            <li>Click "Export" or "Download" for talkgroups</li>
            <li>Select CSV format</li>
            <li>Upload the file below</li>
          </ol>
        </div>
        
        <div class="file-upload-area" id="rr-csv-upload">
          <div class="upload-icon">📁</div>
          <div>Drag & drop RadioReference CSV export here</div>
          <div style="margin-top: 8px; color: var(--text-muted);">or click to browse</div>
          <input type="file" accept=".csv" id="rr-csv-file-input">
        </div>
        
        <div id="rr-system-info" style="display: none; margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border-radius: 6px;">
          <div style="font-weight: 600; margin-bottom: 4px;">System Information:</div>
          <div id="rr-system-details" style="font-size: 0.9em;"></div>
        </div>
      </div>
      
      <div id="config-generation" style="display: none; margin-top: 24px; padding: 16px; background: var(--surface-light); border-radius: 8px;">
        <h4 style="margin-bottom: 12px;">⚙️ Generate Scanner Configurations</h4>
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9em;">
          Generate configuration files for your scanner software:
        </p>
        
        <div class="checkbox-group">
          <label class="checkbox-item">
            <input type="checkbox" id="gen-rdio-scanner" checked>
            <div class="item-content">
              <div class="item-title">RDIO Scanner</div>
              <div class="item-desc">Generate rdio-scanner-config.json</div>
            </div>
          </label>
          
          <label class="checkbox-item">
            <input type="checkbox" id="gen-sdrtrunk" checked>
            <div class="item-content">
              <div class="item-title">SDRTrunk</div>
              <div class="item-desc">Generate sdrtrunk-config.json</div>
            </div>
          </label>
          
          <label class="checkbox-item">
            <input type="checkbox" id="gen-trunkrecorder" checked>
            <div class="item-content">
              <div class="item-title">TrunkRecorder</div>
              <div class="item-desc">Generate trunkrecorder-config.json</div>
            </div>
          </label>
        </div>
        
        <div style="margin-top: 16px;">
          <button class="btn btn-primary" onclick="generateConfigFiles()">Generate Configuration Files</button>
          <div id="config-generation-status" style="margin-top: 12px;"></div>
        </div>
      </div>
    </div>
    
    <div id="csv-upload" style="display: none; margin-top: 24px;">
      <div class="file-upload-area">
        <div class="upload-icon">📁</div>
        <div>Drag & drop your talkgroups.csv file here</div>
        <div style="margin-top: 8px; color: var(--text-muted);">or click to browse</div>
        <input type="file" accept=".csv" id="csv-file-input">
      </div>
    </div>
    
    <div id="manual-entry" style="display: none; margin-top: 24px;">
      <div style="padding: 16px; background: var(--surface-light); border-radius: 8px;">
        <h4 style="margin-bottom: 12px;">✏️ Manual Entry</h4>
        <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9em;">
          Manually add digital talkgroups (trunked systems) or analog frequencies. Supports both digital and analog systems.
        </p>
        
        <div class="radio-group" style="margin-bottom: 16px;">
          <label class="radio-item">
            <input type="radio" name="entry-type" value="digital" checked>
            <div class="item-content">
              <div class="item-title">Digital (Trunked)</div>
              <div class="item-desc">Enter talkgroup IDs for trunked systems</div>
            </div>
          </label>
          
          <label class="radio-item">
            <input type="radio" name="entry-type" value="analog">
            <div class="item-content">
              <div class="item-title">Analog</div>
              <div class="item-desc">Enter frequencies in MHz for analog systems</div>
            </div>
          </label>
        </div>
        
        <div id="digital-entry-form">
          <div class="two-columns">
            <div class="form-group">
              <label for="manual-dec">Talkgroup ID (Decimal)</label>
              <input type="number" id="manual-dec" placeholder="12345" min="0">
              <div class="help-text">Numeric talkgroup ID</div>
            </div>
            <div class="form-group">
              <label for="manual-hex">Hex (Optional)</label>
              <input type="text" id="manual-hex" placeholder="0x3039" pattern="[0-9A-Fa-fx]+">
              <div class="help-text">Auto-calculated from decimal</div>
            </div>
          </div>
          
          <div class="two-columns">
            <div class="form-group">
              <label for="manual-alpha">Alpha Tag</label>
              <input type="text" id="manual-alpha" placeholder="Dispatch" maxlength="16">
              <div class="help-text">Short identifier (max 16 chars)</div>
            </div>
            <div class="form-group">
              <label for="manual-mode">Mode</label>
              <select id="manual-mode">
                <option value="A">Analog</option>
                <option value="D">Digital</option>
                <option value="TD">TDMA</option>
                <option value="FD">FDMA</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="manual-description">Description</label>
            <input type="text" id="manual-description" placeholder="Police Dispatch - Main Channel">
          </div>
          
          <div class="two-columns">
            <div class="form-group">
              <label for="manual-tag">Category/Tag</label>
              <input type="text" id="manual-tag" placeholder="Dispatch, Fire, EMS, Police">
            </div>
            <div class="form-group">
              <label for="manual-county">County</label>
              <input type="text" id="manual-county" placeholder="Baltimore">
            </div>
          </div>
        </div>
        
        <div id="analog-entry-form" style="display: none;">
          <div class="form-group">
            <label for="manual-frequency">Frequency (MHz)</label>
            <input type="number" id="manual-frequency" placeholder="154.250" step="0.000001" min="0">
            <div class="help-text">Enter frequency in MHz (e.g., 154.250 for 154.250 MHz)</div>
          </div>
          
          <div class="two-columns">
            <div class="form-group">
              <label for="analog-alpha">Alpha Tag</label>
              <input type="text" id="analog-alpha" placeholder="Fire Dispatch" maxlength="16">
            </div>
            <div class="form-group">
              <label for="analog-mode">Mode</label>
              <select id="analog-mode">
                <option value="FM">FM</option>
                <option value="AM">AM</option>
                <option value="NFM">NFM (Narrow FM)</option>
                <option value="WFM">WFM (Wide FM)</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="analog-description">Description</label>
            <input type="text" id="analog-description" placeholder="Fire Department Dispatch">
          </div>
          
          <div class="two-columns">
            <div class="form-group">
              <label for="analog-tag">Category/Tag</label>
              <input type="text" id="analog-tag" placeholder="Fire, Police, EMS">
            </div>
            <div class="form-group">
              <label for="analog-county">County</label>
              <input type="text" id="analog-county" placeholder="Baltimore">
            </div>
          </div>
        </div>
        
        <div style="margin-top: 16px;">
          <button class="btn btn-primary" onclick="addManualTalkgroup()">Add Talkgroup/Frequency</button>
          <button class="btn btn-secondary" onclick="clearManualForm()" style="margin-left: 8px;">Clear Form</button>
        </div>
        
        <div id="manual-entry-list" style="margin-top: 24px; display: none;">
          <h4 style="margin-bottom: 12px;">Added Entries</h4>
          <div id="manual-entries-container" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: 4px; padding: 8px; background: var(--surface);">
            <!-- Entries will be listed here -->
          </div>
          <div style="margin-top: 12px;">
            <button class="btn btn-primary" onclick="saveManualEntries()">Save All Entries</button>
            <button class="btn btn-secondary" onclick="clearManualEntries()" style="margin-left: 8px;">Clear All</button>
          </div>
        </div>
      </div>
    </div>
    
    <div id="talkgroups-section" style="display: none; margin-top: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 id="tg-count">0 talkgroups loaded</h3>
        <button class="btn btn-secondary btn-small" onclick="selectAllTalkgroups()">Select All Dispatch</button>
      </div>
      
      <p style="color: var(--text-muted); margin-bottom: 12px;">
        Select talkgroups for address extraction and add location descriptions for geocoding.
      </p>
      
      <div class="talkgroup-list" id="talkgroup-list"></div>
    </div>
  `;
  
  // Handle import method selection
  document.querySelectorAll('input[name="import-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'radioreference') {
        document.getElementById('radioreference-import').style.display = 'block';
        document.getElementById('csv-upload').style.display = 'none';
        document.getElementById('manual-entry').style.display = 'none';
      } else if (e.target.value === 'csv') {
        document.getElementById('radioreference-import').style.display = 'none';
        document.getElementById('csv-upload').style.display = 'block';
        document.getElementById('manual-entry').style.display = 'none';
      } else if (e.target.value === 'manual') {
        document.getElementById('radioreference-import').style.display = 'none';
        document.getElementById('csv-upload').style.display = 'none';
        document.getElementById('manual-entry').style.display = 'block';
      }
    });
  });
  
  // Handle entry type selection (digital vs analog)
  document.querySelectorAll('input[name="entry-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'digital') {
        document.getElementById('digital-entry-form').style.display = 'block';
        document.getElementById('analog-entry-form').style.display = 'none';
      } else {
        document.getElementById('digital-entry-form').style.display = 'none';
        document.getElementById('analog-entry-form').style.display = 'block';
      }
    });
  });
  
  // Auto-calculate hex from decimal for digital entries
  document.getElementById('manual-dec')?.addEventListener('input', (e) => {
    const dec = parseInt(e.target.value);
    if (!isNaN(dec) && dec >= 0) {
      document.getElementById('manual-hex').value = `0x${dec.toString(16).toUpperCase()}`;
    }
  });
  
  // Setup RadioReference CSV upload
  const rrUploadArea = document.getElementById('rr-csv-upload');
  const rrFileInput = document.getElementById('rr-csv-file-input');
  
  rrUploadArea.addEventListener('click', () => rrFileInput.click());
  
  rrUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    rrUploadArea.classList.add('dragover');
  });
  
  rrUploadArea.addEventListener('dragleave', () => {
    rrUploadArea.classList.remove('dragover');
  });
  
  rrUploadArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    rrUploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) await uploadRadioReferenceCSV(file);
  });
  
  rrFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await uploadRadioReferenceCSV(file);
  });
  
  // Setup regular CSV upload (existing code)
  const uploadArea = document.getElementById('csv-upload');
  const fileInput = document.getElementById('csv-file-input');
  
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) await uploadCsvFile(file);
    });
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await uploadCsvFile(file);
    });
  }
  
  // Check for existing talkgroups
  const result = await api('/api/setup/talkgroups');
  if (result.talkgroups && result.talkgroups.length > 0) {
    talkgroups = result.talkgroups;
    renderTalkgroupList();
  }
}

async function uploadRadioReferenceCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    showToast('Uploading and parsing RadioReference CSV...', 'info');
    
    const response = await fetch('/api/setup/upload-radioreference', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast(`Loaded ${result.count} talkgroups from RadioReference`, 'success');
      
      // Show system info if available
      if (result.systemName || result.systemId) {
        const systemInfo = document.getElementById('rr-system-info');
        const systemDetails = document.getElementById('rr-system-details');
        systemInfo.style.display = 'block';
        systemDetails.innerHTML = `
          <div><strong>System:</strong> ${result.systemName || 'Unknown'}</div>
          ${result.systemId ? `<div><strong>System ID:</strong> ${result.systemId}</div>` : ''}
        `;
      }
      
      // Import to database
      await api('/api/setup/import-talkgroups', 'POST', { talkgroups: [] });
      
      // Fetch full list
      const fullResult = await api('/api/setup/talkgroups');
      talkgroups = fullResult.talkgroups || [];
      
      renderTalkgroupList();
      
      // Show config generation section
      document.getElementById('config-generation').style.display = 'block';
      
      // Store system info for config generation
      window.rrSystemInfo = {
        name: result.systemName || 'Imported System',
        id: result.systemId || null
      };
    } else {
      showToast('Error parsing RadioReference CSV: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Upload failed: ' + error.message, 'error');
  }
}

window.generateConfigFiles = async function() {
  const statusEl = document.getElementById('config-generation-status');
  statusEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ Generating configuration files...</span>';
  
  const generateRdio = document.getElementById('gen-rdio-scanner').checked;
  const generateSdrtrunk = document.getElementById('gen-sdrtrunk').checked;
  const generateTrunkrecorder = document.getElementById('gen-trunkrecorder').checked;
  
  if (!generateRdio && !generateSdrtrunk && !generateTrunkrecorder) {
    statusEl.innerHTML = '<span style="color: var(--error);">Please select at least one configuration to generate</span>';
    return;
  }
  
  try {
    const systemInfo = window.rrSystemInfo || { name: 'Imported System', id: null };
    
    const result = await api('/api/setup/generate-configs', 'POST', {
      generateRdio,
      generateSdrtrunk,
      generateTrunkrecorder,
      systemName: systemInfo.name,
      systemId: systemInfo.id
    });
    
    if (result.success) {
      let message = 'Configuration files generated successfully:\n';
      if (result.files.rdioScanner) message += `• ${result.files.rdioScanner}\n`;
      if (result.files.sdrtrunk) message += `• ${result.files.sdrtrunk}\n`;
      if (result.files.trunkRecorder) message += `• ${result.files.trunkRecorder}\n`;
      
      let filesList = '';
      if (result.files.rdioScanner) filesList += `<div>• RDIO Scanner: <code>${result.files.rdioScanner}</code></div>`;
      if (result.files.sdrtrunk) filesList += `<div>• SDRTrunk: <code>${result.files.sdrtrunk}</code></div>`;
      if (result.files.trunkRecorder) filesList += `<div>• TrunkRecorder: <code>${result.files.trunkRecorder}</code></div>`;
      
      statusEl.innerHTML = `
        <div style="color: var(--success); margin-bottom: 8px;">✓ Configuration files generated!</div>
        <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 12px;">
          ${filesList}
          <div style="margin-top: 8px; padding: 8px; background: rgba(0, 170, 255, 0.1); border-radius: 4px;">
            Files saved to <code>configs/</code> directory in your Scanner Map folder
          </div>
        </div>
        <div style="margin-top: 12px;">
          <button class="btn btn-secondary btn-small" onclick="downloadConfigs()">Download All as ZIP</button>
          <span style="margin-left: 8px; font-size: 0.85em; color: var(--text-secondary);">(optional)</span>
        </div>
      `;
      
      window.generatedConfigs = result;
      showToast('Configuration files generated!', 'success');
    } else {
      statusEl.innerHTML = `<span style="color: var(--error);">Error: ${result.error}</span>`;
    }
  } catch (error) {
    statusEl.innerHTML = `<span style="color: var(--error);">Error: ${error.message}</span>`;
  }
};

window.downloadConfigs = async function() {
  if (!window.generatedConfigs) return;
  
  try {
    const response = await fetch('/api/setup/download-configs', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scanner-configs.zip';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    showToast('Download failed: ' + error.message, 'error');
  }
};

// Manual entry functions
let manualEntries = [];

window.addManualTalkgroup = function() {
  const entryType = document.querySelector('input[name="entry-type"]:checked')?.value;
  
  if (entryType === 'digital') {
    const dec = parseInt(document.getElementById('manual-dec').value);
    if (isNaN(dec) || dec < 0) {
      showToast('Please enter a valid talkgroup ID', 'error');
      return;
    }
    
    const entry = {
      id: dec,
      hex: document.getElementById('manual-hex').value || `0x${dec.toString(16).toUpperCase()}`,
      alphaTag: document.getElementById('manual-alpha').value || '',
      mode: document.getElementById('manual-mode').value || 'D',
      description: document.getElementById('manual-description').value || '',
      tag: document.getElementById('manual-tag').value || '',
      county: document.getElementById('manual-county').value || '',
      type: 'digital'
    };
    
    // Check for duplicates
    if (manualEntries.find(e => e.id === dec && e.type === 'digital')) {
      showToast('This talkgroup ID already exists', 'error');
      return;
    }
    
    manualEntries.push(entry);
  } else {
    const frequency = parseFloat(document.getElementById('manual-frequency').value);
    if (isNaN(frequency) || frequency <= 0) {
      showToast('Please enter a valid frequency', 'error');
      return;
    }
    
    // For analog, use frequency as ID (multiply by 1000000 to get Hz, then use as ID)
    const freqId = Math.round(frequency * 1000000);
    
    const entry = {
      id: freqId,
      hex: `0x${freqId.toString(16).toUpperCase()}`,
      frequency: frequency,
      alphaTag: document.getElementById('analog-alpha').value || '',
      mode: document.getElementById('analog-mode').value || 'FM',
      description: document.getElementById('analog-description').value || '',
      tag: document.getElementById('analog-tag').value || '',
      county: document.getElementById('analog-county').value || '',
      type: 'analog'
    };
    
    // Check for duplicates
    if (manualEntries.find(e => e.frequency === frequency && e.type === 'analog')) {
      showToast('This frequency already exists', 'error');
      return;
    }
    
    manualEntries.push(entry);
  }
  
  updateManualEntriesList();
  clearManualForm();
  showToast('Entry added', 'success');
};

window.clearManualForm = function() {
  const entryType = document.querySelector('input[name="entry-type"]:checked')?.value;
  
  if (entryType === 'digital') {
    document.getElementById('manual-dec').value = '';
    document.getElementById('manual-hex').value = '';
    document.getElementById('manual-alpha').value = '';
    document.getElementById('manual-mode').value = 'D';
    document.getElementById('manual-description').value = '';
    document.getElementById('manual-tag').value = '';
    document.getElementById('manual-county').value = '';
  } else {
    document.getElementById('manual-frequency').value = '';
    document.getElementById('analog-alpha').value = '';
    document.getElementById('analog-mode').value = 'FM';
    document.getElementById('analog-description').value = '';
    document.getElementById('analog-tag').value = '';
    document.getElementById('analog-county').value = '';
  }
};

window.updateManualEntriesList = function() {
  const container = document.getElementById('manual-entries-container');
  const listDiv = document.getElementById('manual-entry-list');
  
  if (manualEntries.length === 0) {
    listDiv.style.display = 'none';
    return;
  }
  
  listDiv.style.display = 'block';
  
  container.innerHTML = manualEntries.map((entry, index) => {
    if (entry.type === 'digital') {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-weight: 600;">${entry.alphaTag || `TG ${entry.id}`}</div>
            <div style="font-size: 0.85em; color: var(--text-secondary);">
              ID: ${entry.id} (${entry.hex}) | ${entry.description || 'No description'}
            </div>
          </div>
          <button class="btn btn-secondary btn-small" onclick="removeManualEntry(${index})">Remove</button>
        </div>
      `;
    } else {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border);">
          <div>
            <div style="font-weight: 600;">${entry.alphaTag || `${entry.frequency} MHz`}</div>
            <div style="font-size: 0.85em; color: var(--text-secondary);">
              ${entry.frequency} MHz (${entry.mode}) | ${entry.description || 'No description'}
            </div>
          </div>
          <button class="btn btn-secondary btn-small" onclick="removeManualEntry(${index})">Remove</button>
        </div>
      `;
    }
  }).join('');
};

window.removeManualEntry = function(index) {
  manualEntries.splice(index, 1);
  updateManualEntriesList();
  showToast('Entry removed', 'success');
};

window.clearManualEntries = function() {
  manualEntries = [];
  updateManualEntriesList();
  showToast('All entries cleared', 'success');
};

window.saveManualEntries = async function() {
  if (manualEntries.length === 0) {
    showToast('No entries to save', 'error');
    return;
  }
  
  try {
    showToast('Saving entries...', 'info');
    
    // Convert to database format
    const talkgroupsToSave = manualEntries.map(entry => ({
      id: entry.id,
      hex: entry.hex,
      alphaTag: entry.alphaTag,
      mode: entry.mode,
      description: entry.description,
      tag: entry.tag,
      county: entry.county,
      frequency: entry.frequency || null, // Store frequency for analog
      type: entry.type
    }));
    
    // Import to database
    await api('/api/setup/import-talkgroups', 'POST', { talkgroups: talkgroupsToSave });
    
    // Fetch full list
    const fullResult = await api('/api/setup/talkgroups');
    talkgroups = fullResult.talkgroups || [];
    
    renderTalkgroupList();
    
    // Show talkgroups section and config generation
    document.getElementById('talkgroups-section').style.display = 'block';
    document.getElementById('config-generation').style.display = 'block';
    
    // Store system info for config generation (use manual entry as default)
    window.rrSystemInfo = {
      name: 'Manual Entry System',
      id: null
    };
    
    // Clear manual entries
    manualEntries = [];
    updateManualEntriesList();
    
    showToast(`Successfully saved ${talkgroupsToSave.length} talkgroups/frequencies`, 'success');
  } catch (error) {
    showToast('Error saving entries: ' + error.message, 'error');
  }
};

async function uploadCsvFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/setup/upload-talkgroups', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      talkgroups = result.preview; // Use preview for now
      showToast(`Loaded ${result.count} talkgroups`, 'success');
      
      // Import to database
      await api('/api/setup/import-talkgroups', 'POST', { talkgroups: [] });
      
      // Fetch full list
      const fullResult = await api('/api/setup/talkgroups');
      talkgroups = fullResult.talkgroups || [];
      
      renderTalkgroupList();
    } else {
      showToast('Error parsing CSV: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Upload failed: ' + error.message, 'error');
  }
}

function renderTalkgroupList() {
  document.getElementById('talkgroups-section').style.display = 'block';
  document.getElementById('csv-upload').style.display = 'none';
  document.getElementById('tg-count').textContent = `${talkgroups.length} talkgroups loaded`;
  
  const list = document.getElementById('talkgroup-list');
  list.innerHTML = talkgroups.map(tg => `
    <div class="talkgroup-item">
      <input type="checkbox" class="tg-checkbox" data-id="${tg.id}">
      <span class="talkgroup-id">${tg.id}</span>
      <span class="talkgroup-name">${tg.alpha_tag || tg.alphaTag || 'Unknown'}</span>
      <span class="talkgroup-desc">
        <input type="text" class="tg-desc" data-id="${tg.id}" placeholder="Location description">
      </span>
    </div>
  `).join('');
}

window.selectAllTalkgroups = function() {
  document.querySelectorAll('.tg-checkbox').forEach(cb => {
    const name = cb.closest('.talkgroup-item').querySelector('.talkgroup-name').textContent.toLowerCase();
    if (name.includes('dispatch') || name.includes('disp')) {
      cb.checked = true;
    }
  });
};

async function renderTranscriptionStep() {
  // Detect GPU and system info
  const [gpuResult, systemInfo] = await Promise.all([
    api('/api/setup/detect-gpu'),
    api('/api/setup/system-info')
  ]);
  
  // Determine recommendation
  let recommendation = null;
  if (gpuResult.available) {
    recommendation = { model: 'large-v3', device: 'cuda', reason: 'GPU detected - best accuracy', time: '~2 seconds per call' };
  } else if (systemInfo.cpu.cores >= 8 && systemInfo.memory.totalGB >= 16) {
    recommendation = { model: 'medium', device: 'cpu', reason: 'High-end CPU - good balance', time: '~8 seconds per call' };
  } else if (systemInfo.cpu.cores >= 4) {
    recommendation = { model: 'small', device: 'cpu', reason: 'Mid-range CPU - faster processing', time: '~5 seconds per call' };
  } else {
    recommendation = { model: 'tiny', device: 'cpu', reason: 'Limited CPU - fastest processing', time: '~2 seconds per call' };
  }
  
  wizardContent.innerHTML = `
    <h2><span class="step-icon">🎤</span> Transcription Settings</h2>
    <p>Configure how audio will be transcribed to text.</p>
    
    ${systemInfo ? `
    <div style="margin-top: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px;">
      <div style="font-weight: 600; margin-bottom: 8px;">System Information:</div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.9em;">
        <div>CPU: ${systemInfo.cpu.cores} cores</div>
        <div>RAM: ${systemInfo.memory.totalGB} GB</div>
        ${gpuResult.available ? `<div style="grid-column: 1 / -1;">GPU: ${gpuResult.name} (${gpuResult.vramGB}GB VRAM)</div>` : ''}
      </div>
      ${recommendation ? `
      <div style="margin-top: 12px; padding: 12px; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--success); border-radius: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>⭐</span>
          <div>
            <div style="font-weight: 600;">Recommended: ${recommendation.model}</div>
            <div style="font-size: 0.85em; color: var(--text-secondary);">${recommendation.reason} • ${recommendation.time}</div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    <div class="radio-group" style="margin-top: 24px;">
      <label class="radio-item">
        <input type="radio" name="transcription-mode" value="local" checked>
        <div class="item-content">
          <div class="item-title">Local (Faster Whisper)</div>
          <div class="item-desc">
            Run transcription on this machine
            ${gpuResult.available ? `<span style="color: var(--success);">GPU detected: ${gpuResult.name}</span>` : '<span style="color: var(--warning);">No GPU detected - will use CPU</span>'}
          </div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="transcription-mode" value="remote">
        <div class="item-content">
          <div class="item-title">Remote Server</div>
          <div class="item-desc">Use a self-hosted Faster Whisper server</div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="transcription-mode" value="openai">
        <div class="item-content">
          <div class="item-title">OpenAI Whisper API</div>
          <div class="item-desc">Use OpenAI's cloud transcription service (requires API key)</div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="transcription-mode" value="icad">
        <div class="item-content">
          <div class="item-title">ICAD Transcribe</div>
          <div class="item-desc">Use ICAD's radio-optimized transcription server</div>
        </div>
      </label>
    </div>
    
    <div id="transcription-options" style="margin-top: 24px;"></div>
  `;
  
  // Store recommendation globally
  window.transcriptionRecommendation = recommendation;
  
  // Handle mode selection
  document.querySelectorAll('input[name="transcription-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      renderTranscriptionOptions(e.target.value, gpuResult.available, recommendation);
    });
  });
  
  // Render initial options
  renderTranscriptionOptions('local', gpuResult.available, recommendation);
}

function renderTranscriptionOptions(mode, hasGpu, recommendation) {
  const container = document.getElementById('transcription-options');
  
  switch (mode) {
    case 'local':
      const recommendedModel = recommendation?.model || 'large-v3';
      const recommendedDevice = recommendation?.device || (hasGpu ? 'cuda' : 'cpu');
      
      container.innerHTML = `
        <div class="two-columns">
          <div class="form-group">
            <label for="transcription-device">Processing Device</label>
            <select id="transcription-device">
              <option value="cuda" ${hasGpu ? (recommendedDevice === 'cuda' ? 'selected' : '') : 'disabled'}>GPU (CUDA) ${hasGpu ? (recommendedDevice === 'cuda' ? '- ⭐ Recommended' : '') : '- Not available'}</option>
              <option value="cpu" ${recommendedDevice === 'cpu' ? 'selected' : ''}>CPU ${recommendedDevice === 'cpu' ? '- ⭐ Recommended' : ''}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="whisper-model">Whisper Model</label>
            <select id="whisper-model">
              <option value="tiny" ${recommendedModel === 'tiny' ? 'selected' : ''}>Tiny (fastest, lowest accuracy)${recommendedModel === 'tiny' ? ' ⭐' : ''}</option>
              <option value="base" ${recommendedModel === 'base' ? 'selected' : ''}>Base${recommendedModel === 'base' ? ' ⭐' : ''}</option>
              <option value="small" ${recommendedModel === 'small' ? 'selected' : ''}>Small${recommendedModel === 'small' ? ' ⭐' : ''}</option>
              <option value="medium" ${recommendedModel === 'medium' ? 'selected' : ''}>Medium${recommendedModel === 'medium' ? ' ⭐' : ''}</option>
              <option value="large-v3" ${recommendedModel === 'large-v3' ? 'selected' : ''}>Large V3 (best accuracy)${recommendedModel === 'large-v3' ? ' ⭐' : ''}</option>
            </select>
            ${recommendation ? `<div class="help-text">${recommendation.reason} • ${recommendation.time}</div>` : ''}
          </div>
        </div>
      `;
      break;
      
    case 'remote':
      container.innerHTML = `
        <div class="form-group">
          <label for="remote-url">Server URL</label>
          <input type="url" id="remote-url" placeholder="http://localhost:8000" value="http://localhost:8000" onblur="validateField('remote-url', 'url', this.value); validateStep('transcription');">
          <div class="help-text">URL of your Faster Whisper server</div>
        </div>
        <div class="connection-test">
          <button class="btn btn-secondary btn-small" onclick="testConnection('remote')">Test Connection</button>
          <div id="remote-status"></div>
        </div>
      `;
      break;
      
    case 'openai':
      container.innerHTML = `
        <div class="form-group">
          <label for="openai-transcription-key">
            OpenAI API Key
            <button type="button" class="btn-help" onclick="toggleApiHelp('openai-transcription')" style="margin-left: 8px; font-size: 0.85em; padding: 2px 8px;">How to get API key?</button>
          </label>
          <input type="password" id="openai-transcription-key" placeholder="sk-..." oninput="validateApiKey('openai', this.value)" onblur="validateField('openai-transcription-key', 'api-key', this.value); validateStep('transcription');">
          <div id="openai-transcription-key-status" style="margin-top: 4px;"></div>
        </div>
        <div id="openai-transcription-help" style="display: none; margin-bottom: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px; border-left: 3px solid var(--secondary);">
          <h4 style="margin-bottom: 8px;">Getting an OpenAI API Key:</h4>
          <ol style="margin-left: 20px; line-height: 1.8;">
            <li>Visit <a href="https://platform.openai.com/" target="_blank" style="color: var(--secondary);">platform.openai.com</a></li>
            <li>Sign up or log in to your account</li>
            <li>Go to "API Keys" in your account settings</li>
            <li>Click "Create new secret key"</li>
            <li>Copy the key (you won't see it again!)</li>
          </ol>
          <div style="margin-top: 12px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
            <strong>💰 Pricing:</strong> $0.006 per minute of audio (~$0.36 per hour)
          </div>
          <div style="margin-top: 12px;">
            <a href="https://platform.openai.com/api-keys" target="_blank" class="btn btn-secondary btn-small">Open OpenAI Platform →</a>
          </div>
        </div>
        <div class="connection-test">
          <button class="btn btn-secondary btn-small" onclick="testConnection('openai')">Test Connection</button>
          <div id="openai-status"></div>
        </div>
      `;
      break;
      
    case 'icad':
      container.innerHTML = `
        <div class="two-columns">
          <div class="form-group">
            <label for="icad-url">ICAD Server URL</label>
            <input type="url" id="icad-url" placeholder="http://127.0.0.1:8080">
          </div>
          <div class="form-group">
            <label for="icad-profile">Profile</label>
            <input type="text" id="icad-profile" placeholder="tiny" value="tiny">
            <div class="help-text">Model or model|profile format</div>
          </div>
        </div>
      `;
      break;
  }
}

async function renderGeocodingStep() {
  // Reverse geocode map center to get nearest city (quick operation)
  let nearestCity = detectedLocation?.city || '';
  if (mapCenterLocation) {
    try {
      const geoResult = await api('/api/setup/reverse-geocode', 'POST', {
        lat: mapCenterLocation.lat,
        lng: mapCenterLocation.lng
      });
      if (geoResult.success && geoResult.city) {
        nearestCity = geoResult.city;
      }
    } catch (error) {
      console.error('Error reverse geocoding for city:', error);
    }
  }
  
  // Auto-select counties will happen asynchronously after UI renders (non-blocking)
  let autoSelectedCounties = [];
  let autoSelectedState = null;
  
  wizardContent.innerHTML = `
    <h2><span class="step-icon">📍</span> Geocoding Settings</h2>
    <p>Configure address geocoding for mapping extracted locations.</p>
    
    ${mapCenterLocation && detectedLocation?.stateCode ? `
    <div data-county-info style="margin-top: 16px; padding: 12px; background: rgba(0, 170, 255, 0.1); border: 1px solid var(--secondary); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>⏳</span>
        <div>
          <div style="font-weight: 600;">Finding counties within 20-mile radius...</div>
          <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">
            Based on map center: ${mapCenterLocation.lat.toFixed(4)}, ${mapCenterLocation.lng.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
    ` : mapCenterLocation ? `
    <div style="margin-top: 16px; padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid var(--warning); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>📡</span>
        <span>Map center set. Select a state to auto-select counties within 20-mile radius.</span>
      </div>
    </div>
    ` : ''}
    
    <div class="radio-group" style="margin-top: 24px;">
      <label class="radio-item">
        <input type="radio" name="geocoding-provider" value="nominatim" checked>
        <div class="item-content">
          <div class="item-title">OpenStreetMap Nominatim <span style="color: var(--success); font-size: 0.85em;">(Recommended)</span></div>
          <div class="item-desc">Free, no API key required. Rate limit: 1 request/second. Good accuracy for most use cases.</div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="geocoding-provider" value="locationiq">
        <div class="item-content">
          <div class="item-title">LocationIQ</div>
          <div class="item-desc">Free tier available, higher rate limits - <a href="https://locationiq.com/" target="_blank" style="color: var(--secondary);">Get API Key</a></div>
        </div>
      </label>
      
      <label class="radio-item">
        <input type="radio" name="geocoding-provider" value="google">
        <div class="item-content">
          <div class="item-title">Google Maps</div>
          <div class="item-desc">Highest accuracy, requires billing - <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: var(--secondary);">Get API Key</a></div>
        </div>
      </label>
    </div>
    
    <div id="geocoding-options" style="margin-top: 24px;"></div>
    
    <hr class="section-divider">
    
    <h3>Target Area</h3>
    ${detectedLocation ? `
    <div style="margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--success); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>✓</span>
        <span>Using detected location: ${detectedLocation.city}, ${detectedLocation.stateCode || detectedLocation.region}</span>
      </div>
    </div>
    ` : ''}
    
    <div class="two-columns" style="margin-top: 16px;">
      <div class="form-group">
        <label for="geo-city">Default City</label>
        <input type="text" id="geo-city" placeholder="Baltimore" value="${nearestCity}">
      </div>
      <div class="form-group">
        <label for="geo-state">State</label>
        <select id="geo-state">
          <option value="">Select State</option>
          <option value="AL">Alabama</option>
          <option value="AK">Alaska</option>
          <option value="AZ">Arizona</option>
          <option value="AR">Arkansas</option>
          <option value="CA">California</option>
          <option value="CO">Colorado</option>
          <option value="CT">Connecticut</option>
          <option value="DE">Delaware</option>
          <option value="FL">Florida</option>
          <option value="GA">Georgia</option>
          <option value="HI">Hawaii</option>
          <option value="ID">Idaho</option>
          <option value="IL">Illinois</option>
          <option value="IN">Indiana</option>
          <option value="IA">Iowa</option>
          <option value="KS">Kansas</option>
          <option value="KY">Kentucky</option>
          <option value="LA">Louisiana</option>
          <option value="ME">Maine</option>
          <option value="MD">Maryland</option>
          <option value="MA">Massachusetts</option>
          <option value="MI">Michigan</option>
          <option value="MN">Minnesota</option>
          <option value="MS">Mississippi</option>
          <option value="MO">Missouri</option>
          <option value="MT">Montana</option>
          <option value="NE">Nebraska</option>
          <option value="NV">Nevada</option>
          <option value="NH">New Hampshire</option>
          <option value="NJ">New Jersey</option>
          <option value="NM">New Mexico</option>
          <option value="NY">New York</option>
          <option value="NC">North Carolina</option>
          <option value="ND">North Dakota</option>
          <option value="OH">Ohio</option>
          <option value="OK">Oklahoma</option>
          <option value="OR">Oregon</option>
          <option value="PA">Pennsylvania</option>
          <option value="RI">Rhode Island</option>
          <option value="SC">South Carolina</option>
          <option value="SD">South Dakota</option>
          <option value="TN">Tennessee</option>
          <option value="TX">Texas</option>
          <option value="UT">Utah</option>
          <option value="VT">Vermont</option>
          <option value="VA">Virginia</option>
          <option value="WA">Washington</option>
          <option value="WV">West Virginia</option>
          <option value="WI">Wisconsin</option>
          <option value="WY">Wyoming</option>
          <option value="DC">District of Columbia</option>
        </select>
        ${detectedLocation?.stateCode ? `<div class="help-text">Auto-detected: ${detectedLocation.stateCode}</div>` : ''}
      </div>
    </div>
    <div class="two-columns">
      <div class="form-group">
        <label for="geo-country">Country</label>
        <input type="text" id="geo-country" placeholder="US" value="${detectedLocation?.country || 'US'}" maxlength="2">
      </div>
      <div class="form-group">
        <label for="geo-counties">Target Counties</label>
        <div style="position: relative;">
          <input type="text" id="geo-counties-search" class="county-search-input" placeholder="Search counties..." oninput="filterCounties()">
          <div id="geo-counties-container" class="county-list-container">
            <div class="county-list-empty">Select a state to load counties</div>
          </div>
          <div class="help-text" style="margin-top: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span><strong id="counties-count">0</strong> counties selected</span>
            <button type="button" class="btn btn-secondary btn-small" onclick="selectAllCounties()">Select All</button>
            <button type="button" class="btn btn-secondary btn-small" onclick="clearCounties()">Clear</button>
            ${mapCenterLocation ? `<button type="button" class="btn btn-primary btn-small" onclick="autoDetectCountiesFromMap()" id="auto-detect-counties-btn">
              <span id="auto-detect-counties-text">📍 Auto-detect from map</span>
            </button>` : ''}
          </div>
        </div>
      </div>
    </div>
    
    <hr class="section-divider">
    
    <h3>Town Names for AI</h3>
    <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 0.9em;">
      A list of town and city names in your coverage area helps the AI better recognize local place names when processing radio calls.
    </p>
    
    <div id="towns-section" style="margin-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <button class="btn btn-primary btn-small" id="fetch-towns-btn" onclick="fetchTownsList()">
            <span id="fetch-towns-text">📥 Auto-fetch Towns</span>
          </button>
          <span style="margin-left: 8px; font-size: 0.85em; color: var(--text-secondary);">
            From selected counties (within 20-mile radius)
          </span>
        </div>
        <div id="towns-count" style="font-size: 0.85em; color: var(--text-secondary);">0 towns</div>
      </div>
      
      <textarea 
        id="geo-towns" 
        rows="8" 
        placeholder="Town names will appear here after clicking 'Auto-fetch Towns'...&#10;&#10;Or manually enter town names, one per line:&#10;Baltimore&#10;Towson&#10;Columbia&#10;..."
        style="width: 100%; padding: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-family: monospace; font-size: 0.9em; resize: vertical;"
      ></textarea>
      
      <div class="help-text" style="margin-top: 8px;">
        Enter one town/city name per line. These names help the AI recognize local places in radio transcripts.
      </div>
    </div>
  `;
  
  // Set detected state if available
  if (detectedLocation?.stateCode) {
    setTimeout(() => {
      const stateSelect = document.getElementById('geo-state');
      if (stateSelect) {
        stateSelect.value = detectedLocation.stateCode;
        loadCountiesForState(detectedLocation.stateCode);
      }
    }, 100);
  }
  
  // Auto-select counties asynchronously after state is loaded (non-blocking)
  if (mapCenterLocation && detectedLocation?.stateCode) {
    // Wait for counties to load, then auto-detect
    setTimeout(async () => {
      const stateSelect = document.getElementById('geo-state');
      if (stateSelect && stateSelect.value === detectedLocation.stateCode && countiesData[detectedLocation.stateCode]?.length > 0) {
        await autoDetectCountiesFromMapLocation(mapCenterLocation.lat, mapCenterLocation.lng);
      }
    }, 500);
  }
  
  
  // Handle state change
  document.getElementById('geo-state').addEventListener('change', (e) => {
    loadCountiesForState(e.target.value);
  });
  
  document.querySelectorAll('input[name="geocoding-provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      renderGeocodingOptions(e.target.value);
    });
  });
  
  // Update towns count when textarea changes
  const townsTextarea = document.getElementById('geo-towns');
  if (townsTextarea) {
    townsTextarea.addEventListener('input', () => {
      updateTownsCount();
    });
  }
  
  // Render initial options for Nominatim (default)
  renderGeocodingOptions('nominatim');
  
  // Auto-fetch towns if counties are already selected
  if (selectedCounties.size > 0) {
    setTimeout(() => {
      fetchTownsList();
    }, 500);
  }
}

// Fetch towns list based on selected counties
window.fetchTownsList = async function() {
  const btn = document.getElementById('fetch-towns-btn');
  const btnText = document.getElementById('fetch-towns-text');
  const townsTextarea = document.getElementById('geo-towns');
  
  if (!townsTextarea) {
    console.error('[Towns] Textarea not found');
    return;
  }
  
  const stateSelect = document.getElementById('geo-state');
  if (!stateSelect || !stateSelect.value) {
    showToast('Please select a state first', 'error');
    return;
  }
  
  if (selectedCounties.size === 0) {
    showToast('Please select at least one county', 'error');
    return;
  }
  
  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = '⏳ Fetching towns...';
    
    console.log('[Towns] Fetching towns for counties:', Array.from(selectedCounties), 'State:', stateSelect.value);
    
    // Use only the selected counties (which are already within the radius)
    const result = await api('/api/setup/fetch-towns', 'POST', {
      counties: Array.from(selectedCounties),
      stateCode: stateSelect.value
    });
    
    console.log('[Towns] API response:', result);
    
    if (result.success && result.towns && result.towns.length > 0) {
      townsTextarea.value = result.towns.join('\n');
      updateTownsCount();
      showToast(`Fetched ${result.towns.length} towns from selected counties`, 'success');
    } else {
      console.warn('[Towns] No towns found in response:', result);
      showToast('No towns found. You can enter them manually.', 'warning');
    }
  } catch (error) {
    console.error('[Towns] Error fetching towns:', error);
    showToast('Error fetching towns: ' + (error.message || 'Unknown error'), 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = '📥 Auto-fetch Towns';
  }
};

function updateTownsCount() {
  const townsTextarea = document.getElementById('geo-towns');
  const countEl = document.getElementById('towns-count');
  
  if (!townsTextarea || !countEl) return;
  
  const townsText = townsTextarea.value.trim();
  const count = townsText ? townsText.split('\n').filter(t => t.trim().length > 0).length : 0;
  countEl.textContent = `${count} town${count !== 1 ? 's' : ''}`;
}

// Store counties data
let countiesData = {};
let selectedCounties = new Set();

async function loadCountiesForState(stateCode) {
  const container = document.getElementById('geo-counties-container');
  if (!container) return;
  
  if (!stateCode) {
    container.innerHTML = '<div class="county-list-empty">Select a state to load counties</div>';
    return;
  }
  
  try {
    container.innerHTML = '<div class="county-list-loading">Loading counties</div>';
    
    const response = await fetch(`/api/setup/counties/${stateCode}`);
    const data = await response.json();
    
    if (data.counties && data.counties.length > 0) {
      countiesData[stateCode] = data.counties;
      renderCountiesList(data.counties);
      
      // Auto-select county if detected location matches
      if (detectedLocation?.stateCode === stateCode && detectedLocation?.region) {
        const detectedCounty = data.counties.find(c => 
          c.toLowerCase().includes(detectedLocation.region.toLowerCase()) ||
          detectedLocation.region.toLowerCase().includes(c.toLowerCase())
        );
        if (detectedCounty) {
          selectedCounties.add(detectedCounty);
          renderCountiesList(data.counties);
        }
      }
      
      // Auto-detect counties from map location if available
      if (mapCenterLocation && currentStep === steps.findIndex(s => s.id === 'geocoding')) {
        await autoDetectCountiesFromMapLocation(mapCenterLocation.lat, mapCenterLocation.lng);
      }
    } else {
      container.innerHTML = '<div class="county-list-empty">No counties found for this state</div>';
    }
  } catch (error) {
    console.error('Error loading counties:', error);
    container.innerHTML = '<div class="county-list-empty" style="color: var(--error);">Error loading counties</div>';
  }
}

// Auto-detect counties from map location
async function autoDetectCountiesFromMapLocation(lat, lng) {
  // Only run if we're on the geocoding step
  if (currentStep !== steps.findIndex(s => s.id === 'geocoding')) {
    return;
  }
  
  const stateSelect = document.getElementById('geo-state');
  if (!stateSelect || !stateSelect.value) {
    return; // State not selected yet
  }
  
  const container = document.getElementById('geo-counties-container');
  if (!container) {
    return; // Container doesn't exist
  }
  
  // Ensure counties are loaded
  if (!countiesData[stateSelect.value] || countiesData[stateSelect.value].length === 0) {
    // Counties not loaded yet, trigger load first
    await loadCountiesForState(stateSelect.value);
    // Wait a bit for counties to render
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Check again after loading
  if (!countiesData[stateSelect.value] || countiesData[stateSelect.value].length === 0) {
    return; // Still no counties loaded
  }
  
  const btn = document.getElementById('auto-detect-counties-btn');
  const btnText = document.getElementById('auto-detect-counties-text');
  
  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = '⏳ Detecting...';
    
    // Show loading state
    const currentContent = container.innerHTML;
    container.innerHTML = '<div class="county-list-loading">Finding counties within 20 miles</div>';
    
    const result = await api('/api/setup/counties-within-radius', 'POST', {
      lat: lat,
      lng: lng,
      stateCode: stateSelect.value
    });
    
    if (result.counties && result.counties.length > 0) {
      // Clear existing selections and set new ones
      selectedCounties.clear();
      result.counties.forEach(county => selectedCounties.add(county));
      
      // Re-render with selected counties
      renderCountiesList(countiesData[stateSelect.value]);
      
      showToast(`Auto-selected ${result.counties.length} counties within 20 miles`, 'success');
    } else {
      // Restore previous state
      renderCountiesList(countiesData[stateSelect.value]);
      showToast('No counties found within 20 miles', 'warning');
    }
  } catch (error) {
    console.error('Error auto-detecting counties:', error);
    // Restore previous state
    if (countiesData[stateSelect.value]) {
      renderCountiesList(countiesData[stateSelect.value]);
    }
    showToast('Error detecting counties', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = '📍 Auto-detect from map';
  }
}

window.autoDetectCountiesFromMap = function() {
  if (mapCenterLocation) {
    autoDetectCountiesFromMapLocation(mapCenterLocation.lat, mapCenterLocation.lng);
  } else {
    showToast('Please set a location on the map first', 'error');
  }
};

function renderCountiesList(counties) {
  const container = document.getElementById('geo-counties-container');
  if (!container) return;
  
  const searchTerm = document.getElementById('geo-counties-search')?.value.toLowerCase() || '';
  
  const filtered = counties.filter(c => c.toLowerCase().includes(searchTerm));
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="county-list-empty">No counties found${searchTerm ? ' matching "' + searchTerm + '"' : ''}</div>`;
    updateCountiesCount();
    return;
  }
  
  container.innerHTML = filtered.map(county => {
    const isSelected = selectedCounties.has(county);
    return `
      <div class="county-item ${isSelected ? 'selected' : ''}" onclick="toggleCounty('${county.replace(/'/g, "\\'")}')">
        <input type="checkbox" value="${county.replace(/'/g, "\\'")}" ${isSelected ? 'checked' : ''} 
               onchange="toggleCounty('${county.replace(/'/g, "\\'")}')" onclick="event.stopPropagation();">
        <span class="county-name">${county}</span>
      </div>
    `;
  }).join('');
  
  updateCountiesCount();
}

window.filterCounties = function() {
  const stateSelect = document.getElementById('geo-state');
  if (stateSelect && stateSelect.value) {
    const counties = countiesData[stateSelect.value] || [];
    renderCountiesList(counties);
  }
};

window.toggleCounty = function(county) {
  if (selectedCounties.has(county)) {
    selectedCounties.delete(county);
  } else {
    selectedCounties.add(county);
  }
  const stateSelect = document.getElementById('geo-state');
  if (stateSelect && stateSelect.value) {
    const counties = countiesData[stateSelect.value] || [];
    renderCountiesList(counties);
  }
};

window.selectAllCounties = function() {
  const stateSelect = document.getElementById('geo-state');
  if (stateSelect && stateSelect.value) {
    const counties = countiesData[stateSelect.value] || [];
    counties.forEach(c => selectedCounties.add(c));
    renderCountiesList(counties);
  }
};

window.clearCounties = function() {
  selectedCounties.clear();
  const stateSelect = document.getElementById('geo-state');
  if (stateSelect && stateSelect.value) {
    const counties = countiesData[stateSelect.value] || [];
    renderCountiesList(counties);
  }
};

function updateCountiesCount() {
  const countEl = document.getElementById('counties-count');
  if (countEl) {
    countEl.textContent = selectedCounties.size;
  }
}

function renderGeocodingOptions(provider) {
  const container = document.getElementById('geocoding-options');
  
  if (provider === 'nominatim') {
    container.innerHTML = `
      <div style="padding: 16px; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--success); border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span>✓</span>
          <strong>No API key required!</strong>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">
          OpenStreetMap Nominatim is free and open-source. It has a rate limit of 1 request per second, which is suitable for most scanner applications.
        </p>
        <div style="margin-top: 12px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 4px; font-size: 0.85em;">
          <strong>Note:</strong> For higher volume usage, consider using LocationIQ or Google Maps with an API key.
        </div>
      </div>
    `;
  } else if (provider === 'locationiq') {
    container.innerHTML = `
      <div class="form-group">
        <label for="locationiq-key">
          LocationIQ API Key
          <button type="button" class="btn-help" onclick="toggleApiHelp('locationiq')" style="margin-left: 8px; font-size: 0.85em; padding: 2px 8px;">How to get API key?</button>
        </label>
        <input type="password" id="locationiq-key" placeholder="pk.xxx" oninput="validateApiKey('locationiq', this.value)" onblur="validateField('locationiq-key', 'api-key', this.value); validateStep('geocoding');">
        <div id="locationiq-key-status" style="margin-top: 4px;"></div>
      </div>
      <div id="locationiq-help" style="display: none; margin-bottom: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px; border-left: 3px solid var(--secondary);">
        <h4 style="margin-bottom: 8px;">Getting a LocationIQ API Key:</h4>
        <ol style="margin-left: 20px; line-height: 1.8;">
          <li>Visit <a href="https://locationiq.com/" target="_blank" style="color: var(--secondary);">locationiq.com</a></li>
          <li>Click "Sign Up" or "Get Started"</li>
          <li>Create a free account (no credit card required)</li>
          <li>Go to your dashboard and copy your API key</li>
          <li>Free tier: 60,000 requests/day</li>
        </ol>
        <div style="margin-top: 12px;">
          <a href="https://locationiq.com/" target="_blank" class="btn btn-secondary btn-small">Open LocationIQ →</a>
        </div>
      </div>
      <div class="connection-test">
        <button class="btn btn-secondary btn-small" onclick="testConnection('locationiq')">Test Connection</button>
        <div id="locationiq-status"></div>
      </div>
    `;
  } else if (provider === 'google') {
    container.innerHTML = `
      <div class="form-group">
        <label for="google-maps-key">
          Google Maps API Key
          <button type="button" class="btn-help" onclick="toggleApiHelp('google')" style="margin-left: 8px; font-size: 0.85em; padding: 2px 8px;">How to get API key?</button>
        </label>
        <input type="password" id="google-maps-key" placeholder="AIza..." oninput="validateApiKey('google', this.value)" onblur="validateField('google-maps-key', 'api-key', this.value); validateStep('geocoding');">
        <div id="google-key-status" style="margin-top: 4px;"></div>
      </div>
      <div id="google-help" style="display: none; margin-bottom: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px; border-left: 3px solid var(--secondary);">
        <h4 style="margin-bottom: 8px;">Getting a Google Maps API Key:</h4>
        <ol style="margin-left: 20px; line-height: 1.8;">
          <li>Go to <a href="https://console.cloud.google.com/" target="_blank" style="color: var(--secondary);">Google Cloud Console</a></li>
          <li>Create a new project (or select existing)</li>
          <li>Enable the "Geocoding API" in APIs & Services</li>
          <li>Go to "Credentials" → "Create Credentials" → "API Key"</li>
          <li>Copy your API key</li>
          <li><strong>Note:</strong> Requires billing account (but has free tier)</li>
        </ol>
        <div style="margin-top: 12px; padding: 8px; background: rgba(255, 193, 7, 0.1); border-radius: 4px;">
          <strong>⚠ Billing Required:</strong> Google Maps requires a billing account, but includes $200/month free credit.
        </div>
        <div style="margin-top: 12px;">
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="btn btn-secondary btn-small">Open Google Cloud Console →</a>
        </div>
      </div>
      <div class="connection-test">
        <button class="btn btn-secondary btn-small" onclick="testConnection('google')">Test Connection</button>
        <div id="google-status"></div>
      </div>
    `;
  }
}

window.toggleApiHelp = function(provider) {
  const helpEl = document.getElementById(`${provider}-help`);
  if (helpEl) {
    helpEl.style.display = helpEl.style.display === 'none' ? 'block' : 'none';
  }
  
  // Close other help sections
  document.querySelectorAll('[id$="-help"]').forEach(el => {
    if (el.id !== `${provider}-help`) {
      el.style.display = 'none';
    }
  });
};

let apiKeyValidationTimeout = null;
window.validateApiKey = function(type, value) {
  clearTimeout(apiKeyValidationTimeout);
  
  // Map type to status element ID
  const statusMap = {
    'locationiq': 'locationiq-key-status',
    'google': 'google-key-status',
    'openai': document.getElementById('openai-transcription-key-status') ? 'openai-transcription-key-status' : 'openai-ai-key-status',
    'discord': 'discord-key-status'
  };
  
  const statusId = statusMap[type] || `${type}-key-status`;
  const statusEl = document.getElementById(statusId);
  if (!statusEl) return;
  
  if (!value || value.length < 5) {
    statusEl.innerHTML = '';
    return;
  }
  
  // Debounce validation
  apiKeyValidationTimeout = setTimeout(async () => {
    statusEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ Testing...</span>';
    
    try {
      const result = await api('/api/setup/test-api-key', 'POST', {
        type: type,
        key: value
      });
      
      if (result.success) {
        statusEl.innerHTML = `<span style="color: var(--success);">✓ ${result.message}</span>`;
      } else {
        statusEl.innerHTML = `<span style="color: var(--error);">✗ ${result.message}</span>`;
      }
    } catch (error) {
      statusEl.innerHTML = '';
    }
  }, 1000);
};

async function renderAiStep() {
  // Detect Ollama
  const ollamaResult = await api('/api/setup/detect-ollama').catch(() => ({ available: false }));
  
  wizardContent.innerHTML = `
    <h2><span class="step-icon">🤖</span> AI Features <span class="optional-badge">Optional</span></h2>
    <p>Configure AI for address extraction, summaries, and the Ask AI feature.</p>
    
    ${ollamaResult.available ? `
    <div style="margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border: 1px solid var(--success); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>✓</span>
        <div>
          <div style="font-weight: 600;">Ollama detected - ${ollamaResult.models?.length || 0} model(s) available</div>
          ${ollamaResult.models?.length > 0 ? `
          <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">
            Models: ${ollamaResult.models.slice(0, 3).map(m => m.name).join(', ')}${ollamaResult.models.length > 3 ? '...' : ''}
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    ` : `
    <div style="margin-top: 16px; padding: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid var(--warning); border-radius: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>⚠</span>
        <span>Ollama not detected. Install from <a href="https://ollama.ai" target="_blank" style="color: var(--secondary);">ollama.ai</a> or use OpenAI.</span>
      </div>
    </div>
    `}
    
    <div class="checkbox-group" style="margin-top: 24px;">
      <label class="checkbox-item">
        <input type="checkbox" id="ai-enabled" checked>
        <div class="item-content">
          <div class="item-title">Enable AI Features</div>
          <div class="item-desc">Use AI for address extraction, call categorization, and summaries</div>
        </div>
      </label>
    </div>
    
    <div id="ai-options" style="margin-top: 24px;">
      <div class="radio-group">
        <label class="radio-item">
          <input type="radio" name="ai-provider" value="ollama" ${ollamaResult.available ? 'checked' : ''} ${!ollamaResult.available ? 'disabled' : ''}>
          <div class="item-content">
            <div class="item-title">Ollama (Local)</div>
            <div class="item-desc">Run AI locally - free but requires more resources ${ollamaResult.available ? '✓ Available' : '- Not detected'}</div>
          </div>
        </label>
        
        <label class="radio-item">
          <input type="radio" name="ai-provider" value="openai" ${!ollamaResult.available ? 'checked' : ''}>
          <div class="item-content">
            <div class="item-title">OpenAI</div>
            <div class="item-desc">Use OpenAI's GPT models - fast but has API costs</div>
          </div>
        </label>
      </div>
      
      <div id="ai-provider-options" style="margin-top: 16px;"></div>
    </div>
  `;
  
  // Store ollama result globally
  window.ollamaResult = ollamaResult;
  
  // Toggle AI options
  document.getElementById('ai-enabled').addEventListener('change', (e) => {
    document.getElementById('ai-options').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Handle provider selection
  document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      renderAiProviderOptions(e.target.value);
    });
  });
  
  // Show default options
  renderAiProviderOptions(ollamaResult.available ? 'ollama' : 'openai');
}

function renderAiProviderOptions(provider) {
  const container = document.getElementById('ai-provider-options');
  const ollamaResult = window.ollamaResult || { available: false, models: [] };
  
  if (provider === 'ollama') {
    const defaultModel = ollamaResult.models?.length > 0 ? ollamaResult.models[0].name : 'llama3.1:8b';
    
    container.innerHTML = `
      <div class="two-columns">
        <div class="form-group">
          <label for="ollama-url">Ollama URL</label>
          <input type="url" id="ollama-url" placeholder="http://localhost:11434" value="${ollamaResult.url || 'http://localhost:11434'}">
        </div>
        <div class="form-group">
          <label for="ollama-model">Model</label>
          ${ollamaResult.models?.length > 0 ? `
          <select id="ollama-model">
            ${ollamaResult.models.map(m => `
              <option value="${m.name}" ${m.name === defaultModel ? 'selected' : ''}>
                ${m.name}${m.size ? ` (${(m.size / 1024 / 1024 / 1024).toFixed(1)}GB)` : ''}
              </option>
            `).join('')}
          </select>
          <div class="help-text">${ollamaResult.models.length} model(s) available</div>
          ` : `
          <input type="text" id="ollama-model" placeholder="llama3.1:8b" value="${defaultModel}">
          <div class="help-text">Enter model name (e.g., llama3.1:8b)</div>
          `}
        </div>
      </div>
      <div class="connection-test">
        <button class="btn btn-secondary btn-small" onclick="testConnection('ollama')">Test Connection</button>
        <button class="btn btn-secondary btn-small" onclick="refreshOllamaModels()" style="margin-left: 8px;">Refresh Models</button>
        <div id="ollama-status"></div>
      </div>
    `;
  } else if (provider === 'openai') {
    container.innerHTML = `
      <div class="two-columns">
        <div class="form-group">
          <label for="openai-ai-key">OpenAI API Key</label>
          <input type="password" id="openai-ai-key" placeholder="sk-..." onblur="validateField('openai-ai-key', 'api-key', this.value); validateStep('ai');">
        </div>
        <div class="form-group">
          <label for="openai-model">Model</label>
          <select id="openai-model">
            <option value="gpt-4o-mini" selected>GPT-4o Mini (recommended)</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
      </div>
      <div class="connection-test">
        <button class="btn btn-secondary btn-small" onclick="testConnection('openai')">Test Connection</button>
        <div id="openai-ai-status"></div>
      </div>
    `;
  }
}

function renderDiscordStep() {
  wizardContent.innerHTML = `
    <h2><span class="step-icon">💬</span> Discord Integration <span class="optional-badge">Optional</span></h2>
    <p>Connect Scanner Map to Discord for alerts and transcription posting.</p>
    
    <div class="checkbox-group" style="margin-top: 24px;">
      <label class="checkbox-item">
        <input type="checkbox" id="discord-enabled">
        <div class="item-content">
          <div class="item-title">Enable Discord Integration</div>
          <div class="item-desc">Post transcriptions and alerts to Discord channels</div>
        </div>
      </label>
    </div>
    
    <div id="discord-options" style="display: none; margin-top: 24px;">
      <div class="form-group">
        <label for="discord-token">
          Bot Token
          <button type="button" class="btn-help" onclick="toggleApiHelp('discord')" style="margin-left: 8px; font-size: 0.85em; padding: 2px 8px;">How to create bot?</button>
        </label>
        <input type="password" id="discord-token" placeholder="Your Discord bot token" oninput="validateApiKey('discord', this.value)" onblur="validateField('discord-token', 'api-key', this.value); validateStep('discord');">
        <div id="discord-key-status" style="margin-top: 4px;"></div>
        <div id="discord-help" style="display: none; margin-top: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px; border-left: 3px solid var(--secondary);">
          <h4 style="margin-bottom: 8px;">Creating a Discord Bot:</h4>
          <ol style="margin-left: 20px; line-height: 1.8;">
            <li>Go to <a href="https://discord.com/developers/applications" target="_blank" style="color: var(--secondary);">Discord Developer Portal</a></li>
            <li>Click "New Application" and give it a name</li>
            <li>Go to "Bot" in the left sidebar</li>
            <li>Click "Add Bot" → "Yes, do it!"</li>
            <li>Under "Token", click "Reset Token" → "Copy"</li>
            <li>Paste the token here (you won't see it again!)</li>
            <li>Enable these permissions: "Send Messages", "Embed Links", "Read Message History"</li>
            <li>Go to "OAuth2" → "URL Generator" → Select "bot" scope → Copy URL</li>
            <li>Open the URL in a browser to invite the bot to your server</li>
          </ol>
          <div style="margin-top: 12px;">
            <a href="https://discord.com/developers/applications" target="_blank" class="btn btn-secondary btn-small">Open Discord Developer Portal →</a>
          </div>
        </div>
      </div>
      <div class="connection-test">
        <button class="btn btn-secondary btn-small" onclick="testConnection('discord')">Test Connection</button>
        <div id="discord-status"></div>
      </div>
    </div>
  `;
  
  document.getElementById('discord-enabled').addEventListener('change', (e) => {
    document.getElementById('discord-options').style.display = e.target.checked ? 'block' : 'none';
  });
}

async function renderReviewStep() {
  // Detect IPs
  const [publicIPResult, localIPsResult] = await Promise.all([
    api('/api/setup/detect-public-ip').catch(() => ({ success: false })),
    api('/api/setup/local-ips').catch(() => ({ ips: [] }))
  ]);
  
  const publicIP = publicIPResult.success ? publicIPResult.ip : null;
  const localIPs = localIPsResult.ips || [];
  const primaryLocalIP = localIPs.length > 0 ? localIPs[0].address : null;
  
  wizardContent.innerHTML = `
    <h2><span class="step-icon">✅</span> Review Configuration</h2>
    <p>Review your settings before completing setup.</p>
    
    <div class="summary-box">
      <div class="summary-item">
        <span class="summary-label">Admin User</span>
        <span class="summary-value">${config.admin?.username || 'admin'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Map Center</span>
        <span class="summary-value">${config.map?.center?.join(', ') || 'Not set'}</span>
      </div>
      ${detectedLocation ? `
      <div class="summary-item">
        <span class="summary-label">Detected Location</span>
        <span class="summary-value">${detectedLocation.city}, ${detectedLocation.stateCode || detectedLocation.region}</span>
      </div>
      ` : ''}
      <div class="summary-item">
        <span class="summary-label">Talkgroups Mapped</span>
        <span class="summary-value">${config.talkgroups?.mapped?.length || 0}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Transcription</span>
        <span class="summary-value">${config.transcription?.mode || 'Not configured'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Geocoding</span>
        <span class="summary-value">${config.geocoding?.provider || 'Not configured'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">AI Provider</span>
        <span class="summary-value">${config.ai?.enabled ? config.ai?.provider : 'Disabled'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Discord</span>
        <span class="summary-value">${config.discord?.enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>
    
    ${(publicIP || primaryLocalIP) ? `
    <div style="margin-top: 24px; padding: 16px; background: var(--surface-light); border-radius: 8px;">
      <h3 style="margin-bottom: 12px;">Connection Information</h3>
      <p style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 12px;">
        Use these URLs to configure your scanner software to send calls to Scanner Map:
      </p>
      ${publicIP ? `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; margin-bottom: 4px;">Public IP (for remote scanners):</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <code style="flex: 1; padding: 8px; background: var(--surface); border-radius: 4px;">http://${publicIP}:8080/api/call-upload</code>
          <button class="btn btn-secondary btn-small" onclick="copyToClipboard('http://${publicIP}:8080/api/call-upload')">Copy</button>
        </div>
      </div>
      ` : ''}
      ${primaryLocalIP ? `
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Local IP (for same-network scanners):</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <code style="flex: 1; padding: 8px; background: var(--surface); border-radius: 4px;">http://${primaryLocalIP}:8080/api/call-upload</code>
          <button class="btn btn-secondary btn-small" onclick="copyToClipboard('http://${primaryLocalIP}:8080/api/call-upload')">Copy</button>
        </div>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    <div style="margin-top: 24px; padding: 16px; background: var(--surface-light); border-radius: 8px;">
      <h3 style="margin-bottom: 12px;">Connection Testing</h3>
      <p style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 12px;">
        Test all configured service connections before completing setup:
      </p>
      <button class="btn btn-secondary" onclick="testAllConnections()" id="test-all-btn">
        <span id="test-all-spinner" style="display: none;" class="spinner"></span>
        Test All Connections
      </button>
      <div id="connection-test-results" style="margin-top: 16px;"></div>
    </div>
    
    <p style="color: var(--text-muted); margin-top: 16px;">
      Click "Complete Setup" to save your configuration and start Scanner Map.
    </p>
  `;
}

// Test all configured connections (Phase 5)
window.testAllConnections = async function() {
  const btn = document.getElementById('test-all-btn');
  const spinner = document.getElementById('test-all-spinner');
  const resultsDiv = document.getElementById('connection-test-results');
  
  if (!btn || !resultsDiv) return;
  
  btn.disabled = true;
  spinner.style.display = 'inline-block';
  resultsDiv.innerHTML = '<p>Testing connections...</p>';
  
  const results = [];
  
  // Test transcription connection
  if (config.transcription?.mode === 'openai' && config.transcription?.openaiKey) {
    try {
      const result = await api('/api/setup/test-connection', 'POST', {
        type: 'openai',
        config: { apiKey: config.transcription.openaiKey }
      });
      results.push({ name: 'OpenAI Transcription', success: result.success, message: result.message });
    } catch (e) {
      results.push({ name: 'OpenAI Transcription', success: false, message: e.message });
    }
  }
  
  // Test geocoding connection
  if (config.geocoding?.provider === 'locationiq' && config.geocoding?.locationiqKey) {
    try {
      const result = await api('/api/setup/test-connection', 'POST', {
        type: 'locationiq',
        config: { apiKey: config.geocoding.locationiqKey }
      });
      results.push({ name: 'LocationIQ Geocoding', success: result.success, message: result.message });
    } catch (e) {
      results.push({ name: 'LocationIQ Geocoding', success: false, message: e.message });
    }
  } else if (config.geocoding?.provider === 'google' && config.geocoding?.googleMapsKey) {
    try {
      const result = await api('/api/setup/test-connection', 'POST', {
        type: 'google',
        config: { apiKey: config.geocoding.googleMapsKey }
      });
      results.push({ name: 'Google Maps Geocoding', success: result.success, message: result.message });
    } catch (e) {
      results.push({ name: 'Google Maps Geocoding', success: false, message: e.message });
    }
  }
  
  // Test AI connection
  if (config.ai?.enabled) {
    if (config.ai?.provider === 'ollama' && config.ai?.ollamaUrl) {
      try {
        const result = await api('/api/setup/test-connection', 'POST', {
          type: 'ollama',
          config: { url: config.ai.ollamaUrl }
        });
        results.push({ name: 'Ollama AI', success: result.success, message: result.message });
      } catch (e) {
        results.push({ name: 'Ollama AI', success: false, message: e.message });
      }
    } else if (config.ai?.provider === 'openai' && config.ai?.openaiKey) {
      try {
        const result = await api('/api/setup/test-connection', 'POST', {
          type: 'openai',
          config: { apiKey: config.ai.openaiKey }
        });
        results.push({ name: 'OpenAI AI', success: result.success, message: result.message });
      } catch (e) {
        results.push({ name: 'OpenAI AI', success: false, message: e.message });
      }
    }
  }
  
  // Test Discord connection
  if (config.discord?.enabled && config.discord?.token) {
    try {
      const result = await api('/api/setup/test-connection', 'POST', {
        type: 'discord',
        config: { token: config.discord.token }
      });
      results.push({ name: 'Discord Bot', success: result.success, message: result.message });
    } catch (e) {
      results.push({ name: 'Discord Bot', success: false, message: e.message });
    }
  }
  
  // Display results
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p style="color: var(--text-muted);">No connections to test (all services use free/default options).</p>';
  } else {
    const successCount = results.filter(r => r.success).length;
    resultsDiv.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: 600;">
        Results: ${successCount}/${results.length} connections successful
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${results.map(r => `
          <div style="padding: 12px; background: var(--surface); border-radius: 6px; border-left: 3px solid ${r.success ? 'var(--success)' : 'var(--error)'};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span>${r.success ? '✓' : '✗'}</span>
              <strong>${r.name}</strong>
            </div>
            <div style="font-size: 0.9em; color: var(--text-secondary); margin-left: 24px;">
              ${r.message}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  btn.disabled = false;
  spinner.style.display = 'none';
};

window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
};

// Connection testing
window.testConnection = async function(type) {
  const statusEl = document.getElementById(`${type}-status`) || document.getElementById(`${type}-ai-status`);
  if (!statusEl) return;
  
  statusEl.innerHTML = '<span class="connection-status testing"><span class="spinner"></span> Testing...</span>';
  
  let testConfig = {};
  
  switch (type) {
    case 'ollama':
      testConfig.url = document.getElementById('ollama-url').value;
      break;
    case 'openai':
      testConfig.apiKey = document.getElementById('openai-transcription-key')?.value || document.getElementById('openai-ai-key')?.value;
      break;
    case 'locationiq':
      testConfig.apiKey = document.getElementById('locationiq-key').value;
      break;
    case 'google':
      testConfig.apiKey = document.getElementById('google-maps-key').value;
      break;
    case 'discord':
      testConfig.token = document.getElementById('discord-token').value;
      break;
  }
  
  const result = await api('/api/setup/test-connection', 'POST', { type, config: testConfig });
  
  if (result.success) {
    statusEl.innerHTML = `<span class="connection-status success">✓ ${result.message}</span>`;
  } else {
    statusEl.innerHTML = `<span class="connection-status error">✗ ${result.message}</span>`;
  }
};

// Complete setup
async function completeSetup() {
  btnNext.disabled = true;
  btnNext.innerHTML = '<span class="spinner"></span> Completing...';
  
  try {
    const result = await api('/api/setup/complete', 'POST');
    
    if (result.success) {
      // Clear progress since setup is complete
      clearProgress();
      
      wizardScreen.classList.remove('active');
      wizardScreen.style.display = 'none';
      completeScreen.classList.add('active');
      completeScreen.style.display = 'flex';
      
      // Populate summary
      document.getElementById('setup-summary').innerHTML = `
        <div class="summary-item">
          <span class="summary-label">Status</span>
          <span class="summary-value">Ready to launch</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Web Interface</span>
          <span class="summary-value">http://localhost:${config.server?.port || 8080}</span>
        </div>
      `;
      
      // Setup launch button
      document.getElementById('btn-launch').addEventListener('click', () => {
        location.href = '/';
      });
      
      // Setup backup button
      document.getElementById('btn-download-config').addEventListener('click', downloadConfig);
    } else {
      showToast('Setup failed: ' + (result.error || 'Unknown error'), 'error');
      btnNext.disabled = false;
      btnNext.textContent = 'Complete Setup';
    }
  } catch (error) {
    showToast('Error completing setup: ' + error.message, 'error');
    btnNext.disabled = false;
    btnNext.textContent = 'Complete Setup';
  }
}

function downloadConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scanner-map-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

