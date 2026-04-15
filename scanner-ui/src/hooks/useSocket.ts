import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import type { Call, Talkgroup, User } from '../types';

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;
const BACKOFF_MULTIPLIER = 1.5;

interface UseSocketOptions {
  onNewCall?: (call: Call) => void;
  onUpdatedCall?: (call: Call) => void;
  onDeletedCall?: (id: string) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  const {
    setCalls,
    addCall,
    updateCall,
    removeCall,
    setUser,
    setAuthenticated
  } = useStore();

  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, reconnectAttemptRef.current),
      MAX_RECONNECT_DELAY_MS
    );
    return delay;
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('token');

    socketRef.current = io(window.location.origin, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
      reconnectionAttempts: Infinity,
      timeout: 10000
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      reconnectAttemptRef.current = 0;
      clearReconnectTimeout();

      socket.emit('subscribe', 'calls');

      if (token) {
        socket.emit('authenticate', token);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);

      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      reconnectAttemptRef.current++;
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      reconnectAttemptRef.current = 0;
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Failed to reconnect after max attempts');
    });

    socket.on('authenticated', (data: { success: boolean }) => {
      console.log('[Socket] Authentication:', data.success ? 'success' : 'failed');
      setAuthenticated(data.success);
    });

    socket.on('newCall', (call: Call) => {
      console.log('[Socket] New call:', call.id);
      addCall(call);
      options.onNewCall?.(call);
    });

    socket.on('updatedCall', (call: Call) => {
      console.log('[Socket] Updated call:', call.id);
      updateCall(call);
      options.onUpdatedCall?.(call);
    });

    socket.on('deletedCall', (data: { id: string }) => {
      console.log('[Socket] Deleted call:', data.id);
      removeCall(data.id);
      options.onDeletedCall?.(data.id);
    });

    socket.on('purgedCalls', (data: any) => {
      console.log('[Socket] Purged calls:', data);
      fetchCalls();
    });

    socket.on('pong', (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      console.log('[Socket] Latency:', latency, 'ms');
    });

  }, [addCall, updateCall, removeCall, setAuthenticated, clearReconnectTimeout, options]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [clearReconnectTimeout]);

  const authenticate = useCallback((token: string) => {
    if (socketRef.current) {
      socketRef.current.emit('authenticate', token);
      localStorage.setItem('token', token);
    }
  }, []);

  const sendPing = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping', { timestamp: Date.now() });
    }
  }, []);

  useEffect(() => {
    connect();

    const pingInterval = setInterval(sendPing, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    authenticate,
    sendPing,
    isConnected: () => socketRef.current?.connected ?? false
  };
}

export async function fetchCalls(): Promise<Call[]> {
  const response = await fetch('/api/calls?limit=100');
  if (!response.ok) {
    throw new Error('Failed to fetch calls');
  }
  const calls = await response.json();
  useStore.getState().setCalls(calls);
  return calls;
}

export async function fetchTalkgroups(): Promise<Talkgroup[]> {
  const response = await fetch('/api/talkgroups?limit=1000');
  if (!response.ok) {
    throw new Error('Failed to fetch talkgroups');
  }
  const talkgroups = await response.json();
  useStore.getState().setTalkgroups(talkgroups);
  return talkgroups;
}

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  localStorage.setItem('token', data.token);
  useStore.getState().setUser(data.user);
  useStore.getState().setAuthenticated(true);

  return data;
}

export async function register(username: string, password: string): Promise<{ id: string; username: string }> {
  const response = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }

  return response.json();
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('token');

  if (token) {
    await fetch('/api/users/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).catch(() => {});
  }

  localStorage.removeItem('token');
  useStore.getState().setUser(null);
  useStore.getState().setAuthenticated(false);
}