import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  GameRoom,
  PlayerState,
  GameConfig,
} from '@wikihop/shared';
import { DEFAULT_CONFIG, COUNTDOWN_SECONDS, ROOM_CODE_LENGTH, ROOM_EXPIRE_FINISHED_MS } from '@wikihop/shared';
import { generateValidArticlePair } from './articleValidator';
import { fetchArticleLinks } from './wikipediaProxy';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

// In-memory store for game rooms
const rooms = new Map<string, GameRoom>();
const playerRoomMap = new Map<string, string>(); // socketId -> roomCode
const roomTimers = new Map<string, NodeJS.Timeout>();
// Store interval timers separately so they can be explicitly cleaned up
const roomIntervals = new Map<string, NodeJS.Timeout>();
const roomCleanupTimers = new Map<string, NodeJS.Timeout>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function createPlayer(id: string, nickname: string): PlayerState {
  return {
    id,
    nickname,
    currentArticle: '',
    hops: [],
    hopCount: 0,
    finished: false,
    connected: true,
    ready: false,
  };
}

export function getRoom(roomCode: string): GameRoom | undefined {
  return rooms.get(roomCode);
}

export function getPlayerRoom(socketId: string): string | undefined {
  return playerRoomMap.get(socketId);
}

export function createRoom(
  hostId: string,
  nickname: string,
  config?: Partial<GameConfig>
): GameRoom {
  const roomCode = generateRoomCode();
  const room: GameRoom = {
    roomCode,
    hostId,
    phase: 'WAITING',
    startArticle: '',
    targetArticle: '',
    players: {
      [hostId]: createPlayer(hostId, nickname),
    },
    config: { ...DEFAULT_CONFIG, ...config },
  };

  rooms.set(roomCode, room);
  playerRoomMap.set(hostId, roomCode);
  return room;
}

export function joinRoom(
  roomCode: string,
  playerId: string,
  nickname: string
): { room: GameRoom; player: PlayerState } | { error: string } {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'WAITING') return { error: 'Game already in progress' };
  if (Object.keys(room.players).length >= room.config.maxPlayers) return { error: 'Room is full' };

  const player = createPlayer(playerId, nickname);
  room.players[playerId] = player;
  playerRoomMap.set(playerId, roomCode);

  return { room, player };
}

export function setPlayerReady(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room || !room.players[playerId]) return false;
  room.players[playerId].ready = true;
  return true;
}

export function allPlayersReady(roomCode: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  return Object.values(room.players).every((p) => p.ready);
}

// --- Pure state functions (testable without Socket.IO) ---

export async function prepareGameStart(
  roomCode: string
): Promise<{
  error?: string;
  startArticle?: string;
  targetArticle?: string;
}> {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'WAITING') return { error: 'Game already started' };
  if (Object.keys(room.players).length < 2) return { error: 'Need at least 2 players' };

  const { startArticle, targetArticle } = await generateValidArticlePair();
  room.startArticle = startArticle;
  room.targetArticle = targetArticle;
  room.phase = 'COUNTDOWN';

  for (const player of Object.values(room.players)) {
    player.currentArticle = startArticle;
    player.hops = [startArticle];
    player.hopCount = 0;
    player.finished = false;
    player.finishTime = undefined;
  }

  return { startArticle, targetArticle };
}

export async function processHopState(
  roomCode: string,
  playerId: string,
  fromArticle: string,
  toArticle: string
): Promise<{
  error?: string;
  hopped?: boolean;
  finished?: boolean;
  hopCount?: number;
  finishTime?: number;
}> {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'PLAYING') return { error: 'Game not in progress' };
  if (!room.startedAt) return { error: 'Game start time not set' };

  const player = room.players[playerId];
  if (!player) return { error: 'Player not in room' };
  if (player.finished) return { error: 'Already finished' };
  if (player.currentArticle !== fromArticle) return { error: 'Not on that article' };

  let links: string[];
  try {
    links = await fetchArticleLinks(fromArticle);
  } catch {
    return { error: 'Failed to validate link — please try again' };
  }

  if (!links.includes(toArticle)) {
    return { error: 'Invalid link' };
  }

  player.currentArticle = toArticle;
  player.hops.push(toArticle);
  player.hopCount++;

  const result: {
    hopped: boolean;
    finished: boolean;
    hopCount: number;
    finishTime?: number;
  } = {
    hopped: true,
    finished: false,
    hopCount: player.hopCount,
  };

  if (toArticle === room.targetArticle) {
    player.finished = true;
    player.finishTime = Date.now() - room.startedAt;
    result.finished = true;
    result.finishTime = player.finishTime;
  }

  return result;
}

export function finishGameState(roomCode: string): { rankings: PlayerState[] } | undefined {
  const room = rooms.get(roomCode);
  if (!room || room.phase === 'FINISHED') return undefined;

  room.phase = 'FINISHED';

  // Clear the time limit timer
  const timer = roomTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomCode);
  }

  // Clear the time update interval
  const interval = roomIntervals.get(roomCode);
  if (interval) {
    clearInterval(interval);
    roomIntervals.delete(roomCode);
  }

  const rankings = Object.values(room.players).sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    return b.hopCount - a.hopCount;
  });

  return { rankings };
}

export function removePlayerState(socketId: string): {
  removed: boolean;
  roomCode?: string;
  roomEmpty?: boolean;
  newHostId?: string;
} {
  const roomCode = playerRoomMap.get(socketId);
  if (!roomCode) return { removed: false };

  const room = rooms.get(roomCode);
  if (!room) return { removed: false };

  if (room.phase === 'WAITING') {
    delete room.players[socketId];
    playerRoomMap.delete(socketId);
    const remainingPlayers = Object.keys(room.players);
    const roomEmpty = remainingPlayers.length === 0;

    if (roomEmpty) {
      rooms.delete(roomCode);
      return { removed: true, roomCode, roomEmpty };
    }

    // Reassign host if the departing player was the host
    let newHostId: string | undefined;
    if (room.hostId === socketId) {
      room.hostId = remainingPlayers[0];
      newHostId = room.hostId;
    }

    return { removed: true, roomCode, roomEmpty, newHostId };
  } else {
    const player = room.players[socketId];
    if (player) {
      player.connected = false;
      return { removed: true, roomCode };
    }
    return { removed: false };
  }
}

// --- Socket.IO-coupled functions (delegate to pure state functions) ---

export async function startGame(
  io: IOServer,
  roomCode: string
): Promise<{ error?: string }> {
  // Early phase check to prevent race condition with concurrent start-game calls
  const existingRoom = rooms.get(roomCode);
  if (existingRoom && existingRoom.phase !== 'WAITING') return { error: 'Game already starting' };

  const result = await prepareGameStart(roomCode);
  if (result.error) return { error: result.error };

  const { startArticle, targetArticle } = result;
  const room = rooms.get(roomCode)!;

  io.to(roomCode).emit('game-starting', {
    startArticle: startArticle!,
    targetArticle: targetArticle!,
    countdown: COUNTDOWN_SECONDS,
  });

  setTimeout(() => {
    room.phase = 'PLAYING';
    room.startedAt = Date.now();
    io.to(roomCode).emit('game-started', { startedAt: room.startedAt });

    // Start time limit timer
    const timer = setTimeout(() => {
      finishGame(io, roomCode);
    }, room.config.timeLimit * 1000);
    roomTimers.set(roomCode, timer);

    // Periodic time updates — stored for explicit cleanup
    const timeInterval = setInterval(() => {
      if (room.phase !== 'PLAYING') {
        clearInterval(timeInterval);
        roomIntervals.delete(roomCode);
        return;
      }
      const elapsed = Math.floor((Date.now() - room.startedAt!) / 1000);
      io.to(roomCode).emit('time-update', { elapsed });
    }, 1000);
    roomIntervals.set(roomCode, timeInterval);
  }, COUNTDOWN_SECONDS * 1000);

  return {};
}

export async function processHop(
  io: IOServer,
  roomCode: string,
  playerId: string,
  fromArticle: string,
  toArticle: string
): Promise<{ error?: string }> {
  const result = await processHopState(roomCode, playerId, fromArticle, toArticle);
  if (result.error) return { error: result.error };

  io.to(roomCode).emit('player-hopped', {
    playerId,
    toArticle,
    hopCount: result.hopCount!,
  });

  if (result.finished) {
    io.to(roomCode).emit('player-finished', {
      playerId,
      finishTime: result.finishTime!,
      hopCount: result.hopCount!,
    });

    finishGame(io, roomCode);
  }

  return {};
}

function finishGame(io: IOServer, roomCode: string) {
  const result = finishGameState(roomCode);
  if (!result) return;

  io.to(roomCode).emit('game-finished', {
    rankings: result.rankings,
    phase: 'FINISHED',
  });

  // Clean up room after expiry period
  const cleanupTimer = setTimeout(() => {
    rooms.delete(roomCode);
    roomCleanupTimers.delete(roomCode);
    for (const [socketId, code] of playerRoomMap.entries()) {
      if (code === roomCode) playerRoomMap.delete(socketId);
    }
  }, ROOM_EXPIRE_FINISHED_MS);
  roomCleanupTimers.set(roomCode, cleanupTimer);
}

export function removePlayer(io: IOServer, socketId: string) {
  const result = removePlayerState(socketId);
  if (result.removed && result.roomCode) {
    io.to(result.roomCode).emit('player-left', { playerId: socketId });

    // Notify room of new host if reassigned
    if (result.newHostId) {
      io.to(result.roomCode).emit('host-changed', { hostId: result.newHostId });
    }
  }
}

/** Reset all in-memory state. Used for testing. */
export function resetState() {
  for (const timer of roomTimers.values()) {
    clearTimeout(timer);
  }
  for (const interval of roomIntervals.values()) {
    clearInterval(interval);
  }
  for (const timer of roomCleanupTimers.values()) {
    clearTimeout(timer);
  }
  rooms.clear();
  playerRoomMap.clear();
  roomTimers.clear();
  roomIntervals.clear();
  roomCleanupTimers.clear();
}
