import { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';

export const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(process.env.REDIS_URL!);
  const redisPub = new Redis(process.env.REDIS_URL!);
  const redisSub = new Redis(process.env.REDIS_URL!);

  fastify.decorate('redis', redis);
  fastify.decorate('redisPub', redisPub);
  fastify.decorate('redisSub', redisSub);

  fastify.addHook('onClose', async () => {
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
  });
};