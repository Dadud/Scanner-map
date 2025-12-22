// test-storage-utils.js - Unit tests for storage utilities

const StorageTestUtils = require('../storage-test-utils');
const path = require('path');
const fs = require('fs');

describe('StorageTestUtils', () => {
  let storageUtils;

  afterEach(async () => {
    if (storageUtils) {
      await storageUtils.cleanup();
    }
  });

  describe('Local storage', () => {
    beforeEach(async () => {
      storageUtils = new StorageTestUtils('local');
      await storageUtils.init();
    });

    test('should save audio file', async () => {
      const testAudio = storageUtils.generateTestAudio(5);
      const filename = 'test-audio.mp3';

      const savedPath = await storageUtils.saveAudioFile(testAudio, filename);
      expect(savedPath).toBe(filename);

      const exists = await storageUtils.fileExists(filename);
      expect(exists).toBe(true);
    });

    test('should retrieve audio file', async () => {
      const testAudio = storageUtils.generateTestAudio(5);
      const filename = 'test-audio-retrieve.mp3';

      await storageUtils.saveAudioFile(testAudio, filename);
      const retrieved = await storageUtils.getAudioFile(filename);

      expect(retrieved).toBeDefined();
      expect(Buffer.isBuffer(retrieved)).toBe(true);
    });

    test('should delete audio file', async () => {
      const testAudio = storageUtils.generateTestAudio(5);
      const filename = 'test-audio-delete.mp3';

      await storageUtils.saveAudioFile(testAudio, filename);
      await storageUtils.deleteAudioFile(filename);

      const exists = await storageUtils.fileExists(filename);
      expect(exists).toBe(false);
    });
  });

  // Note: S3 tests would require MinIO or similar setup
  // Skipping for now but structure is ready
});

