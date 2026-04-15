import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.string().optional().default('100'),
  offset: z.string().optional().default('0'),
  talkgroupId: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  hasLocation: z.string().optional()
});

const CreateCallSchema = z.object({
  talkgroupId: z.string(),
  timestamp: z.string().datetime().optional(),
  audioUrl: z.string().optional(),
  transcription: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  category: z.string().optional()
});

export const CallsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const query = QuerySchema.parse(request.query);

    const where: any = {};

    if (query.talkgroupId) {
      where.talkgroupId = query.talkgroupId;
    }

    if (query.since || query.until) {
      where.timestamp = {};
      if (query.since) where.timestamp.gte = new Date(query.since);
      if (query.until) where.timestamp.lte = new Date(query.until);
    }

    if (query.hasLocation === 'true') {
      where.lat = { not: null };
      where.lon = { not: null };
    }

    const calls = await fastify.prisma.call.findMany({
      where,
      take: parseInt(query.limit, 10),
      skip: parseInt(query.offset, 10),
      orderBy: { timestamp: 'desc' },
      include: { talkgroup: true }
    });

    return calls;
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const call = await fastify.prisma.call.findUnique({
      where: { id },
      include: { talkgroup: true }
    });

    if (!call) {
      return reply.status(404).send({ error: 'Call not found' });
    }

    return call;
  });

  fastify.post('/', async (request, reply) => {
    const data = CreateCallSchema.parse(request.body);

    const call = await fastify.prisma.call.create({
      data: {
        talkgroupId: data.talkgroupId,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        audioUrl: data.audioUrl,
        transcription: data.transcription,
        address: data.address,
        lat: data.lat,
        lon: data.lon,
        category: data.category
      },
      include: { talkgroup: true }
    });

    await fastify.redisPub.publish('calls:new', JSON.stringify(call));

    return reply.status(201).send(call);
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = CreateCallSchema.partial().parse(request.body);

    const call = await fastify.prisma.call.update({
      where: { id },
      data,
      include: { talkgroup: true }
    });

    return call;
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.call.delete({ where: { id } });

    return reply.status(204).send();
  });

  fastify.get('/:id/audio', async (request, reply) => {
    const { id } = request.params as { id: string };

    const audio = await fastify.prisma.audioFile.findUnique({
      where: { callId: id }
    });

    if (!audio) {
      return reply.status(404).send({ error: 'Audio not found' });
    }

    if (audio.storageType === 'local' && audio.audioData) {
      return reply.type('audio/mpeg').send(audio.audioData);
    }

    return reply.status(404).send({ error: 'Audio storage not implemented' });
  });
};