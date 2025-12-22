// test-geocoding-server.js - Unit tests for geocoding server mocking

const MockGeocodingServer = require('../mock-geocoding-server');
const fetch = require('node-fetch');

describe('MockGeocodingServer', () => {
  let server;
  const port = 8767;

  beforeAll(async () => {
    server = new MockGeocodingServer(port);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.reset();
  });

  describe('LocationIQ API', () => {
    test('should respond to LocationIQ requests', async () => {
      const response = await fetch(`http://localhost:${port}/v1/search?q=123 Main Street&key=test`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('lat');
        expect(data[0]).toHaveProperty('lon');
      }
    });

    test('should return valid address in target county', async () => {
      const response = await fetch(`http://localhost:${port}/v1/search?q=123 Main Street&key=test`);
      const data = await response.json();

      if (data.length > 0) {
        expect(data[0].address.county).toBe('Baltimore City');
      }
    });
  });

  describe('Google Maps API', () => {
    test('should respond to Google Maps requests', async () => {
      const response = await fetch(`http://localhost:${port}/maps/api/geocode/json?address=123 Main Street&key=test`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('status');
      if (data.status === 'OK' && data.results.length > 0) {
        expect(data.results[0]).toHaveProperty('formatted_address');
        expect(data.results[0]).toHaveProperty('geometry');
      }
    });
  });

  describe('Nominatim API', () => {
    test('should respond to Nominatim requests', async () => {
      const response = await fetch(`http://localhost:${port}/search?q=123 Main Street`);

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('lat');
        expect(data[0]).toHaveProperty('lon');
      }
    });
  });

  test('should handle rate limiting', async () => {
    server.configure('locationiq', { rateLimit: true });

    const response = await fetch(`http://localhost:${port}/v1/search?q=123 Main Street&key=test`);
    expect(response.status).toBe(429);
  });

  test('should handle errors', async () => {
    server.configure('locationiq', { error: 'API error' });

    const response = await fetch(`http://localhost:${port}/v1/search?q=123 Main Street&key=test`);
    expect(response.status).toBe(500);
  });
});

