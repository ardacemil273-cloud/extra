'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useBannerStore } from '@/stores/banner.store';
import DiscordBanner from '@/components/banner/DiscordBanner';

const ADMIN_PASSWORD = 'partyverse2026';

interface AdminRoom {
  id: string; code: string; name: string; status: string;
  gameType: string | null; maxPlayers: number; isPrivate: boolean; createdAt: string;
  players: { userId: string; isHost: boolean; user: { username: string; profile?: { displayName: string } } }[];
  host: { id: string; username: string; profile?: { displayName: string } };
}

type AdminTab = 'rooms' | 'banner';

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('rooms');
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'WAITING' | 'IN_GAME'>('all');
  const [resetting, setResetting] = useState(false);
  const [stats, setStats] = useState({ totalRooms: 0, activeGames: 0, waitingRooms: 0, totalPlayers: 0 });
  const { banner, setBanner, resetBanner } = useBannerStore();
  const [bannerForm, setBannerForm] = useState({ ...banner });
  const [bannerSaved, setBannerSaved] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_authed');
    if (saved === 'yes') setAuthed(true);
  }, []);

  useEffect(() => {
    setBannerForm({ ...banner });
  }, [banner]);

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
    } catch { setRooms([]); } finally { setLoading(false); }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('admin_authed', 'yes');
      toast.success('Admin panele hoş geldin! 👑');
    } else { toast.error('Yanlış şifre'); setPwInput(''); }
  };

  const handleCloseRoom = async (room: AdminRoom) => {
    if (!confirm(`"${room.name}" odasını kapatmak istediğine emin misin?`)) return;
    try {
      await api.delete(`/rooms/${room.id}/leave`);
      toast.success(`"${room.name}" kapatıldı`);
      fetchRooms();
    } catch { toast.error('Oda kapatılamadı — backend bağlantısı kontrol et'); }
  };

  const handleResetAllRooms = async () => {
    if (!confirm('TÜM ODALARI kapatmak istediğine emin misin?')) return;
    setResetting(true);
    let closed = 0;
    for (const room of rooms) {
      try { await api.delete(`/rooms/${room.id}/leave`); closed++; } catch {}
    }
    toast.success(`${closed} oda kapatıldı`);
    setResetting(false);
    fetchRooms();
  };

  const handleSaveBanner = () => {
    setBanner(bannerForm);
    setBannerSaved(true);
    toast.success('Banner kaydedildi! 🎉');
    setTimeout(() => setBannerSaved(false), 3000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authed');
    setAuthed(false);
  };

  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase();
    return (r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.host?.username?.toLowerCase().includes(q))
      && (filter === 'all' || r.status === filter);
  });

  // ─── GİRİŞ EKRANI ──────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⚙️</div>
            <h1 className="text-2xl font-black">Admin Paneli</h1>
            <p className="text-gray-500 text-sm mt-1">PartyVerse yönetim konsolu</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/3 p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Admin Şifresi</label>
                <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)}
                  placeholder="••••••••" autoFocus required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all" />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all active:scale-95">
                Giriş Yap
              </button>
            </form>
            <button onClick={() => router.push('/dashboard')} className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-white transition-colors">
              ← Dashboard'a dön
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── ADMIN PANELİ ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-red-600/4 rounded-full blur-3xl" />
      </div>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
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
            <button onClick={fetchRooms} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs transition-all">🔄</button>
            <button onClick={handleResetAllRooms} disabled={resetting || rooms.length === 0}
              className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-40">
              {resetting ? '⏳' : '🗑️ Sıfırla'}
            </button>
            <button onClick={handleLogout} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-400 transition-all">Çıkış</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/3 border border-white/5 w-fit">
          {([['rooms','🏠 Odalar'], ['banner','📢 Discord Banner']] as [AdminTab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── ODALAR SEKMESİ ─── */}
        {activeTab === 'rooms' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Toplam Oda', value: stats.totalRooms, icon: '🏠', color: 'border-blue-500/20 bg-blue-500/5' },
                { label: 'Aktif Oyun', value: stats.activeGames, icon: '🎮', color: 'border-green-500/20 bg-green-500/5' },
                { label: 'Bekleyen', value: stats.waitingRooms, icon: '⏳', color: 'border-yellow-500/20 bg-yellow-500/5' },
                { label: 'Oyuncu', value: stats.totalPlayers, icon: '👥', color: 'border-purple-500/20 bg-purple-500/5' },
              ].map((s, i) => (
                <div key={i} className={`rounded-2xl border p-5 ${s.color}`}>
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-2xl font-black">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Oda adı, kod veya host ara..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm transition-all" />
              <div className="flex gap-2">
                {(['all','WAITING','IN_GAME'] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${filter === f ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 bg-white/3 text-gray-400 hover:border-white/20'}`}>
                    {f === 'all' ? 'Hepsi' : f === 'WAITING' ? '⏳ Bekliyor' : '🎮 Oyunda'}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-bold">Odalar ({filtered.length})</h2>
                {loading && <span className="text-xs text-gray-500 animate-pulse">Güncelleniyor...</span>}
              </div>
              {filtered.length === 0 ? (
                <div className="p-16 text-center"><div className="text-5xl mb-3">🏠</div><p className="text-gray-500 text-sm">{rooms.length === 0 ? 'Hiç oda yok' : 'Bulunamadı'}</p></div>
              ) : (
                <div className="divide-y divide-white/3">
                  <AnimatePresence>
                    {filtered.map((room) => (
                      <motion.div key={room.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="px-6 py-4 flex items-start gap-4 hover:bg-white/2 transition-all">
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${room.status === 'IN_GAME' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{room.name}</span>
                            <span className="font-mono text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">{room.code}</span>
                            {room.isPrivate && <span className="text-xs text-gray-500">🔒</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${room.status === 'IN_GAME' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                              {room.status === 'IN_GAME' ? '🎮 Oyunda' : '⏳ Bekliyor'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            <span>Host: <span className="text-gray-300 font-medium">{room.host?.profile?.displayName || room.host?.username}</span></span>
                            <span>Oyuncu: <span className="text-gray-300 font-medium">{room.players.length}/{room.maxPlayers}</span></span>
                            {room.gameType && <span>Oyun: <span className="text-gray-300">{room.gameType === 'vampire-village' ? '🧛 Vampir Köylü' : room.gameType}</span></span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {room.players.map((p) => (
                              <span key={p.userId} className={`text-xs px-2 py-0.5 rounded-full border ${p.isHost ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-white/5 border-white/5 text-gray-400'}`}>
                                {p.isHost ? '👑 ' : ''}{p.user?.profile?.displayName || p.user?.username}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => handleCloseRoom(room)}
                          className="flex-shrink-0 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-all active:scale-95">
                          🔒 Kapat
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── BANNER SEKMESİ ─── */}
        {activeTab === 'banner' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol: Form */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-lg">📢 Discord Banner Ayarları</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Aktif</span>
                    <button onClick={() => setBannerForm((f) => ({ ...f, enabled: !f.enabled }))}
                      className={`relative w-12 h-6 rounded-full transition-all ${bannerForm.enabled ? 'bg-green-500' : 'bg-white/10'}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${bannerForm.enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Sunucu Adı *', key: 'serverName', placeholder: 'Örn: PartyVerse Türkiye', type: 'text' },
                    { label: 'Discord Davet Linki *', key: 'inviteUrl', placeholder: 'discord.gg/abc123 veya https://discord.gg/abc123', type: 'text' },
                    { label: 'Açıklama', key: 'serverDescription', placeholder: 'Oyuncularla tanış, takım kur!', type: 'text' },
                    { label: 'Sunucu İkon URL (opsiyonel)', key: 'iconUrl', placeholder: 'https://cdn.discordapp.com/...', type: 'text' },
                    { label: 'Çevrimiçi Üye Sayısı', key: 'onlineCount', placeholder: '0', type: 'number' },
                    { label: 'Toplam Üye Sayısı', key: 'memberCount', placeholder: '0', type: 'number' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                      <input type={f.type} value={(bannerForm as any)[f.key]} placeholder={f.placeholder}
                        onChange={(e) => setBannerForm((prev) => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm transition-all" />
                    </div>
                  ))}
                  {/* Renk seçici */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Vurgu Rengi</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={bannerForm.accentColor}
                        onChange={(e) => setBannerForm((f) => ({ ...f, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" />
                      <div className="flex gap-2">
                        {['#5865F2', '#7289DA', '#9b59b6', '#e91e63', '#00b894', '#e67e22'].map((c) => (
                          <button key={c} onClick={() => setBannerForm((f) => ({ ...f, accentColor: c }))}
                            className={`w-7 h-7 rounded-lg border-2 transition-all ${bannerForm.accentColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Gösterim yerleri */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Gösterim Yerleri</label>
                    <div className="space-y-2">
                      {[
                        { key: 'showOnLobby', label: '🎮 Lobby (Oda Bekleme)', desc: 'En çok vakit geçirilen yer' },
                        { key: 'showOnDashboard', label: '🏠 Dashboard', desc: 'Ana sayfa sidebar' },
                        { key: 'showOnGame', label: '⚔️ Oyun İçi', desc: 'Küçük banner şeklinde' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/2 cursor-pointer hover:bg-white/5 transition-all">
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.desc}</p>
                          </div>
                          <button onClick={() => setBannerForm((f) => ({ ...f, [item.key]: !(f as any)[item.key] }))}
                            className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${(bannerForm as any)[item.key] ? 'bg-green-500' : 'bg-white/10'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${(bannerForm as any)[item.key] ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleSaveBanner}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${bannerSaved ? 'bg-green-500 text-white' : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white'}`}>
                    {bannerSaved ? '✓ Kaydedildi!' : '💾 Kaydet'}
                  </button>
                  <button onClick={() => { resetBanner(); setBannerForm({ ...banner }); toast('Banner sıfırlandı'); }}
                    className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition-all">
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>
            {/* Sağ: Önizleme */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
                <h3 className="font-bold mb-4 text-sm text-gray-300">👁️ Önizleme — Lobby (Tam)</h3>
                <DiscordBanner placement="lobby" key={JSON.stringify(bannerForm)} />
                {!bannerForm.enabled && (
                  <p className="text-xs text-gray-600 text-center mt-2">Banner devre dışı — Aktif et butonunu aç</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
                <h3 className="font-bold mb-4 text-sm text-gray-300">👁️ Önizleme — Oyun İçi (Kompakt)</h3>
                <DiscordBanner placement="game" compact key={JSON.stringify(bannerForm) + 'compact'} />
              </div>
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="text-xs text-yellow-400 font-semibold mb-1">💡 İpucu</p>
                <p className="text-xs text-gray-400">Lobby bekleme ekranı en etkili yer — oyuncular ortalama 2-5 dakika lobby'de bekliyor. Banner kaydedilir kaydedilmez tüm kullanıcılara anında görünür (localStorage).</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
