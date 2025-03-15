import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SocketHandler } from './socket/SocketHandler';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO setup
const socketHandler = new SocketHandler(io);
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create room endpoint
app.post('/api/rooms', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  try {
    const room = socketHandler.getRoomService().createRoom(name);
    res.json({
      id: room.id,
      name: room.name,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/room/${room.id}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 