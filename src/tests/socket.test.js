jest.mock('socket.io', () => {
  const rooms = new Map();
  const socket = {
    id: 'sock-1',
    userId: null,
    handlers: {},
    join(room) {
      const set = rooms.get(room) || new Set();
      set.add(socket.id);
      rooms.set(room, set);
    },
    on(event, handler) {
      socket.handlers[event] = handler;
    },
  };
  const io = {
    on(event, handler) {
      if (event === 'connection') io.connection = handler;
    },
    to(room) {
      return {
        emit: (event, data) => {
          io.emitted.push({ room, event, data, members: [...(rooms.get(room) || [])] });
        },
      };
    },
    sockets: { sockets: new Map([['sock-1', socket]]) },
    emitted: [],
    socket,
    rooms,
  };
  return { Server: jest.fn(() => io), __io: io };
});

jest.mock('../../server/db', () => ({
  query: jest.fn(async () => ({ rows: [{ group_id: 10, game_id: 2 }] })),
}));

const { __io } = require('socket.io');
const socketHub = require('../../server/socket');

describe('socket rooms', () => {
  test('identify joins group:{id}:game:{id} and a parlor emit reaches that socket', async () => {
    socketHub.initialize({});
    __io.connection(__io.socket);
    __io.socket.handlers.identify(8);
    await new Promise((resolve) => setTimeout(resolve, 0));
    socketHub.emitToRoom('group:10:game:2', 'parlor:message', { body: 'hello', user_id: 4 });
    expect(__io.emitted).toEqual([
      expect.objectContaining({
        room: 'group:10:game:2',
        event: 'parlor:message',
        members: ['sock-1'],
        data: { body: 'hello', user_id: 4 },
      }),
    ]);
  });
});
