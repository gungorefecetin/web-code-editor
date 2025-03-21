import { Socket } from 'socket.io';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  socket: Socket;
  cursor?: {
    line: number;
    column: number;
    file: string;
  };
}

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  users: Map<string, User>;
  messages: ChatMessage[];
  code: {
    html: string;
    css: string;
    js: string;
  };
}

export interface CodeUpdate {
  language: 'html' | 'css' | 'js';
  content: string;
  userId: string;
}

export interface CursorUpdate {
  userId: string;
  cursor: {
    line: number;
    column: number;
    file: string;
  };
} 