'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { useRoomStore } from '@/stores/room.store';
import { getRoomSocket, connectRoomSocket } from '@/lib/socket';
import Navbar from '@/components/layout/Navbar';
import DiscordBanner from '@/components/banner/DiscordBanner';
import InviteModal from '@/components/room/InviteModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Room, ChatMessage, GAME_TYPES } from '@/types';
import { copyToClipboard } from '@/lib/utils';

interface GameSettings {
  vampireCount: number;
  hasDoctor: boolean;
  hasDetective: boolean;
  hasHunter: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  vampireCount: 1,
  hasDoctor: true,
  hasDetective: true,
  hasHunter: false,
};

export default function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { currentRoom, setRoom, chatMessages, addChatMessage, setConnected } = useRoomStore();
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [maxPlayersInput, setMaxPlayersInput] = useState(8);
  const [savingSettings, setSavingSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getRoomSocket());
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadRoom();
    setupSocket();
    return () => { socketRef.current.off(); };
  }, [roomId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const loadRoom = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}`);
      const room = data.data || data;
      setRoom(room);
      setMaxPlayersInput(room.maxPlayers);
      const me = room.players?.find((p: any) => p.userId === userRef.current?.id);
      if (me) setIsReady(me.isReady);
      if (room.settings && Object.keys(room.settings).length > 0) {
        setGameSettings({ ...DEFAULT_SETTINGS, ...room.settings });
      }
    } catch {
      toast.error('Oda bulunamadı');
      router.push('/dashboard');
    }
  };

  const setupSocket = () => {
    connectRoomSocket();
    const socket = socketRef.current;
    socket.emit('room:join', { roomId });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    // Biri girince/çıkınca/hazır olunca ANLIK güncelleme
    socket.on('room:updated', (room: Room) => {
      setRoom(room);
      const me = room.players?.find((p) => p.userId === userRef.current?.id);
      if (me) setIsReady(me.isReady);
      if ((room as any).settings && Object.keys((room as any).settings).length > 0) {
        setGameSettings({ ...DEFAULT_SETTINGS, ...(room as any).settings });
      }
      setMaxPlayersInput(room.maxPlayers);
    });
    socket.on('room:settings-updated', ({ maxPlayers, settings }: any) => {
      if (maxPlayers) setMaxPlayersInput(maxPlayers);
      if (settings) setGameSettings({ ...DEFAULT_SETTINGS, ...settings });
    });
    socket.on('room:joined', (room: Room) => { setRoom(room); toast(`👋 ${room.players.slice(-1)[0]?.user?.profile?.displayName || 'Biri'} katıldı!`); });
    socket.on('room:kicked', () => { toast.error('Odadan atıldınız'); router.push('/dashboard'); });
    socket.on('room:closed', () => { toast('Oda kapatıldı'); router.push('/dashboard'); });
    socket.on('lobby:chat', (msg: ChatMessage) => addChatMessage(msg));
    socket.on('game:started', () => router.push(`/game/${roomId}`));
    socket.on('room:error', ({ message }: { message: string }) => toast.error(message));
  };

  const handleLeave = useCallback(() => {
    socketRef.current.emit('room:leave', { roomId });
    router.push('/dashboard');
  }, [roomId, router]);

  const handleReady = () => {
    const next = !isReady;
    setIsReady(next);
    socketRef.current.emit('room:ready', { roomId, isReady: next });
  };

  const handleStartGame = () => {
    if (!currentRoom?.gameType) { toast.error('Önce oyun seçin'); return; }
    socketRef.current.emit('game:start', { roomId, gameType: currentRoom.gameType });
  };

  const handleKick = (targetUserId: string) => {
    socketRef.current.emit('room:kick', { roomId, targetUserId });
  };

  const handleSelectGame = (gameType: string) => {
    socketRef.current.emit('room:select-game', { roomId, gameType });
  };

  const handleCloseRoom = () => {
    if (!confirm('Odayı kapatmak istiyor musun?')) return;
    socketRef.current.emit('room:close', { roomId });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      socketRef.current.emit('room:update-settings', {
        roomId,
        maxPlayers: maxPlayersInput,
        gameSettings: gameSettings,
      });
      toast.success('Ayarlar kaydedildi!');
      setShowSettings(false);
    } catch {
      toast.error('Ayarlar kaydedilemedi');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current.emit('lobby:chat', { roomId, message: chatInput });
    setChatInput('');
  };

  const handleCopyCode = () => {
    if (currentRoom?.code) { copyToClipboard(currentRoom.code); toast.success('Kod kopyalandı!'); }
  };

  const handleCopyLink = () => {
    copyToClipboard(`${window.location.origin}/room/join?code=${currentRoom?.code}`);
    toast.success('Link kopyalandı!');
  };

  const isHost = currentRoom?.hostId === user?.id;
  const readyCount = currentRoom?.players.filter((p) => p.isReady).length || 0;
  const totalCount = currentRoom?.players.length || 0;
  const canStart = currentRoom?.gameType && readyCount === totalCount && totalCount >= 4;

  const maxVampires = Math.max(1, Math.floor((totalCount || 4) / 4));

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-600/6 rounded-full blur-3xl" />
      </div>
      <Navbar />

      {/* Invite Modal */}
      {showInvite && currentRoom && (
        <InviteModal roomCode={currentRoom.code} roomId={roomId} onClose={() => setShowInvite(false)} />
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && isHost && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
            <motion.div initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.9, opacity:0 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h2 className="font-black text-lg">⚙️ Oda Ayarları</h2>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 transition-all">×</button>
              </div>
              <div className="p-6 space-y-6">

                {/* Max oyuncu */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-300">👥 Maksimum Oyuncu</label>
                    <span className="text-purple-400 font-black text-lg">{maxPlayersInput}</span>
                  </div>
                  <input type="range" min={Math.max(4, totalCount)} max={20} value={maxPlayersInput}
                    onChange={e => setMaxPlayersInput(Number(e.target.value))}
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-xs text-gray-600 mt-1"><span>4</span><span>20</span></div>
                  {totalCount > 4 && <p className="text-xs text-yellow-500 mt-1">⚠ Şu an {totalCount} oyuncu var, bu değerin altına indiremezsin.</p>}
                </div>

                {/* Vampir sayısı */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-300">🧛 Vampir Sayısı</label>
                    <span className="text-red-400 font-black text-lg">{gameSettings.vampireCount}</span>
                  </div>
                  <div className="flex gap-2">
                    {[1,2,3,4].map(n => (
                      <button key={n} onClick={() => setGameSettings(s => ({ ...s, vampireCount: n }))}
                        className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${gameSettings.vampireCount === n ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-white/10 bg-white/3 text-gray-500 hover:border-white/20'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Önerilen: {maxVampires} vampir ({totalCount || 4} oyuncu için)</p>
                </div>

                {/* Özel roller */}
                <div>
                  <label className="text-sm font-semibold text-gray-300 mb-3 block">🎭 Aktif Roller</label>
                  <div className="space-y-2">
                    {[
                      { key: 'hasDoctor', icon: '💉', label: 'Doktor', desc: 'Her gece bir kişiyi korur', color: 'green' },
                      { key: 'hasDetective', icon: '🔍', label: 'Dedektif', desc: 'Her gece bir kişiyi sorgular', color: 'blue' },
                      { key: 'hasHunter', icon: '🏹', label: 'Avcı', desc: 'Öldürülünce birini götürür', color: 'orange' },
                    ].map(role => (
                      <label key={role.key} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/2 cursor-pointer hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{role.icon}</span>
                          <div>
                            <p className="text-sm font-semibold">{role.label}</p>
                            <p className="text-xs text-gray-500">{role.desc}</p>
                          </div>
                        </div>
                        <button onClick={() => setGameSettings(s => ({ ...s, [role.key]: !(s as any)[role.key] }))}
                          className={`relative w-11 h-6 rounded-full transition-all ${(gameSettings as any)[role.key] ? 'bg-green-500' : 'bg-white/10'}`}>
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${(gameSettings as any)[role.key] ? 'left-6' : 'left-1'}`} />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowSettings(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 font-semibold text-sm hover:bg-white/10 transition-all">
                    İptal
                  </button>
                  <button onClick={handleSaveSettings} disabled={savingSettings}
                    className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-50 transition-all active:scale-95">
                    {savingSettings ? 'Kaydediliyor...' : '✓ Kaydet'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUB HEADER ── */}
      <div className="sticky top-16 z-30 border-b border-white/5 bg-[#080b14]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleLeave}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition-all active:scale-95">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Ayrıl
            </button>
            <div>
              <p className="font-bold text-sm">{currentRoom?.name || 'Yükleniyor...'}</p>
              <p className="text-xs text-gray-500">{totalCount}/{currentRoom?.maxPlayers} oyuncu • {readyCount} hazır</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowInvite(true)}
              className="px-3 py-2 rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-300 text-xs font-semibold transition-all">
              🔗 Davet Et
            </button>
            {isHost && (
              <>
                <button onClick={() => setShowSettings(true)}
                  className="px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition-all">
                  ⚙️ Ayarlar
                </button>
                <button onClick={handleCloseRoom}
                  className="px-3 py-2 rounded-xl border border-red-700/30 bg-red-900/20 hover:bg-red-900/30 text-red-500 text-xs font-semibold transition-all">
                  🔒 Kapat
                </button>
              </>
            )}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/3">
              <span className="text-xs text-gray-500">Kod:</span>
              <span className="font-black tracking-widest text-purple-400 font-mono text-sm">{currentRoom?.code}</span>
              <button onClick={handleCopyCode} className="text-gray-600 hover:text-white transition-colors ml-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <button onClick={handleCopyLink} className="px-2.5 py-2 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 text-xs transition-all">🔗</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── OYUNCULAR ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Oyun seçimi (host) */}
            {isHost && (
              <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Oyun Seç</p>
                <div className="flex flex-wrap gap-2">
                  {GAME_TYPES.filter(g => g.available).map(game => (
                    <button key={game.id} onClick={() => handleSelectGame(game.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        currentRoom?.gameType === game.id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/3 text-gray-400 hover:border-white/20'
                      }`}>
                      {game.icon} {game.name}
                    </button>
                  ))}
                </div>
                {currentRoom?.gameType && (
                  <p className="text-xs text-gray-600 mt-2">
                    Seçili: {GAME_TYPES.find(g => g.id === currentRoom.gameType)?.name}
                    {Object.keys(currentRoom.settings || {}).length > 0 && (
                      <span className="ml-2 text-purple-500">
                        · {gameSettings.vampireCount}🧛 {gameSettings.hasDoctor?'💉':''} {gameSettings.hasDetective?'🔍':''} {gameSettings.hasHunter?'🏹':''}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Oyuncu grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Oyuncular</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{readyCount}/{totalCount} hazır</span>
                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${totalCount > 0 ? (readyCount/totalCount)*100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AnimatePresence>
                  {currentRoom?.players.map((rp, i) => (
                    <motion.div key={rp.userId}
                      initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:.85 }}
                      transition={{ duration:.2, delay: i*.04 }}
                      className={`relative group rounded-2xl border p-4 text-center transition-all ${
                        rp.isReady ? 'border-green-500/30 bg-green-500/5' : 'border-white/8 bg-white/3'
                      }`}>
                      {rp.isHost && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 whitespace-nowrap">
                          👑 Host
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20 flex items-center justify-center text-xl font-black mx-auto mb-2 mt-2">
                        {(rp.user?.profile?.displayName || rp.user?.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="text-sm font-semibold truncate">{rp.user?.profile?.displayName || rp.user?.username}</div>
                      <div className="text-xs text-gray-600 mt-0.5">Lv.{rp.user?.profile?.level || 1}</div>
                      <div className={`mt-2 text-xs font-semibold ${rp.isReady ? 'text-green-400' : 'text-gray-600'}`}>
                        {rp.isReady ? '✓ Hazır' : '○ Bekliyor'}
                      </div>
                      {isHost && rp.userId !== user?.id && (
                        <button onClick={() => handleKick(rp.userId)}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/50 text-red-400 text-xs hidden group-hover:flex items-center justify-center transition-all"
                          title="At">×</button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Boş slotlar */}
                {Array.from({ length: Math.max(0, Math.min(4, (currentRoom?.maxPlayers || 8) - totalCount)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="rounded-2xl border border-dashed border-white/5 p-4 flex flex-col items-center justify-center gap-1 text-gray-800">
                    <div className="w-12 h-12 rounded-xl border border-dashed border-white/5 flex items-center justify-center text-gray-800">+</div>
                    <span className="text-xs">Boş</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hazır + Başlat */}
            <div className="flex gap-3">
              <button onClick={handleReady}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  isReady
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                    : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-lg shadow-green-500/20'
                }`}>
                {isReady ? '✓ Hazırım' : 'Hazır'}
              </button>

              {isHost && (
                <button onClick={handleStartGame} disabled={!canStart}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-purple-500/20">
                  {!currentRoom?.gameType ? '⚠ Oyun Seç'
                    : totalCount < 4 ? '⚠ Min 4 Oyuncu'
                    : readyCount < totalCount ? `⏳ ${readyCount}/${totalCount} Hazır`
                    : '🎮 Oyunu Başlat'}
                </button>
              )}
            </div>
          </div>

          {/* ── SAĞ KOLON ── */}
          <div className="space-y-4">
            <DiscordBanner placement="lobby" />

            {/* Chat */}
            <div className="flex flex-col rounded-2xl border border-white/8 bg-white/2 overflow-hidden" style={{ height:'50vh' }}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <span className="text-sm font-semibold">💬 Sohbet</span>
                <span className="text-xs text-gray-700">{chatMessages.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {chatMessages.length === 0 && (
                  <p className="text-center text-gray-700 text-xs mt-6">Henüz mesaj yok 👋</p>
                )}
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                      className={`flex gap-2 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                      <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(msg.displayName || msg.username || '?')[0].toUpperCase()}
                      </div>
                      <div className={`max-w-[76%] flex flex-col gap-0.5 ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-gray-700">{msg.displayName || msg.username}</span>
                        <div className={`px-3 py-2 rounded-xl text-xs ${msg.userId === user?.id ? 'bg-purple-600/30 text-purple-100' : 'bg-white/5 text-gray-200'}`}>
                          {msg.message}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Mesaj yaz..." maxLength={300}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500 text-xs transition-all" />
                <button type="submit" className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs transition-all active:scale-95">↑</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
