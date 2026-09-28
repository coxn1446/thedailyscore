import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(userId) {
  if (!socket) {
    socket = io({ withCredentials: true });
  }
  if (userId != null && userId !== '') {
    socket.emit('identify', userId);
  }
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
