import { Injectable, Logger } from "@nestjs/common";
import {
  GameState,
  GamePlayer,
  GamePhase,
  GameTimer,
} from "./interfaces/game.interfaces";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class GameEngineService {
  private readonly logger = new Logger(GameEngineService.name);
  private readonly gameStates = new Map<string, GameState>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  createGameState(
    roomId: string,
    gameType: string,
    players: GamePlayer[],
  ): GameState {
    const playersMap: Record<string, GamePlayer> = {};
    for (const p of players) {
      playersMap[p.userId] = {
        ...p,
        votes: 0,
        votedFor: null,
        actionDone: false,
      };
    }

    const state: GameState = {
      id: uuidv4(),
      roomId,
      gameType,
      phase: "LOBBY",
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

    this.saveState(roomId, state);
    return state;
  }

  getState(roomId: string): GameState | null {
    return this.gameStates.get(roomId) || null;
  }

  saveState(roomId: string, state: GameState): void {
    this.gameStates.set(roomId, state);
  }

  updateState(
    roomId: string,
    updater: (state: GameState) => GameState,
  ): GameState | null {
    const state = this.getState(roomId);
    if (!state) return null;
    const updated = updater(state);
    this.saveState(roomId, updated);
    return updated;
  }

  setPhase(roomId: string, phase: GamePhase): GameState | null {
    return this.updateState(roomId, (s) => ({
      ...s,
      phase,
      votes: [],
      events: [
        ...s.events,
        { type: "PHASE_CHANGE", payload: { phase }, timestamp: Date.now() },
      ],
    }));
  }

  startTimer(roomId: string, duration: number): void {
    const timer: GameTimer = {
      id: uuidv4(),
      duration,
      remaining: duration,
      active: true,
    };

    this.updateState(roomId, (s) => ({ ...s, timer }));
    this.eventEmitter.emit("game.timer.started", { roomId, timer });
  }

  clearTimer(roomId: string): void {
    this.updateState(roomId, (s) => ({ ...s, timer: null }));
  }

  addEvent(
    roomId: string,
    type: string,
    payload: Record<string, unknown>,
  ): void {
    this.updateState(roomId, (s) => ({
      ...s,
      events: [
        ...s.events.slice(-50),
        { type, payload, timestamp: Date.now() },
      ],
    }));
  }

  castVote(
    roomId: string,
    voterId: string,
    targetId: string,
  ): GameState | null {
    return this.updateState(roomId, (s) => {
      // 🔒 SERVER AUTHORITATIVE: Oylama sadece DAY_VOTING fazında, hayattaki oyuncular tarafından ve kendine oy verilmeden yapılabilir
      if (s.phase !== "DAY_VOTING") return s;
      const voter = s.players[voterId];
      const target = s.players[targetId];
      if (!voter || voter.status !== "ALIVE") return s;
      if (!target || target.status !== "ALIVE") return s;
      if (voterId === targetId) return s;

      const filteredVotes = s.votes.filter((v) => v.voterId !== voterId);
      const newVotes = [
        ...filteredVotes,
        { voterId, targetId, timestamp: Date.now() },
      ];

      const updatedPlayers = { ...s.players };
      for (const p of Object.values(updatedPlayers)) {
        p.votes = 0;
        p.votedFor = null;
      }

      for (const vote of newVotes) {
        if (updatedPlayers[vote.voterId])
          updatedPlayers[vote.voterId].votedFor = vote.targetId;
        if (updatedPlayers[vote.targetId])
          updatedPlayers[vote.targetId].votes++;
      }

      return { ...s, votes: newVotes, players: updatedPlayers };
    });
  }

  eliminatePlayer(roomId: string, userId: string): GameState | null {
    return this.updateState(roomId, (s) => {
      const players = { ...s.players };
      if (players[userId])
        players[userId] = { ...players[userId], status: "DEAD" };
      return { ...s, players };
    });
  }

  assignRoles(
    roomId: string,
    roleMap: Record<string, { role: string; team: string }>,
  ): GameState | null {
    return this.updateState(roomId, (s) => {
      const players = { ...s.players };
      for (const [userId, roleData] of Object.entries(roleMap)) {
        if (players[userId]) {
          players[userId] = {
            ...players[userId],
            role: roleData.role,
            team: roleData.team,
          };
        }
      }
      return { ...s, players };
    });
  }

  getAlivePlayers(state: GameState): GamePlayer[] {
    return Object.values(state.players).filter((p) => p.status === "ALIVE");
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

  deleteState(roomId: string): void {
    this.gameStates.delete(roomId);
  }
}
