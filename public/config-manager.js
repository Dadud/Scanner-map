/**
 * config-manager.js
 * Client-side settings management for Scanner Map
 */

const ConfigManager = {
  DEFAULT_SETTINGS: {
    mapStyle: 'day',
    defaultTimeRange: 12,
    notificationsEnabled: true,
    notificationSound: true,
    trackNewCalls: true,
    muteNewCalls: false,
    globalVolume: 0.5,
    heatmapEnabled: false,
    heatmapIntensity: 5,
    liveFeedTalkgroups: [],
    autoPlay: true,
    onboardingComplete: false
  },

  _settings: null,
  _listeners: [],
  _initialized: false,
  _useLocalStorage: false,

  async init() {
    if (this._initialized) return;
    try {
      await this.load();
      this._initialized = true;
    } catch (error) {
      console.error('[ConfigManager] Failed to initialize:', error);
      this._settings = { ...this.DEFAULT_SETTINGS };
    }
  },

  _loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('scanner_map_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[ConfigManager] Failed to load from localStorage:', e);
    }
    return null;
  },

  _saveToLocalStorage(settings) {
    try {
      localStorage.setItem('scanner_map_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('[ConfigManager] Failed to save to localStorage:', e);
    }
  },

  async load() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (response.status === 401 && data.anonymous) {
        console.log('[ConfigManager] Auth required, using localStorage fallback');
        this._useLocalStorage = true;
        const localSettings = this._loadFromLocalStorage();
        this._settings = { ...this.DEFAULT_SETTINGS, ...localSettings };
      } else if (data.success) {
        this._settings = { ...this.DEFAULT_SETTINGS, ...data.settings };
      } else {
        this._settings = { ...this.DEFAULT_SETTINGS };
      }
    } catch (error) {
      console.warn('[ConfigManager] Using default settings (could not reach server)');
      this._useLocalStorage = true;
      const localSettings = this._loadFromLocalStorage();
      this._settings = { ...this.DEFAULT_SETTINGS, ...localSettings };
    }
    return this._settings;
  },

  async save(settings) {
    const newSettings = { ...this._settings, ...settings };

    if (this._useLocalStorage) {
      this._settings = newSettings;
      this._saveToLocalStorage(newSettings);
      this._notifyListeners();
      return true;
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();

      if (response.status === 401 && data.anonymous) {
        console.log('[ConfigManager] Auth required, falling back to localStorage');
        this._useLocalStorage = true;
        this._settings = newSettings;
        this._saveToLocalStorage(newSettings);
        this._notifyListeners();
        return true;
      }

      if (data.success) {
        this._settings = { ...this.DEFAULT_SETTINGS, ...data.settings };
        this._notifyListeners();
        return true;
      }
      throw new Error(data.error || 'Failed to save');
    } catch (error) {
      console.error('[ConfigManager] Failed to save settings:', error);
      this._useLocalStorage = true;
      this._settings = newSettings;
      this._saveToLocalStorage(newSettings);
      this._notifyListeners();
      return true;
    }
  },

  get(key, defaultValue = null) {
    if (!this._settings) return defaultValue;
    const keys = key.split('.');
    let value = this._settings;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    return value !== undefined ? value : defaultValue;
  },

  set(key, value) {
    const keys = key.split('.');
    const settings = { ...this._settings };
    let obj = settings;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in obj) || typeof obj[k] !== 'object') {
        obj[k] = {};
      }
      obj = obj[k];
    }
    obj[keys[keys.length - 1]] = value;
    this._settings = settings;
    this.save(settings);
  },

  getAll() {
    if (!this._settings) {
      return { ...this.DEFAULT_SETTINGS };
    }
    return { ...this._settings };
  },

  async reset() {
    this._settings = { ...this.DEFAULT_SETTINGS };

    if (this._useLocalStorage) {
      this._saveToLocalStorage(this._settings);
      this._notifyListeners();
      return true;
    }

    try {
      const response = await fetch('/api/settings/reset', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        this._settings = { ...this.DEFAULT_SETTINGS };
        this._notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ConfigManager] Failed to reset settings:', error);
      this._notifyListeners();
      return false;
    }
  },

  onSettingsChanged(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  },

  _notifyListeners() {
    this._listeners.forEach(callback => {
      try {
        callback(this._settings);
      } catch (e) {
        console.error('[ConfigManager] Listener error:', e);
      }
    });
  },

  async checkOnboarding() {
    try {
      const response = await fetch('/api/onboarding/status');
      return await response.json();
    } catch (error) {
      console.error('[ConfigManager] Failed to check onboarding status:', error);
      return { needsOnboarding: false, authEnabled: false };
    }
  },

  async completeOnboarding(additionalSettings = {}) {
    const newSettings = { ...this._settings, ...additionalSettings, onboardingComplete: true };

    if (this._useLocalStorage) {
      this._settings = newSettings;
      this._saveToLocalStorage(newSettings);
      this._notifyListeners();
      return true;
    }

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(additionalSettings)
      });
      const data = await response.json();
      if (data.success) {
        this._settings = { ...this.DEFAULT_SETTINGS, ...data.settings };
        this._notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ConfigManager] Failed to complete onboarding:', error);
      this._settings = newSettings;
      this._saveToLocalStorage(newSettings);
      this._notifyListeners();
      return true;
    }
  },

  isOnboardingComplete() {
    return this.get('onboardingComplete', false);
  }
};

window.ConfigManager = ConfigManager;