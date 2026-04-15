import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

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

  fastify.get('/:id', async (request, reply) => {
    const tg = await fastify.prisma.talkgroup.findUnique({
      where: { id: request.params.id as string },
      include: { calls: { take: 50, orderBy: { timestamp: 'desc' } } }
    });
    if (!tg) return reply.status(404).send({ error: 'Not found' });
    return tg;
  });

  fastify.post('/', async (request, reply) => {
    const data = z.object({
      id: z.string(), hex: z.string().optional(), alphaTag: z.string().optional(),
      mode: z.string().optional(), description: z.string().optional(), tag: z.string().optional()
    }).parse(request.body);

    return fastify.prisma.talkgroup.upsert({
      where: { id: data.id }, update: data, create: data
    });
  });

  fastify.post('/bulk', async (request, reply) => {
    const data = z.array(z.object({
      id: z.string(), hex: z.string().optional(), alphaTag: z.string().optional(),
      mode: z.string().optional(), tag: z.string().optional()
    })).parse(request.body);

    await fastify.prisma.$transaction(data.map(tg =>
      fastify.prisma.talkgroup.upsert({ where: { id: tg.id }, update: tg, create: tg })
    ));
    return reply.status(201).send({ created: data.length });
  });
};