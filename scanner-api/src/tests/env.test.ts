import { describe, it, expect } from 'vitest';
import { validateEnv } from '../plugins/env.js';

describe('Environment Validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should use default values when env vars are missing', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';

    const env = validateEnv();

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.TRANSCRIPTION_MODE).toBe('local');
    expect(env.ENABLE_AUTH).toBe(false);
  });

  it('should parse valid environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    process.env.TRANSCRIPTION_MODE = 'remote';
    process.env.ENABLE_AUTH = 'true';

    const env = validateEnv();

    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
    expect(env.TRANSCRIPTION_MODE).toBe('remote');
    expect(env.ENABLE_AUTH).toBe(true);
  });

  it('should reject invalid enum values', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.TRANSCRIPTION_MODE = 'invalid_mode';

    expect(() => validateEnv()).toThrow();
  });

  it('should transform string boolean to boolean', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.ENABLE_AUTH = 'true';

    const env = validateEnv();

    expect(env.ENABLE_AUTH).toBe(true);
  });

  it('should require DATABASE_URL', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    expect(() => validateEnv()).toThrow();
  });

  it('should require REDIS_URL', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

    expect(() => validateEnv()).toThrow();
  });
});