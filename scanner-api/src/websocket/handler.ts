import { Socket, Server as WebSocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

interface SocketData {
  userId?: string;
  isAdmin?: boolean;
}

export function WebSocketHandler(this: any, socket: Socket, request: any) {
  const data = socket.data as SocketData;

  socket.on('authenticate', async (token: string) => {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          sessions: {
            some: {
              token,
              expiresAt: { gt: new Date() }
            }
          }
        }
      });

      if (user) {
        data.userId = user.id;
        data.isAdmin = user.isAdmin;
        socket.emit('authenticated', { success: true });
      } else {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    } catch (err) {
      socket.emit('authenticated', { success: false, error: 'Auth error' });
    }
  });

  socket.on('subscribe', async (channel: string) => {
    if (channel === 'calls') {
      socket.join('calls');
    }
  });

  socket.on('unsubscribe', (channel: string) => {
    if (channel === 'calls') {
      socket.leave('calls');
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    // Cleanup if needed
  });
}

export function setupWebSocket(httpServer: HttpServer, prisma: any, redisSub: any) {
  const io = new WebSocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    const data: SocketData = {};
    socket.data = data;

    socket.on('authenticate', async (token: string) => {
      try {
        const user = await prisma.user.findFirst({
          where: {
            sessions: {
              some: { token, expiresAt: { gt: new Date() } }
            }
          }
        });

        if (user) {
          data.userId = user.id;
          data.isAdmin = user.isAdmin;
          socket.emit('authenticated', { success: true });
        } else {
          socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
      } catch (err) {
        socket.emit('authenticated', { success: false, error: 'Auth error' });
      }
    });

    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  redisSub.subscribe('calls:new', 'calls:updated', 'calls:deleted', 'calls:purged');

  redisSub.on('message', (channel: string, message: string) => {
    const data = JSON.parse(message);

    switch (channel) {
      case 'calls:new':
        io.to('calls').emit('newCall', data);
        break;
      case 'calls:updated':
        io.to('calls').emit('updatedCall', data);
        break;
      case 'calls:deleted':
        io.to('calls').emit('deletedCall', data);
        break;
      case 'calls:purged':
        io.to('calls').emit('purgedCalls', data);
        break;
    }
  });

  return io;
}