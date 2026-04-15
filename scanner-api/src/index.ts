import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { CallsRouter } from './routes/calls.js';
import { TalkgroupsRouter } from './routes/talkgroups.js';
import { UsersRouter } from './routes/users.js';
import { AdminRouter } from './routes/admin.js';
import { WebhookRouter } from './routes/webhook.js';
import { ConfigRouter } from './routes/config.js';
import { prismaPlugin } from './plugins/database.js';
import { redisPlugin } from './plugins/redis.js';
import { jwtPlugin } from './plugins/jwt.js';
import { getEnv } from './plugins/env.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(formbody);
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(websocket);

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(jwtPlugin);

  await app.register(CallsRouter, { prefix: '/api/calls' });
  await app.register(TalkgroupsRouter, { prefix: '/api/talkgroups' });
  await app.register(UsersRouter, { prefix: '/api/users' });
  await app.register(AdminRouter, { prefix: '/api/admin' });
  await app.register(ConfigRouter, { prefix: '/api/config' });
  await app.register(WebhookRouter, { prefix: '/api/webhook' });

  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}

const env = getEnv();
const app = await buildServer();

await app.listen({ port: PORT, host: '0.0.0.0' });
app.log.info(`Scanner API running on port ${PORT}`);
