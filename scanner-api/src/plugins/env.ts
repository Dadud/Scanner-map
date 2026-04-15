import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('*'),

  DISCORD_TOKEN: z.string().optional(),
  DISCORD_ALERT_CHANNEL_ID: z.string().optional(),
  DISCORD_SUMMARY_CHANNEL_ID: z.string().optional(),

  GEOCODING_PROVIDER: z.enum(['google', 'locationiq']).default('locationiq'),
  LOCATIONIQ_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEOCODING_STATE: z.string().default(''),
  GEOCODING_COUNTRY: z.string().default(''),
  GEOCODING_CITY: z.string().default(''),
  GEOCODING_TARGET_COUNTIES: z.string().default(''),

  TRANSCRIPTION_MODE: z.enum(['local', 'remote', 'openai', 'icad']).default('local'),
  TRANSCRIPTION_DEVICE: z.enum(['cpu', 'cuda']).default('cpu'),
  WHISPER_MODEL: z.string().default('base'),
  FASTER_WHISPER_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default('whisper-1'),

  AI_PROVIDER: z.enum(['ollama', 'openai']).default('ollama'),
  OLLAMA_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  ENABLE_AUTH: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  SESSION_DURATION_DAYS: z.string().default('7').transform(Number),

  STORAGE_MODE: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  ENABLE_TONE_DETECTION: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),
  TONE_DETECTION_TYPE: z.enum(['auto', 'two_tone', 'pulsed', 'long', 'both']).default('auto'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    DISCORD_ALERT_CHANNEL_ID: process.env.DISCORD_ALERT_CHANNEL_ID,
    DISCORD_SUMMARY_CHANNEL_ID: process.env.DISCORD_SUMMARY_CHANNEL_ID,
    GEOCODING_PROVIDER: process.env.GEOCODING_PROVIDER,
    LOCATIONIQ_API_KEY: process.env.LOCATIONIQ_API_KEY,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GEOCODING_STATE: process.env.GEOCODING_STATE,
    GEOCODING_COUNTRY: process.env.GEOCODING_COUNTRY,
    GEOCODING_CITY: process.env.GEOCODING_CITY,
    GEOCODING_TARGET_COUNTIES: process.env.GEOCODING_TARGET_COUNTIES,
    TRANSCRIPTION_MODE: process.env.TRANSCRIPTION_MODE,
    TRANSCRIPTION_DEVICE: process.env.TRANSCRIPTION_DEVICE,
    WHISPER_MODEL: process.env.WHISPER_MODEL,
    FASTER_WHISPER_URL: process.env.FASTER_WHISPER_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    OLLAMA_URL: process.env.OLLAMA_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    ENABLE_AUTH: process.env.ENABLE_AUTH,
    SESSION_DURATION_DAYS: process.env.SESSION_DURATION_DAYS,
    STORAGE_MODE: process.env.STORAGE_MODE,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    ENABLE_TONE_DETECTION: process.env.ENABLE_TONE_DETECTION,
    TONE_DETECTION_TYPE: process.env.TONE_DETECTION_TYPE,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getEnv(): Env {
  try {
    return validateEnv();
  } catch (e) {
    console.error('Failed to validate environment:', e);
    process.exit(1);
  }
}