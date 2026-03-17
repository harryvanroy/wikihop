import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';

export default function Results() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const rankings = useGameStore((s) => s.rankings);
  const playerId = useGameStore((s) => s.playerId);
  const startArticle = useGameStore((s) => s.startArticle);
  const targetArticle = useGameStore((s) => s.targetArticle);
  const phase = useGameStore((s) => s.phase);
  const storeRoomCode = useGameStore((s) => s.roomCode);
  const reset = useGameStore((s) => s.reset);
  const navigate = useNavigate();

  if (!playerId || storeRoomCode !== urlRoomCode || phase !== 'FINISHED') {
    return <Navigate to="/" replace />;
  }

  const handlePlayAgain = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
          <p className="text-gray-400">
            {startArticle} &rarr; {targetArticle}
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {rankings.map((player, i) => {
            const isMe = player.id === playerId;
            const isWinner = i === 0 && player.finished;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  isWinner
                    ? 'bg-yellow-900/30 border border-yellow-600'
                    : isMe
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-bold ${
                      isWinner ? 'text-yellow-400' : 'text-gray-500'
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <div>
                    <span className="font-medium">
                      {player.nickname}
                      {isMe && ' (you)'}
                    </span>
                    {isWinner && <span className="ml-2 text-yellow-400 text-sm">Winner!</span>}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <div>{player.hopCount} hops</div>
                  {player.finished && player.finishTime && (
                    <div>{(player.finishTime / 1000).toFixed(1)}s</div>
                  )}
                  {!player.finished && <div className="text-red-400">Did not finish</div>}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-lg transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
