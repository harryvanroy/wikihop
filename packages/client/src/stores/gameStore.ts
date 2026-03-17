import { create } from 'zustand';
import type { GamePhase, PlayerState } from '@wikihop/shared';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface GameStore {
  // Connection
  playerId: string | null;
  roomCode: string | null;
  hostId: string | null;
  nickname: string;
  connectionStatus: ConnectionStatus;
  error: string | null;

  // Game state
  phase: GamePhase;
  startArticle: string;
  targetArticle: string;
  currentArticle: string;
  hops: string[];
  hopCount: number;
  elapsed: number;
  players: Record<string, PlayerState>;
  rankings: PlayerState[];

  // Actions
  setConnection: (playerId: string, roomCode: string, hostId: string, players: Record<string, PlayerState>) => void;
  setNickname: (nickname: string) => void;
  setPhase: (phase: GamePhase) => void;
  setArticles: (start: string, target: string) => void;
  hop: (article: string) => void;
  setElapsed: (elapsed: number) => void;
  setPlayer: (player: PlayerState) => void;
  updatePlayer: (playerId: string, updates: Partial<PlayerState>) => void;
  removePlayer: (playerId: string) => void;
  setHostId: (hostId: string) => void;
  setRankings: (rankings: PlayerState[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error: string) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  playerId: null,
  roomCode: null,
  hostId: null,
  nickname: '',
  connectionStatus: 'connecting' as ConnectionStatus,
  error: null as string | null,
  phase: 'WAITING' as GamePhase,
  startArticle: '',
  targetArticle: '',
  currentArticle: '',
  hops: [],
  hopCount: 0,
  elapsed: 0,
  players: {},
  rankings: [],
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnection: (playerId, roomCode, hostId, players) => set({ playerId, roomCode, hostId, players }),
  setNickname: (nickname) => set({ nickname }),
  setPhase: (phase) => set({ phase }),
  setArticles: (start, target) =>
    set({ startArticle: start, targetArticle: target, currentArticle: start, hops: [start], hopCount: 0 }),
  hop: (article) =>
    set((state) => ({
      currentArticle: article,
      hops: [...state.hops, article],
      hopCount: state.hopCount + 1,
    })),
  setElapsed: (elapsed) => set({ elapsed }),
  setPlayer: (player) =>
    set((state) => ({ players: { ...state.players, [player.id]: player } })),
  updatePlayer: (playerId, updates) =>
    set((state) => {
      // Guard: don't update if player doesn't exist in state
      if (!state.players[playerId]) return state;
      return {
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], ...updates },
        },
      };
    }),
  removePlayer: (playerId) =>
    set((state) => {
      const { [playerId]: _, ...rest } = state.players;
      return { players: rest };
    }),
  setHostId: (hostId) => set({ hostId }),
  setRankings: (rankings) => set({ rankings }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));
