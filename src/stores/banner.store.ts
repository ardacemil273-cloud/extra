import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DiscordBanner {
  id: string;
  enabled: boolean;
  // Discord sunucu widget
  serverId: string;          // Discord server ID
  serverName: string;        // Görünen isim
  serverDescription: string; // Kısa açıklama
  inviteUrl: string;         // discord.gg/... linki
  iconUrl: string;           // Sunucu ikonu URL (boş olabilir)
  onlineCount: number;       // Manuel girilen online sayısı
  memberCount: number;       // Manuel girilen üye sayısı
  // Görünüm ayarları
  showOnLobby: boolean;
  showOnDashboard: boolean;
  showOnGame: boolean;
  accentColor: string;       // hex renk
  updatedAt: string;
}

interface BannerStore {
  banner: DiscordBanner;
  setBanner: (banner: Partial<DiscordBanner>) => void;
  resetBanner: () => void;
}

const DEFAULT_BANNER: DiscordBanner = {
  id: 'discord-banner-1',
  enabled: false,
  serverId: '',
  serverName: 'PartyVerse Discord',
  serverDescription: 'Oyuncularla tanış, takım kur, turnuvalara katıl!',
  inviteUrl: '',
  iconUrl: '',
  onlineCount: 0,
  memberCount: 0,
  showOnLobby: true,
  showOnDashboard: true,
  showOnGame: false,
  accentColor: '#5865F2',
  updatedAt: new Date().toISOString(),
};

export const useBannerStore = create<BannerStore>()(
  persist(
    (set) => ({
      banner: DEFAULT_BANNER,
      setBanner: (partial) =>
        set((s) => ({
          banner: { ...s.banner, ...partial, updatedAt: new Date().toISOString() },
        })),
      resetBanner: () => set({ banner: DEFAULT_BANNER }),
    }),
    {
      name: 'partyverse-banner',
    },
  ),
);
