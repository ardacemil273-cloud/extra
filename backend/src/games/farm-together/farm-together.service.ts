import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { RoomStatus } from '@prisma/client';

export type CropType = 'wheat' | 'strawberry' | 'pumpkin';

export interface CropDef {
  name: string;
  icon: string;
  duration: number; // seconds to grow
  value: number; // coins when harvested
  emoji: string;
}

export const CROPS: Record<CropType, CropDef> = {
  wheat: { name: 'Buğday', icon: '🌾', duration: 30, value: 10, emoji: '🌾' },
  strawberry: { name: 'Çilek', icon: '🍓', duration: 60, value: 20, emoji: '🍓' },
  pumpkin: { name: 'Kabak', icon: '🎃', duration: 120, value: 40, emoji: '🎃' },
};

export interface FarmCell {
  index: number;
  crop: CropType | null;
  plantedAt: number | null;
  wateredAt: number | null;
  wateredBy: string | null;
  grown: boolean;
  growth: number; // 0..1
}

export interface FarmState {
  grid: FarmCell[];
  coins: number;
  goal: number;
  startTime: number;
  duration: number; // seconds total
  remaining: number;
  status: 'COUNTDOWN' | 'PLAYING' | 'GAME_OVER';
  splash: Array<{ cell: number; userId: string; displayName: string; at: number }>;
  winner: boolean;
  playerStats: Record<string, { planted: number; harvested: number; watered: number }>;
}

const GRID_SIZE = 64; // 8x8
const COIN_GOAL = 1000;
const GAME_DURATION = 300; // 5 minutes

@Injectable()
export class FarmTogetherService {
  private readonly logger = new Logger(FarmTogetherService.name);
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
      team: 'FARM',
      status: 'ALIVE' as const,
      isHost: rp.isHost,
      votes: 0,
      votedFor: null,
      actionDone: false,
    }));

    const state = await this.gameEngine.createGameState(roomId, 'farm-together', players);

    const farmState: FarmState = {
      grid: Array.from({ length: GRID_SIZE }, (_, i) => ({
        index: i,
        crop: null,
        plantedAt: null,
        wateredAt: null,
        wateredBy: null,
        grown: false,
        growth: 0,
      })),
      coins: 0,
      goal: COIN_GOAL,
      startTime: Date.now(),
      duration: GAME_DURATION,
      remaining: GAME_DURATION,
      status: 'PLAYING',
      splash: [],
      winner: false,
      playerStats: {},
    };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'COUNTDOWN', farm: farmState }));

    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.IN_GAME },
    });

    const match = await this.prisma.match.create({
      data: {
        roomId,
        gameType: 'farm-together',
        players: { create: players.map((p) => ({ userId: p.userId, isAlive: true })) },
      },
    });

    await this.redis.set(`game:match:${roomId}`, match.id);

    server.to(`game:${roomId}`).emit('game:started', { gameType: 'farm-together', matchId: match.id });
    server.to(`game:${roomId}`).emit('farm:state-update', farmState);

    // Countdown 3s
    server.to(`game:${roomId}`).emit('farm:countdown', { countdown: 3 });
    setTimeout(() => {
      this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'PLAYING' }));
      this.startTick(roomId, server);
    }, 3000);
  }

  private startTick(roomId: string, server: Server): void {
    this.clearTimer(roomId);
    const timer = setInterval(() => this.tick(roomId, server), 1000);
    this.timers.set(`${roomId}:tick`, timer);
  }

  private async tick(roomId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;

    const farm = (state as any).farm as FarmState;
    if (!farm || farm.status !== 'PLAYING') return;

    const now = Date.now();
    farm.remaining = Math.max(0, Math.round(farm.duration - (now - farm.startTime) / 1000));

    // Update growth based on time + watering boost
    let grownAny = false;
    for (const cell of farm.grid) {
      if (!cell.crop || !cell.plantedAt) continue;
      const def = CROPS[cell.crop];
      let elapsed = (now - cell.plantedAt) / 1000;
      // each watering removes 5s of remaining time
      cell.growth = Math.min(1, elapsed / def.duration);
      if (cell.growth >= 1 && !cell.grown) {
        cell.grown = true;
        grownAny = true;
      }
    }

    // Clear old splashes
    farm.splash = farm.splash.filter((sp) => now - sp.at < 2500);

    await this.gameEngine.updateState(roomId, (s) => ({
      ...s,
      farm: { ...farm, remaining: farm.remaining },
    }));

    server.to(`game:${roomId}`).emit('farm:state-update', farm);

    if (grownAny) soundsTick(server, roomId, 'grown');

    // Check win / lose
    if (farm.coins >= farm.goal) {
      await this.endGame(roomId, true, server);
      return;
    }
    if (farm.remaining <= 0) {
      await this.endGame(roomId, false, server);
    }
  }

  async handlePlant(roomId: string, userId: string, cellIndex: number, crop: CropType, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');
    const farm = (state as any).farm as FarmState;
    if (!farm || farm.status !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');

    if (!CROPS[crop]) throw new BadRequestException('Geçersiz ürün');
    if (cellIndex < 0 || cellIndex >= GRID_SIZE) throw new BadRequestException('Geçersiz hücre');
    const cell = farm.grid[cellIndex];
    if (cell.crop) throw new BadRequestException('Bu hücre dolu');

    cell.crop = crop;
    cell.plantedAt = Date.now();
    cell.wateredAt = null;
    cell.wateredBy = null;
    cell.grown = false;
    cell.growth = 0;

    if (!farm.playerStats[userId]) farm.playerStats[userId] = { planted: 0, harvested: 0, watered: 0 };
    farm.playerStats[userId].planted++;

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, farm }));
    server.to(`game:${roomId}`).emit('farm:state-update', farm);
    server.to(`game:${roomId}`).emit('farm:planted', { cellIndex, crop, userId });
  }

  async handleWater(roomId: string, userId: string, cellIndex: number, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');
    const farm = (state as any).farm as FarmState;
    if (!farm || farm.status !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');

    const cell = farm.grid[cellIndex];
    if (!cell.crop || !cell.plantedAt) throw new BadRequestException('Burada ürün yok');

    // Watering: reduce remaining grow time by 5s (advance plantedAt)
    const now = Date.now();
    cell.plantedAt = now - Math.max(0, (now - cell.plantedAt) - 5000);
    cell.wateredAt = now;
    cell.wateredBy = userId;

    const player = state.players[userId];
    farm.splash.push({ cell: cellIndex, userId, displayName: player?.displayName || 'Biri', at: now });
    if (!farm.playerStats[userId]) farm.playerStats[userId] = { planted: 0, harvested: 0, watered: 0 };
    farm.playerStats[userId].watered++;

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, farm }));
    server.to(`game:${roomId}`).emit('farm:state-update', farm);
    server.to(`game:${roomId}`).emit('farm:watered', { cellIndex, userId });
    soundsTick(server, roomId, 'water');
  }

  async handleHarvest(roomId: string, userId: string, cellIndex: number, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');
    const farm = (state as any).farm as FarmState;
    if (!farm || farm.status !== 'PLAYING') throw new BadRequestException('Oyun aktif değil');

    const cell = farm.grid[cellIndex];
    if (!cell.crop || !cell.grown) throw new BadRequestException('Ürün henüz hazır değil');

    const def = CROPS[cell.crop];
    farm.coins += def.value;

    if (!farm.playerStats[userId]) farm.playerStats[userId] = { planted: 0, harvested: 0, watered: 0 };
    farm.playerStats[userId].harvested++;

    // Clear cell
    cell.crop = null;
    cell.plantedAt = null;
    cell.wateredAt = null;
    cell.wateredBy = null;
    cell.grown = false;
    cell.growth = 0;

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, farm }));
    server.to(`game:${roomId}`).emit('farm:state-update', farm);
    server.to(`game:${roomId}`).emit('farm:harvested', { cellIndex, coins: farm.coins, value: def.value, userId });
    soundsTick(server, roomId, 'harvest');
  }

  async handleSell(roomId: string, userId: string, server: Server): Promise<void> {
    // Sell is handled at harvest for simplicity (coins added directly).
    // Exists as a socket event for extensibility.
    void roomId; void userId; void server;
  }

  private async endGame(roomId: string, won: boolean, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state) return;
    const farm = (state as any).farm as FarmState;
    if (!farm) return;

    farm.status = 'GAME_OVER';
    farm.winner = won;

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'GAME_OVER', farm }));

    const players = Object.values(state.players);
    const results = players.map((p) => ({
      userId: p.userId,
      role: 'farmer',
      isWinner: won,
      xpEarned: won ? 100 : 30,
    }));

    server.to(`game:${roomId}`).emit('game:over', {
      gameType: 'farm-together',
      won,
      goal: farm.goal,
      coins: farm.coins,
      reason: won ? 'Takım hedefe ulaştı!' : 'Süre doldu!',
      narrator: won
        ? 'Harika bir hasat! Takım 1000 altına ulaştı! 🌾'
        : 'Süre doldu... Takım hedefe ulaşamadı. Tekrar deneyin!',
      players: results,
    });

    const matchId = await this.redis.get(`game:match:${roomId}`);
    if (matchId) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          endedAt: new Date(),
          winnerTeam: won ? 'FARM' : 'NONE',
          duration: Math.floor((Date.now() - state.startedAt) / 1000),
          state: { coins: farm.coins, goal: farm.goal, won },
        },
      });

      for (const r of results) {
        await this.prisma.matchPlayer.updateMany({
          where: { matchId, userId: r.userId },
          data: { role: r.role, isWinner: r.isWinner },
        });
        await this.usersService.addXp(r.userId, r.xpEarned);
        await this.usersService.updateStatistics(r.userId, {
          won: r.isWinner,
          playTime: Math.floor((Date.now() - state.startedAt) / 1000),
        });
        await this.prisma.gameHistory.create({
          data: { userId: r.userId, matchId, gameType: 'farm-together', role: r.role, isWinner: r.isWinner, xpEarned: r.xpEarned },
        });
      }
    }

    await this.prisma.room.update({ where: { id: roomId }, data: { status: RoomStatus.WAITING } });
    setTimeout(() => this.gameEngine.deleteState(roomId), 300000);
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

// lightweight inline sound helper (server -> client trigger)
function soundsTick(server: Server, roomId: string, type: string): void {
  server.to(`game:${roomId}`).emit('farm:sound', { type });
}
