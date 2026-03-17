import { useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { useGameStore } from '../stores/gameStore';
import ArticleView from '../components/ArticleView';
import GameHeader from '../components/GameHeader';
import HopTracker from '../components/HopTracker';
import PlayerList from '../components/PlayerList';

export default function Game() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const currentArticle = useGameStore((s) => s.currentArticle);
  const targetArticle = useGameStore((s) => s.targetArticle);
  const phase = useGameStore((s) => s.phase);
  const hop = useGameStore((s) => s.hop);
  const playerId = useGameStore((s) => s.playerId);
  const storeRoomCode = useGameStore((s) => s.roomCode);

  const handleHop = useCallback(
    (toArticle: string) => {
      if (phase !== 'PLAYING' || !currentArticle) return;

      const socket = getSocket();
      socket.emit('hop', { fromArticle: currentArticle, toArticle });

      // Optimistically update local state
      hop(toArticle);
    },
    [currentArticle, phase, hop]
  );

  if (!playerId || storeRoomCode !== urlRoomCode) {
    return <Navigate to="/" replace />;
  }

  if (phase === 'FINISHED') {
    return <Navigate to={`/results/${urlRoomCode}`} replace />;
  }

  if (phase !== 'PLAYING') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col h-screen">
      <GameHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Main article area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <HopTracker />
          </div>

          {currentArticle === targetArticle ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-4xl mb-4">&#127881;</div>
                <h2 className="text-2xl font-bold text-green-400">You made it!</h2>
                <p className="text-gray-400 mt-2">Waiting for results...</p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4 text-white">
                {currentArticle}
              </h1>
              <ArticleView title={currentArticle} onHop={handleHop} />
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 border-l border-gray-800 p-4 overflow-y-auto bg-gray-900/50">
          <PlayerList />
        </div>
      </div>
    </div>
  );
}
