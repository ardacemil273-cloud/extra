'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import Navbar from '@/components/layout/Navbar';
import { calculateLevelProgress, getRarityColor, getRarityLabel, formatRelativeTime } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const AVATARS = ['default','warrior','mage','rogue','vampire','werewolf','detective','doctor','hunter','ghost'];
const AVATAR_ICONS: Record<string, string> = {
  default:'🧑',warrior:'⚔️',mage:'🔮',rogue:'🗡️',vampire:'🧛',
  werewolf:'🐺',detective:'🔍',doctor:'💉',hunter:'🏹',ghost:'👻',guest:'👤',
};

type Tab = 'overview' | 'achievements' | 'history' | 'settings';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loadCurrentUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [achievements, setAchievements] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', avatar: 'default' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }

    const loadData = async () => {
      try {
        const [achRes, friendsRes] = await Promise.all([
          api.get('/profile/me/achievements'),
          api.get('/friends'),
        ]);
        setAchievements(achRes.data.data || achRes.data);
        setFriends(friendsRes.data.data || friendsRes.data);
      } catch {}
    };

    loadData();
    if (user?.profile) setForm({
      displayName: user.profile.displayName,
      bio: user.profile.bio || '',
      avatar: user.profile.avatar || 'default',
    });
  }, [isAuthenticated, router, user?.profile]);

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/profile/me/history');
      setHistory(data.data || data);
    } catch {
      // Backend history endpoint yoksa boş göster
      setHistory([]);
    }
  };

  useEffect(() => {
    if (tab === 'history' && history.length === 0) loadHistory();
  }, [tab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/profile/me', form);
      await loadCurrentUser();
      setEditing(false);
      toast.success('Profil güncellendi!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Güncelleme başarısız');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { toast.error('Şifreler eşleşmiyor'); return; }
    if (pwForm.newPw.length < 8) { toast.error('En az 8 karakter'); return; }
    setPwLoading(true);
    try {
      await api.patch('/profile/me/password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Şifre değiştirildi!');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Şifre değiştirilemedi');
    } finally { setPwLoading(false); }
  };

  const profile = user?.profile;
  const stats = user?.statistics;
  const levelInfo = calculateLevelProgress(profile?.xp || 0);
  const unlockedAch = achievements.filter((a) => a.unlocked);

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl" />
      </div>
      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Profile Hero */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border-2 border-purple-500/30 flex items-center justify-center text-4xl">
                {AVATAR_ICONS[profile?.avatar || 'default']}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 border-2 border-[#080b14] flex items-center justify-center text-xs font-black">
                {levelInfo.level}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {editing ? (
                    <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="text-xl font-black bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 w-full max-w-xs"
                      maxLength={50} />
                  ) : (
                    <h1 className="text-2xl font-black">{profile?.displayName || user?.username}</h1>
                  )}
                  <p className="text-gray-400 text-sm">@{user?.username}</p>
                  {user?.isGuest && <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20 mt-1 inline-block">Misafir</span>}
                </div>
                <button onClick={() => { setEditing(!editing); if (editing) setEditing(false); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
                    editing ? 'border-white/10 bg-white/5 text-gray-400' : 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                  }`}>
                  {editing ? 'İptal' : '✏️ Düzenle'}
                </button>
              </div>

              {/* Bio */}
              {editing ? (
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Kendini tanıt..." maxLength={200}
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none h-16" />
              ) : (
                profile?.bio && <p className="text-sm text-gray-400 mt-2">{profile.bio}</p>
              )}

              {/* XP Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-400 font-semibold">Seviye {levelInfo.level}</span>
                  <span className="text-gray-500">{levelInfo.currentXp} / {levelInfo.requiredXp} XP</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" style={{ boxShadow: '0 0 8px rgba(168,85,247,0.5)' }} />
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-400">{friends.length} <span className="text-gray-600">arkadaş</span></span>
                <span className="text-gray-400">{unlockedAch.length} <span className="text-gray-600">başarım</span></span>
                <span className="text-gray-400">{stats?.gamesPlayed || 0} <span className="text-gray-600">oyun</span></span>
              </div>
            </div>
          </div>

          {/* Avatar picker */}
          {editing && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-sm font-medium text-gray-400 mb-3">Avatar Seç</p>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((av) => (
                  <button key={av} onClick={() => setForm({ ...form, avatar: av })}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center text-2xl transition-all ${
                      form.avatar === av ? 'border-purple-500 bg-purple-500/20 scale-110' : 'border-white/8 bg-white/3 hover:border-white/20'
                    }`}>
                    {AVATAR_ICONS[av]}
                  </button>
                ))}
              </div>
              <button onClick={handleSave} disabled={saving}
                className="mt-4 px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-50 transition-all active:scale-95 text-sm">
                {saving ? 'Kaydediliyor...' : '✓ Değişiklikleri Kaydet'}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Oyun', value: stats.gamesPlayed, icon: '🎮', color: 'border-blue-500/20 bg-blue-500/5' },
              { label: 'Kazanılan', value: stats.gamesWon, icon: '🏆', color: 'border-yellow-500/20 bg-yellow-500/5' },
              { label: 'Kaybedilen', value: stats.gamesLost, icon: '💀', color: 'border-red-500/20 bg-red-500/5' },
              { label: 'Kazanma %', value: `${Math.round((stats.winRate || 0) * 100)}%`, icon: '📊', color: 'border-green-500/20 bg-green-500/5' },
            ].map((s, i) => (
              <div key={i} className={`rounded-2xl border p-4 text-center ${s.color}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="font-black text-xl">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/3 border border-white/5">
          {([
            { id: 'overview', label: '📊 Genel' },
            { id: 'achievements', label: `🏆 Başarımlar (${unlockedAch.length}/${achievements.length})` },
            { id: 'history', label: '📜 Geçmiş' },
            { id: 'settings', label: '⚙️ Ayarlar' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Recent achievements */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <h3 className="font-bold mb-3">Son Başarımlar</h3>
              {unlockedAch.length === 0 ? (
                <p className="text-gray-500 text-sm">Henüz başarım yok. Oynamaya başla!</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unlockedAch.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 bg-white/3">
                      <span className="text-xl">{a.icon}</span>
                      <span className="text-sm font-semibold">{a.name}</span>
                    </div>
                  ))}
                  {unlockedAch.length > 5 && (
                    <button onClick={() => setTab('achievements')}
                      className="px-3 py-2 rounded-xl border border-white/5 text-gray-500 text-sm hover:text-white transition-colors">
                      +{unlockedAch.length - 5} daha
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Friends preview */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Arkadaşlar ({friends.length})</h3>
                <button onClick={() => router.push('/friends')} className="text-xs text-purple-400 hover:text-purple-300">Tümünü gör →</button>
              </div>
              {friends.length === 0 ? (
                <p className="text-gray-500 text-sm">Henüz arkadaş yok.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends.slice(0, 8).map((f: any) => (
                    <div key={f.friendshipId} className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center font-black">
                        {AVATAR_ICONS[f.friend?.profile?.avatar] || (f.friend?.profile?.displayName || f.friend?.username || '?')[0].toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080b14] ${f.friend?.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS */}
        {tab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((ach, i) => (
              <motion.div key={ach.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  ach.unlocked ? 'border-white/10 bg-white/3' : 'border-white/3 bg-white/1 opacity-40'
                }`}>
                <div className="text-2xl w-10 text-center">{ach.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{ach.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full border"
                      style={{ color: getRarityColor(ach.rarity), borderColor: getRarityColor(ach.rarity) + '40', backgroundColor: getRarityColor(ach.rarity) + '15' }}>
                      {getRarityLabel(ach.rarity)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{ach.description}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <p className="text-xs text-gray-600 mt-0.5">{formatRelativeTime(ach.unlockedAt)}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {ach.unlocked ? <span className="text-green-400 text-sm">✓</span> : <span className="text-gray-700 text-sm">🔒</span>}
                  <p className="text-xs text-yellow-500/60 mt-0.5">+{ach.xpReward}xp</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/5 bg-white/2">
                <div className="text-4xl mb-3">📜</div>
                <p className="text-gray-500 text-sm">Henüz oyun geçmişi yok</p>
              </div>
            ) : (
              history.map((h: any, i) => (
                <motion.div key={h.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${h.isWinner ? 'bg-yellow-500/20' : 'bg-red-500/10'}`}>
                    {h.isWinner ? '🏆' : '💀'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{h.gameType === 'vampire-village' ? '🧛 Vampir Köylü' : h.gameType}</p>
                    <p className="text-xs text-gray-500">Rol: {h.role || '?'} · {formatRelativeTime(h.playedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${h.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                      {h.isWinner ? 'Kazandı' : 'Kaybetti'}
                    </p>
                    <p className="text-xs text-yellow-500/70">+{h.xpEarned} XP</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="space-y-4">
            {/* Şifre değiştir */}
            {!user?.isGuest && user?.provider === 'LOCAL' && (
              <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
                <h3 className="font-bold mb-4">🔐 Şifre Değiştir</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  {[
                    { label: 'Mevcut Şifre', key: 'current', value: pwForm.current },
                    { label: 'Yeni Şifre', key: 'newPw', value: pwForm.newPw },
                    { label: 'Yeni Şifre (Tekrar)', key: 'confirm', value: pwForm.confirm },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                      <input type="password" value={f.value}
                        onChange={(e) => setPwForm({ ...pwForm, [f.key]: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm transition-all"
                        required minLength={f.key !== 'current' ? 8 : 1} />
                    </div>
                  ))}
                  <button type="submit" disabled={pwLoading}
                    className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-50 transition-all active:scale-95 text-sm">
                    {pwLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                  </button>
                </form>
              </div>
            )}

            {/* Tehlikeli alan */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <h3 className="font-bold text-red-400 mb-2">⚠️ Tehlikeli Alan</h3>
              <p className="text-sm text-gray-400 mb-4">Bu işlemler geri alınamaz.</p>
              <button onClick={() => toast.error('Bu özellik yakında aktif olacak')}
                className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-all">
                🗑️ Hesabı Sil
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
