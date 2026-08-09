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
import { SocketStateService } from '../socket-state/socket-state.service';
import { GameEngineService } from './game-engine.service';
import { VampireVillageService } from '../games/vampire-village/vampire-village.service';
import { FarmTogetherService } from '../games/farm-together/farm-together.service';
import { FashionStarService } from '../games/fashion-star/fashion-star.service';
import { CafeRushService } from '../games/cafe-rush/cafe-rush.service';
import { BarbieDressupService } from '../games/barbie-dressup/barbie-dressup.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/game',
  cors: { origin: '*', credentials: true },
})
export class GameEngineGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameEngineGateway.name);

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
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly socketState: SocketStateService,
    private readonly gameEngine: GameEngineService,
    private readonly vampireVillage: VampireVillageService,
    private readonly farmTogether: FarmTogetherService,
    private readonly fashionStar: FashionStarService,
    private readonly cafeRush: CafeRushService,
    private readonly barbieDressup: BarbieDressupService,
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
      this.socketState.setGameSocket(payload.sub, client.id);

      this.logger.log(`Game socket connected: ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.socketState.removeGameSocket(client.data.userId);
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
      } else if (gameType === 'farm-together') {
        await this.farmTogether.startGame(roomId, client.data.userId, this.server);
      } else if (gameType === 'fashion-star') {
        await this.fashionStar.startGame(roomId, client.data.userId, this.server);
      } else if (gameType === 'cafe-rush') {
        await this.cafeRush.startGame(roomId, client.data.userId, this.server);
      } else if (gameType === 'barbie-dreamhouse') {
        await this.barbieDressup.startGame(roomId, client.data.userId, this.server);
      }
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  // ─── FARM TOGETHER ───
  @SubscribeMessage('farm:plant')
  async handleFarmPlant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; cellIndex: number; crop: string },
  ) {
    try {
      await this.farmTogether.handlePlant(data.roomId, client.data.userId, data.cellIndex, data.crop as any, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('farm:water')
  async handleFarmWater(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; cellIndex: number },
  ) {
    try {
      await this.farmTogether.handleWater(data.roomId, client.data.userId, data.cellIndex, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('farm:harvest')
  async handleFarmHarvest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; cellIndex: number },
  ) {
    try {
      await this.farmTogether.handleHarvest(data.roomId, client.data.userId, data.cellIndex, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('farm:sell')
  async handleFarmSell(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
      await this.farmTogether.handleSell(data.roomId, client.data.userId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  // ─── FASHION STAR ───
  @SubscribeMessage('fashion:pick-item')
  async handleFashionPick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; itemId: string },
  ) {
    try {
      await this.fashionStar.handlePickItem(data.roomId, client.data.userId, data.itemId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('fashion:submit-look')
  async handleFashionSubmit(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
      await this.fashionStar.handleSubmitLook(data.roomId, client.data.userId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('fashion:vote')
  async handleFashionVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetId: string; stars: number },
  ) {
    try {
      await this.fashionStar.handleVote(data.roomId, client.data.userId, data.targetId, data.stars, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  // ─── CAFE RUSH ───
  @SubscribeMessage('cafe:action')
  async handleCafeAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; action: string; orderId: string },
  ) {
    try {
      await this.cafeRush.handleAction(data.roomId, client.data.userId, data.action, data.orderId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

// ─── BARBIE DRESSUP ───
  @SubscribeMessage('barbie:pick-item')
  async handleBarbiePick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; itemId: string },
  ) {
    try {
      await this.barbieDressup.handlePickItem(data.roomId, client.data.userId, data.itemId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('barbie:makeup')
  async handleBarbieMakeup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; itemId: string },
  ) {
    try {
      await this.barbieDressup.handleMakeup(data.roomId, client.data.userId, data.itemId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('barbie:submit-look')
  async handleBarbieSubmit(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
      await this.barbieDressup.handleSubmitLook(data.roomId, client.data.userId, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('barbie:vote')
  async handleBarbieVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetId: string; stars: number },
  ) {
    try {
      await this.barbieDressup.handleVote(data.roomId, client.data.userId, data.targetId, data.stars, this.server);
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
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
      // 🔒 Rate limit aksiyon gönderimini
      if (this.isRateLimited(`action:${userId}`, 10, 5000)) {
        client.emit('game:error', { message: 'Çok fazla işlem denemesi' });
        return;
      }

      const state = await this.gameEngine.getState(roomId);
      if (!state) return;

      if (state.gameType === 'vampire-village') {
        await this.vampireVillage.handleAction(roomId, userId, action, targetId, this.server);
      }
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
    }
  }

@SubscribeMessage('game:vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetId: string },
  ) {
    const userId = client.data.userId;
    try {
      const state = await this.gameEngine.getState(data.roomId);
      if (!state) return;

      // 🔒 SERVER AUTHORITATIVE: Sadece DAY_VOTING fazında oy kullanılabilir
      if (state.phase !== 'DAY_VOTING') {
        client.emit('game:error', { message: 'Şu an oylama fazı değil' });
        return;
      }

      const voter = state.players[userId];
      if (!voter || voter.status !== 'ALIVE') {
        client.emit('game:error', { message: 'Bu işlemi yapamazsınız' });
        return;
      }

      const target = state.players[data.targetId];
      if (!target || target.status !== 'ALIVE') {
        client.emit('game:error', { message: 'Geçersiz hedef' });
        return;
      }

      // 🔒 Kendine oy veremez
      if (userId === data.targetId) {
        client.emit('game:error', { message: 'Kendinize oy veremezsiniz' });
        return;
      }

const updated = await this.gameEngine.castVote(data.roomId, userId, data.targetId);
      if (updated) {
        this.server.to(`game:${data.roomId}`).emit('game:vote-update', {
          votes: updated.votes,
          players: Object.fromEntries(
            Object.entries(updated.players).map(([id, p]) => [id, { votes: p.votes, votedFor: p.votedFor }]),
          ),
        });
      }
    } catch (err) {
      client.emit('game:error', { message: (err as Error).message });
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
    // 🔒 Sadece ALIVE oyuncular sohbet edebilir (spectator/ölü DEĞİL)
    if (!player || player.status !== 'ALIVE') return;

    // 🔒 Spam koruması: boş mesajı at
    const text = (data.message || '').trim();
    if (!text) return;

    // 🔒 Rate limit: saniyede max 5 mesaj
    if (this.isRateLimited(`chat:${client.data.userId}`, 5, 5000)) {
      client.emit('game:error', { message: 'Çok hızlı mesaj gönderiyorsun, lütfen yavaşla' });
      return;
    }

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

@SubscribeMessage('game:typing')
  handleGameTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    client.to(`game:${data.roomId}`).emit('game:typing', {
      userId: client.data.userId,
      username: client.data.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('game:emote')
  handleGameEmote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; emote: string },
  ) {
    const allowed = ['😂', '😮', '😡', '❤️', '👏', '👍', '🎉', '🤔'];
    if (!allowed.includes(data.emote)) return;
    this.server.to(`game:${data.roomId}`).emit('game:emote', {
      userId: client.data.userId,
      username: client.data.username,
      emote: data.emote,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('game:reconnect')
  async handleReconnect(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = client.data.userId;
    if (!userId) return;

    // Odaya tekrar katıl
    client.join(`game:${data.roomId}`);

    // Mevcut state'i gönder - ama güvenli versiyonu
    const state = await this.gameEngine.getState(data.roomId);
    if (state) {
      const safeState = this.getSafeStateForPlayer(state, userId);
      client.emit('game:reconnected', safeState);

      // Kendi rolünü tekrar gönder
      const player = state.players[userId];
      if (player?.role) {
        client.emit('game:role-assigned', {
          userId,
          role: player.role,
          team: player.team,
        });
      }

      // Timer sync
      if (state.timer?.active && state.timer.remaining > 0) {
        client.emit('game:timer-sync', { remaining: state.timer.remaining });
      }
    }
  }

  @OnEvent('notification.created')
  async handleNotification(data: { userId: string; notification: unknown }) {
    const socketId = this.socketState.getGameSocket(data.userId);
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
    const socketId = this.socketState.getGameSocket(userId);
    if (socketId) this.server.to(socketId).emit(event, data);
  }
}
