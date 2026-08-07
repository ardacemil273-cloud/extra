'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Admin şifresi — istediğin gibi değiştir
const ADMIN_PASSWORD = 'partyverse2026';

interface AdminRoom {
  id: string;
  code: string;
  name: string;
  status: string;
  gameType: string | null;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: string;
  players: { userId: string; isHost: boolean; user: { username: string; profile?: { displayName: string } } }[];
  host: { id: string; username: string; profile?: { displayName: string } };
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'WAITING' | 'IN_GAME'>('all');
  const [resetting, setResetting] = useState(false);
  const [stats, setStats] = useState({ totalRooms: 0, activeGames: 0, waitingRooms: 0, totalPlayers: 0 });

  // Sayfa açılınca session'dan kontrol et
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed');
    if (saved === 'yes') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, [authed]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rooms/public');
      const list: AdminRoom[] = data.data || data;
      setRooms(list);
      setStats({
        totalRooms: list.length,
        activeGames: list.filter((r) => r.status === 'IN_GAME').length,
        waitingRooms: list.filter((r) => r.status === 'WAITING').length,
        totalPlayers: list.reduce((s, r) => s + r.players.length, 0),
      });
    } catch {
      // backend yoksa boş göster
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('admin_authed', 'yes');
      toast.success('Admin panele hoş geldin!');
    } else {
      toast.error('Yanlış şifre');
      setPwInput('');
    }
  };

  const handleCloseRoom = async (room: AdminRoom) => {
    if (!confirm(`"${room.name}" odasını kapatmak istediğine emin misin?\n${room.players.length} oyuncu çıkarılacak.`)) return;
    try {
      // Host olarak çık → oda kapanır
      await api.delete(`/rooms/${room.id}/leave`);
      toast.success(`"${room.name}" kapatıldı`);
      fetchRooms();
    } catch {
      // Direkt API yoksa socket ile kapatabiliriz, şimdilik bilgi ver
      toast.error('Oda kapatılamadı — backend bağlantısı yok');
    }
  };

  const handleResetAllRooms = async () => {
    if (!confirm('TÜM ODALARI kapatmak istediğine emin misin? Bu işlem geri alınamaz!')) return;
    setResetting(true);
    let closed = 0;
    for (const room of rooms) {
      try {
        await api.delete(`/rooms/${room.id}/leave`);
        closed++;
      } catch {}
    }
    toast.success(`${closed} oda kapatıldı`);
    setResetting(false);
    fetchRooms();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authed');
    setAuthed(false);
  };

  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase();
    const match = r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.host?.username?.toLowerCase().includes(q);
    const statusMatch = filter === 'all' || r.status === filter;
    return match && statusMatch;
  });

  // ─── Giriş ekranı ───────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⚙️</div>
            <h1 className="text-2xl font-black">Admin Paneli</h1>
            <p className="text-gray-500 text-sm mt-1">PartyVerse yönetim konsolu</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Admin Şifresi</label>
                <input
                  type="password"
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                  required
                />
              </div>
              <button type="submit"
                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all active:scale-95">
                Giriş Yap
              </button>
            </form>
            <button onClick={() => router.push('/dashboard')}
              className="w-full mt-3 py-2 rounded-xl text-sm text-gray-500 hover:text-white transition-colors">
              ← Dashboard'a dön
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Admin paneli ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-red-600/4 rounded-full blur-3xl" />
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
              <p className="text-xs text-gray-500">Otomatik yenileme: 4s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRooms}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs transition-all">
              🔄 Yenile
            </button>
            <button
              onClick={handleResetAllRooms}
              disabled={resetting || rooms.length === 0}
              className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-40">
              {resetting ? '⏳ Sıfırlanıyor...' : '🗑️ Tüm Odaları Sıfırla'}
            </button>
            <button onClick={handleLogout}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-gray-400 transition-all">
              Çıkış
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
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-5 ${s.color}`}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Arama + Filtre */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
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
                {f === 'all' ? 'Hepsi' : f === 'WAITING' ? '⏳ Bekliyor' : '🎮 Oyunda'}
              </button>
            ))}
          </div>
        </div>

        {/* Oda listesi */}
        <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold">Odalar ({filtered.length})</h2>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Güncelleniyor
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-3">🏠</div>
              <p className="text-gray-500 text-sm">
                {rooms.length === 0 ? 'Hiç oda yok — temiz!' : 'Arama sonucu bulunamadı'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/3">
              <AnimatePresence>
                {filtered.map((room) => (
                  <motion.div key={room.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="px-6 py-4 flex items-start gap-4 hover:bg-white/2 transition-all">

                    {/* Status */}
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      room.status === 'IN_GAME' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                    }`} />

                    {/* Bilgi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{room.name}</span>
                        <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          {room.code}
                        </span>
                        {room.isPrivate && <span className="text-xs text-gray-500">🔒</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          room.status === 'IN_GAME'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          {room.status === 'IN_GAME' ? '🎮 Oyunda' : '⏳ Bekliyor'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span>Host: <span className="text-gray-300 font-medium">{room.host?.profile?.displayName || room.host?.username}</span></span>
                        <span>Oyuncu: <span className="text-gray-300 font-medium">{room.players.length}/{room.maxPlayers}</span></span>
                        {room.gameType && (
                          <span>Oyun: <span className="text-gray-300">{room.gameType === 'vampire-village' ? '🧛 Vampir Köylü' : room.gameType}</span></span>
                        )}
                      </div>

                      {/* Oyuncular */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {room.players.map((p) => (
                          <span key={p.userId}
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              p.isHost
                                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                : 'bg-white/5 border-white/5 text-gray-400'
                            }`}>
                            {p.isHost ? '👑 ' : ''}{p.user?.profile?.displayName || p.user?.username}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Kapat butonu */}
                    <button
                      onClick={() => handleCloseRoom(room)}
                      className="flex-shrink-0 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-all active:scale-95">
                      🔒 Kapat
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-700">
          Admin şifresi: <code className="text-gray-600">partyverse2026</code> — istersen değiştir
        </p>
      </main>
    </div>
  );
}
