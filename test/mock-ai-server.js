// mock-ai-server.js - HTTP server mocking Ollama/OpenAI AI services

const express = require('express');
const bodyParser = require('body-parser');

/**
 * Mock AI Server
 * Simulates Ollama and OpenAI API endpoints
 */
class MockAIServer {
  constructor(port = 8766) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.app.use(bodyParser.json());
    
    this.responses = {
      ollama: {
        default: 'Mock AI response',
        address: '123 Main Street, Test City, ST',
        category: 'MEDICAL EMERGENCY',
        summary: { summary: 'Test summary', highlights: [] },
        delay: 0,
        error: null,
        timeout: false
      },
      openai: {
        default: 'Mock AI response',
        address: '123 Main Street, Test City, ST',
        category: 'MEDICAL EMERGENCY',
        summary: { summary: 'Test summary', highlights: [] },
        delay: 0,
        error: null,
        timeout: false
      }
    };
    
    this.requestLog = [];
    this.setupRoutes();
  }

  setupRoutes() {
    // Ollama API endpoint
    this.app.post('/api/generate', async (req, res) => {
      await this.simulateDelay('ollama');
      
      this.logRequest('ollama', req.body);
      
      if (this.responses.ollama.timeout) {
        return res.status(504).json({ error: 'Request timeout' });
      }
      
      if (this.responses.ollama.error) {
        return res.status(500).json({ error: this.responses.ollama.error });
      }

      const prompt = req.body.prompt || '';
      let response = this.responses.ollama.default;

      // Determine response based on prompt content
      if (prompt.includes('extract') || prompt.includes('address')) {
        response = this.responses.ollama.address;
      } else if (prompt.includes('categorize') || prompt.includes('Category')) {
        response = this.responses.ollama.category;
      } else if (prompt.includes('summary') || prompt.includes('summarize')) {
        response = JSON.stringify(this.responses.ollama.summary);
      } else if (prompt.includes('No address found')) {
        response = 'No address found';
      }

      res.json({
        response: response,
        done: true
      });
    });

    // OpenAI API endpoint
    this.app.post('/v1/chat/completions', async (req, res) => {
      await this.simulateDelay('openai');
      
      this.logRequest('openai', req.body);
      
      if (this.responses.openai.timeout) {
        return res.status(504).json({ error: { message: 'Request timeout' } });
      }
      
      if (this.responses.openai.error) {
        return res.status(500).json({ error: { message: this.responses.openai.error } });
      }

      const messages = req.body.messages || [];
      const lastMessage = messages[messages.length - 1]?.content || '';
      let response = this.responses.openai.default;

      // Determine response based on message content
      if (lastMessage.includes('extract') || lastMessage.includes('address')) {
        response = this.responses.openai.address;
      } else if (lastMessage.includes('categorize') || lastMessage.includes('Category')) {
        response = this.responses.openai.category;
      } else if (lastMessage.includes('summary') || lastMessage.includes('summarize')) {
        response = JSON.stringify(this.responses.openai.summary);
      } else if (lastMessage.includes('No address found')) {
        response = 'No address found';
      }

      res.json({
        id: 'mock-chat-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model || 'gpt-4o-mini',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'mock-ai' });
    });

    // Request log endpoint
    this.app.get('/requests', (req, res) => {
      res.json(this.requestLog);
    });

    // Clear request log endpoint
    this.app.delete('/requests', (req, res) => {
      this.requestLog = [];
      res.json({ cleared: true });
    });
  }

  logRequest(provider, body) {
    this.requestLog.push({
      timestamp: new Date().toISOString(),
      provider,
      body: JSON.stringify(body)
    });
  }

  async simulateDelay(provider) {
    const delay = this.responses[provider]?.delay || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Configure mock responses for a provider
   */
  configure(provider, options = {}) {
    if (!this.responses[provider]) {
      this.responses[provider] = {};
    }
    
    if (options.default !== undefined) this.responses[provider].default = options.default;
    if (options.address !== undefined) this.responses[provider].address = options.address;
    if (options.category !== undefined) this.responses[provider].category = options.category;
    if (options.summary !== undefined) this.responses[provider].summary = options.summary;
    if (options.delay !== undefined) this.responses[provider].delay = options.delay;
    if (options.error !== undefined) this.responses[provider].error = options.error;
    if (options.timeout !== undefined) this.responses[provider].timeout = options.timeout;
  }

  /**
   * Reset to default responses
   */
  reset() {
    this.responses = {
      ollama: {
        default: 'Mock AI response',
        address: '123 Main Street, Test City, ST',
        category: 'MEDICAL EMERGENCY',
        summary: { summary: 'Test summary', highlights: [] },
        delay: 0,
        error: null,
        timeout: false
      },
      openai: {
        default: 'Mock AI response',
        address: '123 Main Street, Test City, ST',
        category: 'MEDICAL EMERGENCY',
        summary: { summary: 'Test summary', highlights: [] },
        delay: 0,
        error: null,
        timeout: false
      }
    };
    this.requestLog = [];
  }

  /**
   * Start the mock server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`[Mock AI Server] Listening on port ${this.port}`);
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
          console.log(`[Mock AI Server] Stopped`);
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

  /**
   * Get request log
   */
  getRequestLog() {
    return this.requestLog;
  }
}

module.exports = MockAIServer;

