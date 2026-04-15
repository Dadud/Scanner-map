import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.string().optional().default('100'),
  offset: z.string().optional().default('0'),
  talkgroupId: z.string().optional(),
  since: z.string().optional(),
});

interface IdParams { id: string }

export const CallsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request) => {
    const q = QuerySchema.parse(request.query);
    const where: any = {};
    if (q.talkgroupId) where.talkgroupId = q.talkgroupId;
    if (q.since) where.timestamp = { gte: new Date(q.since) };

    return fastify.prisma.call.findMany({
      where, take: parseInt(q.limit), skip: parseInt(q.offset),
      orderBy: { timestamp: 'desc' }, include: { talkgroup: true }
    });
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const call = await fastify.prisma.call.findUnique({
      where: { id: request.params.id },
      include: { talkgroup: true }
    });
    if (!call) return reply.status(404).send({ error: 'Not found' });
    return call;
  });

  fastify.post('/', async (request, reply) => {
    const data = z.object({
      talkgroupId: z.string(), timestamp: z.string().optional(), transcription: z.string().optional(),
      audioUrl: z.string().optional(), address: z.string().optional(), lat: z.number().optional(),
      lon: z.number().optional(), category: z.string().optional()
    }).parse(request.body);

    const call = await fastify.prisma.call.create({
      data: { ...data, timestamp: data.timestamp ? new Date(data.timestamp) : new Date() },
      include: { talkgroup: true }
    });
    await fastify.redisPub.publish('calls:new', JSON.stringify(call));
    return reply.status(201).send(call);
  });

  fastify.delete<{ Params: IdParams }>('/:id', async (request, reply) => {
    await fastify.prisma.call.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
};
