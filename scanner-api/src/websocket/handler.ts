import { Socket } from 'socket.io';
import { Server as WebSocketServer } from 'socket.io';
import { IncomingMessage } from 'http';

export function WebSocketHandler(socket: Socket, request: IncomingMessage) {
  socket.on('authenticate', async (token: string) => {
    socket.emit('authenticated', { success: true });
  });

  socket.on('subscribe', (channel: string) => { socket.join(channel); });

  socket.on('ping', () => { socket.emit('pong', { timestamp: Date.now() }); });
}

export function setupWebSocket(io: WebSocketServer, redisSub: any) {
  io.on('connection', (socket: Socket) => {
    socket.on('subscribe', (channel: string) => socket.join(channel));
    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));
  });

  redisSub.subscribe('calls:new', 'calls:updated', 'calls:deleted', 'calls:purged');
  redisSub.on('message', (channel: string, message: string) => {
    const data = JSON.parse(message);
    if (channel === 'calls:new') io.to('calls').emit('newCall', data);
    else if (channel === 'calls:updated') io.to('calls').emit('updatedCall', data);
    else if (channel === 'calls:deleted') io.to('calls').emit('deletedCall', data);
    else if (channel === 'calls:purged') io.to('calls').emit('purgedCalls', data);
  });

  return io;
}