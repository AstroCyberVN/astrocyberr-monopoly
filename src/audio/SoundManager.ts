export class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private bgmEnabled = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;

  private ensureContext(): AudioContext | null {
    if (!this.sfxEnabled && !this.bgmEnabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxEnabled) {
      this.playCoinChime();
    }
    return this.sfxEnabled;
  }

  public toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    return this.bgmEnabled;
  }

  /** Tiếng cộc-cộc gỗ vuông khi xúc xắc nảy trên mặt sân đảo */
  public playDiceBounce(intensity = 1): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = 190 + Math.random() * 110;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.85, now + 0.045);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);

    const vol = Math.min(0.28, 0.22 * intensity);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  /** Tiếng phát sáng các nút xúc xắc -> bay lên -> dung hợp thành tổng */
  public playDicePipGlowAndFuse(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Rising magical chime when pips glow & lift
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.14);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });

    // Fusion impact chord at +0.62s
    const chord = [523.25, 783.99, 1046.5, 1567.98];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + 0.62;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.44);
    });
  }

  /** Tiếng boing dễ thương khi Steve & Alex nhảy lò cò từng ô */
  public playStepBoing(stepIndex = 0): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const pitchShift = 1 + (stepIndex % 6) * 0.05;
    osc.frequency.setValueAtTime(240 * pitchShift, now);
    osc.frequency.exponentialRampToValueAtTime(520 * pitchShift, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(340 * pitchShift, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  /** Tiếng dịch chuyển tức thời kèm hạt tím của Enderman */
  public playEndermanTeleport(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(840, now);
    osc1.frequency.exponentialRampToValueAtTime(160, now + 0.18);

    osc2.frequency.setValueAtTime(420, now);
    osc2.frequency.exponentialRampToValueAtTime(980, now + 0.18);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  /** Tiếng xì ngòi nổ + Nổ BÙM như TNT của Creeper ở mỗi bước nhảy */
  public playCreeperStepBoom(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.26);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.setValueAtTime(0.28, now + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.26);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(130, now + 0.07);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.24);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.setValueAtTime(0.26, now + 0.07);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.26);
  }

  /** Tiếng ting-ting 8-Bit khi nhận $ */
  public playCoinChime(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const start = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
    });
  }

  /** Tiếng mọc nhà nảy lùn phùn */
  public playBuildPop(level = 1): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseNotes = [523.25, 659.25, 783.99, 1046.5];
    const count = Math.max(2, Math.min(4, level + 1));

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(baseNotes[i], t);
      osc.frequency.exponentialRampToValueAtTime(baseNotes[i] * 1.12, t + 0.08);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }
  }

  /** Tiếng trả tiền thuê / nộp thuế */
  public playPayRent(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 392, 329.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  /** Tiếng Cổng Dịch Chuyển The End ngân vang */
  public playPortalWarp(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [293.66, 440, 587.33, 880, 1174.66];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.25);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** Tiếng pháo hoa & nhạc fanfare khi chiến thắng */
  public playVictoryFireworks(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const delays = [0, 0.12, 0.24, 0.36, 0.54, 0.68];

    fanfare.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const t = now + delays[idx];
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  private startBgmLoop(): void {
    this.stopBgmLoop();
    const melody = [
      523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
      523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.0
    ];

    this.bgmTimer = window.setInterval(() => {
      if (!this.bgmEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const note = melody[this.bgmStep % melody.length];
      this.bgmStep += 1;

      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.34);
    }, 380);
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
