import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      username: string;
      isAdmin: boolean;
    };
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
    };
  }
}

export const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'scanner-map-change-me-in-production',
    sign: {
      expiresIn: '7d'
    }
  });

  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.decorate('requireAdmin', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
      if (!request.user?.isAdmin) {
        reply.status(403).send({ error: 'Forbidden - Admin required' });
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
};

export default fp(jwtPlugin);