import { create } from 'zustand';
import { VoiceState } from '@/types';

interface VoiceStore {
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isPushToTalk: boolean;
  isVoiceActivity: boolean;
  isConnected: boolean;
  volume: number;
  peers: Map<string, VoiceState>;
  localStream: MediaStream | null;
  peerConnections: Map<string, RTCPeerConnection>;

  setMuted: (v: boolean) => void;
  setDeafened: (v: boolean) => void;
  setSpeaking: (v: boolean) => void;
  setPushToTalk: (v: boolean) => void;
  setVoiceActivity: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setVolume: (v: number) => void;
  updatePeer: (userId: string, state: Partial<VoiceState>) => void;
  removePeer: (userId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setPeerConnection: (userId: string, pc: RTCPeerConnection) => void;
  removePeerConnection: (userId: string) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  isMuted: false,
  isDeafened: false,
  isSpeaking: false,
  isPushToTalk: false,
  isVoiceActivity: true,
  isConnected: false,
  volume: 0.8,
  peers: new Map(),
  localStream: null,
  peerConnections: new Map(),

  setMuted: (v) => set({ isMuted: v }),
  setDeafened: (v) => set({ isDeafened: v }),
  setSpeaking: (v) => set({ isSpeaking: v }),
  setPushToTalk: (v) => set({ isPushToTalk: v }),
  setVoiceActivity: (v) => set({ isVoiceActivity: v }),
  setConnected: (v) => set({ isConnected: v }),
  setVolume: (v) => set({ volume: v }),
  updatePeer: (userId, state) => {
    const peers = new Map(get().peers);
    const existing = peers.get(userId) || { userId, isMuted: false, isDeafened: false, isSpeaking: false, pushToTalk: false };
    peers.set(userId, { ...existing, ...state });
    set({ peers });
  },
  removePeer: (userId) => {
    const peers = new Map(get().peers);
    peers.delete(userId);
    set({ peers });
  },
  setLocalStream: (stream) => set({ localStream: stream }),
  setPeerConnection: (userId, pc) => {
    const pcs = new Map(get().peerConnections);
    pcs.set(userId, pc);
    set({ peerConnections: pcs });
  },
  removePeerConnection: (userId) => {
    const pcs = new Map(get().peerConnections);
    const pc = pcs.get(userId);
    pc?.close();
    pcs.delete(userId);
    set({ peerConnections: pcs });
  },
  reset: () => {
    const { localStream, peerConnections } = get();
    localStream?.getTracks().forEach((t) => t.stop());
    peerConnections.forEach((pc) => pc.close());
    set({
      isMuted: false, isDeafened: false, isSpeaking: false, isPushToTalk: false,
      isConnected: false, peers: new Map(), localStream: null, peerConnections: new Map(),
    });
  },
}));
