import { nanoid } from 'nanoid';
import { Room, User, CodeUpdate, CursorUpdate, ChatMessage } from '../types/room';
import { Socket } from 'socket.io';

export class RoomService {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(name: string): Room {
    const roomId = name;
    const room: Room = {
      id: roomId,
      name,
      createdAt: new Date(),
      users: new Map(),
      messages: [],
      code: {
        html: '<div>\n  <!-- Write your HTML here -->\n</div>',
        css: '/* Write your CSS here */\n',
        js: '// Write your JavaScript here\n'
      }
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom(roomId);
    }
    return room;
  }

  addUserToRoom(roomId: string, user: Omit<User, 'socket'>, socket: Socket): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const existingUser = room.users.get(user.id);
    if (existingUser) {
      existingUser.socket.disconnect();
      room.users.delete(user.id);
    }

    room.users.set(user.id, { ...user, socket });
    console.log(`Added user ${user.id} to room ${roomId}. Current users:`, 
      Array.from(room.users.values()).map(u => ({ id: u.id, name: u.name }))
    );
    return true;
  }

  removeUserFromRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    return room.users.delete(userId);
  }

  updateCode(roomId: string, update: CodeUpdate): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.code[update.language] = update.content;
    return true;
  }

  updateCursor(roomId: string, update: CursorUpdate): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const user = room.users.get(update.userId);
    if (!user) return false;

    user.cursor = update.cursor;
    return true;
  }

  getRoomUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.users.values());
  }

  broadcastToRoom(roomId: string, event: string, data: any, excludeUserId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.error(`Cannot broadcast to non-existent room: ${roomId}`);
      return;
    }

    console.log(`Broadcasting to room ${roomId}:`, {
      event,
      data,
      excludeUserId,
      numUsers: room.users.size,
      users: Array.from(room.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        socketId: u.socket.id
      }))
    });

    room.users.forEach((user) => {
      if (excludeUserId && user.id === excludeUserId) {
        console.log(`Skipping excluded user: ${user.id} (${user.socket.id})`);
        return;
      }
      console.log(`Emitting to user: ${user.id} (${user.socket.id})`);
      user.socket.emit(event, data);
    });
  }

  cleanupInactiveRooms(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = new Date();
    this.rooms.forEach((room, roomId) => {
      if (room.users.size === 0 && now.getTime() - room.createdAt.getTime() > maxAge) {
        this.rooms.delete(roomId);
      }
    });
  }

  addChatMessage(roomId: string, userId: string, userName: string, content: string): ChatMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const message: ChatMessage = {
      id: nanoid(),
      userId,
      userName,
      content,
      timestamp: Date.now()
    };

    room.messages.push(message);

    // Keep only the last 100 messages
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    return message;
  }

  getRoomMessages(roomId: string): ChatMessage[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.messages;
  }
} 