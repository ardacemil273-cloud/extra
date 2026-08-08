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
  isSpeaking?: boolean;
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
    id: 'farm-together',
    name: 'Farm Together',
    description: 'Birlikte çiftçilik yap, ürün yetiştir, 1000 altına ulaş! 🌾',
    icon: '🌾',
    minPlayers: 2,
    maxPlayers: 8,
    tags: ['Kooperatif', 'Rahat', 'Çiftlik'],
    available: true,
  },
  {
    id: 'fashion-star',
    name: 'Fashion Star',
    description: 'Temalara uygun giyin, podyumda yıldız ol! 👗',
    icon: '👗',
    minPlayers: 2,
    maxPlayers: 8,
    tags: ['Moda', 'Yaratıcı', 'Eğlenceli'],
    available: true,
  },
{
    id: 'cafe-rush',
    name: 'Cafe Rush',
    description: 'Siparişleri yetiştir, mutfağı yönet, 15 sipariş tamamla! 🍰',
    icon: '🍰',
    minPlayers: 2,
    maxPlayers: 4,
    tags: ['Kooperatif', 'Hızlı', 'Mutfak'],
    available: true,
  },
  {
    id: 'barbie-dreamhouse',
    name: 'Barbie Dreamhouse',
    description: 'Rüya dolabını aç, Barbie\'yi giydir, yıldızı ol! 💖👛',
    icon: '💖👛',
    minPlayers: 2,
    maxPlayers: 8,
    tags: ['Moda', 'Barbie', 'Rüya'],
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
] as const;

export type GameTypeId = typeof GAME_TYPES[number]['id'];

// Farm Together types
export type CropType = 'wheat' | 'strawberry' | 'pumpkin';
export interface FarmCell {
  index: number;
  crop: CropType | null;
  plantedAt: number | null;
  wateredAt: number | null;
  wateredBy: string | null;
  grown: boolean;
  growth: number;
}
export interface FarmState {
  grid: FarmCell[];
  coins: number;
  goal: number;
  startTime: number;
  duration: number;
  remaining: number;
  status: 'COUNTDOWN' | 'PLAYING' | 'GAME_OVER';
  splash: Array<{ cell: number; userId: string; displayName: string; at: number }>;
  winner: boolean;
  playerStats: Record<string, { planted: number; harvested: number; watered: number }>;
}

// Fashion Star types
export type ItemCategory = 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory' | 'hair';
export interface WardrobeItem { id: string; category: ItemCategory; name: string; emoji: string; color: string; }
export interface FashionState {
  round: number;
  theme: { id: string; name: string; emoji: string; desc: string };
  phase: 'DRESSING' | 'RUNWAY' | 'ROUND_RESULT' | 'GAME_OVER';
  dressTime: number;
  looks: Record<string, { items: string[] }>;
  submitted: string[];
  votes: Array<{ voterId: string; targetId: string; stars: number }>;
  runwayOrder: string[];
  runwayPos: number;
  roundResults: Record<string, number>;
  totalScores: Record<string, number>;
  winnerId: string | null;
  podium: Array<{ userId: string; score: number }> | null;
  runwayTimer: number;
}

// Cafe Rush types
export type RecipeId = 'strawberry-cake' | 'burger' | 'salad' | 'pancake' | 'smoothie';
export interface Recipe { id: RecipeId; name: string; emoji: string; steps: Array<'chop' | 'bake' | 'mix'>; coins: number; }
export interface Order {
  id: string; recipe: RecipeId; stepIndex: number; assignedTo: string | null;
  createdAt: number; expiresAt: number; status: 'ACTIVE' | 'COMPLETE' | 'EXPIRED';
}
export interface CafeState {
  orders: Order[]; served: number; goal: number; startTime: number; duration: number;
  remaining: number; status: 'PLAYING' | 'GAME_OVER'; orderTimer: number;
  playerCooks: Record<string, number>; winner: boolean;
}

// Barbie Dreamhouse types
export type BarbieCategory = 'dress' | 'top' | 'bottom' | 'shoes' | 'bag' | 'hair' | 'makeup' | 'accessory';
export interface BarbieItem { id: string; category: BarbieCategory; name: string; emoji: string; color: string; }
export interface BarbieTheme { id: string; name: string; emoji: string; desc: string; }
export interface BarbieState {
  round: number;
  theme: BarbieTheme;
  phase: 'DRESSING' | 'BOX_REVEAL' | 'RUNWAY' | 'ROUND_RESULT' | 'GAME_OVER';
  dressTime: number;
  looks: Record<string, { items: string[]; makeup: string[] }>;
  submitted: string[];
  votes: Array<{ voterId: string; targetId: string; stars: number }>;
  runwayOrder: string[];
  runwayPos: number;
  roundResults: Record<string, number>;
  totalScores: Record<string, number>;
  winnerId: string | null;
  podium: Array<{ userId: string; score: number }> | null;
  runwayTimer: number;
}

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
