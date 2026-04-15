import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import type { Call } from '../types';

let socket: Socket | null = null;

export function connectSocket(token?: string) {
  if (socket?.connected) return socket;

  socket = io(window.location.origin, {
    path: '/ws',
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    socket?.emit('subscribe', 'calls');
  });

  socket.on('authenticated', (data: { success: boolean }) => {
    useStore.getState().setAuthenticated(data.success);
  });

  socket.on('newCall', (call: Call) => {
    useStore.getState().addCall(call);
  });

  socket.on('updatedCall', (call: Call) => {
    useStore.getState().updateCall(call);
  });

  socket.on('deletedCall', (data: { id: string }) => {
    useStore.getState().removeCall(data.id);
  });

  socket.on('purgedCalls', () => {
    fetchCalls();
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function authenticateSocket(token: string) {
  socket?.emit('authenticate', token);
}

export async function fetchCalls(): Promise<Call[]> {
  const response = await fetch('/api/calls?limit=100');
  const calls = await response.json();
  useStore.getState().setCalls(calls);
  return calls;
}

export async function fetchTalkgroups() {
  const response = await fetch('/api/talkgroups?limit=1000');
  const talkgroups = await response.json();
  useStore.getState().setTalkgroups(talkgroups);
  return talkgroups;
}

export async function login(username: string, password: string) {
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
  authenticateSocket(data.token);
  return data;
}