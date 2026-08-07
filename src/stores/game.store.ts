import { create } from 'zustand';
import { GameState, GamePlayer, GamePhase, ChatMessage, VampireRole } from '@/types';

interface NarratorMessage {
  id: string;
  message: string;
  type: string;
  timestamp: number;
}

interface GameStore {
  gameState: GameState | null;
  myRole: VampireRole | null;
  myTeam: string | null;
  isMyTurn: boolean;
  turnTargets: Array<{ userId: string; displayName: string; avatar: string }>;
  turnRole: VampireRole | null;
  turnDuration: number;
  messages: ChatMessage[];
  narratorMessages: NarratorMessage[];
  nightActiveRole: string | null;
  morningDeaths: Array<{ userId: string; displayName: string; avatar: string }>;
  voteResults: Array<{ userId: string; votes: number }>;
  eliminatedPlayer: { userId: string; displayName: string; role: string; avatar: string } | null;
  gameResult: {
    winnerTeam: string;
    narrator: string;
    allRoles: Record<string, { role: string; team: string }>;
  } | null;
  isConnected: boolean;

  setGameState: (state: GameState) => void;
  updateGameState: (partial: Partial<GameState>) => void;
  setMyRole: (role: VampireRole, team: string) => void;
  setMyTurn: (active: boolean, targets?: Array<{ userId: string; displayName: string; avatar: string }>, role?: VampireRole, duration?: number) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addNarratorMessage: (msg: NarratorMessage) => void;
  setNightActiveRole: (role: string | null) => void;
  setMorningDeaths: (deaths: Array<{ userId: string; displayName: string; avatar: string }>) => void;
  setVoteResults: (results: Array<{ userId: string; votes: number }>) => void;
  setEliminatedPlayer: (player: { userId: string; displayName: string; role: string; avatar: string } | null) => void;
  setGameResult: (result: GameStore['gameResult']) => void;
  setConnected: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  gameState: null,
  myRole: null,
  myTeam: null,
  isMyTurn: false,
  turnTargets: [],
  turnRole: null,
  turnDuration: 30,
  messages: [],
  narratorMessages: [],
  nightActiveRole: null,
  morningDeaths: [],
  voteResults: [],
  eliminatedPlayer: null,
  gameResult: null,
  isConnected: false,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setGameState: (state) => set({ gameState: state }),
  updateGameState: (partial) => set((s) => ({ gameState: s.gameState ? { ...s.gameState, ...partial } : null })),
  setMyRole: (role, team) => set({ myRole: role, myTeam: team }),
  setMyTurn: (active, targets = [], role = null, duration = 30) =>
    set({ isMyTurn: active, turnTargets: targets, turnRole: role, turnDuration: duration }),
  addChatMessage: (msg) =>
    set((s) => ({ messages: [...s.messages.slice(-99), msg] })),
  addNarratorMessage: (msg) =>
    set((s) => ({ narratorMessages: [...s.narratorMessages.slice(-19), msg] })),
  setNightActiveRole: (role) => set({ nightActiveRole: role }),
  setMorningDeaths: (deaths) => set({ morningDeaths: deaths }),
  setVoteResults: (results) => set({ voteResults: results }),
  setEliminatedPlayer: (player) => set({ eliminatedPlayer: player }),
  setGameResult: (result) => set({ gameResult: result }),
  setConnected: (v) => set({ isConnected: v }),
  reset: () => set(initialState),
}));
