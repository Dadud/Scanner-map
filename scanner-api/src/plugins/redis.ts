import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    redisPub: Redis;
    redisSub: Redis;
  }
}

const redisPluginImpl: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);
  const redisPub = new Redis(redisUrl);
  const redisSub = new Redis(redisUrl);

  fastify.decorate('redis', redis);
  fastify.decorate('redisPub', redisPub);
  fastify.decorate('redisSub', redisSub);

  fastify.addHook('onClose', async () => {
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
  });
};

export const redisPlugin = fp(redisPluginImpl, { name: 'redis-plugin' });
