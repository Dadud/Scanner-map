# Setup Wizard Auto-Configuration Improvements Plan

## Overview
Enhance the setup wizard to automatically detect and configure settings, reducing manual input and improving user experience.

---

## 🎯 Phase 1: Location-Based Auto-Configuration

### 1.1 IP-Based Location Detection
**Goal:** Auto-detect user's location from IP address

**Implementation:**
- Add API endpoint: `GET /api/setup/detect-location`
- Use free IP geolocation service (ipapi.co, ip-api.com, or ipify.org)
- Return: `{ country, region, city, lat, lng, timezone }`

**Benefits:**
- Auto-populate map center
- Auto-select timezone
- Pre-select state/country

**User Experience:**
- Show "Detecting your location..." spinner
- Display detected location: "Detected: Baltimore, MD, USA"
- Allow user to confirm or override

---

### 1.2 State Selection with County Lists
**Goal:** When user selects a state, auto-populate counties dropdown

**Implementation:**
- Create `data/us-counties.json` with state → counties mapping
- Add API endpoint: `GET /api/setup/counties/:stateCode`
- Update geocoding step to use dropdown instead of text input

**Data Structure:**
```json
{
  "MD": ["Baltimore", "Howard", "Anne Arundel", "Montgomery", ...],
  "CA": ["Los Angeles", "San Diego", "Orange", ...],
  ...
}
```

**User Experience:**
- State dropdown (all 50 states + DC)
- Counties multi-select dropdown (populated based on state)
- "Select All" / "Select None" buttons
- Search/filter counties

---

### 1.3 Timezone Auto-Detection
**Goal:** Auto-detect timezone from location

**Implementation:**
- Use IP geolocation to get timezone
- Map state codes to timezones as fallback
- Update timezone dropdown to show detected timezone first

**Timezone Mapping:**
- State → Primary timezone mapping
- Handle states with multiple timezones (e.g., Florida, Indiana)

**User Experience:**
- Pre-select detected timezone
- Show "Detected: America/New_York" badge
- Still allow manual override

---

## 🎯 Phase 2: Smart Defaults & Recommendations

### 2.1 Map Center Auto-Detection
**Goal:** Set map center based on location

**Implementation:**
- Use IP geolocation lat/lng
- Or use state center coordinates as fallback
- Update map to center on detected location

**State Center Coordinates:**
- Pre-calculated lat/lng for each state's geographic center
- Stored in `data/state-centers.json`

**User Experience:**
- Map automatically centers on detected location
- Show marker at detected location
- User can drag to adjust

---

### 2.2 Transcription Model Recommendations
**Goal:** Recommend best transcription model based on hardware

**Implementation:**
- Detect GPU availability (already implemented)
- Detect CPU cores and RAM
- Recommend model based on:
  - GPU available → `large-v3` (best accuracy)
  - CPU only, 8+ cores → `medium` (good balance)
  - CPU only, <8 cores → `small` (faster)

**User Experience:**
- Show recommendation badge: "Recommended: large-v3 (GPU detected)"
- Pre-select recommended model
- Show performance estimate: "~2s per call" or "~10s per call"

---

### 2.3 Device Selection Auto-Detection
**Goal:** Auto-select CUDA vs CPU based on GPU availability

**Implementation:**
- Already partially implemented (`/api/setup/detect-gpu`)
- Enhance to show GPU name and VRAM
- Auto-select CUDA if GPU detected

**User Experience:**
- Show GPU info: "NVIDIA RTX 3080 (10GB VRAM) detected"
- Pre-select "GPU (CUDA)" option
- Disable CPU option if GPU available (or show warning)

---

## 🎯 Phase 3: Service Detection & Validation

### 3.1 Ollama Auto-Detection
**Goal:** Detect if Ollama is running and list available models

**Implementation:**
- Add endpoint: `GET /api/setup/detect-ollama`
- Check if Ollama is accessible
- List available models: `GET http://localhost:11434/api/tags`
- Pre-select first available model

**User Experience:**
- Show "Ollama detected!" badge
- Dropdown of available models
- "Refresh" button to re-detect
- Show model size/parameters

---

### 3.2 Remote Transcription Server Detection
**Goal:** Auto-detect Faster Whisper server

**Implementation:**
- Add endpoint: `POST /api/setup/detect-remote-transcription`
- Try common ports: 8000, 8080, 5000
- Check `/health` or `/api/health` endpoint
- List available models

**User Experience:**
- "Scan for servers" button
- Show detected servers with models
- Pre-fill URL if single server found

---

### 3.3 ICAD Server Detection
**Goal:** Auto-detect ICAD Transcribe server

**Implementation:**
- Check default ICAD URL: `http://127.0.0.1:8080`
- Test connection
- List available profiles/models

**User Experience:**
- "Test ICAD Connection" button
- Show available profiles
- Pre-select if single option

---

## 🎯 Phase 4: Network & System Detection

### 4.1 Public IP Detection
**Goal:** Detect public IP for API key URL generation

**Implementation:**
- Add endpoint: `GET /api/setup/detect-public-ip`
- Use ipify.org or similar service
- Generate scanner connection URL with IP

**User Experience:**
- Show connection URL: `http://YOUR_IP:8080/api/call-upload`
- Copy-to-clipboard button
- Update when IP changes

---

### 4.2 Local Network IP Detection
**Goal:** Detect local IP addresses for LAN connections

**Implementation:**
- Use Node.js `os.networkInterfaces()`
- List all local IPs (IPv4)
- Show which IP to use for local scanner software

**User Experience:**
- Show local IPs: "192.168.1.100", "10.0.0.5"
- Explain which to use
- Generate local connection URLs

---

### 4.3 System Resource Detection
**Goal:** Show system specs for recommendations

**Implementation:**
- Detect CPU cores: `os.cpus().length`
- Detect total RAM: `os.totalmem()`
- Detect available RAM: `os.freemem()`
- Detect Node.js version
- Detect Python version

**User Experience:**
- Show system info card:
  ```
  System Information:
  • CPU: 8 cores
  • RAM: 16 GB (12 GB available)
  • Node.js: v20.10.0
  • Python: 3.11.5
  ```
- Use for recommendations

---

## 🎯 Phase 5: Smart Talkgroup Filtering

### 5.1 Talkgroup Category Detection
**Goal:** Auto-filter talkgroups by category/type

**Implementation:**
- Parse RadioReference CSV tags/descriptions
- Categorize: Dispatch, Fire, EMS, Police, etc.
- Pre-select dispatch talkgroups
- Filter by county (if county info available)

**User Experience:**
- "Filter by Category" dropdown
- "Select All Dispatch" button (already exists)
- "Select by County" filter
- Show count: "45 dispatch talkgroups found"

---

### 5.2 Talkgroup Description Suggestions
**Goal:** Auto-suggest location descriptions

**Implementation:**
- Use talkgroup name/description
- Extract location keywords
- Suggest: "Baltimore City", "Howard County", etc.
- Use county data to match

**User Experience:**
- Auto-fill description field
- Show suggestions dropdown
- "Apply to all dispatch" button

---

## 🎯 Phase 6: Enhanced UI/UX

### 6.1 Progress Indicators
**Goal:** Show what's being auto-detected

**Implementation:**
- Loading states for each detection
- Progress bar: "Detecting location...", "Scanning for services..."
- Success/error badges

**User Experience:**
- Animated spinners during detection
- Green checkmarks when complete
- Red X if detection fails (with manual option)

---

### 6.2 Smart Defaults Summary
**Goal:** Show all auto-detected values before proceeding

**Implementation:**
- Add "Review Auto-Detected Settings" step
- Show all detected values
- Allow bulk editing
- "Use All" / "Override All" buttons

**User Experience:**
- Summary card showing:
  - ✓ Location: Baltimore, MD
  - ✓ Timezone: America/New_York
  - ✓ Counties: Baltimore, Howard (2 selected)
  - ✓ GPU: NVIDIA RTX 3080 detected
  - ✓ Ollama: llama3.1:8b available

---

### 6.3 Validation & Error Handling
**Goal:** Better error messages and recovery

**Implementation:**
- Validate all inputs before proceeding
- Show specific errors: "County 'XYZ' not found in MD"
- Suggest fixes: "Did you mean 'Baltimore'?"
- Allow skipping optional steps

**User Experience:**
- Inline validation
- Error tooltips
- "Skip this step" option for optional configs

---

## 📋 Implementation Priority

### High Priority (Immediate Value)
1. ✅ **State → Counties dropdown** (biggest UX improvement)
2. ✅ **IP-based location detection** (auto-fills multiple fields)
3. ✅ **Timezone auto-detection** (from location)
4. ✅ **GPU detection enhancement** (already partially done)

### Medium Priority (Nice to Have)
5. **Ollama model detection** (if using Ollama)
6. **Public IP detection** (for API URLs)
7. **System resource detection** (for recommendations)
8. **Talkgroup filtering improvements**

### Low Priority (Polish)
9. **Remote server scanning**
10. **ICAD auto-detection**
11. **Smart defaults summary screen**
12. **Enhanced validation**

---

## 🛠️ Technical Implementation Notes

### New Files Needed
- `data/us-counties.json` - State → counties mapping
- `data/state-centers.json` - State geographic centers
- `data/timezone-map.json` - State → timezone mapping
- `setup-detection.js` - Detection utilities module

### New API Endpoints
- `GET /api/setup/detect-location` - IP geolocation
- `GET /api/setup/counties/:state` - Get counties for state
- `GET /api/setup/detect-public-ip` - Public IP detection
- `GET /api/setup/system-info` - System resources
- `GET /api/setup/detect-ollama` - Ollama detection
- `POST /api/setup/detect-remote-transcription` - Remote server scan

### Frontend Enhancements
- Add loading states to setup.js
- Create county dropdown component
- Add detection status indicators
- Enhance map step with auto-centering

---

## 🎨 User Experience Flow

### Before (Current)
1. User manually enters coordinates
2. User manually selects timezone
3. User manually types county names
4. User manually selects state

### After (Improved)
1. **Auto-detect location** → "Detected: Baltimore, MD"
2. **Auto-center map** → Map shows Baltimore
3. **Auto-select timezone** → "America/New_York (detected)"
4. **Select state** → Counties dropdown auto-populates
5. **Select counties** → Multi-select from dropdown
6. **Review & confirm** → One-click to accept all

**Time saved:** ~5 minutes → ~30 seconds

---

## 📊 Success Metrics

- **Setup time:** Reduce from ~15 minutes to ~5 minutes
- **User errors:** Reduce county/state typos by 90%
- **Completion rate:** Increase from ~70% to ~95%
- **User satisfaction:** "Much easier" feedback

---

## 🚀 Quick Wins (Can implement first)

1. **State dropdown** → Counties dropdown (2-3 hours)
2. **IP geolocation** → Auto-fill location (1-2 hours)
3. **Timezone mapping** → Auto-select timezone (1 hour)
4. **GPU detection** → Enhance existing (30 minutes)

**Total quick wins:** ~5 hours of work, huge UX improvement

---

## Next Steps

1. Review and approve plan
2. Create data files (counties, state centers, timezones)
3. Implement detection endpoints
4. Update frontend with auto-population
5. Test with real users
6. Iterate based on feedback

