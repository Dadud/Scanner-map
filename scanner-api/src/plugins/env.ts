import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().default('change-me-in-production'),
  DISCORD_TOKEN: z.string().optional(),
  GEOCODING_PROVIDER: z.enum(['google', 'locationiq']).default('locationiq'),
  LOCATIONIQ_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  TRANSCRIPTION_MODE: z.enum(['local', 'remote', 'openai', 'icad']).default('local'),
  TRANSCRIPTION_DEVICE: z.enum(['cpu', 'cuda']).default('cpu'),
  WHISPER_MODEL: z.string().default('base'),
  FASTER_WHISPER_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(['ollama', 'openai']).default('ollama'),
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  ENABLE_AUTH: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  ENABLE_TONE_DETECTION: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  TONE_DETECTION_TYPE: z.enum(['auto', 'two_tone', 'pulsed', 'long', 'both']).default('auto'),
});

export function getEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Env validation failed: ${result.error.errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
  }
  return result.data;
}