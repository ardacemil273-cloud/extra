import { Howl, Howler } from "howler";

type SoundKey =
  | "click"
  | "notification"
  | "win"
  | "lose"
  | "heartbeat"
  | "night_wind"
  | "rain"
  | "night_ambience"
  | "vote"
  | "eliminate"
  | "role_reveal"
  | "morning";

const soundConfigs: Record<
  SoundKey,
  { src: string[]; volume: number; loop?: boolean }
> = {
  click: { src: ["/sounds/click.mp3"], volume: 0.4 },
  notification: { src: ["/sounds/notification.mp3"], volume: 0.6 },
  win: { src: ["/sounds/win.mp3"], volume: 0.7 },
  lose: { src: ["/sounds/lose.mp3"], volume: 0.7 },
  heartbeat: { src: ["/sounds/heartbeat.mp3"], volume: 0.3, loop: true },
  night_wind: { src: ["/sounds/night_wind.mp3"], volume: 0.2, loop: true },
  rain: { src: ["/sounds/rain.mp3"], volume: 0.15, loop: true },
  night_ambience: {
    src: ["/sounds/night_ambience.mp3"],
    volume: 0.2,
    loop: true,
  },
  vote: { src: ["/sounds/vote.mp3"], volume: 0.5 },
  eliminate: { src: ["/sounds/eliminate.mp3"], volume: 0.6 },
  role_reveal: { src: ["/sounds/role_reveal.mp3"], volume: 0.6 },
  morning: { src: ["/sounds/morning.mp3"], volume: 0.5 },
};

class SoundManager {
  private sounds: Map<SoundKey, Howl> = new Map();
  private activeSounds: Map<SoundKey, number> = new Map();
  private masterVolume = 0.7;
  private sfxEnabled = true;
  private musicEnabled = true;

  private getOrCreate(key: SoundKey): Howl {
    if (!this.sounds.has(key)) {
      const cfg = soundConfigs[key];
      const sound = new Howl({
        src: cfg.src,
        volume: cfg.volume * this.masterVolume,
        loop: cfg.loop || false,
        preload: true,
        html5: true,
        onloaderror: () => console.warn(`Sound not found: ${key}`),
      });
      this.sounds.set(key, sound);
    }
    return this.sounds.get(key)!;
  }

  play(key: SoundKey): void {
    const isMusic = [
      "night_wind",
      "rain",
      "night_ambience",
      "heartbeat",
    ].includes(key);
    if (isMusic && !this.musicEnabled) return;
    if (!isMusic && !this.sfxEnabled) return;

    try {
      const sound = this.getOrCreate(key);
      const id = sound.play();
      this.activeSounds.set(key, id as number);
    } catch {}
  }

  stop(key: SoundKey): void {
    const sound = this.sounds.get(key);
    if (sound) sound.stop();
    this.activeSounds.delete(key);
  }

  stopAll(): void {
    for (const key of this.activeSounds.keys()) {
      this.stop(key);
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (!enabled) {
      [
        "click",
        "notification",
        "win",
        "lose",
        "vote",
        "eliminate",
        "role_reveal",
        "morning",
      ].forEach((k) => this.stop(k as SoundKey));
    }
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      ["night_wind", "rain", "night_ambience", "heartbeat"].forEach((k) =>
        this.stop(k as SoundKey),
      );
    }
  }
}

export const soundManager = new SoundManager();
