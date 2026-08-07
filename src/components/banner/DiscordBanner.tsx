'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBannerStore } from '@/stores/banner.store';

interface Props {
  placement: 'lobby' | 'dashboard' | 'game';
  compact?: boolean;
}

export default function DiscordBanner({ placement, compact = false }: Props) {
  const { banner } = useBannerStore();
  const [dismissed, setDismissed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Gösterilmeli mi?
  if (!banner.enabled) return null;
  if (placement === 'lobby' && !banner.showOnLobby) return null;
  if (placement === 'dashboard' && !banner.showOnDashboard) return null;
  if (placement === 'game' && !banner.showOnGame) return null;
  if (!banner.inviteUrl) return null;
  if (dismissed) return null;

  const handleJoin = () => {
    setJoining(true);
    const url = banner.inviteUrl.startsWith('http')
      ? banner.inviteUrl
      : `https://discord.gg/${banner.inviteUrl}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => setJoining(false), 2000);
  };

  // COMPACT versiyon — oyun sayfası için ince bar
  if (compact) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="relative overflow-hidden rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/5"
          style={{ borderColor: banner.accentColor + '50', backgroundColor: banner.accentColor + '08' }}
        >
          <div className="flex items-center gap-3 px-4 py-2.5">
            {/* Discord icon */}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: banner.accentColor }}>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{banner.serverName}</p>
              {banner.onlineCount > 0 && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  {banner.onlineCount.toLocaleString()} çevrimiçi
                </p>
              )}
            </div>
            <button onClick={handleJoin}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
              style={{ backgroundColor: banner.accentColor }}>
              {joining ? '↗' : 'Katıl'}
            </button>
            <button onClick={() => setDismissed(true)}
              className="text-gray-600 hover:text-gray-400 text-sm transition-colors flex-shrink-0 ml-1">
              ×
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // FULL versiyon — lobby ve dashboard için
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative overflow-hidden rounded-2xl border cursor-pointer group"
        style={{
          borderColor: banner.accentColor + '40',
          background: `linear-gradient(135deg, ${banner.accentColor}12, ${banner.accentColor}06)`,
        }}
        onClick={handleJoin}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${banner.accentColor}15, transparent 70%)` }} />

        {/* Animated particles */}
        <div className="absolute top-2 right-2 w-24 h-24 opacity-10 pointer-events-none">
          <div className="absolute w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: banner.accentColor, top: '20%', left: '30%', animationDelay: '0s' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: banner.accentColor, top: '60%', left: '70%', animationDelay: '0.5s' }} />
          <div className="absolute w-1 h-1 rounded-full animate-ping"
            style={{ backgroundColor: banner.accentColor, top: '40%', left: '80%', animationDelay: '1s' }} />
        </div>

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Server icon */}
            <div className="flex-shrink-0">
              {banner.iconUrl ? (
                <img src={banner.iconUrl} alt={banner.serverName}
                  className="w-12 h-12 rounded-2xl object-cover border-2"
                  style={{ borderColor: banner.accentColor + '50' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2"
                  style={{ backgroundColor: banner.accentColor, borderColor: banner.accentColor + '80' }}>
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: banner.accentColor }}>DISCORD</span>
                <div className="h-px flex-1" style={{ backgroundColor: banner.accentColor + '30' }} />
              </div>
              <p className="font-black text-white text-sm">{banner.serverName}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{banner.serverDescription}</p>

              {/* Stats */}
              <div className="flex items-center gap-3 mt-2">
                {banner.onlineCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-semibold">{banner.onlineCount.toLocaleString()} çevrimiçi</span>
                  </div>
                )}
                {banner.memberCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-xs text-gray-500">{banner.memberCount.toLocaleString()} üye</span>
                  </div>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-500 hover:text-white transition-all text-xs">
              ×
            </button>
          </div>

          {/* Join button */}
          <motion.button
            animate={{ scale: hovered ? 1.02 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-full mt-3 py-2.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: banner.accentColor }}
            onClick={(e) => { e.stopPropagation(); handleJoin(); }}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            {joining ? 'Açılıyor...' : 'Discord\'a Katıl'}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
