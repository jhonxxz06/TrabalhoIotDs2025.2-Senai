import { io } from 'socket.io-client';

// Base URL (remove /api suffix if present)
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/api$/, '');

let socket = null;

export function initSocket() {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  socket = io(API_BASE, {
    transports: ['websocket'],
    autoConnect: true,
    auth: token ? { token } : undefined
  });

  socket.on('connect', () => {
    console.log('[Socket] conectado', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] connect_error', err && err.message ? err.message : err);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] desconectado', reason);
  });

  return socket;
}

export function getSocket() {
  return socket || initSocket();
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { initSocket, getSocket, closeSocket };
