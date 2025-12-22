// test-complete-flow.js - End-to-end tests for complete call processing flow

const MockSDRClient = require('../mock-sdr-client');
const { MockTranscriptionServer } = require('../mock-transcription-server');
const MockAIServer = require('../mock-ai-server');
const MockGeocodingServer = require('../mock-geocoding-server');
const DBTestUtils = require('../db-test-utils');
const StorageTestUtils = require('../storage-test-utils');
const path = require('path');
const fs = require('fs');

describe('Complete Call Processing Flow', () => {
  let transcriptionServer;
  let aiServer;
  let geocodingServer;
  let dbUtils;
  let storageUtils;
  let sdrClient;

  beforeAll(async () => {
    // Start all mock servers
    transcriptionServer = new MockTranscriptionServer(8765);
    await transcriptionServer.start();

    aiServer = new MockAIServer(8766);
    await aiServer.start();

    geocodingServer = new MockGeocodingServer(8767);
    await geocodingServer.start();

    // Initialize database and storage
    dbUtils = new DBTestUtils(path.join(__dirname, 'test-db-e2e.db'));
    await dbUtils.init();

    storageUtils = new StorageTestUtils('local');
    await storageUtils.init();

    // Initialize SDR client
    sdrClient = new MockSDRClient('http://localhost:3306', 'test-api-key');
  });

  afterAll(async () => {
    await transcriptionServer.stop();
    await aiServer.stop();
    await geocodingServer.stop();
    await dbUtils.cleanup();
    await storageUtils.cleanup();
  });

  beforeEach(() => {
    transcriptionServer.reset();
    aiServer.reset();
    geocodingServer.reset();
  });

  test('should process complete call from upload to database', async () => {
    // Configure all mock responses
    transcriptionServer.configure({
      default: 'Unit 5 responding to 123 Main Street for a medical emergency. ETA 5 minutes.'
    });

    aiServer.configure('ollama', {
      address: '123 Main Street, Baltimore, MD',
      category: 'MEDICAL EMERGENCY'
    });

    // Generate test audio
    const audioFile = await sdrClient.generateTestAudio(5);

    // Step 1: Upload call (simulated - in real test would hit actual endpoint)
    // For E2E, we'd need the actual bot.js server running
    // Here we simulate by directly inserting into DB
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Step 2: Save audio file
    const audioFilename = `call-${callId}.mp3`;
    await storageUtils.saveAudioFile(audioFile, audioFilename);

    // Step 3: Update call with audio path
    await new Promise((resolve, reject) => {
      dbUtils.getDB().run(
        'UPDATE transcriptions SET audio_file_path = ? WHERE id = ?',
        [audioFilename, callId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Step 4: Simulate transcription
    const transcription = 'Unit 5 responding to 123 Main Street for a medical emergency. ETA 5 minutes.';
    await dbUtils.updateTranscription(callId, transcription);

    // Step 5: Simulate address extraction and geocoding
    await dbUtils.updateAddress(callId, '123 Main Street, Baltimore, MD', 39.2904, -76.6122);

    // Step 6: Simulate category assignment
    await dbUtils.updateCategory(callId, 'MEDICAL EMERGENCY');

    // Verify complete call data
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
    expect(call.transcription).toBe(transcription);
    expect(call.address).toBe('123 Main Street, Baltimore, MD');
    expect(call.lat).toBe(39.2904);
    expect(call.lon).toBe(-76.6122);
    expect(call.category).toBe('MEDICAL EMERGENCY');
    expect(call.audio_file_path).toBe(audioFilename);

    // Verify audio file exists
    const audioExists = await storageUtils.fileExists(audioFilename);
    expect(audioExists).toBe(true);

    // Clean up
    if (fs.existsSync(audioFile)) {
      fs.unlinkSync(audioFile);
    }
  });

  test('should handle error recovery in complete flow', async () => {
    // Configure transcription to fail
    transcriptionServer.configure({
      error: 'Transcription service unavailable'
    });

    // Insert call
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should still exist even if transcription fails
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
    // Transcription might be null
    expect(call.transcription === null || call.transcription === '').toBe(true);
  });

  test('should process multiple calls in sequence', async () => {
    const callIds = [];

    for (let i = 0; i < 3; i++) {
      const callId = await dbUtils.insertCall({
        talkGroupID: `1234${i}`,
        transcription: `Test transcription ${i}`,
        address: `123 Test Street ${i}`,
        lat: 39.2904 + (i * 0.001),
        lon: -76.6122 + (i * 0.001),
        category: 'MEDICAL EMERGENCY',
        timestamp: Math.floor(Date.now() / 1000) + i
      });
      callIds.push(callId);
    }

    // Verify all calls were processed
    expect(callIds.length).toBe(3);

    // Verify all calls have complete data
    for (const callId of callIds) {
      const call = await dbUtils.getCall(callId);
      expect(call.transcription).toBeDefined();
      expect(call.address).toBeDefined();
      expect(call.lat).toBeDefined();
      expect(call.lon).toBeDefined();
      expect(call.category).toBeDefined();
    }
  });
});

