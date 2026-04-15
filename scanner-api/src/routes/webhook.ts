import { FastifyPluginAsync } from 'fastify';
import { pipeline } from 'stream/promises';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const UploadSchema = z.object({
  talkgroupId: z.string(),
  timestamp: z.string().optional(),
  source: z.string().optional(),
  frequency: z.string().optional(),
  apiKey: z.string()
});

const VALID_API_KEYS = new Set<string>();

export async function loadApiKeys(prisma: any) {
  const keys = await prisma.globalKeyword.findMany();
  keys.forEach((k: any) => VALID_API_KEYS.add(k.keyword));
}

export const WebhookRouter: FastifyPluginAsync = async (fastify) => {
  const audioDir = join(process.cwd(), 'audio');
  if (!existsSync(audioDir)) {
    mkdirSync(audioDir, { recursive: true });
  }

  fastify.post('/call-upload', async (request, reply) => {
    const data = await request.body;

    if (!data || typeof data !== 'object') {
      return reply.status(400).send({ error: 'Invalid upload data' });
    }

    const fields = data as Record<string, any>;
    const apiKey = fields.apiKey;

    if (!apiKey) {
      return reply.status(401).send({ error: 'API key required' });
    }

    const audio = fields.audio;
    if (!audio) {
      return reply.status(400).send({ error: 'Audio file required' });
    }

    const talkgroupId = fields.talkgroupId || 'unknown';
    const timestamp = fields.timestamp || new Date().toISOString();

    const filename = `call_${talkgroupId}_${Date.now()}.mp3`;
    const filepath = join(audioDir, filename);

    await pipeline(audio.file, createWriteStream(filepath));

    const call = await fastify.prisma.call.create({
      data: {
        talkgroupId,
        timestamp: new Date(timestamp),
        audioUrl: `/audio/${filename}`,
        category: fields.category || 'unknown'
      },
      include: { talkgroup: true }
    });

    await fastify.redisPub.publish('calls:new', JSON.stringify(call));

    await fastify.redisPub.publish('transcription:request', JSON.stringify({
      callId: call.id,
      audioPath: filepath,
      talkgroupId
    }));

    return reply.status(201).send({
      success: true,
      callId: call.id
    });
  });

  fastify.post('/transcription-complete', async (request, reply) => {
    const { callId, transcription, address, lat, lon, error } = z.object({
      callId: z.string(),
      transcription: z.string().optional(),
      address: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      error: z.string().optional()
    }).parse(request.body);

    const call = await fastify.prisma.call.update({
      where: { id: callId },
      data: {
        transcription,
        address: address || undefined,
        lat: lat || undefined,
        lon: lon || undefined
      },
      include: { talkgroup: true }
    });

    await fastify.redisPub.publish('calls:updated', JSON.stringify(call));

    return { success: true };
  });
};