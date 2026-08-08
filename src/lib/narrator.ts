/**
 * PartyVerse AI Narrator
 * - Önce OpenAI TTS dener (API key varsa)
 * - Yoksa Web Speech API kullanır (ücretsiz, tüm tarayıcılarda çalışır)
 */

let currentAudio: HTMLAudioElement | null = null;
let isSpeaking = false;
const queue: string[] = [];

// Web Speech API ile seslendir
function speakWithWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Türkçe ses bul, yoksa Türkçe aksanı olan herhangi bir ses
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(v => v.lang.startsWith('tr')) ||
      voices.find(v => v.lang.startsWith('en'));
    if (turkishVoice) utterance.voice = turkishVoice;

    utterance.rate = 0.88;
    utterance.pitch = 0.85;
    utterance.volume = 0.9;
    utterance.lang = 'tr-TR';

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

// OpenAI TTS ile seslendir
async function speakWithOpenAI(text: string, apiKey: string): Promise<void> {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'onyx', // derin, dramatik ses
        speed: 0.9,
      }),
    });
    if (!res.ok) throw new Error('OpenAI TTS failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      currentAudio = new Audio(url);
      currentAudio.volume = 0.85;
      currentAudio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      currentAudio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      currentAudio.play().catch(() => resolve());
    });
  } catch {
    // OpenAI başarısız → Web Speech'e düş
    return speakWithWebSpeech(text);
  }
}

// Ana fonksiyon — narrator queue ile sıraya koyar
export async function narrate(text: string): Promise<void> {
  if (!text || typeof window === 'undefined') return;

  queue.push(text);
  if (isSpeaking) return;

  isSpeaking = true;
  while (queue.length > 0) {
    const next = queue.shift()!;
    const apiKey = typeof window !== 'undefined'
      ? (window as any).__NARRATOR_API_KEY__ || ''
      : '';

    if (apiKey) {
      await speakWithOpenAI(next, apiKey);
    } else {
      await speakWithWebSpeech(next);
    }
  }
  isSpeaking = false;
}

// API key ayarla (admin tarafından)
export function setNarratorApiKey(key: string) {
  if (typeof window !== 'undefined') {
    (window as any).__NARRATOR_API_KEY__ = key;
  }
}

// Durdur
export function stopNarrator() {
  queue.length = 0;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  isSpeaking = false;
}

// Ses seviyesi ayarla
export function setNarratorVolume(vol: number) {
  if (currentAudio) currentAudio.volume = Math.max(0, Math.min(1, vol));
}
