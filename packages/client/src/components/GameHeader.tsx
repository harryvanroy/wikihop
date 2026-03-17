import { useGameStore } from '../stores/gameStore';
import Timer from './Timer';

export default function GameHeader() {
  const startArticle = useGameStore((s) => s.startArticle);
  const targetArticle = useGameStore((s) => s.targetArticle);
  const hopCount = useGameStore((s) => s.hopCount);

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-6">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">From</span>
          <p className="text-sm font-medium text-gray-300">{startArticle}</p>
        </div>
        <span className="text-gray-600 text-xl">&rarr;</span>
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider">Target</span>
          <p className="text-sm font-bold text-green-400">{targetArticle}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Hops</span>
          <p className="text-lg font-mono font-bold">{hopCount}</p>
        </div>
        <div className="text-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Time</span>
          <Timer />
        </div>
      </div>
    </div>
  );
}
