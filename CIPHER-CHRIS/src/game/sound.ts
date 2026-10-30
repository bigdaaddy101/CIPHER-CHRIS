/* Tiny WebAudio chiptune engine: square-wave SFX + a looping synthwave
   arpeggio sequencer. Lazily initialised on first user gesture. */

type OscType = OscillatorType;

const mf = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private step = 0;
  private nextStepTime = 0;
  private stepFlip = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.startMusic();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  get isMuted() {
    return this.muted;
  }

  private tone(opts: {
    freq: number;
    dur: number;
    type?: OscType;
    vol?: number;
    delay?: number;
    slideTo?: number;
    dest?: GainNode | null;
  }) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + opts.dur);
    const v = opts.vol ?? 0.12;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + opts.dur);
    osc.connect(g);
    g.connect(opts.dest ?? this.master);
    osc.start(t);
    osc.stop(t + opts.dur + 0.02);
  }

  private noise(dur: number, vol = 0.1, freq = 1200, delay = 0, slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, t);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  /* ---------------- SFX ---------------- */

  uiClick() {
    this.tone({ freq: 880, dur: 0.05, vol: 0.07 });
  }
  shutter() {
    this.noise(0.045, 0.09, 2600, 0, 900);
    this.noise(0.035, 0.06, 1800, 0.055, 600);
    this.tone({ freq: 1180, dur: 0.03, vol: 0.04, delay: 0.02 });
  }
  uiHover() {
    this.tone({ freq: 1320, dur: 0.03, vol: 0.03 });
  }
  walkStep() {
    this.stepFlip = !this.stepFlip;
    this.noise(0.05, 0.035, this.stepFlip ? 500 : 380);
  }
  dialogBlip() {
    this.tone({ freq: 620 + Math.random() * 260, dur: 0.035, vol: 0.045 });
  }
  pickup() {
    this.tone({ freq: mf(76), dur: 0.07, vol: 0.1 });
    this.tone({ freq: mf(83), dur: 0.12, vol: 0.1, delay: 0.07 });
  }
  error() {
    this.tone({ freq: 140, dur: 0.16, type: "sawtooth", vol: 0.09 });
    this.tone({ freq: 110, dur: 0.2, type: "sawtooth", vol: 0.09, delay: 0.05 });
  }
  door() {
    this.noise(0.28, 0.08, 400, 0, 2400);
    this.tone({ freq: 196, dur: 0.18, type: "triangle", vol: 0.06, slideTo: 392 });
  }
  locked() {
    this.tone({ freq: 220, dur: 0.08, vol: 0.09 });
    this.tone({ freq: 220, dur: 0.08, vol: 0.09, delay: 0.12 });
  }
  unlock() {
    this.tone({ freq: mf(72), dur: 0.07, vol: 0.09 });
    this.tone({ freq: mf(79), dur: 0.07, vol: 0.09, delay: 0.08 });
    this.tone({ freq: mf(84), dur: 0.16, vol: 0.1, delay: 0.16 });
  }
  coin() {
    this.tone({ freq: mf(83), dur: 0.08, vol: 0.1 });
    this.tone({ freq: mf(88), dur: 0.32, vol: 0.1, delay: 0.08 });
  }
  meow() {
    this.tone({ freq: 880, dur: 0.28, type: "triangle", vol: 0.12, slideTo: 520 });
    this.tone({ freq: 1320, dur: 0.2, type: "sine", vol: 0.05, slideTo: 760 });
  }
  quack() {
    this.tone({ freq: 320, dur: 0.14, type: "sawtooth", vol: 0.1, slideTo: 140 });
  }
  flush() {
    this.noise(0.9, 0.09, 900, 0, 300);
  }
  splash() {
    this.noise(0.3, 0.07, 1600, 0, 500);
  }
  powerup() {
    [65, 69, 72, 76, 81].forEach((n, i) =>
      this.tone({ freq: mf(n), dur: 0.09, vol: 0.1, delay: i * 0.06 })
    );
  }
  fanfare() {
    const seq = [72, 76, 79, 84, 79, 84, 88];
    seq.forEach((n, i) =>
      this.tone({ freq: mf(n), dur: i === seq.length - 1 ? 0.5 : 0.12, vol: 0.11, delay: i * 0.11 })
    );
    seq.forEach((n, i) =>
      this.tone({ freq: mf(n - 24), dur: 0.12, type: "triangle", vol: 0.07, delay: i * 0.11 })
    );
  }

  /* ---------------- music sequencer ---------------- */

  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.ctx) return;
      while (this.nextStepTime < this.ctx.currentTime + 0.18) {
        this.scheduleStep(this.step, this.nextStepTime);
        const spb = 60 / 112 / 2; // 8th notes @112bpm
        this.nextStepTime += spb;
        this.step = (this.step + 1) % 32;
      }
    };
    this.musicTimer = window.setInterval(tick, 30);
  }

  private scheduleStep(step: number, when: number) {
    if (!this.ctx || !this.musicGain) return;
    const bar = Math.floor(step / 8) % 4;
    const s8 = step % 8;
    const arps = [
      [57, 60, 64, 69, 64, 60, 57, 60], // Am
      [53, 57, 60, 65, 60, 57, 53, 57], // F
      [55, 60, 64, 67, 64, 60, 55, 60], // C
      [55, 59, 62, 67, 62, 59, 55, 59], // G
    ];
    const bassRoots = [33, 29, 36, 31]; // A1 F1 C2 G1 -> +12 below
    const delay = when - this.ctx.currentTime;
    // arpeggio
    this.tone({
      freq: mf(arps[bar][s8] + 12),
      dur: 0.16,
      type: "square",
      vol: 0.028,
      delay,
      dest: this.musicGain,
    });
    // bass on quarters
    if (s8 % 2 === 0) {
      this.tone({
        freq: mf(bassRoots[bar] + 12),
        dur: 0.34,
        type: "triangle",
        vol: 0.09,
        delay,
        dest: this.musicGain,
      });
    }
    // sparkle fifth every other bar
    if (s8 === 6 && bar % 2 === 1) {
      this.tone({
        freq: mf(arps[bar][3] + 19),
        dur: 0.3,
        type: "sine",
        vol: 0.02,
        delay,
        dest: this.musicGain,
      });
    }
  }
}

export const sfx = new SoundEngine();
