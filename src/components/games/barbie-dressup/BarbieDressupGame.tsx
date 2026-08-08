'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGameSocket, connectGameSocket } from '@/lib/socket';
import { BarbieState, BarbieItem, BarbieCategory } from '@/types';
import { sounds } from '@/lib/sounds';
import toast from 'react-hot-toast';
import GameOverPastel from '@/components/games/GameOverPastel';

const WARDROBE: BarbieItem[] = [
  // Dresses
  { id: 'dress-pink-tulle', category: 'dress', name: 'Pembe Tül', emoji: '👗', color: '#ff69b4' },
  { id: 'dress-malibu-swim', category: 'dress', name: 'Malibu Mayo', emoji: '👙', color: '#ffb6c1' },
  { id: 'dress-princess-gown', category: 'dress', name: 'Prenses Balo', emoji: '👸', color: '#ffc0cb' },
  { id: 'dress-astronaut', category: 'dress', name: 'Astronot', emoji: '👩‍🚀', color: '#eeeeee' },
  { id: 'dress-doctor', category: 'dress', name: 'Doktor', emoji: '🥼', color: '#ffffff' },
  { id: 'dress-ceo', category: 'dress', name: 'CEO Barbie', emoji: '💼', color: '#ff69b4' },
  { id: 'dress-sequin', category: 'dress', name: 'Simli Gece', emoji: '✨', color: '#ffd700' },
  // Tops
  { id: 'top-crop-pink', category: 'top', name: 'Pembe Crop', emoji: '👚', color: '#ffb6c1' },
  { id: 'top-tank', category: 'top', name: 'Atlet', emoji: '🎽', color: '#fff0f5' },
  { id: 'top-blazer', category: 'top', name: 'Blazer', emoji: '🧥', color: '#ff69b4' },
  // Bottoms
  { id: 'bottom-skirt', category: 'bottom', name: 'Pembe Etek', emoji: '👗', color: '#ffc0cb' },
  { id: 'bottom-jeans', category: 'bottom', name: 'Kot Şort', emoji: '🩳', color: '#5c6bc0' },
  { id: 'bottom-tutu', category: 'bottom', name: 'Tutu', emoji: '🎀', color: '#ffb6c1' },
  // Shoes
  { id: 'shoe-heels-pink', category: 'shoes', name: 'Pembe Topuklu', emoji: '👠', color: '#ff69b4' },
  { id: 'shoe-sneakers', category: 'shoes', name: 'Pembe Spor', emoji: '👟', color: '#ffb6c1' },
  { id: 'shoe-boots', category: 'shoes', name: 'Uzun Çizme', emoji: '👢', color: '#ffc0cb' },
  { id: 'shoe-sandals', category: 'shoes', name: 'Sandalet', emoji: '🩴', color: '#fff0f5' },
  // Bags
  { id: 'bag-pink-clutch', category: 'bag', name: 'Pembe Clutch', emoji: '👛', color: '#ff69b4' },
  { id: 'bag-tote', category: 'bag', name: 'Alışveriş', emoji: '👜', color: '#ffc0cb' },
  { id: 'bag-backpack', category: 'bag', name: 'Sırt Çantası', emoji: '🎒', color: '#ffb6c1' },
  // Hair
  { id: 'hair-blond', category: 'hair', name: 'Sarışın', emoji: '💁‍♀️', color: '#ffd700' },
  { id: 'hair-pink', category: 'hair', name: 'Pembe Saç', emoji: '💇‍♀️', color: '#ff69b4' },
  { id: 'hair-ponytail', category: 'hair', name: 'At Kuyruğu', emoji: '💇‍♀️', color: '#fff0f5' },
  { id: 'hair-buns', category: 'hair', name: 'Topuz', emoji: '👧', color: '#ffe4b5' },
  // Makeup
  { id: 'makeup-lipstick-pink', category: 'makeup', name: 'Pembe Ruj', emoji: '💄', color: '#ff69b4' },
  { id: 'makeup-lipstick-red', category: 'makeup', name: 'Kırmızı Ruj', emoji: '💄', color: '#e91e63' },
  { id: 'makeup-eyeshadow', category: 'makeup', name: 'Far', emoji: '🎨', color: '#ffb6c1' },
  { id: 'makeup-blush', category: 'makeup', name: 'Allık', emoji: '🌸', color: '#ffc0cb' },
  // Accessories
  { id: 'acc-tiara', category: 'accessory', name: 'Taç', emoji: '👑', color: '#ffd700' },
  { id: 'acc-sunglasses', category: 'accessory', name: 'Gözlük', emoji: '🕶️', color: '#ff69b4' },
  { id: 'acc-necklace', category: 'accessory', name: 'Kolye', emoji: '📿', color: '#ffc0cb' },
  { id: 'acc-earrings', category: 'accessory', name: 'Küpe', emoji: '💎', color: '#ffb6c1' },
  { id: 'acc-bow', category: 'accessory', name: 'Fiyonk', emoji: '🎀', color: '#ff69b4' },
  { id: 'acc-crown', category: 'accessory', name: 'Barbie Tacı', emoji: '👑', color: '#ffd700' },
];

const CATEGORIES: Array<{ key: BarbieCategory; label: string; emoji: string }> = [
  { key: 'dress', label: 'Elbiseler', emoji: '👗' },
  { key: 'top', label: 'Üstler', emoji: '👚' },
  { key: 'bottom', label: 'Altlar', emoji: '👖' },
  { key: 'shoes', label: 'Ayakkabı', emoji: '👠' },
  { key: 'bag', label: 'Çantalar', emoji: '👛' },
  { key: 'hair', label: 'Saçlar', emoji: '💇‍♀️' },
  { key: 'makeup', label: 'Makyaj', emoji: '💄' },
  { key: 'accessory', label: 'Aksesuar', emoji: '💎' },
];

const RULES = [
  '💖 Rüya Dolabına hoş geldin! Barbie\'yi en güzel giydir!',
  '👗 5 tur var: Malibu, Pijama, Prenses, Paris, Randevu!',
  '⏱ Her tur giyinmek için 60 saniyen var.',
  '💄 Elbise, saç ve makyaj seçebilirsin.',
  '💃 Barbie kutusundan çıkıp podyumda yürüyecek!',
  '⭐ Herkesin Barbie\'sini 1-5 yıldızla oyla. Kendine oy veremezsin!',
  '👑 En çok puan alan "Barbie of the Year" olur!',
];

interface Props {
  roomId: string;
  myUserId: string;
  players: Array<{ userId: string; displayName: string }>;
}

export default function BarbieDressupGame({ roomId, myUserId, players }: Props) {
  const socketRef = useRef(getGameSocket());
  const [barbie, setBarbie] = useState<BarbieState | null>(null);
  const [showRules, setShowRules] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BarbieCategory>('dress');
  const [myItems, setMyItems] = useState<string[]>([]);
  const [myMakeup, setMyMakeup] = useState<string[]>([]);
  const [dressTime, setDressTime] = useState(60);
  const [gameOver, setGameOver] = useState<any>(null);
  const [runwayLook, setRunwayLook] = useState<{ userId: string; displayName: string; items: string[]; makeup: string[]; pos: number; total: number; phrase: string } | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [twirl, setTwirl] = useState(false);

  useEffect(() => {
    connectGameSocket();
    const socket = socketRef.current;
    socket.emit('game:join', { roomId });

    socket.on('barbie:state-update', (s: BarbieState) => {
      setBarbie(s);
      if (s.looks && s.looks[myUserId]) {
        setMyItems(s.looks[myUserId].items);
        setMyMakeup(s.looks[myUserId].makeup || []);
      }
      if (s.dressTime) setDressTime(s.dressTime);
    });
    socket.on('barbie:round-start', ({ round, theme, dressTime }: any) => {
      sounds.gameStart();
      toast(`🎯 Tur ${round+1}: ${theme.name}`, { icon: theme.emoji });
      setMyItems([]); setMyMakeup([]); setMyVote(null);
      setDressTime(dressTime);
    });
    socket.on('barbie:box-reveal', () => {
      sounds.notification();
      toast('Barbie kutusu açılıyor! 💖', { icon: '📦' });
    });
    socket.on('barbie:show-look', (look: any) => {
      setRunwayLook(look);
      setMyVote(null);
      setTwirl(true);
      sounds.win();
      setTimeout(() => setTwirl(false), 1500);
    });
    socket.on('barbie:round-result', ({ round, scores, totalScores }: any) => {
      sounds.voteResult();
      toast(`Tur ${round+1} bitti! Puanlar hesaplandı 📊`, { icon: '📊' });
    });
    socket.on('barbie:result', ({ podium, winnerId }: any) => {
      const p = players.find(pl => pl.userId === winnerId);
      toast(`👑 ${p?.displayName || 'Biri'} Barbie of the Year!`, { icon: '👑' });
    });
    socket.on('game:over', (result: any) => setGameOver(result));

    return () => { socket.off(); };
  }, [roomId, myUserId]);

  const addSparkle = () => {
    const id = Date.now() + Math.random();
    setSparkles(prev => [...prev, { id, x: Math.random()*100, y: Math.random()*100 }]);
    setTimeout(() => setSparkles(prev => prev.filter(s => s.id !== id)), 1000);
  };

  const pickItem = (itemId: string) => {
    const item = WARDROBE.find(w => w.id === itemId);
    if (!item) return;
    if (item.category === 'makeup') {
      socketRef.current.emit('barbie:makeup', { roomId, itemId });
    } else {
      socketRef.current.emit('barbie:pick-item', { roomId, itemId });
    }
    sounds.click();
    addSparkle();
  };

  const submitLook = () => {
    socketRef.current.emit('barbie:submit-look', { roomId });
    sounds.success();
    toast('Barbie\'n hazır! Kutudan çıkmaya hazır 💖', { icon: '📦' });
  };

  const vote = (stars: number) => {
    if (!runwayLook) return;
    if (runwayLook.userId === myUserId) { toast('Kendine oy veremezsin!', { icon: '🚫' }); return; }
    setMyVote(stars);
    socketRef.current.emit('barbie:vote', { roomId, targetId: runwayLook.userId, stars });
    sounds.voteClick();
  };

  const itemById = (id: string) => WARDROBE.find(w => w.id === id);

  if (gameOver) {
    return (
      <div className="min-h-screen pastel-bg flex items-center justify-center">
        <GameOverPastel
          roomId={roomId}
          emoji="👑"
          win={gameOver.won === myUserId}
          winnerText={gameOver.won === myUserId ? 'BARBIE OF THE YEAR!' : 'BARBIE OF THE YEAR'}
          subtitle={gameOver.won === myUserId ? 'Sen Barbie of the Year oldun! You can be anything!' : gameOver.narrator}
          narrator={gameOver.narrator}
          players={gameOver.players}
        />
      </div>
    );
  }

  // RUNWAY - Barbie box reveal + twirl + voting
  if (barbie?.phase === 'BOX_REVEAL' || (barbie?.phase === 'RUNWAY' && runwayLook)) {
    const lookItems: BarbieItem[] = (runwayLook?.items || []).map(id => itemById(id)).filter((i): i is BarbieItem => !!i);
    const makeupItems: BarbieItem[] = (runwayLook?.makeup || []).map(id => itemById(id)).filter((i): i is BarbieItem => !!i);
    const isMe = runwayLook?.userId === myUserId;
    return (
      <div className="min-h-screen pastel-bg bg-gradient-to-br from-[#ffc0cb] via-[#ffd6e8] to-[#ffb6c1] flex flex-col items-center justify-center px-4 py-6 text-[#5a4a6a]">
        {/* Glitter sparkles overlay */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div key={i}
              initial={{ y: -20, x: `${Math.random()*100}vw`, opacity: 1 }}
              animate={{ y: '110vh', opacity: 0, scale: Math.random()*1.5+0.5 }}
              transition={{ duration: Math.random()*3+2, delay: Math.random()*2, repeat: Infinity }}
              className="absolute text-xl">✨</motion.div>
          ))}
        </div>

        <div className="text-center mb-4 relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#ff69b4]">~ Barbie Dreamhouse Podyum ~</p>
          <h2 className="text-3xl font-black text-[#ff69b4] drop-shadow" style={{ textShadow: '0 0 20px rgba(255,105,180,.5)' }}>
            {runwayLook?.displayName || 'Barbie'}
          </h2>
          <p className="text-xs text-[#a08fb0]">{runwayLook ? `${runwayLook.pos+1} / ${runwayLook.total}` : 'Kutu açılıyor...'}</p>
        </div>

        {/* Barbie box */}
        <motion.div
          animate={twirl ? { rotateY: [0, 360] } : { rotateY: 0 }}
          transition={{ duration: 1.5 }}
          className="w-60 h-80 rounded-3xl bg-gradient-to-br from-[#ff69b4] to-[#ff1493] p-3 shadow-2xl relative z-10 mb-6"
          style={{ boxShadow: '0 0 40px rgba(255,20,147,.4)' }}>
          <div className="w-full h-full rounded-2xl bg-white/20 border-2 border-white/40 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-end justify-center pb-2">
              <div className="text-[10px] font-black text-white tracking-widest">BARBIE</div>
            </div>
            {/* Hair */}
            <div className="absolute top-3 text-3xl">{lookItems.filter(i => i.category === 'hair').map(i => i.emoji)}</div>
            {/* Makeup face */}
            <div className="text-6xl mt-6" style={{ color: '#ffe0bd' }}>{isMe ? '😊' : '😌'}</div>
            {/* Makeup overlays */}
            <div className="flex gap-1 mt-1">
              {makeupItems.map((i, idx) => <span key={idx} className="text-xl">{i.emoji}</span>)}
            </div>
            {/* Body */}
            <div className="flex flex-col items-center gap-1 mt-1">
              {lookItems.filter(i => i.category === 'dress').map((i, idx) => <span key={idx} className="text-4xl">{i.emoji}</span>)}
              {lookItems.filter(i => i.category === 'top').map((i, idx) => <span key={idx} className="text-3xl">{i.emoji}</span>)}
              {lookItems.filter(i => i.category === 'bottom').map((i, idx) => <span key={idx} className="text-3xl">{i.emoji}</span>)}
              {lookItems.filter(i => i.category === 'shoes').map((i, idx) => <span key={idx} className="text-2xl">{i.emoji}</span>)}
            </div>
            {/* Bags + accessories */}
            <div className="absolute bottom-6 flex gap-2">
              {lookItems.filter(i => i.category === 'bag').map((i, idx) => <span key={idx} className="text-2xl">{i.emoji}</span>)}
              {lookItems.filter(i => i.category === 'accessory').map((i, idx) => <span key={idx} className="text-2xl">{i.emoji}</span>)}
            </div>
          </div>
        </motion.div>

        {/* Phrase */}
        {runwayLook?.phrase && (
          <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}
            className="pastel-card rounded-2xl px-5 py-2 mb-4 text-[#ff69b4] font-black italic relative z-10">
            "{runwayLook.phrase}"
          </motion.div>
        )}

        {/* Voting */}
        {runwayLook && !isMe && (
          <div className="pastel-card rounded-2xl p-4 w-full max-w-md relative z-10">
            <p className="text-center text-sm font-bold mb-3">Bu Barbie\'yi oyla! ⭐</p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => vote(s)}
                  className={`text-3xl transition-all ${myVote === s ? 'scale-125' : 'opacity-60 hover:scale-110 hover:opacity-100'}`}>
                  {s <= (myVote || 0) ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>
        )}
        {runwayLook && isMe && (
          <div className="pastel-card rounded-2xl p-4 text-center text-sm text-[#a08fb0] relative z-10">
            Bu senin Barbie\'n — herkes oyluyor! 💖
          </div>
        )}
      </div>
    );
  }

  // DRESSING view
  return (
    <div className="min-h-screen pastel-bg bg-gradient-to-br from-[#fff0f5] via-[#ffd6e8] to-[#ffc0cb] text-[#5a4a6a]">
      {/* Rules modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: .9, rotateY: -20 }} animate={{ scale: 1, rotateY: 0 }}
              className="pastel-card rounded-3xl max-w-md w-full p-6 border-2 border-[#ff69b4]/40">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2 animate-bounce-soft">💖</div>
                <h2 className="text-3xl font-black text-[#ff69b4]" style={{ textShadow: '0 0 20px rgba(255,105,180,.4)' }}>Barbie Dreamhouse</h2>
                <p className="text-sm text-[#a08fb0] mt-1">Rüya dolabını aç ve Barbie of the Year ol!</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#7a6a8a]">
                    <span className="text-[#ff69b4] flex-shrink-0">✨</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => { setShowRules(false); sounds.gameStart(); }}
                className="w-full py-3 rounded-2xl font-black pastel-btn text-lg">💖 Başla!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[#ff69b4]/30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💖👛</span>
            <span className="font-black text-[#ff69b4]" style={{ textShadow: '0 0 15px rgba(255,105,180,.4)' }}>Barbie Dreamhouse</span>
          </div>
          <div className="flex items-center gap-2">
            {barbie?.theme && (
              <span className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
                {barbie.theme.emoji} {barbie.theme.name}
              </span>
            )}
            <span className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
              Tur {barbie ? barbie.round+1 : 1}/5
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Dress time bar */}
        {barbie?.phase === 'DRESSING' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#a08fb0] mb-1">
              <span>⏱ Giyinme süresi</span>
              <span className="font-bold text-[#ff69b4]">{dressTime}sn</span>
            </div>
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${dressTime <= 10 ? 'bg-red-400 animate-pulse' : 'bg-gradient-to-r from-[#ff69b4] to-[#ffb6c1]'}`}
                style={{ width: `${(dressTime/60)*100}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dream closet - left */}
          <div className="pastel-card rounded-3xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#ff69b4] mb-2">💖 Dream Closet</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all ${activeCategory === cat.key ? 'bg-[#ff69b4] text-white' : 'bg-white/60 text-[#8a7a9a]'}`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WARDROBE.filter(w => w.category === activeCategory).map(item => (
                <motion.button key={item.id} whileHover={{ scale: 1.08 }} whileTap={{ scale: .95 }}
                  onClick={() => pickItem(item.id)}
                  className="rounded-2xl p-2 bg-white/70 border border-transparent hover:border-[#ff69b4] transition-all flex flex-col items-center relative">
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-[10px] text-[#8a7a9a] mt-1 text-center">{item.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Giant Barbie avatar - center */}
          <div className="pastel-card rounded-3xl p-4 flex flex-col items-center relative">
            {/* Sparkles on equip */}
            {sparkles.map(s => (
              <motion.span key={s.id} initial={{ opacity: 1, scale: 0 }} animate={{ opacity: 0, scale: 1.5 }}
                className="absolute text-2xl z-20 pointer-events-none" style={{ left: `${s.x}%`, top: `${s.y}%` }}>✨</motion.span>
            ))}
            <p className="text-xs font-bold uppercase tracking-widest text-[#ff69b4] mb-2">Barbie\'n</p>
            <div className="w-44 h-64 rounded-2xl bg-gradient-to-b from-[#ffd6e8] to-[#ffc0cb] flex flex-col items-center justify-center relative border-2 border-[#ff69b4]/40 mb-3">
              <div className="absolute top-2 text-3xl">{myItems.map(id => itemById(id)).filter(i => i?.category === 'hair').map(i => i!.emoji)}</div>
              <div className="text-6xl mt-4" style={{ color: '#ffb07a' }}>😊</div>
              <div className="flex gap-1">
                {myMakeup.map(id => itemById(id)).filter((i): i is BarbieItem => !!i).map((i, idx) => <span key={idx} className="text-xl">{i.emoji}</span>)}
              </div>
              <div className="flex flex-col items-center gap-1">
                {myItems.map(id => itemById(id)).filter(i => i?.category === 'dress').map((i, idx) => <span key={idx} className="text-4xl">{i!.emoji}</span>)}
                {myItems.map(id => itemById(id)).filter(i => i?.category === 'top').map((i, idx) => <span key={idx} className="text-3xl">{i!.emoji}</span>)}
                {myItems.map(id => itemById(id)).filter(i => i?.category === 'bottom').map((i, idx) => <span key={idx} className="text-3xl">{i!.emoji}</span>)}
                {myItems.map(id => itemById(id)).filter(i => i?.category === 'shoes').map((i, idx) => <span key={idx} className="text-2xl">{i!.emoji}</span>)}
              </div>
              <div className="absolute bottom-2 flex gap-2">
                {myItems.map(id => itemById(id)).filter(i => i?.category === 'bag').map((i, idx) => <span key={idx} className="text-xl">{i!.emoji}</span>)}
                {myItems.map(id => itemById(id)).filter(i => i?.category === 'accessory').map((i, idx) => <span key={idx} className="text-xl">{i!.emoji}</span>)}
              </div>
            </div>
            <button onClick={submitLook} disabled={barbie?.submitted?.includes(myUserId)}
              className="px-8 py-3 rounded-2xl font-black pastel-btn text-lg disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400">
              {barbie?.submitted?.includes(myUserId) ? '✓ Hazır!' : '📦 Kutudan Çık!'}
            </button>
          </div>

          {/* Theme + inspiration - right */}
          <div className="space-y-3">
            <div className="pastel-card rounded-3xl p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ff69b4] mb-2">Tema</p>
              <div className="text-5xl mb-2">{barbie?.theme?.emoji || '🏖️'}</div>
              <h3 className="text-xl font-black text-[#ff69b4]">{barbie?.theme?.name || 'Loading...'}</h3>
              <p className="text-xs text-[#a08fb0] mt-1">{barbie?.theme?.desc}</p>
            </div>
            <div className="pastel-card rounded-3xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ff69b4] mb-2">İlham</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['👗', '👠', '🎀', '💄', '👑', '🕶️', '👛', '💇‍♀️'].map((e, i) => (
                  <motion.span key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: i*0.15 }}
                    className="text-3xl">{e}</motion.span>
                ))}
              </div>
            </div>
            <div className="pastel-card rounded-3xl p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[#ff69b4] mb-2">Puanın</p>
              <div className="text-3xl font-black text-[#ff69b4]">
                {barbie?.totalScores?.[myUserId]?.toFixed(1) || '0.0'}
              </div>
              <p className="text-xs text-[#a08fb0] mt-1">5 tur sonunda en yüksek puan kazanır!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
