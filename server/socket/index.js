const { Server } = require('socket.io');
const { query } = require('../db');
const { getDevelopmentClientOrigins } = require('../helpers/devClientOrigins');
const parlorQueries = require('../queries/parlorQueries');

let io;
const connectedUsers = new Map();

function roomName(groupId, gameId) {
  return `group:${groupId}:game:${gameId}`;
}

function socketsFor(userId) {
  if (userId == null || userId === '') return new Set();
  return connectedUsers.get(String(userId)) || new Set();
}

function forgetSocket(socket) {
  if (!socket?.userId) return;
  const set = connectedUsers.get(socket.userId);
  if (!set) return;
  set.delete(socket.id);
  if (set.size === 0) connectedUsers.delete(socket.userId);
}

function hasActiveSocket(userId) {
  return socketsFor(userId).size > 0;
}

function emitToUser(userId, event, data) {
  if (!io || userId == null || userId === '') return;
  for (const socketId of socketsFor(userId)) io.to(socketId).emit(event, data);
}

function emitToRoom(room, event, data) {
  if (!io || !room) return;
  io.to(room).emit(event, data);
}

function joinSockets(userId) {
  return joinUnlocked(userId);
}

function leaveGroupRoom(userId, groupId) {
  if (!io || groupId == null) return;
  const prefix = `group:${groupId}:`;
  for (const socketId of socketsFor(userId)) {
    const socket = io.sockets?.sockets?.get(socketId);
    if (!socket?.rooms) continue;
    for (const room of [...socket.rooms]) {
      if (String(room).startsWith(prefix)) socket.leave(room);
    }
  }
}

function joinUnlocked(userId, socket) {
  return query(parlorQueries.listUnlockedRooms, [Number(userId)])
    .then(({ rows }) => {
      for (const row of rows) {
        const room = roomName(row.group_id, row.game_id);
        if (socket) socket.join(room);
        else {
          for (const socketId of socketsFor(userId)) {
            io.sockets?.sockets?.get(socketId)?.join(room);
          }
        }
      }
    })
    .catch(() => {});
}

function initialize(httpServer) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'qa';

  io = new Server(httpServer, {
    cors: {
      origin: isProduction
        ? [process.env.DEFAULT_CLIENT_URL, 'capacitor://localhost', 'ionic://localhost'].filter(Boolean)
        : getDevelopmentClientOrigins(),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('identify', (userId) => {
      if (userId == null || userId === '') return;
      const id = String(userId);
      if (socket.userId && socket.userId !== id) forgetSocket(socket);
      socket.userId = id;
      const set = connectedUsers.get(id) || new Set();
      set.add(socket.id);
      connectedUsers.set(id, set);
      joinUnlocked(id, socket);
    });

    socket.on('disconnect', () => {
      forgetSocket(socket);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = {
  initialize,
  getIO,
  connectedUsers,
  emitToUser,
  emitToRoom,
  hasActiveSocket,
  joinSockets,
  leaveGroupRoom,
  joinUnlocked,
  roomName,
};
