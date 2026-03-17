import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../services/articleValidator', () => ({
  generateValidArticlePair: vi.fn(),
}));

vi.mock('../../../services/wikipediaProxy', () => ({
  fetchArticleLinks: vi.fn(),
}));

import { generateValidArticlePair } from '../../../services/articleValidator';
import { fetchArticleLinks } from '../../../services/wikipediaProxy';
import { registerGameHandlers } from '../game';
import * as gameManager from '../../../services/gameManager';

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
  gameManager.resetState();
  vi.restoreAllMocks();
  vi.mocked(generateValidArticlePair).mockResolvedValue({
    startArticle: 'Cat',
    targetArticle: 'Dog',
  });
  vi.mocked(fetchArticleLinks).mockResolvedValue(['Dog', 'Fish', 'Bird']);
});

describe('registerGameHandlers', () => {
  it('registers the hop event handler on the socket', () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerGameHandlers(io as any, socket as any);

    const registeredEvents = socket.on.mock.calls.map((call: any[]) => call[0]);
    expect(registeredEvents).toContain('hop');
  });
});

describe('hop', () => {
  it('emits hop-rejected on invalid payload with empty strings', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerGameHandlers(io as any, socket as any);
    await socket._trigger('hop', { fromArticle: '', toArticle: '' });

    expect(socket.emit).toHaveBeenCalledWith('hop-rejected', {
      reason: 'Invalid payload',
    });
  });

  it('emits hop-rejected on completely invalid payload', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerGameHandlers(io as any, socket as any);
    await socket._trigger('hop', {});

    expect(socket.emit).toHaveBeenCalledWith('hop-rejected', {
      reason: 'Invalid payload',
    });
  });

  it('emits hop-rejected when player is not in a room', async () => {
    const socket = createMockSocket();
    const io = createMockIO();

    registerGameHandlers(io as any, socket as any);
    await socket._trigger('hop', { fromArticle: 'Cat', toArticle: 'Dog' });

    expect(socket.emit).toHaveBeenCalledWith('hop-rejected', {
      reason: 'Not in a room',
    });
  });

  it('delegates to processHop with valid payload when in a room', async () => {
    const socket = createMockSocket('player-1');
    const io = createMockIO();

    // Set up a room for the player
    const room = gameManager.createRoom('player-1', 'Alice');
    gameManager.joinRoom(room.roomCode, 'player-2', 'Bob');
    await gameManager.prepareGameStart(room.roomCode);
    const fetchedRoom = gameManager.getRoom(room.roomCode)!;
    fetchedRoom.phase = 'PLAYING';
    fetchedRoom.startedAt = Date.now();

    const processHopSpy = vi.spyOn(gameManager, 'processHop');
    processHopSpy.mockResolvedValueOnce({});

    registerGameHandlers(io as any, socket as any);
    await socket._trigger('hop', { fromArticle: 'Cat', toArticle: 'Dog' });

    expect(processHopSpy).toHaveBeenCalledWith(
      io,
      room.roomCode,
      'player-1',
      'Cat',
      'Dog'
    );
  });

  it('emits hop-rejected when processHop returns an error', async () => {
    const socket = createMockSocket('player-3');
    const io = createMockIO();

    // Set up a room for the player
    const room = gameManager.createRoom('player-3', 'Alice');
    gameManager.joinRoom(room.roomCode, 'player-4', 'Bob');
    await gameManager.prepareGameStart(room.roomCode);
    const fetchedRoom = gameManager.getRoom(room.roomCode)!;
    fetchedRoom.phase = 'PLAYING';
    fetchedRoom.startedAt = Date.now();

    const processHopSpy = vi.spyOn(gameManager, 'processHop');
    processHopSpy.mockResolvedValueOnce({ error: 'Invalid link' });

    registerGameHandlers(io as any, socket as any);
    await socket._trigger('hop', { fromArticle: 'Cat', toArticle: 'Dog' });

    expect(socket.emit).toHaveBeenCalledWith('hop-rejected', {
      reason: 'Invalid link',
    });
  });
});
