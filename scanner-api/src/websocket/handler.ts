import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

export function WebSocketHandler(connection: WebSocket, request: IncomingMessage) {
  connection.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'authenticate') {
        connection.send(JSON.stringify({ type: 'authenticated', success: true }));
      } else if (message.type === 'subscribe') {
        connection.send(JSON.stringify({ type: 'subscribed', channel: message.channel }));
      } else if (message.type === 'ping') {
        connection.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (err) {
      connection.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  connection.on('close', () => {
    console.log('WebSocket client disconnected');
  });
}
