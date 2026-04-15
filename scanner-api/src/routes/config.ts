import { FastifyPluginAsync } from 'fastify';

export const ConfigRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/geocoding', () => ({
    provider: process.env.GEOCODING_PROVIDER,
    state: process.env.GEOCODING_STATE,
    country: process.env.GEOCODING_COUNTRY
  }));

  fastify.get('/transcription', () => ({
    mode: process.env.TRANSCRIPTION_MODE,
    device: process.env.TRANSCRIPTION_DEVICE,
    whisperModel: process.env.WHISPER_MODEL
  }));
};