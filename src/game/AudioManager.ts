import { STORAGE_KEYS } from '../utils/constants';

type SoundName = 'chop' | 'death' | 'highscore';

export class AudioManager {
  private muted: boolean = false;

  constructor() {
    this.loadMuteState();
  }

  private loadMuteState(): void {
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (settings) {
        const parsed = JSON.parse(settings);
        this.muted = parsed.muted ?? false;
      }
    } catch {
      // Ignore errors
    }
  }

  async loadSounds(): Promise<void> {
    // Sounds are generated on-the-fly using Web Audio API
    // No preloading needed for MVP
  }

  play(soundName: SoundName): void {
    if (this.muted) return;

    // Use Web Audio API for immediate sound playback
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (soundName === 'chop') {
        this.playChopSound(audioContext);
      } else if (soundName === 'death') {
        this.playDeathSound(audioContext);
      } else if (soundName === 'highscore') {
        this.playHighscoreSound(audioContext);
      }
    } catch {
      // Ignore audio errors
    }
  }

  private playChopSound(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }

  private playDeathSound(ctx: AudioContext): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  private playHighscoreSound(ctx: AudioContext): void {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = ctx.currentTime + i * 0.1;
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
        version: 1,
        muted,
      }));
    } catch {
      // Ignore errors
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }
}
