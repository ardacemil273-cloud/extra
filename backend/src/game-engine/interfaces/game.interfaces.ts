export type GamePhase =
  | 'LOBBY'
  | 'NIGHT'
  | 'DAY_ANNOUNCEMENT'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'VOTE_RESULT'
  | 'GAME_OVER';

export type PlayerStatus = 'ALIVE' | 'DEAD' | 'SPECTATOR';

export interface GamePlayer {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  role: string | null;
  team: string | null;
  status: PlayerStatus;
  isHost: boolean;
  votes: number;
  votedFor: string | null;
  actionDone: boolean;
}

export interface GameTimer {
  id: string;
  duration: number;
  remaining: number;
  active: boolean;
}

export interface VoteEntry {
  voterId: string;
  targetId: string;
  timestamp: number;
}

export interface GameEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface GameState {
  id: string;
  roomId: string;
  gameType: string;
  phase: GamePhase;
  round: number;
  players: Record<string, GamePlayer>;
  events: GameEvent[];
  votes: VoteEntry[];
  timer: GameTimer | null;
  winner: string | null;
  winnerTeam: string | null;
  nightDeaths: string[];
  savedByDoctor: string | null;
  detectiveTarget: string | null;
  detectiveResult: string | null;
  hunterTarget: string | null;
  announcements: string[];
  startedAt: number;
  createdAt: number;
}

export interface RoleActionPayload {
  actorId: string;
  targetId: string;
  action: string;
  round: number;
}

export interface GameResult {
  winnerId: string | null;
  winnerTeam: string;
  reason: string;
  players: Array<{
    userId: string;
    role: string;
    isWinner: boolean;
    xpEarned: number;
  }>;
}
