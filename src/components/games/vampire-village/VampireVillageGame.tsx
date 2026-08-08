'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useGameStore } from '@/stores/game.store';
import { getGameSocket, connectGameSocket } from '@/lib/socket';
import { ROLE_CONFIG, VampireRole, GamePlayer } from '@/types';
import toast from 'react-hot-toast';
import { narrate, stopNarrator } from '@/lib/narrator';
import { sounds } from '@/lib/sounds';
import GameResultScreen from '@/components/game/GameResultScreen';
import PlayerCard from '@/components/game/PlayerCard';

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

interface Props {
  roomId: string;
  myUserId: string;
}

export default function VampireVillageGame({ roomId, myUserId }: Props) {
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
  const [socketStatus, setSocketStatus] = useState<'connected'|'reconnecting'|'disconnected'>('disconnected');
  const [showEliminated, setShowEliminated] = useState(false);
  const [gameEmotes, setGameEmotes] = useState<Array<{ userId: string; emote: string; timestamp: number }>>([]);
  const [gameTypingUsers, setGameTypingUsers] = useState<Array<{ userId: string; username: string }>>([]);
  const [showGameEmoteWheel, setShowGameEmoteWheel] = useState(false);
  const gameTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    socket.on('connect', () => { setConnected(true); setSocketStatus('connected'); });
    socket.on('disconnect', () => { setConnected(false); setSocketStatus('reconnecting'); setTimeout(() => setSocketStatus('disconnected'), 5000); });
    socket.on('reconnect', () => { setSocketStatus('connected'); socket.emit('game:reconnect', { roomId }); });
    socket.on('game:state', (s: any) => setGameState(s));
    socket.on('game:role-assigned', ({ userId, role, team }: any) => {
      if (userId === user?.id) {
        setMyRole(role, team);
        setShowRoleReveal(true);
        sounds.roleReveal();
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
      if (phase === 'NIGHT') sounds.nightFall();
      else if (phase === 'DAY_ANNOUNCEMENT') sounds.dayBreak();
      else if (phase === 'DAY_VOTING') sounds.countdown();
      setMyTurn(false); setSelectedTarget(null);
    });
    socket.on('game:narrator', ({ message, type }: any) => {
      addNarratorMessage({ id: Date.now().toString(), message, type, timestamp: Date.now() });
      narrate(message).catch(() => {});
    });
    socket.on('game:night-role', ({ activeRole, narrator }: any) => {
      setNightActiveRole(activeRole);
      if (narrator) addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'night', timestamp: Date.now() });
    });
    socket.on('game:your-turn', ({ role, targets, duration }: any) => {
      setMyTurn(true, targets, role, duration);
      startTimer(duration);
      sounds.notification();
      toast(`🎯 ${ROLE_CONFIG[role as VampireRole]?.name || role} — Senin sıran!`, { duration: 3000 });
    });
    socket.on('game:detective-result', ({ targetName, result, narrator }: any) => {
      addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'detective', timestamp: Date.now() });
      toast(result === 'SUSPICIOUS' ? `🚨 ${targetName} ŞÜPHELİ!` : `✅ ${targetName} masum`, { duration: 5000 });
    });
    socket.on('game:morning', ({ deaths, narrator, deathAnnouncement }: any) => {
      setMorningDeaths(deaths || []);
      setNightActiveRole(null); setMyTurn(false);
      if (deaths?.length > 0) sounds.eliminated();
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
      if (eliminated) {
        sounds.voteResult();
        if (eliminated.userId === user?.id) setShowEliminated(true);
      }
      if (narrator) addNarratorMessage({ id: Date.now().toString(), message: narrator, type: 'vote_result', timestamp: Date.now() });
    });
    socket.on('game:over', (result: any) => {
      setGameResult(result);
      const iWon = result.players?.find((p: any) => p.userId === user?.id)?.isWinner;
      if (iWon) sounds.win(); else sounds.lose();
      if (result.narrator) {
        addNarratorMessage({ id: Date.now().toString(), message: result.narrator, type: 'game_over', timestamp: Date.now() });
        narrate(result.narrator).catch(() => {});
      }
    });
    socket.on('game:chat', (msg: any) => { addChatMessage(msg); sounds.chatMessage(); });
    socket.on('game:typing', ({ userId, username, isTyping }: any) => {
      if (userId === user?.id) return;
      setGameTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== userId);
        if (!isTyping) return filtered;
        return [...filtered, { userId, username }];
      });
    });
    socket.on('game:emote', ({ userId, emote, timestamp }: any) => {
      if (userId === user?.id) return;
      sounds.voteClick();
      setGameEmotes(prev => [...prev, { userId, emote, timestamp: timestamp || Date.now() }]);
      setTimeout(() => setGameEmotes(prev => prev.filter(e => e.timestamp !== (timestamp || Date.now()))), 3000);
    });
    socket.on('game:error', ({ message }: any) => { toast.error(message); sounds.error(); });
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
    if (myPlayer?.status === 'DEAD') { toast.error('Ölen oyuncular oy kullanamaz'); return; }
    socketRef.current.emit('game:vote', { roomId, targetId });
    sounds.voteClick();
    toast('Oy kullanıldı', { icon: '⚖️' });
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (myPlayer?.status === 'DEAD') { toast.error('Ölen oyuncular sohbet edemez'); return; }
    socketRef.current.emit('game:chat', { roomId, message: chatInput });
    setChatInput('');
    handleGameTyping(false);
  };

  const handleGameEmote = (emote: string) => {
    socketRef.current.emit('game:emote', { roomId, emote });
    setGameEmotes(prev => [...prev, { userId: user?.id || '', emote, timestamp: Date.now() }]);
    setTimeout(() => setShowGameEmoteWheel(false), 500);
  };

  const handleGameTyping = (isTyping: boolean) => {
    socketRef.current.emit('game:typing', { roomId, isTyping });
    if (gameTypingTimeoutRef.current) clearTimeout(gameTypingTimeoutRef.current);
    gameTypingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('game:typing', { roomId, isTyping: false });
    }, 3000);
  };

  const isNight = gameState?.phase === 'NIGHT';
  const isVoting = gameState?.phase === 'DAY_VOTING';
  const isDiscussion = gameState?.phase === 'DAY_DISCUSSION';
  const isGameOver = gameState?.phase === 'GAME_OVER';
  const myPlayer = gameState?.players[user?.id || ''];
  const alivePlayers = gameState ? Object.values(gameState.players).filter((p: any) => p.status === 'ALIVE') : [];
  const allPlayers: GamePlayer[] = gameState ? Object.values(gameState.players) : [];
  const roleInfo = myRole ? ROLE_CONFIG[myRole] : null;

  if (isGameOver && gameResult) {
    return (
      <GameResultScreen
        roomId={roomId}
        gameResult={gameResult}
        allPlayers={allPlayers}
        myUserId={user?.id || ''}
        myTeam={myPlayer?.team}
      />
    );
  }

  return (
    <div className={`min-h-screen text-white transition-colors duration-1000 ${isNight ? 'bg-[#02040a]' : 'bg-[#080b14]'}`}>
      {isNight && (
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(139,0,0,.08) 0%,transparent 60%)' }} />
      )}

      {socketStatus !== 'connected' && (
        <div className={`fixed top-0 left-0 right-0 z-50 text-center text-xs py-1.5 font-semibold ${socketStatus === 'reconnecting' ? 'bg-yellow-500/90 text-yellow-900' : 'bg-red-500/90 text-white'}`}>
          {socketStatus === 'reconnecting' ? '🔄 Yeniden bağlanılıyor...' : '❌ Bağlantı kesildi'}
        </div>
      )}

      <AnimatePresence>
        {showEliminated && myPlayer?.status === 'DEAD' && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ scale:.7, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', delay:.2 }}
              className="text-center max-w-sm mx-4">
              <div className="text-8xl mb-4">💀</div>
              <h2 className="text-4xl font-black text-red-400 mb-3">ELENDİN!</h2>
              <p className="text-gray-400 mb-2">Artık izleyici modundasın.</p>
              {myRole && ROLE_CONFIG[myRole] && (
                <div className="mt-4 p-4 rounded-2xl border border-white/10 bg-white/5 mb-4">
                  <p className="text-sm text-gray-500 mb-1">Rolün açıklandı:</p>
                  <div className="text-3xl mb-1">{ROLE_CONFIG[myRole].icon}</div>
                  <p className="font-bold" style={{ color: ROLE_CONFIG[myRole].color }}>{ROLE_CONFIG[myRole].name}</p>
                </div>
              )}
              <button onClick={() => setShowEliminated(false)}
                className="px-6 py-3 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all font-semibold text-sm">
                👁️ Oyunu İzle
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {myPlayer?.status === 'DEAD' && !isGameOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-start justify-center pt-24">
            <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: .5 }}
              className="pointer-events-auto rounded-2xl border border-red-500/30 bg-[#0d1117]/95 backdrop-blur-xl px-8 py-5 text-center shadow-2xl">
              <div className="text-3xl mb-2">💀</div>
              <p className="font-black text-red-400 text-lg">ELENDİN</p>
              <p className="text-gray-400 text-sm mt-1">Artık seyircisin — oyunu izlemeye devam et</p>
              <p className="text-xs text-gray-600 mt-2">Vampirlerin gece hamlelerini göremezsin</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${isNight ? 'border-red-900/30 bg-[#02040a]/90' : 'border-white/5 bg-[#080b14]/90'}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${socketStatus === 'connected' ? 'bg-green-400' : socketStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${phaseColor[gameState?.phase || 'NIGHT'] || 'text-gray-400 border-gray-700'}`}>
              {phaseLabel[gameState?.phase || ''] || 'Bekleniyor'}
            </span>
            {gameState?.round ? <span className="text-xs text-gray-600">Tur {gameState.round}</span> : null}
            {myPlayer?.status === 'DEAD' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/20 border border-gray-700/30 text-gray-500">👁️ İzleyici</span>
            )}
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

          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            socketStatus === 'connected'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : socketStatus === 'reconnecting'
              ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              socketStatus === 'connected' ? 'bg-green-400 animate-pulse' :
              socketStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
            }`} />
            {socketStatus === 'connected' ? 'Bağlı' : socketStatus === 'reconnecting' ? 'Yeniden bağlanıyor' : 'Bağlantı yok'}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2 space-y-4">
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

            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">
                {alivePlayers.length} hayatta / {allPlayers.length} toplam
                {isVoting && <span className="ml-2 text-orange-400">— Oy kullanmak için tıkla</span>}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {allPlayers.map(p => (
                  <PlayerCard
                    key={p.userId}
                    player={p}
                    isMe={p.userId === user?.id}
                    isVoting={isVoting && myPlayer?.status === 'ALIVE'}
                    isGameOver={isGameOver}
                    onVote={handleVote}
                    showRole={false}
                  />
                ))}
              </div>
              <div className="relative h-0">
                <AnimatePresence>
                  {gameEmotes.map((e) => (
                    <motion.span key={e.timestamp}
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -40, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9 }}
                      className="absolute text-3xl pointer-events-none"
                      style={{ left: `${Math.min(90, Math.max(5, (allPlayers.findIndex(pl => pl.userId === e.userId) || 0) * 16))}%`, top: '0' }}>
                      {e.emote}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>

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
            {isDiscussion && myPlayer?.status === 'DEAD' ? (
              <div className="p-3 border-t border-white/5 text-center text-xs text-gray-600">
                💀 Ölen oyuncular sohbet edemez — izlemeye devam et
              </div>
            ) : isDiscussion ? (
              <>
                {gameTypingUsers.length > 0 && (
                  <div className="px-4 py-1.5 text-xs text-gray-500 flex items-center gap-1">
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="ml-1 truncate">{gameTypingUsers.map(u => u.username).join(', ')} yazıyor...</span>
                  </div>
                )}
                <form onSubmit={handleChat} className="p-3 border-t border-white/5 flex gap-2 relative">
                  {showGameEmoteWheel && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl z-20">
                      {['😂', '😮', '😡', '❤️', '👏', '👍', '🎉', '🤔'].map(em => (
                        <button key={em} onClick={() => handleGameEmote(em)}
                          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg transition-all">
                          {em}
                        </button>
                      ))}
                    </motion.div>
                  )}
                  <button type="button" onClick={() => setShowGameEmoteWheel(s => !s)}
                    className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm">
                    😀
                  </button>
                  <input type="text" value={chatInput} onChange={e => { setChatInput(e.target.value); handleGameTyping(e.target.value.length > 0); }}
                    placeholder="Düşüncelerini paylaş..." maxLength={300}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-xs" />
                  <button type="submit" className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs transition-all">↑</button>
                </form>
              </>
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
