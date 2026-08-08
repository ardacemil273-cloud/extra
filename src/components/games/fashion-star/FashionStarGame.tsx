'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGameSocket, connectGameSocket } from '@/lib/socket';
import { FashionState, WardrobeItem, ItemCategory } from '@/types';
import { sounds } from '@/lib/sounds';
import toast from 'react-hot-toast';
import GameOverPastel from '@/components/games/GameOverPastel';

const WARDROBE: WardrobeItem[] = [
  { id: 'top-pink', category: 'top', name: 'Pembe Bluz', emoji: '👚', color: '#ffb6c1' },
  { id: 'top-blue', category: 'top', name: 'Mavi Bluz', emoji: '👕', color: '#87ceeb' },
  { id: 'top-mint', category: 'top', name: 'Nane Bluz', emoji: '👚', color: '#98fb98' },
  { id: 'top-lav', category: 'top', name: 'Lavanta Bluz', emoji: '👕', color: '#b39ddb' },
  { id: 'bot-pink', category: 'bottom', name: 'Pembe Etek', emoji: '👗', color: '#f48fb1' },
  { id: 'bot-jean', category: 'bottom', name: 'Kot', emoji: '👖', color: '#5c6bc0' },
  { id: 'bot-black', category: 'bottom', name: 'Siyah Pantolon', emoji: '👖', color: '#37474f' },
  { id: 'dress-white', category: 'dress', name: 'Gelinlik', emoji: '👰', color: '#ffffff' },
  { id: 'dress-pink', category: 'dress', name: 'Pembe Elbise', emoji: '👰', color: '#ffc1e3' },
  { id: 'dress-purple', category: 'dress', name: 'Mor Balo', emoji: '👗', color: '#ce93d8' },
  { id: 'shoe-pink', category: 'shoes', name: 'Pembe Topuklu', emoji: '👠', color: '#f06292' },
  { id: 'shoe-red', category: 'shoes', name: 'Kırmızı Topuklu', emoji: '👠', color: '#ef5350' },
  { id: 'acc-crown', category: 'accessory', name: 'Taç', emoji: '👑', color: '#ffd54f' },
  { id: 'acc-neck', category: 'accessory', name: 'Kolye', emoji: '📿', color: '#80deea' },
  { id: 'acc-bow', category: 'accessory', name: 'Fiyonk', emoji: '🎀', color: '#f48fb1' },
  { id: 'hair-blond', category: 'hair', name: 'Sarışın', emoji: '💇‍♀️', color: '#ffd54f' },
  { id: 'hair-brown', category: 'hair', name: 'Kahverengi', emoji: '💇‍♀️', color: '#8d6e63' },
  { id: 'hair-pink', category: 'hair', name: 'Pembe Saç', emoji: '💇‍♀️', color: '#f48fb1' },
];

const CATEGORIES: Array<{ key: ItemCategory; label: string }> = [
  { key: 'top', label: 'Üst' },
  { key: 'bottom', label: 'Alt' },
  { key: 'dress', label: 'Elbise' },
  { key: 'shoes', label: 'Ayakkabı' },
  { key: 'accessory', label: 'Aksesuar' },
  { key: 'hair', label: 'Saç' },
];

const RULES = [
  '👗 Her turda bir tema verilir. Temaya uygun giyin!',
  '⏱ Giyinmek için 60 saniyen var.',
  '👗 Soldaki gardıroptan kıyafet seç, avatarın giyinsin.',
  '💃 Podyumda herkesin kombinini 1-5 yıldızla oyla.',
  '3 tur sonra en yüksek puan kazanır! Kendine oy veremezsin.',
];

interface Props {
  roomId: string;
  myUserId: string;
  players: Array<{ userId: string; displayName: string }>;
}

export default function FashionStarGame({ roomId, myUserId, players }: Props) {
  const socketRef = useRef(getGameSocket());
  const [fashion, setFashion] = useState<FashionState | null>(null);
  const [showRules, setShowRules] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('top');
  const [myItems, setMyItems] = useState<string[]>([]);
  const [dressTime, setDressTime] = useState(60);
const [gameOver, setGameOver] = useState<any>(null);
  const [runwayLook, setRunwayLook] = useState<{ userId: string; displayName: string; items: string[]; pos: number; total: number } | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);

  useEffect(() => {
    connectGameSocket();
    const socket = socketRef.current;
    socket.emit('game:join', { roomId });

    socket.on('fashion:state-update', (s: FashionState) => {
      setFashion(s);
      if (s.looks && s.looks[myUserId]) setMyItems(s.looks[myUserId].items);
      if (s.dressTime) setDressTime(s.dressTime);
    });
    socket.on('fashion:round-start', ({ round, theme, dressTime }: any) => {
      sounds.gameStart();
      toast(`🎯 Tur ${round+1}: ${theme.name}`, { icon: theme.emoji });
      setMyItems([]); setMyVote(null);
      setDressTime(dressTime);
    });
    socket.on('fashion:show-look', (look: any) => {
      setRunwayLook(look);
      setMyVote(null);
      sounds.notification();
    });
    socket.on('fashion:round-result', ({ scores, totalScores }: any) => {
      sounds.voteResult();
      toast('Tur sonuçlandı! Podyum puanları hesaplandı', { icon: '📊' });
    });
    socket.on('fashion:podium', ({ podium, winnerId }: any) => {
      const p = players.find(pl => pl.userId === winnerId);
      toast(`👑 ${p?.displayName || 'Biri'} kazandı!`, { icon: '👑' });
    });
    socket.on('game:over', (result: any) => setGameOver(result));

    return () => { socket.off(); };
  }, [roomId, myUserId]);

  const pickItem = (itemId: string) => {
    socketRef.current.emit('fashion:pick-item', { roomId, itemId });
    sounds.click();
  };

  const submitLook = () => {
    socketRef.current.emit('fashion:submit-look', { roomId });
    sounds.success();
    toast('Look gönderildi! Podyum bekleniyor...', { icon: '💃' });
  };

  const vote = (stars: number) => {
    if (!runwayLook) return;
    if (runwayLook.userId === myUserId) { toast('Kendine oy veremezsin!', { icon: '🚫' }); return; }
    setMyVote(stars);
    socketRef.current.emit('fashion:vote', { roomId, targetId: runwayLook.userId, stars });
    sounds.voteClick();
  };

  if (gameOver) {
    return (
      <div className="min-h-screen pastel-bg flex items-center justify-center">
        <GameOverPastel
          roomId={roomId}
          emoji="👗"
          win={gameOver.won === myUserId}
          winnerText={gameOver.won === myUserId ? 'SEN KAZANDIN!' : 'PODYUM BİTTİ'}
          subtitle="En şık kombin kazandı!"
          narrator={gameOver.narrator}
          players={gameOver.players}
        />
      </div>
    );
  }

  // RUNWAY fullscreen voting view
  if (fashion?.phase === 'RUNWAY' && runwayLook) {
    const lookItems: WardrobeItem[] = runwayLook.items.map((id: string) => WARDROBE.find(w => w.id === id)).filter((i): i is WardrobeItem => !!i);
    const isMe = runwayLook.userId === myUserId;
    return (
      <div className="min-h-screen pastel-bg flex flex-col items-center justify-center px-4 py-6 text-[#5a4a6a]">
        <div className="text-center mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#b39ddb]">Podyum</p>
          <h2 className="text-2xl font-black pastel-shimmer">{runwayLook.displayName}</h2>
          <p className="text-xs text-[#a08fb0]">{runwayLook.pos+1} / {runwayLook.total}</p>
        </div>

        {/* Avatar preview */}
        <div className="w-56 h-72 rounded-3xl pastel-card flex flex-col items-center justify-center mb-6 relative">
          <div className="absolute top-3 text-3xl">{lookItems.find(i => i?.category === 'hair')?.emoji || '💇‍♀️'}</div>
          <div className="text-6xl mt-5" style={{ color: '#8d6e63' }}>{isMe ? '😊' : '😌'}</div>
          <div className="flex flex-col items-center gap-1">
            {lookItems.filter(i => i?.category === 'dress').map((i, idx) => (
              <span key={idx} className="text-4xl">{i!.emoji}</span>
            ))}
            {lookItems.filter(i => i?.category === 'top').map((i, idx) => (
              <span key={idx} className="text-3xl">{i!.emoji}</span>
            ))}
            {lookItems.filter(i => i?.category === 'bottom').map((i, idx) => (
              <span key={idx} className="text-3xl">{i!.emoji}</span>
            ))}
            {lookItems.filter(i => i?.category === 'shoes').map((i, idx) => (
              <span key={idx} className="text-2xl">{i!.emoji}</span>
            ))}
          </div>
          <div className="absolute bottom-3 flex gap-2">
            {lookItems.filter(i => i?.category === 'accessory').map((i, idx) => (
              <span key={idx} className="text-2xl">{i!.emoji}</span>
            ))}
          </div>
        </div>

        {/* Voting */}
        {!isMe ? (
          <div className="pastel-card rounded-2xl p-4 w-full max-w-md">
            <p className="text-center text-sm font-bold mb-3">Bu kombini oyla!</p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => vote(s)}
                  className={`text-3xl transition-all ${myVote === s ? 'scale-125' : 'opacity-60 hover:scale-110 hover:opacity-100'}`}>
                  {s <= (myVote || 0) ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pastel-card rounded-2xl p-4 text-center text-sm text-[#a08fb0]">
            Bu senin kombinin — başkaları oyluyor! 💫
          </div>
        )}
      </div>
    );
  }

  // DRESSING view
  return (
    <div className="min-h-screen pastel-bg text-[#5a4a6a]">
      {/* Rules modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: .9 }} animate={{ scale: 1 }}
              className="pastel-card rounded-3xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2 animate-bounce-soft">👗</div>
                <h2 className="text-2xl font-black pastel-shimmer">Fashion Star</h2>
                <p className="text-sm text-[#a08fb0] mt-1">En şık kombini sen yap!</p>
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
                className="w-full py-3 rounded-2xl font-bold pastel-btn">👗 Başla!</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-[#ffc1e3]/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="font-black pastel-shimmer">Fashion Star</span>
          </div>
          <div className="flex items-center gap-2">
            {fashion?.theme && (
              <span className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
                {fashion.theme.emoji} {fashion.theme.name}
              </span>
            )}
            <span className="pastel-chip px-3 py-1.5 rounded-full text-sm font-bold">
              Tur {fashion ? fashion.round+1 : 1}/3
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Dress time bar */}
        {fashion?.phase === 'DRESSING' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#a08fb0] mb-1">
              <span>⏱ Giyinme süresi</span>
              <span className="font-bold">{dressTime}sn</span>
            </div>
            <div className="h-2 rounded-full bg-[#ffe4ec] overflow-hidden">
              <div className={`h-full rounded-full transition-all ${dressTime <= 10 ? 'bg-[#ff6b6b] animate-pulse' : 'bg-gradient-to-r from-[#ffb6c1] to-[#c3a6e0]'}`}
                style={{ width: `${(dressTime/60)*100}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wardrobe */}
          <div className="pastel-card rounded-3xl p-4">
            <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1">
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all ${
                    activeCategory === cat.key ? 'bg-[#ffb6c1] text-white' : 'bg-white/60 text-[#8a7a9a]'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WARDROBE.filter(w => w.category === activeCategory).map(item => (
                <button key={item.id} onClick={() => pickItem(item.id)}
                  className="rounded-2xl p-2 bg-white/70 border border-transparent hover:border-[#ffb6c1] hover:scale-105 transition-all flex flex-col items-center">
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-[10px] text-[#8a7a9a] mt-1 text-center">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar preview */}
          <div className="pastel-card rounded-3xl p-4 flex flex-col items-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#b39ddb] mb-2">Kombinin</p>
            <div className="w-40 h-52 rounded-2xl bg-white/70 flex flex-col items-center justify-center relative mb-3">
              <div className="absolute top-2 text-2xl">{myItems.map(id => WARDROBE.find(w => w.id === id)).filter(i => i?.category === 'hair').map(i => i!.emoji)}</div>
              <div className="text-5xl mt-4" style={{ color: '#8d6e63' }}>😊</div>
              <div className="flex flex-col items-center gap-1">
                {myItems.map(id => WARDROBE.find(w => w.id === id)).filter(i => i?.category === 'dress').map((i, idx) => <span key={idx} className="text-3xl">{i!.emoji}</span>)}
                {myItems.map(id => WARDROBE.find(w => w.id === id)).filter(i => i?.category === 'top').map((i, idx) => <span key={idx} className="text-2xl">{i!.emoji}</span>)}
                {myItems.map(id => WARDROBE.find(w => w.id === id)).filter(i => i?.category === 'bottom').map((i, idx) => <span key={idx} className="text-2xl">{i!.emoji}</span>)}
                {myItems.map(id => WARDROBE.find(w => w.id === id)).filter(i => i?.category === 'shoes').map((i, idx) => <span key={idx} className="text-xl">{i!.emoji}</span>)}
              </div>
              <div className="absolute bottom-2 flex gap-2">
                {myItems.map(id => WARDROBE.find(w => w.id === id)).filter(i => i?.category === 'accessory').map((i, idx) => <span key={idx} className="text-xl">{i!.emoji}</span>)}
              </div>
            </div>
            <button onClick={submitLook} disabled={fashion?.submitted?.includes(myUserId)}
              className="px-8 py-3 rounded-2xl font-bold pastel-btn disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400">
              {fashion?.submitted?.includes(myUserId) ? '✓ Gönderildi' : '💃 Podyuma Çık'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
