import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@wikihop/shared';
import { wikipediaRouter } from './routes/wikipedia';
import { registerLobbyHandlers } from './socket/handlers/lobby';
import { registerGameHandlers } from './socket/handlers/game';

export function createApp(clientUrl?: string) {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: clientUrl || process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors());
  app.use(express.json());
  app.use('/api/wiki', wikipediaRouter);

  // In production, serve the built client files
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    registerLobbyHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
    });
  });

  return { app, httpServer, io };
}

// Only start when run directly (not imported by tests)
if (process.env.NODE_ENV !== 'test') {
  const { httpServer } = createApp();
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`WikiHop server running on port ${PORT}`);
  });
}
