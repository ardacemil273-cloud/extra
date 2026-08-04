'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { calculateLevelProgress, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { GAME_TYPES } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount, fetch: fetchNotifications } = useNotificationsStore();
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchNotifications();
    loadPublicRooms();
  }, [isAuthenticated]);

  const loadPublicRooms = async () => {
    try {
      const { data } = await api.get('/rooms/public');
      setPublicRooms((data.data || data).slice(0, 6));
    } catch {}
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const { data } = await api.post('/rooms/join', { codeOrId: joinCode.toUpperCase() });
      const room = data.data || data;
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oda bulunamadı');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const levelInfo = calculateLevelProgress(user?.profile?.xp || 0);
  const profile = user?.profile;
  const stats = user?.statistics;

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center">🎮</div>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">PartyVerse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <Link href="/dashboard" className="text-white font-medium">Oyunlar</Link>
            <Link href="/profile" className="hover:text-white transition-colors">Profil</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link href="/profile" className="relative p-2 rounded-lg hover:bg-white/5 transition-all">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-xs flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar */}
            <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 transition-all">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-xs">
                {(profile?.displayName || user?.username || '?')[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:block">{profile?.displayName || user?.username}</span>
            </Link>

            <button onClick={handleLogout} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all" title="Çıkış">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left - Player Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-2xl font-black">
                  {(profile?.displayName || user?.username || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-lg">{profile?.displayName || user?.username}</div>
                  <div className="text-sm text-gray-400">@{user?.username}</div>
                  {user?.isGuest && <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">Misafir</span>}
                </div>
              </div>

              {/* Level & XP */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-purple-400">Seviye {levelInfo.level}</span>
                  <span className="text-xs text-gray-500">{levelInfo.currentXp} / {levelInfo.requiredXp} XP</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                    style={{ boxShadow: '0 0 8px rgba(168,85,247,0.5)' }}
                  />
                </div>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
                  {[
                    { label: 'Oynadı', value: stats.gamesPlayed },
                    { label: 'Kazandı', value: stats.gamesWon },
                    { label: 'Kazanma %', value: `${Math.round((stats.winRate || 0) * 100)}%` },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="font-bold text-lg">{s.value}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/room/create" className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-purple-500/30 bg-purple-500/8 hover:bg-purple-500/15 hover:border-purple-500/50 transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
                <span className="text-sm font-semibold">Oda Oluştur</span>
              </Link>
              <Link href="/room/join" className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/8 hover:border-white/20 transition-all group">
                <span className="text-2xl group-hover:scale-110 transition-transform">🔗</span>
                <span className="text-sm font-semibold">Odaya Katıl</span>
              </Link>
            </div>

            {/* Join by code */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="text-sm font-semibold mb-3 text-gray-300">Kod ile Katıl</p>
              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm font-mono tracking-widest"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm transition-all active:scale-95">
                  Git
                </button>
              </form>
            </div>
          </div>

          {/* Right - Games + Public Rooms */}
          <div className="lg:col-span-2 space-y-8">

            {/* Games */}
            <div>
              <h2 className="text-xl font-bold mb-4">Oyunlar</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {GAME_TYPES.map((game, i) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {game.available ? (
                      <Link href="/room/create" className="block rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/12 hover:border-purple-500/40 p-4 text-center transition-all group cursor-pointer">
                        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{game.icon}</div>
                        <div className="font-bold text-sm">{game.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{game.minPlayers}-{game.maxPlayers} oyuncu</div>
                        <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">Oyna</span>
                      </Link>
                    ) : (
                      <div className="rounded-2xl border border-white/5 bg-white/2 p-4 text-center opacity-50 cursor-not-allowed">
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

            {/* Public Rooms */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Açık Odalar</h2>
                <button onClick={loadPublicRooms} className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Yenile
                </button>
              </div>

              {publicRooms.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/2 p-12 text-center">
                  <div className="text-4xl mb-3">🏠</div>
                  <p className="text-gray-400 text-sm">Şu an açık oda yok</p>
                  <Link href="/room/create" className="mt-4 inline-block text-sm text-purple-400 hover:text-purple-300">
                    İlk odayı sen oluştur →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicRooms.map((room, i) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/20 flex items-center justify-center text-lg">
                          {room.gameType === 'vampire-village' ? '🧛' : '🎮'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{room.name}</div>
                          <div className="text-xs text-gray-500">
                            Host: {room.host?.profile?.displayName || room.host?.username}
                            {' · '}
                            {room.gameType === 'vampire-village' ? 'Vampir Köylü' : room.gameType || 'Oyun seçilmedi'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {room.players?.length || 0}/{room.maxPlayers}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              const { data } = await api.post('/rooms/join', { codeOrId: room.id });
                              router.push(`/room/${(data.data || data).id}`);
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || 'Katılamadın');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/30 text-purple-300 text-xs font-semibold transition-all"
                        >
                          Katıl
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
