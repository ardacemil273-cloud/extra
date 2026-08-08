'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePlayer, ROLE_CONFIG, VampireRole } from '@/types';

interface Props {
  player: GamePlayer;
  isMe: boolean;
  isVoting: boolean;
  isGameOver: boolean;
  onVote?: (userId: string) => void;
  showRole?: boolean;
  compact?: boolean;
}

export default function PlayerCard({ player, isMe, isVoting, isGameOver, onVote, showRole, compact }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDead = player.status === 'DEAD';
  const roleInfo = (showRole || isGameOver) && player.role ? ROLE_CONFIG[player.role as VampireRole] : null;
  const canVote = isVoting && !isDead && !isMe;

  return (
    <div className="relative">
      <motion.button
        layout
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => canVote && onVote?.(player.userId)}
        whileHover={canVote ? { scale: 1.05 } : {}}
        whileTap={canVote ? { scale: 0.95 } : {}}
        className={`vote-card relative w-full ${isDead ? 'dead' : ''} ${canVote ? 'cursor-pointer hover:border-orange-500/50' : ''} ${isMe ? 'ring-1 ring-purple-500/50' : ''}`}>

        {/* Speaking indicator */}
        {player.isSpeaking && !isDead && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-pulse border border-[#080b14]" />
        )}

        {/* Vote count badge */}
        {player.votes > 0 && (
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-500 text-xs flex items-center justify-center font-black border border-[#080b14] z-10">
            {player.votes}
          </motion.div>
        )}

        {/* Avatar */}
        <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center font-black text-lg
          ${isDead ? 'bg-gray-800/60 grayscale' : roleInfo ? '' : 'bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-500/20'}`}
          style={roleInfo ? { backgroundColor: roleInfo.color + '25', border: `1px solid ${roleInfo.color}50` } : {}}>
          {isDead ? '💀' : roleInfo ? roleInfo.icon : (player.displayName||'?')[0].toUpperCase()}
        </div>

        <div className="text-xs truncate font-medium">{compact ? (player.displayName||'?')[0] : player.displayName}</div>

        {isMe && !compact && <div className="text-xs text-purple-400 mt-0.5">Sen</div>}
        {isDead && !compact && <div className="text-xs text-red-500/60 mt-0.5">Elendi</div>}
        {roleInfo && !compact && <div className="text-xs mt-0.5" style={{ color: roleInfo.color }}>{roleInfo.name}</div>}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div initial={{ opacity:0, y:4, scale:.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-36 rounded-xl border border-white/10 bg-[#0d1117] shadow-xl p-3 pointer-events-none">
            <div className="text-center">
              <p className="font-bold text-sm">{player.displayName}</p>
              {player.status === 'DEAD' && <p className="text-xs text-red-400">💀 Elendi</p>}
              {player.votes > 0 && <p className="text-xs text-orange-400 mt-1">⚖️ {player.votes} oy</p>}
              {canVote && <p className="text-xs text-orange-300 mt-1 font-semibold">Tıkla — oy ver</p>}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
