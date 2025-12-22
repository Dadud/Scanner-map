// intercept-ai.js - Monkey-patch AI functions to intercept and mock

/**
 * AI Interceptor
 * Intercepts and logs all AI requests/responses
 */
class AIInterceptor {
  constructor() {
    this.intercepted = false;
    this.requests = [];
    this.responses = {};
    this.mockMode = false;
    this.mockResponses = {};
  }

  /**
   * Start intercepting AI calls
   */
  start() {
    if (this.intercepted) {
      return;
    }

    this.originalFunctions = {};
    this.intercepted = true;
    console.log('[AI Interceptor] Started');
  }

  /**
   * Stop intercepting
   */
  stop() {
    if (!this.intercepted) {
      return;
    }

    if (this.originalFunctions) {
      // Restore original functions if needed
    }

    this.intercepted = false;
    console.log('[AI Interceptor] Stopped');
  }

  /**
   * Log an AI request
   */
  logRequest(requestId, provider, prompt, functionName) {
    this.requests.push({
      timestamp: new Date().toISOString(),
      requestId,
      provider,
      prompt: prompt.substring(0, 200), // Truncate for logging
      functionName
    });
  }

  /**
   * Log an AI response
   */
  logResponse(requestId, response, error = null) {
    this.responses[requestId] = {
      timestamp: new Date().toISOString(),
      response,
      error
    };
  }

  /**
   * Set mock response for a request
   */
  setMockResponse(requestId, response, delay = 0) {
    this.mockResponses[requestId] = {
      response,
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
   * Enable mock mode
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
 * Create a wrapper function for AI functions
 */
function wrapAIFunction(originalFunction, interceptor, functionName, provider) {
  return async function(...args) {
    const requestId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const prompt = args[0] || args[1] || '';
    
    interceptor.logRequest(requestId, provider, prompt, functionName);

    // If in mock mode, return mock response
    if (interceptor.mockMode) {
      const mockResponse = interceptor.getMockResponse(requestId);
      if (mockResponse) {
        if (mockResponse.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
        }
        interceptor.logResponse(requestId, mockResponse.response);
        return mockResponse.response;
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
 * Patch geocoding.js AI functions
 */
function patchGeocodingAI(geocodingModule, interceptor) {
  if (!geocodingModule) {
    console.warn('[AI Interceptor] geocoding.js module not found');
    return;
  }

  // Patch extractAddressWithLLM if it exists
  if (geocodingModule.extractAddressWithLLM) {
    interceptor.originalFunctions.extractAddressWithLLM = geocodingModule.extractAddressWithLLM;
    geocodingModule.extractAddressWithLLM = wrapAIFunction(
      geocodingModule.extractAddressWithLLM,
      interceptor,
      'extractAddressWithLLM',
      'ollama' // Default, could be determined from env
    );
  }
}

/**
 * Patch webserver.js AI functions
 */
function patchWebserverAI(webserverModule, interceptor) {
  if (!webserverModule) {
    console.warn('[AI Interceptor] webserver.js module not found');
    return;
  }

  // Patch generateShortSummary if it exists
  if (webserverModule.generateShortSummary) {
    interceptor.originalFunctions.generateShortSummary = webserverModule.generateShortSummary;
    webserverModule.generateShortSummary = wrapAIFunction(
      webserverModule.generateShortSummary,
      interceptor,
      'generateShortSummary',
      'ollama' // Default, could be determined from env
    );
  }
}

/**
 * Patch bot.js AI functions
 */
function patchBotAI(botModule, interceptor) {
  if (!botModule) {
    console.warn('[AI Interceptor] bot.js module not found');
    return;
  }

  // Patch generateSummary if it exists
  if (botModule.generateSummary) {
    interceptor.originalFunctions.generateSummary = botModule.generateSummary;
    botModule.generateSummary = wrapAIFunction(
      botModule.generateSummary,
      interceptor,
      'generateSummary',
      'ollama' // Default, could be determined from env
    );
  }
}

module.exports = {
  AIInterceptor,
  wrapAIFunction,
  patchGeocodingAI,
  patchWebserverAI,
  patchBotAI
};

