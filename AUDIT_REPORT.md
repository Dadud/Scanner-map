# Scanner Map — Full Codebase Audit Report
**Date:** 2026-04-28
**Files Audited:** `bot.js` (~6,500 lines), `webserver.js` (~1,970 lines), `public/app.js` (~5,100 lines), `public/js/settings.js`, `public/js/live-feed.js`, `public/config-manager.js`, `geocoding.js`, `transcribe.py`

---

## Executive Summary

The Scanner Map project successfully handles a complex real-time pipeline (audio ingestion → transcription → geocoding → Discord messaging → AI summarization), but it has grown organically into three "god files" with significant technical debt. **The most dangerous issues are XSS vulnerabilities in the frontend, plaintext secrets logged to disk, SQLite concurrency risks, and race conditions in the transcription queue.** Addressing the Critical and High items below will dramatically improve security, stability, and performance.

| Severity | Count | Categories |
|----------|-------|------------|
| 🔴 Critical | 8 | Security, data integrity, concurrency |
| 🟠 High | 14 | Performance, memory leaks, race conditions |
| 🟡 Medium | 16 | Code quality, duplication, maintainability |
| 🟢 Low | 10 | Minor smells, dead code, configurability |

---

## 🔴 Critical Issues (Fix Immediately)

### 1. Frontend XSS — Unescaped Server Data in `innerHTML`
**Files:** `public/app.js`, `public/js/live-feed.js`, `public/js/settings.js`
**Risk:** Arbitrary JavaScript execution if transcription/talkgroup data contains HTML.

| Location | Data | Line |
|----------|------|------|
| Popup content | `call.talk_group_name`, `call.category`, `call.transcription` | `app.js:1177–1200` |
| Talkgroup modal | `call.transcription` | `app.js:3162` |
| Live feed items | `call.talk_group_name`, `call.transcription` | `live-feed.js:309` |
| Admin users list | `user.username` | `app.js:3649` |
| Sessions list | `session.token` in inline `onclick` | `app.js:3795` |

**Fix:** Use `document.createElement` + `textContent` instead of `innerHTML` for all user-facing text. For the inline `onclick`, create the button with `addEventListener`.

---

### 2. Plaintext Secrets Logged to Disk
**File:** `bot.js`
**Risk:** Credentials exposed in `combined.log` / `error.log`.

| Line | Secret |
|------|--------|
| `~1079` | `WEBSERVER_PASSWORD` logged during admin creation |
| `~931, ~1123–1127` | Default API key logged after auto-generation |

**Fix:** Remove password/key values from all `logger.info()` / `console.log()` calls. Log only IDs or partial hashes.

---

### 3. SQLite Concurrency — No WAL Mode or Busy Timeout
**Files:** `bot.js`, `webserver.js`
**Risk:** `SQLITE_BUSY` errors, potential DB corruption under load.

- Two Node processes (`bot.js` + `webserver.js`) write to `./botdata.db` simultaneously.
- Neither file runs `PRAGMA journal_mode = WAL;` or `PRAGMA busy_timeout = 5000;`.
- The default `DELETE` journal mode aggressively serializes writers.

**Fix:** Add to both files immediately after DB open:
```js
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA busy_timeout = 5000;');
```

---

### 4. Polling Loop Race / Overlap with AI Blocking
**File:** `webserver.js`
**Risk:** Duplicate Socket.IO emissions, redundant AI calls, event loop starvation.

- `checkForNewCalls` is `async` and calls OpenAI/Ollama (up to 10s) **inside** a `setInterval(..., 2000)`.
- `setInterval` does not wait for the previous invocation to finish → overlapping executions.
- Two separate polls (`checkForNewCalls` + `checkForLiveFeedCalls`) hit the same table every ~2s.

**Fix:**
1. Replace `setInterval` with recursive `setTimeout` that only schedules the next poll after completion.
2. Move AI categorization **out of the polling loop** — emit calls immediately, categorize asynchronously, then emit `callUpdated`.
3. Merge the two polls into a single query; consumers filter by lat/lon presence.

---

### 5. `bcrypt.compare` in Sequential Loop = DoS Vector
**File:** `bot.js`
**Risk:** CPU-bound blocking on every `/api/call-upload` request.

```js
for (let apiKey of apiKeys) {
  const match = await bcrypt.compare(key, apiKey.key); // CPU-bound, sequential
}
```

**Fix:** Cache a fast HMAC (e.g., SHA-256) fingerprint of valid keys for the hot path. Keep bcrypt only for initial validation during rotation.

---

### 6. WaveSurfer Memory Leaks
**File:** `public/app.js`
**Risk:** Audio buffers, Web Audio nodes, and DOM containers leak indefinitely.

- `clearMarkers()` removes map layers but **never destroys** WaveSurfer instances or clears `wavesurfers = {}`.
- `additionalWavesurfers` is populated but never cleared.
- `L.Icon.Pulse` injects a new `<style>` element into `document.head` on every icon creation — never removed.

**Fix:**
1. In `clearMarkers()`, iterate `Object.values(wavesurfers)`, call `.destroy()`, then `wavesurfers = {}`.
2. Inject pulse styles **once** globally instead of per-instance.

---

### 7. Transcription Queue Race Conditions
**File:** `bot.js`
**Risk:** Corrupt queue state, lost transcriptions, wrong callbacks executed.

- `transcriptionQueue` is a plain array accessed from `handleNewAudio`, `processNextTranscription`, and `readline` callbacks concurrently.
- Uses `findIndex` (O(n)) + `splice` with no atomic guard.
- `isProcessingTranscription` is a simple boolean flag across async boundaries.
- `currentTranscriptionId` + `transcriptionTimeout` have closure races.

**Fix:**
1. Replace the array with a `Map<id, queueItem>` for O(1) lookup and safer removal.
2. Replace the boolean flag with a proper semaphore or promise chain.
3. Clear timeouts by stored ID, not closure-captured variable.

---

### 8. API Keys Exposed to Frontend
**File:** `webserver.js`
**Risk:** Google Maps / LocationIQ keys served to any unauthenticated client.

```js
app.get('/api/config/google-api-key', (req, res) => {
  res.json({ apiKey: GOOGLE_MAPS_API_KEY });
});
```

**Fix:** Proxy geocoding requests through the backend instead of exposing keys. Or restrict keys by HTTP referrer and rotate them.

---

## 🟠 High Priority Issues (Fix This Week)

### 9. Missing Database Indexes
**Files:** `bot.js`, `webserver.js`
**Impact:** Full table scans on every poll and history fetch.

```sql
CREATE INDEX idx_transcriptions_timestamp ON transcriptions(timestamp);
CREATE INDEX idx_transcriptions_coords ON transcriptions(lat, lon) WHERE lat IS NOT NULL;
CREATE INDEX idx_transcriptions_talkgroup ON transcriptions(talk_group_id);
CREATE INDEX idx_transcriptions_category ON transcriptions(category);
CREATE INDEX idx_audio_transcription ON audio_files(transcription_id);
```

---

### 10. Blocking Sync Operations in Request Handlers
**File:** `webserver.js`
**Impact:** Event loop blocked, concurrent requests starved.

- `hashPassword` uses `crypto.pbkdf2Sync` (line ~361) — called on every Basic auth request.
- Correction/deletion log endpoints use `fs.readFileSync` + `fs.writeFile` on unbounded JSON files.

**Fix:**
1. Switch to `crypto.pbkdf2` (async).
2. Use append-only log streams (`fs.createWriteStream({ flags: 'a' })`) or Winston (already in `package.json`).

---

### 11. `adminAuth` Crashes on Malformed Headers
**File:** `webserver.js`
**Impact:** Unhandled `TypeError` crashes the request.

```js
const base64Credentials = authHeader.split(' ')[1]; // crashes if "Bearer" with no token
Buffer.from(base64Credentials, 'base64'); // crashes if undefined
```

**Fix:** Check `authHeader.startsWith('Basic ')` before parsing. Reuse `isAdminUser()` logic instead of duplicating it.

---

### 12. Audio Endpoint Public + Unrate-limited
**File:** `webserver.js`
**Impact:** Anyone can iterate IDs and download any audio file.

- `/audio/:id` is mounted **before** `app.use(basicAuth)`.

**Fix:** Move audio route behind auth, or add signed-URL / rate-limiting logic.

---

### 13. Session Table Ballooning
**File:** `webserver.js`
**Impact:** Every Basic auth request creates a new session row.

- `validateSession` creates a brand new session on every request.
- Cleanup only removes expired rows, not "valid but unused" rows.

**Fix:** Reuse existing valid sessions for the same user/IP instead of inserting new ones.

---

### 14. `twoToneQueue` Concurrent Splice Race
**File:** `bot.js`
**Impact:** Array index corruption when tone detection callback and new call ingestion run concurrently.

**Fix:** Use a `Map<talkGroupID, Deque>` instead of a single array with concurrent `splice`/`push`.

---

### 15. `pendingToneDetections` Never Expires
**File:** `bot.js`
**Impact:** Memory leak if Python tone process crashes or hangs.

**Fix:** Add a TTL cleanup — auto-delete entries older than 60 seconds.

---

### 16. `messageCache` Stores Full Discord Message Objects
**File:** `bot.js`
**Impact:** Unbounded Map growth during high volume.

**Fix:** Store only message IDs + URLs, not rich Discord.js objects.

---

### 17. `fs.*Sync` in Async Upload Flow
**File:** `bot.js`
**Impact:** Event loop stalls under load.

- `fs.existsSync` / `fs.accessSync` used inside transcription and upload callbacks.
- `JSON.parse` on large TrunkRecorder metadata fields.

**Fix:** Use `fs.promises.access`, stream JSON parsing, or limit metadata size.

---

### 18. Socket.IO Ping Interval Leak
**File:** `public/app.js`
**Impact:** Multiple intervals run if socket reconnects.

```js
setInterval(() => { socket.emit('ping'); }, 30000); // never cleared
```

**Fix:** Store interval ID, clear on disconnect, guard against double-init.

---

### 19. Duplicate `setGlobalVolume` Definition
**File:** `public/app.js`
**Impact:** Second declaration overwrites the first; closure behavior lost.

**Fix:** Remove one definition.

---

### 20. `fetch` Without `response.ok` Checks
**File:** `public/app.js`
**Impact:** 4xx/5xx responses parse error HTML as JSON, throwing opaque errors.

**Fix:** Add `.then(r => { if (!r.ok) throw new Error(...); return r.json(); })` to all fetch chains.

---

### 21. `lastPurgeDetails` Retains Entire Coordinate Sets in Memory
**File:** `webserver.js`
**Impact:** If a purge affects 10,000 calls, the array stays in heap until next purge.

**Fix:** Store only the purge ID + row count; keep actual coordinates in a temporary DB table or file.

---

### 22. Undo Endpoint Uses `setTimeout` to Guess Completion
**File:** `webserver.js`
**Impact:** Race condition — `setTimeout(..., 100)` may fire before all SQLite callbacks complete.

**Fix:** Use `Promise.all()` over the `db.run` operations or count callbacks.

---

## 🟡 Medium Priority Issues (Fix This Month)

### 23. Deep Nesting / Callback Hell
**Files:** `bot.js`, `public/app.js`

- `bot.js` `/api/call-upload` (TrunkRecorder path): 7+ levels of nesting.
- `bot.js` `handleNewAudio`: 550+ lines coordinating storage, DB, transcription, Discord.
- `app.js` `addMarker`: ~200 lines creating ~15 DOM elements inline.
- `app.js` `startAddressSearch`: nested closures for `getOriginalAddress`, `logCorrection`.

**Fix:** Extract pure functions (e.g., `buildPopupContent(call)`, `flyToMarker(marker)`).

---

### 24. Duplicate Code Blocks

| Duplication | Files | Lines |
|-------------|-------|-------|
| Tone formatting/logging | `bot.js` | ~308–367 vs ~615–635 |
| Source display name logic | `bot.js` | ~4285–4297 vs ~4530–4543 |
| OpenAI/Ollama fetch boilerplate | `bot.js` | ~5049–5101 vs ~6328–6376 |
| Remote transcription wrappers | `bot.js` | ~2642–2921 (80% identical) |
| Purge WHERE-clause builder | `webserver.js` | ~1633–1714 vs ~1717–1812 |
| Category list hardcoded twice | `webserver.js` | ~406–416 vs ~1618–1626 |
| `adminAuth` duplicates `isAdminUser` | `webserver.js` | ~690–710 vs ~713–762 |
| AI provider validation | `bot.js`, `geocoding.js`, `webserver.js` | Same 40-line block in 3 files |

**Fix:** Extract shared utilities into `lib/` modules.

---

### 25. No Input Validation on Marker Location Update
**File:** `webserver.js`
**Impact:** Junk coordinates can be inserted.

**Fix:** Validate `lat` ∈ [-90, 90], `lon` ∈ [-180, 180].

---

### 26. Static Files Protected by Auth (Chicken-and-Egg)
**File:** `webserver.js`
**Impact:** Login page can't load if `express.static` is behind `basicAuth`.

**Fix:** Serve static files before auth middleware, or exempt `/public` routes.

---

### 27. `importTalkGroups` Resolves Before DB Ops Finish
**File:** `bot.js`
**Impact:** CSV `on('end')` calls `resolve()` without waiting for pending SQLite inserts.

**Fix:** Track pending insert count and resolve only when all finish.

---

### 28. `db.run` ALTER TABLE Swallows Errors Silently
**File:** `webserver.js`
**Impact:** `SQLITE_BUSY`, disk full, permission denied — all silently ignored.

**Fix:** Log unexpected errors instead of suppressing them.

---

### 29. `ConfigManager.set` Double Notification
**File:** `public/config-manager.js`
**Impact:** `_notifyListeners()` called twice per `set()`.

**Fix:** Remove redundant `_notifyListeners()` in `set()` since `save()` already calls it.

---

### 30. `container.innerHTML +=` Anti-pattern
**File:** `public/app.js`
**Impact:** Forces full HTML reparse on every pagination append.

**Fix:** Use `insertAdjacentHTML('beforeend', ...)` or `DocumentFragment`.

---

### 31. `getCallIdFromMarker` is O(n)
**File:** `public/app.js`
**Impact:** Iterates entire `allMarkers` on every marker lookup.

**Fix:** Attach `marker.callId = call.id` directly to the Leaflet marker.

---

### 32. `loadCalls` Called Twice During Init
**File:** `public/app.js`
**Impact:** Redundant network traffic on every page load.

**Fix:** Remove duplicate call in `initMap` or `initializeApp`.

---

### 33. Category Sidebar Rebuilt on Every Filter
**File:** `public/app.js`
**Impact:** `updateCategoryCounts()` recreates all items from scratch on every search keystroke.

**Fix:** Use `DocumentFragment`, diff the list, or throttle/debounce.

---

### 34. No Rate Limiting on Upload Endpoint
**File:** `bot.js`
**Impact:** Combined with sequential bcrypt, an attacker can DoS the bot easily.

**Fix:** Add `express-rate-limit` to `/api/call-upload`.

---

### 35. Path Traversal in Filename Generation
**File:** `bot.js`
**Impact:** `fields.talkgroup` / `fields.source` concatenated into filenames with minimal sanitization.

**Fix:** Use `path.basename()` and stricter regex before writing files.

---

### 36. `shell: true` in Python Package Installation
**File:** `bot.js`
**Impact:** Auto-install/update spawns shell commands — dangerous pattern.

**Fix:** Pass arrays of arguments instead of shell strings, or remove auto-install entirely.

---

## 🟢 Low Priority / Quick Wins

### 37. Dead / Unused Code

| Item | File | Line | Status |
|------|------|------|--------|
| `isBootComplete` | `bot.js` | 1221 | Set but never read |
| `activeTranscriptions` | `bot.js` | 1220 | Declared, never used |
| `retries` / `maxRetries` | `bot.js` | 3580–3581 | Set but never referenced |
| `audioFilesInUse` Set | `bot.js` | 5553 | Always empty |
| `transcriptions_backup` table | `webserver.js` | 1887–1891 | Referenced but never created |
| `liveFeedEnabled` setting | `config-manager.js` | 18 | Ghost setting — never checked |
| `theme` setting | `config-manager.js` | 8 | Ghost setting — no light-theme CSS |

---

### 38. Hardcoded Values That Should Be Configurable

| Value | File | Line | Should Be |
|-------|------|------|-----------|
| `MAX_QUEUE_SIZE = 50` | `bot.js` | 201 | `.env` |
| `TRANSCRIPTION_TIMEOUT_MS = 90000` | `bot.js` | 1228 | `.env` |
| `MESSAGE_COOLDown = 15000` | `bot.js` | 1223 | `.env` |
| `SUMMARY_INTERVAL = 10 * 60 * 1000` | `bot.js` | 139 | `.env` |
| Audio cleanup: `7 * 24 * 60 * 60 * 1000` | `bot.js` | 3520 | `.env` |
| `http://${PUBLIC_DOMAIN}` | `bot.js` | 3920, 4525 | `PUBLIC_URL_SCHEME` |
| `MAX_PULSING_MARKERS` | `app.js` | — | `config.js` |
| Live feed limits | `live-feed.js` | — | `config.js` |

---

### 39. Timestamp Type Inconsistency
**Files:** `bot.js`, `webserver.js`
**Impact:** Column declared `DATETIME` but stores Unix epoch integers.

**Fix:** Change schema to `INTEGER` or store ISO strings consistently.

---

### 40. No `trust proxy` Config
**File:** `webserver.js`
**Impact:** Behind Nginx/Apache, `req.ip` logs the proxy IP.

**Fix:** `app.set('trust proxy', 1)` if running behind a reverse proxy.

---

### 41. Global Namespace Pollution
**File:** `public/app.js`
**Impact:** Dozens of top-level globals — collision risk with libraries.

**Fix:** Wrap in an IIFE or attach to a single `window.ScannerApp` namespace.

---

## Architectural Recommendations (Long-Term)

### Modularization Roadmap
The three god files should be split into focused modules:

**`bot.js` →**
- `lib/discord/` — bot client, slash commands, voice channel playback
- `lib/ingestion/` — `/api/call-upload`, file storage (S3/local), audio pipeline
- `lib/transcription/` — local Python process, remote APIs, queue management
- `lib/ai/` — summaries, ask-ai, address extraction prompts
- `lib/db/` — shared SQLite connection, migrations, queries

**`webserver.js` →**
- `routes/` — Express route handlers by domain
- `middleware/` — auth, validation, rate limiting
- `services/` — polling, Socket.IO events, AI categorization

**`public/app.js` →**
- `js/map.js` — Leaflet initialization, markers, clustering
- `js/audio.js` — WaveSurfer lifecycle, volume, playback
- `js/socket.js` — Socket.IO connection, event handlers
- `js/ui.js` — modals, banners, notifications
- `js/filters.js` — search, time range, category filtering

### Database Migration
- **Short-term:** Enable WAL mode + indexes + busy timeout.
- **Long-term:** Migrate to PostgreSQL for true concurrent write safety under high load.

### Job Queue
- Replace the in-memory `transcriptionQueue` array with **BullMQ** or **Bee Queue** (Redis-backed). This survives process restarts, provides proper concurrency controls, and enables horizontal scaling.

### Dependency Injection
- Pass `db`, `logger`, `discordClient` as constructor parameters instead of module-level globals. This makes unit testing possible.

---

## Recommended Implementation Order

| Week | Focus | Files | Effort |
|------|-------|-------|--------|
| **Week 1** | Security & data integrity | `bot.js`, `webserver.js`, `app.js`, `live-feed.js` | Medium |
| | - Remove plaintext logging | | |
| | - Sanitize all `innerHTML` | | |
| | - Enable SQLite WAL + indexes | | |
| | - Fix `adminAuth` crashes | | |
| **Week 2** | Concurrency & performance | `bot.js`, `webserver.js` | Medium |
| | - Fix transcription queue races (Map + semaphore) | | |
| | - Fix polling overlap (recursive setTimeout) | | |
| | - Add rate limiting to upload | | |
| | - Replace sync bcrypt/pbkdf2 | | |
| **Week 3** | Memory leaks & cleanup | `public/app.js`, `bot.js` | Low |
| | - Destroy WaveSurfers on marker clear | | |
| | - Fix Socket.IO interval leak | | |
| | - Add TTL to `pendingToneDetections` | | |
| | - Prune `messageCache` | | |
| **Week 4** | Code quality & deduplication | All JS files | Medium |
| | - Remove duplicate functions | | |
| | - Extract shared WHERE-builder | | |
| | - Fix `fetch` error handling | | |
| | - Remove dead code | | |
| **Month 2+** | Modularization | `bot.js`, `webserver.js`, `app.js` | High |
| | - Split into domain modules | | |
| | - Add unit tests | | |
| | - Consider PostgreSQL migration | | |
