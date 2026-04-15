import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

type WebSocketHandler = (this: WebSocket, socket: WebSocket, request: IncomingMessage) => void;

export const WebSocketHandler: WebSocketHandler = function(socket, request) {
  socket.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'authenticate') {
        socket.send(JSON.stringify({ type: 'authenticated', success: true }));
      } else if (message.type === 'subscribe') {
        socket.send(JSON.stringify({ type: 'subscribed', channel: message.channel }));
      } else if (message.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (err) {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  socket.on('close', () => {
    console.log('WebSocket client disconnected');
  });
};
