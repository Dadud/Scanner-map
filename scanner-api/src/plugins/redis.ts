import { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    redisPub: Redis;
    redisSub: Redis;
  }
}

export const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = new Redis(redisUrl);
  const redisPub = new Redis(redisUrl);
  const redisSub = new Redis(redisUrl);

  fastify.decorate('redis', redis);
  fastify.decorate('redisPub', redisPub);
  fastify.decorate('redisSub', redisSub);

  redis.on('error', (err) => fastify.log.error('Redis error:', err));
  redisPub.on('error', (err) => fastify.log.error('Redis Pub error:', err));
  redisSub.on('error', (err) => fastify.log.error('Redis Sub error:', err));

  fastify.addHook('onClose', async () => {
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
  });
};