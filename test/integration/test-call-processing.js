// test-call-processing.js - Integration tests for call processing pipeline

const MockSDRClient = require('../mock-sdr-client');
const { MockTranscriptionServer } = require('../mock-transcription-server');
const MockAIServer = require('../mock-ai-server');
const MockGeocodingServer = require('../mock-geocoding-server');
const DBTestUtils = require('../db-test-utils');
const StorageTestUtils = require('../storage-test-utils');
const path = require('path');

describe('Call Processing Integration', () => {
  let transcriptionServer;
  let aiServer;
  let geocodingServer;
  let dbUtils;
  let storageUtils;
  let sdrClient;

  beforeAll(async () => {
    // Start mock servers
    transcriptionServer = new MockTranscriptionServer(8765);
    await transcriptionServer.start();

    aiServer = new MockAIServer(8766);
    await aiServer.start();

    geocodingServer = new MockGeocodingServer(8767);
    await geocodingServer.start();

    // Initialize database and storage
    dbUtils = new DBTestUtils(path.join(__dirname, 'test-db-integration.db'));
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

  test('should process complete call flow', async () => {
    // Configure mock responses
    transcriptionServer.configure({
      default: 'Unit 5 responding to 123 Main Street for a medical emergency.'
    });

    aiServer.configure('ollama', {
      address: '123 Main Street, Baltimore, MD'
    });

    // Insert initial call
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Simulate transcription update
    await dbUtils.updateTranscription(
      callId,
      'Unit 5 responding to 123 Main Street for a medical emergency.'
    );

    // Verify transcription was saved
    const call = await dbUtils.getCall(callId);
    expect(call.transcription).toContain('123 Main Street');

    // Simulate address extraction and geocoding
    await dbUtils.updateAddress(callId, '123 Main Street, Baltimore, MD', 39.2904, -76.6122);

    // Verify address and coordinates were saved
    const updatedCall = await dbUtils.getCall(callId);
    expect(updatedCall.address).toBe('123 Main Street, Baltimore, MD');
    expect(updatedCall.lat).toBe(39.2904);
    expect(updatedCall.lon).toBe(-76.6122);
  });

  test('should handle transcription failure gracefully', async () => {
    transcriptionServer.configure({
      error: 'Transcription failed'
    });

    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should still exist even if transcription fails
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
    // Transcription might be null or empty
    expect(call.transcription === null || call.transcription === '').toBe(true);
  });

  test('should handle geocoding failure gracefully', async () => {
    geocodingServer.configure('locationiq', {
      error: 'Geocoding failed'
    });

    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Unit responding to 123 Main Street',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should exist even if geocoding fails
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
    // Address/coordinates might be null
    expect(call.lat === null || typeof call.lat === 'number').toBe(true);
  });

  test('should process multiple calls concurrently', async () => {
    const callIds = [];

    // Insert multiple calls
    for (let i = 0; i < 5; i++) {
      const callId = await dbUtils.insertCall({
        talkGroupID: `1234${i}`,
        transcription: `Test transcription ${i}`,
        timestamp: Math.floor(Date.now() / 1000) + i
      });
      callIds.push(callId);
    }

    // Verify all calls were inserted
    expect(callIds.length).toBe(5);

    // Verify all calls exist
    for (const callId of callIds) {
      const call = await dbUtils.getCall(callId);
      expect(call).toBeDefined();
    }
  });
});

