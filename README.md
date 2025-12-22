# Scanner Map

A **real-time mapping system** for radio calls.  
Ingests calls from SDRTrunk, TrunkRecorder, or any **rdio-scanner compatible endpoint**, then:

- Transcribes audio (local or cloud AI)  
- Extracts and geocodes locations  
- Displays calls on an interactive map with **playback** and **Discord integration**

<img width="1918" height="906" alt="434934279-4f51548f-e33f-4807-a11d-d91f3a6b4db1(1)" src="https://github.com/user-attachments/assets/801a6bb1-ee8b-4dcf-95a0-7b4d665ef394" />

---

## 🔥 Recent Updates

- **🚀 NEW: Zero-config web setup wizard** — Run `node index.js` and configure everything through your browser. No more editing `.env` files!
- **Web-based configuration** — All settings manageable through browser interface
- **One-command startup** — Single command to run everything
- **Automatic .env migration** — Existing installations can import their .env settings
- **Admin-restricted marker editing** — Map marker editing now locked behind admin user when authentication is enabled
- **Purge calls from map** — New admin-only feature to remove calls by talkgroup category and time range, includes undo button to restore accidentally purged calls
- Full **one-command integration** (no multiple terminals)  
- Auto-generated API keys & admin users  
- Improved **AI summaries & Ask AI** features  
- New **S3 audio storage option**  
- **OpenAI transcription prompting** — configure custom prompts to fine‑tune transcription behavior  
- **Two-tone detection** — powered by [icad-tone-detection](https://github.com/TheGreatCodeholio/icad-tone-detection).  
  - Detects fire/EMS tones in radio calls  
  - Optionally restrict address extraction to toned calls only, or combine tone + address detection for greater accuracy  
- **ICAD Transcribe integration** — thanks to [TheGreatCodeholio/icad_transcribe](https://github.com/TheGreatCodeholio/icad_transcribe) for providing advanced radio-optimized transcription support  

---

## ✨ Features

### 🚀 Core
- **Zero-config setup:** Run once, configure in browser
- **One-command startup:** `node index.js`
- **Web-based setup wizard:** No more editing config files
- **Automatic setup:** database, API keys, talkgroups, admin accounts
- **Integrated services:** Discord bot + webserver run together

### 🗺️ Mapping
- Real-time calls displayed on a Leaflet map  
- Marker clustering, heatmaps, day/night/satellite views  
- Call details with transcript + audio playback  
- Call filtering and marker editing (admin-restricted when auth enabled)
- **Call purging:** Admin-only bulk removal with undo functionality

### 🎤 Transcription
- **Local:** `faster-whisper` (CPU or NVIDIA GPU)  
- **Remote:** via [speaches](https://github.com/speaches-ai/speaches) or custom servers  
- **OpenAI Whisper API** with support for custom prompts  
- **ICAD Transcribe** for radio-optimized results  

### 🤖 AI Enhancements
- Address extraction + geocoding (Google Maps or LocationIQ)  
- AI summaries of recent transmissions  
- "Ask AI" chat about call history  
- Optional two‑tone detection for toned call filtering  

### 🎮 Discord Integration
- Auto-post transcriptions by talkgroup  
- Keyword alerts  
- AI summaries with refresh buttons  
- Optional: live audio in voice channels  

### 🔒 Security
- Optional user authentication  
- Auto-generated API keys  
- Secure session management  
- Admin-only controls for sensitive operations

---

## 📦 Installation

Supports **Windows 10/11** and **Debian/Ubuntu Linux**.  
Installation scripts handle dependencies, configuration, and setup.

### Prerequisites
- SDRTrunk, TrunkRecorder, or rdio-scanner configured  
- Talkgroup export from RadioReference (Premium subscription recommended)  
- API key for **Google Maps** or **LocationIQ**  
- (Optional) NVIDIA GPU for local transcription  
- (Optional) Discord Bot application  
- (Optional) Remote transcription server (e.g., [speaches](https://github.com/speaches-ai/speaches) or ICAD)

### Quick Start
```bash
# Install dependencies
npm install --legacy-peer-deps

# Run the setup wizard
node index.js
```

Open `http://localhost:8082/setup` in your browser and follow the wizard.

**Note:** The `--legacy-peer-deps` flag is required due to Discord.js dependency conflicts. This is safe and commonly used.

#### Option 2: Using Full Installation Scripts
```bash
# Linux
sudo bash linux_install_scanner_map.sh

# Windows (PowerShell as Admin)
.\install_scanner_map.ps1
```

Then run `node index.js` and complete setup in your browser.

---

## ⚙️ Configuration

### Web-Based Configuration (New!)

All settings are now configurable through the browser:
1. Run `node index.js`
2. Open `http://localhost:8080/setup`
3. Follow the setup wizard

Settings are stored in `data/config.json` (auto-encrypted for sensitive values).

### Legacy .env Configuration

For existing installations, `.env` files are still supported. You can migrate to the new system:
1. Run `node index.js`
2. Choose "Import from .env" in the setup wizard

Key `.env` options (for reference):
- `DISCORD_TOKEN` — your bot token  
- `GOOGLE_MAPS_API_KEY` / `LOCATIONIQ_API_KEY` — geocoding provider  
- `MAPPED_TALK_GROUPS` — talkgroups to monitor  
- `TRANSCRIPTION_MODE` — `local`, `remote`, `openai`, or `icad`  
- `STORAGE_MODE` — `local` or `s3`  
- `ENABLE_TWO_TONE_MODE` — enable/disable two‑tone detection  

Other files:
- `public/config.js` ← map defaults (center, zoom, icons, etc.)  
- `data/config.json` ← main configuration (created by wizard)
- `data/apikeys.json` ← auto-generated on first run  

---

## 📡 Connecting Your Radio Software

- **SDRTrunk:** Configure Streaming → Rdio Scanner endpoint  
- **TrunkRecorder:** Add an `uploadServer` entry pointing to `http://<server>:<port>/api/call-upload`  
- **rdio-scanner downstream:** Add server + API key  

---

## 💻 System Requirements
- OS: Windows 10/11 or Debian/Ubuntu  
- CPU: Modern multi-core  
- RAM: 16GB+ recommended  
- GPU: (Optional) NVIDIA CUDA (8GB+ VRAM recommended)  
- Storage: SSD (5—10GB for models + audio)

---

## 🛠 Troubleshooting
- Logs: `combined.log` and `error.log`  
- Check `.env` values (especially API keys and modes)  
- Verify dependencies: Node, Python, FFmpeg, CUDA (if using GPU)  
- Ensure correct geocoding.js (Google vs LocationIQ)  

---

## 🤝 Contributing
Pull requests and issue reports are welcome.  

## 📬 Support
- Open a GitHub Issue  
- Contact **poisonednumber** on Discord
