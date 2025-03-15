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
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ],
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000  // Increase ping interval
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ]
}));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Collaborative Code Editor API',
    endpoints: [
      '/api/health',
      '/api/rooms'
    ]
  });
});

// Socket.IO setup
const socketHandler = new SocketHandler(io);

// Log socket.io events
io.on('connection', (socket) => {
  console.log(`New socket connection: ${socket.id}`);
  socket.on('error', (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
  socketHandler.handleConnection(socket);
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    message: err.message 
  });
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
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
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 