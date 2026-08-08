'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { useGameStore } from '@/stores/game.store';
import { getGameSocket, connectGameSocket } from '@/lib/socket';
import { ROLE_CONFIG, VampireRole, GamePlayer } from '@/types';
import toast from 'react-hot-toast';
import { narrate, stopNarrator } from '@/lib/narrator';

const phaseLabel: Record<string, string> = {
  NIGHT: '🌙 Gece', DAY_ANNOUNCEMENT: '☀️ Sabah',
  DAY_DISCUSSION: '💬 Tartışma', DAY_VOTING: '⚖️ Oylama',
  VOTE_RESULT: '📋 Sonuç', GAME_OVER: '🏁 Bitti',
};
const phaseColor: Record<string, string> = {
  NIGHT: 'text-red-400 bg-red-900/20 border-red-700/30',
  DAY_ANNOUNCEMENT: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/30',
  DAY_DISCUSSION: 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  DAY_VOTING: 'text-orange-400 bg-orange-900/20 border-orange-700/30',
  VOTE_RESULT: 'text-purple-400 bg-purple-900/20 border-purple-700/30',
  GAME_OVER: 'text-gray-400 bg-gray-900/20 border-gray-700/30',
};

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    gameState, myRole, isMyTurn, turnTargets, turnRole,
    messages, narratorMessages, nightActiveRole, morningDeaths,
    eliminatedPlayer, gameResult,
    setGameState, setMyRole, setMyTurn, addChatMessage, addNarratorMessage,
    setNightActiveRole, setMorningDeaths, setEliminatedPlayer,
    setGameResult, setConnected, reset,
  } = useGameStore();

  const [chatInput, setChatInput] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef(getGameSocket());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
    }, 1000);
  };

  useEffect(() => {
    connectGameSocket();
    const socket = socketRef.current;
    socket.emit('game:join', { roomId });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('game:state', (s: any) => setGameState(s));
    socket.on('game:role-assigned', ({ userId, role, team }: any) => {
      if (userId === user?.id) {
        setMyRole(role, team);
        setShowRoleReveal(true);
        setTimeout(() => setShowRoleReveal(false), 4000);
      }
    });
    socket.on('game:phase-change', ({ phase, narrator, duration }: any) => {
      if (gameState) setGameState({ ...gameState, phase });
      if (narrator) {
        addNarratorMessage({ id: Date.now().toString(), message: narrator, type: phase, timestamp: Date.now() });
        narrate(narrator).catch(() => {});
      }
      if (duration) startTimer(duration);
      setMyTurn(false); setSelectedTarget(null);
    });
    socket.on('game:narrator', ({ message, type }: any) => {
      addNarratorMessage({ id: Date.now().toString(), message, type, timestamp: Date.now() });
      // AI ile sesli anlat
      narrate(message).catch(() => {});
    });
    socket.on('game:night-role', ({ activeRole, narrator }: any) => {
      setNightActiveRole(activeRole);
      if (narrator) addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'night', timestamp: Date.now() });
    });
    socket.on('game:your-turn', ({ role, targets, duration }: any) => {
      setMyTurn(true, targets, role, duration);
      startTimer(duration);
      toast(`🎯 ${ROLE_CONFIG[role as VampireRole]?.name || role} — Senin sıran!`, { duration: 3000 });
    });
    socket.on('game:detective-result', ({ targetName, result, narrator }: any) => {
      addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'detective', timestamp: Date.now() });
      toast(result === 'SUSPICIOUS' ? `🚨 ${targetName} ŞÜPHELİ!` : `✅ ${targetName} masum`, { duration: 5000 });
    });
    socket.on('game:morning', ({ deaths, narrator, deathAnnouncement }: any) => {
      setMorningDeaths(deaths || []);
      setNightActiveRole(null); setMyTurn(false);
      if (narrator) {
        addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'morning', timestamp: Date.now() });
        narrate(narrator).catch(() => {});
      }
      if (deathAnnouncement) {
        addNarratorMessage({ id: (Date.now()+1).toString(), message: deathAnnouncement, type: 'death', timestamp: Date.now()+1 });
        setTimeout(() => narrate(deathAnnouncement).catch(() => {}), 2500);
      }
    });
    socket.on('game:vote-update', ({ players }: any) => {
      if (gameState) setGameState({ ...gameState, players: { ...gameState.players, ...players } });
    });
    socket.on('game:vote-result', ({ eliminated, narrator }: any) => {
      setEliminatedPlayer(eliminated);
      if (narrator) addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'vote_result', timestamp: Date.now() });
    });
    socket.on('game:over', (result: any) => {
      setGameResult(result);
      if (result.narrator) {
        addNarratorMessage({ id: Date.now().toString(), message: result.narrator, type: 'game_over', timestamp: Date.now() });
        narrate(result.narrator).catch(() => {});
      }
    });
    socket.on('game:chat', (msg: any) => addChatMessage(msg));
    socket.on('game:error', ({ message }: any) => toast.error(message));
    return () => { socket.off(); if (timerRef.current) clearInterval(timerRef.current); stopNarrator(); reset(); };
  }, [roomId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleAction = () => {
    if (!selectedTarget || !turnRole) return;
    const map: Record<string,string> = { VAMPIRE:'VAMPIRE_KILL', DOCTOR:'DOCTOR_SAVE', DETECTIVE:'DETECTIVE_INVESTIGATE', HUNTER:'HUNTER_WATCH' };
    socketRef.current.emit('game:action', { roomId, action: map[turnRole], targetId: selectedTarget });
    setMyTurn(false); setSelectedTarget(null);
    toast.success('Aksiyon kullanıldı!');
  };

  const handleVote = (targetId: string) => {
    socketRef.current.emit('game:vote', { roomId, targetId });
    toast('Oy kullanıldı', { icon: '⚖️' });
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketRef.current.emit('game:chat', { roomId, message: chatInput });
    setChatInput('');
  };

  const isNight = gameState?.phase === 'NIGHT';
  const isVoting = gameState?.phase === 'DAY_VOTING';
  const isDiscussion = gameState?.phase === 'DAY_DISCUSSION';
  const isGameOver = gameState?.phase === 'GAME_OVER';
  const myPlayer = gameState?.players[user?.id || ''];
  const alivePlayers = gameState ? Object.values(gameState.players).filter((p: any) => p.status === 'ALIVE') : [];
  const allPlayers: GamePlayer[] = gameState ? Object.values(gameState.players) : [];
  const roleInfo = myRole ? ROLE_CONFIG[myRole] : null;

  /* ── GAME OVER ── */
  if (isGameOver && gameResult) {
    const iWon = myPlayer?.team === gameResult.winnerTeam;
    return (
      <div className="min-h-screen bg-[#080b14] text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} className="relative text-center max-w-xl w-full">
          <div className="text-8xl mb-5" style={{ animation:'float 3s ease-in-out infinite' }}>{iWon ? '🏆' : '💀'}</div>
          <h1 className={`text-5xl font-black mb-3 ${iWon ? 'text-yellow-400' : 'text-red-400'}`}>
            {iWon ? 'KAZANDIN!' : 'KAYBETTİN!'}
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            {gameResult.winnerTeam === 'VILLAGERS' ? '🧑 Köylüler kazandı!' : '🧛 Vampirler kazandı!'}
          </p>
          <div className="mt-4 p-4 rounded-2xl border border-white/8 bg-white/3 mb-6">
            <p className="text-sm text-gray-400 italic">"{gameResult.narrator}"</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-8 text-left">
            {Object.entries(gameResult.allRoles || {}).map(([uid, roleData]: any) => {
              const p = allPlayers.find(pl => pl.userId === uid);
              if (!p) return null;
              const r = ROLE_CONFIG[roleData.role as VampireRole];
              return (
                <div key={uid} className="flex items-center gap-2 p-2 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-xl">{r?.icon || '❓'}</span>
                  <span className="text-sm flex-1 truncate">{p.displayName}</span>
                  <span className="text-xs text-gray-500">{r?.name || roleData.role}</span>
                </div>
              );
            })}
          </div>
          <button onClick={() => router.push(`/room/${roomId}`)}
            className="px-8 py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all active:scale-95">
            🔄 Tekrar Oyna
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-white transition-colors duration-1000 ${isNight ? 'bg-[#02040a]' : 'bg-[#080b14]'}`}>
      {isNight && (
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(139,0,0,.08) 0%,transparent 60%)' }} />
      )}

      {/* Rol Reveal */}
      <AnimatePresence>
        {showRoleReveal && roleInfo && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
            <motion.div initial={{ scale:.7 }} animate={{ scale:1 }} exit={{ scale:.7 }}
              className="text-center p-10 rounded-3xl border border-white/10 bg-white/5 max-w-sm w-full mx-4">
              <div className="text-7xl mb-4">{roleInfo.icon}</div>
              <p className="text-gray-400 text-xs mb-2 tracking-widest uppercase">Senin Rolün</p>
              <h2 className="text-4xl font-black mb-3" style={{ color: roleInfo.color }}>{roleInfo.name}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{roleInfo.description}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${isNight ? 'border-red-900/30 bg-[#02040a]/90' : 'border-white/5 bg-[#080b14]/90'}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${phaseColor[gameState?.phase || 'NIGHT'] || 'text-gray-400 border-gray-700'}`}>
              {phaseLabel[gameState?.phase || ''] || 'Bekleniyor'}
            </span>
            {gameState?.round ? <span className="text-xs text-gray-600">Tur {gameState.round}</span> : null}
          </div>

          {timeLeft > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${timeLeft <= 10 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100,(timeLeft/30)*100)}%` }} />
              </div>
              <span className={`font-mono text-sm font-bold ${timeLeft<=10 ? 'text-red-400 animate-pulse' : 'text-gray-300'}`}>
                {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
              </span>
            </div>
          )}

          {roleInfo && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${roleInfo.bgClass}`}>
              {roleInfo.icon} {roleInfo.name}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Ana alan ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Narrator */}
            <AnimatePresence mode="popLayout">
              {narratorMessages.slice(-1).map(msg => (
                <motion.div key={msg.id} initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                  className={`narrator-box ${msg.type==='death'||msg.type==='night' ? '!border-red-700/30 !bg-red-900/8' : ''}`}>
                  <p className={`text-sm italic leading-relaxed pl-6 ${msg.type==='death' ? 'text-red-300' : 'text-purple-200'}`}>
                    "{msg.message}"
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Gece — pasif */}
            {isNight && !isMyTurn && (
              <div className="rounded-2xl border border-red-900/30 bg-red-900/5 p-8 text-center">
                <div className="text-5xl mb-3 animate-pulse">🌙</div>
                <p className="text-gray-500 text-sm">
                  {nightActiveRole
                    ? `${ROLE_CONFIG[nightActiveRole as VampireRole]?.icon || '👁'} ${ROLE_CONFIG[nightActiveRole as VampireRole]?.name || nightActiveRole} karar veriyor...`
                    : 'Gece devam ediyor...'}
                </p>
              </div>
            )}

            {/* Gece — aksiyon sırası */}
            <AnimatePresence>
              {isMyTurn && isNight && turnTargets.length > 0 && (
                <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0 }}
                  className="rounded-2xl border border-red-500/30 bg-red-900/10 p-5">
                  <p className="font-bold text-red-300 mb-1">
                    {ROLE_CONFIG[turnRole!]?.icon} Senin Sıran — {ROLE_CONFIG[turnRole!]?.name}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">{ROLE_CONFIG[turnRole!]?.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {(turnTargets as any[]).map(t => (
                      <button key={t.userId} onClick={() => setSelectedTarget(t.userId)}
                        className={`vote-card ${selectedTarget===t.userId ? 'selected !border-red-500 !bg-red-900/20' : ''}`}>
                        <div className="text-2xl mb-1">🎯</div>
                        <div className="text-sm font-medium truncate">{t.displayName}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleAction} disabled={!selectedTarget}
                    className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-40 transition-all active:scale-95">
                    ✓ Onayla
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sabah ölümleri */}
            <AnimatePresence>
              {morningDeaths.length > 0 && gameState?.phase === 'DAY_ANNOUNCEMENT' && (
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                  className="rounded-2xl border border-yellow-500/20 bg-yellow-900/8 p-4">
                  <p className="text-yellow-300 font-bold mb-2">☀️ Sabah Haberleri</p>
                  <div className="flex flex-wrap gap-2">
                    {(morningDeaths as any[]).map(d => (
                      <div key={d.userId} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-900/20 border border-red-700/30">
                        <span>💀</span><span className="text-sm text-red-300">{d.displayName}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Oyuncular */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">
                {alivePlayers.length} hayatta / {allPlayers.length} toplam
                {isVoting && <span className="ml-2 text-orange-400">— Oy kullanmak için tıkla</span>}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {allPlayers.map(p => (
                  <motion.button key={p.userId} layout
                    onClick={() => isVoting && p.status==='ALIVE' && p.userId!==user?.id && handleVote(p.userId)}
                    className={`vote-card relative ${p.status==='DEAD' ? 'dead' : ''} ${isVoting && p.userId!==user?.id && p.status==='ALIVE' ? '' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center font-black text-lg
                      ${p.status==='DEAD' ? 'bg-gray-800' : 'bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20'}`}>
                      {p.status==='DEAD' ? '💀' : (p.displayName||'?')[0].toUpperCase()}
                    </div>
                    <div className="text-xs truncate font-medium">{p.displayName}</div>
                    {p.votes > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-xs flex items-center justify-center font-bold">
                        {p.votes}
                      </div>
                    )}
                    {p.userId===user?.id && <div className="text-xs text-purple-400 mt-0.5">Sen</div>}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Elenme sonucu */}
            <AnimatePresence>
              {eliminatedPlayer && (
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                  className="rounded-2xl border border-orange-500/30 bg-orange-900/8 p-4 text-center">
                  <div className="text-4xl mb-2">⚖️</div>
                  <p className="font-bold text-orange-300">{eliminatedPlayer.displayName} elendi!</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Rolü: {ROLE_CONFIG[eliminatedPlayer.role as VampireRole]?.icon} {ROLE_CONFIG[eliminatedPlayer.role as VampireRole]?.name || eliminatedPlayer.role}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Sohbet ── */}
          <div className="flex flex-col rounded-2xl border border-white/8 bg-white/2 overflow-hidden" style={{ height:'76vh' }}>
            <div className="px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold">💬 {isNight ? 'Sessizlik...' : 'Sohbet'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {narratorMessages.map(msg => (
                <div key={msg.id} className="text-xs text-gray-600 italic px-2 py-1.5 rounded-lg bg-white/2 border border-white/3">
                  🎭 {msg.message}
                </div>
              ))}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.userId===user?.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-xs flex-shrink-0">
                    {(msg.displayName||'?')[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[80%] flex flex-col gap-0.5 ${msg.userId===user?.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-600">{msg.displayName}</span>
                    <div className={`px-2.5 py-1.5 rounded-xl text-xs ${msg.userId===user?.id ? 'bg-purple-600/30 text-purple-100' : 'bg-white/5 text-gray-200'}`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {isDiscussion ? (
              <form onSubmit={handleChat} className="p-3 border-t border-white/5 flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Düşüncelerini paylaş..." maxLength={300}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-xs" />
                <button type="submit" className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs transition-all">↑</button>
              </form>
            ) : (
              <div className="p-3 border-t border-white/5 text-center text-xs text-gray-600">
                {isNight ? '🌙 Gece boyunca sohbet kapalı' : 'Tartışma fazı bekleniyor...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
