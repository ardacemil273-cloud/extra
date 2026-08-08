import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/rooms',
  cors: { origin: '*', credentials: true },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RoomsGateway.name);

  // 🔒 Basit in-memory rate limiter (spam koruması)
  private rateLimits = new Map<string, { count: number; resetAt: number }>();

  private isRateLimited(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(key);
    if (!entry || entry.resetAt < now) {
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count++;
    if (entry.count > max) return true;
    this.rateLimits.set(key, entry);
    return false;
  }

  constructor(
    private readonly roomsService: RoomsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('auth.jwtSecret'),
      });

      client.data.userId = payload.sub;
      client.data.username = payload.username;

      await this.redis.hset('socket:users', client.id, payload.sub);
      await this.redis.set(`user:socket:${payload.sub}`, client.id);

      this.logger.log(`Client connected: ${client.id} (${payload.username})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      await this.redis.hdel('socket:users', client.id);
      await this.redis.del(`user:socket:${userId}`);

      const rooms = Array.from(client.rooms);
      for (const room of rooms) {
        if (room.startsWith('room:')) {
          const roomId = room.replace('room:', '');
          await this.handleLeaveRoom(client, { roomId });
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; password?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
const room = await this.roomsService.joinRoom(userId, data.roomId, data.password);
      client.join(`room:${room.id}`);
      this.server.to(`room:${room.id}`).emit('room:updated', room);
      client.emit('room:joined', room);
      this.broadcastRoomList();
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.roomsService.leaveRoom(userId, data.roomId);
      client.leave(`room:${data.roomId}`);

if (result.closed) {
        this.server.to(`room:${data.roomId}`).emit('room:closed');
      } else {
        const updated = await this.roomsService.getRoomById(data.roomId);
        this.server.to(`room:${data.roomId}`).emit('room:updated', updated);
      }
      this.broadcastRoomList();

client.emit('room:left');
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('room:ready')
  async handleSetReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isReady: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const result = await this.roomsService.setReady(userId, data.roomId, data.isReady);
    const room = await this.roomsService.getRoomById(data.roomId);
    this.server.to(`room:${data.roomId}`).emit('room:updated', room);

if (result.allReady) {
      this.server.to(`room:${data.roomId}`).emit('room:all-ready');
    }
    this.broadcastRoomList();
  }

  @SubscribeMessage('room:kick')
  async handleKickPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.roomsService.kickPlayer(userId, data.roomId, data.targetUserId);
      const targetSocket = await this.redis.get(`user:socket:${data.targetUserId}`);

      if (targetSocket) {
        const targetClient = this.server.sockets.sockets.get(targetSocket);
        if (targetClient) {
          targetClient.emit('room:kicked');
          targetClient.leave(`room:${data.roomId}`);
        }
      }

const room = await this.roomsService.getRoomById(data.roomId);
      this.server.to(`room:${data.roomId}`).emit('room:updated', room);
      this.broadcastRoomList();
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('room:close')
  async handleCloseRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.roomsService.closeRoom(userId, data.roomId);
      this.server.to(`room:${data.roomId}`).emit('room:closed');

const sockets = await this.server.in(`room:${data.roomId}`).fetchSockets();
      for (const s of sockets) {
        s.leave(`room:${data.roomId}`);
      }
      this.broadcastRoomList();
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

@SubscribeMessage('room:select-game')
  async handleSelectGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; gameType: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
const room = await this.roomsService.selectGame(userId, data.roomId, data.gameType);
      this.server.to(`room:${data.roomId}`).emit('room:updated', room);
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('room:update-settings')
  async handleUpdateSettings(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; maxPlayers?: number; gameSettings?: Record<string, unknown> },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const room = await this.roomsService.updateSettings(userId, data.roomId, {
        maxPlayers: data.maxPlayers,
        gameSettings: data.gameSettings,
      });
      this.server.to(`room:${data.roomId}`).emit('room:updated', room);
this.server.to(`room:${data.roomId}`).emit('room:settings-updated', {
        maxPlayers: room.maxPlayers,
        settings: room.settings,
      });
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('lobby:chat')
  handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; message: string },
  ) {
const userId = client.data.userId;
    if (!userId) return;

    // 🔒 Rate limit: saniyede max 5 lobi mesajı
    if (this.isRateLimited(`lobby-chat:${userId}`, 5, 5000)) {
      client.emit('room:error', { message: 'Çok hızlı mesaj gönderiyorsun, lütfen yavaşla' });
      return;
    }

    const sanitized = data.message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .substring(0, 300);

this.server.to(`room:${data.roomId}`).emit('lobby:chat', {
      userId,
      username: client.data.username,
      message: sanitized,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('lobby:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(`room:${data.roomId}`).emit('lobby:typing', {
      userId,
      username: client.data.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('lobby:emote')
  handleEmote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; emote: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const allowed = ['😂', '😮', '😡', '❤️', '👏', '👍', '🎉', '🤔'];
    if (!allowed.includes(data.emote)) return;
    this.server.to(`room:${data.roomId}`).emit('lobby:emote', {
      userId,
      username: client.data.username,
      emote: data.emote,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('room:transfer-host')
  async handleTransferHost(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    try {
      const room = await this.roomsService.transferHost(userId, data.roomId, data.targetUserId);
      this.server.to(`room:${data.roomId}`).emit('room:updated', room);
      this.server.to(`room:${data.roomId}`).emit('room:host-changed', {
        newHostId: data.targetUserId,
        newHostName: room.host?.profile?.displayName || room.host?.username,
      });
      this.broadcastRoomList();
    } catch (err) {
      client.emit('room:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('room:invite')
  async handleInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const targetSocket = await this.redis.get(`user:socket:${data.targetUserId}`);
    if (targetSocket) {
      const targetClient = this.server.sockets.sockets.get(targetSocket);
      if (targetClient) {
        try {
          const room = await this.roomsService.getRoomById(data.roomId);
          targetClient.emit('room:invite-received', {
            roomId: data.roomId,
            roomCode: room.code,
            roomName: room.name,
            inviterId: userId,
            inviterUsername: client.data.username,
          });
        } catch {}
      }
    }
  }

async broadcastRoomList(): Promise<void> {
    try {
      const rooms = await this.roomsService.getPublicRooms();
      this.server.emit('rooms:list-updated', rooms);
    } catch {}
  }

  emitToRoom(roomId: string, event: string, data: unknown): void {
    this.server.to(`room:${roomId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.redis.get(`user:socket:${userId}`).then((socketId) => {
      if (socketId) {
        this.server.to(socketId).emit(event, data);
      }
    });
  }
}