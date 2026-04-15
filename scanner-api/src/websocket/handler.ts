import { FastifyPluginAsync, FastifyInstance } from 'fastify';
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

export function setupWebSocketRelay(fastify: FastifyInstance) {
  if (relayInitialized) {
    return;
  }

  relayInitialized = true;

  const { redisSub, prisma } = fastify;

  void redisSub.subscribe('calls:new', 'calls:updated', 'calls:deleted', 'calls:purged', 'transcription:complete');

  redisSub.on('message', async (channel: string, message: string) => {
    const eventTypeByChannel: Record<string, string> = {
      'calls:new': 'newCall',
      'calls:updated': 'updatedCall',
      'calls:deleted': 'deletedCall',
      'calls:purged': 'purgedCalls'
    };

    if (channel === 'transcription:complete') {
      let payload: { callId?: string; transcription?: string; success?: boolean } | null = null;

      try {
        payload = JSON.parse(message) as { callId?: string; transcription?: string; success?: boolean };
      } catch {
        return;
      }

      if (!payload?.callId || !payload.success || !payload.transcription) {
        return;
      }

      try {
        const updatedCall = await prisma.call.update({
          where: { id: payload.callId },
          data: { transcription: payload.transcription },
          include: { talkgroup: true }
        });

        broadcast('calls', 'updatedCall', updatedCall);
      } catch {
        return;
      }

      return;
    }

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
