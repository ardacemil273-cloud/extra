/**
 * PartyVerse Sound System
 * Web Audio API ile tüm ses efektleri — harici dosya gerektirmez
 */

let ctx: AudioContext | null = null;
let masterVol = 0.6;
let sfxEnabled = true;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function playTone(opts: {
  type?: OscillatorType;
  freq: number;
  endFreq?: number;
  gain?: number;
  duration?: number;
  delay?: number;
}) {
  if (!sfxEnabled || typeof window === 'undefined') return;
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const { type='sine', freq, endFreq, gain=0.3, duration=0.2, delay=0 } = opts;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + delay + duration);
    g.gain.setValueAtTime(gain * masterVol, ac.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.connect(g); g.connect(ac.destination);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  } catch {}
}

function playNoise(opts: { gain?: number; duration?: number; delay?: number }) {
  if (!sfxEnabled || typeof window === 'undefined') return;
  try {
    const ac = getCtx();
    const { gain=0.2, duration=0.1, delay=0 } = opts;
    const len = ac.sampleRate * duration;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(gain * masterVol, ac.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    src.connect(g); g.connect(ac.destination);
    src.start(ac.currentTime + delay);
  } catch {}
}

export const sounds = {
  // UI
  click() { playTone({ type:'sine', freq:800, endFreq:600, gain:0.15, duration:0.08 }); },
  hover() { playTone({ type:'sine', freq:1200, gain:0.05, duration:0.05 }); },
  error() {
    playTone({ type:'sawtooth', freq:200, endFreq:100, gain:0.3, duration:0.3 });
    playTone({ type:'sawtooth', freq:150, endFreq:80, gain:0.2, duration:0.3, delay:0.15 });
  },
  success() {
    playTone({ type:'sine', freq:600, gain:0.2, duration:0.1 });
    playTone({ type:'sine', freq:800, gain:0.2, duration:0.1, delay:0.1 });
    playTone({ type:'sine', freq:1000, gain:0.25, duration:0.2, delay:0.2 });
  },
  notification() {
    playTone({ type:'sine', freq:880, gain:0.2, duration:0.08 });
    playTone({ type:'sine', freq:1100, gain:0.2, duration:0.12, delay:0.1 });
  },

  // Room
  playerJoin() {
    playTone({ type:'sine', freq:500, gain:0.2, duration:0.12 });
    playTone({ type:'sine', freq:700, gain:0.2, duration:0.15, delay:0.1 });
  },
  playerLeave() {
    playTone({ type:'sine', freq:700, gain:0.15, duration:0.1 });
    playTone({ type:'sine', freq:400, gain:0.15, duration:0.15, delay:0.1 });
  },
  ready() {
    playTone({ type:'sine', freq:660, gain:0.25, duration:0.1 });
    playTone({ type:'sine', freq:880, gain:0.25, duration:0.15, delay:0.12 });
  },
  countdown() { playTone({ type:'square', freq:440, gain:0.2, duration:0.15 }); },
  gameStart() {
    [0, 0.1, 0.2, 0.3].forEach((d, i) => {
      playTone({ type:'sine', freq:400 + i*150, gain:0.3, duration:0.15, delay:d });
    });
    playTone({ type:'sine', freq:1200, gain:0.4, duration:0.4, delay:0.4 });
  },

  // Night/Day
  nightFall() {
    playTone({ type:'sine', freq:300, endFreq:150, gain:0.25, duration:1.5 });
    playTone({ type:'sine', freq:200, endFreq:100, gain:0.15, duration:2, delay:0.5 });
  },
  dayBreak() {
    playTone({ type:'sine', freq:300, endFreq:600, gain:0.2, duration:0.8 });
    playTone({ type:'sine', freq:500, endFreq:900, gain:0.2, duration:0.6, delay:0.4 });
  },

  // Vote
  voteClick() {
    playTone({ type:'square', freq:600, gain:0.15, duration:0.08 });
    playNoise({ gain:0.05, duration:0.05, delay:0.05 });
  },
  voteResult() {
    playNoise({ gain:0.3, duration:0.2 });
    playTone({ type:'sawtooth', freq:200, endFreq:100, gain:0.25, duration:0.5, delay:0.1 });
  },

  // Game events
  eliminated() {
    playTone({ type:'sawtooth', freq:400, endFreq:80, gain:0.4, duration:0.8 });
    playNoise({ gain:0.2, duration:0.3, delay:0.3 });
  },
  roleReveal() {
    playTone({ type:'sine', freq:200, endFreq:800, gain:0.3, duration:0.5 });
    playTone({ type:'sine', freq:600, endFreq:1200, gain:0.25, duration:0.4, delay:0.4 });
  },
  actionDone() {
    playTone({ type:'sine', freq:700, gain:0.2, duration:0.1 });
    playTone({ type:'sine', freq:900, gain:0.2, duration:0.1, delay:0.12 });
  },
  detectiveResult() {
    playTone({ type:'triangle', freq:1000, endFreq:600, gain:0.3, duration:0.4 });
  },

  // Win/Lose
  win() {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => playTone({ type:'sine', freq:f, gain:0.3, duration:0.3, delay:i*0.15 }));
    playTone({ type:'sine', freq:1200, gain:0.4, duration:0.6, delay:0.7 });
  },
  lose() {
    playTone({ type:'sawtooth', freq:400, endFreq:200, gain:0.3, duration:0.5 });
    playTone({ type:'sawtooth', freq:300, endFreq:100, gain:0.25, duration:0.6, delay:0.3 });
    playTone({ type:'sawtooth', freq:200, endFreq:60, gain:0.2, duration:0.8, delay:0.6 });
  },

  // Chat
  chatMessage() { playTone({ type:'sine', freq:1200, gain:0.08, duration:0.06 }); },
  mention() {
    playTone({ type:'sine', freq:880, gain:0.2, duration:0.1 });
    playTone({ type:'sine', freq:1100, gain:0.2, duration:0.1, delay:0.12 });
    playTone({ type:'sine', freq:880, gain:0.2, duration:0.1, delay:0.24 });
  },

  // Settings
  setMasterVolume(vol: number) { masterVol = Math.max(0, Math.min(1, vol)); },
  setSfxEnabled(v: boolean) { sfxEnabled = v; },
  getMasterVolume() { return masterVol; },
  isSfxEnabled() { return sfxEnabled; },
};

// Global erişim için
if (typeof window !== 'undefined') (window as any).sounds = sounds;
