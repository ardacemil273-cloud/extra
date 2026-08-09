import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { PrismaService } from '../../database/prisma.service';
import { SocketStateService } from '../../socket-state/socket-state.service';
import { UsersService } from '../../users/users.service';
import { GameState, GamePlayer, GameResult } from '../../game-engine/interfaces/game.interfaces';
import { RoomStatus } from '@prisma/client';

export type VampireRole = 'VAMPIRE' | 'DOCTOR' | 'DETECTIVE' | 'HUNTER' | 'VILLAGER';

const ROLE_TEAMS: Record<VampireRole, string> = {
  VAMPIRE: 'VAMPIRES',
  DOCTOR: 'VILLAGERS',
  DETECTIVE: 'VILLAGERS',
  HUNTER: 'VILLAGERS',
  VILLAGER: 'VILLAGERS',
};

const PHASE_DURATIONS = {
  NIGHT: 30,
  DAY_ANNOUNCEMENT: 15,
  DAY_DISCUSSION: 90,
  DAY_VOTING: 45,
  VOTE_RESULT: 10,
};

const NARRATOR_LINES = {
  game_start: [
    'Güneş ufuktan çekilirken, köy huzursuz bir sessizliğe büründü... Aranızda bir vampir gizleniyor.',
    'Karanlık çöküyor. Herkes rolünü biliyor ama hiçbir yüze güvenemezsiniz.',
  ],
  night_start: [
    'Gece başladı... Köylüler uyurken, karanlıkta gizli güçler harekete geçiyor.',
    'Ay yükseliyor. Sessizlik her şeyi sarıyor. Şimdi gece vakti...',
    'Dünya karardı. Gecenin karanlığında çok şey yaşanacak.',
  ],
  vampire_turn: ['Vampir, bu gece kimin kanını içeceğini seçiyor...', 'Gece ilerliyor... Vampirin pençeleri uzanıyor.'],
  doctor_turn: ['Doktor, bugün kimi koruyacağını belirliyor...', 'Şifacı elleri, bu gece bir hayatı kurtarabilir.'],
  detective_turn: ['Dedektif gözlerini kısıyor, şüphelisini sorguluyor...', 'Akıl yürütme vakti. Dedektif gerçeği arıyor.'],
  hunter_turn: ['Avcı silahını hazırlıyor. Bu gece kimi gözlemleyecek?'],
  morning: [
    'Şafak söküyor... Geceyi atlatabildik mi?',
    'Sabah ışığı her şeyi ortaya koyacak.',
    'Güneş doğuyor. Dün gecenin sırları açığa çıkıyor...',
  ],
  no_death: ['Bir mucize! Bu sabah kimse ölmedi. Ama tehlike hâlâ aramızda.', 'Güvenli bir gece geçirdik. Ama ne kadar sürer?'],
  player_died: (name: string) => [`Sabah olduğunda ${name} artık aramızda yoktu...`, `${name} gece vampirin kurbanı oldu. Kolu soğuk, yüzü solgundu...`],
  discussion: ['Konuşma vakti. Kim güvenilir, kim şüpheli? Dikkatli düşünün.', 'Aramızdaki vampiri bulmanın tek yolu konuşmak. Başlayın.'],
  voting: ['Artık karar verme zamanı. Oyunuzu kullanın.', 'Oylama başlıyor. Her oy belirleyici olabilir.'],
  eliminated: (name: string, role: string) => [
    `${name} oyuyla elenmiş ve kimliği açığa çıkmıştır: ${role}`,
    `Köy konuştu. ${name} gitmek zorunda. Rolü: ${role}`,
  ],
  vampire_wins: ['VAMPIRLER KAZANDI! Köy, karanlığa yenik düştü...', 'Vampirler tüm kurbanlarını tüketmiş, köyü ele geçirdi!'],
  villagers_win: ['KÖYLÜLER KAZANDI! Işık karanlığı yendi!', 'Vampir avlandı! Köy kurtuldu, zafer köylülerin!'],
  tie: ['Beraberlik... Kimse tam anlamıyla kazanamadı.'],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

@Injectable()
export class VampireVillageService {
  private readonly logger = new Logger(VampireVillageService.name);
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly roomToMatchId = new Map<string, string>();

  constructor(
    private readonly gameEngine: GameEngineService,
    private readonly prisma: PrismaService,
    private readonly socketState: SocketStateService,
    private readonly usersService: UsersService,
  ) {}

  async startGame(roomId: string, hostId: string, server: Server): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    if (!room) throw new BadRequestException('Oda bulunamadı');
    if (room.hostId !== hostId) throw new ForbiddenException('Sadece host oyunu başlatabilir');
    if (room.players.length < 4) throw new BadRequestException('En az 4 oyuncu gerekli');

    // Oda ayarlarını oku (host panelinden kaydedilen)
    const settings = (room.settings as any) || {};
    const gameSettings = {
      vampireCount: Math.min(settings.vampireCount || 1, Math.floor(room.players.length / 4)),
      hasDoctor: settings.hasDoctor !== false,
      hasDetective: settings.hasDetective !== false,
      hasHunter: settings.hasHunter === true,
    };

    const players: GamePlayer[] = room.players.map((rp) => ({
      userId: rp.userId,
      username: rp.user.username,
      displayName: rp.user.profile?.displayName || rp.user.username,
      avatar: rp.user.profile?.avatar || 'default',
      role: null,
      team: null,
      status: 'ALIVE',
      isHost: rp.isHost,
      votes: 0,
      votedFor: null,
      actionDone: false,
    }));

    const state = await this.gameEngine.createGameState(roomId, 'vampire-village', players);

    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.IN_GAME },
    });

    const match = await this.prisma.match.create({
      data: {
        roomId,
        gameType: 'vampire-village',
        players: {
          create: players.map((p) => ({
            userId: p.userId,
            isAlive: true,
          })),
        },
      },
    });

    this.roomToMatchId.set(roomId, match.id);

    const roleMap = this.assignRoles(players, gameSettings);
    await this.gameEngine.assignRoles(roomId, roleMap);

const updatedState = await this.gameEngine.getState(roomId);

    // 🔒 ROLE LEAK PREVENTION: Her oyuncuya SADECE kendi rolünü gönder (socket.to(userId))
    for (const [userId, roleData] of Object.entries(roleMap)) {
      const socketId = this.socketState.getGameSocket(userId);
      if (socketId) {
        server.to(socketId).emit('game:role-assigned', {
          userId,
          role: roleData.role,
          team: roleData.team,
        });
      }
    }

    const narratorLine = pickRandom(NARRATOR_LINES.game_start);
    server.to(`game:${roomId}`).emit('game:narrator', { message: narratorLine, type: 'game_start' });
    server.to(`game:${roomId}`).emit('game:started', { gameType: 'vampire-village', matchId: match.id });

    setTimeout(() => this.startNight(roomId, server), 3000);
  }

  async startNight(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);

    let state = await this.gameEngine.setPhase(roomId, 'NIGHT');
    if (!state) return;

    state = await this.gameEngine.updateState(roomId, (s) => ({
      ...s,
      round: s.round + 1,
      nightDeaths: [],
      savedByDoctor: null,
      detectiveTarget: null,
      detectiveResult: null,
      hunterTarget: null,
    }));

    const narratorLine = pickRandom(NARRATOR_LINES.night_start);
    server.to(`game:${roomId}`).emit('game:phase-change', {
      phase: 'NIGHT',
      round: state.round,
      narrator: narratorLine,
    });

    await this.processNightRoles(roomId, server, state);
  }

  private async processNightRoles(roomId: string, server: Server, state: GameState): Promise<void> {
    const alive = this.gameEngine.getAlivePlayers(state);
    const roles = this.getRolesPresent(alive);
    const roleOrder: VampireRole[] = ['VAMPIRE', 'DOCTOR', 'DETECTIVE', 'HUNTER'];

    for (const role of roleOrder) {
      if (!roles.has(role)) continue;

      const rolePlayer = alive.find((p) => p.role === role);
      if (!rolePlayer) continue;

      await this.awakeRole(roomId, role, rolePlayer.userId, server, state);
      await this.sleep(PHASE_DURATIONS.NIGHT * 1000);
    }

    await this.resolveNight(roomId, server);
  }

  private async awakeRole(
    roomId: string,
    role: VampireRole,
    userId: string,
    server: Server,
    state: GameState,
  ): Promise<void> {
    const narrators: Record<VampireRole, string[]> = {
      VAMPIRE: NARRATOR_LINES.vampire_turn,
      DOCTOR: NARRATOR_LINES.doctor_turn,
      DETECTIVE: NARRATOR_LINES.detective_turn,
      HUNTER: NARRATOR_LINES.hunter_turn,
      VILLAGER: [],
    };

    server.to(`game:${roomId}`).emit('game:night-role', {
      activeRole: role,
      narrator: pickRandom(narrators[role]),
    });

    const socketId = this.socketState.getGameSocket(userId);
    if (socketId) {
      const alive = this.gameEngine.getAlivePlayers(state);
      const targets = alive.filter((p) => p.userId !== userId).map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatar: p.avatar,
      }));

      server.to(socketId).emit('game:your-turn', { role, targets, duration: PHASE_DURATIONS.NIGHT });
    }
  }

  async handleAction(
    roomId: string,
    userId: string,
    action: string,
    targetId: string,
    server: Server,
  ): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state || state.phase !== 'NIGHT') return;

    const player = state.players[userId];
    if (!player || player.status !== 'ALIVE') throw new ForbiddenException('Bu işlemi yapamazsınız');
    if (player.actionDone) throw new BadRequestException('Bu tur zaten aksiyonunuzu kullandınız');

    const target = state.players[targetId];
    if (!target || target.status !== 'ALIVE') throw new BadRequestException('Geçersiz hedef');

    switch (action) {
      case 'VAMPIRE_KILL':
        if (player.role !== 'VAMPIRE') throw new ForbiddenException('Bu aksiyonu kullanamazsınız');
        await this.gameEngine.updateState(roomId, (s) => ({
          ...s,
          nightDeaths: [...s.nightDeaths, targetId],
          players: { ...s.players, [userId]: { ...s.players[userId], actionDone: true } },
        }));
        break;

      case 'DOCTOR_SAVE':
        if (player.role !== 'DOCTOR') throw new ForbiddenException('Bu aksiyonu kullanamazsınız');
        await this.gameEngine.updateState(roomId, (s) => ({
          ...s,
          savedByDoctor: targetId,
          players: { ...s.players, [userId]: { ...s.players[userId], actionDone: true } },
        }));
        break;

      case 'DETECTIVE_INVESTIGATE':
        if (player.role !== 'DETECTIVE') throw new ForbiddenException('Bu aksiyonu kullanamazsınız');
        const isVampire = target.role === 'VAMPIRE';
        await this.gameEngine.updateState(roomId, (s) => ({
          ...s,
          detectiveTarget: targetId,
          detectiveResult: isVampire ? 'SUSPICIOUS' : 'INNOCENT',
          players: { ...s.players, [userId]: { ...s.players[userId], actionDone: true } },
        }));
        const socketId = this.socketState.getGameSocket(userId);
        if (socketId) {
          server.to(socketId).emit('game:detective-result', {
            targetId,
            targetName: target.displayName,
            result: isVampire ? 'SUSPICIOUS' : 'INNOCENT',
            narrator: isVampire
              ? `${target.displayName} şüpheli görünüyor... Belki vampir olabilir.`
              : `${target.displayName} masum görünüyor. Tehdit değil.`,
          });
        }
        break;

      case 'HUNTER_WATCH':
        if (player.role !== 'HUNTER') throw new ForbiddenException('Bu aksiyonu kullanamazsınız');
        await this.gameEngine.updateState(roomId, (s) => ({
          ...s,
          hunterTarget: targetId,
          players: { ...s.players, [userId]: { ...s.players[userId], actionDone: true } },
        }));
        break;

      default:
        throw new BadRequestException('Geçersiz aksiyon');
    }
  }

  private async resolveNight(roomId: string, server: Server): Promise<void> {
    const state = await this.gameEngine.getState(roomId);
    if (!state) return;

    let actualDead: string[] = [];

    for (const deadId of state.nightDeaths) {
      if (state.savedByDoctor !== deadId) {
        actualDead.push(deadId);
      }
    }

    for (const deadId of actualDead) {
      await this.gameEngine.eliminatePlayer(roomId, deadId);
    }

    const updatedState = await this.gameEngine.getState(roomId);
    await this.gameEngine.setPhase(roomId, 'DAY_ANNOUNCEMENT');

    const morningNarrator = pickRandom(NARRATOR_LINES.morning);

    let deathAnnouncement: string;
    const deadPlayers = actualDead.map((id) => state.players[id]);

    if (deadPlayers.length === 0) {
      deathAnnouncement = pickRandom(NARRATOR_LINES.no_death);
    } else {
      const names = deadPlayers.map((p) => p.displayName).join(', ');
      deathAnnouncement = pickRandom(NARRATOR_LINES.player_died(names));
    }

    server.to(`game:${roomId}`).emit('game:morning', {
      phase: 'DAY_ANNOUNCEMENT',
      deaths: deadPlayers.map((p) => ({ userId: p.userId, displayName: p.displayName, avatar: p.avatar })),
      narrator: morningNarrator,
      deathAnnouncement,
      savedByDoctor: state.savedByDoctor !== null && state.nightDeaths.includes(state.savedByDoctor),
    });

    const winner = this.checkWinCondition(updatedState);
    if (winner) {
      await this.endGame(roomId, winner, server);
      return;
    }

    setTimeout(() => this.startDiscussion(roomId, server), PHASE_DURATIONS.DAY_ANNOUNCEMENT * 1000);
  }

  private async startDiscussion(roomId: string, server: Server): Promise<void> {
    await this.gameEngine.setPhase(roomId, 'DAY_DISCUSSION');

    server.to(`game:${roomId}`).emit('game:phase-change', {
      phase: 'DAY_DISCUSSION',
      duration: PHASE_DURATIONS.DAY_DISCUSSION,
      narrator: pickRandom(NARRATOR_LINES.discussion),
    });

    const timer = setTimeout(
      () => this.startVoting(roomId, server),
      PHASE_DURATIONS.DAY_DISCUSSION * 1000,
    );
    this.timers.set(`${roomId}:discussion`, timer);
  }

  private async startVoting(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);

    const state = await this.gameEngine.getState(roomId);
    if (!state) return;

    await this.gameEngine.setPhase(roomId, 'DAY_VOTING');

    const alive = this.gameEngine.getAlivePlayers(state);

    server.to(`game:${roomId}`).emit('game:phase-change', {
      phase: 'DAY_VOTING',
      duration: PHASE_DURATIONS.DAY_VOTING,
      narrator: pickRandom(NARRATOR_LINES.voting),
      candidates: alive.map((p) => ({ userId: p.userId, displayName: p.displayName, avatar: p.avatar })),
    });

    const timer = setTimeout(
      () => this.resolveVoting(roomId, server),
      PHASE_DURATIONS.DAY_VOTING * 1000,
    );
    this.timers.set(`${roomId}:voting`, timer);
  }

  private async resolveVoting(roomId: string, server: Server): Promise<void> {
    this.clearTimer(roomId);

    const state = await this.gameEngine.getState(roomId);
    if (!state) return;

    const results = this.gameEngine.getVoteResults(state);

    if (results.length === 0 || results[0].votes === 0) {
      server.to(`game:${roomId}`).emit('game:vote-result', {
        eliminated: null,
        narrator: 'Kimse oy kullanmadı. Vampir bu sefer kaçtı...',
      });
      setTimeout(() => this.startNight(roomId, server), PHASE_DURATIONS.VOTE_RESULT * 1000);
      return;
    }

    const topVotes = results[0].votes;
    const topCandidates = results.filter((r) => r.votes === topVotes);
    const eliminated = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    await this.gameEngine.eliminatePlayer(roomId, eliminated.userId);

    const player = state.players[eliminated.userId];
    const roleLabels: Record<string, string> = {
      VAMPIRE: '🧛 Vampir',
      DOCTOR: '💉 Doktor',
      DETECTIVE: '🔍 Dedektif',
      HUNTER: '🏹 Avcı',
      VILLAGER: '🧑 Köylü',
    };

    const narrator = pickRandom(
      NARRATOR_LINES.eliminated(player.displayName, roleLabels[player.role] || player.role),
    );

    await this.gameEngine.setPhase(roomId, 'VOTE_RESULT');

    server.to(`game:${roomId}`).emit('game:vote-result', {
      eliminated: {
        userId: player.userId,
        displayName: player.displayName,
        role: player.role,
        avatar: player.avatar,
      },
      results,
      narrator,
    });

    await this.prisma.matchPlayer.updateMany({
      where: {
        matchId: this.roomToMatchId.get(roomId) || '',
        userId: eliminated.userId,
      },
      data: { isAlive: false },
    });

    const updatedState = await this.gameEngine.getState(roomId);
    const winner = this.checkWinCondition(updatedState);

    if (winner) {
      setTimeout(() => this.endGame(roomId, winner, server), PHASE_DURATIONS.VOTE_RESULT * 1000);
    } else {
      setTimeout(() => this.startNight(roomId, server), PHASE_DURATIONS.VOTE_RESULT * 1000);
    }
  }

  private checkWinCondition(state: GameState): GameResult | null {
    const alive = this.gameEngine.getAlivePlayers(state);
    const aliveVampires = alive.filter((p) => p.role === 'VAMPIRE');
    const aliveVillagers = alive.filter((p) => p.role !== 'VAMPIRE');

    if (aliveVampires.length === 0) {
      return {
        winnerId: null,
        winnerTeam: 'VILLAGERS',
        reason: 'Tüm vampirler öldürüldü',
        players: this.calculateRewards(state, 'VILLAGERS'),
      };
    }

    if (aliveVampires.length >= aliveVillagers.length) {
      return {
        winnerId: null,
        winnerTeam: 'VAMPIRES',
        reason: 'Vampirler köylüleri geçti',
        players: this.calculateRewards(state, 'VAMPIRES'),
      };
    }

    return null;
  }

  private async endGame(roomId: string, result: GameResult, server: Server): Promise<void> {
    await this.gameEngine.setPhase(roomId, 'GAME_OVER');
    const state = await this.gameEngine.getState(roomId);

    const narrator =
      result.winnerTeam === 'VILLAGERS'
        ? pickRandom(NARRATOR_LINES.villagers_win)
        : pickRandom(NARRATOR_LINES.vampire_wins);

    server.to(`game:${roomId}`).emit('game:over', {
      ...result,
      narrator,
      allRoles: Object.fromEntries(
        Object.values(state.players).map((p) => [p.userId, { role: p.role, team: p.team }]),
      ),
    });

    const matchId = this.roomToMatchId.get(roomId);
    if (matchId) {
      await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          endedAt: new Date(),
          winnerTeam: result.winnerTeam,
          duration: Math.floor((Date.now() - state.startedAt) / 1000),
        },
      });

      for (const playerResult of result.players) {
        await this.prisma.matchPlayer.updateMany({
          where: { matchId, userId: playerResult.userId },
          data: { role: playerResult.role, isWinner: playerResult.isWinner },
        });

        await this.usersService.addXp(playerResult.userId, playerResult.xpEarned);
        await this.usersService.updateStatistics(playerResult.userId, {
          won: playerResult.isWinner,
          playTime: Math.floor((Date.now() - state.startedAt) / 1000),
        });

        await this.prisma.gameHistory.create({
          data: {
            userId: playerResult.userId,
            matchId,
            gameType: 'vampire-village',
            role: playerResult.role,
            isWinner: playerResult.isWinner,
            xpEarned: playerResult.xpEarned,
          },
        });
      }
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: RoomStatus.WAITING },
    });

    this.clearTimer(roomId);
    setTimeout(() => this.gameEngine.deleteState(roomId), 300000);
  }

  private assignRoles(players: GamePlayer[], settings?: { vampireCount: number; hasDoctor: boolean; hasDetective: boolean; hasHunter: boolean }): Record<string, { role: string; team: string }> {
    const count = players.length;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const roleMap: Record<string, { role: VampireRole; team: string }> = {};

    const vampireCount = settings ? Math.max(1, Math.min(settings.vampireCount, Math.floor(count / 4))) : Math.max(1, Math.floor(count / 4));
    let idx = 0;

    for (let i = 0; i < vampireCount; i++) {
      roleMap[shuffled[idx++].userId] = { role: 'VAMPIRE', team: 'VAMPIRES' };
    }

    if ((settings ? settings.hasDoctor : true) && count >= 5 && idx < shuffled.length) {
      roleMap[shuffled[idx++].userId] = { role: 'DOCTOR', team: 'VILLAGERS' };
    }
    if ((settings ? settings.hasDetective : true) && count >= 6 && idx < shuffled.length) {
      roleMap[shuffled[idx++].userId] = { role: 'DETECTIVE', team: 'VILLAGERS' };
    }
    if ((settings ? settings.hasHunter : false) && count >= 8 && idx < shuffled.length) {
      roleMap[shuffled[idx++].userId] = { role: 'HUNTER', team: 'VILLAGERS' };
    }

    while (idx < shuffled.length) {
      roleMap[shuffled[idx++].userId] = { role: 'VILLAGER', team: 'VILLAGERS' };
    }

    return roleMap;
  }

  private calculateRewards(
    state: GameState,
    winnerTeam: string,
  ): Array<{ userId: string; role: string; isWinner: boolean; xpEarned: number }> {
    return Object.values(state.players).map((p) => {
      const isWinner = p.team === winnerTeam;
      let xpEarned = isWinner ? 100 : 30;

      if (p.status === 'ALIVE' && isWinner) xpEarned += 50;
      if (p.role === 'VAMPIRE' && isWinner) xpEarned += 30;
      if (p.role === 'DETECTIVE' && isWinner) xpEarned += 20;
      if (p.role === 'DOCTOR' && isWinner) xpEarned += 20;

      return { userId: p.userId, role: p.role, isWinner, xpEarned };
    });
  }

  private getRolesPresent(players: GamePlayer[]): Set<string> {
    return new Set(players.map((p) => p.role).filter(Boolean));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
