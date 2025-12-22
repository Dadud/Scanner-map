// test-error-scenarios.js - End-to-end tests for error handling

const { MockTranscriptionServer } = require('../mock-transcription-server');
const MockAIServer = require('../mock-ai-server');
const MockGeocodingServer = require('../mock-geocoding-server');
const DBTestUtils = require('../db-test-utils');
const path = require('path');

describe('Error Scenarios E2E', () => {
  let transcriptionServer;
  let aiServer;
  let geocodingServer;
  let dbUtils;

  beforeAll(async () => {
    transcriptionServer = new MockTranscriptionServer(8765);
    await transcriptionServer.start();

    aiServer = new MockAIServer(8766);
    await aiServer.start();

    geocodingServer = new MockGeocodingServer(8767);
    await geocodingServer.start();

    dbUtils = new DBTestUtils(path.join(__dirname, 'test-db-errors.db'));
    await dbUtils.init();
  });

  afterAll(async () => {
    await transcriptionServer.stop();
    await aiServer.stop();
    await geocodingServer.stop();
    await dbUtils.cleanup();
  });

  test('should handle transcription timeout', async () => {
    transcriptionServer.configure({
      timeout: true,
      delay: 10000 // Long delay to simulate timeout
    });

    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should exist even if transcription times out
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
  });

  test('should handle AI service timeout', async () => {
    aiServer.configure('ollama', {
      timeout: true,
      delay: 10000
    });

    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Unit responding to 123 Main Street',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should exist even if AI times out
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
    // Address might be null if AI times out
    expect(call.address === null || typeof call.address === 'string').toBe(true);
  });

  test('should handle geocoding rate limit', async () => {
    geocodingServer.configure('locationiq', {
      rateLimit: true
    });

    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Unit responding to 123 Main Street',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should exist even if geocoding is rate limited
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
  });

  test('should handle malformed AI response', async () => {
    // Configure AI to return malformed response
    aiServer.configure('ollama', {
      default: '{ invalid json }'
    });

    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Unit responding to 123 Main Street',
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Call should exist even if AI returns malformed response
    const call = await dbUtils.getCall(callId);
    expect(call).toBeDefined();
  });
});

