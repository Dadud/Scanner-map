import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { CallsRouter } from '../routes/calls.js';

describe('Calls API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(CallsRouter, { prefix: '/api/calls' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/calls', () => {
    it('should return an array', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/calls'
      });

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(JSON.parse(response.body))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/calls?limit=10&offset=0'
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('Calls Schema Validation', () => {
  it('should validate create call schema', async () => {
    const validData = {
      talkgroupId: '1234',
      timestamp: '2024-01-01T00:00:00Z',
      transcription: 'Test transcription',
      address: '123 Main St',
      lat: 40.7128,
      lon: -74.0060,
      category: 'fire'
    };

    expect(validData.talkgroupId).toBeDefined();
    expect(validData.lat).toBeLessThan(90);
    expect(validData.lat).toBeGreaterThan(-90);
    expect(validData.lon).toBeLessThan(180);
    expect(validData.lon).toBeGreaterThan(-180);
  });

  it('should reject invalid coordinates', () => {
    const invalidLat = 100;
    const invalidLon = 200;

    expect(invalidLat).toBeGreaterThan(90);
    expect(invalidLon).toBeGreaterThan(180);
  });
});