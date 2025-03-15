import { Server, Socket } from 'socket.io';
import { RoomService } from '../services/RoomService';
import { CodeUpdate, CursorUpdate } from '../types/room';

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

    socket.on('join_room', this.handleJoinRoom(socket));
    socket.on('leave_room', this.handleLeaveRoom(socket));
    socket.on('code_update', this.handleCodeUpdate(socket));
    socket.on('cursor_update', this.handleCursorUpdate(socket));
    socket.on('disconnect', this.handleDisconnect(socket));
  }

  private handleJoinRoom(socket: Socket) {
    return async ({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) => {
      let room = this.roomService.getRoom(roomId);
      
      if (!room) {
        room = this.roomService.createRoom(`Room ${roomId}`);
      }

      const success = this.roomService.addUserToRoom(roomId, {
        id: userId,
        name: userName
      }, socket);

      if (success) {
        socket.join(roomId);
        
        // Send current room state to the new user
        const currentRoom = this.roomService.getRoom(roomId);
        if (currentRoom) {
          socket.emit('room_state', {
            code: currentRoom.code,
            users: this.roomService.getRoomUsers(roomId).map(user => ({
              id: user.id,
              name: user.name,
              cursor: user.cursor
            }))
          });
        }

        // Notify others about the new user
        socket.to(roomId).emit('user_joined', {
          id: userId,
          name: userName
        });
      }
    };
  }

  private handleLeaveRoom(socket: Socket) {
    return ({ roomId, userId }: { roomId: string; userId: string }) => {
      const success = this.roomService.removeUserFromRoom(roomId, userId);
      
      if (success) {
        socket.leave(roomId);
        socket.to(roomId).emit('user_left', { userId });
      }
    };
  }

  private handleCodeUpdate(socket: Socket) {
    return ({ roomId, ...update }: { roomId: string } & CodeUpdate) => {
      const success = this.roomService.updateCode(roomId, update);
      
      if (success) {
        this.roomService.broadcastToRoom(roomId, 'code_updated', update, update.userId);
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

  private handleDisconnect(socket: Socket) {
    return () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Room cleanup will handle removing disconnected users
    };
  }
} 