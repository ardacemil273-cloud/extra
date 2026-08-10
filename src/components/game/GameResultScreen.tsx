'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ROLE_CONFIG, VampireRole, GamePlayer } from '@/types';
import { sounds } from '@/lib/sounds';

interface Props {
  roomId: string;
  gameResult: any;
  allPlayers: GamePlayer[];
  myUserId: string;
  myTeam?: string | null;
}

export default function GameResultScreen({ roomId, gameResult, allPlayers, myUserId, myTeam }: Props) {
  const router = useRouter();
  const iWon = myTeam === gameResult.winnerTeam;
  const isVampireWin = gameResult.winnerTeam === 'VAMPIRES';

  useEffect(() => {
    const t = setTimeout(() => {
      if (iWon) sounds.win();
      else sounds.lose();
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const winners = allPlayers.filter(p => p.team === gameResult.winnerTeam);
  const losers = allPlayers.filter(p => p.team !== gameResult.winnerTeam);

  const playerResults: Array<{ userId: string; role: string; isWinner: boolean; xpEarned: number }> =
    gameResult.players || [];

  return (
    <div className={`min-h-screen text-white flex flex-col items-center justify-center px-4 py-8 ${isVampireWin ? 'bg-gradient-to-b from-red-950 via-[#080b14] to-[#080b14]' : 'bg-gradient-to-b from-purple-950 via-[#080b14] to-[#080b14]'}`}>

      {/* Confetti / particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {iWon && [...Array(20)].map((_, i) => (
          <motion.div key={i}
            initial={{ y: -20, x: `${Math.random()*100}vw`, opacity: 1 }}
            animate={{ y: '110vh', opacity: 0, rotate: Math.random()*720 }}
            transition={{ duration: Math.random()*3+2, delay: Math.random()*2, repeat: Infinity }}
            className="absolute text-2xl"
            style={{ fontSize: `${Math.random()*16+8}px` }}>
            {['🎉','⭐','✨','🏆','💫'][Math.floor(Math.random()*5)]}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity:0, scale:.8 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring', duration:.6 }}
          className="text-center mb-8">
          <div className="text-7xl mb-4" style={{ filter: iWon ? 'drop-shadow(0 0 20px gold)' : 'none' }}>
            {iWon ? '🏆' : '💀'}
          </div>
          <h1 className={`text-5xl font-black mb-2 ${iWon ? 'text-yellow-400' : 'text-red-400'}`}
            style={{ textShadow: iWon ? '0 0 30px rgba(245,158,11,.5)' : '0 0 30px rgba(239,68,68,.5)' }}>
            {iWon ? 'KAZANDIN&apos;!' : 'KAYBETTİN&apos;!'}
          </h1>
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold ${isVampireWin ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>
            {isVampireWin ? '🧛 Vampirler Kazandı&apos;!' : '🧑 Köylüler Kazandı&apos;!'}
          </div>
        </motion.div>

        {/* Narrator */}
        {gameResult.narrator && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
            className="narrator-box mb-6">
            <p className="text-sm italic text-purple-200 pl-6 leading-relaxed">"{gameResult.narrator}"</p>
          </motion.div>
        )}

        {/* Kazananlar / Kaybedenler */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Kazananlar */}
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:.4 }}
            className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">
              🏆 Kazananlar ({winners.length})
            </p>
            <div className="space-y-2">
              {winners.map(p => {
                const r = ROLE_CONFIG[p.role as VampireRole];
                const pr = playerResults.find(x => x.userId === p.userId);
                return (
                  <div key={p.userId} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center font-bold text-sm">
                      {(p.displayName||'?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.displayName}</p>
                      <p className="text-xs text-gray-500">{r?.icon} {r?.name}</p>
                    </div>
                    {pr && <span className="text-xs text-yellow-400 font-bold">+{pr.xpEarned}xp</span>}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Kaybedenler */}
          <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:.4 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">
              💀 Kaybedenler ({losers.length})
            </p>
            <div className="space-y-2">
              {losers.map(p => {
                const r = ROLE_CONFIG[p.role as VampireRole];
                const pr = playerResults.find(x => x.userId === p.userId);
                return (
                  <div key={p.userId} className="flex items-center gap-2 opacity-70">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center font-bold text-sm">
                      {(p.displayName||'?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{p.displayName}</p>
                      <p className="text-xs text-gray-500">{r?.icon} {r?.name}</p>
                    </div>
                    {pr && <span className="text-xs text-gray-500">+{pr.xpEarned}xp</span>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Tüm roller */}
        {gameResult.allRoles && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.5 }}
            className="rounded-2xl border border-white/8 bg-white/3 p-4 mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tüm Roller</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(gameResult.allRoles).map(([uid, roleData]: any) => {
                const p = allPlayers.find(pl => pl.userId === uid);
                if (!p) return null;
                const r = ROLE_CONFIG[roleData.role as VampireRole];
                const isWinner = roleData.team === gameResult.winnerTeam;
                return (
                  <div key={uid} className={`flex items-center gap-2 p-2 rounded-xl border ${isWinner ? 'border-green-500/20 bg-green-500/5' : 'border-white/5 bg-white/2'}`}>
                    <span className="text-lg">{r?.icon || '❓'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{p.displayName}</p>
                      <p className="text-xs text-gray-600">{r?.name}</p>
                    </div>
                    {isWinner && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Butonlar */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.6 }}
          className="flex gap-3 justify-center">
          <button onClick={() => { sounds.click(); router.push(`/room/${roomId}`); }}
            className="px-8 py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all active:scale-95 shadow-lg shadow-purple-500/20">
            🔄 Tekrar Oyna
          </button>
          <button onClick={() => { sounds.click(); router.push('/dashboard'); }}
            className="px-8 py-3 rounded-2xl font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95">
            🏠 Lobi
          </button>
        </motion.div>
      </div>
    </div>
  );
}
