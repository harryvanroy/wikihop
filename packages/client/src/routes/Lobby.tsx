import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { useGameStore } from '../stores/gameStore';
import PlayerList from '../components/PlayerList';
import { COUNTDOWN_SECONDS } from '@wikihop/shared';

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const playerId = useGameStore((s) => s.playerId);
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const startArticle = useGameStore((s) => s.startArticle);
  const targetArticle = useGameStore((s) => s.targetArticle);
  const hostId = useGameStore((s) => s.hostId);
  const storeRoomCode = useGameStore((s) => s.roomCode);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (phase === 'COUNTDOWN') {
      setCountdown(COUNTDOWN_SECONDS);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c === null || c <= 1) {
            clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  if (!playerId || storeRoomCode !== roomCode) {
    return <Navigate to="/" replace />;
  }

  if (phase === 'PLAYING') {
    return <Navigate to={`/game/${roomCode}`} replace />;
  }

  if (phase === 'FINISHED') {
    return <Navigate to={`/results/${roomCode}`} replace />;
  }

  const isHost = playerId === hostId;
  const playerCount = Object.keys(players).length;

  const handleReady = () => {
    getSocket().emit('player-ready');
  };

  const handleStart = () => {
    getSocket().emit('start-game');
  };

  const myPlayer = playerId ? players[playerId] : undefined;
  const allReady = Object.values(players).every((p) => p.ready);

  if (phase === 'COUNTDOWN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-8xl font-black text-blue-500 mb-8 animate-pulse">
            {countdown}
          </div>
          <div className="space-y-2">
            <p className="text-gray-400">
              From: <span className="text-white font-medium">{startArticle}</span>
            </p>
            <p className="text-gray-400">
              To: <span className="text-green-400 font-bold">{targetArticle}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Game Lobby</h2>
          <div className="inline-block px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
            <span className="text-sm text-gray-400 mr-2">Room Code:</span>
            <span className="font-mono text-2xl font-bold tracking-widest text-blue-400">
              {roomCode}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-2">Share this code with friends to join</p>
        </div>

        <div className="mb-6">
          <PlayerList />
        </div>

        <div className="space-y-3">
          {!myPlayer?.ready && (
            <button
              onClick={handleReady}
              className="w-full py-3 px-6 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors"
            >
              Ready Up
            </button>
          )}

          {myPlayer?.ready && !isHost && (
            <p className="text-center text-gray-400">Waiting for host to start...</p>
          )}

          {isHost && myPlayer?.ready && (
            <button
              onClick={handleStart}
              disabled={playerCount < 2 || !allReady}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
            >
              {playerCount < 2
                ? 'Waiting for players...'
                : !allReady
                ? 'Waiting for everyone to ready up...'
                : 'Start Game'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
