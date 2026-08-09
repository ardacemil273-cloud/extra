import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { RoomStatus } from '@prisma/client';

export type BarbieCategory =
  | 'dress' | 'top' | 'bottom' | 'shoes' | 'bag' | 'hair' | 'makeup' | 'accessory';

export interface WardrobeItem {
  id: string;
  category: BarbieCategory;
  name: string;
  emoji: string;
  color: string;
}

export const BARBIE_THEMES = [
  { id: 'malibu-beach', name: 'Malibu Beach Party', emoji: '🏖️', desc: 'Güneş, kum ve pembe! Malibu tarzını giy!' },
  { id: 'dreamhouse-pajama', name: 'Dreamhouse Pajama Party', emoji: '🛏️', desc: 'Rahat ve şirin pijama partisi!' },
  { id: 'princess-ball', name: 'Princess Ball', emoji: '👑', desc: 'Prenses balosu için ışıltılı bir prenses elbisesi!' },
  { id: 'fashion-week-paris', name: 'Fashion Week Paris', emoji: '🗼', desc: 'Paris moda haftası! Zirvede ol!' },
  { id: 'barbie-ken-date', name: 'Barbie & Ken Date Night', emoji: '💘', desc: 'Ken ile romantik bir akşam yemeği randevusu!' },
];

export const BARBIE_WARDROBE: WardrobeItem[] = [
  // Dresses
  { id: 'dress-pink-tulle', category: 'dress', name: 'Pembe Tül Elbise', emoji: '👗', color: '#ff69b4' },
  { id: 'dress-malibu-swim', category: 'dress', name: 'Malibu Mayo', emoji: '👙', color: '#ffb6c1' },
  { id: 'dress-princess-gown', category: 'dress', name: 'Prenses Balo Elbisesi', emoji: '👸', color: '#ffc0cb' },
  { id: 'dress-astronaut', category: 'dress', name: 'Astronot Takım', emoji: '👩‍🚀', color: '#e0e0e0' },
  { id: 'dress-doctor', category: 'dress', name: 'Doktor Önlüğü', emoji: '🥼', color: '#ffffff' },
  { id: 'dress-ceo', category: 'dress', name: 'CEO Barbie', emoji: '💼', color: '#ff69b4' },
  { id: 'dress-sequin', category: 'dress', name: 'Simli Gece Elbisesi', emoji: '✨', color: '#ffd700' },
  // Tops
  { id: 'top-crop-pink', category: 'top', name: 'Pembe Crop', emoji: '👚', color: '#ffb6c1' },
  { id: 'top-tank', category: 'top', name: 'Atlet', emoji: '🎽', color: '#fff0f5' },
  { id: 'top-blazer', category: 'top', name: 'Blazer Ceket', emoji: '🧥', color: '#ff69b4' },
  // Bottoms
  { id: 'bottom-skirt', category: 'bottom', name: 'Pembe Etek', emoji: '👗', color: '#ffc0cb' },
  { id: 'bottom-jeans', category: 'bottom', name: 'Kot Şort', emoji: '🩳', color: '#5c6bc0' },
  { id: 'bottom-tutu', category: 'bottom', name: 'Tutu', emoji: '🎀', color: '#ffb6c1' },
  // Shoes
  { id: 'shoe-heels-pink', category: 'shoes', name: 'Pembe Topuklu', emoji: '👠', color: '#ff69b4' },
  { id: 'shoe-sneakers', category: 'shoes', name: 'Pembe Spor', emoji: '👟', color: '#ffb6c1' },
  { id: 'shoe-boots', category: 'shoes', name: 'Uzun Çizme', emoji: '👢', color: '#ffc0cb' },
  { id: 'shoe-sandals', category: 'shoes', name: 'Malibu Sandalet', emoji: '🩴', color: '#fff0f5' },
  // Bags
  { id: 'bag-pink-clutch', category: 'bag', name: 'Pembe Clutch', emoji: '👛', color: '#ff69b4' },
  { id: 'bag-tote', category: 'bag', name: 'Alışveriş Çantası', emoji: '👜', color: '#ffc0cb' },
  { id: 'bag-backpack', category: 'bag', name: 'Pembe Sırt Çantası', emoji: '🎒', color: '#ffb6c1' },
  // Hair
  { id: 'hair-blond', category: 'hair', name: 'Sarışın', emoji: '💁‍♀️', color: '#ffd700' },
  { id: 'hair-pink', category: 'hair', name: 'Pembe Saç', emoji: '💇‍♀️', color: '#ff69b4' },
  { id: 'hair-ponytail', category: 'hair', name: 'At Kuyruğu', emoji: '💁‍♀️', color: '#fff0f5' },
  { id: 'hair-buns', category: 'hair', name: 'Topuz', emoji: '👧', color: '#ffe4b5' },
  // Makeup
  { id: 'makeup-lipstick-pink', category: 'makeup', name: 'Pembe Ruj', emoji: '💄', color: '#ff69b4' },
  { id: 'makeup-lipstick-red', category: 'makeup', name: 'Kırmızı Ruj', emoji: '💄', color: '#e91e63' },
  { id: 'makeup-eyeshadow', category: 'makeup', name: 'Far', emoji: '🎨', color: '#ffb6c1' },
  { id: 'makeup-blush', category: 'makeup', name: 'Allık', emoji: '🌸', color: '#ffc0cb' },
  // Accessories
  { id: 'acc-tiara', category: 'accessory', name: 'Taç', emoji: '👑', color: '#ffd700' },
  { id: 'acc-sunglasses', category: 'accessory', name: 'Güneş Gözlüğü', emoji: '🕶️', color: '#ff69b4' },
  { id: 'acc-necklace', category: 'accessory', name: 'Kolye', emoji: '📿', color: '#ffc0cb' },
  { id: 'acc-earrings', category: 'accessory', name: 'Küpe', emoji: '💎', color: '#ffb6c1' },
  { id: 'acc-bow', category: 'accessory', name: 'Fiyonk', emoji: '🎀', color: '#ff69b4' },
  { id: 'acc-crown', category: 'accessory', name: 'Barbie Tacı', emoji: '👑', color: '#ffd700' },
];

export interface BarbieVote {
  voterId: string;
  targetId: string;
  stars: number;
}

export interface BarbieState {
  round: number;
  theme: { id: string; name: string; emoji: string; desc: string };
  phase: 'DRESSING' | 'BOX_REVEAL' | 'RUNWAY' | 'ROUND_RESULT' | 'GAME_OVER';
  dressTime: number;
  looks: Record<string, { items: string[]; makeup: string[] }>;
  submitted: string[];
  votes: BarbieVote[];
  runwayOrder: string[];
  runwayPos: number;
  roundResults: Record<string, number>;
  totalScores: Record<string, number>;
  winnerId: string | null;
  podium: Array<{ userId: string; score: number }> | null;
  runwayTimer: number;
}

const DRESS_TIME = 60;
const BOX_TIME = 6;
const RUNWAY_TIME = 9;

const BARBIE_PHRASES = ['Hi Barbie!', 'You can be anything!', 'Barbie fever!', 'Ken-ergy!', "She's everything!", 'Slay, Barbie!'];

@Injectable()
export class BarbieDressupService {
  private readonly logger = new Logger(BarbieDressupService.name);
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly roomToMatchId = new Map<string, string>();

  constructor(
    private readonly gameEngine: GameEngineService,
    private readonly prisma: PrismaService,
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
      team: 'BARBIE',
      status: 'ALIVE' as const,
      isHost: rp.isHost,
      votes: 0,
      votedFor: null,
      actionDone: false,
    }));

    const state = await this.gameEngine.createGameState(roomId, 'barbie-dreamhouse', players);

    const barbie: BarbieState = {
      round: 0,
      theme: BARBIE_THEMES[0],
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

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'PLAYING', barbie }));

    await this.prisma.room.update({ where: { id: roomId }, data: { status: RoomStatus.IN_GAME } });
    const match = await this.prisma.match.create({
      data: { roomId, gameType: 'barbie-dreamhouse', players: { create: players.map((p) => ({ userId: p.userId })) } },
    });
    this.roomToMatchId.set(roomId, match.id);

    server.to(`game:${roomId}`).emit('game:started', { gameType: 'barbie-dreamhouse', matchId: match.id });
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);

    setTimeout(() => this.startRound(roomId, server, 0), 3000);
  }

  private async startRound(roomId: string, server: Server, round: number): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;

    const barbie = (state as any).barbie as BarbieState;
    const theme = BARBIE_THEMES[round % BARBIE_THEMES.length];

    barbie.round = round;
    barbie.theme = theme;
    barbie.phase = 'DRESSING';
    barbie.dressTime = DRESS_TIME;
    barbie.looks = {};
    barbie.submitted = [];
    barbie.votes = [];
    barbie.runwayOrder = Object.keys(state.players).sort(() => Math.random() - 0.5);
    barbie.runwayPos = -1;
    barbie.roundResults = {};
    barbie.runwayTimer = RUNWAY_TIME;

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'DRESSING', barbie }));

    server.to(`game:${roomId}`).emit('barbie:round-start', { round, theme, dressTime: DRESS_TIME });
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);

    const timer = setTimeout(() => this.startBoxReveal(roomId, server), DRESS_TIME * 1000);
    this.timers.set(`${roomId}:dress`, timer);
  }

  async handlePickItem(roomId: string, userId: string, itemId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');
    const barbie = (state as any).barbie as BarbieState;
    if (!barbie || barbie.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');

    const item = BARBIE_WARDROBE.find((w) => w.id === itemId);
    if (!item) throw new BadRequestException('Geçersiz kıyafet');

    if (!barbie.looks[userId]) barbie.looks[userId] = { items: [], makeup: [] };
    let items = barbie.looks[userId].items;
    if (items.length >= 8 && !items.includes(itemId)) throw new BadRequestException('Maksimum 8 parça');

    const others = items.filter((id) => BARBIE_WARDROBE.find((w) => w.id === id)?.category !== item.category);
    items = [...others, itemId];
    barbie.looks[userId] = { ...barbie.looks[userId], items };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, barbie }));
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);
    server.to(`game:${roomId}`).emit('barbie:equipped', { userId, itemId });
  }

  async handleMakeup(roomId: string, userId: string, itemId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');
    const barbie = (state as any).barbie as BarbieState;
    if (!barbie || barbie.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');

    const item = BARBIE_WARDROBE.find((w) => w.id === itemId && w.category === 'makeup');
    if (!item) throw new BadRequestException('Geçersiz makyaj');

    if (!barbie.looks[userId]) barbie.looks[userId] = { items: [], makeup: [] };
    let makeup = barbie.looks[userId].makeup;
    if (!makeup.includes(itemId)) makeup = [...makeup.slice(-2), itemId];
    barbie.looks[userId] = { ...barbie.looks[userId], makeup };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, barbie }));
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);
  }

  async handleSubmitLook(roomId: string, userId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');
    const barbie = (state as any).barbie as BarbieState;
    if (!barbie || barbie.phase !== 'DRESSING') throw new BadRequestException('Şu an giyinme fazı değil');

    if (!barbie.submitted.includes(userId)) barbie.submitted.push(userId);
    if (!barbie.looks[userId]) barbie.looks[userId] = { items: [], makeup: [] };

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, barbie }));
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);
    server.to(`game:${roomId}`).emit('barbie:submitted', { userId });
  }

  private async startBoxReveal(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;
    const barbie = (state as any).barbie as BarbieState;

    barbie.phase = 'BOX_REVEAL';
    barbie.runwayPos = 0;
    barbie.runwayTimer = BOX_TIME;
    barbie.votes = [];

    for (const uid of Object.keys(state.players)) {
      if (!barbie.looks[uid]) barbie.looks[uid] = { items: [], makeup: [] };
      if (!barbie.submitted.includes(uid)) barbie.submitted.push(uid);
    }

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'BOX_REVEAL', barbie }));
    server.to(`game:${roomId}`).emit('barbie:box-reveal', { runwayOrder: barbie.runwayOrder });
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);

    this.showLook(roomId, server, 0);
  }

  private showLook(roomId: string, server: Server, pos: number): void {
    this.clearTimer(roomId);
    const run = async () => {
      const state = await this.gameEngine.getState(roomId);
      if (!state || state.phase === 'GAME_OVER') return;
      const barbie = (state as any).barbie as BarbieState;
      if (barbie.phase !== 'BOX_REVEAL' && barbie.phase !== 'RUNWAY') return;

      const uid = barbie.runwayOrder[pos];
      if (!uid) {
        await this.endRound(roomId, server);
        return;
      }

      barbie.runwayPos = pos;
      barbie.runwayTimer = RUNWAY_TIME;
      barbie.votes = [];
      await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'RUNWAY', barbie }));

      const look = barbie.looks[uid];
      server.to(`game:${roomId}`).emit('barbie:show-look', {
        userId: uid,
        displayName: state.players[uid]?.displayName,
        items: look?.items || [],
        makeup: look?.makeup || [],
        pos,
        total: barbie.runwayOrder.length,
        phrase: BARBIE_PHRASES[Math.floor(Math.random() * BARBIE_PHRASES.length)],
      });

      const timer = setTimeout(() => this.showLook(roomId, server, pos + 1), RUNWAY_TIME * 1000);
      this.timers.set(`${roomId}:look${pos}`, timer);
    };
    run();
  }

  async handleVote(roomId: string, userId: string, targetId: string, stars: number, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'RUNWAY') throw new BadRequestException('Şu an podyum fazı değil');
    const barbie = (state as any).barbie as BarbieState;
    if (!barbie || barbie.phase !== 'RUNWAY') throw new BadRequestException('Şu an podyum fazı değil');

    if (userId === targetId) throw new BadRequestException('Kendinize oy veremezsiniz');
    if (stars < 1 || stars > 5) throw new BadRequestException('1-5 yıldız arası oy verin');
    if (!state.players[targetId]) throw new BadRequestException('Hedef bulunamadı');

    const showing = barbie.runwayOrder[barbie.runwayPos];
    if (targetId !== showing) throw new BadRequestException('Bu oyuncu şu an podyumda değil');

    const existing = barbie.votes.find((v) => v.voterId === userId && v.targetId === targetId);
    if (existing) existing.stars = stars;
    else barbie.votes.push({ voterId: userId, targetId, stars });

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, barbie }));
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);
  }

  private async endRound(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase === 'GAME_OVER') return;
    const barbie = (state as any).barbie as BarbieState;

    const scores: Record<string, number> = {};
    for (const uid of barbie.runwayOrder) {
      const votes = barbie.votes.filter((v) => v.targetId === uid);
      if (votes.length === 0) scores[uid] = 4;
      else scores[uid] = Math.round((votes.reduce((a, v) => a + v.stars, 0) / votes.length) * 10) / 10;
    }

    for (const uid of Object.keys(scores)) {
      barbie.totalScores[uid] = (barbie.totalScores[uid] || 0) + scores[uid];
    }
    barbie.roundResults = scores;
    barbie.phase = 'ROUND_RESULT';

    await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'ROUND_RESULT', barbie }));

    server.to(`game:${roomId}`).emit('barbie:round-result', {
      round: barbie.round,
      scores,
      totalScores: barbie.totalScores,
      order: barbie.runwayOrder,
      looks: barbie.looks,
    });
    server.to(`game:${roomId}`).emit('barbie:state-update', barbie);

    if (barbie.round >= 4) {
      const podium = Object.entries(barbie.totalScores)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score);
      barbie.podium = podium;
      barbie.winnerId = podium[0]?.userId || null;
      barbie.phase = 'GAME_OVER';

      await this.gameEngine.updateState(roomId, (s) => ({ ...s, phase: 'GAME_OVER', barbie }));
      await this.endGame(roomId, podium, server);
    } else {
      const timer = setTimeout(() => this.startRound(roomId, server, barbie.round + 1), 6000);
      this.timers.set(`${roomId}:round`, timer);
    }
  }

  private async endGame(roomId: string, podium: Array<{ userId: string; score: number }>, server: Server): Promise<void> {
    this.clearTimer(roomId);
    const state = await this.gameEngine.getState(roomId);
    if (!state) return;
    const barbie = (state as any).barbie as BarbieState;

    const winnerId = podium[0]?.userId;
    const players = Object.values(state.players);
    const results = players.map((p) => ({
      userId: p.userId,
      role: 'barbie',
      isWinner: p.userId === winnerId,
      xpEarned: p.userId === winnerId ? 200 : 50,
    }));

    server.to(`game:${roomId}`).emit('barbie:result', { podium, winnerId });
    server.to(`game:${roomId}`).emit('game:over', {
      gameType: 'barbie-dreamhouse',
      won: winnerId,
      podium,
      title: winnerId ? 'Barbie of the Year' : null,
      narrator: winnerId
        ? `👑 ${state.players[winnerId]?.displayName} — Barbie of the Year! You can be anything! 💖`
        : 'Herkes muhteşem bir Barbie oldu!',
      players: results,
    });

    const matchId = this.roomToMatchId.get(roomId);
    if (matchId) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED', endedAt: new Date(), winnerId, winnerTeam: winnerId ? 'BARBIE' : 'NONE', duration: Math.floor((Date.now() - state.startedAt) / 1000), state: { podium } },
      });
      for (const r of results) {
        await this.prisma.matchPlayer.updateMany({ where: { matchId, userId: r.userId }, data: { role: r.role, isWinner: r.isWinner } });
        await this.usersService.addXp(r.userId, r.xpEarned);
        await this.usersService.updateStatistics(r.userId, { won: r.isWinner, playTime: Math.floor((Date.now() - state.startedAt) / 1000) });
        await this.prisma.gameHistory.create({ data: { userId: r.userId, matchId, gameType: 'barbie-dreamhouse', role: r.role, isWinner: r.isWinner, xpEarned: r.xpEarned } });
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
