import { useState } from 'react';
import { getSocket } from '../services/socket';
import { useGameStore } from '../stores/gameStore';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    clearError();
    const socket = getSocket();
    useGameStore.getState().setNickname(nickname.trim());
    socket.emit('create-room', { nickname: nickname.trim() });
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    clearError();
    const socket = getSocket();
    useGameStore.getState().setNickname(nickname.trim());
    socket.emit('join-room', { roomCode: roomCode.trim().toUpperCase(), nickname: nickname.trim() });
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight mb-2">
            Wiki<span className="text-blue-500">Hop</span>
          </h1>
          <p className="text-gray-400">Race from one Wikipedia article to another</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-lg transition-colors"
            >
              Create Game
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 px-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-semibold text-lg transition-colors"
            >
              Join Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!nickname.trim()}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Room code (e.g. AXKM)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full py-3 px-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-center text-xl tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button
              onClick={handleJoin}
              disabled={!nickname.trim() || roomCode.length !== 4}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold transition-colors"
            >
              Join Room
            </button>
            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
