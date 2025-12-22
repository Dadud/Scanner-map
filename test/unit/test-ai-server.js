// test-ai-server.js - Unit tests for AI server mocking

const MockAIServer = require('../mock-ai-server');
const fetch = require('node-fetch');

describe('MockAIServer', () => {
  let server;
  const port = 8766;

  beforeAll(async () => {
    server = new MockAIServer(port);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  describe('Ollama API', () => {
    test('should respond to Ollama requests', async () => {
      const response = await fetch(`http://localhost:${port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt: 'Test prompt'
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('response');
    });

    test('should return address for address extraction prompts', async () => {
      server.configure('ollama', {
        address: '123 Main Street, Test City, ST'
      });

      const response = await fetch(`http://localhost:${port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt: 'Extract address from: Unit responding to 123 Main Street'
        })
      });

      const data = await response.json();
      expect(data.response).toContain('123 Main Street');
    });

    test('should return category for categorization prompts', async () => {
      server.configure('ollama', {
        category: 'MEDICAL EMERGENCY'
      });

      const response = await fetch(`http://localhost:${port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt: 'Categorize this transmission: Medical emergency at 123 Main Street'
        })
      });

      const data = await response.json();
      expect(data.response).toBe('MEDICAL EMERGENCY');
    });
  });

  describe('OpenAI API', () => {
    test('should respond to OpenAI requests', async () => {
      const response = await fetch(`http://localhost:${port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test message' }]
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('choices');
      expect(data.choices[0]).toHaveProperty('message');
    });

    test('should return address for address extraction', async () => {
      server.configure('openai', {
        address: '123 Main Street, Test City, ST'
      });

      const response = await fetch(`http://localhost:${port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Extract address from: Unit responding to 123 Main Street' }]
        })
      });

      const data = await response.json();
      expect(data.choices[0].message.content).toContain('123 Main Street');
    });
  });

  test('should log requests', async () => {
    await fetch(`http://localhost:${port}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: 'Test'
      })
    });

    const logResponse = await fetch(`http://localhost:${port}/requests`);
    const log = await logResponse.json();
    expect(log.length).toBeGreaterThan(0);
  });
});

