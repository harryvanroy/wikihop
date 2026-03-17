import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../services/articleValidator', () => ({
  generateValidArticlePair: vi.fn(),
}));

vi.mock('../../../services/wikipediaProxy', () => ({
  fetchArticleLinks: vi.fn(),
}));

import { generateValidArticlePair } from '../../../services/articleValidator';
import { fetchArticleLinks } from '../../../services/wikipediaProxy';
import { registerLobbyHandlers } from '../lobby';
import { resetState, getRoom, getPlayerRoom, createRoom, joinRoom } from '../../../services/gameManager';

function createMockSocket(id = 'socket-1') {
  const handlers = new Map<string, Function>();
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    _trigger: async (event: string, ...args: any[]) => {
      const handler = handlers.get(event);
      if (handler) return handler(...args);
    },
    _getHandler: (event: string) => handlers.get(event),
  };
}

function createMockIO() {
  const emitFn = vi.fn();
  return {
    to: vi.fn().mockReturnValue({ emit: emitFn }),
    _roomEmit: emitFn,
  };
}

beforeEach(() => {
  resetState();
  vi.mocked(generateValidArticlePair).mockResolvedValue({
    startArticle: 'Cat',
    targetArticle: 'Dog',
  });
  vi.mocked(fetchArticleLinks).mockResolvedValue(['Dog', 'Fish', 'Bird']);
});

describe('registerLobbyHandlers', () => {
  it('registers all expected event handlers on the socket', () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerLobbyHandlers(io as any, socket as any);

    const registeredEvents = socket.on.mock.calls.map((call: any[]) => call[0]);
    expect(registeredEvents).toContain('create-room');
    expect(registeredEvents).toContain('join-room');
    expect(registeredEvents).toContain('player-ready');
    expect(registeredEvents).toContain('start-game');
    expect(registeredEvents).toContain('leave-room');
    expect(registeredEvents).toContain('disconnect');
  });
});

describe('create-room', () => {
  it('emits room-created with valid payload', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerLobbyHandlers(io as any, socket as any);
    await socket._trigger('create-room', { nickname: 'Alice' });

    expect(socket.emit).toHaveBeenCalledWith(
      'room-created',
      expect.objectContaining({
        playerId: 'socket-1',
        hostId: 'socket-1',
        players: expect.any(Object),
        roomCode: expect.any(String),
      })
    );
  });

  it('joins the socket to the room', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerLobbyHandlers(io as any, socket as any);
    await socket._trigger('create-room', { nickname: 'Alice' });

    expect(socket.join).toHaveBeenCalledWith(expect.any(String));
  });

  it('emits error with invalid payload', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerLobbyHandlers(io as any, socket as any);
    await socket._trigger('create-room', { nickname: '' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid payload',
      code: 'INVALID_PAYLOAD',
    });
  });

  it('emits error when nickname is missing', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerLobbyHandlers(io as any, socket as any);
    await socket._trigger('create-room', {});

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid payload',
      code: 'INVALID_PAYLOAD',
    });
  });

  it('creates the room in the game manager', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerLobbyHandlers(io as any, socket as any);
    await socket._trigger('create-room', { nickname: 'Alice' });

    const roomCode = socket.emit.mock.calls[0][1].roomCode;
    const room = getRoom(roomCode);
    expect(room).toBeDefined();
    expect(room!.hostId).toBe('socket-1');
  });
});

describe('join-room', () => {
  let hostSocket: ReturnType<typeof createMockSocket>;
  let roomCode: string;

  beforeEach(async () => {
    hostSocket = createMockSocket('host-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, hostSocket as any);
    await hostSocket._trigger('create-room', { nickname: 'Host' });
    roomCode = hostSocket.emit.mock.calls[0][1].roomCode;
  });

  it('emits room-created to the joining player', async () => {
    const joinerSocket = createMockSocket('joiner-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, joinerSocket as any);

    await joinerSocket._trigger('join-room', { roomCode, nickname: 'Bob' });

    expect(joinerSocket.emit).toHaveBeenCalledWith(
      'room-created',
      expect.objectContaining({
        roomCode: roomCode.toUpperCase(),
        playerId: 'joiner-1',
        hostId: 'host-1',
        players: expect.any(Object),
      })
    );
  });

  it('emits player-joined to the room', async () => {
    const joinerSocket = createMockSocket('joiner-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, joinerSocket as any);

    await joinerSocket._trigger('join-room', { roomCode, nickname: 'Bob' });

    expect(joinerSocket.to).toHaveBeenCalledWith(roomCode.toUpperCase());
    const toEmit = joinerSocket.to.mock.results[0].value.emit;
    expect(toEmit).toHaveBeenCalledWith(
      'player-joined',
      expect.objectContaining({
        player: expect.objectContaining({
          id: 'joiner-1',
          nickname: 'Bob',
        }),
      })
    );
  });

  it('joins the socket to the room channel', async () => {
    const joinerSocket = createMockSocket('joiner-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, joinerSocket as any);

    await joinerSocket._trigger('join-room', { roomCode, nickname: 'Bob' });

    expect(joinerSocket.join).toHaveBeenCalledWith(roomCode.toUpperCase());
  });

  it('emits error for nonexistent room', async () => {
    const joinerSocket = createMockSocket('joiner-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, joinerSocket as any);

    await joinerSocket._trigger('join-room', { roomCode: 'ZZZZ', nickname: 'Bob' });

    expect(joinerSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Room not found',
      code: 'JOIN_FAILED',
    });
  });

  it('uppercases the room code', async () => {
    const joinerSocket = createMockSocket('joiner-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, joinerSocket as any);

    await joinerSocket._trigger('join-room', { roomCode: roomCode.toLowerCase(), nickname: 'Bob' });

    // Should still succeed because code is uppercased
    expect(joinerSocket.emit).toHaveBeenCalledWith(
      'room-created',
      expect.objectContaining({
        roomCode: roomCode.toUpperCase(),
      })
    );
  });

  it('emits error with invalid payload', async () => {
    const joinerSocket = createMockSocket('joiner-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, joinerSocket as any);

    await joinerSocket._trigger('join-room', { roomCode: 'AB', nickname: 'Bob' });

    expect(joinerSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Invalid payload',
      code: 'INVALID_PAYLOAD',
    });
  });
});

describe('player-ready', () => {
  it('broadcasts player-readied to the room', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, socket as any);

    await socket._trigger('create-room', { nickname: 'Alice' });
    const roomCode = socket.emit.mock.calls[0][1].roomCode;

    await socket._trigger('player-ready');

    expect(io.to).toHaveBeenCalledWith(roomCode);
    expect(io._roomEmit).toHaveBeenCalledWith('player-readied', {
      playerId: 'socket-1',
    });
  });

  it('does nothing if player is not in a room', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, socket as any);

    // No room created, just trigger player-ready
    await socket._trigger('player-ready');

    expect(io.to).not.toHaveBeenCalled();
  });
});

describe('start-game', () => {
  it('emits error if not the host', async () => {
    const hostSocket = createMockSocket('host-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, hostSocket as any);
    await hostSocket._trigger('create-room', { nickname: 'Host' });
    const roomCode = hostSocket.emit.mock.calls[0][1].roomCode;

    // Join a second player
    const joinerSocket = createMockSocket('joiner-1');
    registerLobbyHandlers(io as any, joinerSocket as any);
    await joinerSocket._trigger('join-room', { roomCode, nickname: 'Bob' });

    // Non-host tries to start the game
    await joinerSocket._trigger('start-game');

    expect(joinerSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Only the host can start the game',
      code: 'NOT_HOST',
    });
  });

  it('calls startGame when triggered by the host', async () => {
    const hostSocket = createMockSocket('host-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, hostSocket as any);
    await hostSocket._trigger('create-room', { nickname: 'Host' });
    const roomCode = hostSocket.emit.mock.calls[0][1].roomCode;

    // Join a second player so we have >= 2
    const joinerSocket = createMockSocket('joiner-1');
    registerLobbyHandlers(io as any, joinerSocket as any);
    await joinerSocket._trigger('join-room', { roomCode, nickname: 'Bob' });

    // Host starts the game
    await hostSocket._trigger('start-game');

    // Should emit game-starting to the room
    expect(io._roomEmit).toHaveBeenCalledWith(
      'game-starting',
      expect.objectContaining({
        startArticle: expect.any(String),
        targetArticle: expect.any(String),
        countdown: expect.any(Number),
      })
    );
  });

  it('does nothing if player is not in a room', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, socket as any);

    await socket._trigger('start-game');

    // No error emitted, just silently returns
    expect(socket.emit).not.toHaveBeenCalledWith('error', expect.anything());
  });
});

describe('leave-room', () => {
  it('removes the player and leaves the socket room', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, socket as any);

    await socket._trigger('create-room', { nickname: 'Alice' });
    const roomCode = socket.emit.mock.calls[0][1].roomCode;

    await socket._trigger('leave-room');

    expect(socket.leave).toHaveBeenCalledWith(roomCode);
    expect(getPlayerRoom('socket-1')).toBeUndefined();
  });

  it('does nothing if player is not in a room', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, socket as any);

    await socket._trigger('leave-room');

    expect(socket.leave).not.toHaveBeenCalled();
  });
});

describe('disconnect', () => {
  it('removes the player from the game on disconnect', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIO();
    registerLobbyHandlers(io as any, socket as any);

    await socket._trigger('create-room', { nickname: 'Alice' });

    await socket._trigger('disconnect');

    expect(getPlayerRoom('socket-1')).toBeUndefined();
  });
});
