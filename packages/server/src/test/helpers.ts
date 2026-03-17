import type { GameRoom, PlayerState } from '@wikihop/shared';
import { DEFAULT_CONFIG } from '@wikihop/shared';

export function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player-1',
    nickname: 'TestPlayer',
    currentArticle: '',
    hops: [],
    hopCount: 0,
    finished: false,
    connected: true,
    ready: false,
    ...overrides,
  };
}

export function createMockRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    roomCode: 'ABCD',
    hostId: 'player-1',
    phase: 'WAITING',
    startArticle: '',
    targetArticle: '',
    players: {
      'player-1': createMockPlayer({ id: 'player-1', nickname: 'Host' }),
    },
    config: { ...DEFAULT_CONFIG },
    ...overrides,
  };
}
