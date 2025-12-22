// test-sdr-client.js - Unit tests for SDR client mocking

const MockSDRClient = require('../mock-sdr-client');
const path = require('path');
const fs = require('fs');

describe('MockSDRClient', () => {
  let client;
  const baseUrl = 'http://localhost:3306';
  const testApiKey = 'test-api-key-12345';

  beforeEach(() => {
    client = new MockSDRClient(baseUrl, testApiKey);
  });

  describe('SDRTrunk format', () => {
    test('should upload valid SDRTrunk call', async () => {
      const audioFile = await client.generateTestAudio(5);
      
      const result = await client.uploadSDRTrunkCall({
        audioFile,
        talkgroup: '12345',
        systemLabel: 'Test System',
        talkgroupLabel: 'Test Talkgroup'
      });

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('body');
      
      // Clean up
      if (fs.existsSync(audioFile)) {
        fs.unlinkSync(audioFile);
      }
    });

    test('should handle test request', async () => {
      const result = await client.sendTestRequest(testApiKey);
      
      expect(result.status).toBe(200);
      expect(result.body).toContain('incomplete call data');
    });

    test('should handle missing API key', async () => {
      const result = await client.uploadSDRTrunkCall({
        apiKey: null
      });

      expect(result.status).toBe(401);
    });
  });

  describe('TrunkRecorder format', () => {
    test('should upload valid TrunkRecorder call', async () => {
      const audioFile = await client.generateTestAudio(5);
      
      const result = await client.uploadTrunkRecorderCall({
        audioFile,
        talkgroup: '12345',
        system: 'Test System',
        talkgroupName: 'Test Talkgroup'
      });

      expect(result).toHaveProperty('status');
      
      // Clean up
      if (fs.existsSync(audioFile)) {
        fs.unlinkSync(audioFile);
      }
    });
  });

  describe('Concurrent uploads', () => {
    test('should handle multiple concurrent uploads', async () => {
      const results = await client.uploadMultipleCalls(5, 'sdrtrunk', {
        apiKey: testApiKey
      });

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('status');
      });
    });
  });
});

