import { Injectable } from '@nestjs/common';

@Injectable()
export class SocketStateService {
  private readonly userToSocket = new Map<string, string>();
  private readonly userToGameSocket = new Map<string, string>();
  private readonly socketToUser = new Map<string, string>();

  // General Sockets (Rooms)
  setUserSocket(userId: string, socketId: string) {
    this.userToSocket.set(userId, socketId);
    this.socketToUser.set(socketId, userId);
  }

  getUserSocket(userId: string): string | undefined {
    return this.userToSocket.get(userId);
  }

  removeSocket(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      this.userToSocket.delete(userId);
      this.socketToUser.delete(socketId);
    }
    return userId;
  }
  
  removeUserSocket(userId: string) {
    const socketId = this.userToSocket.get(userId);
    if(socketId) {
        this.userToSocket.delete(userId);
        this.socketToUser.delete(socketId);
    }
  }

  // Game Sockets
  setGameSocket(userId: string, socketId: string) {
    this.userToGameSocket.set(userId, socketId);
  }

  getGameSocket(userId: string): string | undefined {
    return this.userToGameSocket.get(userId);
  }

  removeGameSocket(userId: string) {
    this.userToGameSocket.delete(userId);
  }
}
