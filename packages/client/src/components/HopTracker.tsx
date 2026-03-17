import { useGameStore } from '../stores/gameStore';

export default function HopTracker() {
  const hops = useGameStore((s) => s.hops);

  if (hops.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {hops.map((article, i) => (
        <span key={`${i}-${article}`} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-600 mx-1">&rarr;</span>}
          <span
            className={`px-2 py-0.5 rounded ${
              i === hops.length - 1
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {article}
          </span>
        </span>
      ))}
    </div>
  );
}
