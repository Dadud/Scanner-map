// intercept-transcription.js - Monkey-patch transcription functions to intercept and mock

const Module = require('module');
const originalRequire = Module.prototype.require;

/**
 * Transcription Interceptor
 * Intercepts and logs all transcription requests/responses
 */
class TranscriptionInterceptor {
  constructor() {
    this.intercepted = false;
    this.requests = [];
    this.responses = {};
    this.mockMode = false;
    this.mockResponses = {};
  }

  /**
   * Start intercepting transcription calls
   */
  start() {
    if (this.intercepted) {
      return;
    }

    // Store original functions
    this.originalFunctions = {};

    // This will be used to patch functions in bot.js when it's loaded
    this.intercepted = true;
    console.log('[Transcription Interceptor] Started');
  }

  /**
   * Stop intercepting
   */
  stop() {
    if (!this.intercepted) {
      return;
    }

    // Restore original functions if needed
    if (this.originalFunctions) {
      // Restore logic would go here
    }

    this.intercepted = false;
    console.log('[Transcription Interceptor] Stopped');
  }

  /**
   * Log a transcription request
   */
  logRequest(requestId, filePath, mode) {
    this.requests.push({
      timestamp: new Date().toISOString(),
      requestId,
      filePath,
      mode
    });
  }

  /**
   * Log a transcription response
   */
  logResponse(requestId, transcription, error = null) {
    this.responses[requestId] = {
      timestamp: new Date().toISOString(),
      transcription,
      error
    };
  }

  /**
   * Set mock response for a request
   */
  setMockResponse(requestId, transcription, delay = 0) {
    this.mockResponses[requestId] = {
      transcription,
      delay
    };
  }

  /**
   * Get mock response for a request
   */
  getMockResponse(requestId) {
    return this.mockResponses[requestId];
  }

  /**
   * Enable mock mode (return mock responses instead of real ones)
   */
  enableMockMode() {
    this.mockMode = true;
  }

  /**
   * Disable mock mode
   */
  disableMockMode() {
    this.mockMode = false;
  }

  /**
   * Clear all logs
   */
  clear() {
    this.requests = [];
    this.responses = {};
    this.mockResponses = {};
  }

  /**
   * Get all requests
   */
  getRequests() {
    return this.requests;
  }

  /**
   * Get all responses
   */
  getResponses() {
    return this.responses;
  }

  /**
   * Get request/response pair for a request ID
   */
  getRequestResponse(requestId) {
    const request = this.requests.find(r => r.requestId === requestId);
    const response = this.responses[requestId];
    return { request, response };
  }
}

/**
 * Create a wrapper function for transcription functions
 */
function wrapTranscriptionFunction(originalFunction, interceptor, functionName) {
  return async function(...args) {
    const requestId = args[0] || `req-${Date.now()}`;
    const filePath = args[1] || args[0];
    
    interceptor.logRequest(requestId, filePath, functionName);

    // If in mock mode, return mock response
    if (interceptor.mockMode) {
      const mockResponse = interceptor.getMockResponse(requestId);
      if (mockResponse) {
        if (mockResponse.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
        }
        interceptor.logResponse(requestId, mockResponse.transcription);
        return mockResponse.transcription;
      }
    }

    // Call original function
    try {
      const result = await originalFunction.apply(this, args);
      interceptor.logResponse(requestId, result);
      return result;
    } catch (error) {
      interceptor.logResponse(requestId, null, error.message);
      throw error;
    }
  };
}

/**
 * Patch bot.js transcription functions
 * This should be called after bot.js is loaded
 */
function patchBotTranscription(botModule, interceptor) {
  if (!botModule) {
    console.warn('[Transcription Interceptor] bot.js module not found');
    return;
  }

  // Patch transcribeWithOpenAIAPI if it exists
  if (botModule.transcribeWithOpenAIAPI) {
    interceptor.originalFunctions.transcribeWithOpenAIAPI = botModule.transcribeWithOpenAIAPI;
    botModule.transcribeWithOpenAIAPI = wrapTranscriptionFunction(
      botModule.transcribeWithOpenAIAPI,
      interceptor,
      'transcribeWithOpenAIAPI'
    );
  }

  // Patch transcribeWithICADAPI if it exists
  if (botModule.transcribeWithICADAPI) {
    interceptor.originalFunctions.transcribeWithICADAPI = botModule.transcribeWithICADAPI;
    botModule.transcribeWithICADAPI = wrapTranscriptionFunction(
      botModule.transcribeWithICADAPI,
      interceptor,
      'transcribeWithICADAPI'
    );
  }

  // Patch transcribeAudioRemotely if it exists
  if (botModule.transcribeAudioRemotely) {
    interceptor.originalFunctions.transcribeAudioRemotely = botModule.transcribeAudioRemotely;
    botModule.transcribeAudioRemotely = wrapTranscriptionFunction(
      botModule.transcribeAudioRemotely,
      interceptor,
      'transcribeAudioRemotely'
    );
  }
}

module.exports = { TranscriptionInterceptor, wrapTranscriptionFunction, patchBotTranscription };

