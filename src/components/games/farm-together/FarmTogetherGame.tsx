'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGameSocket, connectGameSocket } from '@/lib/socket';
import { FarmState, FarmCell, CropType } from '@/types';
import { sounds } from '@/lib/sounds';
import toast from 'react-hot-toast';
import GameOverPastel from '@/components/games/GameOverPastel';

const CROPS: Record<CropType, { name: string; icon: string; duration: number; value: number }> = {
  wheat: { name: 'Buğday', icon: '🌾', duration: 30, value: 10 },
  strawberry: { name: 'Çilek', icon: '🍓', duration: 60, value: 20 },
  pumpkin: { name: 'Kabak', icon: '🎃', duration: 120, value: 40 },
};

const RULES = [
  '🌾 Birlikte çiftçilik yapın! 5 dakikada 1000 altın kazanın.',
  '🌱 Tohum seç → hücreye tıkla → ek.',
  '💧 Su: ürünleri hızla büyütür (5sn kazandırır). Başkalarının sulamasına da senin ekranında su sıçrar!',
  '🧺 Hasat: ürünler hazır olunca tıkla ve altın kazan.',
  '🎯 Bu bir TAKIM oyunu — hedefe birlikte ulaşın, hepiniz kazanırsınız!',
];

interface Props {
  roomId: string;
  myUserId: string;
}

export default function FarmTogetherGame({ roomId, myUserId }: Props) {
  const socketRef = useRef(getGameSocket());
  const [farm, setFarm] = useState<FarmState | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropType>('wheat');
  const [showRules, setShowRules] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<any>(null);
  const [splashes, setSplashes] = useState<Array<{ cell: number; id: number }>>([]);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    connectGameSocket();
    const socket = socketRef.current;
    socket.emit('game:join', { roomId });

    socket.on('farm:state-update', (s: FarmState) => {
      setFarm(s);
      if (s.remaining !== undefined) setTimeLeft(s.remaining);
    });
    socket.on('farm:countdown', ({ countdown }: any) => setCountdown(countdown));
    socket.on('farm:watered', ({ cellIndex, userId }: any) => {
      if (userId !== myUserId) {
        const id = Date.now();
        setSplashes(prev => [...prev, { cell: cellIndex, id }]);
        setTimeout(() => setSplashes(prev => prev.filter(x => x.id !== id)), 1200);
        sounds.notification();
      }
    });
    socket.on('farm:planted', () => sounds.actionDone());
    socket.on('farm:harvested', ({ coins }: any) => {
      sounds.success();
      toast(`+ altın! Toplam: ${coins}`, { icon: '🪙' });
    });
    socket.on('farm:sound', ({ type }: any) => {
      if (type === 'water') sounds.voteClick();
      if (type === 'harvest') sounds.success();
      if (type === 'grown') sounds.notification();
    });
    socket.on('game:over', (result: any) => {
      setGameOver(result);
      saveResult(result);
    });

    return () => { socket.off(); };
  }, [roomId, myUserId]);

  const saveResult = async (result: any) => {
    // XP already saved server side; just show UI
    void result;
  };

  const plant = (cell: FarmCell) => {
    if (!cell.crop) {
      socketRef.current.emit('farm:plant', { roomId, cellIndex: cell.index, crop: selectedCrop });
    }
  };

  const water = (cell: FarmCell) => {
    if (cell.crop && !cell.grown) {
      socketRef.current.emit('farm:water', { roomId, cellIndex: cell.index });
    }
  };

  const harvest = (cell: FarmCell) => {
    if (cell.crop && cell.grown) {
      socketRef.current.emit('farm:harvest', { roomId, cellIndex: cell.index });
    }
  };

  const handleCell = (cell: FarmCell) => {
    if (cell.grown) harvest(cell);
    else if (cell.crop) water(cell);
    else plant(cell);
  };

  if (gameOver) {
    return (
      <GameOverPastel
        roomId={roomId}
        emoji="🌾"
        win={!!gameOver.won}
        winnerText={gameOver.won ? 'HASAT ZAMANI!' : 'SÜRE DOLDU'}
        subtitle={`${gameOver.coins} / ${gameOver.goal} altın toplandı`}
        narrator={gameOver.narrator}
        players={gameOver.players}
      />
    );
  }

  return (
    <div className="min-h-screen pastel-bg text-[#5a4a6a]">
      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <motion.div key={countdown} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black pastel-text-gold">{countdown}</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: .9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="pastel-card rounded-3xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2 animate-bounce-soft">🌾</div>
                <h2 className="text-2xl font-black pastel-shimmer">Farm Together</h2>
                <p className="text-sm text-[#a08fb0] mt-1">Takım oyunu — birlikte çiftçilik!</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#7a6a8a]">
                    <span className="text-[#b39ddb] flex-shrink-0">✦</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => { setShowRules(false); sounds.click(); }}
                className="w-full py-3 rounded-2xl font-bold pastel-btn">🌱 Başla!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[#ffc1e3]/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="font-black pastel-shimmer">Farm Together</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
              🪙 <span className="text-[#e6a03c]">{farm?.coins || 0}</span> / {farm?.goal || 1000}
            </div>
            <div className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
              ⏱ {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
            </div>
          </div>
        </div>
        {/* Goal progress */}
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="h-2.5 rounded-full bg-[#ffe4ec] overflow-hidden">
            <div className="h-full rounded-full transition-all bg-gradient-to-r from-[#ffb6c1] to-[#c3a6e0]"
              style={{ width: `${Math.min(100, ((farm?.coins||0)/(farm?.goal||1000))*100)}%` }} />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Seed selection */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(Object.keys(CROPS) as CropType[]).map(crop => (
            <button key={crop} onClick={() => setSelectedCrop(crop)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all flex-shrink-0 ${
                selectedCrop === crop ? 'bg-white shadow-lg border-[#ffb6c1] scale-105' : 'bg-white/60 border-transparent hover:border-[#ffc1e3]'
              }`}>
              <span className="text-2xl">{CROPS[crop].icon}</span>
              <div className="text-left">
                <p className="text-xs font-bold">{CROPS[crop].name}</p>
                <p className="text-[10px] text-[#a08fb0]">{CROPS[crop].duration}sn · +{CROPS[crop].value}🪙</p>
              </div>
            </button>
          ))}
        </div>

        {/* Isometric farm grid */}
        <div className="rounded-3xl pastel-card p-4 sm:p-6">
          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {farm?.grid.map((cell) => {
              const crop = cell.crop;
              const def = crop ? CROPS[crop] : null;
              const isSelected = selectedCrop === crop;
              return (
                <button key={cell.index} onClick={() => handleCell(cell)}
                  className="relative aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: cell.grown
                      ? `linear-gradient(135deg, ${def?.icon === '🌾' ? '#ffe4b5' : def?.icon === '🍓' ? '#ffb6c1' : '#ffd9a8'}, #fff8e7)`
                      : cell.crop
                      ? 'linear-gradient(135deg,#8d6e63,#a1887f)'
                      : 'linear-gradient(135deg,#d2b48c,#c7a97e)',
                    border: cell.grown ? '2px solid #98fb98' : '2px solid rgba(139,110,80,.3)',
                  }}>
                  {cell.grown && def && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                      className="text-2xl sm:text-3xl">{def.icon}</motion.span>
                  )}
                  {cell.crop && !cell.grown && (
                    <span className="text-xl sm:text-2xl opacity-70">🌱</span>
                  )}
                  {/* growth progress ring */}
                  {cell.crop && !cell.grown && (
                    <span className="absolute bottom-0.5 left-0.5 right-0.5 h-1 rounded-full bg-white/40 overflow-hidden">
                      <span className="block h-full bg-[#98fb98] transition-all" style={{ width: `${cell.growth*100}%` }} />
                    </span>
                  )}
                  {isSelected && cell.crop && !def && (
                    <span className="absolute text-xs">🌱</span>
                  )}
                  {/* Water splash */}
                  {splashes.filter(s => s.cell === cell.index).map(s => (
                    <span key={s.id} className="absolute inset-0 flex items-center justify-center">
                      <span className="w-8 h-8 rounded-full bg-[#87ceeb]/60 animate-water-ripple" />
                      <span className="absolute text-xl">💧</span>
                    </span>
                  ))}
                  {/* Hint for empty + selected crop */}
                  {!cell.crop && selectedCrop && (
                    <span className="text-lg opacity-40">{CROPS[selectedCrop].icon}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-[#a08fb0] mt-3">
            💡 Hazır ürüne tıkla = hasat · 🌱 ekiliye tıkla = su · boşa tıkla = ek
          </p>
        </div>
      </div>
    </div>
  );
}
