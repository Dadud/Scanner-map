import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';

const RECONNECT_DELAY = 2000;
const MAX_DELAY = 30000;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const attemptRef = useRef(0);
  const { setCalls, addCall, updateCall, removeCall } = useStore();

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('token');
      socketRef.current = io(window.location.origin, {
        path: '/ws',
        auth: token ? { token } : undefined,
        reconnectionDelay: RECONNECT_DELAY,
        reconnectionDelayMax: MAX_DELAY
      });

      socketRef.current.on('connect', () => {
        attemptRef.current = 0;
        socketRef.current?.emit('subscribe', 'calls');
      });

      socketRef.current.on('newCall', (call) => addCall(call));
      socketRef.current.on('updatedCall', (call) => updateCall(call));
      socketRef.current.on('deletedCall', ({ id }: { id: string }) => removeCall(id));
      socketRef.current.on('purgedCalls', () => fetchCalls());
    };

    const fetchCalls = async () => {
      const res = await fetch('/api/calls?limit=100');
      const data = await res.json();
      setCalls(data);
    };

    connect();
    fetchCalls();

    return () => { socketRef.current?.disconnect(); };
  }, []);

  return { socket: socketRef.current };
}