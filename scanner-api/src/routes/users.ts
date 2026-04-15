import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  isAdmin: z.boolean().optional().default(false)
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string()
});

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 7;

export const UsersRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', async (request, reply) => {
    const data = CreateUserSchema.parse(request.body);

    const existing = await fastify.prisma.user.findUnique({
      where: { username: data.username }
    });

    if (existing) {
      return reply.status(409).send({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await fastify.prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        salt,
        isAdmin: data.isAdmin
      }
    });

    return reply.status(201).send({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin
    });
  });

  fastify.post('/login', async (request, reply) => {
    const data = LoginSchema.parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { username: data.username }
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);

    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await fastify.prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      }
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    };
  });

  fastify.post('/logout', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await fastify.prisma.session.deleteMany({ where: { token } });
    }

    return { success: true };
  });

  fastify.get('/sessions/current', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const session = await fastify.prisma.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, username: true, isAdmin: true } } }
    });

    if (!session || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Invalid or expired session' });
    }

    await fastify.prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    return session.user;
  });
};