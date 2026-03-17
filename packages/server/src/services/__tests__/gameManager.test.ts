import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../articleValidator', () => ({
  generateValidArticlePair: vi.fn(),
}));

vi.mock('../wikipediaProxy', () => ({
  fetchArticleLinks: vi.fn(),
}));

import { generateValidArticlePair } from '../articleValidator';
import { fetchArticleLinks } from '../wikipediaProxy';
import {
  createRoom,
  joinRoom,
  setPlayerReady,
  allPlayersReady,
  getRoom,
  getPlayerRoom,
  prepareGameStart,
  processHopState,
  finishGameState,
  removePlayerState,
  resetState,
} from '../gameManager';

beforeEach(() => {
  resetState();
  vi.mocked(generateValidArticlePair).mockResolvedValue({
    startArticle: 'Cat',
    targetArticle: 'Dog',
  });
  vi.mocked(fetchArticleLinks).mockResolvedValue(['Dog', 'Fish', 'Bird']);
});

describe('createRoom', () => {
  it('creates a room with the host as the first player', () => {
    const room = createRoom('host-1', 'Alice');

    expect(room.roomCode).toBeDefined();
    expect(room.roomCode).toHaveLength(4);
    expect(room.hostId).toBe('host-1');
    expect(room.phase).toBe('WAITING');
    expect(room.startArticle).toBe('');
    expect(room.targetArticle).toBe('');
    expect(room.players['host-1']).toBeDefined();
    expect(room.players['host-1'].nickname).toBe('Alice');
    expect(room.players['host-1'].ready).toBe(false);
  });

  it('stores the room in the rooms map', () => {
    const room = createRoom('host-1', 'Alice');
    const fetched = getRoom(room.roomCode);

    expect(fetched).toBe(room);
  });

  it('maps the host socket id to the room code', () => {
    const room = createRoom('host-1', 'Alice');
    expect(getPlayerRoom('host-1')).toBe(room.roomCode);
  });

  it('applies custom config merged with defaults', () => {
    const room = createRoom('host-1', 'Alice', { maxPlayers: 4 });
    expect(room.config.maxPlayers).toBe(4);
    expect(room.config.timeLimit).toBe(300); // default
  });

  it('uses default config when none is provided', () => {
    const room = createRoom('host-1', 'Alice');
    expect(room.config.maxPlayers).toBe(8);
    expect(room.config.timeLimit).toBe(300);
  });
});

describe('joinRoom', () => {
  it('adds a player to an existing room', () => {
    const room = createRoom('host-1', 'Alice');
    const result = joinRoom(room.roomCode, 'player-2', 'Bob');

    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.player.id).toBe('player-2');
      expect(result.player.nickname).toBe('Bob');
      expect(result.room.players['player-2']).toBeDefined();
    }
  });

  it('maps the new player socket id to the room code', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    expect(getPlayerRoom('player-2')).toBe(room.roomCode);
  });

  it('returns error for nonexistent room', () => {
    const result = joinRoom('ZZZZ', 'player-2', 'Bob');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Room not found');
    }
  });

  it('returns error if game is already in progress', () => {
    const room = createRoom('host-1', 'Alice');
    room.phase = 'PLAYING';

    const result = joinRoom(room.roomCode, 'player-2', 'Bob');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Game already in progress');
    }
  });

  it('returns error if room is full', () => {
    const room = createRoom('host-1', 'Alice', { maxPlayers: 2 });
    joinRoom(room.roomCode, 'player-2', 'Bob');

    const result = joinRoom(room.roomCode, 'player-3', 'Charlie');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Room is full');
    }
  });
});

describe('setPlayerReady', () => {
  it('marks a player as ready and returns true', () => {
    const room = createRoom('host-1', 'Alice');
    const result = setPlayerReady(room.roomCode, 'host-1');

    expect(result).toBe(true);
    expect(room.players['host-1'].ready).toBe(true);
  });

  it('returns false for nonexistent room', () => {
    expect(setPlayerReady('ZZZZ', 'host-1')).toBe(false);
  });

  it('returns false for nonexistent player', () => {
    const room = createRoom('host-1', 'Alice');
    expect(setPlayerReady(room.roomCode, 'no-one')).toBe(false);
  });
});

describe('allPlayersReady', () => {
  it('returns true when all players are ready', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    setPlayerReady(room.roomCode, 'host-1');
    setPlayerReady(room.roomCode, 'player-2');

    expect(allPlayersReady(room.roomCode)).toBe(true);
  });

  it('returns false when not all players are ready', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    setPlayerReady(room.roomCode, 'host-1');

    expect(allPlayersReady(room.roomCode)).toBe(false);
  });

  it('returns false for nonexistent room', () => {
    expect(allPlayersReady('ZZZZ')).toBe(false);
  });
});

describe('getRoom', () => {
  it('returns the room by code', () => {
    const room = createRoom('host-1', 'Alice');
    expect(getRoom(room.roomCode)).toBe(room);
  });

  it('returns undefined for nonexistent room', () => {
    expect(getRoom('ZZZZ')).toBeUndefined();
  });
});

describe('getPlayerRoom', () => {
  it('returns the room code for a player', () => {
    const room = createRoom('host-1', 'Alice');
    expect(getPlayerRoom('host-1')).toBe(room.roomCode);
  });

  it('returns undefined for unknown player', () => {
    expect(getPlayerRoom('unknown')).toBeUndefined();
  });
});

describe('prepareGameStart', () => {
  it('sets up the game with start and target articles', async () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    const result = await prepareGameStart(room.roomCode);

    expect(result.error).toBeUndefined();
    expect(result.startArticle).toBe('Cat');
    expect(result.targetArticle).toBe('Dog');
  });

  it('sets room phase to COUNTDOWN', async () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    await prepareGameStart(room.roomCode);

    expect(room.phase).toBe('COUNTDOWN');
  });

  it('initializes player current articles and hops', async () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    await prepareGameStart(room.roomCode);

    for (const player of Object.values(room.players)) {
      expect(player.currentArticle).toBe('Cat');
      expect(player.hops).toEqual(['Cat']);
      expect(player.hopCount).toBe(0);
      expect(player.finished).toBe(false);
    }
  });

  it('returns error for nonexistent room', async () => {
    const result = await prepareGameStart('ZZZZ');
    expect(result.error).toBe('Room not found');
  });

  it('returns error if game already started', async () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    room.phase = 'PLAYING';

    const result = await prepareGameStart(room.roomCode);
    expect(result.error).toBe('Game already started');
  });

  it('returns error if fewer than 2 players', async () => {
    const room = createRoom('host-1', 'Alice');

    const result = await prepareGameStart(room.roomCode);
    expect(result.error).toBe('Need at least 2 players');
  });
});

describe('processHopState', () => {
  let roomCode: string;

  beforeEach(async () => {
    const room = createRoom('host-1', 'Alice');
    roomCode = room.roomCode;
    joinRoom(roomCode, 'player-2', 'Bob');

    await prepareGameStart(roomCode);

    // Manually transition to PLAYING phase
    const r = getRoom(roomCode)!;
    r.phase = 'PLAYING';
    r.startedAt = 1000000;
  });

  it('processes a valid hop successfully', async () => {
    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');

    expect(result.error).toBeUndefined();
    expect(result.hopped).toBe(true);
    expect(result.hopCount).toBe(1);
  });

  it('updates player state after a hop', async () => {
    await processHopState(roomCode, 'host-1', 'Cat', 'Fish');

    const room = getRoom(roomCode)!;
    const player = room.players['host-1'];
    expect(player.currentArticle).toBe('Fish');
    expect(player.hops).toEqual(['Cat', 'Fish']);
    expect(player.hopCount).toBe(1);
  });

  it('marks player as finished when reaching target article', async () => {
    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');

    expect(result.finished).toBe(true);
    expect(result.finishTime).toBeDefined();

    const room = getRoom(roomCode)!;
    expect(room.players['host-1'].finished).toBe(true);
  });

  it('does not mark player as finished for non-target article', async () => {
    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Fish');

    expect(result.finished).toBe(false);
    expect(result.finishTime).toBeUndefined();
  });

  it('returns error for nonexistent room', async () => {
    const result = await processHopState('ZZZZ', 'host-1', 'Cat', 'Dog');
    expect(result.error).toBe('Room not found');
  });

  it('returns error if game is not in PLAYING phase', async () => {
    const room = getRoom(roomCode)!;
    room.phase = 'WAITING';

    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');
    expect(result.error).toBe('Game not in progress');
  });

  it('returns error if player is not in the room', async () => {
    const result = await processHopState(roomCode, 'unknown-player', 'Cat', 'Dog');
    expect(result.error).toBe('Player not in room');
  });

  it('returns error if player already finished', async () => {
    const room = getRoom(roomCode)!;
    room.players['host-1'].finished = true;

    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');
    expect(result.error).toBe('Already finished');
  });

  it('returns error if player is not on the from article', async () => {
    const result = await processHopState(roomCode, 'host-1', 'WrongArticle', 'Dog');
    expect(result.error).toBe('Not on that article');
  });

  it('returns error for invalid link', async () => {
    vi.mocked(fetchArticleLinks).mockResolvedValueOnce(['Fish', 'Bird']);

    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');
    expect(result.error).toBe('Invalid link');
  });

  it('returns error when startedAt is not set', async () => {
    const room = getRoom(roomCode)!;
    room.startedAt = undefined;

    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');
    expect(result.error).toBe('Game start time not set');
  });

  it('returns error when fetchArticleLinks throws', async () => {
    vi.mocked(fetchArticleLinks).mockRejectedValueOnce(new Error('Wikipedia API error'));

    const result = await processHopState(roomCode, 'host-1', 'Cat', 'Dog');
    expect(result.error).toBe('Failed to validate link — please try again');
  });

  it('increments hop count on multiple hops', async () => {
    await processHopState(roomCode, 'host-1', 'Cat', 'Fish');

    vi.mocked(fetchArticleLinks).mockResolvedValueOnce(['Bird', 'Dog']);

    const result = await processHopState(roomCode, 'host-1', 'Fish', 'Bird');
    expect(result.hopCount).toBe(2);
  });
});

describe('finishGameState', () => {
  it('sets room phase to FINISHED and returns rankings', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    joinRoom(room.roomCode, 'player-3', 'Charlie');
    room.phase = 'PLAYING';

    // Alice finished first with 3 hops
    room.players['host-1'].finished = true;
    room.players['host-1'].finishTime = 5000;
    room.players['host-1'].hopCount = 3;

    // Bob finished second with 5 hops
    room.players['player-2'].finished = true;
    room.players['player-2'].finishTime = 8000;
    room.players['player-2'].hopCount = 5;

    // Charlie did not finish but made 2 hops
    room.players['player-3'].finished = false;
    room.players['player-3'].hopCount = 2;

    const result = finishGameState(room.roomCode);

    expect(result).toBeDefined();
    expect(result!.rankings).toHaveLength(3);
    expect(room.phase).toBe('FINISHED');
  });

  it('ranks finished players before unfinished players', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    room.phase = 'PLAYING';

    room.players['host-1'].finished = false;
    room.players['host-1'].hopCount = 10;

    room.players['player-2'].finished = true;
    room.players['player-2'].finishTime = 5000;
    room.players['player-2'].hopCount = 3;

    const result = finishGameState(room.roomCode);

    expect(result!.rankings[0].id).toBe('player-2');
    expect(result!.rankings[1].id).toBe('host-1');
  });

  it('ranks finished players by finish time', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    room.phase = 'PLAYING';

    room.players['host-1'].finished = true;
    room.players['host-1'].finishTime = 10000;
    room.players['host-1'].hopCount = 5;

    room.players['player-2'].finished = true;
    room.players['player-2'].finishTime = 5000;
    room.players['player-2'].hopCount = 3;

    const result = finishGameState(room.roomCode);

    expect(result!.rankings[0].id).toBe('player-2');
    expect(result!.rankings[1].id).toBe('host-1');
  });

  it('ranks unfinished players by hop count descending', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    joinRoom(room.roomCode, 'player-3', 'Charlie');
    room.phase = 'PLAYING';

    room.players['host-1'].finished = false;
    room.players['host-1'].hopCount = 2;

    room.players['player-2'].finished = false;
    room.players['player-2'].hopCount = 5;

    room.players['player-3'].finished = false;
    room.players['player-3'].hopCount = 3;

    const result = finishGameState(room.roomCode);

    expect(result!.rankings[0].id).toBe('player-2');
    expect(result!.rankings[1].id).toBe('player-3');
    expect(result!.rankings[2].id).toBe('host-1');
  });

  it('returns undefined for nonexistent room', () => {
    expect(finishGameState('ZZZZ')).toBeUndefined();
  });

  it('returns undefined if room is already FINISHED', () => {
    const room = createRoom('host-1', 'Alice');
    room.phase = 'FINISHED';

    expect(finishGameState(room.roomCode)).toBeUndefined();
  });
});

describe('removePlayerState', () => {
  it('removes a player from a WAITING room', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    const result = removePlayerState('player-2');

    expect(result.removed).toBe(true);
    expect(result.roomCode).toBe(room.roomCode);
    expect(result.roomEmpty).toBe(false);
    expect(room.players['player-2']).toBeUndefined();
  });

  it('deletes room if last player leaves during WAITING', () => {
    const room = createRoom('host-1', 'Alice');
    const roomCode = room.roomCode;

    const result = removePlayerState('host-1');

    expect(result.removed).toBe(true);
    expect(result.roomEmpty).toBe(true);
    expect(getRoom(roomCode)).toBeUndefined();
  });

  it('marks player as disconnected during PLAYING phase', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    room.phase = 'PLAYING';

    const result = removePlayerState('player-2');

    expect(result.removed).toBe(true);
    expect(result.roomCode).toBe(room.roomCode);
    expect(room.players['player-2'].connected).toBe(false);
    // Player should still be in the room
    expect(room.players['player-2']).toBeDefined();
  });

  it('returns removed: false for unknown socket id', () => {
    const result = removePlayerState('unknown');
    expect(result.removed).toBe(false);
  });

  it('clears playerRoomMap entry for removed player in WAITING phase', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    removePlayerState('player-2');

    expect(getPlayerRoom('player-2')).toBeUndefined();
  });

  it('reassigns host when host leaves during WAITING', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    joinRoom(room.roomCode, 'player-3', 'Charlie');

    const result = removePlayerState('host-1');

    expect(result.removed).toBe(true);
    expect(result.newHostId).toBeDefined();
    expect(room.hostId).toBe(result.newHostId);
    // New host should be one of the remaining players
    expect(['player-2', 'player-3']).toContain(result.newHostId);
  });

  it('does not return newHostId when non-host leaves during WAITING', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    const result = removePlayerState('player-2');

    expect(result.removed).toBe(true);
    expect(result.newHostId).toBeUndefined();
    expect(room.hostId).toBe('host-1');
  });

  it('does not reassign host during PLAYING phase', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');
    room.phase = 'PLAYING';

    const result = removePlayerState('host-1');

    expect(result.removed).toBe(true);
    expect(result.newHostId).toBeUndefined();
    // Host is marked disconnected but not removed
    expect(room.players['host-1'].connected).toBe(false);
  });
});

describe('resetState', () => {
  it('clears all rooms and player mappings', () => {
    const room = createRoom('host-1', 'Alice');
    joinRoom(room.roomCode, 'player-2', 'Bob');

    resetState();

    expect(getRoom(room.roomCode)).toBeUndefined();
    expect(getPlayerRoom('host-1')).toBeUndefined();
    expect(getPlayerRoom('player-2')).toBeUndefined();
  });
});
