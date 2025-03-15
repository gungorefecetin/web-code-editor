import { io, Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';

export interface CodeUpdate {
  language: 'html' | 'css' | 'js';
  content: string;
  userId: string;
}

export interface CursorPosition {
  line: number;
  column: number;
  file: string;
}

export interface User {
  id: string;
  name: string;
  cursor?: CursorPosition;
  lastActivity?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface RoomState {
  code: {
    html: string;
    css: string;
    js: string;
  };
  users: User[];
  messages: ChatMessage[];
}

class SocketService {
  private socket: Socket | null = null;
  private userId: string;
  private userName: string;
  private roomId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.userId = nanoid();
    this.userName = `User-${this.userId.slice(0, 4)}`;
  }

  connect() {
    if (this.socket) return;

    console.log('Attempting to connect to:', import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
    this.socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.setupBaseListeners();
  }

  private setupBaseListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server with socket ID:', this.socket?.id);
      console.log('Current room ID:', this.roomId);
      console.log('Current user ID:', this.userId);
      this.emit('event', 'connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server. Reason:', reason);
      this.emit('event', 'disconnect');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
      if (this.roomId) {
        console.log('Rejoining room:', this.roomId);
        this.joinRoom(this.roomId);
      }
    });

    this.socket.on('room_state', (state: RoomState) => {
      console.log('Received room state:', state);
      this.emit('room_state', state);
    });

    this.socket.on('code_updated', (update: CodeUpdate) => {
      console.log('Received code update:', update);
      this.emit('code_updated', update);
    });

    this.socket.on('cursor_updated', (update: { userId: string; cursor: CursorPosition }) => {
      console.log('Received cursor update:', update);
      this.emit('cursor_updated', update);
    });

    this.socket.on('chat_message', (message: ChatMessage) => {
      console.log('Received chat message:', message);
      this.emit('chat_message', message);
    });

    this.socket.on('user_joined', (user: User) => {
      console.log('User joined:', user);
      this.emit('user_joined', user);
    });

    this.socket.on('user_left', ({ userId }: { userId: string }) => {
      console.log('User left:', userId);
      this.emit('user_left', userId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.log('Current socket state:', {
        connected: this.socket?.connected,
        disconnected: this.socket?.disconnected,
        roomId: this.roomId,
        userId: this.userId
      });
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  joinRoom(roomId: string) {
    if (!this.socket) this.connect();
    if (!this.socket || this.roomId === roomId) return;

    console.log('Joining room:', roomId, 'with user:', {
      userId: this.userId,
      userName: this.userName
    });

    if (this.roomId) {
      this.leaveRoom();
    }

    this.roomId = roomId;
    this.socket.emit('join_room', {
      roomId,
      userId: this.userId,
      userName: this.userName
    });
  }

  leaveRoom() {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('leave_room', {
      roomId: this.roomId,
      userId: this.userId
    });
    this.roomId = null;
  }

  updateCode(language: 'html' | 'css' | 'js', content: string) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('code_update', {
      roomId: this.roomId,
      language,
      content,
      userId: this.userId
    });
  }

  updateCursor(position: CursorPosition) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('cursor_update', {
      roomId: this.roomId,
      userId: this.userId,
      cursor: position
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.roomId) {
      this.leaveRoom();
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  getUserId() {
    return this.userId;
  }

  setUserName(name: string) {
    this.userName = name;
  }

  sendMessage(content: string) {
    if (!this.socket || !this.roomId) {
      console.error('Cannot send message: socket or room ID is missing', {
        socketConnected: this.socket?.connected,
        roomId: this.roomId
      });
      return;
    }

    const messageData = {
      roomId: this.roomId,
      content,
      userId: this.userId,
      userName: this.userName
    };

    console.log('Sending chat message:', messageData);
    console.log('Socket state:', {
      id: this.socket.id,
      connected: this.socket.connected,
      disconnected: this.socket.disconnected
    });

    this.socket.emit('chat_message', {
      roomId: this.roomId,
      content
    }, (response: any) => {
      console.log('Message sent callback:', response);
    });
  }
}

// Create a singleton instance
export const socketService = new SocketService();
export default socketService; 