import { useGameStore } from '../gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const state = useGameStore.getState();
      expect(state.playerId).toBeNull();
      expect(state.roomCode).toBeNull();
      expect(state.hostId).toBeNull();
      expect(state.nickname).toBe('');
      expect(state.phase).toBe('WAITING');
      expect(state.startArticle).toBe('');
      expect(state.targetArticle).toBe('');
      expect(state.currentArticle).toBe('');
      expect(state.hops).toEqual([]);
      expect(state.hopCount).toBe(0);
      expect(state.elapsed).toBe(0);
      expect(state.players).toEqual({});
      expect(state.rankings).toEqual([]);
    });
  });

  describe('setConnection', () => {
    it('sets connection state', () => {
      const players = {
        p1: {
          id: 'p1',
          nickname: 'Alice',
          currentArticle: '',
          hops: [],
          hopCount: 0,
          finished: false,
          connected: true,
          ready: false,
        },
      };
      useGameStore.getState().setConnection('p1', 'ABCD', 'p1', players);
      const state = useGameStore.getState();
      expect(state.playerId).toBe('p1');
      expect(state.roomCode).toBe('ABCD');
      expect(state.hostId).toBe('p1');
      expect(state.players).toEqual(players);
    });
  });

  describe('setNickname', () => {
    it('sets nickname', () => {
      useGameStore.getState().setNickname('Alice');
      expect(useGameStore.getState().nickname).toBe('Alice');
    });
  });

  describe('setPhase', () => {
    it('sets phase to COUNTDOWN', () => {
      useGameStore.getState().setPhase('COUNTDOWN');
      expect(useGameStore.getState().phase).toBe('COUNTDOWN');
    });

    it('sets phase to PLAYING', () => {
      useGameStore.getState().setPhase('PLAYING');
      expect(useGameStore.getState().phase).toBe('PLAYING');
    });

    it('sets phase to FINISHED', () => {
      useGameStore.getState().setPhase('FINISHED');
      expect(useGameStore.getState().phase).toBe('FINISHED');
    });
  });

  describe('setArticles', () => {
    it('sets start, target, currentArticle, hops, and resets hopCount', () => {
      useGameStore.getState().setArticles('Cat', 'Dog');
      const state = useGameStore.getState();
      expect(state.startArticle).toBe('Cat');
      expect(state.targetArticle).toBe('Dog');
      expect(state.currentArticle).toBe('Cat');
      expect(state.hops).toEqual(['Cat']);
      expect(state.hopCount).toBe(0);
    });
  });

  describe('hop', () => {
    it('appends article to hops, increments hopCount, sets currentArticle', () => {
      useGameStore.getState().setArticles('Cat', 'Dog');
      useGameStore.getState().hop('Fish');
      const state = useGameStore.getState();
      expect(state.currentArticle).toBe('Fish');
      expect(state.hops).toEqual(['Cat', 'Fish']);
      expect(state.hopCount).toBe(1);
    });

    it('tracks multiple hops', () => {
      useGameStore.getState().setArticles('Cat', 'Dog');
      useGameStore.getState().hop('Fish');
      useGameStore.getState().hop('Bird');
      useGameStore.getState().hop('Dog');
      const state = useGameStore.getState();
      expect(state.currentArticle).toBe('Dog');
      expect(state.hops).toEqual(['Cat', 'Fish', 'Bird', 'Dog']);
      expect(state.hopCount).toBe(3);
    });
  });

  describe('setElapsed', () => {
    it('sets elapsed time', () => {
      useGameStore.getState().setElapsed(42);
      expect(useGameStore.getState().elapsed).toBe(42);
    });
  });

  describe('setPlayer', () => {
    it('adds a new player', () => {
      const player = {
        id: 'p1',
        nickname: 'Alice',
        currentArticle: '',
        hops: [],
        hopCount: 0,
        finished: false,
        connected: true,
        ready: false,
      };
      useGameStore.getState().setPlayer(player);
      expect(useGameStore.getState().players['p1']).toEqual(player);
    });

    it('updates an existing player', () => {
      const player = {
        id: 'p1',
        nickname: 'Alice',
        currentArticle: '',
        hops: [],
        hopCount: 0,
        finished: false,
        connected: true,
        ready: false,
      };
      useGameStore.getState().setPlayer(player);
      const updated = { ...player, ready: true };
      useGameStore.getState().setPlayer(updated);
      expect(useGameStore.getState().players['p1'].ready).toBe(true);
    });
  });

  describe('updatePlayer', () => {
    it('partially updates a player', () => {
      const player = {
        id: 'p1',
        nickname: 'Alice',
        currentArticle: '',
        hops: [],
        hopCount: 0,
        finished: false,
        connected: true,
        ready: false,
      };
      useGameStore.getState().setPlayer(player);
      useGameStore.getState().updatePlayer('p1', { hopCount: 5, finished: true });
      const state = useGameStore.getState();
      expect(state.players['p1'].hopCount).toBe(5);
      expect(state.players['p1'].finished).toBe(true);
      expect(state.players['p1'].nickname).toBe('Alice');
    });

    it('does not crash when updating a non-existent player', () => {
      useGameStore.getState().updatePlayer('nonexistent', { hopCount: 5 });
      const state = useGameStore.getState();
      expect(state.players['nonexistent']).toBeUndefined();
    });
  });

  describe('setHostId', () => {
    it('updates the host id', () => {
      useGameStore.getState().setHostId('new-host');
      expect(useGameStore.getState().hostId).toBe('new-host');
    });
  });

  describe('removePlayer', () => {
    it('removes a player from the record', () => {
      const player = {
        id: 'p1',
        nickname: 'Alice',
        currentArticle: '',
        hops: [],
        hopCount: 0,
        finished: false,
        connected: true,
        ready: false,
      };
      useGameStore.getState().setPlayer(player);
      expect(useGameStore.getState().players['p1']).toBeDefined();
      useGameStore.getState().removePlayer('p1');
      expect(useGameStore.getState().players['p1']).toBeUndefined();
    });

    it('does not affect other players when removing one', () => {
      const alice = {
        id: 'p1',
        nickname: 'Alice',
        currentArticle: '',
        hops: [],
        hopCount: 0,
        finished: false,
        connected: true,
        ready: false,
      };
      const bob = {
        id: 'p2',
        nickname: 'Bob',
        currentArticle: '',
        hops: [],
        hopCount: 0,
        finished: false,
        connected: true,
        ready: false,
      };
      useGameStore.getState().setPlayer(alice);
      useGameStore.getState().setPlayer(bob);
      useGameStore.getState().removePlayer('p1');
      expect(useGameStore.getState().players['p1']).toBeUndefined();
      expect(useGameStore.getState().players['p2']).toEqual(bob);
    });
  });

  describe('setRankings', () => {
    it('sets rankings array', () => {
      const rankings = [
        {
          id: 'p1',
          nickname: 'Alice',
          currentArticle: 'Dog',
          hops: ['Cat', 'Dog'],
          hopCount: 1,
          finished: true,
          finishTime: 30,
          connected: true,
          ready: true,
        },
      ];
      useGameStore.getState().setRankings(rankings);
      expect(useGameStore.getState().rankings).toEqual(rankings);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useGameStore.getState().setConnection('p1', 'ABCD', 'p1', {});
      useGameStore.getState().setNickname('Alice');
      useGameStore.getState().setPhase('PLAYING');
      useGameStore.getState().setArticles('Cat', 'Dog');
      useGameStore.getState().hop('Fish');
      useGameStore.getState().setElapsed(99);

      useGameStore.getState().reset();

      const state = useGameStore.getState();
      expect(state.playerId).toBeNull();
      expect(state.roomCode).toBeNull();
      expect(state.hostId).toBeNull();
      expect(state.nickname).toBe('');
      expect(state.phase).toBe('WAITING');
      expect(state.startArticle).toBe('');
      expect(state.targetArticle).toBe('');
      expect(state.currentArticle).toBe('');
      expect(state.hops).toEqual([]);
      expect(state.hopCount).toBe(0);
      expect(state.elapsed).toBe(0);
      expect(state.players).toEqual({});
      expect(state.rankings).toEqual([]);
    });
  });
});
