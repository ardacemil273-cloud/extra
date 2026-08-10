'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { sounds } from '@/lib/sounds';

interface Props {
  roomId: string;
  winnerText: string;
  subtitle?: string;
  emoji: string;
  narrator?: string;
  players?: Array<{ userId: string; displayName: string; xpEarned: number; isWinner: boolean }>;
  win: boolean;
}

export default function GameOverPastel({ roomId, winnerText, subtitle, emoji, narrator, players, win }: Props) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => { win ? sounds.win() : sounds.lose(); }, 500);
    return () => clearTimeout(t);
  }, [win]);

  return (
    <div className="min-h-screen pastel-bg flex flex-col items-center justify-center px-4 py-8 text-[#5a4a6a]">
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {win && [...Array(24)].map((_, i) => (
          <motion.div key={i}
            className="animate-confetti absolute text-2xl"
            style={{ left: `${Math.random()*100}vw`, fontSize: `${Math.random()*16+10}px`, animationDuration: `${Math.random()*3+2}s`, animationDelay: `${Math.random()*2}s` }}>
            {['🎉','⭐','🌸','✨','💖','🎊'][Math.floor(Math.random()*6)]}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <motion.div initial={{ opacity:0, scale:.8 }} animate={{ opacity:1, scale:1 }} transition={{ type:'spring' }}
          className="text-center mb-6">
          <motion.div className="text-8xl mb-3" animate={{ rotate: [0,10,-10,0] }} transition={{ duration:1.5, repeat:Infinity }}>
            {emoji}
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-black pastel-shimmer mb-2">{winnerText}</h1>
          {subtitle && <p className="text-[#a08fb0] text-sm sm:text-base">{subtitle}</p>}
        </motion.div>

        {narrator && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
            className="pastel-card rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm text-[#7a6a8a] italic">{narrator}</p>
          </motion.div>
        )}

        {players && players.length > 0 && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.4 }}
            className="pastel-card rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#b39ddb] mb-3">Oyuncular</p>
            <div className="space-y-2">
              {players.map((p) => (
                <div key={p.userId} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${p.isWinner ? 'bg-gradient-to-br from-[#ffd54f] to-[#ffb6c1] text-white' : 'bg-white/60 text-[#a08fb0]'}`}>
                    {(p.displayName||'?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${p.isWinner ? 'text-[#e6a03c]' : 'text-[#7a6a8a]'}`}>
                      {p.displayName} {p.isWinner && '👑'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#c3a6e0]">+{p.xpEarned} xp</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:.6 }}
          className="flex gap-3 justify-center">
          <button onClick={() => { sounds.click(); router.push(`/room/${roomId}`); }}
            className="px-8 py-3 rounded-2xl font-bold pastel-btn">
            🔄 Tekrar Oyna
          </button>
          <button onClick={() => { sounds.click(); router.push('/dashboard'); }}
            className="px-8 py-3 rounded-2xl font-bold bg-white/70 text-[#8a7a9a] border border-[#ffc1e3]/50 hover:bg-white transition-all">
            🏠 Lobi
          </button>
        </motion.div>
      </div>
    </div>
  );
}
