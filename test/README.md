# Scanner Map Test Suite

Comprehensive testing framework for verifying all features of the Scanner Map application.

## Overview

This test suite includes:
- **Mock servers** for SDR apps, transcription services, AI services, and geocoding services
- **Interception utilities** for monitoring and mocking transcription and AI calls
- **Database and storage utilities** for test data management
- **Unit tests** for individual components
- **Integration tests** for component interactions
- **End-to-end tests** for complete workflows

## Structure

```
test/
├── mock-sdr-client.js          # Mock SDR client (SDRTrunk/TrunkRecorder)
├── mock-transcription-server.js # Mock transcription service
├── mock-ai-server.js           # Mock AI service (Ollama/OpenAI)
├── mock-geocoding-server.js    # Mock geocoding service
├── intercept-transcription.js   # Transcription interception utilities
├── intercept-ai.js             # AI interception utilities
├── db-test-utils.js            # Database test utilities
├── storage-test-utils.js       # Storage test utilities
├── run-all-tests.js            # Test runner
├── fixtures/                   # Test data and fixtures
│   ├── sample-transcriptions.json
│   ├── sample-geocoding-responses.json
│   └── sample-ai-responses.json
├── unit/                       # Unit tests
│   ├── test-sdr-client.js
│   ├── test-transcription-server.js
│   ├── test-ai-server.js
│   ├── test-geocoding-server.js
│   ├── test-db-utils.js
│   └── test-storage-utils.js
├── integration/                # Integration tests
│   ├── test-call-processing.js
│   ├── test-address-extraction.js
│   └── test-discord-integration.js
└── e2e/                        # End-to-end tests
    ├── test-complete-flow.js
    └── test-error-scenarios.js
```

## Web-Based Test Interface

**View and run tests in your browser!**

Start the test results web server:

```bash
npm run test:server
```

Then open your browser to: **http://localhost:8768**

The web interface allows you to:
- ✅ Verify test framework setup
- ▶ Run all tests or specific test suites
- 📊 View test results with statistics
- 📝 See detailed test output
- 🔄 Real-time status updates

## Quick Verification

**First, verify the test framework is working:**

```bash
npm run test:verify
```

Or use the web interface and click "Verify Setup".

This runs a quick verification that all test utilities are functional. You should see all tests pass before running the full test suite.

## Regression Testing

**The test suite is designed to help you add features without breaking existing functionality.**

### Quick Start for Adding Features

1. **Before making changes:**
   ```bash
   npm test  # Ensure everything works
   npm run test:regression:update  # Create baseline
   ```

2. **Add your feature and write tests:**
   ```bash
   cp test/feature-test-template.js test/unit/test-my-feature.js
   # Edit the template to test your feature
   ```

3. **Verify no regressions:**
   ```bash
   npm test  # Run all tests
   npm run test:regression  # Check for regressions
   ```

4. **If all good, update baseline:**
   ```bash
   npm run test:regression:update
   ```

See [REGRESSION_TESTING.md](REGRESSION_TESTING.md) for detailed guide.

## Running Tests

### Run all tests
```bash
npm test
```

### Run regression tests (compares with baseline)
```bash
npm run test:regression
```

### Run specific test suite
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Run with verbose output
```bash
npm run test:verbose
```

### Run with coverage
```bash
npm run test:coverage
```

## Mock Servers

The test suite includes mock servers that simulate external services:

- **Mock Transcription Server** (port 8765): Simulates remote transcription services
- **Mock AI Server** (port 8766): Simulates Ollama and OpenAI APIs
- **Mock Geocoding Server** (port 8767): Simulates LocationIQ, Google Maps, and Nominatim

These servers automatically start before tests and stop after tests complete.

## Test Utilities

### MockSDRClient
Simulates SDR app uploads (SDRTrunk, TrunkRecorder, rdio-scanner).

```javascript
const MockSDRClient = require('./test/mock-sdr-client');
const client = new MockSDRClient('http://localhost:3306', 'api-key');
await client.uploadSDRTrunkCall({ talkgroup: '12345', audioFile: 'test.mp3' });
```

### DBTestUtils
Database setup, teardown, and helper functions.

```javascript
const DBTestUtils = require('./test/db-test-utils');
const db = new DBTestUtils();
await db.init();
const callId = await db.insertCall({ talkGroupID: '12345', transcription: 'Test' });
```

### StorageTestUtils
Storage testing utilities for local and S3 storage.

```javascript
const StorageTestUtils = require('./test/storage-test-utils');
const storage = new StorageTestUtils('local');
await storage.init();
await storage.saveAudioFile(audioData, 'test.mp3');
```

## Writing Tests

### Unit Test Example
```javascript
const MockSDRClient = require('../mock-sdr-client');

describe('MockSDRClient', () => {
  test('should upload valid call', async () => {
    const client = new MockSDRClient();
    const result = await client.uploadSDRTrunkCall({ talkgroup: '12345' });
    expect(result.status).toBe(200);
  });
});
```

### Integration Test Example
```javascript
const { MockTranscriptionServer } = require('../mock-transcription-server');
const DBTestUtils = require('../db-test-utils');

describe('Call Processing', () => {
  let server, db;

  beforeAll(async () => {
    server = new MockTranscriptionServer(8765);
    await server.start();
    db = new DBTestUtils();
    await db.init();
  });

  afterAll(async () => {
    await server.stop();
    await db.cleanup();
  });

  test('should process call', async () => {
    // Test implementation
  });
});
```

## Verification Checklist

The test suite verifies:

- [x] SDR input processing (SDRTrunk, TrunkRecorder formats)
- [x] Transcription (local, remote, OpenAI, ICAD)
- [x] AI services (address extraction, categorization, summaries)
- [x] Geocoding (LocationIQ, Google Maps, Nominatim)
- [x] Database operations (insert, update, query, purge)
- [x] Storage (local and S3)
- [x] Error handling and recovery
- [x] Concurrent processing
- [x] End-to-end workflows

## Notes

- Mock servers use non-standard ports (8765-8767) to avoid conflicts
- Test databases are created in the test directory and cleaned up after tests
- Audio files are generated during tests and cleaned up automatically
- All mock servers support configurable responses for different test scenarios

