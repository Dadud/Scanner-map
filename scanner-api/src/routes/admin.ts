import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const PurgeSchema = z.object({
  talkgroupId: z.string().optional(),
  category: z.string().optional(),
  olderThan: z.string().datetime(),
  restore: z.boolean().optional().default(false)
});

export const AdminRouter: FastifyPluginAsync = async (fastify) => {
  fastify.put('/markers/:id/location', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { lat, lon, address } = z.object({
      lat: z.number(),
      lon: z.number(),
      address: z.string().optional()
    }).parse(request.body);

    const call = await fastify.prisma.call.update({
      where: { id },
      data: { lat, lon, address },
      include: { talkgroup: true }
    });

    await fastify.redisPub.publish('calls:updated', JSON.stringify(call));

    return call;
  });

  fastify.delete('/markers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.call.delete({ where: { id } });

    await fastify.redisPub.publish('calls:deleted', JSON.stringify({ id }));

    return reply.status(204).send();
  });

  fastify.post('/calls/purge', async (request, reply) => {
    const data = PurgeSchema.parse(request.body);

    if (data.restore) {
      const restored = await fastify.prisma.call.count();
      await fastify.redis.publish('calls:restore', JSON.stringify(data));
      return { restored };
    }

    const where: any = {
      timestamp: { lt: new Date(data.olderThan) }
    };

    if (data.talkgroupId) {
      where.talkgroupId = data.talkgroupId;
    }

    if (data.category) {
      where.category = data.category;
    }

    const deleted = await fastify.prisma.call.deleteMany({ where });

    await fastify.redisPub.publish('calls:purged', JSON.stringify({
      count: deleted.count,
      ...data
    }));

    return { deleted: deleted.count };
  });

  fastify.get('/users', async (request, reply) => {
    const users = await fastify.prisma.user.findMany({
      select: { id: true, username: true, isAdmin: true, createdAt: true }
    });

    return users;
  });

  fastify.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.user.delete({ where: { id } });

    return reply.status(204).send();
  });

  fastify.get('/sessions', async (request, reply) => {
    const sessions = await fastify.prisma.session.findMany({
      include: { user: { select: { username: true } } }
    });

    return sessions;
  });

  fastify.delete('/sessions/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    await fastify.prisma.session.delete({ where: { token } });

    return reply.status(204).send();
  });

  fastify.post('/keywords', async (request, reply) => {
    const { keyword, talkgroupId } = z.object({
      keyword: z.string(),
      talkgroupId: z.string().optional()
    }).parse(request.body);

    const result = await fastify.prisma.globalKeyword.upsert({
      where: { keyword },
      update: { talkgroupId },
      create: { keyword, talkgroupId }
    });

    return result;
  });

  fastify.get('/keywords', async (request, reply) => {
    const keywords = await fastify.prisma.globalKeyword.findMany();
    return keywords;
  });

  fastify.delete('/keywords/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.globalKeyword.delete({ where: { id } });

    return reply.status(204).send();
  });
};