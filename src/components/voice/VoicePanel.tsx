'use client';
import { useEffect, useRef, useCallback } from 'react';
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
    isMuted, isDeafened, isSpeaking, isPushToTalk, isVoiceActivity, isConnected, volume,
    peers, localStream, peerConnections,
    setMuted, setDeafened, setSpeaking, setConnected,
    setLocalStream, setPeerConnection, removePeerConnection, removePeer, updatePeer, reset,
  } = useVoiceStore();

  const socketRef = useRef(getVoiceSocket());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Bağlan
  useEffect(() => {
    connectVoiceSocket();
    const socket = socketRef.current;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('voice:existing-peers', ({ peers: existingPeers }: any) => {
      existingPeers.forEach((p: any) => {
        updatePeer(p.userId, p);
        if (p.userId !== userId) initiateCall(p.userId);
      });
    });

    socket.on('voice:peer-joined', ({ userId: peerId, voiceState }: any) => {
      updatePeer(peerId, voiceState);
    });

    socket.on('voice:peer-left', ({ userId: peerId }: any) => {
      removePeer(peerId);
      removePeerConnection(peerId);
      const audio = audioRefs.current.get(peerId);
      if (audio) { audio.srcObject = null; audioRefs.current.delete(peerId); }
    });

    socket.on('voice:offer', async ({ fromUserId, offer }: any) => {
      const pc = await createPeerConnection(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', { roomId, targetUserId: fromUserId, answer });
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
    socket.on('voice:peer-speaking', ({ userId: uid, isSpeaking }: any) => updatePeer(uid, { isSpeaking }));
    socket.on('voice:states', ({ states }: any) => {
      states.forEach((s: any) => { if (s.userId !== userId) updatePeer(s.userId, s); });
    });

    initMicrophone();

    return () => {
      socket.emit('voice:leave', { roomId });
      socket.off();
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      reset();
    };
  }, [roomId]);

  const initMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }, video: false });
      setLocalStream(stream);

      // Voice activity detection
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > 15;
        if (speaking !== isSpeaking && !isMuted) {
          setSpeaking(speaking);
          socketRef.current.emit('voice:speaking', { roomId, isSpeaking: speaking });
        }
      }, 150);

      socketRef.current.emit('voice:join', { roomId });
    } catch {
      console.warn('Mikrofon erişimi reddedildi');
      socketRef.current.emit('voice:join', { roomId });
    }
  };

  const createPeerConnection = async (peerId: string): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    setPeerConnection(peerId, pc);

    if (localStream) {
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('voice:ice-candidate', { roomId, targetUserId: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      let audio = audioRefs.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.volume = volume;
        audioRefs.current.set(peerId, audio);
      }
      audio.srcObject = e.streams[0];
      if (isDeafened) audio.muted = true;
    };

    return pc;
  };

  const initiateCall = async (peerId: string) => {
    const pc = await createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('voice:offer', { roomId, targetUserId: peerId, offer });
  };

  const toggleMute = () => {
    const next = !isMuted;
    setMuted(next);
    if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = !next; });
    socketRef.current.emit('voice:mute', { roomId, isMuted: next });
    if (next) { setSpeaking(false); socketRef.current.emit('voice:speaking', { roomId, isSpeaking: false }); }
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setDeafened(next);
    audioRefs.current.forEach((audio) => { audio.muted = next; });
    socketRef.current.emit('voice:deafen', { roomId, isDeafened: next });
  };

  const handlePTTDown = () => {
    if (!isPushToTalk) return;
    if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = true; });
    socketRef.current.emit('voice:push-to-talk', { roomId, isActive: true });
  };

  const handlePTTUp = () => {
    if (!isPushToTalk) return;
    if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = false; });
    socketRef.current.emit('voice:push-to-talk', { roomId, isActive: false });
  };

  const activePeers = Array.from(peers.values());

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-sm font-semibold">🎙️ Sesli Sohbet</span>
        </div>
        <span className="text-xs text-gray-500">{activePeers.length + 1} kişi</span>
      </div>

      {/* Peers */}
      <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
        {/* Ben */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${isSpeaking && !isMuted ? 'bg-green-400 scale-125' : 'bg-gray-600'}`} />
          <span className="text-xs font-medium flex-1 truncate">Sen</span>
          {isMuted && <span className="text-red-400 text-xs">🔇</span>}
          {isDeafened && <span className="text-yellow-400 text-xs">🔕</span>}
        </div>
        {activePeers.map((peer) => (
          <div key={peer.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${peer.isSpeaking && !peer.isMuted ? 'bg-green-400 scale-125 animate-pulse' : 'bg-gray-700'}`} />
            <span className="text-xs flex-1 truncate text-gray-300">{peer.userId.slice(0, 8)}...</span>
            {peer.isMuted && <span className="text-xs text-red-400/70">🔇</span>}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 p-3 border-t border-white/5">
        {/* Mute */}
        <button onClick={toggleMute}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
          }`}
          title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}>
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
        <button onClick={toggleDeafen}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            isDeafened ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
          }`}
          title={isDeafened ? 'Sesi Aç' : 'Sesi Kapat'}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M9.464 8.464a5 5 0 000 7.072" />
            {isDeafened && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
          </svg>
        </button>

        {/* Push to Talk */}
        <button
          onMouseDown={handlePTTDown} onMouseUp={handlePTTUp}
          onTouchStart={handlePTTDown} onTouchEnd={handlePTTUp}
          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none ${
            isPushToTalk ? 'bg-green-500/30 border-green-500/50 text-green-300 scale-95' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
          }`}
          title="Push to Talk">
          PTT
        </button>
      </div>

      {/* VAD indicator */}
      {isSpeaking && !isMuted && (
        <div className="mx-3 mb-3 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <span className="text-xs text-green-400 font-medium animate-pulse">● Konuşuyor</span>
        </div>
      )}
    </div>
  );
}
