export type GamePhase = 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

export interface PlayerState {
  id: string;
  nickname: string;
  currentArticle: string;
  hops: string[];
  hopCount: number;
  finished: boolean;
  finishTime?: number;
  connected: boolean;
  ready: boolean;
}

export interface GameConfig {
  maxPlayers: number;
  timeLimit: number; // seconds
}

export interface GameRoom {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  startArticle: string;
  targetArticle: string;
  players: Record<string, PlayerState>;
  config: GameConfig;
  startedAt?: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  maxPlayers: 8,
  timeLimit: 300,
};
