import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { RoomStatus } from '@prisma/client';

export type ItemCategory = 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory' | 'hair';

export interface WardrobeItem {
  id: string;
  category: ItemCategory;
  name: string;
  emoji: string;
  color: string;
}

export const THEMES = [
  { id: 'First Date', name: 'İlk Buluşma', emoji: '💘', desc: 'Romantik ve zarif görün, kalpleri kazan!' },
  { id: 'Festival', name: 'Festival', emoji: '🎪', desc: 'Renkli ve eğlenceli, festival ruhunu yakala!' },
  { id: 'Wedding', name: 'Düğün', emoji: '💍', desc: 'Işıltılı ve muhteşem, düğün gecesine hazır ol!' },
];

export const WARDROBE: WardrobeItem[] = [
  // tops
  { id: 'top-pink', category: 'top', name: 'Pembe Bluz', emoji: '👚', color: '#ffb6c1' },
  { id: 'top-blue', category: 'top', name: 'Mavi Bluz', emoji: '👕', color: '#87ceeb' },
  { id: 'top-mint', category: 'top', name: 'Nane Bluz', emoji: '👚', color: '#98fb98' },
  { id: 'top-lav', category: 'top', name: 'Lavanta Bluz', emoji: '👕', color: '#b39ddb' },
  // bottoms
  { id: 'bot-pink', category: 'bottom', name: 'Pembe Etek', emoji: '👗', color: '#f48fb1' },
  { id: 'bot-jean', category: 'bottom', name: 'Kot Pantolon', emoji: '👖', color: '#5c6bc0' },
  { id: 'bot-black', category: 'bottom', name: 'Siyah Pantolon', emoji: '👖', color: '#37474f' },
  // dresses
  { id: 'dress-white', category: 'dress', name: 'Beyaz Gelinlik', emoji: '👰', color: '#ffffff' },
  { id: 'dress-pink', category: 'dress', name: 'Pembe Düğün Elbisesi', emoji: '👰', color: '#ffc1e3' },
  { id: 'dress-purple', category: 'dress', name: 'Mor Balo Elbisesi', emoji: '👗', color: '#ce93d8' },
  // shoes
  { id: 'shoe-pink', category: 'shoes', name: 'Pembe Topuklu', emoji: '👠', color: '#f06292' },
  { id: 'shoe-red', category: 'shoes', name: 'Kırmızı Topuklu', emoji: '👠', color: '#ef5350' },
  { id: 'shoe-purple', category: 'shoes', name: 'Mor Ayakkabı', emoji: '👠', color: '#9575cd' },
  // accessories
  { id: 'acc-crown', category: 'accessory', name: 'Taç', emoji: '👑', color: '#ffd54f' },
  { id: 'acc-neck', category: 'accessory', name: 'Kolye', emoji: '📿', color: '#80deea' },
  { id: 'acc-bow', category: 'accessory', name: 'Fiyonk', emoji: '🎀', color: '#f48fb1' },
  { id: 'acc-sung', category: 'accessory', name: 'Güneş Gözlüğü', emoji: '🕶️', color: '#455a64' },
  // hair
  { id: 'hair-blond', category: 'hair', name: 'Sarışın', emoji: '💇‍♀️', color: '#ffd54f' },
  { id: 'hair-brown', category: 'hair', name: 'Kahverengi', emoji: '💇‍♀️', color: '#8d6e63' },
  { id: 'hair-pink', category: 'hair', name: 'Pembe', emoji: '💇‍♀️', color: '#f48fb1' },
];

export interface FashionVote {
  voterId: string;
  targetId: string;
  stars: number;
}

export interface FashionState {
  round: number;
  theme: { id: string; name: string; emoji: string; desc: string };
  phase: 'DRESSING' | 'RUNWAY' | 'ROUND_RESULT' | 'GAME_OVER';
  dressTime: number; // seconds remaining in dressing
  looks: Record<string, { items: string[] }>; // userId -> equipped items
  submitted: string[];
  votes: FashionVote[];
  runwayOrder: string[];
  runwayPos: number;
  roundResults: Record<string, number>; // userId -> total stars
  totalScores: Record<string, number>;
  winnerId: string | null;
  podium: Array<{ userId: string; score: number }> | null;
  runwayTimer: number;
}

const DRESS_TIME = 60;
const RUNWAY_TIME = 9;

@Injectable()
export class FashionStarService {
  private readonly logger = new Logger(FashionStarService.name);
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
      team: 'FASHION',
      status: 'ALIVE' as const,
      isHost: rp.isHost,
      votes: 0,
      votedFor: null,
      actionDone: false,
    }));

    const state = await this.gameEngine.createGameState(roomId, 'fashion-star', players);

    const fashion: FashionState = {
      round: 0,
      theme: THEMES[0],
      phase: 'ROUND_RESULT',
      dressTime: DRESS_TIME,
      looks: {},
      submitted: [],
      votes: [],
      runwayOrder: players.map((p) => p.userId),
      runwayPos: -1,
      roundResults: {},
      totalScores: {},
      winnerId: null,
      podium: null,
      runwayTimer: RUNWAY_TIME,
    };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'PLAYING', fashion }));

    await this.prisma.room.update({ where: { id: roomId }, data: { status: RoomStatus.IN_GAME } });
    const match = await this.prisma.match.create({
      data: { roomId, gameType: 'fashion-star', players: { create: players.map((p) => ({ userId: p.userId })) } },
    });
    await this.redis.set(`game:match:${roomId}`, match.id);

    server.to(`game:${roomId}`).emit('game:started', { gameType: 'fashion-star', matchId: match.id });
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);

    setTimeout(() => this.startRound(roomId, server, 0), 3000);
  }

  private async startRound(roomId: string, server: Server, round: number): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;

    const fashion = (state as any).fashion as FashionState;
    const theme = THEMES[round % THEMES.length];

    fashion.round = round;
    fashion.theme = theme;
    fashion.phase = 'DRESSING';
    fashion.dressTime = DRESS_TIME;
    fashion.looks = {};
    fashion.submitted = [];
    fashion.votes = [];
    fashion.runwayOrder = Object.keys(state.players).sort(() => Math.random() - 0.5);
    fashion.runwayPos = -1;
    fashion.roundResults = {};
    fashion.runwayTimer = RUNWAY_TIME;

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'DRESSING', fashion }));

    server.to(`game:${roomId}`).emit('fashion:round-start', { round, theme, dressTime: DRESS_TIME });
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);

    const timer = setTimeout(() => this.startRunway(roomId, server), DRESS_TIME * 1000);
    this.timers.set(`${roomId}:dress`, timer);
  }

  async handlePickItem(roomId: string, userId: string, itemId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');
    const fashion = (state as any).fashion as FashionState;
    if (!fashion || fashion.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');

    const item = WARDROBE.find((w) => w.id === itemId);
    if (!item) throw new BadRequestException('Geçersiz kıyafet');

    if (!fashion.looks[userId]) fashion.looks[userId] = { items: [] };
    // max 8 items
    let items = fashion.looks[userId].items;
    if (items.length >= 8 && !items.includes(itemId)) throw new BadRequestException('Maksimum 8 parça');

    // replace if same category
    const others = items.filter((id) => WARDROBE.find((w) => w.id === id)?.category !== item.category);
    items = [...others, itemId];
    fashion.looks[userId] = { items };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, fashion }));
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);
  }

  async handleSubmitLook(roomId: string, userId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');
    const fashion = (state as any).fashion as FashionState;
    if (!fashion || fashion.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');

    if (!fashion.submitted.includes(userId)) fashion.submitted.push(userId);
    if (!fashion.looks[userId]) fashion.looks[userId] = { items: [] };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, fashion }));
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);
    server.to(`game:${roomId}`).emit('fashion:submitted', { userId });
  }

  private async startRunway(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;
    const fashion = (state as any).fashion as FashionState;

    fashion.phase = 'RUNWAY';
    fashion.runwayPos = 0;
    fashion.runwayTimer = RUNWAY_TIME;
    fashion.votes = [];

    // auto-submit anyone who didn't
    for (const uid of Object.keys(state.players)) {
      if (!fashion.looks[uid]) fashion.looks[uid] = { items: [] };
      if (!fashion.submitted.includes(uid)) fashion.submitted.push(uid);
    }

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'RUNWAY', fashion }));
    server.to(`game:${roomId}`).emit('fashion:runway-start', { runwayOrder: fashion.runwayOrder });
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);

    this.showLook(roomId, server, 0);
  }

  private showLook(roomId: string, server: Server, pos: number): void {
    this.clearTimer(roomId);
    const run = async () => {
      const state = await this.gameEngine.getState(roomId);
      if (!state || state.phase === 'GAME_OVER') return;
      const fashion = (state as any).fashion as FashionState;
      if (fashion.phase !== 'RUNWAY') return;

      const uid = fashion.runwayOrder[pos];
      if (!uid) {
        await this.endRound(roomId, server);
        return;
      }

      fashion.runwayPos = pos;
      fashion.runwayTimer = RUNWAY_TIME;
      fashion.votes = [];
      await this.gameEngine.updateState(roomId, (s) => ({ ...s, fashion }));
      server.to(`game:${roomId}`).emit('fashion:show-look', {
        userId: uid,
        displayName: state.players[uid]?.displayName,
        items: fashion.looks[uid]?.items || [],
        pos,
        total: fashion.runwayOrder.length,
      });

      const timer = setTimeout(() => this.showLook(roomId, server, pos + 1), RUNWAY_TIME * 1000);
      this.timers.set(`${roomId}:look${pos}`, timer);
    };
    run();
  }

  async handleVote(roomId: string, userId: string, targetId: string, stars: number, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'RUNWAY') throw new BadRequestException('Şu an podyum fazı değil');
    const fashion = (state as any).fashion as FashionState;
    if (!fashion || fashion.phase !== 'RUNWAY') throw new BadRequestException('Şu an podyum fazı değil');

    if (userId === targetId) throw new BadRequestException('Kendinize oy veremezsiniz');
    if (stars < 1 || stars > 5) throw new BadRequestException('1-5 yıldız arası oy verin');
    const target = state.players[targetId];
    if (!target) throw new BadRequestException('Hedef bulunamadı');

    // The runway target must be the one being shown
    const showing = fashion.runwayOrder[fashion.runwayPos];
    if (targetId !== showing) throw new BadRequestException('Bu oyuncu şu an podyumda değil');

    // Every player can vote once per look
    const existing = fashion.votes.find((v) => v.voterId === userId && v.targetId === targetId);
    if (existing) {
      existing.stars = stars;
    } else {
      fashion.votes.push({ voterId: userId, targetId, stars });
    }

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, fashion }));
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);
  }

  private async endRound(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;
    const fashion = (state as any).fashion as FashionState;

    // Compute average stars for each shown look
    const scores: Record<string, number> = {};
    for (const uid of fashion.runwayOrder) {
      const votes = fashion.votes.filter((v) => v.targetId === uid);
      if (votes.length === 0) {
        scores[uid] = 4; // base
      } else {
        const sum = votes.reduce((a, v) => a + v.stars, 0);
        scores[uid] = Math.round((sum / votes.length) * 10) / 10;
      }
    }

    for (const uid of Object.keys(scores)) {
      fashion.totalScores[uid] = (fashion.totalScores[uid] || 0) + scores[uid];
    }
    fashion.roundResults = scores;
    fashion.phase = 'ROUND_RESULT';

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'ROUND_RESULT', fashion }));

    server.to(`game:${roomId}`).emit('fashion:round-result', {
      round: fashion.round,
      scores,
      totalScores: fashion.totalScores,
      order: fashion.runwayOrder,
      looks: fashion.looks,
    });
    server.to(`game:${roomId}`).emit('fashion:state-update', fashion);

    if (fashion.round >= 2) {
      // game over — compute podium
      const podium = Object.entries(fashion.totalScores)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score);
      fashion.podium = podium;
      fashion.winnerId = podium[0]?.userId || null;
      fashion.phase = 'GAME_OVER';

      await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'GAME_OVER', fashion }));
      await this.endGame(roomId, podium, server);
    } else {
      const timer = setTimeout(() => this.startRound(roomId, server, fashion.round + 1), 6000);
      this.timers.set(`${roomId}:round`, timer);
    }
  }

  private async endGame(roomId: string, podium: Array<{ userId: string; score: number }>, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state) return;
    const fashion = (state as any).fashion as FashionState;

    const winnerId = podium[0]?.userId;
    const players = Object.values(state.players);
    const results = players.map((p) => ({
      userId: p.userId,
      role: 'stylist',
      isWinner: p.userId === winnerId,
      xpEarned: p.userId === winnerId ? 150 : 40,
    }));

    server.to(`game:${roomId}`).emit('fashion:podium', { podium, winnerId });
    server.to(`game:${roomId}`).emit('game:over', {
      gameType: 'fashion-star',
      won: winnerId,
      podium,
      narrator: winnerId
        ? `${state.players[winnerId]?.displayName} tarzıyla podyuma damga vurdu! 👑`
        : 'Herkes harika göründü!',
      players: results,
    });

    const matchId = await this.redis.get(`game:match:${roomId}`);
    if (matchId) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED', endedAt: new Date(), winnerId, winnerTeam: winnerId ? 'FASHION' : 'NONE', duration: Math.floor((Date.now() - state.startedAt) / 1000), state: { podium } },
      });
      for (const r of results) {
        await this.prisma.matchPlayer.updateMany({ where: { matchId, userId: r.userId }, data: { isWinner: r.isWinner } });
        await this.usersService.addXp(r.userId, r.xpEarned);
        await this.usersService.updateStatistics(r.userId, { won: r.isWinner, playTime: Math.floor((Date.now() - state.startedAt) / 1000) });
        await this.prisma.gameHistory.create({ data: { userId: r.userId, matchId, gameType: 'fashion-star', role: r.role, isWinner: r.isWinner, xpEarned: r.xpEarned } });
      }
    }

    await this.prisma.room.update({ where: { id: roomId }, data: { status: RoomStatus.WAITING } });
    setTimeout(() => this.gameEngine.deleteState(roomId), 300000);
  }

  private clearTimer(roomId: string): void {
    for (const [key, timer] of this.timers.entries()) {
      if (key.startsWith(roomId)) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    }
  }
}
