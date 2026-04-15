import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getEnv } from './env.js';

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  const env = getEnv();

  if (env.ENABLE_AUTH) {
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        if (!request.user?.isAdmin) {
          return reply.status(403).send({ error: 'Forbidden - Admin required' });
        }
      } catch (err) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    });
  } else {
    fastify.decorate('authenticate', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send();
    });
    fastify.decorate('requireAdmin', async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send();
    });
  }
};

export function isAuthenticated(fastify: any): boolean {
  return getEnv().ENABLE_AUTH;
}
