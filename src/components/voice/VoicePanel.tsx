'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceStore } from '@/stores/voice.store';
import { getVoiceSocket, connectVoiceSocket } from '@/lib/socket';

interface Props { roomId: string; userId: string; }

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VoicePanel({ roomId, userId }: Props) {
  const {
    isMuted, isDeafened, isSpeaking, isPushToTalk, isConnected, volume,
    peers, localStream, peerConnections,
    setMuted, setDeafened, setSpeaking, setConnected,
    setLocalStream, setPeerConnection, removePeerConnection, removePeer, updatePeer, reset,
  } = useVoiceStore();

  const socketRef = useRef(getVoiceSocket());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [isExpanded, setIsExpanded] = useState(true);
  const [volumeLevels, setVolumeLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    connectVoiceSocket();
    const socket = socketRef.current;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('voice:existing-peers', ({ peers: existingPeers }: any) => {
      existingPeers.forEach((p: any) => { updatePeer(p.userId, p); if (p.userId !== userId) initiateCall(p.userId); });
    });
    socket.on('voice:peer-joined', ({ userId: pid, voiceState }: any) => { updatePeer(pid, voiceState); });
    socket.on('voice:peer-left', ({ userId: pid }: any) => {
      removePeer(pid); removePeerConnection(pid);
      const a = audioRefs.current.get(pid);
      if (a) { a.srcObject = null; audioRefs.current.delete(pid); }
    });
    socket.on('voice:offer', async ({ fromUserId, offer }: any) => {
      const pc = await createPC(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      socket.emit('voice:answer', { roomId, targetUserId: fromUserId, answer: ans });
    });
    socket.on('voice:answer', async ({ fromUserId, answer }: any) => {
      const pc = peerConnections.get(fromUserId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });
    socket.on('voice:ice-candidate', async ({ fromUserId, candidate }: any) => {
      const pc = peerConnections.get(fromUserId);
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    socket.on('voice:peer-muted', ({ userId: uid, isMuted }: any) => updatePeer(uid, { isMuted }));
    socket.on('voice:peer-speaking', ({ userId: uid, isSpeaking }: any) => {
      updatePeer(uid, { isSpeaking });
      setVolumeLevels(prev => ({ ...prev, [uid]: isSpeaking ? Math.random() * 60 + 40 : 0 }));
    });
    socket.on('voice:states', ({ states }: any) => {
      states.forEach((s: any) => { if (s.userId !== userId) updatePeer(s.userId, s); });
    });
    initMic();
    return () => {
      socket.emit('voice:leave', { roomId });
      socket.off();
      if (vadRef.current) clearInterval(vadRef.current);
      reset();
    };
  }, [roomId]);

  const initMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
        video: false,
      });
      setLocalStream(stream);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      vadRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > 12;
        if (!isMuted) {
          setSpeaking(speaking);
          setVolumeLevels(prev => ({ ...prev, [userId]: speaking ? avg : 0 }));
          if (speaking !== isSpeaking) {
            socketRef.current.emit('voice:speaking', { roomId, isSpeaking: speaking });
          }
        }
      }, 100);
      socketRef.current.emit('voice:join', { roomId });
    } catch {
      socketRef.current.emit('voice:join', { roomId });
    }
  };

  const createPC = async (peerId: string): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    setPeerConnection(peerId, pc);
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit('voice:ice-candidate', { roomId, targetUserId: peerId, candidate: e.candidate });
    };
    pc.ontrack = e => {
      let a = audioRefs.current.get(peerId);
      if (!a) { a = new Audio(); a.autoplay = true; a.volume = volume; audioRefs.current.set(peerId, a); }
      a.srcObject = e.streams[0];
      if (isDeafened) a.muted = true;
    };
    return pc;
  };

  const initiateCall = async (peerId: string) => {
    const pc = await createPC(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('voice:offer', { roomId, targetUserId: peerId, offer });
  };

  const toggleMute = () => {
    const next = !isMuted;
    setMuted(next);
    if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = !next; });
    socketRef.current.emit('voice:mute', { roomId, isMuted: next });
    if (next) { setSpeaking(false); socketRef.current.emit('voice:speaking', { roomId, isSpeaking: false }); }
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setDeafened(next);
    audioRefs.current.forEach(a => { a.muted = next; });
    socketRef.current.emit('voice:deafen', { roomId, isDeafened: next });
  };

  const handlePTT = (active: boolean) => {
    if (!isPushToTalk) return;
    if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = active; });
    socketRef.current.emit('voice:push-to-talk', { roomId, isActive: active });
  };

  const activePeers = Array.from(peers.values());
  const speakingNow = isSpeaking && !isMuted;

  // Volume bar helper
  const VolumeBar = ({ level }: { level: number }) => (
    <div className="flex items-end gap-0.5 h-4">
      {[3,5,4,6,3,5,4].map((h, i) => (
        <div key={i} className={`w-0.5 rounded-full transition-all duration-75 ${level > 20 ? 'bg-green-400' : 'bg-gray-700'}`}
          style={{ height: level > 20 ? `${Math.min(16, (level/100) * h * 4 + 2)}px` : '2px' }} />
      ))}
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-sm font-semibold">🎙️ Sesli Sohbet</span>
          <span className="text-xs text-gray-600">{activePeers.length + 1} kişi</span>
        </div>
        <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height:0 }} animate={{ height:'auto' }} exit={{ height:0 }}
            style={{ overflow:'hidden' }}>
            {/* Peers list */}
            <div className="px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
              {/* Ben */}
              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${speakingNow ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/3'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${speakingNow ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-xs font-medium flex-1 truncate text-purple-300">Sen</span>
                <VolumeBar level={volumeLevels[userId] || 0} />
                {isMuted && <span className="text-red-400 text-xs">🔇</span>}
                {isDeafened && <span className="text-yellow-400 text-xs">🔕</span>}
              </div>

              {activePeers.map(peer => {
                const peerSpeaking = peer.isSpeaking && !peer.isMuted;
                return (
                  <div key={peer.userId}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${peerSpeaking ? 'bg-green-500/8 border border-green-500/15' : 'hover:bg-white/3'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${peerSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-700'}`} />
                    <span className="text-xs flex-1 truncate text-gray-400">{peer.userId.slice(0, 8)}...</span>
                    <VolumeBar level={volumeLevels[peer.userId] || 0} />
                    {peer.isMuted && <span className="text-xs text-red-400/60">🔇</span>}
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 p-3 border-t border-white/5">
              {/* Mute */}
              <button onClick={toggleMute} title={isMuted ? 'Mikrofonu Aç' : 'Sessiz'}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                {isMuted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              {/* Deafen */}
              <button onClick={toggleDeafen} title={isDeafened ? 'Sesi Aç' : 'Sesi Kapat'}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDeafened ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M9.464 8.464a5 5 0 000 7.072" />
                  {isDeafened && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
                </svg>
              </button>

              {/* PTT */}
              <button
                onMouseDown={() => handlePTT(true)} onMouseUp={() => handlePTT(false)}
                onTouchStart={() => handlePTT(true)} onTouchEnd={() => handlePTT(false)}
                className={`flex-1 px-2 py-2 rounded-xl border text-xs font-bold transition-all select-none ${isPushToTalk ? 'bg-green-500/30 border-green-500/50 text-green-300 scale-95' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>
                🎙 PTT
              </button>

              {/* Speaking indicator */}
              {speakingNow && (
                <div className="flex items-center gap-1 px-2 py-2 rounded-xl bg-green-500/15 border border-green-500/25">
                  <div className="flex items-end gap-0.5">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-0.5 bg-green-400 rounded-full animate-pulse" style={{ height: `${i * 4 + 4}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
