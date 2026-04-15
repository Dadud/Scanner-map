import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const RECONNECT_DELAY = 2000;
const MAX_DELAY = 30000;

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const { setCalls, addCall, updateCall, removeCall } = useStore();

  useEffect(() => {
    let isActive = true;

    const fetchCalls = async () => {
      const res = await fetch('/api/calls?limit=100');
      const data = await res.json();
      setCalls(data);
    };

    const scheduleReconnect = () => {
      if (!isActive) {
        return;
      }

      const delay = Math.min(RECONNECT_DELAY * 2 ** attemptRef.current, MAX_DELAY);
      reconnectTimerRef.current = window.setTimeout(() => {
        attemptRef.current += 1;
        connect();
      }, delay);
    };

    const connect = () => {
      const token = localStorage.getItem('token');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socketRef.current = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socketRef.current.addEventListener('open', () => {
        attemptRef.current = 0;
        if (token) {
          socketRef.current?.send(JSON.stringify({ type: 'authenticate', token }));
        }
        socketRef.current?.send(JSON.stringify({ type: 'subscribe', channel: 'calls' }));
      });

      socketRef.current.addEventListener('message', (event) => {
        let message: { type: string; payload?: any };

        try {
          message = JSON.parse(event.data) as { type: string; payload?: any };
        } catch {
          return;
        }

        if (message.type === 'newCall' && message.payload) {
          addCall(message.payload);
        } else if (message.type === 'updatedCall' && message.payload) {
          updateCall(message.payload);
        } else if (message.type === 'deletedCall' && message.payload?.id) {
          removeCall(message.payload.id);
        } else if (message.type === 'purgedCalls') {
          void fetchCalls();
        }
      });

      socketRef.current.addEventListener('close', () => {
        socketRef.current = null;
        scheduleReconnect();
      });

      socketRef.current.addEventListener('error', () => {
        socketRef.current?.close();
      });
    };

    connect();
    void fetchCalls();

    return () => {
      isActive = false;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, []);

  return { socket: socketRef.current };
}
