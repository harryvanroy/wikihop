import { useGameStore } from '../stores/gameStore';

export default function Timer() {
  const elapsed = useGameStore((s) => s.elapsed);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <span className="font-mono text-lg tabular-nums">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
