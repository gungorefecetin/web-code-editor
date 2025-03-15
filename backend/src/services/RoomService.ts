import { nanoid } from 'nanoid';
import { Room, User, CodeUpdate, CursorUpdate } from '../types/room';
import { Socket } from 'socket.io';

export class RoomService {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(name: string): Room {
    const roomId = nanoid(10);
    const room: Room = {
      id: roomId,
      name,
      createdAt: new Date(),
      users: new Map(),
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
    return this.rooms.get(roomId);
  }

  addUserToRoom(roomId: string, user: Omit<User, 'socket'>, socket: Socket): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.users.set(user.id, { ...user, socket });
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
    if (!room) return;

    room.users.forEach((user) => {
      if (excludeUserId && user.id === excludeUserId) return;
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
} 