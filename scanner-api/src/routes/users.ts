import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const UsersRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const { username, password, isAdmin } = z.object({
      username: z.string().min(3), password: z.string().min(8), isAdmin: z.boolean().optional()
    }).parse(request.body);

    if (await fastify.prisma.user.findUnique({ where: { username } })) {
      return reply.status(409).send({ error: 'Username exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const user = await fastify.prisma.user.create({
      data: { username, passwordHash: await bcrypt.hash(password, salt), salt, isAdmin: isAdmin || false }
    });

    return reply.status(201).send({ id: user.id, username: user.username, isAdmin: user.isAdmin });
  });

  fastify.post('/login', async (request, reply) => {
    const { username, password } = z.object({ username: z.string(), password: z.string() }).parse(request.body);

    const user = await fastify.prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await fastify.prisma.session.create({
      data: { userId: user.id, token, expiresAt, ipAddress: request.ip, userAgent: request.headers['user-agent'] }
    });

    return { token, user: { id: user.id, username: user.username, isAdmin: user.isAdmin } };
  });

  fastify.post('/logout', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) await fastify.prisma.session.deleteMany({ where: { token } });
    return { success: true };
  });
};