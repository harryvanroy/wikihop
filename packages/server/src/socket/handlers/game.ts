import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@wikihop/shared';
import { HopPayload, MAX_HOPS_PER_SECOND } from '@wikihop/shared';
import { processHop, getPlayerRoom } from '../../services/gameManager';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Track last hop timestamp per socket for rate limiting
const lastHopTime = new Map<string, number>();

export function registerGameHandlers(io: IOServer, socket: IOSocket) {
  socket.on('hop', async (payload) => {
    const parsed = HopPayload.safeParse(payload);
    if (!parsed.success) {
      socket.emit('hop-rejected', { reason: 'Invalid payload' });
      return;
    }

    // Rate limiting
    const now = Date.now();
    const minInterval = 1000 / MAX_HOPS_PER_SECOND;
    const lastTime = lastHopTime.get(socket.id) || 0;
    if (now - lastTime < minInterval) {
      socket.emit('hop-rejected', { reason: 'Too fast — slow down' });
      return;
    }
    lastHopTime.set(socket.id, now);

    const roomCode = getPlayerRoom(socket.id);
    if (!roomCode) {
      socket.emit('hop-rejected', { reason: 'Not in a room' });
      return;
    }

    const { fromArticle, toArticle } = parsed.data;
    const result = await processHop(io, roomCode, socket.id, fromArticle, toArticle);

    if (result.error) {
      socket.emit('hop-rejected', { reason: result.error });
    }
  });

  socket.on('disconnect', () => {
    lastHopTime.delete(socket.id);
  });
}
