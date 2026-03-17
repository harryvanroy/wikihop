import { useGameStore } from '../stores/gameStore';

export default function PlayerList() {
  const players = useGameStore((s) => s.players);
  const playerId = useGameStore((s) => s.playerId);
  const phase = useGameStore((s) => s.phase);

  const playerList = Object.values(players);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Players</h3>
      {playerList.map((player) => (
        <div
          key={player.id}
          className={`flex items-center justify-between p-2 rounded-lg ${
            player.id === playerId ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                player.finished
                  ? 'bg-green-400'
                  : player.connected
                  ? 'bg-blue-400'
                  : 'bg-gray-500'
              }`}
            />
            <span className="text-sm font-medium">
              {player.nickname}
              {player.id === playerId && ' (you)'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {phase === 'WAITING' && (
              <span className={player.ready ? 'text-green-400' : 'text-gray-500'}>
                {player.ready ? 'Ready' : 'Not ready'}
              </span>
            )}
            {(phase === 'PLAYING' || phase === 'FINISHED') && (
              <>
                <span>{player.hopCount} hops</span>
                {player.finished && <span className="text-green-400">Finished!</span>}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
