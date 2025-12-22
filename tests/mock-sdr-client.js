// mock-sdr-client.js - HTTP client to simulate SDRTrunk/TrunkRecorder uploads

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

/**
 * Mock SDR Client for testing
 * Simulates SDRTrunk, TrunkRecorder, and rdio-scanner uploads
 */
class MockSDRClient {
  constructor(baseUrl = 'http://localhost:3306', apiKey = null) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Generate a test audio file (silent MP3)
   */
  async generateTestAudio(durationSeconds = 5, outputPath = null) {
    const output = outputPath || path.join(__dirname, 'fixtures', `test-audio-${Date.now()}.mp3`);
    
    // Create fixtures directory if it doesn't exist
    const fixturesDir = path.dirname(output);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // For testing, we'll create a minimal valid MP3 file
    // In a real scenario, you might use ffmpeg or a library to generate audio
    // For now, we'll create a placeholder that can be replaced with actual audio
    const placeholder = Buffer.alloc(1024); // Minimal MP3 header placeholder
    
    fs.writeFileSync(output, placeholder);
    return output;
  }

  /**
   * Upload a call in SDRTrunk format
   */
  async uploadSDRTrunkCall(options = {}) {
    const {
      audioFile = null,
      talkgroup = '12345',
      systemLabel = 'Test System',
      talkgroupLabel = 'Test Talkgroup',
      dateTime = new Date().toISOString(),
      source = '1234',
      talkerAlias = 'Unit 1234',
      frequency = '453.125',
      talkgroupGroup = 'Police',
      apiKey = this.apiKey,
      test = false
    } = options;

    const form = new FormData();
    
    if (test) {
      form.append('test', '1');
    } else {
      if (audioFile && fs.existsSync(audioFile)) {
        form.append('file', fs.createReadStream(audioFile));
      }
      form.append('key', apiKey || '');
      form.append('talkgroup', talkgroup);
      form.append('systemLabel', systemLabel);
      form.append('talkgroupLabel', talkgroupLabel);
      form.append('dateTime', dateTime);
      form.append('source', source);
      form.append('talkerAlias', talkerAlias);
      form.append('frequency', frequency);
      form.append('talkgroupGroup', talkgroupGroup);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/call-upload`, {
        method: 'POST',
        body: form,
        headers: {
          'user-agent': 'sdrtrunk',
          ...form.getHeaders()
        }
      });

      const text = await response.text();
      return {
        status: response.status,
        statusText: response.statusText,
        body: text,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 0,
        statusText: 'Network Error',
        body: error.message,
        ok: false,
        error
      };
    }
  }

  /**
   * Upload a call in TrunkRecorder format
   */
  async uploadTrunkRecorderCall(options = {}) {
    const {
      audioFile = null,
      talkgroup = '12345',
      system = 'Test System',
      talkgroupName = 'Test Talkgroup',
      timestamp = Math.floor(Date.now() / 1000),
      source = '1234',
      freqList = null,
      srcList = null,
      emergency = false,
      priority = 0,
      encrypted = false,
      call_length = 5,
      freq_error = 0,
      signal = 0,
      noise = 0,
      start_time = timestamp,
      stop_time = timestamp + call_length,
      tdma_slot = 0,
      phase2_tdma = false,
      color_code = 0,
      apiKey = this.apiKey
    } = options;

    const form = new FormData();
    
    if (audioFile && fs.existsSync(audioFile)) {
      form.append('audio', fs.createReadStream(audioFile));
    }
    form.append('key', apiKey || '');
    form.append('talkgroup', talkgroup);
    form.append('system', system);
    form.append('talkgroupName', talkgroupName);
    form.append('timestamp', timestamp.toString());
    form.append('source', source);
    
    if (freqList) form.append('freqList', JSON.stringify(freqList));
    if (srcList) form.append('srcList', JSON.stringify(srcList));
    form.append('emergency', emergency ? '1' : '0');
    form.append('priority', priority.toString());
    form.append('encrypted', encrypted ? '1' : '0');
    form.append('call_length', call_length.toString());
    form.append('freq_error', freq_error.toString());
    form.append('signal', signal.toString());
    form.append('noise', noise.toString());
    form.append('start_time', start_time.toString());
    form.append('stop_time', stop_time.toString());
    form.append('tdma_slot', tdma_slot.toString());
    form.append('phase2_tdma', phase2_tdma ? '1' : '0');
    form.append('color_code', color_code.toString());

    try {
      const response = await fetch(`${this.baseUrl}/api/call-upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const text = await response.text();
      return {
        status: response.status,
        statusText: response.statusText,
        body: text,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 0,
        statusText: 'Network Error',
        body: error.message,
        ok: false,
        error
      };
    }
  }

  /**
   * Upload a call in rdio-scanner format
   */
  async uploadRdioScannerCall(options = {}) {
    const {
      audioFile = null,
      talkgroup = '12345',
      system = 'Test System',
      talkgroupName = 'Test Talkgroup',
      timestamp = Math.floor(Date.now() / 1000),
      source = '1234',
      apiKey = this.apiKey
    } = options;

    const form = new FormData();
    
    if (audioFile && fs.existsSync(audioFile)) {
      form.append('audio', fs.createReadStream(audioFile));
    }
    form.append('key', apiKey || '');
    form.append('talkgroup', talkgroup);
    form.append('system', system);
    form.append('talkgroupName', talkgroupName);
    form.append('timestamp', timestamp.toString());
    form.append('source', source);

    try {
      const response = await fetch(`${this.baseUrl}/api/call-upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const text = await response.text();
      return {
        status: response.status,
        statusText: response.statusText,
        body: text,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 0,
        statusText: 'Network Error',
        body: error.message,
        ok: false,
        error
      };
    }
  }

  /**
   * Send a test request (no audio)
   */
  async sendTestRequest(apiKey = this.apiKey) {
    return this.uploadSDRTrunkCall({
      test: true,
      apiKey
    });
  }

  /**
   * Upload multiple calls concurrently
   */
  async uploadMultipleCalls(count = 5, format = 'sdrtrunk', options = {}) {
    const uploads = [];
    for (let i = 0; i < count; i++) {
      if (format === 'sdrtrunk') {
        uploads.push(this.uploadSDRTrunkCall({
          ...options,
          talkgroup: (parseInt(options.talkgroup || '12345') + i).toString()
        }));
      } else if (format === 'trunkrecorder') {
        uploads.push(this.uploadTrunkRecorderCall({
          ...options,
          talkgroup: (parseInt(options.talkgroup || '12345') + i).toString()
        }));
      }
    }
    return Promise.all(uploads);
  }
}

module.exports = MockSDRClient;

