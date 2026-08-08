'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { calculateLevelProgress } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import DiscordBanner from '@/components/banner/DiscordBanner';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { GAME_TYPES } from '@/types';

const AVATAR_ICONS: Record<string, string> = {
  default:'🧑',warrior:'⚔️',mage:'🔮',rogue:'🗡️',vampire:'🧛',
  werewolf:'🐺',detective:'🔍',doctor:'💉',hunter:'🏹',ghost:'👻',guest:'👤',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { unreadCount, fetch: fetchNotifications } = useNotificationsStore();
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchNotifications();
    loadPublicRooms();
    loadFriends();
    // Her 8 saniyede otomatik yenile
    intervalRef.current = setInterval(loadPublicRooms, 8000);
    // Socket ile anlık güncelleme
    import('@/lib/socket').then(({ connectRoomSocket, getRoomSocket }) => {
      connectRoomSocket();
      const s = getRoomSocket();
      s.on('room:updated', loadPublicRooms);
      s.on('room:closed', loadPublicRooms);
      s.on('room:joined', loadPublicRooms);
    });
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAuthenticated]);

  const loadPublicRooms = async () => {
    try {
      const { data } = await api.get('/rooms/public');
      setPublicRooms((data.data || data).slice(0, 8));
    } catch {}
  };

  const loadFriends = async () => {
    try {
      const { data } = await api.get('/friends');
      setFriends((data.data || data).slice(0, 6));
    } catch {}
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const { data } = await api.post('/rooms/join', { codeOrId: joinCode.toUpperCase() });
      const room = data.data || data;
      toast.success('Odaya katıldın!');
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oda bulunamadı');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningId(roomId);
    try {
      const { data } = await api.post('/rooms/join', { codeOrId: roomId });
      const room = data.data || data;
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Katılamadın');
    } finally { setJoiningId(null); }
  };

  const profile = user?.profile;
  const stats = user?.statistics;
  const levelInfo = calculateLevelProgress(profile?.xp || 0);

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-fuchsia-600/4 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Sol kolon ── */}
          <div className="space-y-4">

            {/* Player card */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border-2 border-purple-500/20 flex items-center justify-center text-3xl">
                    {AVATAR_ICONS[profile?.avatar || 'default']}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 border-2 border-[#080b14] flex items-center justify-center text-xs font-black">
                    {levelInfo.level}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg truncate">{profile?.displayName || user?.username}</p>
                  <p className="text-xs text-gray-500">@{user?.username}</p>
                  {user?.isGuest && (
                    <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">Misafir</span>
                  )}
                </div>
                <Link href="/profile" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 transition-all" title="Profil">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </div>

              {/* XP Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-400 font-semibold">Seviye {levelInfo.level}</span>
                  <span className="text-gray-500">{levelInfo.currentXp} / {levelInfo.requiredXp} XP</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" style={{ boxShadow: '0 0 8px rgba(168,85,247,0.5)' }} />
                </div>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                  {[
                    { label: 'Oynadı', value: stats.gamesPlayed },
                    { label: 'Kazandı', value: stats.gamesWon },
                    { label: 'Oran', value: `${Math.round((stats.winRate || 0) * 100)}%` },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="font-black text-lg">{s.value}</p>
                      <p className="text-xs text-gray-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hızlı eylemler */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/room/create"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/12 hover:border-purple-500/40 transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                <span className="text-xs font-bold">Oda Oluştur</span>
              </Link>
              <Link href="/room/join"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/8 transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🔗</span>
                <span className="text-xs font-bold">Odaya Katıl</span>
              </Link>
            </div>

            {/* Discord Banner */}
            <DiscordBanner placement="dashboard" />

            {/* Kod ile katıl */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="text-xs font-semibold text-gray-400 mb-2">Kod ile Katıl</p>
              <form onSubmit={handleJoin} className="flex gap-2">
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}
                  placeholder="ABC123" maxLength={6}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm font-mono tracking-widest transition-all" />
                <button type="submit" disabled={joinCode.length < 3}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-sm disabled:opacity-40 transition-all active:scale-95">
                  →
                </button>
              </form>
            </div>

            {/* Online Arkadaşlar */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">👥 Arkadaşlar</p>
                <Link href="/friends" className="text-xs text-purple-400 hover:text-purple-300">Tümü →</Link>
              </div>
              {friends.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-xs">Henüz arkadaş yok</p>
                  <Link href="/friends" className="text-xs text-purple-400 hover:text-purple-300 mt-1 block">Arkadaş ekle →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f: any) => (
                    <div key={f.friendshipId} className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 flex items-center justify-center text-sm font-black">
                          {AVATAR_ICONS[f.friend?.profile?.avatar] || (f.friend?.profile?.displayName || f.friend?.username || '?')[0].toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0d1117] ${f.friend?.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                      </div>
                      <span className="text-sm truncate flex-1">{f.friend?.profile?.displayName || f.friend?.username}</span>
                      {f.friend?.isOnline && <span className="text-xs text-green-400">●</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sağ kolon ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Oyunlar */}
            <div>
              <h2 className="text-xl font-black mb-4">Oyunlar</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GAME_TYPES.map((game, i) => (
                  <motion.div key={game.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    {game.available ? (
                      <Link href="/room/create"
                        className="block rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/12 hover:border-purple-500/40 p-4 text-center transition-all group cursor-pointer">
                        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{game.icon}</div>
                        <div className="font-bold text-sm">{game.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{game.minPlayers}-{game.maxPlayers} oyuncu</div>
                        <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                          Oyna
                        </span>
                      </Link>
                    ) : (
                      <div className="rounded-2xl border border-white/5 bg-white/2 p-4 text-center opacity-40 cursor-not-allowed">
                        <div className="text-4xl mb-2">{game.icon}</div>
                        <div className="font-bold text-sm">{game.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{game.minPlayers}-{game.maxPlayers} oyuncu</div>
                        <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-700/30 text-gray-500 border border-gray-700/30">Yakında</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Açık Odalar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">Açık Odalar</h2>
                <button onClick={loadPublicRooms}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Yenile
                </button>
              </div>

              {publicRooms.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/2 p-12 text-center">
                  <div className="text-4xl mb-3">🏠</div>
                  <p className="text-gray-400 text-sm">Şu an açık oda yok</p>
                  <Link href="/room/create" className="mt-4 inline-block text-sm text-purple-400 hover:text-purple-300 font-medium">
                    İlk odayı sen oluştur →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {publicRooms.map((room, i) => (
                      <motion.div key={room.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 hover:border-white/10 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center text-xl flex-shrink-0">
                          {room.gameType === 'vampire-village' ? '🧛' : '🎮'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{room.name}</p>
                          <p className="text-xs text-gray-500">
                            {room.host?.profile?.displayName || room.host?.username}
                            {' · '}
                            {room.gameType === 'vampire-village' ? 'Vampir Köylü' : room.gameType || 'Oyun seçilmedi'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-center">
                            <p className="text-xs font-bold text-white">{room.players?.length || 0}/{room.maxPlayers}</p>
                            <p className="text-xs text-gray-600">oyuncu</p>
                          </div>
                          <button onClick={() => handleJoinRoom(room.id)}
                            disabled={joiningId === room.id}
                            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/30 text-purple-300 text-xs font-bold transition-all disabled:opacity-50 active:scale-95">
                            {joiningId === room.id ? '...' : 'Katıl'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
