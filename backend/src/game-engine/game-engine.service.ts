import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { GameState, GamePlayer, GamePhase, GameTimer } from './interfaces/game.interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

const GAME_STATE_TTL = 7200; // 2 hours

@Injectable()
export class GameEngineService {
  private readonly logger = new Logger(GameEngineService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createGameState(roomId: string, gameType: string, players: GamePlayer[]): Promise<GameState> {
    const playersMap: Record<string, GamePlayer> = {};
    for (const p of players) {
      playersMap[p.userId] = { ...p, votes: 0, votedFor: null, actionDone: false };
    }

    const state: GameState = {
      id: uuidv4(),
      roomId,
      gameType,
      phase: 'LOBBY',
      round: 0,
      players: playersMap,
      events: [],
      votes: [],
      timer: null,
      winner: null,
      winnerTeam: null,
      nightDeaths: [],
      savedByDoctor: null,
      detectiveTarget: null,
      detectiveResult: null,
      hunterTarget: null,
      announcements: [],
      startedAt: Date.now(),
      createdAt: Date.now(),
    };

    await this.saveState(roomId, state);
    return state;
  }

  async getState(roomId: string): Promise<GameState | null> {
    return this.redis.getJson<GameState>(`game:state:${roomId}`);
  }

  async saveState(roomId: string, state: GameState): Promise<void> {
    await this.redis.setJson(`game:state:${roomId}`, state, GAME_STATE_TTL);
  }

  async updateState(
    roomId: string,
    updater: (state: GameState) => GameState,
  ): Promise<GameState | null> {
    const state = await this.getState(roomId);
    if (!state) return null;
    const updated = updater(state);
    await this.saveState(roomId, updated);
    return updated;
  }

  async setPhase(roomId: string, phase: GamePhase): Promise<GameState | null> {
    return this.updateState(roomId, (s) => ({ ...s, phase, votes: [], events: [...s.events, { type: 'PHASE_CHANGE', payload: { phase }, timestamp: Date.now() }] }));
  }

  async startTimer(roomId: string, duration: number): Promise<void> {
    const timer: GameTimer = {
      id: uuidv4(),
      duration,
      remaining: duration,
      active: true,
    };

    await this.updateState(roomId, (s) => ({ ...s, timer }));
    this.eventEmitter.emit('game.timer.started', { roomId, timer });
  }

  async clearTimer(roomId: string): Promise<void> {
    await this.updateState(roomId, (s) => ({ ...s, timer: null }));
  }

  async addEvent(roomId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    await this.updateState(roomId, (s) => ({
      ...s,
      events: [...s.events.slice(-50), { type, payload, timestamp: Date.now() }],
    }));
  }

async castVote(roomId: string, voterId: string, targetId: string): Promise<GameState | null> {
    return this.updateState(roomId, (s) => {
      // 🔒 SERVER AUTHORITATIVE: Oylama sadece DAY_VOTING fazında, hayattaki oyuncular tarafından ve kendine oy verilmeden yapılabilir
      if (s.phase !== 'DAY_VOTING') return s;
      const voter = s.players[voterId];
      const target = s.players[targetId];
      if (!voter || voter.status !== 'ALIVE') return s;
      if (!target || target.status !== 'ALIVE') return s;
      if (voterId === targetId) return s;

      const filteredVotes = s.votes.filter((v) => v.voterId !== voterId);
      const newVotes = [...filteredVotes, { voterId, targetId, timestamp: Date.now() }];

      const updatedPlayers = { ...s.players };
      for (const p of Object.values(updatedPlayers)) {
        p.votes = 0;
        p.votedFor = null;
      }

      for (const vote of newVotes) {
        if (updatedPlayers[vote.voterId]) updatedPlayers[vote.voterId].votedFor = vote.targetId;
        if (updatedPlayers[vote.targetId]) updatedPlayers[vote.targetId].votes++;
      }

      return { ...s, votes: newVotes, players: updatedPlayers };
    });
  }

  async eliminatePlayer(roomId: string, userId: string): Promise<GameState | null> {
    return this.updateState(roomId, (s) => {
      const players = { ...s.players };
      if (players[userId]) players[userId] = { ...players[userId], status: 'DEAD' };
      return { ...s, players };
    });
  }

  async assignRoles(roomId: string, roleMap: Record<string, { role: string; team: string }>): Promise<GameState | null> {
    return this.updateState(roomId, (s) => {
      const players = { ...s.players };
      for (const [userId, roleData] of Object.entries(roleMap)) {
        if (players[userId]) {
          players[userId] = { ...players[userId], role: roleData.role, team: roleData.team };
        }
      }
      return { ...s, players };
    });
  }

  getAlivePlayers(state: GameState): GamePlayer[] {
    return Object.values(state.players).filter((p) => p.status === 'ALIVE');
  }

  getVoteResults(state: GameState): Array<{ userId: string; votes: number }> {
    const counts: Record<string, number> = {};
    for (const vote of state.votes) {
      counts[vote.targetId] = (counts[vote.targetId] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([userId, votes]) => ({ userId, votes }))
      .sort((a, b) => b.votes - a.votes);
  }

  async deleteState(roomId: string): Promise<void> {
    await this.redis.del(`game:state:${roomId}`);
  }
}
