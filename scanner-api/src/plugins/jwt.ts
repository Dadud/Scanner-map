import { FastifyPluginAsync } from 'fastify';
import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';

const jwtPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, { secret: process.env.JWT_SECRET! });

  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try { await request.jwtVerify(); }
    catch { reply.status(401).send({ error: 'Unauthorized' }); }
  });

  fastify.decorate('requireAdmin', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if (!request.user?.isAdmin) reply.status(403).send({ error: 'Forbidden' });
    }
    catch { reply.status(401).send({ error: 'Unauthorized' }); }
  });
};

export const jwtPlugin = fp(jwtPluginImpl, { name: 'jwt-plugin' });
