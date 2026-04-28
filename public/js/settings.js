// settings.js — Settings modal, onboarding, and saved-settings application
// Extracted from index.html inline script. Handles user preference persistence.

let currentSettingsTab = 'general';
let onboardingStep = 1;
const totalOnboardingSteps = 4;

// ─── Settings Modal ───

function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    loadSettingsValues();
    modal.style.display = 'flex';
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function loadSettingsValues() {
  if (typeof ConfigManager !== 'undefined' && ConfigManager.getAll) {
    const settings = ConfigManager.getAll();

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };

    setVal('setting-theme', settings.theme || 'dark');
    setVal('setting-time-range', settings.defaultTimeRange || 12);
    setVal('setting-map-style', settings.mapStyle || 'day');
    setChecked('setting-track-calls', settings.trackNewCalls !== false);
    setChecked('setting-heatmap', settings.heatmapEnabled || false);
    setVal('setting-heatmap-intensity', settings.heatmapIntensity || 5);
    setChecked('setting-autoplay', settings.autoPlay !== false);
    setChecked('setting-show-modal', settings.showTalkgroupModal !== false);
    setChecked('setting-notifications', settings.notificationsEnabled !== false);
    setChecked('setting-notification-sound', settings.notificationSound !== false);
    setChecked('setting-mute-calls', settings.muteNewCalls || false);
    setVal('setting-volume', settings.globalVolume ?? 0.5);

    const volLabel = document.getElementById('setting-volume-label');
    if (volLabel) volLabel.textContent = Math.round((settings.globalVolume ?? 0.5) * 100) + '%';

    setChecked('setting-live-feed', settings.liveFeedEnabled || false);

    updateHeatmapIntensityRow();
  }
}

function updateHeatmapIntensityRow() {
  const heatmapEnabled = document.getElementById('setting-heatmap')?.checked;
  const intensityRow = document.getElementById('heatmap-intensity-row');
  if (intensityRow) {
    intensityRow.style.opacity = heatmapEnabled ? '1' : '0.5';
    intensityRow.style.pointerEvents = heatmapEnabled ? 'auto' : 'none';
  }
}

function saveSetting(key, value) {
  if (typeof ConfigManager !== 'undefined' && ConfigManager.save) {
    const settings = {};
    settings[key] = value;
    ConfigManager.save(settings);
  }
}

function setupSettingsListeners() {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
      this.classList.add('active');
      const tabName = this.getAttribute('data-tab');
      document.getElementById('settings-' + tabName)?.classList.add('active');
      currentSettingsTab = tabName;
    });
  });

  document.getElementById('setting-theme')?.addEventListener('change', function() {
    saveSetting('theme', this.value);
    applyTheme(this.value);
  });

  document.getElementById('setting-time-range')?.addEventListener('change', function() {
    saveSetting('defaultTimeRange', parseInt(this.value));
  });

  document.getElementById('setting-map-style')?.addEventListener('change', function() {
    saveSetting('mapStyle', this.value);
  });

  document.getElementById('setting-track-calls')?.addEventListener('change', function() {
    saveSetting('trackNewCalls', this.checked);
    if (typeof isTrackingNewCalls !== 'undefined') {
      isTrackingNewCalls = this.checked;
    }
  });

  document.getElementById('setting-heatmap')?.addEventListener('change', function() {
    saveSetting('heatmapEnabled', this.checked);
    updateHeatmapIntensityRow();
    if (typeof toggleHeatmap === 'function') {
      if (this.checked && !heatmapLayer) {
        toggleHeatmap();
      } else if (!this.checked && heatmapLayer) {
        toggleHeatmap();
      }
    }
  });

  document.getElementById('setting-heatmap-intensity')?.addEventListener('input', function() {
    saveSetting('heatmapIntensity', parseInt(this.value));
    if (typeof heatmapIntensity !== 'undefined') {
      heatmapIntensity = parseInt(this.value);
    }
  });

  document.getElementById('setting-autoplay')?.addEventListener('change', function() {
    saveSetting('autoPlay', this.checked);
    if (typeof talkgroupModalAutoplay !== 'undefined') {
      talkgroupModalAutoplay = this.checked;
    }
  });

  document.getElementById('setting-show-modal')?.addEventListener('change', function() {
    saveSetting('showTalkgroupModal', this.checked);
  });

  document.getElementById('setting-notifications')?.addEventListener('change', function() {
    saveSetting('notificationsEnabled', this.checked);
    if (this.checked) {
      requestNotificationPermission();
    }
  });

  document.getElementById('setting-notification-sound')?.addEventListener('change', function() {
    saveSetting('notificationSound', this.checked);
    if (typeof isNewCallAudioMuted !== 'undefined') {
      isNewCallAudioMuted = !this.checked;
    }
  });

  document.getElementById('setting-mute-calls')?.addEventListener('change', function() {
    saveSetting('muteNewCalls', this.checked);
    if (typeof isNewCallAudioMuted !== 'undefined') {
      isNewCallAudioMuted = this.checked;
    }
    const muteCheckbox = document.getElementById('mute-new-calls');
    if (muteCheckbox) muteCheckbox.checked = this.checked;
  });

  document.getElementById('setting-volume')?.addEventListener('input', function() {
    const value = parseFloat(this.value);
    const label = document.getElementById('setting-volume-label');
    if (label) label.textContent = Math.round(value * 100) + '%';
    saveSetting('globalVolume', value);
    if (typeof globalVolumeLevel !== 'undefined') {
      globalVolumeLevel = value;
      if (window.globalGainNode) {
        window.globalGainNode.gain.value = value;
      }
    }
  });

  document.getElementById('setting-live-feed')?.addEventListener('change', function() {
    saveSetting('liveFeedEnabled', this.checked);
  });

  document.getElementById('settings-reset-btn')?.addEventListener('click', async function() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      await ConfigManager.reset();
      loadSettingsValues();
      // Re-apply defaults to running app state
      await applySavedSettings();
    }
  });
}

function applyTheme(theme) {
  if (theme === 'auto') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.body.classList.toggle('light-theme', theme === 'light');
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── Apply Saved Settings to Running App ───
// Called once during startup so user preferences override hardcoded defaults.

async function applySavedSettings() {
  if (typeof ConfigManager === 'undefined' || !ConfigManager.getAll) return;
  // Ensure ConfigManager is initialized so we get real saved values, not defaults
  if (!ConfigManager._initialized) {
    await ConfigManager.init();
  }
  const settings = ConfigManager.getAll();

  // Volume
  if (typeof globalVolumeLevel !== 'undefined' && settings.globalVolume !== undefined) {
    globalVolumeLevel = settings.globalVolume;
    if (typeof setGlobalVolume === 'function') {
      setGlobalVolume(globalVolumeLevel);
    } else if (window.globalGainNode) {
      window.globalGainNode.gain.value = globalVolumeLevel;
    }
    const volSlider = document.getElementById('global-volume');
    if (volSlider) {
      volSlider.value = globalVolumeLevel;
      if (typeof updateSliderFill === 'function') updateSliderFill(volSlider);
    }
  }

  // Track new calls
  if (typeof isTrackingNewCalls !== 'undefined' && settings.trackNewCalls !== undefined) {
    isTrackingNewCalls = settings.trackNewCalls;
    const trackCheckbox = document.getElementById('track-new-calls');
    if (trackCheckbox) trackCheckbox.checked = isTrackingNewCalls;
  }

  // Mute new calls
  if (typeof isNewCallAudioMuted !== 'undefined' && settings.muteNewCalls !== undefined) {
    isNewCallAudioMuted = settings.muteNewCalls;
    const muteCheckbox = document.getElementById('mute-new-calls');
    if (muteCheckbox) muteCheckbox.checked = isNewCallAudioMuted;
  }

  // Talkgroup modal autoplay
  if (typeof talkgroupModalAutoplay !== 'undefined' && settings.autoPlay !== undefined) {
    talkgroupModalAutoplay = settings.autoPlay;
  }

  // Time range
  if (typeof timeRangeHours !== 'undefined' && settings.defaultTimeRange !== undefined) {
    timeRangeHours = settings.defaultTimeRange;
    const timeSelect = document.getElementById('time-filter');
    if (timeSelect) timeSelect.value = String(timeRangeHours);
  }

  // Heatmap intensity
  if (typeof heatmapIntensity !== 'undefined' && settings.heatmapIntensity !== undefined) {
    heatmapIntensity = settings.heatmapIntensity;
    const intensitySlider = document.getElementById('heatmap-intensity');
    if (intensitySlider) intensitySlider.value = heatmapIntensity;
  }

  // Map style — use setMapMode if available (added to app.js), else ignore
  if (settings.mapStyle && typeof setMapMode === 'function') {
    setMapMode(settings.mapStyle);
  }

  // Theme
  if (settings.theme) {
    applyTheme(settings.theme);
  }

  // Heatmap enable
  if (settings.heatmapEnabled && typeof toggleHeatmap === 'function' && !heatmapLayer) {
    const heatmapCheckbox = document.getElementById('enable-heatmap');
    if (heatmapCheckbox) heatmapCheckbox.checked = true;
    toggleHeatmap();
  }

  // Live feed audio state derived from selected talkgroups, not a global flag
}

// ─── Onboarding ───

async function checkOnboarding() {
  if (typeof ConfigManager === 'undefined') return;

  try {
    await ConfigManager.init();
    const status = await ConfigManager.checkOnboarding();

    if (status.needsOnboarding && status.authEnabled !== false) {
      showOnboarding();
    } else {
      // Onboarding already complete (or auth disabled): apply saved prefs now
      await applySavedSettings();
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    // Still try to apply settings even if onboarding check fails
    await applySavedSettings();
  }
}

function showOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    onboardingStep = 1;
    updateOnboardingStep();
    overlay.style.display = 'flex';
  }
}

function hideOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function updateOnboardingStep() {
  document.querySelectorAll('.onboarding-step').forEach((step, index) => {
    step.classList.toggle('active', index + 1 === onboardingStep);
  });

  document.querySelectorAll('.onboarding-dot').forEach((dot, index) => {
    dot.classList.remove('active', 'completed');
    if (index + 1 === onboardingStep) {
      dot.classList.add('active');
    } else if (index + 1 < onboardingStep) {
      dot.classList.add('completed');
    }
  });
}

function onboardingNext() {
  if (onboardingStep < totalOnboardingSteps) {
    onboardingStep++;
    updateOnboardingStep();
  }
}

function onboardingPrev() {
  if (onboardingStep > 1) {
    onboardingStep--;
    updateOnboardingStep();
  }
}

function onboardingSelectOption(element, groupName) {
  document.querySelectorAll(`.onboarding-option[data-value]`).forEach(opt => {
    if (opt.parentElement.querySelector(`input[name="${groupName}"]`)) {
      opt.classList.remove('selected');
    }
  });
  element.classList.add('selected');
  const radio = element.querySelector('input[type="radio"]');
  if (radio) {
    radio.checked = true;
  }
}

async function onboardingComplete() {
  const notificationLevel = document.querySelector('input[name="notificationLevel"]:checked')?.value || 'all';
  const mapStyle = document.querySelector('input[name="mapStyle"]:checked')?.value || 'day';
  const trackCalls = document.getElementById('onboarding-track-calls')?.checked ?? true;
  const enableHeatmap = document.getElementById('onboarding-heatmap')?.checked ?? false;
  const volume = parseFloat(document.getElementById('onboarding-volume')?.value ?? 0.5);
  const autoplay = document.getElementById('onboarding-autoplay')?.checked ?? true;
  const liveFeed = document.getElementById('onboarding-live-feed')?.checked ?? true;
  const notificationSound = document.getElementById('onboarding-notification-sound')?.checked ?? true;

  const settings = {
    theme: 'dark',
    mapStyle: mapStyle,
    trackNewCalls: trackCalls,
    heatmapEnabled: enableHeatmap,
    globalVolume: volume,
    autoPlay: autoplay,
    liveFeedEnabled: liveFeed,
    notificationsEnabled: notificationLevel !== 'none',
    notificationSound: notificationSound,
    onboardingComplete: true
  };

  try {
    await ConfigManager.init();
    await ConfigManager.completeOnboarding(settings);

    applyTheme('dark');

    if (typeof isTrackingNewCalls !== 'undefined') {
      isTrackingNewCalls = trackCalls;
    }
    if (typeof globalVolumeLevel !== 'undefined') {
      globalVolumeLevel = volume;
    }
    if (typeof talkgroupModalAutoplay !== 'undefined') {
      talkgroupModalAutoplay = autoplay;
    }
    // REMOVED: dead isLiveFeedEnabled reference
    if (typeof isNewCallAudioMuted !== 'undefined') {
      isNewCallAudioMuted = !notificationSound;
    }

    hideOnboarding();
  } catch (error) {
    console.error('Error completing onboarding:', error);
    hideOnboarding();
  }
}

// ─── Init ───

document.addEventListener('DOMContentLoaded', function() {
  setupSettingsListeners();

  // FIX: Only the dropdown LINK should open the modal.
  // The user-menu-btn itself toggles the dropdown (handled in app.js setupUserManagement).
  const openSettingsLink = document.getElementById('open-settings-btn');
  if (openSettingsLink) {
    openSettingsLink.addEventListener('click', function(e) {
      e.preventDefault();
      openSettingsModal();
    });
  }

  checkOnboarding();
});

// Expose globals needed by HTML onclick handlers
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.onboardingNext = onboardingNext;
window.onboardingPrev = onboardingPrev;
window.onboardingSelectOption = onboardingSelectOption;
window.onboardingComplete = onboardingComplete;
window.applyTheme = applyTheme;
window.applySavedSettings = applySavedSettings;
