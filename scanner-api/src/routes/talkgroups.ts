import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

interface IdParams { id: string }

export const TalkgroupsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request) => {
    const q = z.object({
      limit: z.string().optional().default('1000'),
      offset: z.string().optional().default('0'),
      search: z.string().optional()
    }).parse(request.query);

    const where = q.search ? {
      OR: [
        { alphaTag: { contains: q.search, mode: 'insensitive' } },
        { id: { contains: q.search } }
      ]
    } : {};

    return fastify.prisma.talkgroup.findMany({ where, take: parseInt(q.limit), skip: parseInt(q.offset) });
  });

  fastify.get<{ Params: IdParams }>('/:id', async (request, reply) => {
    const tg = await fastify.prisma.talkgroup.findUnique({
      where: { id: request.params.id },
      include: { calls: { take: 50, orderBy: { timestamp: 'desc' } } }
    });
    if (!tg) return reply.status(404).send({ error: 'Not found' });
    return tg;
  });
};
