import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { getEnv } from './plugins/env.js';
import { redisPlugin } from './plugins/redis.js';
import { CallsRouter } from './routes/calls.js';
import { TalkgroupsRouter } from './routes/talkgroups.js';
import { UsersRouter } from './routes/users.js';
import { AdminRouter } from './routes/admin.js';
import { WebSocketHandler } from './websocket/handler.js';
import { ConfigRouter } from './routes/config.js';
import { WebhookRouter } from './routes/webhook.js';
import jwtPlugin from './plugins/jwt.js';

export async function buildServer() {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: { colorize: true }
      } : undefined
    }
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  await app.register(formbody);
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }
  });
  await app.register(websocket);

  await app.register(redisPlugin);
  await app.register(jwtPlugin);

  await app.register(CallsRouter, { prefix: '/api/calls' });
  await app.register(TalkgroupsRouter, { prefix: '/api/talkgroups' });
  await app.register(UsersRouter, { prefix: '/api/users' });
  await app.register(AdminRouter, { prefix: '/api/admin' });
  await app.register(ConfigRouter, { prefix: '/api/config' });
  await app.register(WebhookRouter, { prefix: '/api/webhook' });

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }));

  app.get('/api/health/ready', async (request, reply) => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected' };
    } catch {
      reply.status(503);
      return { status: 'not ready', database: 'disconnected' };
    }
  });

  app.register(async function (instance) {
    instance.get('/ws', { websocket: true }, WebSocketHandler);
  });

  return app;
}

export async function startServer() {
  const env = getEnv();
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Scanner API running on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();