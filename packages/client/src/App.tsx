import { Routes, Route } from 'react-router-dom';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './stores/gameStore';
import Home from './routes/Home';
import Lobby from './routes/Lobby';
import Game from './routes/Game';
import Results from './routes/Results';

export default function App() {
  useSocket();
  const connectionStatus = useGameStore((s) => s.connectionStatus);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {connectionStatus === 'disconnected' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-900/90 text-white text-center py-2 text-sm">
          Connection lost — reconnecting...
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomCode" element={<Lobby />} />
        <Route path="/game/:roomCode" element={<Game />} />
        <Route path="/results/:roomCode" element={<Results />} />
      </Routes>
    </div>
  );
}
