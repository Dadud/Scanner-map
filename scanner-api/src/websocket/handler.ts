import { FastifyPluginAsync } from 'fastify';
import type Redis from 'ioredis';
import { WebSocket } from 'ws';

type SocketMessage = {
  type: string;
  channel?: string;
  token?: string;
};

const clients = new Set<WebSocket>();
const subscriptions = new WeakMap<WebSocket, Set<string>>();

let relayInitialized = false;

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(channel: string, type: string, payload: unknown) {
  for (const socket of clients) {
    const channels = subscriptions.get(socket);
    if (channels?.has(channel)) {
      send(socket, { type, payload });
    }
  }
}

export const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    subscriptions.set(socket, new Set());

    socket.on('message', (raw) => {
      let message: SocketMessage;

      try {
        message = JSON.parse(raw.toString()) as SocketMessage;
      } catch {
        send(socket, { type: 'error', message: 'Invalid message format' });
        return;
      }

      if (message.type === 'authenticate') {
        send(socket, { type: 'authenticated', success: true });
        return;
      }

      if (message.type === 'subscribe' && message.channel) {
        subscriptions.get(socket)?.add(message.channel);
        send(socket, { type: 'subscribed', channel: message.channel });
        return;
      }

      if (message.type === 'ping') {
        send(socket, { type: 'pong', timestamp: Date.now() });
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
      subscriptions.delete(socket);
    });
  });
};

export function setupWebSocketRelay(redisSub: Redis) {
  if (relayInitialized) {
    return;
  }

  relayInitialized = true;

  void redisSub.subscribe('calls:new', 'calls:updated', 'calls:deleted', 'calls:purged');

  redisSub.on('message', (channel: string, message: string) => {
    const eventTypeByChannel: Record<string, string> = {
      'calls:new': 'newCall',
      'calls:updated': 'updatedCall',
      'calls:deleted': 'deletedCall',
      'calls:purged': 'purgedCalls'
    };

    const eventType = eventTypeByChannel[channel];
    if (!eventType) {
      return;
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(message);
    } catch {
      payload = message;
    }

    broadcast('calls', eventType, payload);
  });
}
