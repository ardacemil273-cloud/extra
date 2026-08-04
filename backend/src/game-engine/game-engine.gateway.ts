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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { GameEngineService } from './game-engine.service';
import { VampireVillageService } from '../games/vampire-village/vampire-village.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: '*', credentials: true },
})
export class GameEngineGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameEngineGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly gameEngine: GameEngineService,
    private readonly vampireVillage: VampireVillageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('auth.jwtSecret'),
      });

      client.data.userId = payload.sub;
      client.data.username = payload.username;
      await this.redis.set(`user:game-socket:${payload.sub}`, client.id);

      this.logger.log(`Game socket connected: ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.redis.del(`user:game-socket:${client.data.userId}`);
    }
  }

  @SubscribeMessage('game:join')
  async handleGameJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(`game:${data.roomId}`);
    const state = await this.gameEngine.getState(data.roomId);
    if (state) {
      const safeState = this.getSafeStateForPlayer(state, client.data.userId);
      client.emit('game:state', safeState);
    }
  }

  @SubscribeMessage('game:start')
  async handleGameStart(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; gameType: string }) {
    const { roomId, gameType } = data;

    try {
      if (gameType === 'vampire-village') {
        await this.vampireVillage.startGame(roomId, client.data.userId, this.server);
      }
    } catch (err) {
      client.emit('game:error', { message: err.message });
    }
  }

  @SubscribeMessage('game:action')
  async handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; action: string; targetId?: string },
  ) {
    const { roomId, action, targetId } = data;
    const userId = client.data.userId;

    try {
      const state = await this.gameEngine.getState(roomId);
      if (!state) return;

      if (state.gameType === 'vampire-village') {
        await this.vampireVillage.handleAction(roomId, userId, action, targetId, this.server);
      }
    } catch (err) {
      client.emit('game:error', { message: err.message });
    }
  }

  @SubscribeMessage('game:vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetId: string },
  ) {
    const userId = client.data.userId;
    try {
      const state = await this.gameEngine.castVote(data.roomId, userId, data.targetId);
      if (state) {
        this.server.to(`game:${data.roomId}`).emit('game:vote-update', {
          votes: state.votes,
          players: Object.fromEntries(
            Object.entries(state.players).map(([id, p]) => [id, { votes: p.votes, votedFor: p.votedFor }]),
          ),
        });
      }
    } catch (err) {
      client.emit('game:error', { message: err.message });
    }
  }

  @SubscribeMessage('game:chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; message: string },
  ) {
    const state = await this.gameEngine.getState(data.roomId);
    if (!state || state.phase !== 'DAY_DISCUSSION') return;

    const player = state.players[client.data.userId];
    if (!player || player.status === 'DEAD') return;

    const sanitized = data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 300);

    this.server.to(`game:${data.roomId}`).emit('game:chat', {
      userId: client.data.userId,
      username: client.data.username,
      displayName: player.displayName,
      avatar: player.avatar,
      message: sanitized,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('game:reconnect')
  async handleReconnect(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(`game:${data.roomId}`);
    const state = await this.gameEngine.getState(data.roomId);
    if (state) {
      const safeState = this.getSafeStateForPlayer(state, client.data.userId);
      client.emit('game:reconnected', safeState);
    }
  }

  @OnEvent('notification.created')
  async handleNotification(data: { userId: string; notification: unknown }) {
    const socketId = await this.redis.get(`user:game-socket:${data.userId}`);
    if (socketId) {
      this.server.to(socketId).emit('notification:new', data.notification);
    }
  }

  private getSafeStateForPlayer(state: any, userId: string) {
    const safe = { ...state };
    safe.players = Object.fromEntries(
      Object.entries(state.players).map(([id, player]: [string, any]) => [
        id,
        {
          userId: player.userId,
          username: player.username,
          displayName: player.displayName,
          avatar: player.avatar,
          status: player.status,
          isHost: player.isHost,
          votes: player.votes,
          votedFor: player.votedFor,
          role: id === userId || state.phase === 'GAME_OVER' ? player.role : null,
          team: id === userId || state.phase === 'GAME_OVER' ? player.team : null,
          actionDone: id === userId ? player.actionDone : undefined,
        },
      ]),
    );
    return safe;
  }

  emitToRoom(roomId: string, event: string, data: unknown): void {
    this.server.to(`game:${roomId}`).emit(event, data);
  }

  emitToPlayer(userId: string, event: string, data: unknown): void {
    this.redis.get(`user:game-socket:${userId}`).then((socketId) => {
      if (socketId) this.server.to(socketId).emit(event, data);
    });
  }
}
