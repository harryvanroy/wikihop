import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@wikihop/shared';
import { CreateRoomPayload, JoinRoomPayload } from '@wikihop/shared';
import {
  createRoom,
  joinRoom,
  setPlayerReady,
  allPlayersReady,
  startGame,
  getRoom,
  getPlayerRoom,
  removePlayer,
} from '../../services/gameManager';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerLobbyHandlers(io: IOServer, socket: IOSocket) {
  socket.on('create-room', (payload) => {
    const parsed = CreateRoomPayload.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid payload', code: 'INVALID_PAYLOAD' });
      return;
    }

    const { nickname, config } = parsed.data;
    const room = createRoom(socket.id, nickname, config);

    socket.join(room.roomCode);
    socket.emit('room-created', {
      roomCode: room.roomCode,
      playerId: socket.id,
      hostId: room.hostId,
      players: room.players,
    });
  });

  socket.on('join-room', (payload) => {
    const parsed = JoinRoomPayload.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid payload', code: 'INVALID_PAYLOAD' });
      return;
    }

    const { roomCode, nickname } = parsed.data;
    const result = joinRoom(roomCode.toUpperCase(), socket.id, nickname);

    if ('error' in result) {
      socket.emit('error', { message: result.error, code: 'JOIN_FAILED' });
      return;
    }

    const room = result.room;

    socket.join(roomCode.toUpperCase());
    socket.emit('room-created', {
      roomCode: roomCode.toUpperCase(),
      playerId: socket.id,
      hostId: room.hostId,
      players: room.players,
    });

    // Notify other players that someone new joined
    socket.to(roomCode.toUpperCase()).emit('player-joined', { player: result.player });
  });

  socket.on('player-ready', () => {
    const roomCode = getPlayerRoom(socket.id);
    if (!roomCode) return;

    setPlayerReady(roomCode, socket.id);
    io.to(roomCode).emit('player-readied', { playerId: socket.id });
  });

  socket.on('start-game', async () => {
    const roomCode = getPlayerRoom(socket.id);
    if (!roomCode) return;

    const room = getRoom(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Only the host can start the game', code: 'NOT_HOST' });
      return;
    }

    const result = await startGame(io, roomCode);
    if (result.error) {
      socket.emit('error', { message: result.error, code: 'START_FAILED' });
    }
  });

  socket.on('leave-room', () => {
    const roomCode = getPlayerRoom(socket.id);
    if (roomCode) {
      socket.leave(roomCode);
      removePlayer(io, socket.id);
    }
  });

  socket.on('disconnect', () => {
    removePlayer(io, socket.id);
  });
}
