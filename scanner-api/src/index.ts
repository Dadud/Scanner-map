import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { redis } from './plugins/redis.js';
import { CallsRouter } from './routes/calls.js';
import { TalkgroupsRouter } from './routes/talkgroups.js';
import { UsersRouter } from './routes/users.js';
import { AdminRouter } from './routes/admin.js';
import { WebSocketHandler } from './websocket/handler.js';
import { ConfigRouter } from './routes/config.js';
import { WebhookRouter } from './routes/webhook.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    }
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  });

  await app.register(formbody);
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }
  });
  await app.register(websocket);

  await app.register(redis);

  await app.register(CallsRouter, { prefix: '/api/calls' });
  await app.register(TalkgroupsRouter, { prefix: '/api/talkgroups' });
  await app.register(UsersRouter, { prefix: '/api/users' });
  await app.register(AdminRouter, { prefix: '/api/admin' });
  await app.register(ConfigRouter, { prefix: '/api/config' });
  await app.register(WebhookRouter, { prefix: '/api/webhook' });

  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.register(async function (instance) {
    instance.get('/ws', { websocket: true }, WebSocketHandler);
  });

  return app;
}

export async function startServer() {
  const app = await buildServer();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Scanner API running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

startServer();