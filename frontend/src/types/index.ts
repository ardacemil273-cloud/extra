export interface User {
  id: string;
  username: string;
  email?: string;
  isGuest: boolean;
  provider: 'LOCAL' | 'GOOGLE' | 'DISCORD' | 'GUEST';
  isOnline: boolean;
  lastSeen: string;
  profile?: Profile;
  statistics?: Statistics;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatar: string;
  bio?: string;
  country?: string;
  xp: number;
  level: number;
}

export interface Statistics {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalPlayTime: number;
  winRate: number;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Friend {
  friendshipId: string;
  friend: {
    id: string;
    username: string;
    isOnline: boolean;
    lastSeen: string;
    profile: { displayName: string; avatar: string; level: number };
  };
  since: string;
}

export interface FriendRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    isOnline: boolean;
    profile: { displayName: string; avatar: string; level: number };
  };
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'ROOM_INVITE' | 'ACHIEVEMENT' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    profile?: { displayName: string; avatar: string };
  };
}

export interface RoomPlayer {
  id: string;
  userId: string;
  isReady: boolean;
  isHost: boolean;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    isOnline: boolean;
    profile: { displayName: string; avatar: string; level: number };
  };
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  isPrivate: boolean;
  status: 'WAITING' | 'IN_GAME' | 'FINISHED';
  gameType?: string;
  settings: Record<string, unknown>;
  createdAt: string;
  players: RoomPlayer[];
  host: {
    id: string;
    username: string;
    profile: { displayName: string; avatar: string };
  };
}

export type GamePhase =
  | 'LOBBY'
  | 'NIGHT'
  | 'DAY_ANNOUNCEMENT'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'VOTE_RESULT'
  | 'GAME_OVER';

export type PlayerStatus = 'ALIVE' | 'DEAD' | 'SPECTATOR';

export type VampireRole = 'VAMPIRE' | 'DOCTOR' | 'DETECTIVE' | 'HUNTER' | 'VILLAGER';

export interface GamePlayer {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  role: VampireRole | null;
  team: string | null;
  status: PlayerStatus;
  isHost: boolean;
  votes: number;
  votedFor: string | null;
  actionDone?: boolean;
}

export interface VoteEntry {
  voterId: string;
  targetId: string;
  timestamp: number;
}

export interface GameState {
  id: string;
  roomId: string;
  gameType: string;
  phase: GamePhase;
  round: number;
  players: Record<string, GamePlayer>;
  votes: VoteEntry[];
  timer: { duration: number; remaining: number; active: boolean } | null;
  winner: string | null;
  winnerTeam: string | null;
  announcements: string[];
  startedAt: number;
}

export interface ChatMessage {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  message: string;
  timestamp: number;
}

export interface VoiceState {
  userId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  pushToTalk: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export const GAME_TYPES = [
  {
    id: 'vampire-village',
    name: 'Vampir Köylü',
    description: 'Arandaki vampiri bul! Roller: Vampir, Doktor, Dedektif, Avcı, Köylü',
    icon: '🧛',
    minPlayers: 4,
    maxPlayers: 16,
    tags: ['Rol Oyunu', 'Strateji', 'Sosyal'],
    available: true,
  },
  {
    id: 'mafia',
    name: 'Mafya',
    description: 'Klasik mafya oyunu. Yakında geliyor!',
    icon: '🔫',
    minPlayers: 6,
    maxPlayers: 20,
    tags: ['Rol Oyunu', 'Strateji'],
    available: false,
  },
  {
    id: 'bomb-party',
    name: 'Bomb Party',
    description: 'Kelime oyunu. Yakında geliyor!',
    icon: '💣',
    minPlayers: 2,
    maxPlayers: 10,
    tags: ['Kelime', 'Hızlı'],
    available: false,
  },
  {
    id: 'draw-guess',
    name: 'Çizim Oyunu',
    description: 'Çiz ve tahmin et. Yakında geliyor!',
    icon: '🎨',
    minPlayers: 2,
    maxPlayers: 12,
    tags: ['Yaratıcı', 'Eğlenceli'],
    available: false,
  },
] as const;

export const ROLE_CONFIG: Record<VampireRole, {
  name: string;
  icon: string;
  description: string;
  color: string;
  bgClass: string;
}> = {
  VAMPIRE: {
    name: 'Vampir',
    icon: '🧛',
    description: 'Her gece bir köylüyü seç ve ortadan kaldır. Amacın köyü ele geçirmek.',
    color: '#ef4444',
    bgClass: 'role-vampire',
  },
  DOCTOR: {
    name: 'Doktor',
    icon: '💉',
    description: 'Her gece bir oyuncuyu vampirin saldırısından koru.',
    color: '#22c55e',
    bgClass: 'role-doctor',
  },
  DETECTIVE: {
    name: 'Dedektif',
    icon: '🔍',
    description: 'Her gece bir oyuncuyu sorgula. Vampir mi, masum mu?',
    color: '#3b82f6',
    bgClass: 'role-detective',
  },
  HUNTER: {
    name: 'Avcı',
    icon: '🏹',
    description: 'Şüphelileri gözlemle. Gündüz oylamasında etkili ol.',
    color: '#f59e0b',
    bgClass: 'role-hunter',
  },
  VILLAGER: {
    name: 'Köylü',
    icon: '🧑',
    description: 'Vampiri bul ve gündüz oylamasıyla etkisiz hale getir.',
    color: '#9ca3af',
    bgClass: 'role-villager',
  },
};
