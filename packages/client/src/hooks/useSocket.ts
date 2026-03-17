import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket, type GameSocket } from '../services/socket';
import { useGameStore } from '../stores/gameStore';

export function useSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const navigate = useNavigate();

  const {
    setConnection,
    setPhase,
    setArticles,
    setPlayer,
    updatePlayer,
    removePlayer,
    setElapsed,
    setRankings,
    setHostId,
    setConnectionStatus,
    setError,
  } = useGameStore();

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('room-created', ({ roomCode, playerId, hostId, players }) => {
      setConnection(playerId, roomCode, hostId, players);
      navigate(`/lobby/${roomCode}`);
    });

    socket.on('player-joined', ({ player }) => {
      setPlayer(player);
    });

    socket.on('player-left', ({ playerId }) => {
      removePlayer(playerId);
    });

    socket.on('player-readied', ({ playerId }) => {
      updatePlayer(playerId, { ready: true });
    });

    socket.on('game-starting', ({ startArticle, targetArticle }) => {
      setPhase('COUNTDOWN');
      setArticles(startArticle, targetArticle);
    });

    socket.on('game-started', () => {
      setPhase('PLAYING');
      const roomCode = useGameStore.getState().roomCode;
      if (roomCode) navigate(`/game/${roomCode}`);
    });

    socket.on('player-hopped', ({ playerId, toArticle, hopCount }) => {
      updatePlayer(playerId, { currentArticle: toArticle, hopCount });
    });

    socket.on('player-finished', ({ playerId, finishTime, hopCount }) => {
      updatePlayer(playerId, { finished: true, finishTime, hopCount });
    });

    socket.on('game-finished', ({ rankings }) => {
      setPhase('FINISHED');
      setRankings(rankings);
      const roomCode = useGameStore.getState().roomCode;
      if (roomCode) navigate(`/results/${roomCode}`);
    });

    socket.on('time-update', ({ elapsed }) => {
      setElapsed(elapsed);
    });

    socket.on('hop-rejected', ({ reason }) => {
      // Rollback the last optimistic hop
      const state = useGameStore.getState();
      if (state.hops.length > 1) {
        const previousHops = state.hops.slice(0, -1);
        useGameStore.setState({
          currentArticle: previousHops[previousHops.length - 1],
          hops: previousHops,
          hopCount: state.hopCount - 1,
        });
      }
      console.warn('Hop rejected:', reason);
    });

    socket.on('host-changed', ({ hostId }) => {
      setHostId(hostId);
    });

    socket.on('error', ({ message, code }) => {
      console.error(`Server error [${code}]: ${message}`);
      setError(message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-readied');
      socket.off('game-starting');
      socket.off('game-started');
      socket.off('player-hopped');
      socket.off('player-finished');
      socket.off('game-finished');
      socket.off('time-update');
      socket.off('hop-rejected');
      socket.off('host-changed');
      socket.off('error');
    };
  }, []);

  return socketRef;
}
