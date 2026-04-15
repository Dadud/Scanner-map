import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.string().optional().default('1000'),
  offset: z.string().optional().default('0'),
  tag: z.string().optional(),
  county: z.string().optional(),
  search: z.string().optional()
});

const CreateTalkgroupSchema = z.object({
  id: z.string(),
  hex: z.string().optional(),
  alphaTag: z.string().optional(),
  mode: z.string().optional(),
  description: z.string().optional(),
  tag: z.string().optional(),
  county: z.string().optional()
});

export const TalkgroupsRouter: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const query = QuerySchema.parse(request.query);

    const where: any = {};

    if (query.tag) {
      where.tag = { contains: query.tag, mode: 'insensitive' };
    }

    if (query.county) {
      where.county = { contains: query.county, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { alphaTag: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { id: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const talkgroups = await fastify.prisma.talkgroup.findMany({
      where,
      take: parseInt(query.limit, 10),
      skip: parseInt(query.offset, 10),
      orderBy: { alphaTag: 'asc' }
    });

    return talkgroups;
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const talkgroup = await fastify.prisma.talkgroup.findUnique({
      where: { id },
      include: { calls: { take: 100, orderBy: { timestamp: 'desc' } } }
    });

    if (!talkgroup) {
      return reply.status(404).send({ error: 'Talkgroup not found' });
    }

    return talkgroup;
  });

  fastify.post('/', async (request, reply) => {
    const data = CreateTalkgroupSchema.parse(request.body);

    const talkgroup = await fastify.prisma.talkgroup.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });

    return reply.status(201).send(talkgroup);
  });

  fastify.post('/bulk', async (request, reply) => {
    const data = z.array(CreateTalkgroupSchema).parse(request.body);

    const results = await fastify.prisma.$transaction(
      data.map(tg =>
        fastify.prisma.talkgroup.upsert({
          where: { id: tg.id },
          update: tg,
          create: tg
        })
      )
    );

    return reply.status(201).send({ created: results.length });
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.talkgroup.delete({ where: { id } });

    return reply.status(204).send();
  });
};