import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/RoomService';
import { CodeUpdate, CursorUpdate, ChatMessage, User } from '../types/room';

export class SocketHandler {
  private io: Server;
  private roomService: RoomService;

  constructor(io: Server) {
    this.io = io;
    this.roomService = new RoomService();
    this.setupCleanup();
  }

  public getRoomService(): RoomService {
    return this.roomService;
  }

  private setupCleanup(): void {
    // Clean up inactive rooms every hour
    setInterval(() => {
      this.roomService.cleanupInactiveRooms();
    }, 60 * 60 * 1000);
  }

  public handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);
    console.log('Current rooms:', Array.from(socket.rooms));

    socket.on('join_room', this.handleJoinRoom(socket));
    socket.on('leave_room', this.handleLeaveRoom(socket));
    socket.on('code_update', this.handleCodeUpdate(socket));
    socket.on('cursor_update', this.handleCursorUpdate(socket));
    socket.on('chat_message', this.handleChatMessage(socket));
    socket.on('disconnect', this.handleDisconnect(socket));

    // Log all events for debugging
    const originalEmit = socket.emit;
    socket.emit = function(event: string, ...args: any[]) {
      console.log(`[Socket ${socket.id}] Emitting event: ${event}`, args);
      return originalEmit.apply(socket, [event, ...args]);
    };
  }

  private handleJoinRoom(socket: Socket) {
    return async ({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) => {
      console.log(`[${socket.id}] Joining room:`, { roomId, userId, userName });
      
      let room = this.roomService.getRoom(roomId);
      
      if (!room) {
        console.log(`Creating new room: ${roomId}`);
        room = this.roomService.createRoom(`Room ${roomId}`);
      }

      const success = this.roomService.addUserToRoom(roomId, {
        id: userId,
        name: userName
      }, socket);

      if (success) {
        socket.join(roomId);
        console.log(`[${socket.id}] Successfully joined room ${roomId}`);
        console.log('Current room users:', this.roomService.getRoomUsers(roomId).map(u => ({
          id: u.id,
          name: u.name,
          socketId: u.socket.id
        })));
        
        // Send current room state to the new user
        const currentRoom = this.roomService.getRoom(roomId);
        if (currentRoom) {
          const roomState = {
            code: currentRoom.code,
            users: this.roomService.getRoomUsers(roomId).map(user => ({
              id: user.id,
              name: user.name,
              cursor: user.cursor
            })),
            messages: this.roomService.getRoomMessages(roomId)
          };
          console.log(`[${socket.id}] Sending room state:`, roomState);
          socket.emit('room_state', roomState);
        }

        // Notify others about the new user
        socket.to(roomId).emit('user_joined', {
          id: userId,
          name: userName
        });

        // Send system message about user joining
        const joinMessage = this.roomService.addChatMessage(
          roomId,
          'system',
          'System',
          `${userName} joined the room`
        );
        if (joinMessage) {
          console.log(`[${socket.id}] Broadcasting join message:`, joinMessage);
          this.roomService.broadcastToRoom(roomId, 'chat_message', joinMessage);
        }
      } else {
        console.error(`[${socket.id}] Failed to join room ${roomId}`);
      }
    };
  }

  private handleLeaveRoom(socket: Socket) {
    return ({ roomId, userId }: { roomId: string; userId: string }) => {
      const user = this.roomService.getRoomUsers(roomId).find(u => u.id === userId);
      const success = this.roomService.removeUserFromRoom(roomId, userId);
      
      if (success && user) {
        socket.leave(roomId);
        socket.to(roomId).emit('user_left', { userId });

        // Send system message about user leaving
        const leaveMessage = this.roomService.addChatMessage(
          roomId,
          'system',
          'System',
          `${user.name} left the room`
        );
        if (leaveMessage) {
          this.roomService.broadcastToRoom(roomId, 'chat_message', leaveMessage);
        }
      }
    };
  }

  private handleCodeUpdate(socket: Socket) {
    return ({ roomId, ...update }: { roomId: string } & CodeUpdate) => {
      console.log(`[${socket.id}] Received code update:`, {
        roomId,
        language: update.language,
        userId: update.userId,
        contentLength: update.content.length
      });
      
      const success = this.roomService.updateCode(roomId, update);
      
      if (success) {
        console.log(`[${socket.id}] Broadcasting code update to room ${roomId}:`, {
          language: update.language,
          userId: update.userId,
          excludeUserId: update.userId
        });
        this.roomService.broadcastToRoom(roomId, 'code_updated', update, update.userId);
      } else {
        console.error(`[${socket.id}] Failed to update code for room ${roomId}`);
      }
    };
  }

  private handleCursorUpdate(socket: Socket) {
    return ({ roomId, ...update }: { roomId: string } & CursorUpdate) => {
      const success = this.roomService.updateCursor(roomId, update);
      
      if (success) {
        this.roomService.broadcastToRoom(roomId, 'cursor_updated', update, update.userId);
      }
    };
  }

  private handleChatMessage(socket: Socket) {
    return ({ roomId, content }: { roomId: string; content: string }) => {
      console.log(`[${socket.id}] Received chat message:`, { roomId, content });
      
      const room = this.roomService.getRoom(roomId);
      if (!room) {
        console.error(`[${socket.id}] Room not found:`, roomId);
        return;
      }

      // Find user by socket ID
      let foundUser: User | undefined;
      room.users.forEach((user) => {
        if (user.socket.id === socket.id) {
          foundUser = user;
        }
      });

      if (!foundUser) {
        console.error(`[${socket.id}] User not found in room ${roomId}`);
        console.log('Room users:', Array.from(room.users.values()).map(u => ({
          id: u.id,
          name: u.name,
          socketId: u.socket.id
        })));
        socket.emit('reconnect_required');
        return;
      }

      const message = this.roomService.addChatMessage(roomId, foundUser.id, foundUser.name, content);
      if (message) {
        console.log(`[${socket.id}] Broadcasting chat message:`, message);
        console.log('Room users:', Array.from(room.users.values()).map(u => ({
          id: u.id,
          name: u.name,
          socketId: u.socket.id
        })));
        this.roomService.broadcastToRoom(roomId, 'chat_message', message);
      } else {
        console.error(`[${socket.id}] Failed to create message for room:`, roomId);
      }
    };
  }

  private handleDisconnect(socket: Socket) {
    return () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Room cleanup will handle removing disconnected users
    };
  }
} 