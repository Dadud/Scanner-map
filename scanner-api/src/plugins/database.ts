import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    redisPub: Redis;
    redisSub: Redis;
  }
}

export const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });

  await prisma.$connect();
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};

export const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = new Redis(redisUrl);
  const redisPub = new Redis(redisUrl);
  const redisSub = new Redis(redisUrl);

  fastify.decorate('redis', redis);
  fastify.decorate('redisPub', redisPub);
  fastify.decorate('redisSub', redisSub);

  redis.on('error', (err) => fastify.log.error('Redis error:', err));

  fastify.addHook('onClose', async () => {
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
  });
};