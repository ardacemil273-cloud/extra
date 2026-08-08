import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { RoomStatus } from '@prisma/client';

export type RecipeId = 'strawberry-cake' | 'burger' | 'salad' | 'pancake' | 'smoothie';
export type StationType = 'chop' | 'bake' | 'mix';

export interface Recipe {
  id: RecipeId;
  name: string;
  emoji: string;
  steps: StationType[];
  coins: number;
}

export const RECIPES: Record<RecipeId, Recipe> = {
  'strawberry-cake': { id: 'strawberry-cake', name: 'Çilekli Kek', emoji: '🍰', steps: ['mix', 'bake'], coins: 20 },
  burger: { id: 'burger', name: 'Burger', emoji: '🍔', steps: ['chop', 'bake'], coins: 20 },
  salad: { id: 'salad', name: 'Salata', emoji: '🥗', steps: ['chop', 'mix'], coins: 18 },
  pancake: { id: 'pancake', name: 'Pankek', emoji: '🥞', steps: ['mix', 'bake'], coins: 22 },
  smoothie: { id: 'smoothie', name: 'Smoothie', emoji: '🥤', steps: ['chop', 'mix'], coins: 18 },
};

const RECIPE_IDS: RecipeId[] = Object.keys(RECIPES) as RecipeId[];

export interface Order {
  id: string;
  recipe: RecipeId;
  stepIndex: number; // which station step is next
  assignedTo: string | null;
  createdAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'COMPLETE' | 'EXPIRED';
}

export interface CafeState {
  orders: Order[];
  served: number;
  goal: number;
  startTime: number;
  duration: number;
  remaining: number;
  status: 'PLAYING' | 'GAME_OVER';
  orderTimer: number;
  playerCooks: Record<string, number>; // userId -> served count
  winner: boolean;
}

const ORDER_INTERVAL = 15; // seconds
const ORDER_EXPIRY = 30; // seconds
const WIN_COUNT = 15;
const GAME_DURATION = 240; // 4 minutes
const MAX_ACTIVE_ORDERS = 12;

@Injectable()
export class CafeRushService {
  private readonly logger = new Logger(CafeRushService.name);
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly gameEngine: GameEngineService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly usersService: UsersService,
  ) {}

  async startGame(roomId: string, hostId: string, server: Server): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { players: { include: { user: { include: { profile: true } } } } },
    });
    if (!room) throw new BadRequestException('Oda bulunamadı');
    if (room.hostId !== hostId) throw new ForbiddenException('Sadece host oyunu başlatabilir');
    if (room.players.length < 2) throw new BadRequestException('En az 2 oyuncu gerekli');

    const players = room.players.map((rp) => ({
      userId: rp.userId,
      username: rp.user.username,
      displayName: rp.user.profile?.displayName || rp.user.username,
      avatar: rp.user.profile?.avatar || 'default',
      role: null,
      team: 'CAFE',
      status: 'ALIVE' as const,
      isHost: rp.isHost,
      votes: 0,
      votedFor: null,
      actionDone: false,
    }));

    const state = await this.gameEngine.createGameState(roomId, 'cafe-rush', players);

    const cafe: CafeState = {
      orders: [],
      served: 0,
      goal: WIN_COUNT,
      startTime: Date.now(),
      duration: GAME_DURATION,
      remaining: GAME_DURATION,
      status: 'PLAYING',
      orderTimer: ORDER_INTERVAL,
      playerCooks: {},
      winner: false,
    };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'SERVING', cafe }));

    await this.prisma.room.update({ where: { id: roomId }, data: { status: RoomStatus.IN_GAME } });
    const match = await this.prisma.match.create({
      data: { roomId, gameType: 'cafe-rush', players: { create: players.map((p) => ({ userId: p.userId })) } },
    });
    await this.redis.set(`game:match:${roomId}`, match.id);

    server.to(`game:${roomId}`).emit('game:started', { gameType: 'cafe-rush', matchId: match.id });
    server.to(`game:${roomId}`).emit('cafe:state-update', cafe);

    // Spawn first order
    this.spawnOrder(roomId, server);
    this.startTick(roomId, server);
  }

  private startTick(roomId: string, server: Server): void {
    this.clearTimer(roomId);
    const timer = setInterval(() => this.tick(roomId, server), 1000);
    this.timers.set(`${roomId}:tick`, timer);
  }

  private spawnOrder(roomId: string, server: Server): void {
    const recipe = RECIPE_IDS[Math.floor(Math.random() * RECIPE_IDS.length)];
    const now = Date.now();
    const order: Order = {
      id: Math.random().toString(36).slice(2, 10),
      recipe,
      stepIndex: 0,
      assignedTo: null,
      createdAt: now,
      expiresAt: now + ORDER_EXPIRY * 1000,
      status: 'ACTIVE',
    };
    this.mutateCafe(roomId, (c) => {
      if (c.orders.length < MAX_ACTIVE_ORDERS) c.orders.push(order);
    });
    server.to(`game:${roomId}`).emit('cafe:new-order', order);
    server.to(`game:${roomId}`).emit('cafe:state-update', this.getCafe(roomId));
  }

  private async tick(roomId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;
    const cafe = (state as any).cafe as CafeState;
    if (!cafe || cafe.status !== 'PLAYING') return;

    const now = Date.now();
    cafe.remaining = Math.max(0, Math.round(cafe.duration - (now - cafe.startTime) / 1000));

    // expire orders
    for (const o of cafe.orders) {
      if (o.status === 'ACTIVE' && now >= o.expiresAt) o.status = 'EXPIRED';
    }
    cafe.orders = cafe.orders.filter((o) => o.status !== 'EXPIRED' || (o.status === 'EXPIRED' && now - o.expiresAt < 2000));

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, cafe }));
    server.to(`game:${roomId}`).emit('cafe:tick', { remaining: cafe.remaining, orders: cafe.orders });
    server.to(`game:${roomId}`).emit('cafe:state-update', cafe);

    // check win/lose
    if (cafe.served >= cafe.goal) {
      await this.endGame(roomId, true, server);
      return;
    }
    if (cafe.remaining <= 0) {
      await this.endGame(roomId, false, server);
    }
  }

  async handleAction(roomId: string, userId: string, action: string, orderId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'SERVING') throw new BadRequestException('Oyun aktif değil');
    const cafe = (state as any).cafe as CafeState;
    if (!cafe || cafe.status !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');

    const order = cafe.orders.find((o) => o.id === orderId);
    if (!order || order.status !== 'ACTIVE') throw new BadRequestException('Sipariş bulunamadı ya da süresi doldu');

    const recipe = RECIPES[order.recipe];

    if (action === 'claim') {
      if (order.assignedTo && order.assignedTo !== userId) throw new BadRequestException('Bu sipariş başkasına ait');
      order.assignedTo = userId;
    } else if (action === 'advance') {
      if (order.assignedTo !== userId) throw new BadRequestException('Bu siparişi siz hazırlamıyorsunuz');
      order.stepIndex++;
      if (order.stepIndex >= recipe.steps.length) {
        order.status = 'COMPLETE';
        cafe.served++;
        cafe.playerCooks[userId] = (cafe.playerCooks[userId] || 0) + 1;
        server.to(`game:${roomId}`).emit('cafe:served', { orderId, userId });
        soundsTick(server, roomId, 'serve');
      }
    } else {
      throw new BadRequestException('Geçersiz aksiyon');
    }

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, cafe }));
    server.to(`game:${roomId}`).emit('cafe:state-update', cafe);
  }

  private async endGame(roomId: string, won: boolean, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state) return;
    const cafe = (state as any).cafe as CafeState;
    if (!cafe) return;

    cafe.status = 'GAME_OVER';
    cafe.winner = won;
    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'GAME_OVER', cafe }));

    const players = Object.values(state.players);
    const results = players.map((p) => ({
      userId: p.userId,
      role: 'chef',
      isWinner: won,
      xpEarned: won ? 100 + (cafe.playerCooks[p.userId] || 0) : 30,
    }));

    server.to(`game:${roomId}`).emit('game:over', {
      gameType: 'cafe-rush',
      won,
      served: cafe.served,
      goal: cafe.goal,
      reason: won ? 'Takım 15 siparişi tamamladı!' : 'Süre doldu!',
      narrator: won ? 'Mutfak harika çalıştı! 15 sipariş tamamlandı! 🍰' : 'Süre doldu... Siparişler yetişmedi!',
      players: results,
    });

    const matchId = await this.redis.get(`game:match:${roomId}`);
    if (matchId) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED', endedAt: new Date(), winnerTeam: won ? 'CAFE' : 'NONE', duration: Math.floor((Date.now() - state.startedAt) / 1000), state: { served: cafe.served, won } },
      });
      for (const r of results) {
        await this.prisma.matchPlayer.updateMany({ where: { matchId, userId: r.userId }, data: { role: r.role, isWinner: r.isWinner, score: cafe.playerCooks[r.userId] || 0 } });
        await this.usersService.addXp(r.userId, r.xpEarned);
        await this.usersService.updateStatistics(r.userId, { won: r.isWinner, playTime: Math.floor((Date.now() - state.startedAt) / 1000) });
        await this.prisma.gameHistory.create({ data: { userId: r.userId, matchId, gameType: 'cafe-rush', role: r.role, isWinner: r.isWinner, xpEarned: r.xpEarned } });
      }
    }

    await this.prisma.room.update({ where: { id: roomId }, data: { status: RoomStatus.WAITING } });
    setTimeout(() => this.gameEngine.deleteState(roomId), 300000);
  }

  private mutateCafe(roomId: string, fn: (c: CafeState) => void): void {
    // fire and forget — reads current, applies, saves (used for spawn)
    void this.gameEngine.updateState(roomId, (s) => {
      const cafe = (s as any).cafe as CafeState;
      if (cafe) fn(cafe);
      return s;
    });
  }

  private getCafe(roomId: string): CafeState | null {
    // placeholder for sync; actual values come from state-update events
    return null;
  }

  private clearTimer(roomId: string): void {
    for (const [key, timer] of this.timers.entries()) {
      if (key.startsWith(roomId)) {
        clearInterval(timer);
        this.timers.delete(key);
      }
    }
  }
}

function soundsTick(server: Server, roomId: string, type: string): void {
  server.to(`game:${roomId}`).emit('cafe:sound', { type });
}
