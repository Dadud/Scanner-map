// mock-transcription-server.js - HTTP server mocking remote transcription services

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Mock Transcription Server
 * Simulates remote transcription services (faster-whisper, OpenAI, ICAD)
 */
class MockTranscriptionServer {
  constructor(port = 8765) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.responses = {
      default: 'This is a test transcription from the mock server.',
      empty: '',
      error: null,
      timeout: false,
      delay: 0
    };
    
    this.setupRoutes();
  }

  setupRoutes() {
    const upload = multer({ dest: path.join(__dirname, 'tmp') });

    // Faster-whisper style endpoint
    this.app.post('/transcribe', upload.single('audio'), async (req, res) => {
      await this.simulateDelay();
      
      if (this.responses.timeout) {
        return res.status(504).json({ error: 'Request timeout' });
      }
      
      if (this.responses.error) {
        return res.status(500).json({ error: this.responses.error });
      }

      const transcription = this.responses.empty ? '' : this.responses.default;
      
      // Clean up uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({
        text: transcription,
        language: 'en',
        segments: transcription ? [{ text: transcription, start: 0, end: 5 }] : []
      });
    });

    // OpenAI Whisper API style endpoint
    this.app.post('/v1/audio/transcriptions', upload.single('file'), async (req, res) => {
      await this.simulateDelay();
      
      if (this.responses.timeout) {
        return res.status(504).json({ error: { message: 'Request timeout' } });
      }
      
      if (this.responses.error) {
        return res.status(500).json({ error: { message: this.responses.error } });
      }

      const transcription = this.responses.empty ? '' : this.responses.default;
      
      // Clean up uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({
        text: transcription
      });
    });

    // ICAD Transcribe style endpoint (OpenAI-compatible)
    this.app.post('/v1/audio/transcriptions', upload.single('file'), async (req, res) => {
      await this.simulateDelay();
      
      if (this.responses.timeout) {
        return res.status(504).json({ error: { message: 'Request timeout' } });
      }
      
      if (this.responses.error) {
        return res.status(500).json({ error: { message: this.responses.error } });
      }

      const transcription = this.responses.empty ? '' : this.responses.default;
      
      // Clean up uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json({
        text: transcription
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'mock-transcription' });
    });
  }

  async simulateDelay() {
    if (this.responses.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responses.delay));
    }
  }

  /**
   * Configure mock responses
   */
  configure(options = {}) {
    if (options.default !== undefined) this.responses.default = options.default;
    if (options.empty !== undefined) this.responses.empty = options.empty;
    if (options.error !== undefined) this.responses.error = options.error;
    if (options.timeout !== undefined) this.responses.timeout = options.timeout;
    if (options.delay !== undefined) this.responses.delay = options.delay;
  }

  /**
   * Reset to default responses
   */
  reset() {
    this.responses = {
      default: 'This is a test transcription from the mock server.',
      empty: false,
      error: null,
      timeout: false,
      delay: 0
    };
  }

  /**
   * Start the mock server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`[Mock Transcription Server] Listening on port ${this.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(`[Mock Transcription Server] Stopped`);
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the server URL
   */
  getUrl() {
    return `http://localhost:${this.port}`;
  }
}

/**
 * Mock Python transcription process interceptor
 * Intercepts stdin/stdout communication with transcribe.py
 */
class MockPythonTranscription {
  constructor() {
    this.responses = {
      ready: true,
      transcriptions: {},
      errors: {},
      delays: {}
    };
  }

  /**
   * Simulate a transcription response
   */
  simulateTranscription(requestId, transcription, delay = 0) {
    this.responses.transcriptions[requestId] = {
      transcription,
      delay
    };
  }

  /**
   * Simulate an error response
   */
  simulateError(requestId, error, delay = 0) {
    this.responses.errors[requestId] = {
      error,
      delay
    };
  }

  /**
   * Get response for a request
   */
  getResponse(requestId) {
    if (this.responses.errors[requestId]) {
      return {
        id: requestId,
        error: this.responses.errors[requestId].error
      };
    }
    
    if (this.responses.transcriptions[requestId]) {
      return {
        id: requestId,
        transcription: this.responses.transcriptions[requestId].transcription
      };
    }

    return null;
  }

  /**
   * Reset all responses
   */
  reset() {
    this.responses = {
      ready: true,
      transcriptions: {},
      errors: {},
      delays: {}
    };
  }
}

module.exports = { MockTranscriptionServer, MockPythonTranscription };

