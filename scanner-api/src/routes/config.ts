import { FastifyPluginAsync } from 'fastify';

export const ConfigRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/google-api-key', async (request, reply) => {
    return { key: process.env.GOOGLE_MAPS_API_KEY || '' };
  });

  fastify.get('/locationiq-api-key', async (request, reply) => {
    return { key: process.env.LOCATIONIQ_API_KEY || '' };
  });

  fastify.get('/geocoding', async (request, reply) => {
    return {
      provider: process.env.GEOCODING_PROVIDER || 'locationiq',
      state: process.env.GEOCODING_STATE || '',
      country: process.env.GEOCODING_COUNTRY || '',
      city: process.env.GEOCODING_CITY || '',
      targetCounties: process.env.GEOCODING_TARGET_COUNTIES?.split(',') || []
    };
  });

  fastify.get('/transcription', async (request, reply) => {
    return {
      mode: process.env.TRANSCRIPTION_MODE || 'local',
      device: process.env.TRANSCRIPTION_DEVICE || 'cpu',
      whisperModel: process.env.WHISPER_MODEL || 'base'
    };
  });

  fastify.get('/ai', async (request, reply) => {
    return {
      provider: process.env.AI_PROVIDER || 'ollama',
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'llama3',
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
  });
};