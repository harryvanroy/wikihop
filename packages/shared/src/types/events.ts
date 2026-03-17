import { z } from 'zod';
import type { PlayerState, GamePhase } from './game';

// --- Client to Server ---

export const CreateRoomPayload = z.object({
  nickname: z.string().min(1).max(20),
  config: z.object({
    maxPlayers: z.number().min(2).max(8).optional(),
    timeLimit: z.number().min(60).max(600).optional(),
  }).optional(),
});
export type CreateRoomPayload = z.infer<typeof CreateRoomPayload>;

export const JoinRoomPayload = z.object({
  roomCode: z.string().length(4),
  nickname: z.string().min(1).max(20),
});
export type JoinRoomPayload = z.infer<typeof JoinRoomPayload>;

export const HopPayload = z.object({
  fromArticle: z.string().min(1).max(300),
  toArticle: z.string().min(1).max(300),
});
export type HopPayload = z.infer<typeof HopPayload>;

// --- Server to Client ---

export interface RoomCreatedEvent {
  roomCode: string;
  playerId: string;
  hostId: string;
  players: Record<string, PlayerState>;
}

export interface PlayerJoinedEvent {
  player: PlayerState;
}

export interface PlayerLeftEvent {
  playerId: string;
}

export interface PlayerReadiedEvent {
  playerId: string;
}

export interface GameStartingEvent {
  startArticle: string;
  targetArticle: string;
  countdown: number;
}

export interface GameStartedEvent {
  startedAt: number;
}

export interface PlayerHoppedEvent {
  playerId: string;
  toArticle: string;
  hopCount: number;
}

export interface PlayerFinishedEvent {
  playerId: string;
  finishTime: number;
  hopCount: number;
}

export interface GameFinishedEvent {
  rankings: PlayerState[];
  phase: GamePhase;
}

export interface HostChangedEvent {
  hostId: string;
}

export interface HopRejectedEvent {
  reason: string;
}

export interface TimeUpdateEvent {
  elapsed: number;
}

export interface ErrorEvent {
  message: string;
  code: string;
}

// --- Socket.IO Event Maps ---

export interface ClientToServerEvents {
  'create-room': (payload: CreateRoomPayload) => void;
  'join-room': (payload: JoinRoomPayload) => void;
  'player-ready': () => void;
  'start-game': () => void;
  'hop': (payload: HopPayload) => void;
  'leave-room': () => void;
}

export interface ServerToClientEvents {
  'room-created': (event: RoomCreatedEvent) => void;
  'player-joined': (event: PlayerJoinedEvent) => void;
  'player-left': (event: PlayerLeftEvent) => void;
  'player-readied': (event: PlayerReadiedEvent) => void;
  'game-starting': (event: GameStartingEvent) => void;
  'game-started': (event: GameStartedEvent) => void;
  'player-hopped': (event: PlayerHoppedEvent) => void;
  'player-finished': (event: PlayerFinishedEvent) => void;
  'game-finished': (event: GameFinishedEvent) => void;
  'host-changed': (event: HostChangedEvent) => void;
  'hop-rejected': (event: HopRejectedEvent) => void;
  'time-update': (event: TimeUpdateEvent) => void;
  'error': (event: ErrorEvent) => void;
}
