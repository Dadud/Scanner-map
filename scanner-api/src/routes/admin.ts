import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

interface IdParams { id: string }

export const AdminRouter: FastifyPluginAsync = async (fastify) => {
  fastify.put<{ Params: IdParams }>('/markers/:id/location', async (request, reply) => {
    const { lat, lon, address } = z.object({
      lat: z.number(), lon: z.number(), address: z.string().optional()
    }).parse(request.body);

    const call = await fastify.prisma.call.update({
      where: { id: request.params.id }, data: { lat, lon, address },
      include: { talkgroup: true }
    });
    await fastify.redisPub.publish('calls:updated', JSON.stringify(call));
    return call;
  });

  fastify.delete<{ Params: IdParams }>('/markers/:id', async (request, reply) => {
    await fastify.prisma.call.delete({ where: { id: request.params.id } });
    await fastify.redisPub.publish('calls:deleted', JSON.stringify({ id: request.params.id }));
    return reply.status(204).send();
  });

  fastify.post('/calls/purge', async (request, reply) => {
    const { talkgroupId, olderThan } = z.object({
      talkgroupId: z.string().optional(), olderThan: z.string()
    }).parse(request.body);

    const where: any = { timestamp: { lt: new Date(olderThan) } };
    if (talkgroupId) where.talkgroupId = talkgroupId;

    const result = await fastify.prisma.call.deleteMany({ where });
    await fastify.redisPub.publish('calls:purged', JSON.stringify({ count: result.count }));
    return { deleted: result.count };
  });

  fastify.get('/keywords', async () => fastify.prisma.globalKeyword.findMany());

  fastify.post('/keywords', async (request, reply) => {
    const { keyword, talkgroupId } = z.object({ keyword: z.string(), talkgroupId: z.string().optional() }).parse(request.body);
    return fastify.prisma.globalKeyword.upsert({ where: { keyword }, update: { talkgroupId }, create: { keyword, talkgroupId } });
  });

  fastify.delete<{ Params: IdParams }>('/keywords/:id', async (request) => {
    await fastify.prisma.globalKeyword.delete({ where: { id: request.params.id } });
  });
};
