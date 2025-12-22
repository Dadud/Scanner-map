// verify-setup.js - Quick verification that all test utilities are working

const MockSDRClient = require('./mock-sdr-client');
const { MockTranscriptionServer } = require('./mock-transcription-server');
const MockAIServer = require('./mock-ai-server');
const MockGeocodingServer = require('./mock-geocoding-server');
const DBTestUtils = require('./db-test-utils');
const StorageTestUtils = require('./storage-test-utils');
const path = require('path');

async function verifySetup() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        Scanner Map Test Framework Verification            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Mock SDR Client
  console.log('✓ Testing MockSDRClient...');
  try {
    const sdrClient = new MockSDRClient('http://localhost:3306', 'test-key');
    const audioFile = await sdrClient.generateTestAudio(5);
    if (audioFile) {
      console.log('  ✓ MockSDRClient: OK');
      results.passed++;
    } else {
      throw new Error('Failed to generate test audio');
    }
  } catch (error) {
    console.log('  ✗ MockSDRClient: FAILED -', error.message);
    results.failed++;
    results.errors.push({ test: 'MockSDRClient', error: error.message });
  }

  // Test 2: Mock Transcription Server
  console.log('✓ Testing MockTranscriptionServer...');
  let transcriptionServer = null;
  try {
    transcriptionServer = new MockTranscriptionServer(8765);
    await transcriptionServer.start();
    console.log('  ✓ MockTranscriptionServer: Started successfully');
    results.passed++;
  } catch (error) {
    console.log('  ✗ MockTranscriptionServer: FAILED -', error.message);
    results.failed++;
    results.errors.push({ test: 'MockTranscriptionServer', error: error.message });
  }

  // Test 3: Mock AI Server
  console.log('✓ Testing MockAIServer...');
  let aiServer = null;
  try {
    aiServer = new MockAIServer(8766);
    await aiServer.start();
    console.log('  ✓ MockAIServer: Started successfully');
    results.passed++;
  } catch (error) {
    console.log('  ✗ MockAIServer: FAILED -', error.message);
    results.failed++;
    results.errors.push({ test: 'MockAIServer', error: error.message });
  }

  // Test 4: Mock Geocoding Server
  console.log('✓ Testing MockGeocodingServer...');
  let geocodingServer = null;
  try {
    geocodingServer = new MockGeocodingServer(8767);
    await geocodingServer.start();
    console.log('  ✓ MockGeocodingServer: Started successfully');
    results.passed++;
  } catch (error) {
    console.log('  ✗ MockGeocodingServer: FAILED -', error.message);
    results.failed++;
    results.errors.push({ test: 'MockGeocodingServer', error: error.message });
  }

  // Test 5: Database Utils
  console.log('✓ Testing DBTestUtils...');
  let dbUtils = null;
  try {
    dbUtils = new DBTestUtils(path.join(__dirname, 'verify-db.db'));
    await dbUtils.init();
    const callId = await dbUtils.insertCall({
      talkGroupID: '12345',
      transcription: 'Test',
      timestamp: Math.floor(Date.now() / 1000)
    });
    const call = await dbUtils.getCall(callId);
    if (call && call.transcription === 'Test') {
      console.log('  ✓ DBTestUtils: OK');
      results.passed++;
    } else {
      throw new Error('Database operations failed');
    }
  } catch (error) {
    console.log('  ✗ DBTestUtils: FAILED -', error.message);
    results.failed++;
    results.errors.push({ test: 'DBTestUtils', error: error.message });
  }

  // Test 6: Storage Utils
  console.log('✓ Testing StorageTestUtils...');
  let storageUtils = null;
  try {
    storageUtils = new StorageTestUtils('local');
    await storageUtils.init();
    const testAudio = storageUtils.generateTestAudio(5);
    const filename = 'verify-test.mp3';
    await storageUtils.saveAudioFile(testAudio, filename);
    const exists = await storageUtils.fileExists(filename);
    if (exists) {
      console.log('  ✓ StorageTestUtils: OK');
      results.passed++;
    } else {
      throw new Error('File not found after save');
    }
  } catch (error) {
    console.log('  ✗ StorageTestUtils: FAILED -', error.message);
    results.failed++;
    results.errors.push({ test: 'StorageTestUtils', error: error.message });
  }

  // Test 7: HTTP Requests to Mock Servers
  console.log('✓ Testing HTTP requests to mock servers...');
  const fetch = require('node-fetch');
  
  if (transcriptionServer) {
    try {
      const response = await fetch('http://localhost:8765/health');
      const data = await response.json();
      if (data.status === 'ok') {
        console.log('  ✓ Transcription Server HTTP: OK');
        results.passed++;
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.log('  ✗ Transcription Server HTTP: FAILED -', error.message);
      results.failed++;
      results.errors.push({ test: 'Transcription Server HTTP', error: error.message });
    }
  }

  if (aiServer) {
    try {
      const response = await fetch('http://localhost:8766/health');
      const data = await response.json();
      if (data.status === 'ok') {
        console.log('  ✓ AI Server HTTP: OK');
        results.passed++;
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.log('  ✗ AI Server HTTP: FAILED -', error.message);
      results.failed++;
      results.errors.push({ test: 'AI Server HTTP', error: error.message });
    }
  }

  if (geocodingServer) {
    try {
      const response = await fetch('http://localhost:8767/health');
      const data = await response.json();
      if (data.status === 'ok') {
        console.log('  ✓ Geocoding Server HTTP: OK');
        results.passed++;
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.log('  ✗ Geocoding Server HTTP: FAILED -', error.message);
      results.failed++;
      results.errors.push({ test: 'Geocoding Server HTTP', error: error.message });
    }
  }

  // Cleanup
  console.log('\n✓ Cleaning up...');
  try {
    if (transcriptionServer) await transcriptionServer.stop();
    if (aiServer) await aiServer.stop();
    if (geocodingServer) await geocodingServer.stop();
    if (dbUtils) await dbUtils.cleanup();
    if (storageUtils) await storageUtils.cleanup();
    console.log('  ✓ Cleanup: OK');
  } catch (error) {
    console.log('  ⚠ Cleanup warning:', error.message);
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      Verification Summary                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Total:  ${results.passed + results.failed}`);

  if (results.failed > 0) {
    console.log('\n  Errors:');
    results.errors.forEach(({ test, error }) => {
      console.log(`    - ${test}: ${error}`);
    });
    console.log('\n  ⚠ Some tests failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n  ✓ All verification tests passed!');
    console.log('  ✓ Test framework is ready to use.');
    process.exit(0);
  }
}

// Run verification
if (require.main === module) {
  verifySetup().catch(error => {
    console.error('Fatal error during verification:', error);
    process.exit(1);
  });
}

module.exports = verifySetup;

