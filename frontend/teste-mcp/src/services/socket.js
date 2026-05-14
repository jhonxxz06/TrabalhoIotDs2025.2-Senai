import { io } from 'socket.io-client';
import logger from '../utils/logger';

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
    logger.log('[Socket] conectado');
  });

  socket.on('connect_error', (err) => {
    logger.warn('[Socket] connect_error', err && err.message ? err.message : 'Erro de conexão');
  });

  socket.on('disconnect', (reason) => {
    logger.log('[Socket] desconectado', reason);
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

const socketService = { initSocket, getSocket, closeSocket };
export default socketService;
