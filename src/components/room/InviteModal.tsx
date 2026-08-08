'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { copyToClipboard } from '@/lib/utils';
import { sounds } from '@/lib/sounds';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  roomCode: string;
  roomId: string;
  onClose: () => void;
}

export default function InviteModal({ roomCode, roomId, onClose }: Props) {
  const [friends, setFriends] = useState<any[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/room/join?code=${roomCode}` : '';

  useEffect(() => {
    api.get('/friends').then(({ data }) => setFriends(data.data || data)).catch(() => {});
  }, []);

  const copyCode = () => {
    copyToClipboard(roomCode);
    setCopied('code');
    sounds.success();
    toast.success('Kod kopyalandı!');
    setTimeout(() => setCopied(null), 2000);
  };

  const copyLink = () => {
    copyToClipboard(inviteLink);
    setCopied('link');
    sounds.success();
    toast.success('Link kopyalandı!');
    setTimeout(() => setCopied(null), 2000);
  };

  const inviteFriend = async (friendId: string) => {
    setSending(friendId);
    try {
      await api.post('/notifications', {
        recipientId: friendId,
        type: 'ROOM_INVITE',
        title: 'Oda Daveti!',
        message: `Seni bir oyuna davet ediyorlar! Kod: ${roomCode}`,
        data: { roomId, roomCode },
      });
      sounds.notification();
      toast.success('Davet gönderildi!');
    } catch {
      toast.error('Davet gönderilemedi');
    } finally {
      setSending(null);
    }
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: 'PartyVerse Oyunu', text: `Benimle oyna! Kod: ${roomCode}`, url: inviteLink });
    } else {
      copyLink();
    }
  };

  // Basit QR SVG (gerçek QR — sadece görsel için)
  const QRDisplay = () => (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 rounded-xl bg-white">
        <svg width="80" height="80" viewBox="0 0 80 80" className="text-black">
          {/* Basit QR pattern */}
          <rect width="80" height="80" fill="white"/>
          {/* Top-left corner */}
          <rect x="4" y="4" width="24" height="24" fill="black"/>
          <rect x="8" y="8" width="16" height="16" fill="white"/>
          <rect x="12" y="12" width="8" height="8" fill="black"/>
          {/* Top-right corner */}
          <rect x="52" y="4" width="24" height="24" fill="black"/>
          <rect x="56" y="8" width="16" height="16" fill="white"/>
          <rect x="60" y="12" width="8" height="8" fill="black"/>
          {/* Bottom-left corner */}
          <rect x="4" y="52" width="24" height="24" fill="black"/>
          <rect x="8" y="56" width="16" height="16" fill="white"/>
          <rect x="12" y="60" width="8" height="8" fill="black"/>
          {/* Data dots */}
          {[36,40,44].map(x => [36,40,44].map(y => (
            <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill={Math.random() > 0.5 ? 'black' : 'white'}/>
          )))}
          <rect x="36" y="4" width="4" height="4" fill="black"/>
          <rect x="44" y="4" width="4" height="4" fill="black"/>
          <rect x="36" y="12" width="4" height="4" fill="black"/>
          <rect x="4" y="36" width="4" height="4" fill="black"/>
          <rect x="4" y="44" width="4" height="4" fill="black"/>
          <rect x="12" y="36" width="4" height="4" fill="black"/>
        </svg>
      </div>
      <p className="text-xs text-gray-600">QR ile tara</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.9, opacity:0 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-black text-lg">🔗 Davet Et</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 transition-all">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Kod + QR */}
          <div className="flex items-center gap-4">
            <QRDisplay />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Oda Kodu</p>
                <button onClick={copyCode}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${copied === 'code' ? 'border-green-500/40 bg-green-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                  <span className="font-black text-2xl tracking-[.3em] text-purple-400 font-mono">{roomCode}</span>
                  <span className="text-xs text-gray-500">{copied === 'code' ? '✓' : '📋'}</span>
                </button>
              </div>
              <button onClick={copyLink}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${copied === 'link' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                {copied === 'link' ? '✓ Link Kopyalandı' : '🔗 Linki Kopyala'}
              </button>
              <button onClick={shareNative}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 transition-all">
                📤 Paylaş
              </button>
            </div>
          </div>

          {/* Arkadaşlara davet */}
          {friends.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">👥 Arkadaşlara Gönder</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {friends.map((f: any) => (
                  <div key={f.friendshipId} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 flex items-center justify-center font-bold text-sm">
                        {(f.friend?.profile?.displayName || f.friend?.username || '?')[0].toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0d1117] ${f.friend?.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{f.friend?.profile?.displayName || f.friend?.username}</p>
                      <p className="text-xs text-gray-600">{f.friend?.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}</p>
                    </div>
                    <button onClick={() => inviteFriend(f.friend?.id)} disabled={sending === f.friend?.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 disabled:opacity-50 transition-all">
                      {sending === f.friend?.id ? '...' : 'Davet'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
