/**
 * Fleet Battle — Web Audio API Sound Synthesizer
 * Synthesizes all naval combat and tactical UI sounds procedurally
 * without external audio asset dependencies.
 */

const MENU_MUSIC_SRC = '/assets/aistudio/Latitude_of_Command_c81f3ae4.mp3';
const INGAME_MUSIC_SRC = '/assets/aistudio/Iron_Undercurrent_70cd685f.mp3';

export type MusicTrackMode = 'menu' | 'ingame' | 'none';

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  private menuAudio: HTMLAudioElement | null = null;
  private ingameAudio: HTMLAudioElement | null = null;
  private activeTrack: MusicTrackMode = 'none';
  private unlockListenerAttached: boolean = false;

  private handleUserInteractionUnlock = () => {
    this.removeUnlockListeners();
    if (this.activeTrack !== 'none' && this.enabled) {
      this.syncActiveTrackPlayback();
    }
  };

  private attachUnlockListeners() {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;
    window.addEventListener('pointerdown', this.handleUserInteractionUnlock, { passive: true });
    window.addEventListener('keydown', this.handleUserInteractionUnlock, { passive: true });
  }

  private removeUnlockListeners() {
    if (!this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = false;
    window.removeEventListener('pointerdown', this.handleUserInteractionUnlock);
    window.removeEventListener('keydown', this.handleUserInteractionUnlock);
  }

  private getMenuAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.menuAudio) {
      this.menuAudio = new Audio(MENU_MUSIC_SRC);
      this.menuAudio.loop = true;
      this.menuAudio.preload = 'auto';
      this.menuAudio.volume = Math.max(0, Math.min(1, this.volume * 0.75));
    }
    return this.menuAudio;
  }

  private getIngameAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.ingameAudio) {
      this.ingameAudio = new Audio(INGAME_MUSIC_SRC);
      this.ingameAudio.loop = true;
      this.ingameAudio.preload = 'auto';
      this.ingameAudio.volume = Math.max(0, Math.min(1, this.volume * 0.7));
    }
    return this.ingameAudio;
  }

  private syncActiveTrackPlayback() {
    const targetMenuVolume = Math.max(0, Math.min(1, this.volume * 0.75));
    const targetIngameVolume = Math.max(0, Math.min(1, this.volume * 0.7));

    if (this.menuAudio) {
      this.menuAudio.volume = targetMenuVolume;
    }
    if (this.ingameAudio) {
      this.ingameAudio.volume = targetIngameVolume;
    }

    if (!this.enabled || this.activeTrack === 'none' || this.volume <= 0) {
      this.removeUnlockListeners();
      if (this.menuAudio && !this.menuAudio.paused) {
        this.menuAudio.pause();
      }
      if (this.ingameAudio && !this.ingameAudio.paused) {
        this.ingameAudio.pause();
      }
      return;
    }

    if (this.activeTrack === 'menu') {
      if (this.ingameAudio) {
        this.ingameAudio.pause();
        this.ingameAudio.currentTime = 0;
      }
      const audio = this.getMenuAudio();
      if (audio) {
        audio.volume = targetMenuVolume;
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              if (this.activeTrack === 'menu' && this.enabled) {
                this.attachUnlockListeners();
              }
            });
          }
        }
      }
    } else if (this.activeTrack === 'ingame') {
      if (this.menuAudio) {
        this.menuAudio.pause();
        this.menuAudio.currentTime = 0;
      }
      const audio = this.getIngameAudio();
      if (audio) {
        audio.volume = targetIngameVolume;
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              if (this.activeTrack === 'ingame' && this.enabled) {
                this.attachUnlockListeners();
              }
            });
          }
        }
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setConfig(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
    this.syncActiveTrackPlayback();
  }

  /**
   * Switches between 'menu' music, 'ingame' music (singleplayer & multiplayer), or 'none'.
   */
  public setMusicTrack(track: MusicTrackMode) {
    if (this.activeTrack !== track) {
      this.activeTrack = track;
      if (track === 'none') {
        this.removeUnlockListeners();
        if (this.menuAudio) {
          this.menuAudio.pause();
        }
        if (this.ingameAudio) {
          this.ingameAudio.pause();
        }
        return;
      }
    }
    this.syncActiveTrackPlayback();
  }

  public setMenuMusicActive(active: boolean) {
    this.setMusicTrack(active ? 'menu' : 'none');
  }

  /**
   * Quick mechanical click for UI navigation
   */
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  /**
   * Ship rotation / placement click
   */
  public playRotate() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * Tactical submarine sonar ping
   */
  public playSonar() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1220, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  }

  /**
   * Cannon shot launching from battleship turret
   */
  public playCannonShot() {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  /**
   * Water splash (Disparo al agua / Miss)
   */
  public playSplash() {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  /**
   * Direct explosive impact (Impacto / Hit)
   */
  public playHit() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Metal thud + explosion noise
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);

    oscGain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    // Noise layer
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.35);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
  }

  /**
   * Catastrophic ship destruction alarm + explosion (Hundido / Sunk)
   */
  public playSunk() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Siren blare
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + 0.45);
    osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.7);

    oscGain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);

    // Sub rumble
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);
    subGain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start();
    sub.stop(ctx.currentTime + 0.8);
  }

  /**
   * Artillery whistle effect [REQ-157]
   */
  public playArtilleryWhistle() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(this.volume * 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  }

  /**
   * General Combat Alarm when friendly unit enters critical state (1 cell remaining) [REQ-160]
   */
  public playCombatAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.15;

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, start);
      osc.frequency.setValueAtTime(659, start + 0.07);

      gain.gain.setValueAtTime(this.volume * 0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.14);
    }
  }

  /**
   * Military radio static burst on naval communications feed [REQ-161]
   */
  public playRadioStatic() {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.Q.setValueAtTime(3.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  /**
   * Tactical high-frequency sonar echo for Sonar Pulse ability [REQ-136]
   */
  public playTacticalSonar() {
    const ctx = this.getContext();
    if (!ctx) return;

    [0, 0.22, 0.44].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + delay;
      const decay = 0.45;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400 - idx * 100, startTime);
      osc.frequency.exponentialRampToValueAtTime(1200 - idx * 100, startTime + decay);

      const amp = (this.volume * 0.35) / (idx + 1);
      gain.gain.setValueAtTime(amp, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + decay);
    });
  }

  /**
   * Fanfare for victory
   */
  public playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.12;
      const duration = i === notes.length - 1 ? 0.6 : 0.18;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.volume * 0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Somber cue for defeat
   */
  public playDefeat() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [329.63, 311.13, 293.66, 261.63]; // E4, Eb4, D4, C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.2;
      const duration = 0.35;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.volume * 0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Bright naval commendation chime for unlocking an achievement
   */
  public playAchievement() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.085;
      const duration = i === notes.length - 1 ? 0.55 : 0.16;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.volume * 0.32, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}

export const sound = new SoundService();


