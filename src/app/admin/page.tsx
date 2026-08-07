'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface AdminRoom {
  id: string;
  code: string;
  name: string;
  status: string;
  gameType: string | null;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: string;
  players: { userId: string; user: { username: string; profile?: { displayName: string } } }[];
  host: { id: string; username: string; profile?: { displayName: string } };
}

// Admin kullanıcı adları — değiştir
const ADMIN_USERNAMES = ['admin', 'partyverse_admin', 'cemil1212'];

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'WAITING' | 'IN_GAME'>('all');
  const [stats, setStats] = useState({ totalRooms: 0, activeGames: 0, totalPlayers: 0, waitingRooms: 0 });

  const isAdmin = user && ADMIN_USERNAMES.includes(user.username);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!isAdmin) { router.push('/dashboard'); toast.error('Yetkisiz erişim'); return; }
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000); // 5 saniyede bir yenile
    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin]);

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms/public');
      const allRooms: AdminRoom[] = data.data || data;
      setRooms(allRooms);

      setStats({
        totalRooms: allRooms.length,
        activeGames: allRooms.filter((r) => r.status === 'IN_GAME').length,
        waitingRooms: allRooms.filter((r) => r.status === 'WAITING').length,
        totalPlayers: allRooms.reduce((sum, r) => sum + r.players.length, 0),
      });
    } catch {
      toast.error('Odalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`"${roomName}" odasını kapatmak istediğine emin misin?`)) return;
    try {
      // Admin direkt API ile odayı kapatır
      await api.delete(`/rooms/${roomId}/leave`);
      toast.success(`"${roomName}" odası kapatıldı`);
      fetchRooms();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oda kapatılamadı');
    }
  };

  const filtered = rooms.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.host?.username.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || r.status === filter;
    return matchSearch && matchFilter;
  });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-black text-lg">⚙️ Admin Paneli</h1>
              <p className="text-xs text-gray-500">PartyVerse yönetim konsolu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Otomatik yenileme: 5s</span>
            <button onClick={fetchRooms}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs transition-all">
              🔄 Yenile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Oda', value: stats.totalRooms, icon: '🏠', color: 'border-blue-500/20 bg-blue-500/5' },
            { label: 'Aktif Oyun', value: stats.activeGames, icon: '🎮', color: 'border-green-500/20 bg-green-500/5' },
            { label: 'Bekleyen', value: stats.waitingRooms, icon: '⏳', color: 'border-yellow-500/20 bg-yellow-500/5' },
            { label: 'Toplam Oyuncu', value: stats.totalPlayers, icon: '👥', color: 'border-purple-500/20 bg-purple-500/5' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-5 ${s.color}`}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Oda adı, kod veya host ara..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm transition-all"
          />
          <div className="flex gap-2">
            {(['all', 'WAITING', 'IN_GAME'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  filter === f
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-white/10 bg-white/3 text-gray-400 hover:border-white/20'
                }`}>
                {f === 'all' ? 'Hepsi' : f === 'WAITING' ? 'Bekliyor' : 'Oyunda'}
              </button>
            ))}
          </div>
        </div>

        {/* Oda listesi */}
        <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold">Odalar ({filtered.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🏠</div>
              <p className="text-gray-500">Oda bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-white/3">
              <AnimatePresence>
                {filtered.map((room, i) => (
                  <motion.div key={room.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-white/2 transition-all">

                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      room.status === 'IN_GAME' ? 'bg-green-400 animate-pulse' :
                      room.status === 'WAITING' ? 'bg-yellow-400' : 'bg-gray-600'
                    }`} />

                    {/* Oda bilgisi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{room.name}</span>
                        <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          {room.code}
                        </span>
                        {room.isPrivate && (
                          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">🔒 Özel</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          room.status === 'IN_GAME'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {room.status === 'IN_GAME' ? '🎮 Oyunda' : '⏳ Bekliyor'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>Host: <span className="text-gray-300">{room.host?.profile?.displayName || room.host?.username}</span></span>
                        <span>Oyuncu: <span className="text-gray-300">{room.players.length}/{room.maxPlayers}</span></span>
                        {room.gameType && <span>Oyun: <span className="text-gray-300">{room.gameType === 'vampire-village' ? '🧛 Vampir Köylü' : room.gameType}</span></span>}
                      </div>

                      {/* Oyuncu listesi */}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {room.players.map((p) => (
                          <span key={p.userId} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                            {p.user?.profile?.displayName || p.user?.username}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCloseRoom(room.id, room.name)}
                        className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all active:scale-95"
                      >
                        🔒 Kapat
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Admin not */}
        <p className="text-center text-xs text-gray-700">
          Admin paneline erişim: kullanıcı adın ADMIN_USERNAMES listesinde olmalı — şu an: {user?.username}
        </p>
      </main>
    </div>
  );
}
