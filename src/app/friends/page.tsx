'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import Navbar from '@/components/layout/Navbar';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '@/lib/utils';

type Tab = 'friends' | 'requests' | 'search';

interface FriendItem {
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

interface FriendRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    isOnline: boolean;
    profile: { displayName: string; avatar: string; level: number };
  };
  createdAt: string;
}

interface SearchUser {
  id: string;
  username: string;
  isOnline: boolean;
  profile: { displayName: string; avatar: string; level: number };
}

const AVATAR_ICONS: Record<string, string> = {
  default:'🧑',warrior:'⚔️',mage:'🔮',rogue:'🗡️',vampire:'🧛',
  werewolf:'🐺',detective:'🔍',doctor:'💉',hunter:'🏹',ghost:'👻',guest:'👤',
};

function AvatarIcon({ avatar, name, size = 10 }: { avatar?: string; name?: string; size?: number }) {
  return (
    <div className={`w-${size} h-${size} rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center text-xl font-black flex-shrink-0`}>
      {avatar && AVATAR_ICONS[avatar] ? AVATAR_ICONS[avatar] : (name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadAll();
  }, [isAuthenticated]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, sentRes] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests/pending'),
        api.get('/friends/requests/sent'),
      ]);
      setFriends(friendsRes.data.data || friendsRes.data);
      setRequests(requestsRes.data.data || requestsRes.data);
      setSentRequests(sentRes.data.data || sentRes.data);
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) { toast.error('En az 2 karakter gir'); return; }
    setSearchLoading(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
      const results: SearchUser[] = data.data || data;
      setSearchResults(results);

      // Her kullanıcının arkadaşlık durumunu al
      const statuses: Record<string, any> = {};
      await Promise.all(results.map(async (u) => {
        try {
          const { data: s } = await api.get(`/friends/status/${u.id}`);
          statuses[u.id] = s.data || s;
        } catch { statuses[u.id] = { status: 'NONE' }; }
      }));
      setFriendStatuses(statuses);
    } catch {
      toast.error('Arama başarısız');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await api.post('/friends/request', { addresseeId: userId });
      toast.success('Arkadaşlık isteği gönderildi!');
      setFriendStatuses((prev) => ({ ...prev, [userId]: { status: 'PENDING', isRequester: true } }));
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İstek gönderilemedi');
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await api.post(`/friends/request/${requestId}/accept`);
      toast.success('Arkadaşlık kabul edildi! 🎉');
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api.delete(`/friends/request/${requestId}`);
      toast('İstek reddedildi');
      loadAll();
    } catch {}
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!confirm(`${name} ile arkadaşlığı bitirmek istediğine emin misin?`)) return;
    try {
      await api.delete(`/friends/${friendId}`);
      toast('Arkadaşlıktan çıkarıldı');
      loadAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleInviteToRoom = (friendId: string) => {
    toast('Önce bir oda oluştur!');
    router.push('/room/create');
  };

  const onlineCount = friends.filter((f) => f.friend.isOnline).length;

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
      </div>
      <Navbar />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Arkadaşlar</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {friends.length} arkadaş · {onlineCount} çevrimiçi
            </p>
          </div>
          {requests.length > 0 && (
            <button onClick={() => setTab('requests')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-sm font-semibold">
              👥 {requests.length} bekleyen istek
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/3 border border-white/5 mb-6">
          {([
            { id: 'friends', label: `Arkadaşlar (${friends.length})` },
            { id: 'requests', label: `İstekler ${requests.length > 0 ? `(${requests.length})` : ''}` },
            { id: 'search', label: 'Kullanıcı Ara' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── FRIENDS TAB ── */}
        {tab === 'friends' && (
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-white/5 bg-white/2">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-gray-400 font-semibold">Henüz arkadaşın yok</p>
                <p className="text-gray-600 text-sm mt-1">Kullanıcı ara ve arkadaşlık isteği gönder</p>
                <button onClick={() => setTab('search')}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-semibold hover:bg-purple-600/30 transition-all">
                  Kullanıcı Ara →
                </button>
              </div>
            ) : (
              <>
                {/* Online */}
                {friends.filter((f) => f.friend.isOnline).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 px-1">
                      🟢 Çevrimiçi — {friends.filter((f) => f.friend.isOnline).length}
                    </p>
                    {friends.filter((f) => f.friend.isOnline).map((item) => (
                      <FriendCard key={item.friendshipId} item={item}
                        onInvite={() => handleInviteToRoom(item.friend.id)}
                        onRemove={() => handleRemoveFriend(item.friend.id, item.friend.profile?.displayName || item.friend.username)}
                        onProfile={() => router.push(`/profile/${item.friend.id}`)} />
                    ))}
                  </div>
                )}
                {/* Offline */}
                {friends.filter((f) => !f.friend.isOnline).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-1">
                      ⚫ Çevrimdışı — {friends.filter((f) => !f.friend.isOnline).length}
                    </p>
                    {friends.filter((f) => !f.friend.isOnline).map((item) => (
                      <FriendCard key={item.friendshipId} item={item}
                        onInvite={() => handleInviteToRoom(item.friend.id)}
                        onRemove={() => handleRemoveFriend(item.friend.id, item.friend.profile?.displayName || item.friend.username)}
                        onProfile={() => router.push(`/profile/${item.friend.id}`)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {tab === 'requests' && (
          <div className="space-y-4">
            {/* Gelen istekler */}
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-3">Gelen İstekler ({requests.length})</p>
              {requests.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-white/5 bg-white/2 text-gray-500 text-sm">
                  Bekleyen istek yok
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {requests.map((req) => (
                      <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3">
                        <AvatarIcon avatar={req.requester.profile?.avatar} name={req.requester.profile?.displayName || req.requester.username} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{req.requester.profile?.displayName || req.requester.username}</p>
                          <p className="text-xs text-gray-500">@{req.requester.username} · Lv.{req.requester.profile?.level || 1} · {formatRelativeTime(req.createdAt)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAccept(req.id)}
                            className="px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition-all active:scale-95">
                            ✓ Kabul
                          </button>
                          <button onClick={() => handleDecline(req.id)}
                            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-all active:scale-95">
                            ✕
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Gönderilen istekler */}
            {sentRequests.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-3">Gönderilen İstekler ({sentRequests.length})</p>
                <div className="space-y-2">
                  {sentRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/2 opacity-70">
                      <AvatarIcon avatar={req.addressee?.profile?.avatar} name={req.addressee?.profile?.displayName || req.addressee?.username} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{req.addressee?.profile?.displayName || req.addressee?.username}</p>
                        <p className="text-xs text-gray-500">@{req.addressee?.username} · {formatRelativeTime(req.createdAt)}</p>
                      </div>
                      <span className="text-xs text-yellow-500/70 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full">⏳ Bekliyor</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Kullanıcı adı ara..." autoFocus
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all" />
              <button onClick={handleSearch} disabled={searchLoading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 font-semibold disabled:opacity-50 transition-all active:scale-95">
                {searchLoading ? '...' : '🔍 Ara'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((u) => {
                  const status = friendStatuses[u.id];
                  const isFriend = status?.status === 'ACCEPTED';
                  const isPending = status?.status === 'PENDING';
                  return (
                    <motion.div key={u.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3">
                      <div className="relative">
                        <AvatarIcon avatar={u.profile?.avatar} name={u.profile?.displayName || u.username} />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080b14] ${u.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{u.profile?.displayName || u.username}</p>
                        <p className="text-xs text-gray-500">@{u.username} · Lv.{u.profile?.level || 1} · {u.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</p>
                      </div>
                      <div>
                        {isFriend ? (
                          <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl">✓ Arkadaş</span>
                        ) : isPending ? (
                          <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl">⏳ Bekliyor</span>
                        ) : (
                          <button onClick={() => handleSendRequest(u.id)}
                            className="px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-semibold hover:bg-purple-600/30 transition-all active:scale-95">
                            + Ekle
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searchLoading && (
              <div className="text-center py-10 text-gray-500 text-sm">Kullanıcı bulunamadı</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FriendCard({ item, onInvite, onRemove, onProfile }: {
  item: FriendItem;
  onInvite: () => void;
  onRemove: () => void;
  onProfile: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-all mb-2 group">
      <div className="relative cursor-pointer" onClick={onProfile}>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center text-xl font-black">
          {AVATAR_ICONS[item.friend.profile?.avatar] || (item.friend.profile?.displayName || item.friend.username || '?')[0].toUpperCase()}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080b14] ${item.friend.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onProfile}>
        <p className="font-semibold truncate">{item.friend.profile?.displayName || item.friend.username}</p>
        <p className="text-xs text-gray-500">
          @{item.friend.username} · Lv.{item.friend.profile?.level || 1}
          {' · '}
          {item.friend.isOnline ? '🟢 Çevrimiçi' : `⚫ ${formatRelativeTime(item.friend.lastSeen)}`}
        </p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onInvite}
          className="px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-600/30 transition-all">
          🎮 Davet Et
        </button>
        <button onClick={onRemove}
          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Arkadaşlıktan Çıkar">
          🗑️
        </button>
      </div>
    </div>
  );
}
